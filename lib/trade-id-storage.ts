import { prisma } from "@/lib/prisma";

let ensurePromise: Promise<void> | null = null;
const TRADE_ID_START = 10000;

async function doEnsureTradeIdStorage() {
  const rows = await prisma.$queryRaw<
    Array<{ data_type: string; character_maximum_length: number | null }>
  >`
    SELECT data_type, character_maximum_length
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Trade'
      AND column_name = 'id'
    LIMIT 1
  `;

  const column = rows[0];
  if (!column) return;

  if (column.data_type === "character varying" || column.data_type === "integer" || column.data_type === "smallint") {
    try {
      await prisma.$executeRawUnsafe(
        'ALTER TABLE "Trade" ALTER COLUMN "id" TYPE BIGINT USING "id"::bigint',
      );
    } catch {
      // Another instance may have migrated concurrently.
    }
  } else if (column.data_type !== "bigint") {
    throw new Error(`Unsupported Trade.id column type: ${column.data_type}`);
  }

  await prisma.$executeRawUnsafe(
    `CREATE SEQUENCE IF NOT EXISTS "Trade_id_seq" AS BIGINT START WITH ${TRADE_ID_START} INCREMENT BY 1`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Trade" ALTER COLUMN "id" SET DEFAULT nextval('"Trade_id_seq"')`,
  );
  await prisma.$executeRawUnsafe(
    `SELECT setval('"Trade_id_seq"', GREATEST(COALESCE((SELECT MAX("id") FROM "Trade"), ${TRADE_ID_START - 1}) + 1, ${TRADE_ID_START}), false)`,
  );
}

export async function ensureTradeIdStorage() {
  if (!ensurePromise) {
    ensurePromise = doEnsureTradeIdStorage().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }
  await ensurePromise;
}

export async function reindexTradeIdsToFiveDigits() {
  await ensureTradeIdStorage();

  const trades = await prisma.trade.findMany({
    orderBy: [{ entryTime: "asc" }, { id: "asc" }],
    select: { id: true },
  });

  if (!trades.length) return 0;

  let alreadyReindexed = true;
  for (let i = 0; i < trades.length; i += 1) {
    if (trades[i].id !== BigInt(TRADE_ID_START + i)) {
      alreadyReindexed = false;
      break;
    }
  }
  if (alreadyReindexed) return 0;

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < trades.length; i += 1) {
      const temporaryId = BigInt(-(i + 1));
      await tx.trade.update({
        where: { id: trades[i].id },
        data: { id: temporaryId },
      });
    }

    for (let i = 0; i < trades.length; i += 1) {
      const temporaryId = BigInt(-(i + 1));
      const finalId = BigInt(TRADE_ID_START + i);
      await tx.trade.update({
        where: { id: temporaryId },
        data: { id: finalId },
      });
    }
  });

  await prisma.$executeRawUnsafe(
    `SELECT setval('"Trade_id_seq"', ${TRADE_ID_START + trades.length}, false)`,
  );

  return trades.length;
}
