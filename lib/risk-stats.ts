export type TradeRiskInput = {
  id: string;
  entryTime: Date | string;
  direction: string;
  entryPoint: number;
  closingPoint: number;
  slPoint: number | null;
  actualRMultiple: number | null;
  pnlAmount: number;
};

import { formatWallClockYmd } from "@/lib/wall-clock-datetime";

export type RiskSeriesPoint = {
  id: string;
  date: Date;
  label: string;
  r: number;
};

export type HistogramComparisonDatum = {
  bin: string;
  base: number;
  recent: number;
};

export type RiskHistogramBucket = {
  bucket: string;
  count: number;
};

const DEFAULT_RISK_POINTS = 20;

export function normalizeRiskSeries(
  trades: TradeRiskInput[],
  fallbackRiskPoints: number = DEFAULT_RISK_POINTS,
  labelMode: "date" | "index" = "date",
  sortOrder: "asc" | "desc" = "asc",
): RiskSeriesPoint[] {
  const sorted = [...trades].sort((a, b) => {
    const aTime = new Date(a.entryTime).getTime();
    const bTime = new Date(b.entryTime).getTime();
    const timeDiff = aTime - bTime;
    if (timeDiff !== 0) return sortOrder === "desc" ? -timeDiff : timeDiff;
    const idDiff = a.id.localeCompare(b.id);
    return sortOrder === "desc" ? -idDiff : idDiff;
  });

  return sorted
    .map((trade, index) => {
      const date = new Date(trade.entryTime);
      const r = resolveRMultiple(trade, fallbackRiskPoints);
      if (r === null) return null;
      const label =
        labelMode === "index" ? String(index + 1) : formatDateLabel(date);
      return {
        id: trade.id,
        date,
        label,
        r,
      };
    })
    .filter((value): value is RiskSeriesPoint => Boolean(value));
}

export function calculateRollingMaxLoss(
  series: RiskSeriesPoint[],
  windowSize: number | null,
): Array<{ x: string; value: number | null }> {
  return series.map((point, index) => {
    const windowStart = getWindowStart(index, windowSize);
    const windowValues = series.slice(windowStart, index + 1).map((entry) => entry.r);
    const losses = windowValues.filter((value) => value < 0);
    if (!losses.length) {
      return { x: point.label, value: null };
    }
    return { x: point.label, value: Math.min(...losses) };
  });
}

export function calculateBottomLossAverage(
  series: RiskSeriesPoint[],
  windowSize: number | null,
  bottomPercent: number,
): Array<{ x: string; value: number | null }> {
  return series.map((point, index) => {
    const windowStart = getWindowStart(index, windowSize);
    const windowValues = series.slice(windowStart, index + 1).map((entry) => entry.r);
    const losses = windowValues.filter((value) => value < 0);
    if (!losses.length) {
      return { x: point.label, value: null };
    }
    const sorted = [...losses].sort((a, b) => a - b);
    const sliceSize = Math.max(1, Math.ceil(sorted.length * bottomPercent));
    const sample = sorted.slice(0, sliceSize);
    const sum = sample.reduce((acc, value) => acc + value, 0);
    return { x: point.label, value: sum / sample.length };
  });
}

export function calculateLossHistogram(
  series: RiskSeriesPoint[],
  windowSize: number | null,
  bucketEdges: number[],
): RiskHistogramBucket[] {
  const windowStart = getWindowStart(series.length - 1, windowSize);
  const windowValues = series.slice(windowStart).map((entry) => entry.r);
  const losses = windowValues.filter((value) => value < 0);
  if (!losses.length) return [];

  const edges = bucketEdges
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value < 0)
    .sort((a, b) => b - a);

  if (!edges.length) {
    return [
      {
        bucket: "All losses",
        count: losses.length,
      },
    ];
  }

  const buckets = buildBuckets(edges);
  const counts = buckets.map(() => 0);

  losses.forEach((value) => {
    const bucketIndex = buckets.findIndex((bucket) => value <= bucket.max && value > bucket.min);
    if (bucketIndex >= 0) {
      counts[bucketIndex] += 1;
      return;
    }
    if (value <= buckets[buckets.length - 1].min) {
      counts[buckets.length - 1] += 1;
    }
  });

  return buckets.map((bucket, index) => ({
    bucket: bucket.label,
    count: counts[index],
  }));
}

export function calculateDistributionComparison(
  series: RiskSeriesPoint[],
  recentWindow: number | null,
  rangeMin: number,
  rangeMax: number,
  binCount: number,
  mode: "count" | "density",
): HistogramComparisonDatum[] {
  if (!series.length) return [];
  if (!Number.isFinite(rangeMin) || !Number.isFinite(rangeMax) || rangeMin >= rangeMax) {
    return [];
  }
  if (!Number.isFinite(binCount) || binCount <= 0) return [];

  const allValues = series.map((entry) => entry.r);
  const recentStart = getWindowStart(series.length - 1, recentWindow);
  const recentValues = series.slice(recentStart).map((entry) => entry.r);

  const base = buildHistogram(allValues, rangeMin, rangeMax, binCount, mode);
  const recent = buildHistogram(recentValues, rangeMin, rangeMax, binCount, mode);

  return base.map((bucket, index) => ({
    bin: bucket.label,
    base: bucket.value,
    recent: recent[index]?.value ?? 0,
  }));
}

export function calculateRollingAverageR(
  series: RiskSeriesPoint[],
  windowSize: number | null,
): Array<{ x: string; value: number | null }> {
  return series.map((point, index) => {
    const windowStart = getWindowStart(index, windowSize);
    const windowValues = series.slice(windowStart, index + 1).map((entry) => entry.r);
    if (!windowValues.length) return { x: point.label, value: null };
    const sum = windowValues.reduce((acc, value) => acc + value, 0);
    return { x: point.label, value: sum / windowValues.length };
  });
}

export function calculateRollingWinLossRatio(
  series: RiskSeriesPoint[],
  windowSize: number | null,
): Array<{ x: string; value: number | null }> {
  return series.map((point, index) => {
    const windowStart = getWindowStart(index, windowSize);
    const windowValues = series.slice(windowStart, index + 1).map((entry) => entry.r);
    const wins = windowValues.filter((value) => value > 0);
    const losses = windowValues.filter((value) => value < 0);
    if (!wins.length || !losses.length) {
      return { x: point.label, value: null };
    }
    const avgWin = wins.reduce((acc, value) => acc + value, 0) / wins.length;
    const avgLoss = losses.reduce((acc, value) => acc + value, 0) / losses.length;
    if (avgLoss === 0) return { x: point.label, value: null };
    return { x: point.label, value: avgWin / Math.abs(avgLoss) };
  });
}

function resolveRMultiple(
  trade: TradeRiskInput,
  fallbackRiskPoints: number,
): number | null {
  if (!Number.isFinite(trade.pnlAmount)) return null;
  if (fallbackRiskPoints <= 0) return null;
  return trade.pnlAmount / fallbackRiskPoints;
}

function getWindowStart(index: number, windowSize: number | null): number {
  if (!windowSize || windowSize <= 0) return 0;
  return Math.max(0, index - windowSize + 1);
}

function formatDateLabel(date: Date): string {
  const label = formatWallClockYmd(date);
  return label || "";
}

function buildBuckets(edges: number[]): Array<{ min: number; max: number; label: string }> {
  let upper = 0;
  const buckets: Array<{ min: number; max: number; label: string }> = [];

  edges.forEach((edge) => {
    const min = edge;
    const max = upper;
    const label = `${formatRiskValue(min)}R to ${formatRiskValue(max)}R`;
    buckets.push({ min, max, label });
    upper = edge;
  });

  const lastEdge = edges[edges.length - 1];
  buckets.push({
    min: Number.NEGATIVE_INFINITY,
    max: lastEdge,
    label: `<= ${formatRiskValue(lastEdge)}R`,
  });

  return buckets;
}

function formatRiskValue(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/\.00$/, "");
}

function buildHistogram(
  values: number[],
  rangeMin: number,
  rangeMax: number,
  binCount: number,
  mode: "count" | "density",
): Array<{ label: string; value: number }> {
  const width = (rangeMax - rangeMin) / binCount;
  const counts = Array.from({ length: binCount }, () => 0);

  values.forEach((value) => {
    if (value < rangeMin || value > rangeMax) return;
    const rawIndex = Math.floor((value - rangeMin) / width);
    const index = Math.min(Math.max(rawIndex, 0), binCount - 1);
    counts[index] += 1;
  });

  const total = counts.reduce((acc, value) => acc + value, 0);
  return counts.map((count, index) => {
    const min = rangeMin + index * width;
    const max = min + width;
    const label = `${formatRiskValue(min)}R ~ ${formatRiskValue(max)}R`;
    if (mode === "density") {
      const density = total > 0 ? count / (total * width) : 0;
      return { label, value: density };
    }
    return { label, value: count };
  });
}
