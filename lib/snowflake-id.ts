const CUSTOM_EPOCH_MS = Date.UTC(2025, 0, 1, 0, 0, 0, 0);
const TIMESTAMP_WIDTH = 12;
const NODE_WIDTH = 1;
const SEQUENCE_WIDTH = 2;
const SEQUENCE_MAX = 10 ** SEQUENCE_WIDTH - 1;

let lastTimestamp = -1;
let sequence = 0;

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function resolveNodeId() {
  const raw = process.env.SNOWFLAKE_NODE_ID ?? "0";
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 9) {
    throw new Error("SNOWFLAKE_NODE_ID must be an integer between 0 and 9");
  }
  return String(n);
}

async function waitNextMillisecond(current: number) {
  let now = Date.now();
  while (now <= current) {
    await sleep(1);
    now = Date.now();
  }
  return now;
}

export async function generateSnowflakeId() {
  const node = resolveNodeId().padStart(NODE_WIDTH, "0");
  let timestamp = Date.now() - CUSTOM_EPOCH_MS;
  if (timestamp < 0) {
    throw new Error("System clock is before custom epoch");
  }

  if (timestamp < lastTimestamp) {
    // Clock drift backward: keep monotonicity by pinning to last timestamp.
    timestamp = lastTimestamp;
  }

  if (timestamp === lastTimestamp) {
    sequence += 1;
    if (sequence > SEQUENCE_MAX) {
      const nextNow = await waitNextMillisecond(lastTimestamp + CUSTOM_EPOCH_MS);
      timestamp = nextNow - CUSTOM_EPOCH_MS;
      sequence = 0;
    }
  } else {
    sequence = 0;
  }

  lastTimestamp = timestamp;
  const tsPart = String(timestamp).padStart(TIMESTAMP_WIDTH, "0");
  const seqPart = String(sequence).padStart(SEQUENCE_WIDTH, "0");
  return `${tsPart}${node}${seqPart}`;
}

export function isValidSnowflakeId(value: string) {
  return /^\d{15}$/.test(value);
}
