import { createClient } from "@supabase/supabase-js";

const TEACHER_EMAIL_DOMAIN = "@teachers.internal";

function normalizeUsername(username) {
    return String(username ?? "").trim().toLowerCase();
}

function usernameToAuthEmail(username) {
    return `${normalizeUsername(username)}${TEACHER_EMAIL_DOMAIN}`;
}

function getEnv(env = process.env) {
    return {
        supabaseUrl: env.SUPABASE_URL || env.VITE_SUPABASE_URL || "",
        supabaseAnonKey: env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || "",
        serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY || "",
    };
}

function formatTeacherAuthError(message) {
    if (message?.includes("already been registered")) {
        return "このユーザー名は既に登録されています。教員管理の一覧を確認するか、別のユーザー名を使ってください。";
    }
    return message;
}

async function assertAdmin(userClient) {
    const {
        data: { user },
        error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
        return { error: { status: 401, message: "認証が無効です" } };
    }

    const { data: adminProfile, error: profileError } = await userClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError || adminProfile?.role !== "admin") {
        return { error: { status: 403, message: "管理者のみ実行できます" } };
    }

    return { user };
}

function createAdminClient(supabaseUrl, serviceRoleKey) {
    return createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

async function findAuthUserByEmail(adminClient, email) {
    let page = 1;
    const perPage = 200;

    while (true) {
        const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
        if (error) throw error;

        const found = data.users.find(
            (user) => user.email?.toLowerCase() === email.toLowerCase()
        );
        if (found) return found;

        if (data.users.length < perPage) return null;
        page += 1;
    }
}

async function assignTeacherSubjects(adminClient, teacherId, subjectIds) {
    const uniqueSubjectIds = [...new Set((subjectIds ?? []).filter(Boolean))];

    await adminClient.from("teacher_subjects").delete().eq("teacher_id", teacherId);

    if (uniqueSubjectIds.length === 0) {
        return { assignedCount: 0, error: null };
    }

    const { error } = await adminClient.from("teacher_subjects").insert(
        uniqueSubjectIds.map((subjectId) => ({
            teacher_id: teacherId,
            subject_id: subjectId,
        }))
    );

    if (error) {
        return { assignedCount: 0, error };
    }

    return { assignedCount: uniqueSubjectIds.length, error: null };
}

async function upsertTeacherProfile(adminClient, { teacherId, email, name, username }) {
    const { error } = await adminClient.from("profiles").upsert(
        {
            id: teacherId,
            email,
            name: name.trim(),
            role: "teacher",
            username,
        },
        { onConflict: "id" }
    );

    return { error };
}

async function repairTeacherAccount(
    adminClient,
    { teacherId, email, name, username, password, subjectIds }
) {
    const { error: authError } = await adminClient.auth.admin.updateUserById(teacherId, {
        password,
        email_confirm: true,
        user_metadata: {
            role: "teacher",
            name: name.trim(),
            username,
        },
    });

    if (authError) {
        return { error: authError };
    }

    const { error: profileError } = await upsertTeacherProfile(adminClient, {
        teacherId,
        email,
        name,
        username,
    });

    if (profileError) {
        return { error: profileError };
    }

    const { error: assignError, assignedCount } = await assignTeacherSubjects(
        adminClient,
        teacherId,
        subjectIds
    );

    if (assignError) {
        return { error: assignError };
    }

    return { assignedCount, error: null };
}

export async function runDeleteTeacherAuth({ method, body, authorization, env = process.env }) {
    if (method !== "POST") {
        return { status: 405, body: { error: "Method not allowed" } };
    }

    const { supabaseUrl, supabaseAnonKey, serviceRoleKey } = getEnv(env);

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
        return {
            status: 500,
            body: {
                error:
                    "SUPABASE_SERVICE_ROLE_KEY が未設定です。.env に追加してください（Supabase → Settings → API → service_role）。",
            },
        };
    }

    if (!authorization?.startsWith("Bearer ")) {
        return { status: 401, body: { error: "認証が必要です" } };
    }

    const accessToken = authorization.slice(7);
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    const adminCheck = await assertAdmin(userClient);
    if (adminCheck.error) {
        return { status: adminCheck.error.status, body: { error: adminCheck.error.message } };
    }

    const { teacherId } = body ?? {};
    if (!teacherId) {
        return { status: 400, body: { error: "teacherId が必要です" } };
    }

    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);

    await adminClient.from("teacher_subjects").delete().eq("teacher_id", teacherId);

    const { error: profileError } = await adminClient
        .from("profiles")
        .delete()
        .eq("id", teacherId)
        .eq("role", "teacher");

    if (profileError) {
        return { status: 500, body: { error: profileError.message } };
    }

    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(teacherId);
    if (authDeleteError) {
        return { status: 500, body: { error: authDeleteError.message } };
    }

    return { status: 200, body: { ok: true } };
}

export async function runManageTeacherAuth({ method, body, authorization, env = process.env }) {
    if (method !== "POST") {
        return { status: 405, body: { error: "Method not allowed" } };
    }

    if (body?.action === "delete") {
        return runDeleteTeacherAuth({ method, body, authorization, env });
    }

    const { supabaseUrl, supabaseAnonKey, serviceRoleKey } = getEnv(env);

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
        return {
            status: 500,
            body: {
                error:
                    "SUPABASE_SERVICE_ROLE_KEY が未設定です。.env に追加してください（Supabase → Settings → API → service_role）。",
            },
        };
    }

    if (!authorization?.startsWith("Bearer ")) {
        return { status: 401, body: { error: "認証が必要です" } };
    }

    const accessToken = authorization.slice(7);
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    const adminCheck = await assertAdmin(userClient);
    if (adminCheck.error) {
        return { status: adminCheck.error.status, body: { error: adminCheck.error.message } };
    }

    const { name, username, password, subjectIds = [] } = body ?? {};
    const normalizedUsername = normalizeUsername(username);

    if (!name?.trim() || !normalizedUsername || !password) {
        return { status: 400, body: { error: "名前、ユーザー名、パスワードが必要です" } };
    }

    if (!/^[a-z0-9_-]{3,32}$/.test(normalizedUsername)) {
        return {
            status: 400,
            body: { error: "ユーザー名は英小文字・数字・_・- のみ、3〜32文字で入力してください" },
        };
    }

    if (password.length < 6) {
        return { status: 400, body: { error: "パスワードは6文字以上にしてください" } };
    }

    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);
    const email = usernameToAuthEmail(normalizedUsername);

    const { data: existingProfileByUsername } = await adminClient
        .from("profiles")
        .select("id, role")
        .eq("username", normalizedUsername)
        .maybeSingle();

    if (existingProfileByUsername?.role === "teacher") {
        return {
            status: 409,
            body: { error: "このユーザー名は既に教員として登録されています。教員管理の一覧を確認してください。" },
        };
    }

    const { data: existingProfileByEmail } = await adminClient
        .from("profiles")
        .select("id, role")
        .eq("email", email)
        .maybeSingle();

    if (existingProfileByEmail?.role === "teacher") {
        return {
            status: 409,
            body: { error: "このユーザー名は既に教員として登録されています。教員管理の一覧を確認してください。" },
        };
    }

    let existingAuthUser = null;
    try {
        existingAuthUser = await findAuthUserByEmail(adminClient, email);
    } catch (lookupError) {
        return { status: 500, body: { error: lookupError.message } };
    }

    if (existingAuthUser) {
        const { data: linkedProfile } = await adminClient
            .from("profiles")
            .select("id, role")
            .eq("id", existingAuthUser.id)
            .maybeSingle();

        if (linkedProfile?.role === "teacher") {
            return {
                status: 409,
                body: {
                    error: "このユーザー名は既に教員として登録されています。教員管理の一覧を確認してください。",
                },
            };
        }

        const { error: repairError, assignedCount } = await repairTeacherAccount(adminClient, {
            teacherId: existingAuthUser.id,
            email,
            name,
            username: normalizedUsername,
            password,
            subjectIds,
        });

        if (repairError) {
            return {
                status: 500,
                body: { error: formatTeacherAuthError(repairError.message) },
            };
        }

        return {
            status: 200,
            body: {
                ok: true,
                recovered: true,
                teacherId: existingAuthUser.id,
                username: normalizedUsername,
                assignedCount,
            },
        };
    }

    const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
            role: "teacher",
            name: name.trim(),
            username: normalizedUsername,
        },
    });

    if (createError) {
        return {
            status: 500,
            body: { error: formatTeacherAuthError(createError.message) },
        };
    }

    const teacherId = createdUser.user?.id;
    if (!teacherId) {
        return { status: 500, body: { error: "教員アカウントの作成に失敗しました" } };
    }

    const { error: profileError } = await upsertTeacherProfile(adminClient, {
        teacherId,
        email,
        name,
        username: normalizedUsername,
    });

    if (profileError) {
        await adminClient.auth.admin.deleteUser(teacherId);
        return { status: 500, body: { error: profileError.message } };
    }

    const { error: assignError, assignedCount } = await assignTeacherSubjects(
        adminClient,
        teacherId,
        subjectIds
    );

    if (assignError) {
        await adminClient.auth.admin.deleteUser(teacherId);
        return {
            status: 500,
            body: { error: `担当授業の割り当てに失敗しました: ${assignError.message}` },
        };
    }

    return {
        status: 200,
        body: {
            ok: true,
            teacherId,
            username: normalizedUsername,
            assignedCount,
        },
    };
}

export default async function handler(req, res) {
    const result = await runManageTeacherAuth({
        method: req.method,
        body: req.body,
        authorization: req.headers.authorization,
    });

    return res.status(result.status).json(result.body);
}
