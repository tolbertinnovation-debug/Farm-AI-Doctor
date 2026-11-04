import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../lib/auth.js";
import { getSql } from "../../../lib/db.js";
import { cleanText } from "../../../lib/validate.js";
import { isValidPhotoType, isValidPhotoSize } from "../../../lib/livestock.js";
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
  let signs = "";
  try {
    const form = await req.formData();
    file = form.get("photo");
    animalType = cleanText(typeof form.get("type") === "string" ? form.get("type") : "", 40);
    signs = cleanText(typeof form.get("signs") === "string" ? form.get("signs") : "", 1000);
  } catch {
    return NextResponse.json({ error: "Could not read the form. Try again." }, { status: 400 });
  }

  if (!animalType || animalType.length < 2) {
    return NextResponse.json({ error: "Pick the animal, like Goat." }, { status: 400 });
  }

  const hasPhoto = file && typeof file !== "string" && file.size > 0;
  if (!signs && !hasPhoto) {
    return NextResponse.json({ error: "Write the signs or add a photo." }, { status: 400 });
  }

  let dataUrl = "";
  if (hasPhoto) {
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
    let seen = "";
    if (hasPhoto) {
      const buf = Buffer.from(await file.arrayBuffer());
      const base64 = buf.toString("base64");
      const mime = file.type || "image/jpeg";
      dataUrl = "data:" + mime + ";base64," + base64;
      seen = await describeAnimalPhotoWithSpark(dataUrl, animalType);
    }

    const fullDescription = signs + (seen ? "\nPhoto shows: " + seen : "");
    const result = await diagnoseAnimalWithWonder(fullDescription || "No signs written.", animalType);

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