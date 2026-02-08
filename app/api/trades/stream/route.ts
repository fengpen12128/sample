import { NextResponse } from "next/server";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatWallClockYmdHms } from "@/lib/wall-clock-datetime";

export const dynamic = "force-dynamic";

function parseNumber(value: string | null, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const offsetRaw = parseNumber(searchParams.get("offset"), 0);
  const limitRaw = parseNumber(searchParams.get("limit"), 10);
  const resultRaw = searchParams.get("result")?.trim();
  const directionRaw = searchParams.get("direction")?.trim();
  const tradeModeRaw = searchParams.get("tradeMode")?.trim();
  const tradePlatformRaw = searchParams.get("tradePlatform")?.trim();
  const offset = Math.max(0, Math.trunc(offsetRaw));
  const limit = Math.min(50, Math.max(1, Math.trunc(limitRaw)));
  const resultFilter = resultRaw && resultRaw.toLowerCase() !== "all" ? resultRaw : null;
  const directionFilter =
    directionRaw && directionRaw.toLowerCase() !== "all" ? directionRaw : null;
  const tradeModeFilter =
    tradeModeRaw && tradeModeRaw.toLowerCase() !== "all" ? tradeModeRaw : null;
  const tradePlatformFilter =
    tradePlatformRaw && tradePlatformRaw.toLowerCase() !== "all"
      ? tradePlatformRaw
      : null;

  const where: Prisma.TradeWhereInput = {};
  if (resultFilter) where.result = { equals: resultFilter, mode: "insensitive" };
  if (directionFilter) where.direction = { equals: directionFilter, mode: "insensitive" };
  if (tradeModeFilter) where.tradeMode = { equals: tradeModeFilter, mode: "insensitive" };
  if (tradePlatformFilter) {
    where.tradePlatform = { equals: tradePlatformFilter, mode: "insensitive" };
  }

  const [items, total] = await Promise.all([
    prisma.trade.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: [{ entryTime: "desc" }, { id: "desc" }],
      skip: offset,
      take: limit,
    }),
    prisma.trade.count({ where: Object.keys(where).length ? where : undefined }),
  ]);

  const payload = {
    items: items.map((t) => ({
      id: t.id,
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
    hasMore: offset + items.length < total,
  };

  return NextResponse.json(payload);
}
