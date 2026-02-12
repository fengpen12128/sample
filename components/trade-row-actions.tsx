"use client";

import * as React from "react";

import { CheckIcon, CopyIcon } from "lucide-react";
import Markdown from "markdown-to-jsx";
import { toast } from "sonner";

import { deleteTrade } from "@/app/action";
import { TradeEditDialog, type TradeEditable } from "@/components/trade-create-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buildExportFileName, buildTradeMarkdown } from "@/lib/trade-export";
import { buildTradingViewChartUrl } from "@/lib/tradingview";

export function TradeRowActions({
  trade,
  onSaved,
}: {
  trade: TradeEditable;
  onSaved?: () => void;
}) {
  const copyTimerRef = React.useRef<number | null>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const markdown = React.useMemo(() => buildTradeMarkdown(trade), [trade]);
  const pineScript = React.useMemo(() => buildPineScript(trade), [trade]);
  const tradingViewEntryUrl = React.useMemo(
    () =>
      buildTradingViewChartUrl({
        symbol: trade.symbol,
        timeframe: trade.timeframe,
        at: trade.entryTime,
      }),
    [trade.entryTime, trade.symbol, trade.timeframe],
  );
  const tradingViewExitUrl = React.useMemo(
    () =>
      buildTradingViewChartUrl({
        symbol: trade.symbol,
        timeframe: trade.timeframe,
        at: trade.exitTime,
      }),
    [trade.exitTime, trade.symbol, trade.timeframe],
  );

  const handleDelete = async () => {
    const formData = new FormData();
    formData.append("id", String(trade.id));
    try {
      const result = await deleteTrade(formData);
      if (!result?.ok) {
        toast.error(result?.error ?? "Delete failed.");
        return;
      }
      toast.success("Trade deleted.");
      onSaved?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed.");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="sm" aria-label="Actions">
          ⋯
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <TradeEditDialog
          trade={trade}
          onSaved={onSaved}
          trigger={
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              Edit
            </DropdownMenuItem>
          }
        />

        <Dialog>
          <DialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              Preview
            </DropdownMenuItem>
          </DialogTrigger>
          <DialogContent className="!w-[60vw] !max-w-none max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Markdown Preview</DialogTitle>
            </DialogHeader>
            <div className="scrollbar-none -mr-4 flex-1 overflow-y-auto pr-4">
              <div className="flex flex-col gap-6 text-sm">
                <section className="space-y-3">
                  <div className="rounded-md border border-zinc-800 bg-black/30 p-4">
                    <div className="prose prose-invert max-w-none">
                      <Markdown
                        options={{
                          overrides: {
                            h1: { props: { className: "text-2xl font-semibold text-zinc-100" } },
                            h2: { props: { className: "mt-4 text-lg font-semibold text-zinc-100" } },
                            h3: { props: { className: "mt-3 text-base font-semibold text-zinc-100" } },
                            p: { props: { className: "text-sm text-zinc-200" } },
                            ul: { props: { className: "list-disc pl-5 text-sm text-zinc-200" } },
                            ol: { props: { className: "list-decimal pl-5 text-sm text-zinc-200" } },
                            li: { props: { className: "my-1" } },
                            strong: { props: { className: "font-semibold text-zinc-100" } },
                            em: { props: { className: "italic text-zinc-200" } },
                            a: { props: { className: "text-emerald-300 underline" } },
                            blockquote: {
                              props: {
                                className:
                                  "border-l-2 border-zinc-700 pl-3 text-sm text-zinc-300",
                              },
                            },
                            code: {
                              props: {
                                className:
                                  "rounded bg-zinc-900/70 px-1.5 py-0.5 text-xs text-zinc-100",
                              },
                            },
                          },
                        }}
                      >
                        {markdown}
                      </Markdown>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <DropdownMenuItem
          onSelect={() => {
            downloadMarkdown(markdown, buildExportFileName(trade));
          }}
        >
          Export
        </DropdownMenuItem>

        <DropdownMenuSeparator />

	        <Dialog>
	          <DialogTrigger asChild>
	            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
	              Script
	            </DropdownMenuItem>
	          </DialogTrigger>
	          <DialogContent className="!w-[60vw] !max-w-none">
	            <DialogHeader>
	              <DialogTitle>Pine Script</DialogTitle>
	            </DialogHeader>
	            <div className="space-y-4">
	              <div className="rounded-md border border-zinc-800 bg-black/30 p-4">
	                <div className="relative">
	                  <Button
	                    type="button"
	                    variant="ghost"
	                    size="icon-sm"
	                    className="absolute right-0 top-0 text-zinc-300 hover:bg-transparent hover:text-zinc-100"
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
	                  <pre className="whitespace-pre-wrap pr-10 text-xs text-zinc-100">
	                    {pineScript}
	                  </pre>
	                </div>
	              </div>

	              <div className="rounded-md border border-zinc-800 bg-black/30 p-4">
	                <div className="mb-2 text-sm font-medium text-zinc-100">
	                  TradingView
	                </div>
	                <div className="flex flex-col gap-2 text-xs">
	                  <div className="flex items-center justify-between gap-3">
                    <a
                      href={tradingViewEntryUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-emerald-300 underline"
                      title={tradingViewEntryUrl}
                    >
                      Open (Entry)
                    </a>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => navigator.clipboard.writeText(tradingViewEntryUrl)}
                    >
                      Copy
                    </Button>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <a
                      href={tradingViewExitUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-emerald-300 underline"
                      title={tradingViewExitUrl}
                    >
                      Open (Exit)
                    </a>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => navigator.clipboard.writeText(tradingViewExitUrl)}
                    >
                      Copy
                    </Button>
	                  </div>
	                </div>
	              </div>
	            </div>
	          </DialogContent>
	        </Dialog>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="text-red-400 focus:text-red-300"
          onSelect={(e) => {
            e.preventDefault();
            void handleDelete();
          }}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function downloadMarkdown(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildPineScript(trade: TradeEditable) {
  const tIn = trade.entryTime instanceof Date ? trade.entryTime : new Date(trade.entryTime);
  const tOut = trade.exitTime instanceof Date ? trade.exitTime : new Date(trade.exitTime);
  const isShort = String(trade.direction).trim().toLowerCase() === "short";
  const isWin = String(trade.result).trim().toLowerCase() === "win";

  const brokerTz = "GMT+8";
  const fnCall = [
    "    add_trade(",
    [
      // Stored trade timestamps are treated as "wall-clock" values (naive).
      // Use UTC getters to avoid converting them to the viewer's local timezone.
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
    '//@version=5',
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
