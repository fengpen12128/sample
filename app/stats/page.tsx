export const dynamic = "force-dynamic";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { RiskStatsCharts } from "@/components/risk-stats-charts";
import { prisma } from "@/lib/prisma";
import { ensureTradeIdStorage } from "@/lib/trade-id-storage";

export default async function StatsPage() {
  await ensureTradeIdStorage();

  const trades = await prisma.trade.findMany({
    orderBy: [{ entryTime: "asc" }, { id: "asc" }],
    select: {
      id: true,
      entryTime: true,
      direction: true,
      entryPoint: true,
      closingPoint: true,
      slPoint: true,
      actualRMultiple: true,
      pnlAmount: true,
    },
  });

  const chartTrades = trades.map((trade) => ({
    ...trade,
    entryTime: trade.entryTime.toISOString(),
  }));

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full lg:w-[70%] max-w-none space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-zinc-100">Risk Stats</h1>
            <p className="text-sm text-zinc-400">
              Daily self-check for left-tail risk control.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/">Back to Table</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/stream">Infinite Stream</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/stats/structure">Structure Stats</Link>
            </Button>
          </div>
        </div>
        <RiskStatsCharts trades={chartTrades} />
      </div>
    </main>
  );
}
