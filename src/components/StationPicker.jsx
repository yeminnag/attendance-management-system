import { useEffect, useState } from "react";
import { formatStationLabel, searchStations } from "@/services/stationService.js";

export function StationPicker({ label, value, onChange}) {
    const [query, setQuery] = useState(value?.name ?? "");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        setQuery(value?.name ?? "");
    }, [value]);

    useEffect(() => {
        if (!open || query.trim().length < 1) {
            setResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            setError(null);
            try {
                const stations = await searchStations(query);
                setResults(stations);
            } catch (err) {
                setError(err.message);
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query, open]);

    function handleSelect(station) {
        onChange({
            name: station.name,
            line: station.line,
            prefecture: station.prefecture,
        });
        setQuery(station.name);
        setOpen(false);
        setResults([]);
    }

    function handleClear() {
        onChange(null);
        setQuery("");
        setResults([]);
    }

    return (
        <div className="station-picker">
            <label>{label}</label>
            <div className="station-picker-input-wrap">
                <input
                    type="text"
                    className="input-field"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                />
                {value && (
                    <button type="button" className="station-clear-btn" onClick={handleClear}>
                        クリア
                    </button>
                )}
            </div>

            {value && (
                <div className="station-selected">
                    {formatStationLabel(value)}
                </div>
            )}

            {open && (loading || error || results.length > 0) && (
                <ul className="station-results">
                    {loading && <li className="station-result-empty">検索中...</li>}
                    {error && <li className="station-result-error">{error}</li>}
                    {!loading && !error && results.length === 0 && (
                        <li className="station-result-empty">該当する駅がありません</li>
                    )}
                    {results.map((station, index) => (
                        <li key={`${station.name}-${station.line}-${index}`}>
                            <button
                                type="button"
                                onClick={() => handleSelect(station)}
                            >
                                {formatStationLabel(station)}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export function CommuteStationsPicker({ label, value = [], onChange }) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!open || query.trim().length < 1) {
            setResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            setError(null);
            try {
                const stations = await searchStations(query);
                setResults(stations);
            } catch (err) {
                setError(err.message);
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query, open]);

    function handleAdd(station) {
        const entry = {
            name: station.name,
            line: station.line,
            prefecture: station.prefecture,
        };
        const exists = value.some(
            (item) => item.name === entry.name && item.line === entry.line
        );
        if (!exists) {
            onChange([...value, entry]);
        }
        setQuery("");
        setOpen(false);
        setResults([]);
    }

    function handleRemove(index) {
        onChange(value.filter((_, i) => i !== index));
    }

    return (
        <div className="station-picker commute-stations-picker">
            <label>{label}</label>
            <div className="station-picker-input-wrap">
                <input
                    type="text"
                    className="input-field"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                />
            </div>

            {value.length > 0 && (
                <ul className="commute-station-list">
                    {value.map((station, index) => (
                        <li key={`${station.name}-${station.line}-${index}`}>
                            <span>{formatStationLabel(station)}</span>
                            <button type="button" onClick={() => handleRemove(index)}>
                                削除
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {open && (loading || error || results.length > 0) && (
                <ul className="station-results">
                    {loading && <li className="station-result-empty">検索中...</li>}
                    {error && <li className="station-result-error">{error}</li>}
                    {!loading && !error && results.length === 0 && (
                        <li className="station-result-empty">該当する駅がありません</li>
                    )}
                    {results.map((station, index) => (
                        <li key={`${station.name}-${station.line}-${index}`}>
                            <button type="button" onClick={() => handleAdd(station)}>
                                {formatStationLabel(station)}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
