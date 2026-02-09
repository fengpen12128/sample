"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  calculateBottomLossAverage,
  calculateLossHistogram,
  calculateRollingMaxLoss,
  normalizeRiskSeries,
  type TradeRiskInput,
} from "@/lib/risk-stats";

type RiskStatsChartsProps = {
  trades: TradeRiskInput[];
};

const DEFAULT_BUCKETS = "-0.5,-1,-1.5,-2,-3";

export function RiskStatsCharts({ trades }: RiskStatsChartsProps) {
  const [thresholdInput, setThresholdInput] = React.useState("-1.5");
  const [bucketInput, setBucketInput] = React.useState(DEFAULT_BUCKETS);
  const [fallbackRiskInput, setFallbackRiskInput] = React.useState("20");

  const rollingMaxWindow = 20;
  const bottomLossWindow = 30;
  const histogramWindow = 100;
  const threshold = parseNumberWithFallback(thresholdInput, -1.5);
  const bucketEdges = parseBucketEdges(bucketInput);
  const fallbackRiskPoints = parseNumberWithFallback(fallbackRiskInput, 20);

  const series = React.useMemo(
    () => normalizeRiskSeries(trades, fallbackRiskPoints),
    [trades, fallbackRiskPoints],
  );
  const recentRollingSeries = React.useMemo(() => series.slice(-rollingMaxWindow), [series]);
  const recentBottomSeries = React.useMemo(() => series.slice(-bottomLossWindow), [series]);
  const recentHistogramSeries = React.useMemo(() => series.slice(-histogramWindow), [series]);

  const rollingMaxLoss = React.useMemo(
    () => calculateRollingMaxLoss(recentRollingSeries, rollingMaxWindow),
    [recentRollingSeries],
  );
  const rollingMaxLossChart = React.useMemo(
    () =>
      rollingMaxLoss.map((point) => ({
        ...point,
        value: point.value === null ? null : Math.abs(point.value),
      })),
    [rollingMaxLoss],
  );

  const bottomLossAvg = React.useMemo(
    () => calculateBottomLossAverage(recentBottomSeries, bottomLossWindow, 0.1),
    [recentBottomSeries],
  );
  const maxLossThreshold = Math.abs(threshold);

  const histogram = React.useMemo(
    () => calculateLossHistogram(recentHistogramSeries, histogramWindow, bucketEdges),
    [recentHistogramSeries, bucketEdges],
  );

  return (
    <div className="space-y-6">
      <Card className="border-zinc-800 bg-zinc-950/40">
        <CardHeader>
          <CardTitle>Risk Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Rolling max window (fixed)</Label>
              <Input
                value="20"
                placeholder="20"
                inputMode="numeric"
                className="h-8 text-xs"
                disabled
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Bottom 10% window (fixed)</Label>
              <Input
                value="30"
                placeholder="30"
                inputMode="numeric"
                className="h-8 text-xs"
                disabled
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Histogram window (fixed)</Label>
              <Input
                value="100"
                placeholder="100"
                inputMode="numeric"
                className="h-8 text-xs"
                disabled
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Risk threshold (R)</Label>
              <Input
                value={thresholdInput}
                onChange={(event) => setThresholdInput(event.target.value)}
                placeholder="-1.5"
                inputMode="decimal"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Loss buckets (R)</Label>
              <Input
                value={bucketInput}
                onChange={(event) => setBucketInput(event.target.value)}
                placeholder={DEFAULT_BUCKETS}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Risk per trade (PnL)</Label>
              <Input
                value={fallbackRiskInput}
                onChange={(event) => setFallbackRiskInput(event.target.value)}
                placeholder="20"
                inputMode="numeric"
                className="h-8 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-950/40">
        <CardHeader>
          <CardTitle>Rolling Max Loss</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rollingMaxLossChart} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="x" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0b0b0d", borderColor: "#27272a" }}
                  labelStyle={{ color: "#e4e4e7" }}
                  formatter={(value) => {
                    if (value == null || typeof value !== "number") {
                      return ["N/A", "Max loss"];
                    }
                    return [`-${value.toFixed(2)}R`, "Max loss"];
                  }}
                />
                <ReferenceLine
                  y={maxLossThreshold}
                  stroke="#f97316"
                  strokeDasharray="6 6"
                  ifOverflow="extendDomain"
                  label={{ value: `-${maxLossThreshold.toFixed(2)}R`, fill: "#f97316", fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-950/40">
        <CardHeader>
          <CardTitle>Bottom 10% Loss Average</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bottomLossAvg} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="x" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0b0b0d", borderColor: "#27272a" }}
                  labelStyle={{ color: "#e4e4e7" }}
                  formatter={(value) => {
                    if (value == null || typeof value !== "number") {
                      return ["N/A", "Bottom 10% avg"];
                    }
                    return [`${value.toFixed(2)}R`, "Bottom 10% avg"];
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#a855f7"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-950/40">
        <CardHeader>
          <CardTitle>Loss Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histogram} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0b0b0d", borderColor: "#27272a" }}
                  labelStyle={{ color: "#e4e4e7" }}
                />
                <Bar dataKey="count" fill="#22c55e" />
              </BarChart>
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

function parseBucketEdges(value: string): number[] {
  return value
    .split(",")
    .map((entry) => Number.parseFloat(entry.trim()))
    .filter((entry) => Number.isFinite(entry) && entry < 0);
}
