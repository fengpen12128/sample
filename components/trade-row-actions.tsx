"use client";

import * as React from "react";

import ReactMarkdown from "react-markdown";

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
                  <h3 className="text-base font-semibold text-zinc-200">
                    Rendered Preview
                  </h3>
                  <div className="rounded-md border border-zinc-800 bg-black/30 p-4">
                    <div className="prose prose-invert max-w-none">
                      <ReactMarkdown>{markdown}</ReactMarkdown>
                    </div>
                  </div>
                </section>
                <section className="space-y-3">
                  <h3 className="text-base font-semibold text-zinc-200">
                    Markdown Text
                  </h3>
                  <pre className="whitespace-pre-wrap rounded-md border border-zinc-800 bg-black/30 p-4 text-xs text-zinc-100">
                    {markdown}
                  </pre>
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

