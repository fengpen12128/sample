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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/prisma";
import { ensureTradeIdStorage } from "@/lib/trade-id-storage";
import type { Prisma } from "@prisma/client";
import { formatWallClockYmdHms } from "@/lib/wall-clock-datetime";

type TradeRow = Awaited<ReturnType<typeof prisma.trade.findMany>>[number];

function formatDateTime(value: Date | null) {
  if (!value) return "—";
  return formatWallClockYmdHms(value) || "—";
}

function getSingleParam(value: string | string[] | undefined) {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value[0]?.trim() ?? "";
  return "";
}

function parseBigIntParam(value: string) {
  if (!value) return null;
  if (!/^\d+$/.test(value)) return null;
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: PageProps) {
  await ensureTradeIdStorage();

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const errorParam = resolvedSearchParams?.error;
  const error =
    typeof errorParam === "string"
      ? errorParam
      : Array.isArray(errorParam)
        ? errorParam[0]
        : null;

  const resultFilter = getSingleParam(resolvedSearchParams?.result);
  const tradePlatformFilter = getSingleParam(resolvedSearchParams?.tradePlatform);
  const liveModeFilter = getSingleParam(resolvedSearchParams?.tradeMode);
  const idFilter = getSingleParam(resolvedSearchParams?.id);
  const normalizedResultFilter =
    resultFilter && resultFilter.toLowerCase() !== "all" ? resultFilter : "";
  const normalizedTradePlatformFilter =
    tradePlatformFilter && tradePlatformFilter.toLowerCase() !== "all"
      ? tradePlatformFilter
      : "";
  const normalizedLiveModeFilter =
    liveModeFilter && liveModeFilter.toLowerCase() !== "all" ? liveModeFilter : "";
  const idFilterValue = parseBigIntParam(idFilter);

  const whereFilters = [
    normalizedResultFilter
      ? {
          result: {
            equals: normalizedResultFilter,
            mode: "insensitive" as const,
          },
        }
      : null,
    normalizedTradePlatformFilter
      ? {
          tradePlatform: {
            equals: normalizedTradePlatformFilter,
            mode: "insensitive" as const,
          },
        }
      : null,
    normalizedLiveModeFilter
      ? {
          tradeMode: {
            equals: normalizedLiveModeFilter,
            mode: "insensitive" as const,
          },
        }
      : null,
    idFilterValue !== null
      ? {
          id: idFilterValue,
        }
      : null,
  ].filter(Boolean) as Prisma.TradeWhereInput[];

  const trades: TradeRow[] = await prisma.trade.findMany({
    where: whereFilters.length ? { AND: whereFilters } : undefined,
    orderBy: [{ entryTime: "desc" }, { id: "desc" }],
  });
  const exportTrades = trades.map((t) => ({
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
  }));

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
          <Button asChild size="sm" variant="outline">
            <Link href="/stats">Risk Stats</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/stats/structure">Structure Stats</Link>
          </Button>
        </div>
        <div className="mb-4 rounded-lg border border-zinc-900 bg-zinc-950/30 px-4 py-3">
          <form className="space-y-3" method="get">
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Result</Label>
                <select
                  name="result"
                  defaultValue={resultFilter || "all"}
                  className="h-8 w-full rounded-md border border-input bg-transparent px-3 text-xs text-zinc-100 shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <option value="all" className="bg-zinc-900 text-zinc-100">All</option>
                  <option value="win" className="bg-zinc-900 text-zinc-100">Win</option>
                  <option value="loss" className="bg-zinc-900 text-zinc-100">Loss</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Trade platform</Label>
                <select
                  name="tradePlatform"
                  defaultValue={tradePlatformFilter || "all"}
                  className="h-8 w-full rounded-md border border-input bg-transparent px-3 text-xs text-zinc-100 shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <option value="all" className="bg-zinc-900 text-zinc-100">All</option>
                  <option value="Bybit" className="bg-zinc-900 text-zinc-100">Bybit</option>
                  <option value="Pepperstone" className="bg-zinc-900 text-zinc-100">Pepperstone</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Live mode</Label>
                <select
                  name="tradeMode"
                  defaultValue={liveModeFilter || "all"}
                  className="h-8 w-full rounded-md border border-input bg-transparent px-3 text-xs text-zinc-100 shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <option value="all" className="bg-zinc-900 text-zinc-100">All</option>
                  <option value="live" className="bg-zinc-900 text-zinc-100">Live</option>
                  <option value="demo" className="bg-zinc-900 text-zinc-100">Demo</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">ID</Label>
                <Input
                  name="id"
                  defaultValue={idFilter}
                  placeholder="e.g. 10000"
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button size="sm" type="submit">
                Search
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/">Clear</Link>
              </Button>
            </div>
          </form>
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
              <TableHead className="sticky left-0 z-20 w-[70px] bg-zinc-950/30">
                Actions
              </TableHead>
              <TableHead className="w-[70px]">ID</TableHead>
              <TableHead className="w-[110px]">PnL amount</TableHead>
              <TableHead className="w-[120px]">Entry Point</TableHead>
              <TableHead className="w-[120px]">Exit Point</TableHead>
              <TableHead className="w-[110px]">Symbol</TableHead>
              <TableHead className="w-[90px]">Direction</TableHead>
              <TableHead className="w-[90px]">Result</TableHead>
              <TableHead className="w-[150px]">Entry time</TableHead>
              <TableHead className="w-[150px]">Exit time</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {trades.map((t) => (
              <TableRow key={String(t.id)}>
                <TableCell className="sticky left-0 z-10 whitespace-nowrap bg-zinc-950/30">
                  <TradeRowActions
                    trade={{
                      id: String(t.id),
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
                <TableCell className="whitespace-nowrap text-xs text-zinc-300">
                  #{String(t.id)}
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
