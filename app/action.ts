"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { parseWallClockDateTime } from "@/lib/wall-clock-datetime";

function requiredInt(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isInteger(n)) return null;
  return n;
}

function requiredString(formData: FormData, key: string) {
  const v = String(formData.get(key) ?? "").trim();
  return v.length ? v : null;
}

function optionalString(formData: FormData, key: string) {
  const v = String(formData.get(key) ?? "").trim();
  return v.length ? v : null;
}

function requiredNumber(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function optionalNumber(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function requiredBoolean(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim().toLowerCase();
  if (!raw) return null;
  if (raw === "true") return true;
  if (raw === "false") return false;
  return null;
}

function optionalBoolean(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim().toLowerCase();
  if (!raw) return null;
  if (raw === "true") return true;
  if (raw === "false") return false;
  return null;
}

function requiredDate(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  let normalized = raw;
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/.test(normalized)) {
    normalized = `${normalized}:00`;
  }
  const d = parseWallClockDateTime(normalized);
  return d;
}

function roundToTwo(n: number) {
  return Math.round(n * 100) / 100;
}

function computeRMultiple(entry: number, sl: number, target: number) {
  const risk = entry - sl;
  if (!Number.isFinite(risk) || risk === 0) return null;
  const reward = target - entry;
  if (!Number.isFinite(reward)) return null;
  return roundToTwo(reward / risk);
}

function parseTradeInput(formData: FormData) {
  const timeframe = optionalString(formData, "timeframe");
  const trendAssessment = optionalString(formData, "trendAssessment");
  const marketPhase = optionalString(formData, "marketPhase");

  const symbol = requiredString(formData, "symbol");
  const tradePlatform = requiredString(formData, "tradePlatform");
  const direction = requiredString(formData, "direction");
  const result = requiredString(formData, "result");
  const tradeMode = requiredString(formData, "tradeMode") ?? "live";
  const entryTime = requiredDate(formData, "entryTime");
  const exitTime = requiredDate(formData, "exitTime");
  const pnlAmount = requiredNumber(formData, "pnlAmount");

  const setupType = optionalString(formData, "setupType");
  const setupQuality = optionalString(formData, "setupQuality");
  const entryType = optionalString(formData, "entryType");

  const entryPoint = requiredNumber(formData, "entryPoint");
  const closingPoint = requiredNumber(formData, "closingPoint");
  const slPoint = optionalNumber(formData, "slPoint");
  const tpPoint = optionalNumber(formData, "tpPoint");
  const earlyExit = optionalBoolean(formData, "earlyExit");
  const actualRMultiple =
    entryPoint !== null && slPoint !== null && closingPoint !== null
      ? computeRMultiple(entryPoint, slPoint, closingPoint)
      : null;
  const plannedRMultiple =
    entryPoint !== null && slPoint !== null && tpPoint !== null
      ? computeRMultiple(entryPoint, slPoint, tpPoint)
      : null;

  const entryReason = optionalString(formData, "entryReason");
  const expectedScenario = optionalString(formData, "expectedScenario");
  const confidenceLevel = optionalNumber(formData, "confidenceLevel");

  const screenshotUrl = optionalString(formData, "screenshotUrl");

  const ok =
    symbol &&
    tradePlatform &&
    direction &&
    result &&
    tradeMode &&
    entryTime &&
    exitTime &&
    pnlAmount !== null &&
    entryPoint !== null &&
    closingPoint !== null;

  if (!ok) {
    return {
      ok: false as const,
      error: "Missing/invalid fields. Please complete the form.",
    };
  }

  if (
    confidenceLevel !== null &&
    (!Number.isInteger(confidenceLevel) ||
      confidenceLevel < 1 ||
      confidenceLevel > 5)
  ) {
    return { ok: false as const, error: "confidenceLevel must be 1–5" };
  }

  return {
    ok: true as const,
    data: {
      timeframe,
      trendAssessment,
      marketPhase,
      symbol,
      tradePlatform,
      direction,
      result,
      tradeMode,
      entryTime,
      exitTime,
      pnlAmount,
      setupType,
      setupQuality,
      entryType,
      entryPoint,
      closingPoint,
      slPoint,
      tpPoint,
      actualRMultiple,
      plannedRMultiple,
      earlyExit,
      entryReason,
      expectedScenario,
      confidenceLevel: confidenceLevel !== null ? Math.trunc(confidenceLevel) : null,
      screenshotUrl,
    },
  };
}

export async function createTrade(formData: FormData) {
  const parsed = parseTradeInput(formData);
  if (!parsed.ok) {
    return { ok: false as const, error: parsed.error };
  }

  await prisma.trade.create({
    data: parsed.data,
  });

  revalidatePath("/");
  revalidatePath("/stream");
  return { ok: true as const };
}

export async function updateTrade(formData: FormData) {
  const id = requiredInt(formData, "id");
  if (id === null) {
    return { ok: false as const, error: "Invalid id" };
  }

  const parsed = parseTradeInput(formData);
  if (!parsed.ok) {
    return { ok: false as const, error: parsed.error };
  }

  await prisma.trade.update({
    where: { id },
    data: parsed.data,
  });

  revalidatePath("/");
  revalidatePath("/stream");
  return { ok: true as const };
}

export async function updateTradeReview(formData: FormData) {
  const id = requiredInt(formData, "id");
  if (id === null) {
    return { ok: false as const, error: "Invalid id" };
  }

  const text = String(formData.get("entryReason") ?? "");
  const normalized = text.trim();
  const entryReason = normalized ? normalized : null;

  await prisma.trade.update({
    where: { id },
    data: { entryReason },
  });

  revalidatePath("/stream");
  return { ok: true as const };
}

export async function updateTradeScreenshot(formData: FormData) {
  const id = requiredInt(formData, "id");
  if (id === null) {
    return { ok: false as const, error: "Invalid id" };
  }

  const screenshotUrl = requiredString(formData, "screenshotUrl");
  if (!screenshotUrl) {
    return { ok: false as const, error: "Invalid screenshot url" };
  }

  await prisma.trade.update({
    where: { id },
    data: { screenshotUrl },
  });

  revalidatePath("/");
  revalidatePath("/stream");
  return { ok: true as const };
}

export async function deleteTrade(formData: FormData) {
  const id = requiredInt(formData, "id");
  if (id === null) {
    return;
  }

  await prisma.trade.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/stream");
}
