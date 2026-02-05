import OpenAI from "openai";

const baseURL = "https://dashscope.aliyuncs.com/compatible-mode/v1";

export const ALLOWED_FIELDS = [
  "pnlAmount",
  "symbol",
  "direction",
  "result",
  "tradeMode",
  "entryTime",
  "exitTime",
  "timeframe",
  "trendAssessment",
  "marketPhase",
  "setupType",
  "entryType",
  "confidenceLevel",
  "entryPoint",
  "closingPoint",
  "slPoint",
  "tpPoint",
  "entryReason",
  "earlyExit",
] as const;

type AllowedField = (typeof ALLOWED_FIELDS)[number];

export type TradeImageFields = Record<AllowedField, string | boolean>;

function extractJson(content: string | null | undefined) {
  if (!content) return null;
  const cleaned = content.replace(/```(?:json)?/g, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const jsonText = cleaned.slice(start, end + 1);
  try {
    return JSON.parse(jsonText) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function normalizeDirection(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "buy" || normalized === "long") return "long";
  if (normalized === "sell" || normalized === "short") return "short";
  return "";
}

function normalizeResult(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "win") return "win";
  if (normalized === "loss") return "loss";
  return "";
}

function normalizeTradeMode(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "live";
  if (normalized === "demo") return "demo";
  if (normalized === "live") return "live";
  return "live";
}

function normalizeEarlyExit(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return "";
}

function normalizeFields(parsed: Record<string, unknown>): TradeImageFields {
  const normalized = {} as TradeImageFields;

  ALLOWED_FIELDS.forEach((key) => {
    const value = parsed[key];
    if (typeof value === "boolean") {
      normalized[key] = value;
      return;
    }
    if (typeof value === "number") {
      normalized[key] = String(value);
      return;
    }
    if (typeof value === "string") {
      if (key === "direction") {
        normalized[key] = normalizeDirection(value);
        return;
      }
      if (key === "result") {
        normalized[key] = normalizeResult(value);
        return;
      }
      if (key === "tradeMode") {
        normalized[key] = normalizeTradeMode(value);
        return;
      }
      if (key === "earlyExit") {
        normalized[key] = normalizeEarlyExit(value);
        return;
      }
      normalized[key] = value.trim();
      return;
    }
    normalized[key] = "";
  });

  if (!normalized.tradeMode) {
    normalized.tradeMode = "live";
  }

  return normalized;
}

function buildPrompt() {
  return [
    "Extract the following fields from the trade screenshot and return pure JSON only (no explanations or Markdown):",
    "",
    `Fields: ${ALLOWED_FIELDS.join(", ")}`,
    "",
    "Requirements:",
    "1) Return all fields.",
    '2) Use empty string "" for unknown fields.',
    '3) earlyExit must be true/false or "".',
    "4) Datetime format: YYYY-MM-DD HH:mm:ss.",
    "5) For numeric fields, return a number or numeric string.",
    '6) direction must be "long" or "short" (lowercase).',
    '7) result must be "win" or "loss" (lowercase).',
  ].join("\n");
}

export async function parseTradeImageFromBuffer(
  buffer: Buffer,
  contentType: string,
): Promise<TradeImageFields> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    throw new Error("Missing DASHSCOPE_API_KEY");
  }

  const base64 = buffer.toString("base64");
  const dataUrl = `data:${contentType || "image/png"};base64,${base64}`;
  const openai = new OpenAI({ apiKey, baseURL });

  const completion = await openai.chat.completions.create({
    model: "qwen3-vl-plus",
    messages: [
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: dataUrl } },
          { type: "text", text: buildPrompt() },
        ],
      },
    ],
  });

  const content = completion.choices?.[0]?.message?.content ?? "";
  const parsed = extractJson(content);
  if (!parsed) {
    throw new Error("Failed to parse model response");
  }

  return normalizeFields(parsed);
}
