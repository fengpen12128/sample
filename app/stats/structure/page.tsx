export const dynamic = "force-dynamic";

import { readFile } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { StructureStatsCharts } from "@/components/structure-stats-charts";
import { prisma } from "@/lib/prisma";
import { ensureTradeIdStorage } from "@/lib/trade-id-storage";

export default async function StructureStatsPage() {
  await ensureTradeIdStorage();
  const rollingAverageDocPath = path.join(process.cwd(), "Rolling_Average_R.md");
  const rollingAverageDoc = await readFile(rollingAverageDocPath, "utf8").catch(() => "");

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
    id: String(trade.id),
    entryTime: trade.entryTime.toISOString(),
  }));

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full lg:w-[70%] max-w-none space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Structure Stats</h1>
            <p className="text-sm text-muted-foreground">
              System structure recognition against long-term baseline.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/">Back to Table</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/stats">Risk Stats</Link>
            </Button>
          </div>
        </div>
        <StructureStatsCharts trades={chartTrades} rollingAverageDoc={rollingAverageDoc} />
      </div>
    </main>
  );
}
