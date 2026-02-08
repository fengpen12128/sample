/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";
import Link from "next/link";
import { PencilIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TradeReviewEditorDialog } from "@/components/trade-review-editor-dialog";

type StreamTrade = {
  id: number;
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

type StreamResponse = {
  items: StreamTrade[];
  hasMore: boolean;
};

const PAGE_SIZE = 10;
const initialLoadKeys = new Set<string>();

function formatDateTime(value: string) {
  if (!value) return "—";
  return value;
}

function ScreenshotViewer({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={`w-full cursor-zoom-in transition hover:opacity-90 ${className ?? ""}`}
          aria-label="View screenshot"
        >
          <div className="h-full w-full overflow-hidden rounded-md border border-zinc-800 bg-black/30">
            <img
              src={src}
              alt={alt}
              className="h-full w-full object-contain"
              loading="lazy"
            />
          </div>
        </button>
      </DialogTrigger>
      <DialogContent
        className="h-[100svh] w-[100vw] max-w-none rounded-none bg-transparent p-0 ring-0 gap-0 overflow-hidden"
        overlayClassName="bg-black/30 supports-backdrop-filter:backdrop-blur-2xl supports-backdrop-filter:saturate-150"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Screenshot</DialogTitle>
        </DialogHeader>
        <LiquidGlass className="h-full w-full rounded-none">
          <div className="flex h-full w-full items-center justify-center p-3 sm:p-4">
            <img
              src={src}
              alt={alt}
              className="h-full w-full rounded-md border border-white/10 bg-black/30 object-contain"
            />
          </div>
        </LiquidGlass>
      </DialogContent>
    </Dialog>
  );
}

export default function StreamPage() {
  const [items, setItems] = React.useState<StreamTrade[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [tradeModeFilter, setTradeModeFilter] = React.useState("all");
  const [directionFilter, setDirectionFilter] = React.useState("all");
  const [resultFilter, setResultFilter] = React.useState("all");
  const [tradePlatformFilter, setTradePlatformFilter] = React.useState("all");
  const scrollRootRef = React.useRef<HTMLElement | null>(null);
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  const offsetRef = React.useRef(0);
  const loadingRef = React.useRef(false);
  const hasMoreRef = React.useRef(true);
  const requestedRef = React.useRef<Set<string>>(new Set());
  const requestCounterRef = React.useRef(0);
  const tradeModeFilterRef = React.useRef(tradeModeFilter);
  const directionFilterRef = React.useRef(directionFilter);
  const resultFilterRef = React.useRef(resultFilter);
  const tradePlatformFilterRef = React.useRef(tradePlatformFilter);
  const tradeModeOptions = ["all", "live", "demo"];
  const directionOptions = ["all", "long", "short"];
  const resultOptions = ["all", "win", "loss"];
  const tradePlatformOptions = ["all", "Bybit", "Pepperstone"];

  React.useEffect(() => {
    tradeModeFilterRef.current = tradeModeFilter;
  }, [tradeModeFilter]);

  React.useEffect(() => {
    directionFilterRef.current = directionFilter;
  }, [directionFilter]);

  React.useEffect(() => {
    resultFilterRef.current = resultFilter;
  }, [resultFilter]);

  React.useEffect(() => {
    tradePlatformFilterRef.current = tradePlatformFilter;
  }, [tradePlatformFilter]);

  const loadMore = React.useCallback(async (overrideOffset?: number) => {
    if (loadingRef.current || !hasMoreRef.current) return;
    setLoading(true);
    loadingRef.current = true;
    setError(null);
    try {
      const currentOffset = overrideOffset ?? offsetRef.current;
      const currentTradeMode = tradeModeFilterRef.current;
      const currentDirection = directionFilterRef.current;
      const currentResult = resultFilterRef.current;
      const currentTradePlatform = tradePlatformFilterRef.current;
      const requestKey = [
        `mode=${currentTradeMode}`,
        `dir=${currentDirection}`,
        `result=${currentResult}`,
        `platform=${currentTradePlatform}`,
        `offset=${currentOffset}`,
      ].join("&");
      if (requestedRef.current.has(requestKey)) {
        setLoading(false);
        loadingRef.current = false;
        return;
      }
      requestedRef.current.add(requestKey);
      requestCounterRef.current += 1;
      const params = new URLSearchParams({
        offset: String(currentOffset),
        limit: String(PAGE_SIZE),
      });
      if (currentTradeMode !== "all") params.set("tradeMode", currentTradeMode);
      if (currentDirection !== "all") params.set("direction", currentDirection);
      if (currentResult !== "all") {
        params.set("result", currentResult);
      }
      if (currentTradePlatform !== "all") {
        params.set("tradePlatform", currentTradePlatform);
      }
      const response = await fetch(
        `/api/trades/stream?${params.toString()}`,
        { cache: "no-store" },
      );
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      const data = (await response.json()) as StreamResponse;
      setItems((prev) => {
        const merged = new Map<number, StreamTrade>();
        prev.forEach((item) => merged.set(item.id, item));
        data.items.forEach((item) => merged.set(item.id, item));
        return Array.from(merged.values());
      });
      setHasMore(data.hasMore);
      hasMoreRef.current = data.hasMore;
      offsetRef.current = currentOffset + data.items.length;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  const handleReviewSaved = React.useCallback(
    ({ id, entryReason }: { id: number; entryReason: string | null }) => {
      setItems((prev) => prev.map((t) => (t.id === id ? { ...t, entryReason } : t)));
    },
    [],
  );

  React.useEffect(() => {
    setItems([]);
    offsetRef.current = 0;
    requestedRef.current.clear();
    requestCounterRef.current = 0;
    setHasMore(true);
    hasMoreRef.current = true;
    setLoading(false);
    loadingRef.current = false;
    setError(null);
    const initialKey = [
      `mode=${tradeModeFilter}`,
      `dir=${directionFilter}`,
      `result=${resultFilter}`,
      `platform=${tradePlatformFilter}`,
      "offset=0",
    ].join("&");
    if (initialLoadKeys.has(initialKey)) return;
    initialLoadKeys.add(initialKey);
    void loadMore(0);
  }, [directionFilter, loadMore, resultFilter, tradeModeFilter, tradePlatformFilter]);

  React.useEffect(() => {
    if (!hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;
    const root = scrollRootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { root, rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <main
      ref={scrollRootRef}
      className="h-[100svh] overflow-y-auto no-scrollbar bg-background px-4 py-8 snap-y snap-mandatory scroll-pt-8"
    >
      <div className="mx-auto w-[80vw] max-w-none">
        <div className="mb-6 snap-start">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-xl font-semibold text-zinc-100">Infinite Stream</h1>
            <Button asChild size="sm" variant="outline">
              <Link href="/">Back to Table</Link>
            </Button>
          </div>

          <Card size="sm" className="mt-4 border-zinc-800 bg-zinc-950/40">
            <CardHeader className="border-b border-zinc-800">
              <CardTitle>Search</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-400">Trade mode</Label>
                  <Select value={tradeModeFilter} onValueChange={setTradeModeFilter}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      {tradeModeOptions.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-zinc-400">Direction</Label>
                  <Select value={directionFilter} onValueChange={setDirectionFilter}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      {directionOptions.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-zinc-400">Result</Label>
                  <Select value={resultFilter} onValueChange={setResultFilter}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      {resultOptions.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-zinc-400">Trade platform</Label>
                  <Select value={tradePlatformFilter} onValueChange={setTradePlatformFilter}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      {tradePlatformOptions.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setTradeModeFilter("all");
                      setDirectionFilter("all");
                      setResultFilter("all");
                      setTradePlatformFilter("all");
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-0">
	          {items.map((trade) => (
	            <section
	              key={trade.id}
	              className="min-h-[100svh] snap-start py-6"
	            >
	              <article className="relative h-[calc(100svh-3rem)] w-full rounded-lg border border-zinc-800 bg-zinc-950/40 p-4 text-left flex flex-col">
	                <div className="absolute right-3 top-3">
	                  <TradeReviewEditorDialog
	                    tradeId={trade.id}
	                    screenshotUrl={trade.screenshotUrl}
	                    initialReview={trade.entryReason}
	                    onSaved={handleReviewSaved}
	                    trigger={
	                      <Button type="button" size="sm" variant="secondary" className="gap-1.5">
	                        <PencilIcon className="size-3.5" />
	                        Review
	                      </Button>
	                    }
	                  />
	                </div>
	                <div className="mb-3 flex flex-wrap items-center justify-start gap-2 text-xs text-zinc-400">
	                  <span>Trade #{trade.id}</span>
	                  <span>{formatDateTime(trade.entryTime)}</span>
	                </div>
                <div className="flex flex-wrap justify-start gap-2 text-xs text-zinc-200">
                  <span className="rounded-full border border-zinc-800 bg-zinc-900/50 px-2 py-1">
                    {trade.symbol}
                  </span>
                  <span className="rounded-full border border-zinc-800 bg-zinc-900/50 px-2 py-1">
                    {trade.direction}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-1 ${
                      trade.result.toLowerCase() === "win"
                        ? "border-emerald-600/50 bg-emerald-600/20 text-emerald-200"
                        : trade.result.toLowerCase() === "loss"
                          ? "border-red-600/50 bg-red-600/20 text-red-200"
                          : "border-zinc-800 bg-zinc-900/50 text-zinc-200"
                    }`}
                  >
                    {trade.result}
                  </span>
                  <span className="rounded-full border border-zinc-800 bg-zinc-900/50 px-2 py-1">
                    Mode: {trade.tradeMode}
                  </span>
                  <span className="rounded-full border border-zinc-800 bg-zinc-900/50 px-2 py-1">
                    Platform: {trade.tradePlatform ?? "—"}
                  </span>
                  <span className="rounded-full border border-zinc-800 bg-zinc-900/50 px-2 py-1">
                    PnL: {trade.pnlAmount}
                  </span>
                  <span className="rounded-full border border-zinc-800 bg-zinc-900/50 px-2 py-1">
                    Entry: {formatDateTime(trade.entryTime)}
                  </span>
                  <span className="rounded-full border border-zinc-800 bg-zinc-900/50 px-2 py-1">
                    Exit: {formatDateTime(trade.exitTime)}
                  </span>
                </div>

                <div className="mt-4 flex min-h-0 flex-1 flex-col border-t border-zinc-800 pt-4">
                  {trade.screenshotUrl ? (
                    <ScreenshotViewer
                      src={trade.screenshotUrl}
                      alt={`Trade ${trade.id} screenshot`}
                      className="flex-1 min-h-0"
                    />
                  ) : (
                    <div className="flex flex-1 items-center justify-center text-xs text-zinc-500">
                      No screenshot
                    </div>
                  )}
                </div>
              </article>
            </section>
          ))}

          {error ? (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <div ref={sentinelRef} className="h-1" />

          <div className="text-center text-xs text-zinc-500">
            {loading
              ? "Loading..."
              : hasMore
                ? "Scroll to load more"
                : items.length
                  ? "No more results"
                  : "No data"}
          </div>
        </div>
      </div>
    </main>
  );
}
