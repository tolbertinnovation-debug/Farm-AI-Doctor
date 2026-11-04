import { NextResponse } from "next/server";
import { getSql } from "../../../lib/db.js";
import { getCurrentUser } from "../../../lib/auth.js";
import { isValidAnimalType, isValidAnimalCount, cleanText } from "../../../lib/validate.js";

async function ensure(sql) {
  await sql`
CREATE TABLE IF NOT EXISTS animals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  details TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  try {
    const sql = getSql();
    await ensure(sql);
    const rows = await sql`SELECT id, type, count, details FROM animals WHERE user_id = ${Number(user.id)} ORDER BY created_at DESC LIMIT 50`;
    return NextResponse.json({ animals: rows });
  } catch (e) {
    return NextResponse.json({ error: "Could not load animals." }, { status: 500 });
  }
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  try {
    const body = await req.json();
    const type = cleanText(body.type || "", 40);
    const count = Number(body.count);
    const details = cleanText(body.details || "", 200);
    if (!isValidAnimalType(type)) {
      return NextResponse.json({ error: "Write animal type, like Goat." }, { status: 400 });
    }
    if (!isValidAnimalCount(count)) {
      return NextResponse.json({ error: "Write how many, like 5." }, { status: 400 });
    }
    const sql = getSql();
    await ensure(sql);
    const rows = await sql`INSERT INTO animals (user_id, type, count, details) VALUES (${Number(user.id)}, ${type}, ${count}, ${details}) RETURNING id, type, count, details`;
    return NextResponse.json({ animal: rows[0] });
  } catch (e) {
    return NextResponse.json({ error: "Could not save animal." }, { status: 500 });
  }
}