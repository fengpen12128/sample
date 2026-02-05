import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ALLOWED_FIELDS = [
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

const baseURL = "https://dashscope.aliyuncs.com/compatible-mode/v1";

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

function normalizeFields(parsed: Record<string, unknown>) {
  const normalized: Record<AllowedField, string | boolean> = {} as Record<
    AllowedField,
    string | boolean
  >;
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
      normalized[key] = value;
      return;
    }
    normalized[key] = "";
  });
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

export async function POST(request: Request): Promise<NextResponse> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing DASHSCOPE_API_KEY" }, { status: 500 });
  }

  let file: File | null = null;
  try {
    const formData = await request.formData();
    const formFile = formData.get("file");
    if (formFile instanceof File) {
      file = formFile;
    }
  } catch {
    file = null;
  }

  if (!file) {
    return NextResponse.json({ error: "Missing image file" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const contentType = file.type || "image/png";
  const dataUrl = `data:${contentType};base64,${base64}`;

  const openai = new OpenAI({ apiKey, baseURL });

  try {
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
      return NextResponse.json({ error: "Failed to parse model response" }, { status: 502 });
    }

    return NextResponse.json({ data: normalizeFields(parsed) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI parse failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
