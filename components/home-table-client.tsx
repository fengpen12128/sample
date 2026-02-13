"use client";

import * as React from "react";
import Link from "next/link";

import { ModeToggle } from "@/components/mode-toggle";
import { TradeExportAllButton } from "@/components/trade-export-all";
import { TradeCreateDialog, type TradeEditable } from "@/components/trade-create-dialog";
import { TradeRowActions } from "@/components/trade-row-actions";
import { Button } from "@/components/ui/button";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { parseWallClockDateTime } from "@/lib/wall-clock-datetime";

export type HomeTradeItem = {
  id: string;
  timeframe: string | null;
  trendAssessment: string | null;
  marketPhase: string | null;
  symbol: string;
  tradePlatform: string | null;
  direction: string;
  result: string;
  tradeMode: string;
  entryTime: string;
  exitTime: string;
  pnlAmount: number;
  setupType: string | null;
  setupQuality: string | null;
  entryType: string | null;
  entryPoint: number;
  closingPoint: number;
  slPoint: number | null;
  tpPoint: number | null;
  actualRMultiple: number | null;
  plannedRMultiple: number | null;
  earlyExit: boolean | null;
  entryReason: string | null;
  expectedScenario: string | null;
  confidenceLevel: number | null;
  screenshotUrl: string | null;
};

type HomeTradesResponse = {
  items: HomeTradeItem[];
};

type SearchFilters = {
  result: string;
  tradePlatform: string;
  tradeMode: string;
  id: string;
  entryDate: string;
};

const DEFAULT_FILTERS: SearchFilters = {
  result: "all",
  tradePlatform: "all",
  tradeMode: "all",
  id: "",
  entryDate: "",
};

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return value;
}

function parseTradeTime(value: string) {
  const parsed = parseWallClockDateTime(value);
  if (parsed) return parsed;
  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? new Date(0) : fallback;
}

function toEditableTrade(trade: HomeTradeItem): TradeEditable {
  return {
    id: trade.id,
    timeframe: trade.timeframe,
    trendAssessment: trade.trendAssessment,
    marketPhase: trade.marketPhase,
    symbol: trade.symbol,
    tradePlatform: trade.tradePlatform,
    direction: trade.direction,
    result: trade.result,
    tradeMode: trade.tradeMode,
    entryTime: parseTradeTime(trade.entryTime),
    exitTime: parseTradeTime(trade.exitTime),
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
  };
}

function buildQueryString(filters: SearchFilters) {
  const params = new URLSearchParams();
  params.set("fetchAll", "1");

  if (filters.result && filters.result.toLowerCase() !== "all") {
    params.set("result", filters.result);
  }
  if (filters.tradePlatform && filters.tradePlatform.toLowerCase() !== "all") {
    params.set("tradePlatform", filters.tradePlatform);
  }
  if (filters.tradeMode && filters.tradeMode.toLowerCase() !== "all") {
    params.set("tradeMode", filters.tradeMode);
  }
  const normalizedId = filters.id.trim();
  if (normalizedId) {
    params.set("id", normalizedId);
  }
  const normalizedEntryDate = filters.entryDate.trim();
  if (normalizedEntryDate) {
    params.set("entryDate", normalizedEntryDate);
  }

  return params.toString();
}

export function HomeTableClient({ initialTrades }: { initialTrades: HomeTradeItem[] }) {
  const [trades, setTrades] = React.useState<HomeTradeItem[]>(initialTrades);
  const [filters, setFilters] = React.useState<SearchFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = React.useState<SearchFilters>(DEFAULT_FILTERS);
  const [searching, setSearching] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const requestIdRef = React.useRef(0);

  const loadTrades = React.useCallback(async (nextFilters: SearchFilters) => {
    const requestId = ++requestIdRef.current;
    setSearching(true);
    setError(null);

    try {
      const queryString = buildQueryString(nextFilters);
      const response = await fetch(`/api/trades/stream?${queryString}`, {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }
      const payload = (await response.json()) as HomeTradesResponse;
      if (requestId !== requestIdRef.current) {
        return;
      }
      setTrades(Array.isArray(payload.items) ? payload.items : []);
    } catch (loadError) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      const message = loadError instanceof Error ? loadError.message : "Search failed.";
      setError(message);
    } finally {
      if (requestId === requestIdRef.current) {
        setSearching(false);
      }
    }
  }, []);

  const refreshAppliedSearch = React.useCallback(() => {
    void loadTrades(appliedFilters);
  }, [appliedFilters, loadTrades]);

  const exportTrades = React.useMemo(
    () =>
      trades.map((trade) => ({
        ...trade,
        entryTime: trade.entryTime,
        exitTime: trade.exitTime,
      })),
    [trades],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextFilters = {
      ...filters,
      id: filters.id.trim(),
      entryDate: filters.entryDate.trim(),
    };
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    await loadTrades(nextFilters);
  };

  const handleClear = async () => {
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    await loadTrades(DEFAULT_FILTERS);
  };

  return (
    <main className="h-[100dvh] overflow-hidden bg-background px-4 pt-6">
      <div className="mx-auto flex h-full w-full max-w-none flex-col lg:w-[70%]">
        <div className="mb-3 shrink-0 flex items-center justify-end gap-2">
          <ModeToggle />
          <TradeCreateDialog onSaved={refreshAppliedSearch} />
          <TradeExportAllButton trades={exportTrades} />
          <Button asChild size="sm" variant="outline">
            <Link href="/stream" target="_blank" rel="noreferrer">
              Infinite Stream
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/stats" target="_blank" rel="noreferrer">
              Risk Stats
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/stats/structure" target="_blank" rel="noreferrer">
              Structure Stats
            </Link>
          </Button>
        </div>
        <div className="mb-4 shrink-0 rounded-md border border-border bg-card/70 px-4 py-3">
          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="grid gap-3 sm:grid-cols-5">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Result</Label>
                <select
                  name="result"
                  value={filters.result}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, result: event.target.value }))
                  }
                  className="h-8 w-full rounded-md border border-input bg-transparent px-3 text-xs text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <option value="all" className="bg-popover text-popover-foreground">
                    All
                  </option>
                  <option value="win" className="bg-popover text-popover-foreground">
                    Win
                  </option>
                  <option value="loss" className="bg-popover text-popover-foreground">
                    Loss
                  </option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Trade platform</Label>
                <select
                  name="tradePlatform"
                  value={filters.tradePlatform}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, tradePlatform: event.target.value }))
                  }
                  className="h-8 w-full rounded-md border border-input bg-transparent px-3 text-xs text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <option value="all" className="bg-popover text-popover-foreground">
                    All
                  </option>
                  <option value="Bybit" className="bg-popover text-popover-foreground">
                    Bybit
                  </option>
                  <option value="Pepperstone" className="bg-popover text-popover-foreground">
                    Pepperstone
                  </option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Live mode</Label>
                <select
                  name="tradeMode"
                  value={filters.tradeMode}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, tradeMode: event.target.value }))
                  }
                  className="h-8 w-full rounded-md border border-input bg-transparent px-3 text-xs text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <option value="all" className="bg-popover text-popover-foreground">
                    All
                  </option>
                  <option value="live" className="bg-popover text-popover-foreground">
                    Live
                  </option>
                  <option value="demo" className="bg-popover text-popover-foreground">
                    Demo
                  </option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">ID</Label>
                <Input
                  name="id"
                  value={filters.id}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, id: event.target.value }))
                  }
                  placeholder="e.g. 10000"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Entry date</Label>
                <DatePickerInput
                  name="entryDate"
                  value={filters.entryDate}
                  onChange={(nextValue) =>
                    setFilters((prev) => ({ ...prev, entryDate: nextValue }))
                  }
                  ariaLabel="Entry date"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button size="sm" type="submit" disabled={searching}>
                {searching ? "Searching..." : "Search"}
              </Button>
              <Button
                size="sm"
                type="button"
                variant="outline"
                disabled={searching}
                onClick={() => {
                  void handleClear();
                }}
              >
                Clear
              </Button>
            </div>
          </form>
        </div>
        <div className="relative mb-[10px] min-h-0 flex-1">
          <div className="flex h-full min-h-0 flex-col">
            <div className="relative min-h-0 flex-1 overflow-hidden rounded-md">
              {searching ? (
                <div className="absolute inset-0 z-30 flex items-center justify-center rounded-md border border-border bg-background/70 backdrop-blur-[1px]">
                  <div className="flex items-center gap-2 text-xs text-foreground">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
                    Loading table...
                  </div>
                </div>
              ) : null}
              <div className="h-full overflow-auto rounded-md">
                <Table className="rounded-md border border-border bg-card/70 table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 z-20 w-[70px] bg-card/95">
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
                    {trades.map((trade) => (
                      <TableRow key={trade.id}>
                        <TableCell className="sticky left-0 z-10 whitespace-nowrap bg-card/95">
                          <TradeRowActions
                            trade={toEditableTrade(trade)}
                            onSaved={refreshAppliedSearch}
                          />
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          #{trade.id}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-foreground">
                          {trade.pnlAmount}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-foreground">
                          {trade.entryPoint}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-foreground">
                          {trade.closingPoint}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-foreground truncate">
                          {trade.symbol}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-foreground">
                          {trade.direction}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-foreground">
                          {trade.result}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-foreground">
                          {formatDateTime(trade.entryTime)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-foreground">
                          {formatDateTime(trade.exitTime)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            <div className="mt-2 shrink-0 text-xs text-muted-foreground">
              {error ? (
                <span className="text-destructive">Error: {error}</span>
              ) : (
                <span>Showing {trades.length} trades.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
