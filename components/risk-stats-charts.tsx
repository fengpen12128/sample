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
  const [windowSizeInput, setWindowSizeInput] = React.useState("");
  const [histogramWindowInput, setHistogramWindowInput] = React.useState("100");
  const [thresholdInput, setThresholdInput] = React.useState("-1.5");
  const [bucketInput, setBucketInput] = React.useState(DEFAULT_BUCKETS);
  const [fallbackRiskInput, setFallbackRiskInput] = React.useState("20");

  const windowSize = parseNullableInt(windowSizeInput);
  const histogramWindow = parseNullableInt(histogramWindowInput);
  const threshold = parseNumberWithFallback(thresholdInput, -1.5);
  const bucketEdges = parseBucketEdges(bucketInput);
  const fallbackRiskPoints = parseNumberWithFallback(fallbackRiskInput, 20);

  const series = React.useMemo(
    () => normalizeRiskSeries(trades, fallbackRiskPoints),
    [trades, fallbackRiskPoints],
  );

  const rollingMaxLoss = React.useMemo(
    () => calculateRollingMaxLoss(series, windowSize),
    [series, windowSize],
  );

  const bottomLossAvg = React.useMemo(
    () => calculateBottomLossAverage(series, windowSize, 0.1),
    [series, windowSize],
  );

  const histogram = React.useMemo(
    () => calculateLossHistogram(series, histogramWindow, bucketEdges),
    [series, histogramWindow, bucketEdges],
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
              <Label className="text-xs text-zinc-400">Rolling window (N)</Label>
              <Input
                value={windowSizeInput}
                onChange={(event) => setWindowSizeInput(event.target.value)}
                placeholder="All"
                inputMode="numeric"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Histogram window</Label>
              <Input
                value={histogramWindowInput}
                onChange={(event) => setHistogramWindowInput(event.target.value)}
                placeholder="100"
                inputMode="numeric"
                className="h-8 text-xs"
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
              <Label className="text-xs text-zinc-400">Fallback risk points</Label>
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
              <LineChart data={rollingMaxLoss} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="x" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0b0b0d", borderColor: "#27272a" }}
                  labelStyle={{ color: "#e4e4e7" }}
                  formatter={(value: number | null) =>
                    value === null ? ["N/A", "Max loss"] : [`${value.toFixed(2)}R`, "Max loss"]
                  }
                />
                <ReferenceLine
                  y={threshold}
                  stroke="#f97316"
                  strokeDasharray="6 6"
                  ifOverflow="extendDomain"
                  label={{ value: `${threshold.toFixed(2)}R`, fill: "#f97316", fontSize: 12 }}
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
                  formatter={(value: number | null) =>
                    value === null ? ["N/A", "Bottom 10% avg"] : [`${value.toFixed(2)}R`, "Bottom 10% avg"]
                  }
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
