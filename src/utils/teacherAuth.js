export const TEACHER_EMAIL_DOMAIN = "@teachers.internal";

export function normalizeUsername(username) {
    return username.trim().toLowerCase();
}

export function validateUsername(username) {
    const normalized = normalizeUsername(username);
    if (!/^[a-z0-9_-]{3,32}$/.test(normalized)) {
        return "ユーザー名は英小文字・数字・_・- のみ、3〜32文字で入力してください";
    }
    return null;
}

export function usernameToAuthEmail(username) {
    return `${normalizeUsername(username)}${TEACHER_EMAIL_DOMAIN}`;
}
