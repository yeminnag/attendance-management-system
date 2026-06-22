import { useTrainDelays } from "@/context/TrainDelayContext.jsx";

function formatUpdatedAt(isoString) {
    if (!isoString) return "—";
    return new Date(isoString).toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

export function TrainDelayPanel() {
    const {
        lines,
        configured,
        manualDelayMode,
        setManualDelayMode,
        isTrainDelayActive,
        loading,
        lastUpdated,
        error,
        refreshDelays,
    } = useTrainDelays();

    return (
        <aside className="train-delay-panel">
            <div className="train-delay-header">
                <div>
                    <h2>電車運行情報</h2>
                    <p className="train-delay-subtitle">日本の鉄道事業 ODPT から取得</p>
                </div>
                <button
                    type="button"
                    className="train-delay-refresh"
                    onClick={refreshDelays}
                    disabled={loading}
                >
                    {loading ? "更新中..." : "更新"}
                </button>
            </div>

            <div className="train-delay-status-row">
                <span className={`train-delay-indicator ${isTrainDelayActive ? "delayed" : "on-time"}`}>
                    {isTrainDelayActive ? "● 遅延あり" : "● 平常運転"}
                </span>
                <span className="train-delay-updated">最終更新: {formatUpdatedAt(lastUpdated)}</span>
            </div>

            {!configured && (
                <div className="train-delay-notice">
                    API キーが未設定です。<code>VITE_ODPT_API_KEY</code> を設定してください。
                </div>
            )}

            {error && <div className="train-delay-error">{error}</div>}

            <div className="train-delay-manual">
                <label>
                    <input
                        type="checkbox"
                        checked={manualDelayMode}
                        onChange={(e) => setManualDelayMode(e.target.checked)}
                    />
                    電車遅延モード ( 21 - 30分 · 全員に適用 )
                </label>
            </div>

            <div className="train-delay-list">
                {lines.length > 0 ? (
                    lines.map((line) => (
                        <article
                            key={line.id}
                            className={`train-delay-line ${line.isDelay ? "delayed" : "on-time"}`}
                        >
                            <span
                                className="train-delay-dot"
                                title={line.isDelay ? "遅延あり" : "平常運転"}
                                aria-hidden
                            />
                            <div className="train-delay-line-body">
                                <div className="train-delay-line-head">
                                    <small>{line.railway} <span>{line.operator}</span></small>
                                    
                                </div>
                                <p className="train-delay-line-status">
                                    {line.isDelay ? line.status : "平常運転"} <time>{formatUpdatedAt(line.updatedAt)}</time>
                                </p>
                                {line.isDelay && (
                                    <p className="train-delay-line-text">{line.text} <time>{formatUpdatedAt(line.updatedAt)}</time></p>
                                )}
                            </div>
                        </article>
                    ))
                ) : configured && !loading ? (
                    <div className="train-delay-empty">
                        路線情報を取得できませんでした。
                    </div>
                ) : null}
            </div>
        </aside>
    );
}
