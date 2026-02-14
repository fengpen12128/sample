import type { NextRequest } from "next/server";
import { ImageResponse } from "next/og";

export const runtime = "edge";

const ALLOWED_SIZES = new Set([180, 192, 512]);

function resolveSize(raw: string | null) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 512;
  return ALLOWED_SIZES.has(parsed) ? parsed : 512;
}

export function GET(request: NextRequest) {
  const size = resolveSize(request.nextUrl.searchParams.get("size"));
  const isMaskable = request.nextUrl.searchParams.get("maskable") === "1";
  const inset = isMaskable ? Math.round(size * 0.2) : Math.round(size * 0.12);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 20% 20%, #fb923c 0%, #f97316 34%, #1f2937 100%)",
          color: "#f9fafb",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          fontWeight: 700,
          fontSize: size * 0.28,
          letterSpacing: size * 0.02,
          lineHeight: 1,
          padding: inset,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: isMaskable ? size * 0.22 : size * 0.18,
            border: `${Math.max(2, Math.round(size * 0.015))}px solid rgba(255,255,255,0.35)`,
            background: "rgba(17, 24, 39, 0.42)",
          }}
        >
          TS
        </div>
      </div>
    ),
    {
      width: size,
      height: size,
    },
  );
}
