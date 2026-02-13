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
  calculateAbsoluteLossHistogram,
  calculateBottomLossAverage,
  calculateRollingMaxLoss,
  normalizeLossPnlSeries,
  type TradeRiskInput,
} from "@/lib/risk-stats";

type RiskStatsChartsProps = {
  trades: TradeRiskInput[];
};

export function RiskStatsCharts({ trades }: RiskStatsChartsProps) {
  const [thresholdInput, setThresholdInput] = React.useState("1.5");

  const rollingMaxWindow = 20;
  const bottomLossWindow = 30;
  const histogramWindow = 100;
  const threshold = parseNumberWithFallback(thresholdInput, 1.5);
  const rollingLossSeries = React.useMemo(
    () => normalizeLossPnlSeries(trades, "index", "asc"),
    [trades],
  );
  const recentRollingSeries = React.useMemo(
    () => rollingLossSeries.slice(-rollingMaxWindow),
    [rollingLossSeries],
  );
  const recentBottomSeries = React.useMemo(
    () => rollingLossSeries.slice(-bottomLossWindow),
    [rollingLossSeries],
  );
  const recentHistogramSeries = React.useMemo(
    () => rollingLossSeries.slice(-histogramWindow),
    [rollingLossSeries],
  );

  const rollingMaxLoss = React.useMemo(
    () => calculateRollingMaxLoss(recentRollingSeries, rollingMaxWindow, "absolute"),
    [recentRollingSeries],
  );

  const bottomLossAvg = React.useMemo(
    () => calculateBottomLossAverage(recentBottomSeries, bottomLossWindow, 0.1, "absolute"),
    [recentBottomSeries],
  );
  const maxLossThreshold = Math.abs(threshold);

  const histogram = React.useMemo(
    () => calculateAbsoluteLossHistogram(recentHistogramSeries, histogramWindow, 10, 10),
    [recentHistogramSeries],
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
              <Label className="text-xs text-zinc-400">Loss threshold (|PnL|)</Label>
              <Input
                value={thresholdInput}
                onChange={(event) => setThresholdInput(event.target.value)}
                placeholder="1.5"
                inputMode="decimal"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Loss buckets (fixed)</Label>
              <Input
                value="0-10, 10-20, ..., 90-100"
                className="h-8 text-xs"
                disabled
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Histogram bins</Label>
              <Input
                value="10 bins x 10"
                className="h-8 text-xs"
                disabled
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
          <div className="w-full min-w-0">
            <ResponsiveContainer width="100%" height={280} minWidth={0}>
              <LineChart data={rollingMaxLoss} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
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
                    return [value.toFixed(2), "Max loss (|PnL|)"];
                  }}
                />
                <ReferenceLine
                  y={maxLossThreshold}
                  stroke="#f97316"
                  strokeDasharray="6 6"
                  ifOverflow="extendDomain"
                  label={{ value: maxLossThreshold.toFixed(2), fill: "#f97316", fontSize: 12 }}
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
          <div className="w-full min-w-0">
            <ResponsiveContainer width="100%" height={280} minWidth={0}>
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
                    return [value.toFixed(2), "Bottom 10% avg (|PnL|)"];
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
          <div className="w-full min-w-0">
            <ResponsiveContainer width="100%" height={280} minWidth={0}>
              <BarChart data={histogram} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0b0b0d", borderColor: "#27272a" }}
                  labelStyle={{ color: "#e4e4e7" }}
                  formatter={(value) => [value, "Loss count"]}
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

function parseNumberWithFallback(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
