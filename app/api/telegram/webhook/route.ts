import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { parseTradeImageFromBuffer } from "@/lib/trade-image-parse";
import { downloadTelegramFile, getTelegramFile } from "@/lib/telegram";

export const runtime = "nodejs";

type TelegramPhotoSize = {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
};

type TelegramMessage = {
  message_id: number;
  chat: { id: number };
  photo?: TelegramPhotoSize[];
};

type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
};

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

function parseNumber(value: string | boolean) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function parseBoolean(value: string | boolean) {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return null;
}

function parseDate(value: string | boolean) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  let normalized = trimmed;
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/.test(normalized)) {
    normalized = `${normalized}:00`;
  }
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized)) {
    normalized = normalized.replace(" ", "T");
  }
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseString(value: string | boolean) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function pickLargestPhoto(photos: TelegramPhotoSize[]) {
  return photos[photos.length - 1];
}

export async function POST(request: Request): Promise<NextResponse> {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const header = request.headers.get("x-telegram-bot-api-secret-token");
    if (header !== secret) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const message = update.message;
  const photos = message?.photo;
  if (!message || !photos || photos.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const photo = pickLargestPhoto(photos);
  const fileInfo = await getTelegramFile(photo.file_id);
  const downloaded = await downloadTelegramFile(fileInfo.file_path || "");
  const parsed = await parseTradeImageFromBuffer(downloaded.buffer, downloaded.contentType);

  const pnlAmount = parseNumber(parsed.pnlAmount);
  const symbol = parseString(parsed.symbol);
  const direction = parsed.direction
    ? normalizeDirection(String(parsed.direction))
    : null;
  const result = parsed.result ? normalizeResult(String(parsed.result)) : null;
  const tradeMode = parseString(parsed.tradeMode) ?? "live";
  const entryTime = parseDate(parsed.entryTime);
  const exitTime = parseDate(parsed.exitTime);
  const entryPoint = parseNumber(parsed.entryPoint);
  const closingPoint = parseNumber(parsed.closingPoint);

  if (
    pnlAmount === null ||
    !symbol ||
    !direction ||
    !result ||
    !tradeMode ||
    !entryTime ||
    !exitTime ||
    entryPoint === null ||
    closingPoint === null
  ) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const slPoint = parseNumber(parsed.slPoint);
  const tpPoint = parseNumber(parsed.tpPoint);
  const earlyExit = parseBoolean(parsed.earlyExit);
  const confidenceLevel = parseNumber(parsed.confidenceLevel);

  const actualRMultiple =
    slPoint !== null ? computeRMultiple(entryPoint, slPoint, closingPoint) : null;
  const plannedRMultiple =
    slPoint !== null && tpPoint !== null
      ? computeRMultiple(entryPoint, slPoint, tpPoint)
      : null;

  await prisma.trade.create({
    data: {
      timeframe: parseString(parsed.timeframe),
      trendAssessment: parseString(parsed.trendAssessment),
      marketPhase: parseString(parsed.marketPhase),
      symbol,
      direction,
      result,
      tradeMode,
      entryTime,
      exitTime,
      pnlAmount,
      setupType: parseString(parsed.setupType),
      setupQuality: null,
      entryType: parseString(parsed.entryType),
      entryPoint,
      closingPoint,
      slPoint,
      tpPoint,
      actualRMultiple,
      plannedRMultiple,
      earlyExit,
      entryReason: parseString(parsed.entryReason),
      expectedScenario: null,
      confidenceLevel:
        confidenceLevel !== null && Number.isInteger(confidenceLevel)
          ? Math.trunc(confidenceLevel)
          : null,
      screenshotUrl: null,
      telegramFileId: photo.file_id,
      telegramFileUniqueId: photo.file_unique_id,
    },
  });

  return NextResponse.json({ ok: true });
}

function computeRMultiple(entry: number, sl: number, target: number) {
  const risk = entry - sl;
  if (!Number.isFinite(risk) || risk === 0) return null;
  const reward = target - entry;
  if (!Number.isFinite(reward)) return null;
  return Math.round((reward / risk) * 100) / 100;
}
