import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../lib/auth.js";
import { getSql } from "../../../lib/db.js";
import { cleanText } from "../../../lib/validate.js";
import { isValidPhotoType, isValidPhotoSize } from "../../../lib/cropdoctor.js";
import { describeAnimalPhotoWithSpark, diagnoseAnimalWithWonder } from "../../../lib/meta.js";

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

async function userExists(sql, userId) {
  const rows = await sql`SELECT id FROM users WHERE id = ${userId} LIMIT 1`;
  return rows.length > 0;
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const userId = Number(user.id);
  if (!Number.isInteger(userId)) {
    return NextResponse.json({ error: "Please sign out and sign in again." }, { status: 401 });
  }

  let file = null;
  let animalType = "";
  let description = "";
  try {
    const form = await req.formData();
    const rawAnimal = form.get("animalType");
    const rawDesc = form.get("description");
    animalType = cleanText(typeof rawAnimal === "string" ? rawAnimal : "", 40);
    description = cleanText(typeof rawDesc === "string" ? rawDesc : "", 1000);
    const f = form.get("photo");
    if (f && typeof f !== "string" && f.size > 0) file = f;
  } catch {
    return NextResponse.json({ error: "Could not read the form. Try again." }, { status: 400 });
  }

  if (animalType.length < 2) {
    return NextResponse.json({ error: "Write animal type, like Goat." }, { status: 400 });
  }
  if (!description && !file) {
    return NextResponse.json({ error: "Write signs or add a photo." }, { status: 400 });
  }
  if (file) {
    if (!isValidPhotoType(file.type)) {
      return NextResponse.json({ error: "Pick a photo (JPG or PNG)." }, { status: 400 });
    }
    if (!isValidPhotoSize(file.size)) {
      return NextResponse.json({ error: "Photo is too big. Pick one under 4 MB." }, { status: 400 });
    }
  }

  if (!process.env.META_API_KEY) {
    return NextResponse.json({ error: "Missing META_API_KEY. Add it in .env.local, then try again." }, { status: 500 });
  }

  try {
    let seen = description || "No signs written.";
    if (file) {
      const buf = Buffer.from(await file.arrayBuffer());
      const base64 = buf.toString("base64");
      const mime = file.type || "image/jpeg";
      const dataUrl = "data:" + mime + ";base64," + base64;
      const photoSeen = await describeAnimalPhotoWithSpark(dataUrl, animalType);
      seen = description ? photoSeen + " Farmer says: " + description : photoSeen;
    }

    const result = await diagnoseAnimalWithWonder(seen, animalType);

    let checkId = null;
    try {
      const sql = getSql();
      await ensureChecks(sql);
      const ok = await userExists(sql, userId);
      if (!ok) {
        return NextResponse.json({ error: "Please sign out and sign in again." }, { status: 401 });
      }
      const title = (animalType + " - " + result.cause).slice(0, 200);
      const summary = ("Confidence " + result.confidence + ". " + result.firstAid).slice(0, 500);
      const rows = await sql`INSERT INTO checks (user_id, kind, title, summary) VALUES (${userId}, 'livestock', ${title}, ${summary}) RETURNING id`;
      if (rows.length > 0) checkId = rows[0].id;
    } catch {
      checkId = null;
    }

    return NextResponse.json({
      cause: result.cause,
      firstAid: result.firstAid,
      callVet: result.callVet,
      confidence: result.confidence,
      seen,
      checkId
    });
  } catch (e) {
    const msg = e && e.message ? e.message : "";
    if (msg.includes("META_API_KEY")) {
      return NextResponse.json({ error: msg }, { status: 500 });
    }
    return NextResponse.json({ error: "Could not check the animal. Check internet and try again." }, { status: 500 });
  }
}