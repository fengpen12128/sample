"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  calculateDistributionComparison,
  calculateRollingAverageR,
  calculateRollingWinLossRatio,
  normalizeRiskSeries,
  type TradeRiskInput,
} from "@/lib/risk-stats";

type StructureStatsChartsProps = {
  trades: TradeRiskInput[];
};

const DEFAULT_RANGE_MIN = "-4";
const DEFAULT_RANGE_MAX = "4";
const DEFAULT_BIN_COUNT = "40";
const DEFAULT_WINDOW = "100";
const DEFAULT_RISK_POINTS = "20";

export function StructureStatsCharts({ trades }: StructureStatsChartsProps) {
  const [windowInput, setWindowInput] = React.useState(DEFAULT_WINDOW);
  const [rangeMinInput, setRangeMinInput] = React.useState(DEFAULT_RANGE_MIN);
  const [rangeMaxInput, setRangeMaxInput] = React.useState(DEFAULT_RANGE_MAX);
  const [binCountInput, setBinCountInput] = React.useState(DEFAULT_BIN_COUNT);
  const [fallbackRiskInput, setFallbackRiskInput] = React.useState(DEFAULT_RISK_POINTS);

  const windowSize = parseNullableInt(windowInput);
  const rangeMin = parseNumberWithFallback(rangeMinInput, -4);
  const rangeMax = parseNumberWithFallback(rangeMaxInput, 4);
  const binCount = parseNumberWithFallback(binCountInput, 40);
  const fallbackRiskPoints = parseNumberWithFallback(fallbackRiskInput, 20);

  const series = React.useMemo(
    () => normalizeRiskSeries(trades, fallbackRiskPoints, "index", "desc"),
    [trades, fallbackRiskPoints],
  );

  const distribution = React.useMemo(
    () =>
      calculateDistributionComparison(
        series,
        windowSize,
        rangeMin,
        rangeMax,
        Math.round(binCount),
        "density",
      ),
    [series, windowSize, rangeMin, rangeMax, binCount],
  );

  const rollingAverage = React.useMemo(
    () => calculateRollingAverageR(series, windowSize),
    [series, windowSize],
  );

  const winLossRatio = React.useMemo(
    () => calculateRollingWinLossRatio(series, windowSize),
    [series, windowSize],
  );

  return (
    <div className="space-y-6">
      <Card className="border-zinc-800 bg-zinc-950/40">
        <CardHeader>
          <CardTitle>Structure Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Recent window (N)</Label>
              <Input
                value={windowInput}
                onChange={(event) => setWindowInput(event.target.value)}
                inputMode="numeric"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Histogram min (R)</Label>
              <Input
                value={rangeMinInput}
                onChange={(event) => setRangeMinInput(event.target.value)}
                inputMode="decimal"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Histogram max (R)</Label>
              <Input
                value={rangeMaxInput}
                onChange={(event) => setRangeMaxInput(event.target.value)}
                inputMode="decimal"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Bin count</Label>
              <Input
                value={binCountInput}
                onChange={(event) => setBinCountInput(event.target.value)}
                inputMode="numeric"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Risk points</Label>
              <Input
                value={fallbackRiskInput}
                onChange={(event) => setFallbackRiskInput(event.target.value)}
                inputMode="numeric"
                className="h-8 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-950/40">
        <CardHeader>
          <CardTitle>R Distribution Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={distribution}
                margin={{ top: 12, right: 16, left: 0, bottom: 0 }}
                barCategoryGap="10%"
                barGap={-18}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="bin" tick={{ fontSize: 11 }} interval={3} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0b0b0d", borderColor: "#27272a" }}
                  labelStyle={{ color: "#e4e4e7" }}
                />
                <Bar dataKey="base" fill="#a1a1aa" fillOpacity={0.35} />
                <Bar dataKey="recent" fill="#60a5fa" fillOpacity={0.55} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-950/40">
        <CardHeader>
          <CardTitle>Rolling Average R</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={rollingAverage}
                margin={{ top: 12, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="x" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0b0b0d", borderColor: "#27272a" }}
                  labelStyle={{ color: "#e4e4e7" }}
                  formatter={(value) => {
                    if (typeof value !== "number") {
                      return ["N/A", "Rolling avg"];
                    }
                    return [`${value.toFixed(2)}R`, "Rolling avg"];
                  }}
                />
                <Line type="monotone" dataKey="value" stroke="#34d399" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-950/40">
        <CardHeader>
          <CardTitle>Win R / Loss R Ratio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={winLossRatio} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="x" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0b0b0d", borderColor: "#27272a" }}
                  labelStyle={{ color: "#e4e4e7" }}
                  formatter={(value) => {
                    if (typeof value !== "number") {
                      return ["N/A", "Win/Loss ratio"];
                    }
                    return [value.toFixed(2), "Win/Loss ratio"];
                  }}
                />
                <Line type="monotone" dataKey="value" stroke="#f472b6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function parseNullableInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseNumberWithFallback(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
