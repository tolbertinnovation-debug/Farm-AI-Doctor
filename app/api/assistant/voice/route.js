import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth.js";

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (!process.env.META_API_KEY) {
    return NextResponse.json({ error: "Missing META_API_KEY. Add it in .env.local." }, { status: 500 });
  }
  let file = null;
  try {
    const form = await req.formData();
    file = form.get("audio");
  } catch {
    return NextResponse.json({ error: "Could not read audio." }, { status: 400 });
  }
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Record voice first." }, { status: 400 });
  }
  try {
    const out = new FormData();
    out.append("request", JSON.stringify({ model: "muse-voice-transcribe-1.0", audioEncoding: "WAV" }));
    out.append("audio", file, "voice.wav");
    const res = await fetch("https://api.meta.ai/v1/asr/transcribe", {
      method: "POST",
      headers: { Authorization: "Bearer " + process.env.META_API_KEY },
      body: out
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return NextResponse.json({ error: "Voice failed (" + res.status + "). " + String(t).slice(0, 150) }, { status: 500 });
    }
    const data = await res.json();
    const transcript = data.transcript || data.text || "";
    if (!transcript) return NextResponse.json({ error: "No words heard. Try again." }, { status: 500 });
    return NextResponse.json({ transcript: String(transcript).slice(0, 2000) });
  } catch (e) {
    return NextResponse.json({ error: "No internet. Try again." }, { status: 500 });
  }
}