"use client";

import * as React from "react";
import { CircleHelpIcon } from "lucide-react";
import Markdown from "markdown-to-jsx";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  calculateDistributionComparison,
  calculateRollingAverageR,
  calculateRollingExpectedValueByPnl,
  calculateRollingWinLossRatioByAbsolutePnl,
  normalizeRiskSeries,
  type TradeRiskInput,
} from "@/lib/risk-stats";

type StructureStatsChartsProps = {
  trades: TradeRiskInput[];
  rollingAverageDoc: string;
};

const DEFAULT_RANGE_MIN = "-4";
const DEFAULT_RANGE_MAX = "4";
const DEFAULT_BIN_COUNT = "40";
const DEFAULT_WINDOW = "100";
const DEFAULT_RISK_POINTS = "20";

export function StructureStatsCharts({ trades, rollingAverageDoc }: StructureStatsChartsProps) {
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
    () => normalizeRiskSeries(trades, fallbackRiskPoints, "index", "asc"),
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
    () => calculateRollingWinLossRatioByAbsolutePnl(trades, windowSize, "index", "asc"),
    [trades, windowSize],
  );
  const expectedValue = React.useMemo(
    () => calculateRollingExpectedValueByPnl(trades, windowSize, "index", "asc"),
    [trades, windowSize],
  );

  const pieData = React.useMemo(() => {
    const sorted = [...trades].sort((a, b) => {
      const aTime = new Date(a.entryTime).getTime();
      const bTime = new Date(b.entryTime).getTime();
      if (aTime !== bTime) return aTime - bTime;
      return a.id.localeCompare(b.id);
    });
    const windowed =
      windowSize && windowSize > 0 ? sorted.slice(-windowSize) : sorted;
    const totals = windowed.reduce(
      (acc, trade) => {
        const value = Number.isFinite(trade.pnlAmount) ? trade.pnlAmount : 0;
        if (value >= 0) {
          acc.profit += value;
        } else {
          acc.loss += Math.abs(value);
        }
        return acc;
      },
      { profit: 0, loss: 0 },
    );
    return [
      { name: "Profit total", value: totals.profit },
      { name: "Loss total", value: totals.loss },
    ];
  }, [trades, windowSize]);

  const pieTotal = React.useMemo(
    () => pieData.reduce((acc, item) => acc + item.value, 0),
    [pieData],
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
          <div className="w-full min-w-0">
            <ResponsiveContainer width="100%" height={300} minWidth={0}>
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
          <CardAction>
            <RollingAverageInfoDialog rawMarkdown={rollingAverageDoc} />
          </CardAction>
        </CardHeader>
        <CardContent className="relative">
          <div className="pointer-events-none absolute right-4 top-4 text-xs text-zinc-400">
            <div>Healthy zone ≥ +0.15R</div>
            <div>Ideal zone +0.20R ~ +0.30R</div>
          </div>
          <div className="w-full min-w-0">
            <ResponsiveContainer width="100%" height={280} minWidth={0}>
              <LineChart
                data={rollingAverage}
                margin={{ top: 12, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="x" tick={false} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const entry = payload[0];
                    const rawValue = entry.value;
                    const valueText =
                      typeof rawValue === "number" ? `${rawValue.toFixed(2)}R` : "N/A";
                    const id = String((entry.payload as { id?: string }).id ?? "");
                    return (
                      <div className="rounded-md border border-zinc-700 bg-zinc-900/95 px-3 py-2 text-xs text-zinc-100 shadow-lg">
                        <div className="font-medium">Rolling avg: {valueText}</div>
                        {id ? (
                          <a
                            href={`/?id=${encodeURIComponent(id)}`}
                            className="text-emerald-300 underline"
                          >
                            ID: {id}
                          </a>
                        ) : null}
                      </div>
                    );
                  }}
                />
                <ReferenceLine
                  y={0.2}
                  stroke="#f59e0b"
                  strokeDasharray="6 6"
                  ifOverflow="extendDomain"
                  label={{ value: "Ideal min 0.20R", fill: "#f59e0b", fontSize: 11 }}
                />
                <ReferenceLine
                  y={0.3}
                  stroke="#f59e0b"
                  strokeDasharray="6 6"
                  ifOverflow="extendDomain"
                  label={{ value: "Ideal max 0.30R", fill: "#f59e0b", fontSize: 11 }}
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
        <CardContent className="relative">
          <div className="pointer-events-none absolute right-4 top-4 text-xs text-zinc-400">
            <div>Ideal zone 1.20 ~ 1.50</div>
          </div>
          <div className="w-full min-w-0">
            <ResponsiveContainer width="100%" height={280} minWidth={0}>
              <LineChart data={winLossRatio} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="x" tick={false} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const entry = payload[0];
                    const rawValue = entry.value;
                    const valueText = typeof rawValue === "number" ? rawValue.toFixed(2) : "N/A";
                    const id = String((entry.payload as { id?: string }).id ?? "");
                    return (
                      <div className="rounded-md border border-zinc-700 bg-zinc-900/95 px-3 py-2 text-xs text-zinc-100 shadow-lg">
                        <div className="font-medium">Win/Loss ratio: {valueText}</div>
                        {id ? (
                          <a
                            href={`/?id=${encodeURIComponent(id)}`}
                            className="text-emerald-300 underline"
                          >
                            ID: {id}
                          </a>
                        ) : null}
                      </div>
                    );
                  }}
                />
                <ReferenceLine
                  y={1.2}
                  stroke="#f59e0b"
                  strokeDasharray="6 6"
                  ifOverflow="extendDomain"
                  label={{ value: "Ideal min 1.20", fill: "#f59e0b", fontSize: 11 }}
                />
                <ReferenceLine
                  y={1.5}
                  stroke="#f59e0b"
                  strokeDasharray="6 6"
                  ifOverflow="extendDomain"
                  label={{ value: "Ideal max 1.50", fill: "#f59e0b", fontSize: 11 }}
                />
                <Line type="monotone" dataKey="value" stroke="#f472b6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-950/40">
        <CardHeader>
          <CardTitle>Expected Value (EV)</CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="pointer-events-none absolute right-4 top-4 text-xs text-zinc-400">
            <div>EV = (WinRate x AvgWin) - (LossRate x AvgLoss)</div>
          </div>
          <div className="w-full min-w-0">
            <ResponsiveContainer width="100%" height={280} minWidth={0}>
              <LineChart data={expectedValue} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="x" tick={false} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const entry = payload[0];
                    const rawValue = entry.value;
                    const valueText = typeof rawValue === "number" ? rawValue.toFixed(2) : "N/A";
                    const id = String((entry.payload as { id?: string }).id ?? "");
                    return (
                      <div className="rounded-md border border-zinc-700 bg-zinc-900/95 px-3 py-2 text-xs text-zinc-100 shadow-lg">
                        <div className="font-medium">EV: {valueText}</div>
                        {id ? (
                          <a
                            href={`/?id=${encodeURIComponent(id)}`}
                            className="text-emerald-300 underline"
                          >
                            ID: {id}
                          </a>
                        ) : null}
                      </div>
                    );
                  }}
                />
                <ReferenceLine
                  y={0}
                  stroke="#f59e0b"
                  strokeDasharray="6 6"
                  ifOverflow="extendDomain"
                  label={{ value: "Break-even", fill: "#f59e0b", fontSize: 11 }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#22d3ee"
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
          <CardTitle>Profit vs Loss Total (Recent N)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full min-w-0">
            <ResponsiveContainer width="100%" height={280} minWidth={0}>
              <PieChart margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const entry = payload[0];
                    const rawValue = typeof entry.value === "number" ? entry.value : 0;
                    const percent =
                      pieTotal > 0 ? `${((rawValue / pieTotal) * 100).toFixed(1)}%` : "0%";
                    return (
                      <div className="rounded-md border border-zinc-700 bg-zinc-900/95 px-3 py-2 text-xs text-zinc-100 shadow-lg">
                        <div className="font-medium">{entry.name ?? "Total"}</div>
                        <div className="text-zinc-200">
                          {rawValue.toFixed(2)} ({percent})
                        </div>
                      </div>
                    );
                  }}
                />
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="45%"
                  outerRadius="75%"
                  paddingAngle={2}
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${entry.name}`}
                      fill={index === 0 ? "#22c55e" : "#ef4444"}
                    />
                  ))}
                </Pie>
              </PieChart>
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

function RollingAverageInfoDialog({ rawMarkdown }: { rawMarkdown: string }) {
  const formattedMarkdown = React.useMemo(
    () => formatRollingAverageDoc(rawMarkdown),
    [rawMarkdown],
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="size-7 text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100"
          aria-label="Rolling Average R 指标说明"
        >
          <CircleHelpIcon className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="h-[84vh] max-h-[90vh] w-[92vw] sm:w-[88vw] sm:max-w-6xl border border-zinc-700 bg-zinc-950 p-6 text-base leading-relaxed text-zinc-100 font-['SF_Pro_Rounded','Arial_Rounded_MT_Bold','Hiragino_Maru_Gothic_ProN','system-ui']"
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-zinc-100">
            Rolling Average R 指标说明
          </DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <Markdown
            options={{
              forceBlock: true,
              overrides: {
                h1: { props: { className: "mb-3 text-2xl font-semibold text-zinc-100" } },
                h2: { props: { className: "mb-2 mt-4 text-xl font-semibold text-zinc-100" } },
                p: { props: { className: "mb-2 text-base text-zinc-200" } },
                ul: { props: { className: "mb-2 list-disc pl-5 text-base text-zinc-200" } },
                li: { props: { className: "my-1" } },
                code: {
                  props: {
                    className: "rounded bg-zinc-900 px-2 py-1 text-sm text-zinc-100",
                  },
                },
              },
            }}
          >
            {formattedMarkdown}
          </Markdown>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatRollingAverageDoc(rawMarkdown: string): string {
  const source = rawMarkdown.trim();
  if (!source) {
    return "# Rolling Average R\n\n暂无指标说明内容。";
  }

  const lines = source.split(/\r?\n/).map((line) => line.trim());
  const output: string[] = [];
  let inFormula = false;

  for (const line of lines) {
    if (!line) {
      if (output[output.length - 1] !== "") {
        output.push("");
      }
      continue;
    }

    if (line === "\\[") {
      inFormula = true;
      continue;
    }
    if (line === "\\]") {
      inFormula = false;
      continue;
    }

    if (inFormula) {
      output.push("`Rolling Average R = (R1 + R2 + ... + RN) / N`");
      continue;
    }

    if (line.startsWith("指标名称：")) {
      output.push(`# ${line.replace("指标名称：", "").trim()}`);
      continue;
    }
    if (line === "计算方式：") {
      output.push("## 计算方式");
      continue;
    }
    if (line === "反映的长期意义：") {
      output.push("## 指标作用");
      continue;
    }
    if (line === "合理数值范围参考：") {
      output.push("## 参考范围");
      continue;
    }
    if (line === "局限性：") {
      output.push("## 局限性");
      continue;
    }

    if (
      line.includes("→") ||
      line.startsWith("0.1R") ||
      line.startsWith("0.5R") ||
      line.startsWith("0R")
    ) {
      output.push(`- ${line}`);
      continue;
    }

    output.push(line);
  }

  return output.join("\n").replace(/\n{3,}/g, "\n\n");
}
