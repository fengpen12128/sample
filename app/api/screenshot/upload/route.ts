import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function POST(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const originalName = searchParams.get("filename") ?? "screenshot";

  if (!request.body) {
    return NextResponse.json({ error: "Missing file body" }, { status: 400 });
  }

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const timestamp = now.getTime();
  const safeName = originalName.replace(/[^\w.\-]+/g, "_");
  const filename = `${yyyy}/${mm}/${dd}/${timestamp}-${safeName}`;

  const blob = await put(filename, request.body, {
    access: "public",
  });

  return NextResponse.json(blob);
}
