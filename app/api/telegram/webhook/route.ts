import { NextResponse } from "next/server";

import logger from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { generateSnowflakeId } from "@/lib/snowflake-id";
import { parseTradeImageFromBuffer } from "@/lib/trade-image-parse";
import { downloadTelegramFile, getTelegramFile, sendTelegramMessage } from "@/lib/telegram";

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
  logger.info({ url: request.url, method: request.method }, "Telegram webhook hit");

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const header = request.headers.get("x-telegram-bot-api-secret-token");
    logger.info(
      {
        secret,
        header,
        contentType: request.headers.get("content-type"),
      },
      "Telegram webhook secret check",
    );
    if (header !== secret) {
      logger.warn("Telegram webhook secret mismatch");
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  } else {
    logger.warn("Telegram webhook secret missing in env");
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    logger.warn("Telegram webhook invalid JSON body");
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const message = update.message;
  const photos = message?.photo;
  logger.info(
    {
      updateId: update.update_id,
      messageId: message?.message_id,
      photosCount: photos?.length ?? 0,
    },
    "Telegram webhook update",
  );
  if (!message || !photos || photos.length === 0) {
    logger.info("Telegram webhook missing photo message");
    return NextResponse.json({ ok: true });
  }

  const chatId = message.chat.id;
  const photo = pickLargestPhoto(photos);
  logger.info({ fileId: photo.file_id }, "Telegram photo selected");

  try {
    const fileInfo = await getTelegramFile(photo.file_id);
    logger.info({ filePath: fileInfo.file_path }, "Telegram file info");
    const downloaded = await downloadTelegramFile(fileInfo.file_path || "");
    logger.info({ contentType: downloaded.contentType }, "Telegram file downloaded");
    const parsed = await parseTradeImageFromBuffer(
      downloaded.buffer,
      downloaded.contentType,
    );
    logger.info({ parsed }, "Telegram image parsed");

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
      logger.info("Telegram webhook skipped: missing required fields");
      await sendTelegramMessage(
        chatId,
        "Image parsed, but required fields are missing. Please check the screenshot.",
      );
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
        id: await generateSnowflakeId(),
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

    logger.info("Telegram webhook trade created");
    await sendTelegramMessage(chatId, "Trade created successfully.");
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error(error, "Telegram webhook failed");
    const reason =
      error instanceof Error ? error.message : "Unknown error during processing.";
    await sendTelegramMessage(chatId, `Processing failed: ${reason}`);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

function computeRMultiple(entry: number, sl: number, target: number) {
  const risk = entry - sl;
  if (!Number.isFinite(risk) || risk === 0) return null;
  const reward = target - entry;
  if (!Number.isFinite(reward)) return null;
  return Math.round((reward / risk) * 100) / 100;
}
