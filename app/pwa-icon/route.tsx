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
  const inset = isMaskable ? Math.round(size * 0.12) : 0;
  const stroke = Math.max(2, Math.round(size * 0.0156));
  const chartStroke = Math.max(4, Math.round(size * 0.039));
  const chartPoint = Math.max(3, Math.round(size * 0.023));
  const bigPoint = Math.max(4, Math.round(size * 0.031));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0B0B0D",
          borderRadius: size * 0.1875,
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
            borderRadius: size * 0.1875,
            border: `${stroke}px solid #27272A`,
            background: "#111827",
            position: "relative",
          }}
        >
          <svg
            width="72%"
            height="72%"
            viewBox="0 0 512 512"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M96 372L174 294L228 334L302 228L356 268"
              stroke="#38BDF8"
              strokeWidth={chartStroke}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="302" cy="228" r={bigPoint} fill="#F97316" />
            <circle cx="174" cy="294" r={chartPoint} fill="#22C55E" />
            <circle cx="356" cy="268" r={chartPoint} fill="#22C55E" />
          </svg>
        </div>
      </div>
    ),
    {
      width: size,
      height: size,
    },
  );
}
