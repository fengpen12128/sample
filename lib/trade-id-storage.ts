import { prisma } from "@/lib/prisma";

let ensurePromise: Promise<void> | null = null;

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

  if (column.data_type === "character varying") {
    return;
  }

  if (
    column.data_type === "integer" ||
    column.data_type === "bigint" ||
    column.data_type === "smallint"
  ) {
    try {
      await prisma.$executeRawUnsafe(
        'ALTER TABLE "Trade" ALTER COLUMN "id" TYPE VARCHAR(15) USING "id"::text',
      );
    } catch {
      // Another instance may have migrated concurrently; re-check below.
    }

    await prisma.$executeRawUnsafe('ALTER TABLE "Trade" ALTER COLUMN "id" DROP DEFAULT');
    return;
  }

  throw new Error(`Unsupported Trade.id column type: ${column.data_type}`);
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
