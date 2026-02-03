// app/api/proxy-label/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Missing URL" }, { status: 400 });

  const parsed = new URL(url);
  const allowedHostnames = ["cdn.shipengine.com", "labels.shipengine.com", "api.shipengine.com"];
  if (!allowedHostnames.includes(parsed.hostname)) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 403 });
  }

  try {
    const upstream = await fetch(url, { method: "GET" });

    if (!upstream.ok) {
      return NextResponse.json({ error: "Failed to fetch PDF" }, { status: upstream.status });
    }

    const contentType = upstream.headers.get("Content-Type") || "";
    if (!contentType.includes("pdf")) {
      return NextResponse.json({ error: "Only PDFs allowed" }, { status: 415 });
    }

    const buffer = await upstream.arrayBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Proxy error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
