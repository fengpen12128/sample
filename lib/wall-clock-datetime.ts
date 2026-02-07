function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function formatWallClockYmdHms(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return [
    date.getUTCFullYear(),
    "-",
    pad2(date.getUTCMonth() + 1),
    "-",
    pad2(date.getUTCDate()),
    " ",
    pad2(date.getUTCHours()),
    ":",
    pad2(date.getUTCMinutes()),
    ":",
    pad2(date.getUTCSeconds()),
  ].join("");
}

export function formatWallClockYmd(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return [
    date.getUTCFullYear(),
    pad2(date.getUTCMonth() + 1),
    pad2(date.getUTCDate()),
  ].join("");
}

export function parseWallClockDateTime(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const match = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = match[4] ? Number(match[4]) : 0;
  const minute = match[5] ? Number(match[5]) : 0;
  const second = match[6] ? Number(match[6]) : 0;

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    !Number.isInteger(second)
  ) {
    return null;
  }

  const ms = Date.UTC(year, month - 1, day, hour, minute, second);
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date;
}

