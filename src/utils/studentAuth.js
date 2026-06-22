export const STUDENT_EMAIL_DOMAIN = "@students.internal";

export function normalizeStudentNumber(value) {
    return String(value ?? "").trim();
}

export function validateStudentNumber(value) {
    const normalized = normalizeStudentNumber(value);
    if (!/^\d{1,10}$/.test(normalized)) {
        return "学籍番号は数字のみ（1〜10桁）で入力してください";
    }
    return null;
}

export function studentNumberToAuthEmail(studentNumber) {
    return `${normalizeStudentNumber(studentNumber)}${STUDENT_EMAIL_DOMAIN}`;
}

export function isStudentAuthEmail(email) {
    return email?.toLowerCase().endsWith(STUDENT_EMAIL_DOMAIN);
}

export function formatStudentAuthError(message) {
    if (message === "Database error saving new user") {
        return "学生ログインの作成に失敗しました。Supabase SQL Editor で supabase/student-portal-setup.sql を実行してください。";
    }
    return message;
}
