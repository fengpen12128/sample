"use server";

import { redirect } from "next/navigation";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

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

function requiredNumber(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function requiredDate(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
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
  const timeframe = requiredString(formData, "timeframe");
  const trendAssessment = requiredString(formData, "trendAssessment");
  const marketPhase = requiredString(formData, "marketPhase");

  const symbol = requiredString(formData, "symbol");
  const direction = requiredString(formData, "direction");
  const result = requiredString(formData, "result");
  const entryTime = requiredDate(formData, "entryTime");
  const exitTime = requiredDate(formData, "exitTime");
  const pnlAmount = requiredNumber(formData, "pnlAmount");

  const setupType = requiredString(formData, "setupType");
  const setupQuality = requiredString(formData, "setupQuality");
  const entryType = requiredString(formData, "entryType");

  const entryPoint = requiredNumber(formData, "entryPoint");
  const closingPoint = requiredNumber(formData, "closingPoint");
  const slPoint = requiredNumber(formData, "slPoint");
  const tpPoint = requiredNumber(formData, "tpPoint");
  const actualRMultiple =
    entryPoint !== null && slPoint !== null && closingPoint !== null
      ? computeRMultiple(entryPoint, slPoint, closingPoint)
      : null;
  const plannedRMultiple =
    entryPoint !== null && slPoint !== null && tpPoint !== null
      ? computeRMultiple(entryPoint, slPoint, tpPoint)
      : null;

  const entryReason = requiredString(formData, "entryReason");
  const expectedScenario = requiredString(formData, "expectedScenario");
  const confidenceLevel = requiredNumber(formData, "confidenceLevel");

  const screenshotUrl = String(formData.get("screenshotUrl") ?? "").trim();

  const ok =
    timeframe &&
    trendAssessment &&
    marketPhase &&
    symbol &&
    direction &&
    result &&
    entryTime &&
    exitTime &&
    pnlAmount !== null &&
    setupType &&
    setupQuality &&
    entryType &&
    entryPoint !== null &&
    closingPoint !== null &&
    slPoint !== null &&
    tpPoint !== null &&
    actualRMultiple !== null &&
    plannedRMultiple !== null &&
    entryReason &&
    expectedScenario &&
    confidenceLevel !== null;

  if (!ok) {
    return {
      ok: false as const,
      error: "Missing/invalid fields. Please complete the form.",
    };
  }

  if (confidenceLevel < 1 || confidenceLevel > 5) {
    return { ok: false as const, error: "confidenceLevel must be 1–5" };
  }

  return {
    ok: true as const,
    data: {
      timeframe,
      trendAssessment,
      marketPhase,
      symbol,
      direction,
      result,
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
      entryReason,
      expectedScenario,
      confidenceLevel: Math.trunc(confidenceLevel),
      screenshotUrl,
    },
  };
}

export async function createTrade(formData: FormData) {
  const parsed = parseTradeInput(formData);
  if (!parsed.ok) {
    redirect("/?error=" + encodeURIComponent(parsed.error));
  }

  await prisma.trade.create({
    data: parsed.data as unknown as Prisma.TradeUncheckedCreateInput,
  });
  redirect("/");
}

export async function updateTrade(formData: FormData) {
  const id = requiredInt(formData, "id");
  if (id === null) redirect("/?error=" + encodeURIComponent("Invalid id"));

  const parsed = parseTradeInput(formData);
  if (!parsed.ok) redirect("/?error=" + encodeURIComponent(parsed.error));

  await prisma.trade.update({
    where: { id },
    data: parsed.data as unknown as Prisma.TradeUncheckedUpdateInput,
  });

  redirect("/");
}

export async function deleteTrade(formData: FormData) {
  const id = requiredInt(formData, "id");
  if (id === null) redirect("/?error=" + encodeURIComponent("Invalid id"));

  await prisma.trade.delete({ where: { id } });
  redirect("/");
}

