import { NextResponse } from "next/server";

import { reindexTradeIdsToFiveDigits } from "@/lib/trade-id-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const updated = await reindexTradeIdsToFiveDigits();

  return NextResponse.json({
    ok: true,
    updated,
    message:
      updated > 0
        ? `Reindexed ${updated} rows.`
        : "IDs already use BIGINT sequence starting from 10000.",
  });
}
