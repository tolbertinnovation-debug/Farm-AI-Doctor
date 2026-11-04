import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../lib/auth.js";
import { getSql } from "../../../lib/db.js";
import { cleanText } from "../../../lib/validate.js";
import { isValidPhotoType, isValidPhotoSize } from "../../../lib/cropdoctor.js";
import { describePhotoWithSpark, diagnoseWithWonder } from "../../../lib/meta.js";

async function ensureChecks(sql) {
  await sql`
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'farmer',
  is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;
  await sql`
CREATE TABLE IF NOT EXISTS checks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'crop',
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  let file = null;
  let cropName = "";
  try {
    const form = await req.formData();
    file = form.get("photo");
    const rawName = form.get("name");
    cropName = cleanText(typeof rawName === "string" ? rawName : "", 60);
  } catch {
    return NextResponse.json({ error: "Could not read the photo. Try again." }, { status: 400 });
  }

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Pick a leaf photo first." }, { status: 400 });
  }
  if (!isValidPhotoType(file.type)) {
    return NextResponse.json({ error: "Pick a photo (JPG or PNG)." }, { status: 400 });
  }
  if (!isValidPhotoSize(file.size)) {
    return NextResponse.json({ error: "Photo is too big. Pick one under 4 MB." }, { status: 400 });
  }

  if (!process.env.META_API_KEY) {
    return NextResponse.json({ error: "Missing META_API_KEY. Add it in .env.local, then try again." }, { status: 500 });
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const base64 = buf.toString("base64");
    const mime = file.type || "image/jpeg";
    const dataUrl = "data:" + mime + ";base64," + base64;

    const seen = await describePhotoWithSpark(dataUrl, cropName);
    const result = await diagnoseWithWonder(seen, cropName);

    let outlineNote = "";
    if (!process.env.REPLICATE_API_TOKEN) {
      outlineNote = "No outline photo (no REPLICATE key). Diagnosis still works.";
    } else {
      outlineNote = "Outline skipped for now. Diagnosis below.";
    }

    let checkId = null;
    try {
      const sql = getSql();
      await ensureChecks(sql);
      const title = (cropName ? cropName + " - " : "") + result.disease;
      const summary = ("Confidence " + result.confidence + ". " + result.treatment).slice(0, 500);
      const rows = await sql`INSERT INTO checks (user_id, kind, title, summary) VALUES (${Number(user.id)}, 'crop', ${title.slice(0, 200)}, ${summary}) RETURNING id`;
      if (rows.length > 0) checkId = rows[0].id;
    } catch {
      checkId = null;
    }

    return NextResponse.json({
      disease: result.disease,
      treatment: result.treatment,
      confidence: result.confidence,
      seen,
      outlineNote,
      checkId
    });
  } catch (e) {
    const msg = e && e.message ? e.message : "";
    if (msg.includes("META_API_KEY")) {
      return NextResponse.json({ error: msg }, { status: 500 });
    }
    return NextResponse.json({ error: "Could not diagnose the photo. Check internet and try again." }, { status: 500 });
  }
}