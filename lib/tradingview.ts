const TRADINGVIEW_CHART_BASE_URL = "https://www.tradingview.com/chart/";
const UTC_PLUS_8_OFFSET_MINUTES = 8 * 60;

export function buildTradingViewChartUrl({
  symbol,
  timeframe,
  at,
}: {
  symbol: string;
  timeframe?: string | null | undefined;
  at?: Date | null | undefined;
}) {
  const trimmedSymbol = symbol.trim();
  const params = new URLSearchParams();
  params.set("symbol", trimmedSymbol);

  const interval = timeframeToTradingViewInterval(timeframe);
  if (interval) params.set("interval", interval);

  if (at instanceof Date && !Number.isNaN(at.getTime())) {
    // Treat stored times as UTC+8 wall-clock times (naive), and convert them into
    // a Unix timestamp TradingView can interpret.
    const unixSeconds = Math.floor(
      (at.getTime() - UTC_PLUS_8_OFFSET_MINUTES * 60 * 1000) / 1000,
    );
    params.set("time", String(unixSeconds));
    params.set("timestamp", String(unixSeconds));
  }

  return `${TRADINGVIEW_CHART_BASE_URL}?${params.toString()}`;
}

function timeframeToTradingViewInterval(timeframe: string | null | undefined) {
  if (!timeframe) return undefined;
  const normalized = timeframe.trim();
  if (!normalized) return undefined;

  const direct = normalized.toUpperCase();
  if (direct === "D" || direct === "W" || direct === "M") return direct;

  const mapping: Record<string, string> = {
    "5m": "5",
    "15m": "15",
    "1h": "60",
    "4h": "240",
    "1d": "D",
  };

  const mapped = mapping[normalized.toLowerCase()];
  if (mapped) return mapped;

  if (/^\d+$/.test(normalized)) return normalized;
  if (/^\d+[HDWM]$/i.test(normalized)) return normalized.toUpperCase();

  return undefined;
}
