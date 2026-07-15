import { supabase } from "../../supabase.js";

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUserId(value) {
    return typeof value === "string" && UUID_RE.test(value);
}

export async function fetchMessagesWithPartner(userId, partnerId) {
    if (!isValidUserId(userId) || !isValidUserId(partnerId)) {
        return { data: [], error: new Error("Invalid conversation participant") };
    }

    return supabase
        .from("messages")
        .select("id, sender_id, recipient_id, body, read_at, created_at")
        .or(
            `and(sender_id.eq.${userId},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${userId})`
        )
        .order("created_at", { ascending: true });
}

export async function fetchRecentMessages(userId) {
    return supabase
        .from("messages")
        .select("id, sender_id, recipient_id, body, read_at, created_at")
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(200);
}

export async function sendMessage(recipientId, body) {
    const trimmed = body.trim();
    if (!trimmed) return { data: null, error: new Error("メッセージを入力してください") };

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return { data: null, error: userError ?? new Error("認証が必要です") };
    }

    return supabase
        .from("messages")
        .insert({
            sender_id: user.id,
            recipient_id: recipientId,
            body: trimmed,
        })
        .select("id, sender_id, recipient_id, body, read_at, created_at")
        .single();
}

export async function markConversationRead(partnerId) {
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return { error: userError ?? new Error("認証が必要です") };
    }

    return supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("recipient_id", user.id)
        .eq("sender_id", partnerId)
        .is("read_at", null);
}

export function buildConversationList(userId, messages, profilesById) {
    const map = new Map();

    for (const message of messages ?? []) {
        const partnerId =
            message.sender_id === userId ? message.recipient_id : message.sender_id;

        if (!map.has(partnerId)) {
            map.set(partnerId, {
                partnerId,
                partner: profilesById.get(partnerId) ?? { id: partnerId, name: "不明" },
                lastMessage: message,
                unreadCount: 0,
            });
        }

        const conversation = map.get(partnerId);
        if (
            message.recipient_id === userId &&
            !message.read_at &&
            message.sender_id === partnerId
        ) {
            conversation.unreadCount += 1;
        }
    }

    return [...map.values()].sort(
        (a, b) => new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at)
    );
}

export async function fetchStaffProfiles() {
    return supabase
        .from("profiles")
        .select("id, name, role, username")
        .in("role", ["admin", "teacher"])
        .order("name", { ascending: true });
}

export async function fetchAdminProfile() {
    return supabase
        .from("profiles")
        .select("id, name, role")
        .eq("role", "admin")
        .order("name", { ascending: true })
        .limit(1)
        .maybeSingle();
}

export async function fetchStudentContactsForTeacher(teacherId) {
    const { data: assignments, error: assignmentError } = await supabase
        .from("teacher_subjects")
        .select("subject_id")
        .eq("teacher_id", teacherId);

    if (assignmentError) return { data: [], error: assignmentError };

    const subjectIds = (assignments ?? []).map((row) => row.subject_id);
    if (subjectIds.length === 0) return { data: [], error: null };

    const { data: enrollments, error: enrollmentError } = await supabase
        .from("student_subjects")
        .select("student_id, students(id, name, student_number)")
        .in("subject_id", subjectIds);

    if (enrollmentError) return { data: [], error: enrollmentError };

    const studentMap = new Map();
    for (const row of enrollments ?? []) {
        const student = row.students;
        if (student?.id) studentMap.set(student.id, student);
    }

    const studentIds = [...studentMap.keys()];
    if (studentIds.length === 0) return { data: [], error: null };

    const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, role, student_id")
        .eq("role", "student")
        .in("student_id", studentIds);

    if (profileError) return { data: [], error: profileError };

    const profileByStudentId = new Map(
        (profiles ?? []).map((profile) => [profile.student_id, profile])
    );

    const contacts = studentIds
        .map((studentId) => {
            const student = studentMap.get(studentId);
            const profile = profileByStudentId.get(studentId);
            if (!profile?.id) return null;

            return {
                id: profile.id,
                name: student?.name ?? profile.name ?? "学生",
                role: "student",
                student_number: student?.student_number ?? null,
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name, "ja"));

    return { data: contacts, error: null };
}

export function subscribeToMessages(userId, onChange) {
    const channel = supabase
        .channel(`messages:${userId}`)
        .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "messages" },
            (payload) => {
                const row = payload.new ?? payload.old;
                if (!row) return;
                if (row.sender_id !== userId && row.recipient_id !== userId) return;
                onChange(payload);
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}
