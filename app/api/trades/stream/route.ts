import { NextResponse } from "next/server";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureTradeIdStorage } from "@/lib/trade-id-storage";
import { formatWallClockYmdHms } from "@/lib/wall-clock-datetime";

export const dynamic = "force-dynamic";

function parseNumber(value: string | null, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseBigIntParam(value: string | null) {
  if (!value) return null;
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) return null;
  try {
    return BigInt(normalized);
  } catch {
    return null;
  }
}

function parseDateOnlyParam(value: string | null) {
  if (!value) return null;
  const normalized = value.trim();
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  if (Number.isNaN(start.getTime())) return null;
  if (
    start.getUTCFullYear() !== year ||
    start.getUTCMonth() !== month - 1 ||
    start.getUTCDate() !== day
  ) {
    return null;
  }
  const end = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0));
  if (Number.isNaN(end.getTime())) return null;
  return { start, end };
}

export async function GET(request: Request) {
  await ensureTradeIdStorage();

  const { searchParams } = new URL(request.url);
  const offsetRaw = parseNumber(searchParams.get("offset"), 0);
  const limitRaw = parseNumber(searchParams.get("limit"), 10);
  const resultRaw = searchParams.get("result")?.trim();
  const directionRaw = searchParams.get("direction")?.trim();
  const tradeModeRaw = searchParams.get("tradeMode")?.trim();
  const tradePlatformRaw = searchParams.get("tradePlatform")?.trim();
  const hasScreenshotRaw = searchParams.get("hasScreenshot")?.trim().toLowerCase();
  const idFilterRaw = searchParams.get("id");
  const entryDateRaw = searchParams.get("entryDate");
  const fetchAllRaw = searchParams.get("fetchAll");
  const offset = Math.max(0, Math.trunc(offsetRaw));
  const limit = Math.min(50, Math.max(1, Math.trunc(limitRaw)));
  const fetchAll = fetchAllRaw === "1" || fetchAllRaw === "true";
  const idFilter = parseBigIntParam(idFilterRaw);
  const resultFilter = resultRaw && resultRaw.toLowerCase() !== "all" ? resultRaw : null;
  const directionFilter =
    directionRaw && directionRaw.toLowerCase() !== "all" ? directionRaw : null;
  const tradeModeFilter =
    tradeModeRaw && tradeModeRaw.toLowerCase() !== "all" ? tradeModeRaw : null;
  const tradePlatformFilter =
    tradePlatformRaw && tradePlatformRaw.toLowerCase() !== "all"
      ? tradePlatformRaw
      : null;
  const hasScreenshotFilter =
    hasScreenshotRaw === "yes" || hasScreenshotRaw === "no" ? hasScreenshotRaw : null;
  const entryDateFilter = parseDateOnlyParam(entryDateRaw);

  const andFilters: Prisma.TradeWhereInput[] = [];
  if (resultFilter) andFilters.push({ result: { equals: resultFilter, mode: "insensitive" } });
  if (directionFilter) {
    andFilters.push({ direction: { equals: directionFilter, mode: "insensitive" } });
  }
  if (tradeModeFilter) {
    andFilters.push({ tradeMode: { equals: tradeModeFilter, mode: "insensitive" } });
  }
  if (tradePlatformFilter) {
    andFilters.push({ tradePlatform: { equals: tradePlatformFilter, mode: "insensitive" } });
  }
  if (hasScreenshotFilter === "yes") {
    andFilters.push({ screenshotUrl: { not: null } });
    andFilters.push({ screenshotUrl: { not: "" } });
  }
  if (hasScreenshotFilter === "no") {
    andFilters.push({
      OR: [{ screenshotUrl: null }, { screenshotUrl: "" }],
    });
  }
  if (idFilter !== null) {
    andFilters.push({ id: idFilter });
  }
  if (entryDateFilter) {
    andFilters.push({
      entryTime: {
      gte: entryDateFilter.start,
      lt: entryDateFilter.end,
      },
    });
  }

  const whereInput: Prisma.TradeWhereInput | undefined = andFilters.length
    ? { AND: andFilters }
    : undefined;

  const [items, total] = fetchAll
    ? await Promise.all([
        prisma.trade.findMany({
          where: whereInput,
          orderBy: [{ entryTime: "desc" }, { id: "desc" }],
        }),
        prisma.trade.count({ where: whereInput }),
      ])
    : await Promise.all([
        prisma.trade.findMany({
          where: whereInput,
          orderBy: [{ entryTime: "desc" }, { id: "desc" }],
          skip: offset,
          take: limit,
        }),
        prisma.trade.count({ where: whereInput }),
      ]);

  const payload = {
    items: items.map((t) => ({
      id: String(t.id),
      timeframe: t.timeframe,
      trendAssessment: t.trendAssessment,
      marketPhase: t.marketPhase,
      symbol: t.symbol,
      tradePlatform: t.tradePlatform,
      direction: t.direction,
      result: t.result,
      tradeMode: t.tradeMode,
      entryTime: formatWallClockYmdHms(t.entryTime),
      exitTime: formatWallClockYmdHms(t.exitTime),
      pnlAmount: t.pnlAmount,
      setupType: t.setupType,
      setupQuality: t.setupQuality,
      entryType: t.entryType,
      entryPoint: t.entryPoint,
      closingPoint: t.closingPoint,
      slPoint: t.slPoint,
      tpPoint: t.tpPoint,
      actualRMultiple: t.actualRMultiple,
      plannedRMultiple: t.plannedRMultiple,
      earlyExit: t.earlyExit,
      entryReason: t.entryReason,
      expectedScenario: t.expectedScenario,
      confidenceLevel: t.confidenceLevel,
      screenshotUrl: t.screenshotUrl,
    })),
    total,
    hasMore: fetchAll ? false : offset + items.length < total,
  };

  return NextResponse.json(payload);
}
