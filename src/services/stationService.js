export async function searchStations(keyword) {
    if (!keyword || keyword.trim().length < 1) return [];

    const params = new URLSearchParams({
        method: "getStations",
        name: keyword.trim(),
    });

    const response = await fetch(`/api/heartrails?${params.toString()}`);
    if (!response.ok) {
        throw new Error("駅情報の取得に失敗しました");
    }

    const data = await response.json();
    const stations = data?.response?.station ?? [];
    return Array.isArray(stations) ? stations : [stations];
}

export function formatStationLabel(station) {
    return `${station.name}（${station.line}）· ${station.prefecture}`;
}

export function deriveCommuteLines(nearestStation, commuteStations = []) {
    const lines = new Set();

    if (nearestStation?.line) lines.add(nearestStation.line);

    for (const station of commuteStations) {
        if (station?.line) lines.add(station.line);
    }

    return [...lines];
}

export function buildCommutePayload(nearestStation, commuteStations) {
    return {
        nearest_station: nearestStation,
        commute_stations: commuteStations,
        commute_lines: deriveCommuteLines(nearestStation, commuteStations),
    };
}
