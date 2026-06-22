function normalizeLineName(name) {
    return String(name ?? "")
        .replace(/\s/g, "")
        .replace(/^(JR|ＪＲ)/, "JR");
}

function extractLineKeyword(lineName) {
    return normalizeLineName(lineName)
        .replace(/^(JR|東京メトロ|都営|東急|小田急|京王|西武|東武|京急|京成|相鉄)/, "")
        .replace(/線$/, "");
}

export function getAffectedCommuteLines(studentLines, delays) {
    if (!studentLines?.length || !delays?.length) return [];

    return studentLines.filter((line) =>
        delays.some((delay) => isDelayAffectingLine(line, delay))
    );
}

export function isDelayAffectingLine(studentLine, delay) {
    const keyword = extractLineKeyword(studentLine);
    if (!keyword) return false;

    const delayText = normalizeLineName(
        [delay.railway, delay.text, delay.railwayId, delay.operator].join(" ")
    );

    return delayText.includes(keyword) || normalizeLineName(studentLine).includes(keyword);
}

export function isStudentCommuteDelayed(student, delays, manualDelayMode = false) {
    if (manualDelayMode) return true;

    const lines = student?.commute_lines ?? [];
    if (lines.length === 0) return false;

    return getAffectedCommuteLines(lines, delays).length > 0;
}
