import { NextResponse } from "next/server";
import { getSql } from "../../../lib/db.js";
import { getCurrentUser } from "../../../lib/auth.js";
import { isValidAnimalType, isValidAnimalCount, cleanText } from "../../../lib/validate.js";

async function ensure(sql) {
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
CREATE TABLE IF NOT EXISTS animals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  details TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;
}

async function userExists(sql, userId) {
  const rows = await sql`SELECT id FROM users WHERE id = ${userId} LIMIT 1`;
  return rows.length > 0;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  try {
    const sql = getSql();
    await ensure(sql);
    const userId = Number(user.id);
    if (!Number.isInteger(userId)) {
      return NextResponse.json({ error: "Please sign out and sign in again." }, { status: 401 });
    }
    const ok = await userExists(sql, userId);
    if (!ok) {
      return NextResponse.json({ error: "Please sign out and sign in again." }, { status: 401 });
    }
    const rows = await sql`SELECT id, type, count, details FROM animals WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 50`;
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
    const userId = Number(user.id);
    if (!Number.isInteger(userId)) {
      return NextResponse.json({ error: "Please sign out and sign in again." }, { status: 401 });
    }
    const ok = await userExists(sql, userId);
    if (!ok) {
      return NextResponse.json({ error: "Please sign out and sign in again." }, { status: 401 });
    }
    const rows = await sql`INSERT INTO animals (user_id, type, count, details) VALUES (${userId}, ${type}, ${count}, ${details}) RETURNING id, type, count, details`;
    return NextResponse.json({ animal: rows[0] });
  } catch (e) {
    if (e && e.code === "23503") {
      return NextResponse.json({ error: "Please sign out and sign in again." }, { status: 401 });
    }
    return NextResponse.json({ error: "Could not save animal." }, { status: 500 });
  }
}