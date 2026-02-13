function normalizeUrl(value: string) {
  return value.trim();
}

export function splitScreenshotUrls(value: string | null | undefined) {
  if (!value) return [] as string[];
  return value
    .split(",")
    .map(normalizeUrl)
    .filter(Boolean);
}

export function joinScreenshotUrls(urls: Array<string | null | undefined>) {
  const deduped = new Set<string>();
  for (const url of urls) {
    const normalized = normalizeUrl(String(url ?? ""));
    if (!normalized) continue;
    deduped.add(normalized);
  }
  return Array.from(deduped).join(",");
}

export function mergeScreenshotUrls(
  existing: string | null | undefined,
  incoming: Array<string | null | undefined>,
) {
  const base = splitScreenshotUrls(existing);
  return joinScreenshotUrls([...base, ...incoming]);
}

export function firstScreenshotUrl(value: string | null | undefined) {
  const urls = splitScreenshotUrls(value);
  return urls[0] ?? null;
}
