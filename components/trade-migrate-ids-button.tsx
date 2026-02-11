"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type MigrateResponse = {
  ok: boolean;
  updated?: number;
  message?: string;
  error?: string;
};

export function TradeMigrateIdsButton() {
  const router = useRouter();
  const [running, setRunning] = React.useState(false);

  const handleMigrate = async () => {
    if (running) return;

    const confirmed = window.confirm(
      "This will rewrite all existing trade IDs. Continue?",
    );
    if (!confirmed) return;

    setRunning(true);
    const loadingToast = toast.loading("Migrating trade IDs...");
    try {
      const response = await fetch("/api/trades/migrate-ids", {
        method: "POST",
      });
      const result = (await response.json()) as MigrateResponse;

      if (!response.ok || !result.ok) {
        toast.error(result.error ?? result.message ?? "ID migration failed.");
        return;
      }

      const updated = result.updated ?? 0;
      toast.success(
        updated > 0
          ? `ID migration completed. Updated ${updated} records.`
          : result.message ?? "No records were updated.",
      );
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ID migration failed.");
    } finally {
      toast.dismiss(loadingToast);
      setRunning(false);
    }
  };

  return (
    <Button type="button" size="sm" variant="outline" onClick={() => void handleMigrate()} disabled={running}>
      {running ? "Migrating..." : "Migrate IDs"}
    </Button>
  );
}
