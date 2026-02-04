"use client";

import * as React from "react";
import type { PutBlobResult } from "@vercel/blob";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ChevronDownIcon, LoaderIcon } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { createTrade, updateTrade } from "@/app/action";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  direction: z.string().min(1, "Direction is required"),
  result: z.string().min(1, "Result is required"),
  entryDate: z.date({ error: "Entry date is required" }),
  entryTime: z.string().min(1, "Entry time is required"),
  exitDate: z.date({ error: "Exit date is required" }),
  exitTime: z.string().min(1, "Exit time is required"),
  timeframe: z.string().min(1, "Timeframe is required"),
  trendAssessment: z.string().min(1, "Trend assessment is required"),
  marketPhase: z.string().min(1, "Market phase is required"),
  setupType: z.string().min(1, "Setup type is required"),
  entryType: z.string().min(1, "Entry type is required"),
  confidenceLevel: z.string().min(1, "Confidence is required"),
  entryPoint: z.string().min(1, "Entry point is required"),
  closingPoint: z.string().min(1, "Closing point is required"),
  slPoint: z.string().min(1, "SL point is required"),
  tpPoint: z.string().min(1, "TP point is required"),
  entryReason: z.string().min(1, "Entry reason is required"),
  screenshotUrl: z.string().optional(),
});

type TradeFormValues = z.infer<typeof tradeFormSchema>;

export type TradeEditable = {
  id: number;
  timeframe: string;
  trendAssessment: string;
  marketPhase: string;
  symbol: string;
  direction: string;
  result: string;
  entryTime: Date;
  exitTime: Date;
  pnlAmount: number;
  setupType: string;
  setupQuality: string;
  entryType: string;
  entryPoint: number;
  closingPoint: number;
  slPoint: number;
  tpPoint: number;
  actualRMultiple: number;
  plannedRMultiple: number;
  entryReason: string;
  expectedScenario: string;
  confidenceLevel: number;
  screenshotUrl: string;
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
}: {
  trigger: React.ReactNode;
  title: string;
  submitLabel: string;
  mode: "create" | "edit";
  initial?: TradeEditable;
}) {
  const [open, setOpen] = React.useState(false);
  const [entryOpen, setEntryOpen] = React.useState(false);
  const [exitOpen, setExitOpen] = React.useState(false);
  const [uploadingScreenshot, setUploadingScreenshot] = React.useState(false);
  const [screenshotError, setScreenshotError] = React.useState<string | null>(null);

  const controlClassName = "h-10 text-sm";
  const selectTriggerClassName = "h-10 w-full text-sm";
  const dateButtonClassName = "h-10 w-full justify-between font-normal text-sm";

  const getDefaultValues = React.useCallback((): TradeFormValues => ({
    pnlAmount: initial?.pnlAmount !== undefined ? String(initial.pnlAmount) : "",
    symbol: initial?.symbol ?? "XAUUSD",
    direction: initial?.direction ?? "long",
    result: initial?.result ?? "win",
    entryDate: initial?.entryTime ? new Date(initial.entryTime) : undefined as unknown as Date,
    entryTime: initial?.entryTime ? format(new Date(initial.entryTime), "HH:mm:ss") : "00:00:00",
    exitDate: initial?.exitTime ? new Date(initial.exitTime) : undefined as unknown as Date,
    exitTime: initial?.exitTime ? format(new Date(initial.exitTime), "HH:mm:ss") : "00:00:00",
    timeframe: initial?.timeframe ?? "5m",
    trendAssessment: initial?.trendAssessment ?? "Weak Bull Trend Channel",
    marketPhase: initial?.marketPhase ?? "Pullback",
    setupType: initial?.setupType ?? "H2",
    entryType: initial?.entryType ?? "stop",
    confidenceLevel: String(initial?.confidenceLevel ?? 3),
    entryPoint: initial?.entryPoint !== undefined ? String(initial.entryPoint) : "",
    closingPoint: initial?.closingPoint !== undefined ? String(initial.closingPoint) : "",
    slPoint: initial?.slPoint !== undefined ? String(initial.slPoint) : "",
    tpPoint: initial?.tpPoint !== undefined ? String(initial.tpPoint) : "",
    entryReason: initial?.entryReason ?? "",
    screenshotUrl: initial?.screenshotUrl ?? "",
  }), [initial]);

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

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      reset(getDefaultValues());
      setScreenshotError(null);
      setUploadingScreenshot(false);
    }
  }, [open, reset, getDefaultValues]);

  const handleScreenshotUpload = async (file: File) => {
    setUploadingScreenshot(true);
    setScreenshotError(null);
    try {
      const response = await fetch(`/api/screenshot/upload?filename=${file.name}`, {
        method: "POST",
        body: file,
      });
      if (!response.ok) {
        throw new Error("Upload failed, please try again");
      }
      const blob = (await response.json()) as PutBlobResult;
      setValue("screenshotUrl", blob.url);
    } catch (error) {
      setScreenshotError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploadingScreenshot(false);
    }
  };

  const toNumber = (value: string) => {
    if (!value.trim()) return null;
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
    initial?.timeframe,
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
    initial?.trendAssessment,
  );
  const marketPhaseOptions = ensureOption(
    [
      "Pullback",
      "Second Leg Pullback",
      "Breakout Follow-through",
      "Failed Breakout",
      "Exhaustion",
    ],
    initial?.marketPhase,
  );
  const setupTypeOptions = ensureOption(
    ["H2", "L2", "Wedge"],
    initial?.setupType,
  );

  const onSubmit = async (data: TradeFormValues) => {
    const formData = new FormData();

    if (mode === "edit" && initial) {
      formData.append("id", String(initial.id));
    }

    formData.append("pnlAmount", data.pnlAmount);
    formData.append("symbol", data.symbol);
    formData.append("direction", data.direction);
    formData.append("result", data.result);
    formData.append("entryTime", `${format(data.entryDate, "yyyy-MM-dd")}T${data.entryTime}`);
    formData.append("exitTime", `${format(data.exitDate, "yyyy-MM-dd")}T${data.exitTime}`);
    formData.append("timeframe", data.timeframe);
    formData.append("trendAssessment", data.trendAssessment);
    formData.append("marketPhase", data.marketPhase);
    formData.append("setupType", data.setupType);
    formData.append("setupQuality", initial?.setupQuality ?? "acceptable");
    formData.append("entryType", data.entryType);
    formData.append("confidenceLevel", data.confidenceLevel);
    formData.append("entryPoint", data.entryPoint);
    formData.append("closingPoint", data.closingPoint);
    formData.append("slPoint", data.slPoint);
    formData.append("tpPoint", data.tpPoint);
    formData.append("actualRMultiple", computedActual);
    formData.append("plannedRMultiple", computedPlanned);
    formData.append("entryReason", data.entryReason);
    formData.append("expectedScenario", data.entryReason);
    formData.append("screenshotUrl", data.screenshotUrl ?? "");

    if (mode === "edit") {
      await updateTrade(formData);
    } else {
      await createTrade(formData);
    }

    setOpen(false);
  };

  const onError = () => {
    toast.error("Please fill in all required fields");
  };

  return (
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
              <FieldSet>
                <FieldLegend>Trade Details</FieldLegend>
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
                    <FieldLabel>Entry time</FieldLabel>
                    <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="entry-date">Date</FieldLabel>
                        <Controller
                          name="entryDate"
                          control={control}
                          render={({ field }) => (
                            <Popover open={entryOpen} onOpenChange={setEntryOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  id="entry-date"
                                  className={dateButtonClassName}
                                >
                                  {field.value ? format(field.value, "yyyy-MM-dd") : "Select date"}
                                  <ChevronDownIcon />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-auto overflow-hidden p-0"
                                align="start"
                              >
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  captionLayout="dropdown"
                                  defaultMonth={field.value}
                                  onSelect={(date) => {
                                    field.onChange(date);
                                    setEntryOpen(false);
                                  }}
                                />
                              </PopoverContent>
                            </Popover>
                          )}
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="entry-time">Time</FieldLabel>
                        <Controller
                          name="entryTime"
                          control={control}
                          render={({ field }) => (
                            <Input
                              type="time"
                              id="entry-time"
                              step="1"
                              className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                              {...field}
                            />
                          )}
                        />
                      </Field>
                    </FieldGroup>
                    {errors.entryDate ? <FieldError>{errors.entryDate.message}</FieldError> : null}
                    {errors.entryTime ? <FieldError>{errors.entryTime.message}</FieldError> : null}
                  </Field>
                  <Field className="md:col-span-2">
                    <FieldLabel>Exit time</FieldLabel>
                    <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="exit-date">Date</FieldLabel>
                        <Controller
                          name="exitDate"
                          control={control}
                          render={({ field }) => (
                            <Popover open={exitOpen} onOpenChange={setExitOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  id="exit-date"
                                  className={dateButtonClassName}
                                >
                                  {field.value ? format(field.value, "yyyy-MM-dd") : "Select date"}
                                  <ChevronDownIcon />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-auto overflow-hidden p-0"
                                align="start"
                              >
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  captionLayout="dropdown"
                                  defaultMonth={field.value}
                                  onSelect={(date) => {
                                    field.onChange(date);
                                    setExitOpen(false);
                                  }}
                                />
                              </PopoverContent>
                            </Popover>
                          )}
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="exit-time">Time</FieldLabel>
                        <Controller
                          name="exitTime"
                          control={control}
                          render={({ field }) => (
                            <Input
                              type="time"
                              id="exit-time"
                              step="1"
                              className={`bg-background appearance-none ${controlClassName} [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none`}
                              {...field}
                            />
                          )}
                        />
                      </Field>
                    </FieldGroup>
                    {errors.exitDate ? <FieldError>{errors.exitDate.message}</FieldError> : null}
                    {errors.exitTime ? <FieldError>{errors.exitTime.message}</FieldError> : null}
                  </Field>
                </FieldGroup>
              </FieldSet>
              <FieldSet>
                <FieldLegend>Context</FieldLegend>
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

              <FieldSet>
                <FieldLegend>Setup</FieldLegend>
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

              <FieldSet>
                <FieldLegend>Risk & Management</FieldLegend>
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
                </FieldGroup>
              </FieldSet>

              <FieldSet>
                <FieldLegend>Post-trade Review</FieldLegend>
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

              <FieldSet>
                <FieldLegend>Screenshot</FieldLegend>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="screenshot-upload">Upload screenshot</FieldLabel>
                    <input
                      id="screenshot-upload"
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        void handleScreenshotUpload(file);
                      }}
                    />
                    <label
                      htmlFor="screenshot-upload"
                      className="flex min-h-20 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-zinc-800 bg-black/30 px-4 py-3 text-xs text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
                    >
                      <span className="text-sm font-medium text-zinc-200">
                        {uploadingScreenshot ? "Uploading..." : "Click to upload image"}
                      </span>
                      <span>PNG, JPG, GIF — upload to Vercel Blob</span>
                    </label>
                    <FieldDescription>
                      {screenshot
                        ? "Image uploaded successfully."
                        : "Preview appears after selecting an image."}
                    </FieldDescription>
                    {screenshotError ? (
                      <FieldError>{screenshotError}</FieldError>
                    ) : null}
                    {screenshot ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={screenshot}
                        alt="preview"
                        className="mt-2 h-28 w-full rounded border border-zinc-800 object-cover"
                      />
                    ) : null}
                  </Field>
                </FieldGroup>
              </FieldSet>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2 border-t border-zinc-800 pt-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <LoaderIcon className="animate-spin" />}
              {submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TradeCreateDialog() {
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
    />
  );
}

export function TradeEditDialog({
  trigger,
  trade,
}: {
  trigger: React.ReactNode;
  trade: TradeEditable;
}) {
  return (
    <TradeFormDialog
      trigger={trigger}
      title={`Edit trade #${trade.id}`}
      submitLabel="Update"
      mode="edit"
      initial={trade}
    />
  );
}
