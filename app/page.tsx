export const dynamic = "force-dynamic";

import { HomeTableClient } from "@/components/home-table-client";
import { prisma } from "@/lib/prisma";
import { ensureTradeIdStorage } from "@/lib/trade-id-storage";
import { formatWallClockYmdHms } from "@/lib/wall-clock-datetime";

export default async function Home() {
  await ensureTradeIdStorage();

  const trades = await prisma.trade.findMany({
    orderBy: [{ entryTime: "desc" }, { id: "desc" }],
  });

  const initialTrades = trades.map((trade) => ({
    id: String(trade.id),
    timeframe: trade.timeframe,
    trendAssessment: trade.trendAssessment,
    marketPhase: trade.marketPhase,
    symbol: trade.symbol,
    tradePlatform: trade.tradePlatform,
    direction: trade.direction,
    result: trade.result,
    tradeMode: trade.tradeMode,
    entryTime: formatWallClockYmdHms(trade.entryTime),
    exitTime: formatWallClockYmdHms(trade.exitTime),
    pnlAmount: trade.pnlAmount,
    setupType: trade.setupType,
    setupQuality: trade.setupQuality,
    entryType: trade.entryType,
    entryPoint: trade.entryPoint,
    closingPoint: trade.closingPoint,
    slPoint: trade.slPoint,
    tpPoint: trade.tpPoint,
    actualRMultiple: trade.actualRMultiple,
    plannedRMultiple: trade.plannedRMultiple,
    earlyExit: trade.earlyExit,
    entryReason: trade.entryReason,
    expectedScenario: trade.expectedScenario,
    confidenceLevel: trade.confidenceLevel,
    screenshotUrl: trade.screenshotUrl,
  }));

  return <HomeTableClient initialTrades={initialTrades} />;
}
