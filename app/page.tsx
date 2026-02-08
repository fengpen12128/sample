export const dynamic = "force-dynamic";

import Link from "next/link";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ModeToggle } from "@/components/mode-toggle";
import { TradeExportAllButton } from "@/components/trade-export-all";
import { TradeCreateDialog } from "@/components/trade-create-dialog";
import { TradeRowActions } from "@/components/trade-row-actions";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { formatWallClockYmdHms } from "@/lib/wall-clock-datetime";

type TradeRow = Awaited<ReturnType<typeof prisma.trade.findMany>>[number];

function formatDateTime(value: Date | null) {
  if (!value) return "—";
  return formatWallClockYmdHms(value) || "—";
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: PageProps) {
  const trades: TradeRow[] = await prisma.trade.findMany({
    orderBy: [{ entryTime: "desc" }, { id: "desc" }],
  });
  const exportTrades = trades.map((t) => ({
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
  }));

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const errorParam = resolvedSearchParams?.error;
  const error =
    typeof errorParam === "string"
      ? errorParam
      : Array.isArray(errorParam)
        ? errorParam[0]
        : null;

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full lg:w-[70%] max-w-none">
        <div className="mb-3 flex items-center justify-end gap-2">
          <ModeToggle />
          <TradeCreateDialog />
          <TradeExportAllButton trades={exportTrades} />
          <Button
            asChild
            size="sm"
            className="bg-emerald-600 text-white hover:bg-emerald-500"
          >
            <Link href="/stream">Infinite Stream</Link>
          </Button>
        </div>
        <Table className="rounded-lg border border-zinc-900 bg-zinc-950/30 table-fixed">
          <TableCaption>
            <div className="flex items-center justify-between gap-3">
              <div className="text-zinc-500">
                {error ? (
                  <span className="text-red-400">Error: {error}</span>
                ) : (
                  <span>Showing {trades.length} trades.</span>
                )}
              </div>
            </div>
          </TableCaption>

	          <TableHeader>
	            <TableRow>
	              <TableHead className="w-[70px]">ID</TableHead>
	              <TableHead className="w-[110px]">PnL amount</TableHead>
	              <TableHead className="w-[120px]">Entry Point</TableHead>
	              <TableHead className="w-[120px]">Exit Point</TableHead>
	              <TableHead className="w-[110px]">Symbol</TableHead>
	              <TableHead className="w-[90px]">Direction</TableHead>
	              <TableHead className="w-[90px]">Result</TableHead>
	              <TableHead className="w-[150px]">Entry time</TableHead>
	              <TableHead className="w-[150px]">Exit time</TableHead>
	              <TableHead className="w-[70px]">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {trades.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="whitespace-nowrap text-xs text-zinc-300">
                  #{t.id}
                </TableCell>
	                <TableCell className="whitespace-nowrap text-xs text-zinc-200">
	                  {t.pnlAmount}
	                </TableCell>
	                <TableCell className="whitespace-nowrap text-xs text-zinc-200">
	                  {t.entryPoint}
	                </TableCell>
	                <TableCell className="whitespace-nowrap text-xs text-zinc-200">
	                  {t.closingPoint}
	                </TableCell>
	                <TableCell className="whitespace-nowrap text-xs text-zinc-200 truncate">
	                  {t.symbol}
	                </TableCell>
	                <TableCell className="whitespace-nowrap text-xs text-zinc-200">
	                  {t.direction}
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs text-zinc-200">
                  {t.result}
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs text-zinc-200">
                  {formatDateTime(t.entryTime)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs text-zinc-200">
                  {formatDateTime(t.exitTime)}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <TradeRowActions
                    trade={{
                      id: t.id,
                      timeframe: t.timeframe,
                      trendAssessment: t.trendAssessment,
                      marketPhase: t.marketPhase,
                      symbol: t.symbol,
                      tradePlatform: t.tradePlatform,
                      direction: t.direction,
                      result: t.result,
                      tradeMode: t.tradeMode,
                      entryTime: t.entryTime,
                      exitTime: t.exitTime,
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
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
