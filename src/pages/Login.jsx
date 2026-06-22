import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext.jsx";
import { validateUsername } from "@/utils/teacherAuth.js";
import "@/styles/login.css";

function translateAuthError(message) {
    if (message === "Invalid login credentials") {
        return "ユーザー名（またはメール）またはパスワードが正しくありません。";
    }
    if (message === "Email not confirmed") {
        return "メールが未確認です。Supabase → Authentication → Users でユーザーを Confirm してください。";
    }
    if (message === "Email logins are disabled") {
        return "メールログインが無効です。Supabase → Authentication → Providers → Email をオンにしてください。";
    }
    return message;
}

export function Login() {
    const { user, signInAsAdmin, signInAsTeacher, loading, profile, profileError } = useAuth();
    const [loginMode, setLoginMode] = useState("teacher");
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    if (!loading && user) {
        if (!profile) {
            return (
                <div className="login-page">
                    <div className="login-card">
                        <p className="login-error">
                            {profileError ?? "プロフィールが見つかりません。"}
                        </p>
                        <p className="login-subtitle" style={{ marginTop: 12 }}>
                            Supabase SQL Editor で <code>supabase/fix-profiles-rls.sql</code> を実行してください。
                        </p>
                    </div>
                </div>
            );
        }
        return <Navigate to="/" replace />;
    }

    function switchMode(mode) {
        setLoginMode(mode);
        setIdentifier("");
        setPassword("");
        setError("");
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setSubmitting(true);

        try {
            if (loginMode === "admin") {
                await signInAsAdmin(identifier, password);
            } else {
                const usernameError = validateUsername(identifier);
                if (usernameError) {
                    setError(usernameError);
                    return;
                }
                await signInAsTeacher(identifier, password);
            }
        } catch (err) {
            setError(translateAuthError(err.message ?? "ログインに失敗しました"));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="login-page">
            <form className="login-card" onSubmit={handleSubmit}>
                <h1>出席管理システム</h1>
                <p className="login-subtitle">読売理工医療福祉専門学校</p>

                <div className="login-tabs">
                    <button
                        type="button"
                        className={loginMode === "teacher" ? "login-tab active" : "login-tab"}
                        onClick={() => switchMode("teacher")}
                    >
                        教員
                    </button>
                    <button
                        type="button"
                        className={loginMode === "admin" ? "login-tab active" : "login-tab"}
                        onClick={() => switchMode("admin")}
                    >
                        管理者
                    </button>
                </div>

                <div className="input-box">
                    <label htmlFor="identifier">
                        {loginMode === "admin" ? "メール" : "ユーザー名"}
                    </label>
                    <input
                        id="identifier"
                        type={loginMode === "admin" ? "email" : "text"}
                        className="input-field"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder={loginMode === "admin" ? "admin@example.com" : "yomi-teacher-01"}
                        autoComplete={loginMode === "admin" ? "email" : "username"}
                        required
                    />
                </div>

                <div className="input-box">
                    <label htmlFor="password">パスワード</label>
                    <input
                        id="password"
                        type="password"
                        className="input-field"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                {error && <p className="login-error">{error}</p>}

                <button type="submit" className="login-btn" disabled={submitting}>
                    {submitting ? "ログイン中..." : "ログイン"}
                </button>
            </form>
        </div>
    );
}
