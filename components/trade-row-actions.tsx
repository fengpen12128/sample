"use client";

import * as React from "react";

import Markdown from "markdown-to-jsx";

import { deleteTrade } from "@/app/action";
import { TradeEditDialog, type TradeEditable } from "@/components/trade-create-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buildExportFileName, buildTradeMarkdown } from "@/lib/trade-export";

export function TradeRowActions({ trade }: { trade: TradeEditable }) {
  const deleteFormRef = React.useRef<HTMLFormElement>(null);
  const markdown = React.useMemo(() => buildTradeMarkdown(trade), [trade]);
  const pineLine = React.useMemo(() => buildPineLine(trade), [trade]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="sm" aria-label="Actions">
          ⋯
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <TradeEditDialog
          trade={trade}
          trigger={
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              Edit
            </DropdownMenuItem>
          }
        />

        <Dialog>
          <DialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              Preview
            </DropdownMenuItem>
          </DialogTrigger>
          <DialogContent className="!w-[60vw] !max-w-none max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Markdown Preview</DialogTitle>
            </DialogHeader>
            <div className="scrollbar-none -mr-4 flex-1 overflow-y-auto pr-4">
              <div className="flex flex-col gap-6 text-sm">
                <section className="space-y-3">
                  <div className="rounded-md border border-zinc-800 bg-black/30 p-4">
                    <div className="prose prose-invert max-w-none">
                      <Markdown
                        options={{
                          overrides: {
                            h1: { props: { className: "text-2xl font-semibold text-zinc-100" } },
                            h2: { props: { className: "mt-4 text-lg font-semibold text-zinc-100" } },
                            h3: { props: { className: "mt-3 text-base font-semibold text-zinc-100" } },
                            p: { props: { className: "text-sm text-zinc-200" } },
                            ul: { props: { className: "list-disc pl-5 text-sm text-zinc-200" } },
                            ol: { props: { className: "list-decimal pl-5 text-sm text-zinc-200" } },
                            li: { props: { className: "my-1" } },
                            strong: { props: { className: "font-semibold text-zinc-100" } },
                            em: { props: { className: "italic text-zinc-200" } },
                            a: { props: { className: "text-emerald-300 underline" } },
                            blockquote: {
                              props: {
                                className:
                                  "border-l-2 border-zinc-700 pl-3 text-sm text-zinc-300",
                              },
                            },
                            code: {
                              props: {
                                className:
                                  "rounded bg-zinc-900/70 px-1.5 py-0.5 text-xs text-zinc-100",
                              },
                            },
                          },
                        }}
                      >
                        {markdown}
                      </Markdown>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <DropdownMenuItem
          onSelect={() => {
            downloadMarkdown(markdown, buildExportFileName(trade));
          }}
        >
          Export
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <Dialog>
          <DialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              Script
            </DropdownMenuItem>
          </DialogTrigger>
          <DialogContent className="!w-[60vw] !max-w-none">
            <DialogHeader>
              <DialogTitle>Pine Script Line</DialogTitle>
            </DialogHeader>
            <div className="rounded-md border border-zinc-800 bg-black/30 p-4">
              <pre className="whitespace-pre-wrap text-xs text-zinc-100">
                {pineLine}
              </pre>
            </div>
          </DialogContent>
        </Dialog>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="text-red-400 focus:text-red-300"
          onSelect={(e) => {
            // Radix menu items can prevent default click behavior; submit explicitly.
            e.preventDefault();
            deleteFormRef.current?.requestSubmit();
          }}
        >
          Delete
        </DropdownMenuItem>

        {/* Hidden form for server action submission */}
        <form ref={deleteFormRef} action={deleteTrade} className="hidden">
          <input type="hidden" name="id" value={String(trade.id)} />
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function downloadMarkdown(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildPineLine(trade: TradeEditable) {
  const tIn = trade.entryTime instanceof Date ? trade.entryTime : new Date(trade.entryTime);
  const tOut = trade.exitTime instanceof Date ? trade.exitTime : new Date(trade.exitTime);

  return [
    "    add_trade(",
    [
      tIn.getFullYear(),
      tIn.getMonth() + 1,
      tIn.getDate(),
      tIn.getHours(),
      tIn.getMinutes(),
      tIn.getSeconds(),
      cleanNum(trade.entryPoint),
      cleanNum(trade.slPoint),
      cleanNum(trade.tpPoint),
      cleanNum(trade.closingPoint),
      tOut.getFullYear(),
      tOut.getMonth() + 1,
      tOut.getDate(),
      tOut.getHours(),
      tOut.getMinutes(),
      tOut.getSeconds(),
    ].join(", "),
    ")",
  ].join("");
}

function cleanNum(value: number | null | undefined) {
  if (value === null || value === undefined) return "0.0";
  return Number.isFinite(value) ? String(value) : "0.0";
}
