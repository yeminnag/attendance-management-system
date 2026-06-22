import { createContext, useContext, useEffect, useRef, useState } from "react";

const SESSION_KEY = "attendance-active-session";

const emptySession = {
    classStarted: false,
    currentSubject: null,
    students: [],
    checkIns: {},
    classStartTime: null,
    classEndTime: null,
    classSessionId: null,
};

function migrateSession(parsed) {
    if (!parsed.classStarted) return emptySession;

    let checkIns = parsed.checkIns ?? {};
    if (!parsed.checkIns && Array.isArray(parsed.presentStudents)) {
        checkIns = Object.fromEntries(
            parsed.presentStudents.map((id) => [
                id,
                {
                    time: parsed.classStartTime ?? new Date().toISOString(),
                    trainDelayAtCheckIn: false,
                },
            ])
        );
    }

    return {
        classStarted: true,
        currentSubject: parsed.currentSubject ?? null,
        students: parsed.students ?? [],
        checkIns,
        classStartTime: parsed.classStartTime ?? null,
        classEndTime: parsed.classEndTime ?? null,
        classSessionId: parsed.classSessionId ?? null,
    };
}

function loadSession() {
    try {
        const stored = sessionStorage.getItem(SESSION_KEY);
        if (!stored) return emptySession;
        return migrateSession(JSON.parse(stored));
    } catch {
        return emptySession;
    }
}

const AttendanceSessionContext = createContext(null);

export function AttendanceSessionProvider({ children }) {
    const [session, setSession] = useState(loadSession);
    const sessionRef = useRef(session);

    useEffect(() => {
        sessionRef.current = session;
    }, [session]);

    useEffect(() => {
        if (session.classStarted) {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        } else {
            sessionStorage.removeItem(SESSION_KEY);
        }
    }, [session]);

    function startSession({ subject, students, classStartTime, classEndTime, classSessionId = null }) {
        setSession({
            classStarted: true,
            currentSubject: subject,
            students,
            checkIns: {},
            classStartTime,
            classEndTime,
            classSessionId,
        });
    }

    function toggleCheckIn(studentId, delayInfo = { trainDelayAtCheckIn: false, affectedLines: [] }) {
        setSession((prev) => {
            if (prev.checkIns[studentId]) {
                const nextCheckIns = { ...prev.checkIns };
                delete nextCheckIns[studentId];
                return { ...prev, checkIns: nextCheckIns };
            }

            return {
                ...prev,
                checkIns: {
                    ...prev.checkIns,
                    [studentId]: {
                        time: new Date().toISOString(),
                        trainDelayAtCheckIn: delayInfo.trainDelayAtCheckIn,
                        affectedLines: delayInfo.affectedLines ?? [],
                    },
                },
            };
        });
    }

    function clearSession() {
        setSession(emptySession);
    }

    return (
        <AttendanceSessionContext.Provider
            value={{
                session,
                sessionRef,
                startSession,
                toggleCheckIn,
                clearSession,
                setSession,
            }}
        >
            {children}
        </AttendanceSessionContext.Provider>
    );
}

export function useAttendanceSession() {
    const context = useContext(AttendanceSessionContext);
    if (!context) {
        throw new Error("useAttendanceSession must be used within AttendanceSessionProvider");
    }
    return context;
}
