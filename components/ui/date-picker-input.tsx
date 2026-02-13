"use client";

import * as React from "react";
import { parseDate, type CalendarDate, type DateValue } from "@internationalized/date";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";
import {
  Button as AriaButton,
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  DateInput,
  DatePicker,
  DateSegment,
  Dialog,
  Group,
  Heading,
  I18nProvider,
  Popover,
} from "react-aria-components";

import { cn } from "@/lib/utils";

type DatePickerInputProps = {
  value: string;
  onChange: (value: string) => void;
  name?: string;
  className?: string;
  isDisabled?: boolean;
  ariaLabel?: string;
};

function parseDateOnly(value: string): CalendarDate | null {
  if (!value) return null;
  try {
    return parseDate(value);
  } catch {
    return null;
  }
}

function formatDateOnly(value: DateValue | null): string {
  if (!value) return "";
  const month = String(value.month).padStart(2, "0");
  const day = String(value.day).padStart(2, "0");
  return `${value.year}-${month}-${day}`;
}

export function DatePickerInput({
  value,
  onChange,
  name,
  className,
  isDisabled,
  ariaLabel = "Date",
}: DatePickerInputProps) {
  const dateValue = React.useMemo(() => parseDateOnly(value), [value]);

  return (
    <I18nProvider locale="en-US">
      <DatePicker
        aria-label={ariaLabel}
        value={dateValue}
        onChange={(next) => onChange(formatDateOnly(next))}
        isDisabled={isDisabled}
        granularity="day"
        className={cn("w-full", className)}
      >
        <Group className="flex h-8 items-center rounded-md border border-input bg-transparent pr-1 text-xs text-foreground shadow-xs transition-colors focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
          <DateInput className="flex min-w-0 flex-1 items-center px-2.5 text-xs text-foreground">
            {(segment) => (
              <DateSegment
                segment={segment}
                className={cn(
                  "rounded-sm px-0.5 tabular-nums outline-none data-[focus-visible]:bg-accent data-[focus-visible]:text-accent-foreground",
                  segment.type === "literal" ? "px-0 text-muted-foreground" : "text-foreground",
                  segment.isPlaceholder ? "text-muted-foreground" : null
                )}
              />
            )}
          </DateInput>
          {value ? (
            <AriaButton
              onPress={() => onChange("")}
              className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Clear date"
            >
              <XIcon className="size-3.5" />
            </AriaButton>
          ) : null}
          <AriaButton
            slot="trigger"
            className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Open calendar"
          >
            <CalendarIcon className="size-3.5" />
          </AriaButton>
        </Group>

        <Popover placement="bottom start" offset={6} className="z-50">
          <Dialog className="rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none">
            <Calendar className="w-[228px]">
              <header className="mb-2 flex items-center justify-between gap-1">
                <AriaButton
                  slot="previous"
                  className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Previous month"
                >
                  <ChevronLeftIcon className="size-4" />
                </AriaButton>
                <Heading className="text-xs font-medium text-foreground" />
                <AriaButton
                  slot="next"
                  className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Next month"
                >
                  <ChevronRightIcon className="size-4" />
                </AriaButton>
              </header>
              <CalendarGrid className="w-full border-collapse">
                <CalendarGridHeader>
                  {(day) => (
                    <CalendarHeaderCell className="py-1 text-center text-[11px] font-medium text-muted-foreground">
                      {day}
                    </CalendarHeaderCell>
                  )}
                </CalendarGridHeader>
                <CalendarGridBody>
                  {(date) => (
                    <CalendarCell
                      date={date}
                      className={({ isDisabled, isOutsideMonth, isSelected, isToday, isUnavailable }) =>
                        cn(
                          "size-8 rounded-md text-center text-xs leading-8 outline-none transition-colors data-[focus-visible]:ring-2 data-[focus-visible]:ring-ring/60",
                          isOutsideMonth ? "text-muted-foreground/45" : "text-foreground",
                          isDisabled || isUnavailable
                            ? "cursor-not-allowed text-muted-foreground/35"
                            : null,
                          !isDisabled && !isUnavailable && !isSelected
                            ? "hover:bg-accent hover:text-accent-foreground"
                            : null,
                          isSelected ? "bg-primary text-primary-foreground" : null,
                          isToday && !isSelected ? "ring-1 ring-border" : null
                        )
                      }
                    />
                  )}
                </CalendarGridBody>
              </CalendarGrid>
            </Calendar>
          </Dialog>
        </Popover>

        {name ? <input type="hidden" name={name} value={value} readOnly /> : null}
      </DatePicker>
    </I18nProvider>
  );
}
