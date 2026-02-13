"use client";

import * as React from "react";
import type { PutBlobResult } from "@vercel/blob";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderIcon } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { createTrade, updateTrade } from "@/app/action";
import { Button } from "@/components/ui/button";
import {
  joinScreenshotUrls,
  mergeScreenshotUrls,
  splitScreenshotUrls,
} from "@/lib/screenshot-urls";
import { formatWallClockYmdHms } from "@/lib/wall-clock-datetime";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// Zod schema for form validation
const tradeFormSchema = z.object({
  pnlAmount: z.string().min(1, "PnL amount is required"),
  symbol: z.string().min(1, "Symbol is required"),
  tradePlatform: z.string().min(1, "Trade platform is required"),
  direction: z.string().min(1, "Direction is required"),
  result: z.string().min(1, "Result is required"),
  tradeMode: z.string().min(1, "Trade mode is required"),
  entryTime: z
    .string()
    .min(1, "Entry time is required")
    .refine(
      (value) => /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(value.trim()),
      "Use format YYYY-MM-DD HH:mm:ss",
    ),
  exitTime: z
    .string()
    .min(1, "Exit time is required")
    .refine(
      (value) => /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(value.trim()),
      "Use format YYYY-MM-DD HH:mm:ss",
    ),
  earlyExit: z.boolean(),
  timeframe: z.string().optional(),
  trendAssessment: z.string().optional(),
  marketPhase: z.string().optional(),
  setupType: z.string().optional(),
  entryType: z.string().optional(),
  confidenceLevel: z.string().optional(),
  entryPoint: z.string().min(1, "Entry point is required"),
  closingPoint: z.string().min(1, "Closing point is required"),
  slPoint: z.string().optional(),
  tpPoint: z.string().optional(),
  entryReason: z.string().optional(),
  screenshotUrl: z.string().optional(),
});

type TradeFormValues = z.infer<typeof tradeFormSchema>;

export type TradeEditable = {
  id: string;
  timeframe: string | null;
  trendAssessment: string | null;
  marketPhase: string | null;
  symbol: string;
  tradePlatform: string | null;
  direction: string;
  result: string;
  tradeMode: string;
  entryTime: Date;
  exitTime: Date;
  pnlAmount: number;
  setupType: string | null;
  setupQuality: string | null;
  entryType: string | null;
  entryPoint: number;
  closingPoint: number;
  slPoint: number | null;
  tpPoint: number | null;
  actualRMultiple: number | null;
  plannedRMultiple: number | null;
  earlyExit: boolean | null;
  entryReason: string | null;
  expectedScenario: string | null;
  confidenceLevel: number | null;
  screenshotUrl: string | null;
};

function ensureOption(options: string[], value: string | undefined) {
  if (!value) return options;
  return options.includes(value) ? options : [value, ...options];
}

function TradeFormDialog({
  trigger,
  title,
  submitLabel,
  mode,
  initial,
  onSaved,
}: {
  trigger: React.ReactNode;
  title: string;
  submitLabel: string;
  mode: "create" | "edit";
  initial?: TradeEditable;
  onSaved?: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [uploadingScreenshot, setUploadingScreenshot] = React.useState(false);
  const [screenshotError, setScreenshotError] = React.useState<string | null>(null);
  const [aiDialogOpen, setAiDialogOpen] = React.useState(false);
	const [aiFile, setAiFile] = React.useState<File | null>(null);
	const [aiPreviewUrl, setAiPreviewUrl] = React.useState<string | null>(null);
	const [aiParsing, setAiParsing] = React.useState(false);
	const [aiError, setAiError] = React.useState<string | null>(null);
  const screenshotInputId = React.useId();
  const screenshotInputRef = React.useRef<HTMLInputElement>(null);

  const controlClassName = "h-10 text-sm";
  const selectTriggerClassName = "h-10 w-full text-sm";
  const getDefaultValues = React.useCallback(
    (): TradeFormValues => ({
      pnlAmount: initial?.pnlAmount !== undefined ? String(initial.pnlAmount) : "",
      symbol: initial?.symbol ?? "XAUUSD",
      tradePlatform: initial?.tradePlatform ?? "Bybit",
      direction: initial?.direction ?? "long",
      result: initial?.result ?? "win",
      tradeMode: initial?.tradeMode ?? "live",
      entryTime: initial?.entryTime ? formatWallClockYmdHms(initial.entryTime) : "",
      exitTime: initial?.exitTime ? formatWallClockYmdHms(initial.exitTime) : "",
      timeframe: initial ? initial.timeframe ?? "" : "5m",
      trendAssessment: initial ? initial.trendAssessment ?? "" : "Weak Bull Trend Channel",
      marketPhase: initial ? initial.marketPhase ?? "" : "Pullback",
      setupType: initial ? initial.setupType ?? "" : "H2",
      entryType: initial ? initial.entryType ?? "" : "stop",
      confidenceLevel: initial
        ? initial.confidenceLevel !== null && initial.confidenceLevel !== undefined
          ? String(initial.confidenceLevel)
          : ""
        : "3",
      entryPoint: initial?.entryPoint !== undefined ? String(initial.entryPoint) : "",
      closingPoint: initial?.closingPoint !== undefined ? String(initial.closingPoint) : "",
      slPoint: initial?.slPoint !== undefined ? String(initial.slPoint) : "",
      tpPoint: initial?.tpPoint !== undefined ? String(initial.tpPoint) : "",
      earlyExit: initial?.earlyExit ?? false,
      entryReason: initial?.entryReason ?? "",
      screenshotUrl: initial?.screenshotUrl ?? "",
    }),
    [initial],
  );

  const form = useForm<TradeFormValues>({
    resolver: zodResolver(tradeFormSchema),
    defaultValues: getDefaultValues(),
    mode: "onBlur",
  });

  const { control, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = form;

  // Watch values for computed fields
  const entryPoint = watch("entryPoint");
  const closingPoint = watch("closingPoint");
  const slPoint = watch("slPoint");
  const tpPoint = watch("tpPoint");
  const screenshot = watch("screenshotUrl");
  const screenshotUrls = React.useMemo(
    () => splitScreenshotUrls(screenshot),
    [screenshot],
  );

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      reset(getDefaultValues());
      setScreenshotError(null);
      setUploadingScreenshot(false);
    }
  }, [open, reset, getDefaultValues]);

  React.useEffect(() => {
    if (!aiFile) {
      setAiPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(aiFile);
    setAiPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [aiFile]);

  const handleScreenshotUpload = async (files: File[]) => {
    if (!files.length) return;
    setUploadingScreenshot(true);
    setScreenshotError(null);
    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const response = await fetch(`/api/screenshot/upload?filename=${file.name}`, {
          method: "POST",
          body: file,
        });
        if (!response.ok) {
          throw new Error("Upload failed, please try again");
        }
        const blob = (await response.json()) as PutBlobResult;
        uploadedUrls.push(blob.url);
      }
      const merged = mergeScreenshotUrls(screenshot, uploadedUrls);
      setValue("screenshotUrl", merged, {
        shouldDirty: true,
        shouldValidate: true,
      });
    } catch (error) {
      setScreenshotError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploadingScreenshot(false);
    }
  };

  const resetAiDialog = () => {
    setAiFile(null);
    setAiPreviewUrl(null);
    setAiParsing(false);
    setAiError(null);
  };

  const applyParsedFields = (fields: Record<string, unknown>) => {
    const parsedFields: Array<keyof TradeFormValues> = [
      "pnlAmount",
      "symbol",
      "tradePlatform",
      "direction",
      "result",
      "tradeMode",
      "entryTime",
      "exitTime",
      "timeframe",
      "trendAssessment",
      "marketPhase",
      "setupType",
      "entryType",
      "confidenceLevel",
      "entryPoint",
      "closingPoint",
      "slPoint",
      "tpPoint",
      "entryReason",
      "earlyExit",
    ];

    parsedFields.forEach((key) => {
      const value = fields[key];
      if (key === "earlyExit") {
        if (typeof value === "boolean") {
          setValue(key, value, { shouldDirty: true, shouldValidate: true });
          return;
        }
        if (typeof value === "string") {
          const normalized = value.trim().toLowerCase();
          if (normalized === "true" || normalized === "false") {
            setValue(key, normalized === "true", { shouldDirty: true, shouldValidate: true });
            return;
          }
          setValue(key, false, { shouldDirty: true, shouldValidate: true });
        }
        return;
      }

      if (typeof value === "string") {
        setValue(key, value, { shouldDirty: true, shouldValidate: true });
        return;
      }
      if (typeof value === "number") {
        setValue(key, String(value), { shouldDirty: true, shouldValidate: true });
        return;
      }
      if (value === null || value === undefined) {
        setValue(key, "", { shouldDirty: true, shouldValidate: true });
      }
    });
  };

  const handleAiParse = async () => {
    if (!aiFile) {
      setAiError("Please select an image first.");
      return;
    }
    setAiParsing(true);
    setAiError(null);
    try {
      const formData = new FormData();
      formData.append("file", aiFile);
      const response = await fetch("/api/trades/parse-image", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as { data?: Record<string, unknown>; error?: string };
      if (!response.ok) {
        throw new Error(result?.error ?? "Image parsing failed. Please try again.");
      }
      if (!result.data) {
        throw new Error("Image parsing failed. Please try again.");
      }
      applyParsedFields(result.data);
      toast.success("Image parsed. Form updated.");
      setAiDialogOpen(false);
      resetAiDialog();
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Image parsing failed. Please try again.");
    } finally {
      setAiParsing(false);
    }
  };

  const toNumber = (value: string | undefined) => {
    if (!value || !value.trim()) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  const computedActual = React.useMemo(() => {
    const entry = toNumber(entryPoint);
    const sl = toNumber(slPoint);
    const closing = toNumber(closingPoint);
    if (entry === null || sl === null || closing === null) return "";
    const risk = entry - sl;
    if (risk === 0) return "";
    const reward = closing - entry;
    return String(Math.round((reward / risk) * 100) / 100);
  }, [entryPoint, slPoint, closingPoint]);

  const computedPlanned = React.useMemo(() => {
    const entry = toNumber(entryPoint);
    const sl = toNumber(slPoint);
    const tp = toNumber(tpPoint);
    if (entry === null || sl === null || tp === null) return "";
    const risk = entry - sl;
    if (risk === 0) return "";
    const reward = tp - entry;
    return String(Math.round((reward / risk) * 100) / 100);
  }, [entryPoint, slPoint, tpPoint]);

  const timeframeOptions = ensureOption(
    ["5m", "15m", "1h", "4h", "1D"],
    initial?.timeframe ?? undefined,
  );
  const tradeModeOptions = ensureOption(
    ["live", "demo"],
    initial?.tradeMode,
  );
  const tradePlatformOptions = ensureOption(
    ["Bybit", "Pepperstone"],
    initial?.tradePlatform ?? undefined,
  );
  const trendOptions = ensureOption(
    [
      "Strong Bull Trend",
      "Strong Bear Trend",
      "Weak Trend Channel",
      "Weak Bull Trend Channel",
      "Weak Bear Trend Channel",
      "Trading Range",
      "Breakout Mode",
    ],
    initial?.trendAssessment ?? undefined,
  );
  const marketPhaseOptions = ensureOption(
    [
      "Pullback",
      "Second Leg Pullback",
      "Breakout Follow-through",
      "Failed Breakout",
      "Exhaustion",
    ],
    initial?.marketPhase ?? undefined,
  );
  const setupTypeOptions = ensureOption(
    ["H2", "L2", "Wedge"],
    initial?.setupType ?? undefined,
  );

  const normalizeDateTimeInput = (value: string) => {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(trimmed)) {
      return `${trimmed}:00`;
    }
    return trimmed;
  };

  const toTimestampInput = (value: string) => normalizeDateTimeInput(value).replace(" ", "T");

  const onSubmit = async (data: TradeFormValues) => {
    const formData = new FormData();

    if (mode === "edit" && initial) {
      formData.append("id", String(initial.id));
    }

    formData.append("pnlAmount", data.pnlAmount);
    formData.append("symbol", data.symbol);
    formData.append("tradePlatform", data.tradePlatform);
    formData.append("direction", data.direction);
    formData.append("result", data.result);
    formData.append("tradeMode", data.tradeMode);
    formData.append("entryTime", toTimestampInput(data.entryTime));
    formData.append("exitTime", toTimestampInput(data.exitTime));
    formData.append("timeframe", data.timeframe ?? "");
    formData.append("trendAssessment", data.trendAssessment ?? "");
    formData.append("marketPhase", data.marketPhase ?? "");
    formData.append("setupType", data.setupType ?? "");
    formData.append("setupQuality", initial?.setupQuality ?? "");
    formData.append("entryType", data.entryType ?? "");
    formData.append("confidenceLevel", data.confidenceLevel ?? "");
    formData.append("entryPoint", data.entryPoint);
    formData.append("closingPoint", data.closingPoint);
    formData.append("slPoint", data.slPoint ?? "");
    formData.append("tpPoint", data.tpPoint ?? "");
    formData.append("actualRMultiple", computedActual);
    formData.append("plannedRMultiple", computedPlanned);
    formData.append("earlyExit", String(data.earlyExit));
    formData.append("entryReason", data.entryReason ?? "");
    formData.append("expectedScenario", data.entryReason ?? "");
    formData.append("screenshotUrl", data.screenshotUrl ?? "");

    try {
      const result = mode === "edit"
        ? await updateTrade(formData)
        : await createTrade(formData);

      if (!result?.ok) {
        toast.error(result?.error ?? "Save failed. Please try again.");
        return;
      }

      toast.success("Trade saved successfully.");
      setOpen(false);
      onSaved?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed. Please try again.");
    }
  };

  const onError = () => {
    toast.error("Please fill in all required fields");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>

        <DialogContent className="!w-[50vw] !max-w-none max-h-[90vh] flex flex-col" showCloseButton={false}>
          <DialogHeader>
            <div>
              <DialogTitle>{title}</DialogTitle>
            </div>
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm" aria-label="Close">
                Close
              </Button>
            </DialogClose>
          </DialogHeader>

          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={handleSubmit(onSubmit, onError)}
            noValidate
          >
            <div className="scrollbar-none -mr-4 min-h-0 flex-1 overflow-y-auto pr-4">
              <div className="flex flex-col gap-4">
                <FieldSet className="rounded-md border border-zinc-800/80 bg-zinc-950/40 px-4 pb-4 pt-3">
                  <FieldLegend className="bg-zinc-950/40 px-2 -ml-2 -mt-4 mb-2 w-fit">
                    Trade Details
                  </FieldLegend>
                    <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <Field>
                    <FieldLabel htmlFor="pnlAmount">PnL amount</FieldLabel>
                    <Controller
                      name="pnlAmount"
                      control={control}
                      render={({ field }) => (
                        <Input
                          id="pnlAmount"
                          type="number"
                          step="0.01"
                          className={controlClassName}
                          {...field}
                        />
                      )}
                    />
                    {errors.pnlAmount ? <FieldError>{errors.pnlAmount.message}</FieldError> : null}
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="symbol">Symbol</FieldLabel>
                    <Controller
                      name="symbol"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger
                            id="symbol"
                            className={selectTriggerClassName}
                            onBlur={field.onBlur}
                          >
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="XAUUSD">XAUUSD</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.symbol ? <FieldError>{errors.symbol.message}</FieldError> : null}
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="direction">Direction</FieldLabel>
                    <Controller
                      name="direction"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger
                            id="direction"
                            className={selectTriggerClassName}
                            onBlur={field.onBlur}
                          >
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="long">long</SelectItem>
                            <SelectItem value="short">short</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.direction ? <FieldError>{errors.direction.message}</FieldError> : null}
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="result">Result</FieldLabel>
                    <Controller
                      name="result"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger
                            id="result"
                            className={selectTriggerClassName}
                            onBlur={field.onBlur}
                          >
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="win">win</SelectItem>
                            <SelectItem value="loss">loss</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.result ? <FieldError>{errors.result.message}</FieldError> : null}
                  </Field>
                  <Field className="md:col-span-2">
                    <FieldLabel htmlFor="entry-time">Entry time</FieldLabel>
                    <Controller
                      name="entryTime"
                      control={control}
                      render={({ field }) => (
                        <Input
                          id="entry-time"
                          type="text"
                          placeholder="YYYY-MM-DD HH:mm:ss"
                          className={controlClassName}
                          {...field}
                        />
                      )}
                    />
                    {errors.entryTime ? <FieldError>{errors.entryTime.message}</FieldError> : null}
                  </Field>
                  <Field className="md:col-span-2">
                    <FieldLabel htmlFor="exit-time">Exit time</FieldLabel>
                    <Controller
                      name="exitTime"
                      control={control}
                      render={({ field }) => (
                        <Input
                          id="exit-time"
                          type="text"
                          placeholder="YYYY-MM-DD HH:mm:ss"
                          className={controlClassName}
                          {...field}
                        />
                      )}
                    />
                    {errors.exitTime ? <FieldError>{errors.exitTime.message}</FieldError> : null}
                  </Field>
                  <Field className="md:col-span-2">
                    <FieldLabel htmlFor="tradePlatform">Trade platform</FieldLabel>
                    <Controller
                      name="tradePlatform"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger
                            id="tradePlatform"
                            className={selectTriggerClassName}
                            onBlur={field.onBlur}
                          >
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {tradePlatformOptions.map((v) => (
                              <SelectItem key={v} value={v}>
                                {v}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.tradePlatform ? (
                      <FieldError>{errors.tradePlatform.message}</FieldError>
                    ) : null}
                  </Field>
                  <Field className="md:col-span-2">
                    <FieldLabel htmlFor="tradeMode">Trade mode</FieldLabel>
                    <Controller
                      name="tradeMode"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger
                            id="tradeMode"
                            className={selectTriggerClassName}
                            onBlur={field.onBlur}
                          >
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {tradeModeOptions.map((v) => (
                              <SelectItem key={v} value={v}>
                                {v}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.tradeMode ? <FieldError>{errors.tradeMode.message}</FieldError> : null}
                  </Field>
                  </FieldGroup>
              </FieldSet>
              <FieldSet className="rounded-md border border-zinc-800/80 bg-zinc-950/40 px-4 pb-4 pt-3">
                <FieldLegend className="bg-zinc-950/40 px-2 -ml-2 -mt-4 mb-2 w-fit">
                  Context
                </FieldLegend>
                  <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Field>
                    <FieldLabel htmlFor="timeframe">Timeframe</FieldLabel>
                    <Controller
                      name="timeframe"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger
                            id="timeframe"
                            className={selectTriggerClassName}
                            onBlur={field.onBlur}
                          >
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {timeframeOptions.map((v) => (
                              <SelectItem key={v} value={v}>
                                {v}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.timeframe ? <FieldError>{errors.timeframe.message}</FieldError> : null}
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="trendAssessment">Trend assessment</FieldLabel>
                    <Controller
                      name="trendAssessment"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger
                            id="trendAssessment"
                            className={selectTriggerClassName}
                            onBlur={field.onBlur}
                          >
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {trendOptions.map((v) => (
                              <SelectItem key={v} value={v}>
                                {v}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.trendAssessment ? (
                      <FieldError>{errors.trendAssessment.message}</FieldError>
                    ) : null}
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="marketPhase">Market phase</FieldLabel>
                    <Controller
                      name="marketPhase"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger
                            id="marketPhase"
                            className={selectTriggerClassName}
                            onBlur={field.onBlur}
                          >
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {marketPhaseOptions.map((v) => (
                              <SelectItem key={v} value={v}>
                                {v}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.marketPhase ? <FieldError>{errors.marketPhase.message}</FieldError> : null}
                  </Field>
                  </FieldGroup>
              </FieldSet>

              <FieldSet className="rounded-md border border-zinc-800/80 bg-zinc-950/40 px-4 pb-4 pt-3">
                <FieldLegend className="bg-zinc-950/40 px-2 -ml-2 -mt-4 mb-2 w-fit">
                  Setup
                </FieldLegend>
                  <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Field>
                    <FieldLabel htmlFor="setupType">Setup type</FieldLabel>
                    <Controller
                      name="setupType"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger
                            id="setupType"
                            className={selectTriggerClassName}
                            onBlur={field.onBlur}
                          >
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {setupTypeOptions.map((v) => (
                              <SelectItem key={v} value={v}>
                                {v}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.setupType ? <FieldError>{errors.setupType.message}</FieldError> : null}
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="entryType">Entry type</FieldLabel>
                    <Controller
                      name="entryType"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger
                            id="entryType"
                            className={selectTriggerClassName}
                            onBlur={field.onBlur}
                          >
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="market">market</SelectItem>
                            <SelectItem value="limit">limit</SelectItem>
                            <SelectItem value="stop">stop</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.entryType ? <FieldError>{errors.entryType.message}</FieldError> : null}
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="confidenceLevel">Confidence (1–5)</FieldLabel>
                    <Controller
                      name="confidenceLevel"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger
                            id="confidenceLevel"
                            className={selectTriggerClassName}
                            onBlur={field.onBlur}
                          >
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="2">2</SelectItem>
                            <SelectItem value="3">3</SelectItem>
                            <SelectItem value="4">4</SelectItem>
                            <SelectItem value="5">5</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.confidenceLevel ? (
                      <FieldError>{errors.confidenceLevel.message}</FieldError>
                    ) : null}
                  </Field>
                  </FieldGroup>
              </FieldSet>

              <FieldSet className="rounded-md border border-zinc-800/80 bg-zinc-950/40 px-4 pb-4 pt-3">
                <FieldLegend className="bg-zinc-950/40 px-2 -ml-2 -mt-4 mb-2 w-fit">
                  Risk & Management
                </FieldLegend>
                  <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Field>
                    <FieldLabel htmlFor="entryPoint">Entry point</FieldLabel>
                    <Controller
                      name="entryPoint"
                      control={control}
                      render={({ field }) => (
                        <Input
                          id="entryPoint"
                          type="number"
                          step="0.01"
                          className={controlClassName}
                          {...field}
                        />
                      )}
                    />
                    {errors.entryPoint ? <FieldError>{errors.entryPoint.message}</FieldError> : null}
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="closingPoint">Closing point</FieldLabel>
                    <Controller
                      name="closingPoint"
                      control={control}
                      render={({ field }) => (
                        <Input
                          id="closingPoint"
                          type="number"
                          step="0.01"
                          className={controlClassName}
                          {...field}
                        />
                      )}
                    />
                    {errors.closingPoint ? (
                      <FieldError>{errors.closingPoint.message}</FieldError>
                    ) : null}
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="slPoint">SL point</FieldLabel>
                    <Controller
                      name="slPoint"
                      control={control}
                      render={({ field }) => (
                        <Input
                          id="slPoint"
                          type="number"
                          step="0.01"
                          className={controlClassName}
                          {...field}
                        />
                      )}
                    />
                    {errors.slPoint ? <FieldError>{errors.slPoint.message}</FieldError> : null}
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="tpPoint">TP point</FieldLabel>
                    <Controller
                      name="tpPoint"
                      control={control}
                      render={({ field }) => (
                        <Input
                          id="tpPoint"
                          type="number"
                          step="0.01"
                          className={controlClassName}
                          {...field}
                        />
                      )}
                    />
                    {errors.tpPoint ? <FieldError>{errors.tpPoint.message}</FieldError> : null}
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="actualRMultipleDisplay">Actual R multiple</FieldLabel>
                    <Input
                      id="actualRMultipleDisplay"
                      type="text"
                      className={controlClassName}
                      value={computedActual ? `${computedActual}R` : ""}
                      placeholder="Auto"
                      readOnly
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="plannedRMultipleDisplay">Planned R multiple</FieldLabel>
                    <Input
                      id="plannedRMultipleDisplay"
                      type="text"
                      className={controlClassName}
                      value={computedPlanned ? `${computedPlanned}R` : ""}
                      placeholder="Auto"
                      readOnly
                    />
                  </Field>
                  <Field className="md:col-span-3">
                    <Controller
                      name="earlyExit"
                      control={control}
                      render={({ field }) => (
                        <div className="flex items-center gap-2">
                          <input
                            id="early-exit"
                            type="checkbox"
                            className="h-4 w-4 rounded border border-zinc-700 bg-transparent text-emerald-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
                            checked={field.value}
                            onChange={(event) => field.onChange(event.target.checked)}
                            onBlur={field.onBlur}
                          />
                          <label htmlFor="early-exit" className="text-xs text-zinc-200">
                            Early exit
                          </label>
                        </div>
                      )}
                    />
                  </Field>
                  </FieldGroup>
              </FieldSet>

              <FieldSet className="rounded-md border border-zinc-800/80 bg-zinc-950/40 px-4 pb-4 pt-3">
                <FieldLegend className="bg-zinc-950/40 px-2 -ml-2 -mt-4 mb-2 w-fit">
                  Post-trade Review
                </FieldLegend>
                  <FieldGroup className="grid grid-cols-1 gap-4">
                  <Field>
                    <Controller
                      name="entryReason"
                      control={control}
                      render={({ field }) => (
                        <Textarea
                          id="entryReason"
                          className="min-h-32"
                          {...field}
                        />
                      )}
                    />
                    {errors.entryReason ? <FieldError>{errors.entryReason.message}</FieldError> : null}
                  </Field>
                  </FieldGroup>
              </FieldSet>

	              <FieldSet className="rounded-md border border-zinc-800/80 bg-zinc-950/40 px-4 pb-4 pt-3">
	                <FieldLegend className="bg-zinc-950/40 px-2 -ml-2 -mt-4 mb-2 w-fit">
	                  Screenshot
	                </FieldLegend>
	                  <FieldGroup>
	                  <Field>
	                    <FieldLabel htmlFor={screenshotInputId}>Upload screenshot</FieldLabel>
	                    <input
	                      id={screenshotInputId}
                        ref={screenshotInputRef}
	                      type="file"
                        multiple
	                      accept="image/*"
	                      className="sr-only"
	                      onChange={(e) => {
	                        const files = Array.from(e.target.files ?? []);
	                        if (!files.length) return;
                          // Allow selecting the same file again after upload.
                          e.target.value = "";
	                        void handleScreenshotUpload(files);
	                      }}
	                    />
	                    <label
	                      htmlFor={screenshotInputId}
	                      className="flex min-h-20 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-zinc-800 bg-black/30 px-4 py-3 text-xs text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
	                    >
	                      <span className="text-sm font-medium text-zinc-200">
	                        {uploadingScreenshot
                            ? "Uploading..."
                            : screenshotUrls.length
                              ? "Click to add more images"
                              : "Click to upload images"}
	                      </span>
	                      <span>PNG, JPG, GIF — multiple upload supported</span>
	                    </label>
	                    <FieldDescription>
	                      {screenshotUrls.length
	                        ? `${screenshotUrls.length} image(s) uploaded successfully.`
	                        : "Preview appears after selecting images."}
	                    </FieldDescription>
                    {screenshotError ? (
                      <FieldError>{screenshotError}</FieldError>
                    ) : null}
	                    {screenshotUrls.length ? (
	                      <div className="mt-2 space-y-2">
                          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                            {screenshotUrls.map((url, index) => (
                              <div
                                key={`${url}-${index}`}
                                className="overflow-hidden rounded border border-zinc-800 bg-zinc-900/40"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={url}
                                  alt={`preview-${index + 1}`}
                                  className="h-24 w-full object-cover"
                                />
                                <div className="p-1">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-7 w-full text-xs"
                                    onClick={() => {
                                      const remaining = screenshotUrls.filter((_, i) => i !== index);
                                      setValue(
                                        "screenshotUrl",
                                        joinScreenshotUrls(remaining),
                                        {
                                          shouldDirty: true,
                                          shouldValidate: true,
                                        },
                                      );
                                    }}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
	                        <div className="flex items-center justify-end gap-2">
	                          <Button
	                            type="button"
	                            size="sm"
	                            variant="outline"
	                            onClick={() => {
	                              setValue("screenshotUrl", "", {
	                                shouldDirty: true,
	                                shouldValidate: true,
	                              });
	                              setScreenshotError(null);
	                              if (screenshotInputRef.current) {
	                                screenshotInputRef.current.value = "";
	                              }
	                            }}
	                          >
	                            Remove all images
	                          </Button>
	                        </div>
	                      </div>
	                    ) : null}
	                  </Field>
	                  </FieldGroup>
	              </FieldSet>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2 border-t border-zinc-800 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetAiDialog();
                  setAiDialogOpen(true);
                }}
              >
                Add image
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <LoaderIcon className="animate-spin" />}
                {submitLabel}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={aiDialogOpen}
        onOpenChange={(nextOpen) => {
          setAiDialogOpen(nextOpen);
          if (!nextOpen) {
            resetAiDialog();
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload trade image</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <input
                id="ai-image-upload"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setAiFile(file);
                  setAiError(null);
                }}
              />
              <label
                htmlFor="ai-image-upload"
                className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-zinc-800 bg-black/30 px-4 py-3 text-xs text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
              >
                <span className="text-sm font-medium text-zinc-200">
                  {aiFile ? "Image selected. Click to reselect." : "Click to upload a trade screenshot"}
                </span>
                <span>PNG / JPG / JPEG</span>
              </label>
              {aiPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={aiPreviewUrl}
                  alt="preview"
                  className="h-32 w-full rounded border border-zinc-800 object-cover"
                />
              ) : null}
              {aiError ? <p className="text-xs text-red-400">{aiError}</p> : null}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setAiDialogOpen(false);
                }}
                disabled={aiParsing}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleAiParse} disabled={!aiFile || aiParsing}>
                {aiParsing && <LoaderIcon className="animate-spin" />}
                Parse image
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function TradeCreateDialog({ onSaved }: { onSaved?: () => void } = {}) {
  return (
    <TradeFormDialog
      trigger={
        <Button type="button" size="sm">
          Add trade
        </Button>
      }
      title="Add a trade"
      submitLabel="Save"
      mode="create"
      onSaved={onSaved}
    />
  );
}

export function TradeEditDialog({
  trigger,
  trade,
  onSaved,
}: {
  trigger: React.ReactNode;
  trade: TradeEditable;
  onSaved?: () => void;
}) {
  return (
    <TradeFormDialog
      trigger={trigger}
      title={`Edit trade #${trade.id}`}
      submitLabel="Update"
      mode="edit"
      initial={trade}
      onSaved={onSaved}
    />
  );
}
