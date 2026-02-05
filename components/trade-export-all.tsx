"use client";

import * as React from "react";
import { format } from "date-fns";
import JSZip from "jszip";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  buildExportFileName,
  buildTradeMarkdown,
  sanitizeFileSegment,
  type TradeExportable,
} from "@/lib/trade-export";

type TradeExportItem = TradeExportable;

export function TradeExportAllButton({ trades }: { trades: TradeExportItem[] }) {
  const [exporting, setExporting] = React.useState(false);

  const handleExport = async () => {
    if (!trades.length) {
      toast.info("No data to export.");
      return;
    }

    setExporting(true);
    try {
      const zip = new JSZip();
      const imagesFolder = zip.folder("images");
      if (!imagesFolder) {
        throw new Error("Unable to create images folder.");
      }

      for (const trade of trades) {
        let imagePath = "";
        if (trade.screenshotUrl) {
          try {
            const { blob, filename } = await downloadImage(
              trade.screenshotUrl,
              trade.id,
              trade.symbol,
            );
            imagesFolder.file(filename, blob);
            imagePath = `images/${filename}`;
          } catch (error) {
            toast.error(`Screenshot download failed: #${trade.id}`);
          }
        }

        const markdown = buildTradeMarkdown(trade, {
          imagePath,
        });
        zip.file(buildExportFileName(trade), markdown);
      }

      const archive = await zip.generateAsync({ type: "blob" });
      const archiveName = `trades-${format(new Date(), "yyyyMMdd-HHmmss")}.zip`;
      downloadBlob(archive, archiveName);
      toast.success("Export complete.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button type="button" size="sm" onClick={handleExport} disabled={exporting}>
      {exporting ? "Exporting..." : "Export All"}
    </Button>
  );
}

async function downloadImage(url: string, id: number, symbol: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }

  const blob = await response.blob();
  const extension =
    resolveImageExtension(url, response.headers.get("content-type")) ?? "bin";
  const safeSymbol = symbol ? sanitizeFileSegment(symbol) : "trade";
  const filename = `trade-${id}-${safeSymbol}.${extension}`;

  return { blob, filename };
}

function resolveImageExtension(url: string, contentType: string | null) {
  try {
    const pathname = new URL(url).pathname;
    const lastSegment = pathname.split("/").pop() || "";
    const extFromUrl = lastSegment.includes(".")
      ? lastSegment.split(".").pop()
      : "";
    if (extFromUrl && extFromUrl.length <= 5) return extFromUrl.toLowerCase();
  } catch {
    // ignore url parsing errors
  }

  if (!contentType) return "";
  if (contentType.includes("image/jpeg")) return "jpg";
  if (contentType.includes("image/png")) return "png";
  if (contentType.includes("image/webp")) return "webp";
  if (contentType.includes("image/gif")) return "gif";
  if (contentType.includes("image/svg")) return "svg";
  return "";
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
