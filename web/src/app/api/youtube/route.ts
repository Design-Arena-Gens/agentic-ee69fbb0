import { NextRequest } from "next/server";
import ytdl from "ytdl-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  if (!url || !ytdl.validateURL(url)) {
    return new Response("Invalid YouTube URL", { status: 400 });
  }

  try {
    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, { quality: "highestaudio", filter: "audioonly" });
    if (!format || !format.url) throw new Error("No audio format available");

    const res = await fetch(format.url);
    if (!res.ok || !res.body) throw new Error("Failed to fetch audio stream");

    const headers = new Headers();
    headers.set("Content-Type", "audio/mp4");
    headers.set("Cache-Control", "no-store");

    return new Response(res.body as any, { status: 200, headers });
  } catch (e: any) {
    return new Response("Failed to download audio", { status: 500 });
  }
}
