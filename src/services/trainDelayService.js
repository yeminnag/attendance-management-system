const ODPT_BASE = import.meta.env.VITE_ODPT_API_BASE ?? "/api/odpt";
const ODPT_KEY = import.meta.env.VITE_ODPT_API_KEY ?? "";

export const TRAIN_OPERATORS = [
    { id: "odpt.Operator:JR-East", label: "JR東日本" },
    { id: "odpt.Operator:TokyoMetro", label: "東京メトロ" },
    { id: "odpt.Operator:Toei", label: "都営地下鉄" },
    { id: "odpt.Operator:Tokyu", label: "東急電鉄" },
    { id: "odpt.Operator:Odakyu", label: "小田急電鉄" },
    { id: "odpt.Operator:Keio", label: "京王電鉄" },
    { id: "odpt.Operator:Seibu", label: "西武鉄道" },
    { id: "odpt.Operator:Tobu", label: "東武鉄道" },
];

function getLocalizedText(value) {
    if (!value) return "";
    if (typeof value === "string") return value;
    return value.ja ?? value.en ?? "";
}

const NORMAL_STATUS = /平常運転/;
const NO_DELAY_TEXT = /遅延(?:情報|.+)?はありません|遅延なし/;
const DELAY_INDICATORS = /遅延|ダイヤ乱れ|運転見合わせ|徐行|運情|運転再開/;

function isDelayRecord(info) {
    const status = String(info["odpt:trainInformationStatus"] ?? "");
    const text = getLocalizedText(info["odpt:trainInformationText"]);
    const combined = `${status} ${text}`.trim();

    if (!combined) return false;
    if (NORMAL_STATUS.test(status)) return false;
    if (NO_DELAY_TEXT.test(text)) return false;

    return DELAY_INDICATORS.test(combined);
}

function formatRailwayLabel(railwayTitle, railwayId, operatorLabel) {
    const title = getLocalizedText(railwayTitle);
    if (title && title !== operatorLabel) return title;

    const stripped = String(railwayId ?? "").replace(/^odpt\.Railway:/, "");
    return stripped || "路線情報なし";
}

function normalizeTrainInfo(info, operatorLabel) {
    const railwayId = info["odpt:railway"] ?? "";
    return {
        id: info["@id"] ?? `${operatorLabel}-${railwayId || "unknown"}`,
        operator: operatorLabel,
        railway: formatRailwayLabel(info["odpt:railwayTitle"], railwayId, operatorLabel),
        railwayId,
        status: info["odpt:trainInformationStatus"] || "平常運転",
        text: getLocalizedText(info["odpt:trainInformationText"]) || "現在、遅延情報はありません。",
        updatedAt: info["dc:date"] ?? info["dct:valid"] ?? new Date().toISOString(),
        isDelay: isDelayRecord(info),
    };
}

async function fetchOperatorTrainInfo(operator) {
    if (!ODPT_KEY) return [];

    const params = new URLSearchParams({
        "acl:consumerKey": ODPT_KEY,
        "odpt:operator": operator.id,
    });

    const response = await fetch(`${ODPT_BASE}/odpt:TrainInformation?${params.toString()}`);
    if (!response.ok) {
        throw new Error(`${operator.label}: ${response.status}`);
    }

    const data = await response.json();
    return data.map((item) => normalizeTrainInfo(item, operator.label));
}

export async function fetchLiveTrainDelays() {
    if (!ODPT_KEY) {
        return {
            configured: false,
            lines: [],
            delays: [],
            hasActiveDelay: false,
            fetchedAt: new Date().toISOString(),
            error: null,
        };
    }

    const results = await Promise.allSettled(
        TRAIN_OPERATORS.map((operator) => fetchOperatorTrainInfo(operator))
    );

    const lines = results
        .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
        .sort((a, b) => {
            if (a.isDelay !== b.isDelay) return Number(b.isDelay) - Number(a.isDelay);
            const byOperator = a.operator.localeCompare(b.operator, "ja");
            if (byOperator !== 0) return byOperator;
            return a.railway.localeCompare(b.railway, "ja");
        });

    const delays = lines.filter((item) => item.isDelay);

    const errors = results
        .map((result, index) =>
            result.status === "rejected" ? `${TRAIN_OPERATORS[index].label}の取得に失敗` : null
        )
        .filter(Boolean);

    return {
        configured: true,
        lines,
        delays,
        hasActiveDelay: delays.length > 0,
        fetchedAt: new Date().toISOString(),
        error: errors.length === TRAIN_OPERATORS.length ? errors.join(" / ") : null,
    };
}
