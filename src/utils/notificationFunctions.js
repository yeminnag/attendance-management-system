import { supabase } from "../../supabase.js";

export async function sendRiskStudentNotification({ studentId, attendancePct }) {
    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
        return { error: new Error("認証が必要です") };
    }

    let response;
    try {
        response = await fetch("/api/send-risk-notification", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ studentId, attendancePct }),
        });
    } catch {
        return {
            error: new Error(
                "通知 API に接続できません。Vercel にデプロイ済みか、dev サーバーを再起動しているか確認してください。"
            ),
        };
    }

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        return { error: new Error(result.error ?? "通知の送信に失敗しました") };
    }

    return { data: result, error: null };
}
