import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const NOTIFICATION_TYPE = "risk_alert";

function getEnv(env = process.env) {
    return {
        supabaseUrl: env.SUPABASE_URL || env.VITE_SUPABASE_URL || "",
        supabaseAnonKey: env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || "",
        serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY || "",
        vapidPublicKey: env.VAPID_PUBLIC_KEY || env.VITE_VAPID_PUBLIC_KEY || "",
        vapidPrivateKey: env.VAPID_PRIVATE_KEY || "",
        vapidSubject: env.VAPID_SUBJECT || "mailto:admin@example.com",
    };
}

function buildRiskMessage(student, attendancePct) {
    const title = "出席率に関するお知らせ";
    const body = [
        `${student.name} 様`,
        `現在の出席率は ${attendancePct}% となっており、基準である80%を下回っています。`,
        "出席状況をご確認ください。",
    ].join("\n");

    return { title, body };
}

async function sendPushNotifications(supabase, studentId, payload) {
    const { vapidPublicKey, vapidPrivateKey, vapidSubject } = getEnv();
    if (!vapidPublicKey || !vapidPrivateKey) return 0;

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const { data: subscriptions } = await supabase
        .from("student_push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .eq("student_id", studentId);

    let sent = 0;
    const staleEndpoints = [];

    for (const sub of subscriptions ?? []) {
        try {
            await webpush.sendNotification(
                {
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.p256dh, auth: sub.auth },
                },
                JSON.stringify({
                    title: payload.title,
                    body: payload.body,
                    url: "/notifications",
                })
            );
            sent += 1;
        } catch (error) {
            if (error?.statusCode === 404 || error?.statusCode === 410) {
                staleEndpoints.push(sub.id);
            }
        }
    }

    if (staleEndpoints.length > 0) {
        await supabase.from("student_push_subscriptions").delete().in("id", staleEndpoints);
    }

    return sent;
}

export async function runSendRiskNotification({ method, body, authorization, env = process.env }) {
    if (method !== "POST") {
        return { status: 405, body: { error: "Method not allowed" } };
    }

    const { supabaseUrl, supabaseAnonKey, serviceRoleKey } = getEnv(env);

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
        return {
            status: 500,
            body: { error: "SUPABASE_SERVICE_ROLE_KEY が未設定です。" },
        };
    }

    if (!authorization?.startsWith("Bearer ")) {
        return { status: 401, body: { error: "認証が必要です" } };
    }

    const accessToken = authorization.slice(7);
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    const {
        data: { user },
        error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
        return { status: 401, body: { error: "認証が無効です" } };
    }

    const { data: staffProfile, error: profileError } = await userClient
        .from("profiles")
        .select("role, name")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError || !staffProfile || !["admin", "teacher"].includes(staffProfile.role)) {
        return { status: 403, body: { error: "教員のみ実行できます" } };
    }

    const { studentId, attendancePct } = body ?? {};
    if (!studentId) {
        return { status: 400, body: { error: "studentId が必要です" } };
    }

    if (attendancePct === undefined || attendancePct === null || Number.isNaN(Number(attendancePct))) {
        return { status: 400, body: { error: "attendancePct が必要です" } };
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: student, error: studentError } = await adminClient
        .from("students")
        .select("id, name, student_number")
        .eq("id", studentId)
        .maybeSingle();

    if (studentError || !student) {
        return { status: 404, body: { error: "学生が見つかりません" } };
    }

    const message = buildRiskMessage(student, Number(attendancePct));
    const senderName = staffProfile.name || "教員";

    const { data: notification, error: insertError } = await adminClient
        .from("student_notifications")
        .insert({
            student_id: studentId,
            notification_type: NOTIFICATION_TYPE,
            title: message.title,
            body: message.body,
            sender_name: senderName,
        })
        .select("id")
        .single();

    if (insertError) {
        return { status: 500, body: { error: insertError.message } };
    }

    const pushSent = await sendPushNotifications(adminClient, studentId, message);

    return {
        status: 200,
        body: {
            notificationId: notification.id,
            pushSent,
            message: "通知を送信しました",
        },
    };
}

export default async function handler(req, res) {
    const result = await runSendRiskNotification({
        method: req.method,
        body: req.body,
        authorization: req.headers.authorization,
    });
    return res.status(result.status).json(result.body);
}
