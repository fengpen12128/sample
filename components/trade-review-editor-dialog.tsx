"use client";

import * as React from "react";

import { ChevronLeftIcon, ChevronRightIcon, LoaderIcon } from "lucide-react";
import { toast } from "sonner";

import { updateTradeReview } from "@/app/action";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { splitScreenshotUrls } from "@/lib/screenshot-urls";

function offsetIndex(current: number, total: number, offset: number) {
  if (total <= 0) return 0;
  const next = (current + offset) % total;
  return next < 0 ? next + total : next;
}

export function TradeReviewEditorDialog({
  tradeId,
  screenshotUrl,
  initialReview,
  trigger,
  onSaved,
}: {
  tradeId: string;
  screenshotUrl: string | null;
  initialReview: string | null;
  trigger: React.ReactNode;
  onSaved?: (payload: { id: string; entryReason: string | null }) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState(initialReview ?? "");
  const [submitting, setSubmitting] = React.useState(false);
  const [imageIndex, setImageIndex] = React.useState(0);
  const screenshotUrls = React.useMemo(
    () => splitScreenshotUrls(screenshotUrl),
    [screenshotUrl],
  );
  const hasManyImages = screenshotUrls.length > 1;
  const currentScreenshot = screenshotUrls[imageIndex] ?? screenshotUrls[0] ?? null;
  const screenshotKey = React.useMemo(
    () => screenshotUrls.join(","),
    [screenshotUrls],
  );

  React.useEffect(() => {
    if (open) setValue(initialReview ?? "");
  }, [open, initialReview]);

  React.useEffect(() => {
    if (!open) return;
    setImageIndex(0);
  }, [open, screenshotKey]);

  const onSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("id", String(tradeId));
      formData.append("entryReason", value);

      const result = await updateTradeReview(formData);
      if (!result?.ok) {
        toast.error(result?.error ?? "Save failed. Please try again.");
        return;
      }

      const normalized = value.trim();
      const entryReason = normalized ? normalized : null;
      toast.success("Review updated.");
      setOpen(false);
      onSaved?.({ id: tradeId, entryReason });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent
        showCloseButton={false}
        className="fixed !inset-0 !left-0 !top-0 h-[100svh] w-[100vw] !max-w-none sm:!max-w-none !translate-x-0 !translate-y-0 rounded-none bg-transparent p-0 ring-0 gap-0 overflow-hidden"
        overlayClassName="bg-black/30 supports-backdrop-filter:backdrop-blur-2xl supports-backdrop-filter:saturate-150"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{`Edit review: Trade #${tradeId}`}</DialogTitle>
        </DialogHeader>

        <LiquidGlass className="h-full w-full rounded-none">
          <div className="flex h-full w-full">
            <div className="relative flex h-full basis-4/5 items-center justify-center bg-black/20 p-4">
              {currentScreenshot ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentScreenshot}
                  alt={`Trade ${tradeId} screenshot`}
                  className="h-full w-full rounded-md border border-white/10 bg-black/30 object-contain"
                />
              ) : (
                <div className="text-xs text-zinc-400">No screenshot</div>
              )}
              {hasManyImages ? (
                <>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="secondary"
                    className="absolute left-6 top-1/2 -translate-y-1/2"
                    onClick={() =>
                      setImageIndex((prev) =>
                        offsetIndex(prev, screenshotUrls.length, -1),
                      )
                    }
                    aria-label="Previous screenshot"
                  >
                    <ChevronLeftIcon className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="secondary"
                    className="absolute right-6 top-1/2 -translate-y-1/2"
                    onClick={() =>
                      setImageIndex((prev) =>
                        offsetIndex(prev, screenshotUrls.length, 1),
                      )
                    }
                    aria-label="Next screenshot"
                  >
                    <ChevronRightIcon className="size-4" />
                  </Button>
                  <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded bg-black/55 px-2 py-1 text-[11px] text-zinc-100">
                    {imageIndex + 1} / {screenshotUrls.length}
                  </div>
                </>
              ) : null}
            </div>

            <div className="flex h-full basis-1/5 flex-col gap-3 border-l border-zinc-800 bg-zinc-950/60 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs text-zinc-400">Post-trade Review</div>
                  <div className="truncate text-sm font-medium text-zinc-100">{`Trade #${tradeId}`}</div>
                </div>
                <DialogClose asChild>
                  <Button type="button" size="sm" variant="ghost">
                    Close
                  </Button>
                </DialogClose>
              </div>

              <Textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Write your post-trade review..."
                className="min-h-0 flex-1 resize-none"
              />

              <div className="flex items-center justify-end gap-2">
                <DialogClose asChild>
                  <Button type="button" size="sm" variant="outline" disabled={submitting}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="button" size="sm" onClick={() => void onSubmit()} disabled={submitting}>
                  {submitting ? <LoaderIcon className="animate-spin" /> : null}
                  Submit
                </Button>
              </div>
            </div>
          </div>
        </LiquidGlass>
      </DialogContent>
    </Dialog>
  );
}
