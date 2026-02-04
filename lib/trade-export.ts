import { format } from "date-fns";

import type { TradeEditable } from "@/components/trade-create-dialog";

export type TradeExportable = Omit<TradeEditable, "entryTime" | "exitTime"> & {
  entryTime: Date | string;
  exitTime: Date | string;
};

const DATE_TIME_FORMAT = "yyyy-MM-dd HH:mm:ss";
const DATE_FILE_FORMAT = "yyyyMMdd";

export function buildTradeMarkdown(
  trade: TradeExportable,
  options?: { imagePath?: string },
) {
  const entryTime = formatMaybeDate(trade.entryTime, DATE_TIME_FORMAT);
  const exitTime = formatMaybeDate(trade.exitTime, DATE_TIME_FORMAT);
  const imagePath = options?.imagePath?.trim();
  const screenshotLine = imagePath
    ? `![Screenshot](${imagePath})`
    : trade.screenshotUrl
      ? `![Screenshot](${trade.screenshotUrl})`
      : "";
  const screenshotUrlLine = !imagePath && trade.screenshotUrl ? trade.screenshotUrl : "";

  return [
    "# Trade 记录",
    "",
    "## Trade Details",
    `- PnL amount: ${formatMaybeNumber(trade.pnlAmount)}`,
    `- Symbol: ${trade.symbol}`,
    `- Direction: ${trade.direction}`,
    `- Result: ${trade.result}`,
    `- Entry time: ${entryTime}`,
    `- Exit time: ${exitTime}`,
    "",
    "## Context",
    `- Timeframe: ${trade.timeframe}`,
    `- Trend assessment: ${trade.trendAssessment}`,
    `- Market phase: ${trade.marketPhase}`,
    "",
    "## Setup",
    `- Setup type: ${trade.setupType}`,
    `- Entry type: ${trade.entryType}`,
    `- Confidence (1–5): ${trade.confidenceLevel}`,
    "",
    "## Risk & Management",
    `- Entry point: ${formatMaybeNumber(trade.entryPoint)}`,
    `- Closing point: ${formatMaybeNumber(trade.closingPoint)}`,
    `- SL point: ${formatMaybeNumber(trade.slPoint)}`,
    `- TP point: ${formatMaybeNumber(trade.tpPoint)}`,
    `- Actual R multiple: ${formatMaybeR(trade.actualRMultiple)}`,
    `- Planned R multiple: ${formatMaybeR(trade.plannedRMultiple)}`,
    "",
    "## Post-trade Review",
    trade.entryReason || "",
    "",
    "## Screenshot",
    screenshotLine,
    screenshotUrlLine,
  ]
    .filter((line, index, arr) => {
      if (line) return true;
      const prev = arr[index - 1];
      return prev !== "";
    })
    .join("\n");
}

export function buildExportFileName(trade: TradeExportable) {
  const date = formatMaybeDate(trade.entryTime, DATE_FILE_FORMAT) || "trade";
  const symbol = trade.symbol ? sanitizeFileSegment(trade.symbol) : "symbol";
  return `${date}-${symbol}-trade-${trade.id}.md`;
}

export function sanitizeFileSegment(value: string) {
  return value.trim().replace(/[^\w.-]+/g, "-");
}

function formatMaybeDate(value: Date | string, pattern: string) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : format(date, pattern);
}

function formatMaybeNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "";
  return Number.isFinite(value) ? String(value) : "";
}

function formatMaybeR(value: number | null | undefined) {
  const base = formatMaybeNumber(value);
  return base ? `${base}R` : "";
}
