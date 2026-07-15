import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "../../supabase.js";
import { usernameToAuthEmail } from "@/utils/teacherAuth.js";

const AuthContext = createContext(null);

async function fetchProfile(userId) {
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, name, role, username")
        .eq("id", userId)
        .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) {
        throw new Error(
            "プロフィールが見つかりません。"
        );
    }

    const { data: assignments, error: assignmentError } = await supabase
        .from("teacher_subjects")
        .select("subject_id")
        .eq("teacher_id", userId);

    if (assignmentError) throw assignmentError;

    return {
        ...profile,
        teacher_subjects: assignments ?? [],
    };
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [profileError, setProfileError] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadSession = useCallback(async (sessionUser) => {
        if (!sessionUser) {
            setUser(null);
            setProfile(null);
            setProfileError(null);
            setLoading(false);
            return;
        }

        try {
            const profileData = await fetchProfile(sessionUser.id);
            setUser(sessionUser);
            setProfile(profileData);
            setProfileError(null);
        } catch (err) {
            setUser(sessionUser);
            setProfile(null);
            setProfileError(err.message ?? "プロフィールの読み込みに失敗しました");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            loadSession(session?.user ?? null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "TOKEN_REFRESHED") return;
            setLoading(true);
            loadSession(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, [loadSession]);

    const signInAsAdmin = useCallback(async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password,
        });
        if (error) throw error;
    }, []);

    const signInAsTeacher = useCallback(async (username, password) => {
        const { error } = await supabase.auth.signInWithPassword({
            email: usernameToAuthEmail(username),
            password,
        });
        if (error) throw error;
    }, []);

    const signOut = useCallback(async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    }, []);

    const isAdmin = profile?.role === "admin";
    const subjectIds = useMemo(
        () => (profile?.teacher_subjects ?? []).map((ts) => String(ts.subject_id)),
        [profile?.teacher_subjects]
    );

    const canEditSubject = useCallback(
        (subjectId) => {
            if (isAdmin) return true;
            return subjectIds.includes(String(subjectId));
        },
        [isAdmin, subjectIds]
    );

    const canManageStudentSubjects = useCallback(
        (studentSubjectIds = []) => {
            if (isAdmin) return true;
            return studentSubjectIds.some((id) => subjectIds.includes(String(id)));
        },
        [isAdmin, subjectIds]
    );

    const contextValue = useMemo(
        () => ({
            user,
            profile,
            profileError,
            loading,
            isAdmin,
            isTeacher: profile?.role === "teacher",
            subjectIds,
            signInAsAdmin,
            signInAsTeacher,
            signOut,
            canEditSubject,
            canManageStudentSubjects,
        }),
        [
            user,
            profile,
            profileError,
            loading,
            isAdmin,
            subjectIds,
            signInAsAdmin,
            signInAsTeacher,
            signOut,
            canEditSubject,
            canManageStudentSubjects,
        ]
    );

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
