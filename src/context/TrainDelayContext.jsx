import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { fetchLiveTrainDelays } from "@/services/trainDelayService.js";
import { getAffectedCommuteLines, isStudentCommuteDelayed } from "@/utils/commuteDelay.js";
import { useAttendanceSession } from "@/context/AttendanceSessionContext.jsx";

const POLL_INTERVAL_MS = 10000;

const TrainDelayContext = createContext(null);

export function TrainDelayProvider({ children }) {
    const { session } = useAttendanceSession();
    const [lines, setLines] = useState([]);
    const [delays, setDelays] = useState([]);
    const [hasActiveDelay, setHasActiveDelay] = useState(false);
    const [configured, setConfigured] = useState(false);
    const [manualDelayMode, setManualDelayMode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [error, setError] = useState(null);

    const refreshDelays = useCallback(async () => {
        setLoading(true);
        try {
            const result = await fetchLiveTrainDelays();
            setLines(result.lines);
            setDelays(result.delays);
            setHasActiveDelay(result.hasActiveDelay);
            setConfigured(result.configured);
            setLastUpdated(result.fetchedAt);
            setError(result.error);
        } catch (err) {
            setError(err.message ?? "運行情報の取得に失敗しました");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshDelays();
        const interval = setInterval(refreshDelays, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [refreshDelays]);

    useEffect(() => {
        if (!session.classStarted) {
            setManualDelayMode(false);
        }
    }, [session.classStarted]);

    const isTrainDelayActive = hasActiveDelay || manualDelayMode;

    function getStudentDelayInfo(student) {
        const affectedLines = getAffectedCommuteLines(student?.commute_lines ?? [], delays);
        const trainDelayAtCheckIn =
            manualDelayMode || isStudentCommuteDelayed(student, delays, manualDelayMode);

        return {
            trainDelayAtCheckIn,
            affectedLines,
        };
    }

    return (
        <TrainDelayContext.Provider
            value={{
                lines,
                delays,
                hasActiveDelay,
                configured,
                manualDelayMode,
                setManualDelayMode,
                isTrainDelayActive,
                getStudentDelayInfo,
                loading,
                lastUpdated,
                error,
                refreshDelays,
            }}
        >
            {children}
        </TrainDelayContext.Provider>
    );
}

export function useTrainDelays() {
    const context = useContext(TrainDelayContext);
    if (!context) {
        throw new Error("useTrainDelays must be used within TrainDelayProvider");
    }
    return context;
}
