export type TradeRiskInput = {
  id: number;
  entryTime: Date | string;
  direction: string;
  entryPoint: number;
  closingPoint: number;
  slPoint: number | null;
  actualRMultiple: number | null;
  pnlAmount: number;
};

export type RiskSeriesPoint = {
  id: number;
  date: Date;
  label: string;
  r: number;
};

export type RiskHistogramBucket = {
  bucket: string;
  count: number;
};

const DEFAULT_RISK_POINTS = 20;

export function normalizeRiskSeries(
  trades: TradeRiskInput[],
  fallbackRiskPoints: number = DEFAULT_RISK_POINTS,
): RiskSeriesPoint[] {
  const sorted = [...trades].sort((a, b) => {
    const aTime = new Date(a.entryTime).getTime();
    const bTime = new Date(b.entryTime).getTime();
    if (aTime !== bTime) return aTime - bTime;
    return a.id - b.id;
  });

  return sorted
    .map((trade, index) => {
      const date = new Date(trade.entryTime);
      const r = resolveRMultiple(trade, fallbackRiskPoints);
      if (r === null) return null;
      return {
        id: trade.id,
        date,
        label: String(index + 1),
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

function resolveRMultiple(
  trade: TradeRiskInput,
  fallbackRiskPoints: number,
): number | null {
  if (Number.isFinite(trade.pnlAmount) && fallbackRiskPoints > 0) {
    return trade.pnlAmount / fallbackRiskPoints;
  }
  if (trade.actualRMultiple !== null && Number.isFinite(trade.actualRMultiple)) {
    return trade.actualRMultiple;
  }

  const entry = trade.entryPoint;
  const close = trade.closingPoint;
  const direction = trade.direction.trim().toLowerCase();

  let riskPoints: number | null = null;
  if (trade.slPoint !== null && Number.isFinite(trade.slPoint)) {
    const slDistance = Math.abs(entry - trade.slPoint);
    if (slDistance > 0) {
      riskPoints = slDistance;
    }
  }
  if (riskPoints === null) {
    const fallback = Number.isFinite(fallbackRiskPoints) ? fallbackRiskPoints : DEFAULT_RISK_POINTS;
    if (fallback > 0) {
      riskPoints = fallback;
    }
  }
  if (riskPoints === null || riskPoints <= 0) return null;

  if (direction === "short") {
    return (entry - close) / riskPoints;
  }
  return (close - entry) / riskPoints;
}

function getWindowStart(index: number, windowSize: number | null): number {
  if (!windowSize || windowSize <= 0) return 0;
  return Math.max(0, index - windowSize + 1);
}

function formatDateLabel(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
