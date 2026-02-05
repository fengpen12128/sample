import { NextResponse } from "next/server";

import { parseTradeImageFromBuffer } from "@/lib/trade-image-parse";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  let file: File | null = null;
  try {
    const formData = await request.formData();
    const formFile = formData.get("file");
    if (formFile instanceof File) {
      file = formFile;
    }
  } catch {
    file = null;
  }

  if (!file) {
    return NextResponse.json({ error: "Missing image file" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const contentType = file.type || "image/png";

  try {
    const data = await parseTradeImageFromBuffer(buffer, contentType);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI parse failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
