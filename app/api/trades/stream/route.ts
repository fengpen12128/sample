import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

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
  const offset = Math.max(0, Math.trunc(offsetRaw));
  const limit = Math.min(50, Math.max(1, Math.trunc(limitRaw)));
  const resultFilter = resultRaw && resultRaw.toLowerCase() !== "all" ? resultRaw : null;
  const where = resultFilter
    ? { result: { equals: resultFilter, mode: "insensitive" as const } }
    : undefined;

  const [items, total] = await Promise.all([
    prisma.trade.findMany({
      where,
      orderBy: [{ entryTime: "desc" }, { id: "desc" }],
      skip: offset,
      take: limit,
    }),
    prisma.trade.count({ where }),
  ]);

  const payload = {
    items: items.map((t) => ({
      id: t.id,
      timeframe: t.timeframe,
      trendAssessment: t.trendAssessment,
      marketPhase: t.marketPhase,
      symbol: t.symbol,
      direction: t.direction,
      result: t.result,
      tradeMode: t.tradeMode,
      entryTime: t.entryTime.toISOString(),
      exitTime: t.exitTime.toISOString(),
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
