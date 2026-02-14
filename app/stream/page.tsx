/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";
import Link from "next/link";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, CopyIcon, PencilIcon } from "lucide-react";
import type { PutBlobResult } from "@vercel/blob";
import { toast } from "sonner";
import styles from "./page.module.css";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TradeReviewEditorDialog } from "@/components/trade-review-editor-dialog";
import { updateTradeScreenshot } from "@/app/action";
import { mergeScreenshotUrls, splitScreenshotUrls } from "@/lib/screenshot-urls";
import { parseWallClockDateTime } from "@/lib/wall-clock-datetime";

type StreamTrade = {
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

function offsetIndex(current: number, total: number, offset: number) {
  if (total <= 0) return 0;
  const next = (current + offset) % total;
  return next < 0 ? next + total : next;
}

function ScreenshotCarousel({
  urls,
  tradeId,
  className,
}: {
  urls: string[];
  tradeId: string;
  className?: string;
}) {
  const [index, setIndex] = React.useState(0);
  const hasMany = urls.length > 1;
  const currentUrl = urls[index] ?? urls[0] ?? "";
  const urlKey = React.useMemo(() => urls.join(","), [urls]);

  React.useEffect(() => {
    setIndex(0);
  }, [tradeId, urlKey]);

  if (!currentUrl) return null;

  return (
    <div className={`relative h-full w-full ${className ?? ""}`}>
      <div className="h-full w-full overflow-hidden rounded-md border border-border bg-card/60">
        <img
          src={currentUrl}
          alt={`Trade ${tradeId} screenshot ${index + 1}`}
          className="h-full w-full object-contain"
          loading="lazy"
        />
      </div>
      {hasMany ? (
        <>
          <Button
            type="button"
            size="icon-sm"
            variant="secondary"
            className="absolute left-2 top-1/2 -translate-y-1/2"
            onClick={() => setIndex((prev) => offsetIndex(prev, urls.length, -1))}
            aria-label="Previous screenshot"
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="secondary"
            className="absolute right-2 top-1/2 -translate-y-1/2"
            onClick={() => setIndex((prev) => offsetIndex(prev, urls.length, 1))}
            aria-label="Next screenshot"
          >
            <ChevronRightIcon className="size-4" />
          </Button>
          <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-md border border-border bg-background/85 px-2 py-1 text-[11px] text-foreground">
            {index + 1} / {urls.length}
          </div>
        </>
      ) : null}
    </div>
  );
}

function PineScriptDialog({ trade }: { trade: StreamTrade }) {
  const [copied, setCopied] = React.useState(false);
  const copyTimerRef = React.useRef<number | null>(null);
  const pineScript = React.useMemo(() => buildPineScript(trade), [trade]);

  React.useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="secondary">
          Script
        </Button>
      </DialogTrigger>
      <DialogContent className="!w-[60vw] !max-w-none">
        <DialogHeader>
          <DialogTitle>Pine Script</DialogTitle>
        </DialogHeader>
        <div className="rounded-md border border-border bg-card/70 p-4">
          <div className="relative">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute right-0 top-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
              aria-label="Copy script"
              onClick={async () => {
                await navigator.clipboard.writeText(pineScript);
                setCopied(true);
                if (copyTimerRef.current !== null) {
                  window.clearTimeout(copyTimerRef.current);
                }
                copyTimerRef.current = window.setTimeout(() => {
                  setCopied(false);
                  copyTimerRef.current = null;
                }, 1200);
              }}
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
            </Button>
            <pre className="whitespace-pre-wrap pr-10 text-xs text-foreground">
              {pineScript}
            </pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PostReviewHoverButton({ value }: { value: string | null }) {
  const normalized = value?.trim();
  const [open, setOpen] = React.useState(false);

  if (!normalized) return null;

  const openPopover = () => setOpen(true);
  const closePopover = () => setOpen(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onMouseEnter={openPopover}
          onMouseLeave={closePopover}
        >
          Post review
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        className="w-80 whitespace-pre-wrap text-base font-['SF_Pro_Rounded','Arial_Rounded_MT_Bold','system-ui']"
        onMouseEnter={openPopover}
        onMouseLeave={closePopover}
      >
        {normalized}
      </PopoverContent>
    </Popover>
  );
}

function ScreenshotUploadPlaceholder({
  tradeId,
  existingScreenshotUrl,
  onUploaded,
}: {
  tradeId: string;
  existingScreenshotUrl: string | null;
  onUploaded: (value: string) => void;
}) {
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputId = React.useId();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleScreenshotUpload = async (files: File[]) => {
    if (!files.length) return;
    setUploading(true);
    setError(null);
    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const response = await fetch(`/api/screenshot/upload?filename=${file.name}`, {
          method: "POST",
          body: file,
        });
        if (!response.ok) {
          throw new Error("Upload failed. Please try again.");
        }
        const blob = (await response.json()) as PutBlobResult;
        uploadedUrls.push(blob.url);
      }
      const merged = mergeScreenshotUrls(existingScreenshotUrl, uploadedUrls);
      const formData = new FormData();
      formData.append("id", String(tradeId));
      formData.append("screenshotUrl", merged);
      const result = await updateTradeScreenshot(formData);
      if (!result?.ok) {
        throw new Error(result?.error ?? "Save failed. Please try again.");
      }
      onUploaded(merged);
      toast.success("Screenshot uploaded.");
    } catch (uploadError) {
      const message =
        uploadError instanceof Error ? uploadError.message : "Upload failed. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex h-full w-full items-center justify-center">
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        multiple
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (!files.length) return;
          event.target.value = "";
          void handleScreenshotUpload(files);
        }}
      />
      <label
        htmlFor={inputId}
        className="flex h-full min-h-0 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-card/60 px-4 py-3 text-xs text-muted-foreground transition hover:border-foreground/35 hover:text-foreground"
      >
        <span className="text-sm font-medium text-foreground">
          {uploading ? "Uploading..." : "Click to upload screenshot(s)"}
        </span>
        <span>PNG / JPG / JPEG, multiple supported</span>
        {error ? <span className="text-xs text-red-400">{error}</span> : null}
      </label>
    </div>
  );
}

function buildPineScript(trade: StreamTrade) {
  const tIn = parseWallClockDateTime(trade.entryTime) ?? new Date(trade.entryTime);
  const tOut = parseWallClockDateTime(trade.exitTime) ?? new Date(trade.exitTime);
  const isShort = String(trade.direction).trim().toLowerCase() === "short";
  const isWin = String(trade.result).trim().toLowerCase() === "win";

  const brokerTz = "GMT+8";
  const fnCall = [
    "    add_trade(",
    [
      tIn.getUTCFullYear(),
      tIn.getUTCMonth() + 1,
      tIn.getUTCDate(),
      tIn.getUTCHours(),
      tIn.getUTCMinutes(),
      tIn.getUTCSeconds(),
      cleanNum(trade.entryPoint),
      cleanNum(trade.slPoint),
      cleanNum(trade.tpPoint),
      cleanNum(trade.closingPoint),
      tOut.getUTCFullYear(),
      tOut.getUTCMonth() + 1,
      tOut.getUTCDate(),
      tOut.getUTCHours(),
      tOut.getUTCMinutes(),
      tOut.getUTCSeconds(),
      String(isShort),
      String(isWin),
    ].join(", "),
    ")",
  ].join("");

  return [
    "//@version=5",
    'indicator("MT5极简箭头版 (时间修正)", overlay=true, max_lines_count=500)',
    "",
    "// 基础设置",
    `string broker_tz = "${brokerTz}"`,
    "",
    "// 核心函数",
    "add_trade(y, m, d, h, min, s, entry, sl, tp, exit, out_y, out_m, out_d, out_h, out_min, out_s, is_short, is_win) =>",
    "    t1 = timestamp(broker_tz, y, m, d, h, min, s)",
    "    t2 = timestamp(broker_tz, out_y, out_m, out_d, out_h, out_min, out_s)",
    "",
    "    // 颜色配置：线条赢=绿色，输=紫色；箭头固定黄色",
    "    color tradeColor = is_win ? #00FF00 : #800080",
    "",
    "    // 1. 使用 label 模拟箭头 (解决 plotshape 不支持时间定位的问题)",
    "    label.new(x=t1, y=entry,",
    '         text="",',
    "         xloc=xloc.bar_time,",
    "         style=is_short ? label.style_arrowdown : label.style_arrowup,",
    "         color=#FFFF00,",
    "         size=size.large)",
    "",
    "    // 2. 绘制交易斜线",
    "    line.new(x1=t1, y1=entry, x2=t2, y2=exit, xloc=xloc.bar_time,",
    "             color=tradeColor, width=7)",
    "",
    "// ==========================================",
    "// ============== 数据录入区 ================",
    "// ==========================================",
    "if barstate.islast",
    "    // === 粘贴区开始 ===",
    fnCall,
  ].join("\n");
}

function cleanNum(value: number | null | undefined) {
  if (value === null || value === undefined) return "0.0";
  return Number.isFinite(value) ? String(value) : "0.0";
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
  const [entryDateFilter, setEntryDateFilter] = React.useState("");
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
  const entryDateFilterRef = React.useRef(entryDateFilter);
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

  React.useEffect(() => {
    entryDateFilterRef.current = entryDateFilter;
  }, [entryDateFilter]);

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
      const currentEntryDate = entryDateFilterRef.current.trim();
      const requestKey = [
        `mode=${currentTradeMode}`,
        `dir=${currentDirection}`,
        `result=${currentResult}`,
        `platform=${currentTradePlatform}`,
        `entryDate=${currentEntryDate || "all"}`,
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
      if (currentEntryDate) {
        params.set("entryDate", currentEntryDate);
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
        const merged = new Map<string, StreamTrade>();
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
    ({ id, entryReason }: { id: string; entryReason: string | null }) => {
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
      `entryDate=${entryDateFilter.trim() || "all"}`,
      "offset=0",
    ].join("&");
    if (initialLoadKeys.has(initialKey)) return;
    initialLoadKeys.add(initialKey);
    void loadMore(0);
  }, [directionFilter, entryDateFilter, loadMore, resultFilter, tradeModeFilter, tradePlatformFilter]);

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
      className="h-[100dvh] overflow-y-auto no-scrollbar bg-background snap-y snap-mandatory"
      style={{
        paddingTop: "max(1rem, env(safe-area-inset-top))",
        paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
        paddingLeft: "max(0.75rem, env(safe-area-inset-left))",
        paddingRight: "max(0.75rem, env(safe-area-inset-right))",
      }}
    >
      <div className="mx-auto w-full max-w-[1120px]">
        <div className="mb-6 snap-start">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-lg font-semibold text-foreground sm:text-xl">Infinite Stream</h1>
            <Button asChild size="sm" variant="outline">
              <Link href="/">Back to Table</Link>
            </Button>
          </div>

          <Card size="sm" className="mt-4 rounded-md border-border bg-card/70">
            <CardHeader className="border-b border-border">
              <div className="flex items-center justify-between gap-2">
                <CardTitle>Search</CardTitle>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-8 px-3 text-xs"
                  onClick={() => {
                    setTradeModeFilter("all");
                    setDirectionFilter("all");
                    setResultFilter("all");
                    setTradePlatformFilter("all");
                    setEntryDateFilter("");
                  }}
                >
                  Reset
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="grid min-w-[920px] grid-cols-5 gap-[5px]">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Trade mode</Label>
                  <Select value={tradeModeFilter} onValueChange={setTradeModeFilter}>
                    <SelectTrigger className="h-8 w-full text-xs">
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
                  <Label className="text-xs text-muted-foreground">Direction</Label>
                  <Select value={directionFilter} onValueChange={setDirectionFilter}>
                    <SelectTrigger className="h-8 w-full text-xs">
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
                  <Label className="text-xs text-muted-foreground">Result</Label>
                  <Select value={resultFilter} onValueChange={setResultFilter}>
                    <SelectTrigger className="h-8 w-full text-xs">
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
                  <Label className="text-xs text-muted-foreground">Trade platform</Label>
                  <Select value={tradePlatformFilter} onValueChange={setTradePlatformFilter}>
                    <SelectTrigger className="h-8 w-full text-xs">
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

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Entry date</Label>
                  <DatePickerInput
                    value={entryDateFilter}
                    onChange={setEntryDateFilter}
                    ariaLabel="Entry date"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-0">
          {items.map((trade) => {
            const screenshotUrls = splitScreenshotUrls(trade.screenshotUrl);
            return (
              <section
                key={trade.id}
                className={`h-[100dvh] snap-start snap-always py-4 ${styles.tradeSection}`}
              >
                <article
                  className={`relative flex h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-md border border-border bg-card/70 p-3 text-left ${styles.tradeArticle}`}
                >
                  <div className={styles.tradeLayout}>
                    <div className={styles.metaPanel}>
                      <div
                        className={`flex flex-wrap items-center justify-start gap-2 ${styles.actionsRow}`}
                      >
                        <PostReviewHoverButton value={trade.entryReason} />
                        <PineScriptDialog trade={trade} />
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

                      <div
                        className={`flex items-center gap-2 text-xs text-muted-foreground ${styles.metaHeader}`}
                      >
                        <span>Trade #{trade.id}</span>
                        <span>{formatDateTime(trade.entryTime)}</span>
                      </div>

                      <div
                        className={`no-scrollbar flex gap-2 overflow-x-auto pb-1 text-xs text-foreground ${styles.metaTags}`}
                      >
                        <span className="shrink-0 rounded-md border border-border bg-background/60 px-2 py-1">
                          {trade.symbol}
                        </span>
                        <span className="shrink-0 rounded-md border border-border bg-background/60 px-2 py-1">
                          {trade.direction}
                        </span>
                        <span className="shrink-0 rounded-md border border-border bg-background/60 px-2 py-1">
                          {trade.result}
                        </span>
                        <span className="shrink-0 rounded-md border border-border bg-background/60 px-2 py-1">
                          Mode: {trade.tradeMode}
                        </span>
                        <span className="shrink-0 rounded-md border border-border bg-background/60 px-2 py-1">
                          {trade.tradePlatform ?? "—"}
                        </span>
                        <span className="shrink-0 rounded-md border border-border bg-background/60 px-2 py-1">
                          PnL: {trade.pnlAmount}
                        </span>
                        <span className="shrink-0 rounded-md border border-border bg-background/60 px-2 py-1">
                          Entry Point: {trade.entryPoint}
                        </span>
                        <span className="shrink-0 rounded-md border border-border bg-background/60 px-2 py-1">
                          Exit Point: {trade.closingPoint}
                        </span>
                        <span className="shrink-0 rounded-md border border-border bg-background/60 px-2 py-1">
                          Entry: {formatDateTime(trade.entryTime)}
                        </span>
                        <span className="shrink-0 rounded-md border border-border bg-background/60 px-2 py-1">
                          Exit: {formatDateTime(trade.exitTime)}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`flex min-h-0 flex-1 flex-col ${styles.imagePanel}`}
                    >
                      {screenshotUrls.length ? (
                        <ScreenshotCarousel
                          urls={screenshotUrls}
                          tradeId={trade.id}
                          className="min-h-0 flex-1"
                        />
                      ) : (
                        <ScreenshotUploadPlaceholder
                          tradeId={trade.id}
                          existingScreenshotUrl={trade.screenshotUrl}
                          onUploaded={(value) => {
                            setItems((prev) =>
                              prev.map((item) =>
                                item.id === trade.id ? { ...item, screenshotUrl: value } : item,
                              ),
                            );
                          }}
                        />
                      )}
                    </div>
                  </div>
                </article>
              </section>
            );
          })}

          {error ? (
            <div className="rounded-md border border-border bg-card/70 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div ref={sentinelRef} className="h-1" />

          <div className="text-center text-xs text-muted-foreground">
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
