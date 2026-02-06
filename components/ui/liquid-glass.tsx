"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export function LiquidGlass({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("liquid-glass", className)} {...props}>
      <div className="liquid-glass__bg" aria-hidden />
      <div className="liquid-glass__shine" aria-hidden />
      <div className="liquid-glass__noise" aria-hidden />
      <div className="liquid-glass__content">{children}</div>
    </div>
  );
}

