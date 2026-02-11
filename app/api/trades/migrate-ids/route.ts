import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { generateSnowflakeId, isValidSnowflakeId } from "@/lib/snowflake-id";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.MIGRATE_TRADE_IDS_SECRET;
  if (!secret) return false;
  const token = request.headers.get("x-migrate-secret");
  return token === secret;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.trade.findMany({
    select: { id: true, entryTime: true },
  });

  existing.sort((a, b) => {
    const timeDiff = a.entryTime.getTime() - b.entryTime.getTime();
    if (timeDiff !== 0) return timeDiff;
    const aNum = Number(a.id);
    const bNum = Number(b.id);
    if (Number.isFinite(aNum) && Number.isFinite(bNum)) {
      return aNum - bNum;
    }
    return a.id.localeCompare(b.id);
  });

  if (!existing.length) {
    return NextResponse.json({ ok: true, updated: 0, message: "No data to migrate." });
  }

  const alreadyMigrated = existing.every((item) => isValidSnowflakeId(item.id));
  if (alreadyMigrated) {
    return NextResponse.json({
      ok: true,
      updated: 0,
      message: "All IDs are already 15-digit snowflake IDs.",
    });
  }

  const mapping: Array<{ oldId: string; newId: string }> = [];
  const generated = new Set<string>();

  for (const row of existing) {
    let nextId = await generateSnowflakeId();
    while (generated.has(nextId)) {
      nextId = await generateSnowflakeId();
    }
    generated.add(nextId);
    mapping.push({ oldId: row.id, newId: nextId });
  }

  await prisma.$transaction(async (tx) => {
    for (const item of mapping) {
      await tx.trade.update({
        where: { id: item.oldId },
        data: { id: item.newId },
      });
    }
  });

  return NextResponse.json({
    ok: true,
    updated: mapping.length,
    first: mapping[0] ?? null,
    last: mapping[mapping.length - 1] ?? null,
  });
}
