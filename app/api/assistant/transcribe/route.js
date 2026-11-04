import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth.js";

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  let file = null;
  try {
    const form = await req.formData();
    file = form.get("audio");
  } catch {
    return NextResponse.json({ error: "Could not read voice. Try again." }, { status: 400 });
  }
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Record your voice first." }, { status: 400 });
  }
  if (!process.env.META_API_KEY) {
    return NextResponse.json({ error: "Missing META_API_KEY. Add it in .env.local, then try again." }, { status: 500 });
  }
  try {
    const fd = new FormData();
    fd.append("request", JSON.stringify({ model: "muse-voice-transcribe-1.0", audioEncoding: "WAV" }));
    fd.append("audio", file, "audio.wav");
    const res = await fetch("https://api.meta.ai/v1/asr/transcribe", {
      method: "POST",
      headers: { Authorization: "Bearer " + process.env.META_API_KEY },
      body: fd
    });
    if (!res.ok) {
      let extra = "";
      try { extra = await res.text(); } catch {}
      throw new Error("Voice service failed (" + res.status + "). " + String(extra).slice(0, 200));
    }
    const data = await res.json();
    const transcript = String(data.transcript || data.text || "").trim();
    return NextResponse.json({ transcript });
  } catch (e) {
    return NextResponse.json({ error: "Could not hear you. Try again." }, { status: 500 });
  }
}