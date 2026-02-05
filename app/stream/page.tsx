/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";
import { format } from "date-fns";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type StreamTrade = {
  id: number;
  symbol: string;
  direction: string;
  result: string;
  tradeMode: string;
  entryTime: string;
  exitTime: string;
  pnlAmount: number;
  timeframe: string;
  setupType: string;
  screenshotUrl: string;
};

type StreamResponse = {
  items: StreamTrade[];
  hasMore: boolean;
};

const PAGE_SIZE = 10;

function formatDateTime(value: string) {
  if (!value) return "—";
  return format(new Date(value), "yyyy-MM-dd HH:mm:ss");
}

export default function StreamPage() {
  const [items, setItems] = React.useState<StreamTrade[]>([]);
  const [offset, setOffset] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [resultFilter, setResultFilter] = React.useState("all");
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  const resultOptions = ["all", "win", "loss"];

  const loadMore = React.useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        offset: String(offset),
        limit: String(PAGE_SIZE),
      });
      if (resultFilter !== "all") {
        params.set("result", resultFilter);
      }
      const response = await fetch(
        `/api/trades/stream?${params.toString()}`,
        { cache: "no-store" },
      );
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      const data = (await response.json()) as StreamResponse;
      setItems((prev) => [...prev, ...data.items]);
      setOffset((prev) => prev + data.items.length);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [hasMore, loading, offset, resultFilter]);

  React.useEffect(() => {
    void loadMore();
  }, [loadMore]);

  React.useEffect(() => {
    setItems([]);
    setOffset(0);
    setHasMore(true);
    setLoading(false);
    setError(null);
  }, [resultFilter]);

  React.useEffect(() => {
    if (!hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-zinc-100">Infinite Stream</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Result</span>
              <Select value={resultFilter} onValueChange={setResultFilter}>
                <SelectTrigger className="h-8 w-[140px] text-xs">
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
            <Button asChild size="sm" variant="outline">
              <Link href="/">Back to Table</Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {items.map((trade) => (
            <article
              key={trade.id}
              className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4"
            >
              <div className="mb-3 flex items-center justify-between text-xs text-zinc-400">
                <span>Trade #{trade.id}</span>
                <span>{formatDateTime(trade.entryTime)}</span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-zinc-200">
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
                  PnL: {trade.pnlAmount}
                </span>
                <span className="rounded-full border border-zinc-800 bg-zinc-900/50 px-2 py-1">
                  Entry: {formatDateTime(trade.entryTime)}
                </span>
                <span className="rounded-full border border-zinc-800 bg-zinc-900/50 px-2 py-1">
                  Exit: {formatDateTime(trade.exitTime)}
                </span>
              </div>

              <div className="mt-4 border-t border-zinc-800 pt-4">
                <div className="mb-2 text-xs font-semibold text-zinc-400">
                  Screenshot
                </div>
                {trade.screenshotUrl ? (
                  <img
                    src={trade.screenshotUrl}
                    alt={`Trade ${trade.id} screenshot`}
                    className="max-h-[420px] w-full rounded-md border border-zinc-800 object-contain bg-black/30"
                    loading="lazy"
                  />
                ) : (
                  <div className="text-xs text-zinc-500">No screenshot</div>
                )}
              </div>
            </article>
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
