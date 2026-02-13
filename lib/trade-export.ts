import type { TradeEditable } from "@/components/trade-create-dialog";
import { formatWallClockYmd, formatWallClockYmdHms } from "@/lib/wall-clock-datetime";
import { splitScreenshotUrls } from "@/lib/screenshot-urls";

export type TradeExportable = Omit<TradeEditable, "entryTime" | "exitTime"> & {
  entryTime: Date | string;
  exitTime: Date | string;
};

export function buildTradeMarkdown(
  trade: TradeExportable,
  options?: { imagePath?: string; imagePaths?: string[] },
) {
  const entryTime = formatWallClockYmdHms(trade.entryTime);
  const exitTime = formatWallClockYmdHms(trade.exitTime);
  const imagePaths = (options?.imagePaths ?? [])
    .map((value) => value.trim())
    .filter(Boolean);
  const singleImagePath = options?.imagePath?.trim();
  if (singleImagePath) {
    imagePaths.unshift(singleImagePath);
  }
  const screenshotUrls = splitScreenshotUrls(trade.screenshotUrl);
  const screenshotLines =
    imagePaths.length > 0
      ? imagePaths.map((path, index) => `![Screenshot ${index + 1}](${path})`)
      : screenshotUrls.map((url, index) => `![Screenshot ${index + 1}](${url})`);
  const screenshotUrlLines = imagePaths.length > 0 ? [] : screenshotUrls;

  return [
    "# Trade Record",
    "",
    "## Trade Details",
    `- PnL amount: ${formatMaybeNumber(trade.pnlAmount)}`,
    `- Symbol: ${formatMaybeString(trade.symbol)}`,
    `- Trade platform: ${formatMaybeString(trade.tradePlatform)}`,
    `- Direction: ${formatMaybeString(trade.direction)}`,
    `- Result: ${formatMaybeString(trade.result)}`,
    `- Trade mode: ${formatMaybeString(trade.tradeMode)}`,
    `- Entry time: ${entryTime}`,
    `- Exit time: ${exitTime}`,
    "",
    "## Context",
    `- Timeframe: ${formatMaybeString(trade.timeframe)}`,
    `- Trend assessment: ${formatMaybeString(trade.trendAssessment)}`,
    `- Market phase: ${formatMaybeString(trade.marketPhase)}`,
    "",
    "## Setup",
    `- Setup type: ${formatMaybeString(trade.setupType)}`,
    `- Entry type: ${formatMaybeString(trade.entryType)}`,
    `- Confidence (1–5): ${formatMaybeNumber(trade.confidenceLevel)}`,
    "",
    "## Risk & Management",
    `- Entry point: ${formatMaybeNumber(trade.entryPoint)}`,
    `- Closing point: ${formatMaybeNumber(trade.closingPoint)}`,
    `- SL point: ${formatMaybeNumber(trade.slPoint)}`,
    `- TP point: ${formatMaybeNumber(trade.tpPoint)}`,
    `- Actual R multiple: ${formatMaybeR(trade.actualRMultiple)}`,
    `- Planned R multiple: ${formatMaybeR(trade.plannedRMultiple)}`,
    `- Early exit: ${formatMaybeBoolean(trade.earlyExit)}`,
    "",
    "## Post-trade Review",
    trade.entryReason || "",
    "",
    "## Screenshot",
    ...screenshotLines,
    ...screenshotUrlLines,
  ]
    .filter((line, index, arr) => {
      if (line) return true;
      const prev = arr[index - 1];
      return prev !== "";
    })
    .join("\n");
}

export function buildExportFileName(trade: TradeExportable) {
  const date = formatWallClockYmd(trade.entryTime) || "trade";
  const symbol = trade.symbol ? sanitizeFileSegment(trade.symbol) : "symbol";
  return `${date}-${symbol}-trade-${trade.id}.md`;
}

export function sanitizeFileSegment(value: string) {
  return value.trim().replace(/[^\w.-]+/g, "-");
}

function formatMaybeNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "";
  return Number.isFinite(value) ? String(value) : "";
}

function formatMaybeBoolean(value: boolean | null | undefined) {
  if (value === null || value === undefined) return "";
  return value ? "Yes" : "No";
}

function formatMaybeString(value: string | null | undefined) {
  if (!value) return "";
  return value;
}

function formatMaybeR(value: number | null | undefined) {
  const base = formatMaybeNumber(value);
  return base ? `${base}R` : "";
}
