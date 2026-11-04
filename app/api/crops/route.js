import { NextResponse } from "next/server";
import { getSql } from "../../../lib/db.js";
import { getCurrentUser } from "../../../lib/auth.js";
import { isValidCropName, cleanText } from "../../../lib/validate.js";

async function ensure(sql) {
  await sql`
CREATE TABLE IF NOT EXISTS crops (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
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
    const rows = await sql`SELECT id, name, details FROM crops WHERE user_id = ${Number(user.id)} ORDER BY created_at DESC LIMIT 50`;
    return NextResponse.json({ crops: rows });
  } catch (e) {
    return NextResponse.json({ error: "Could not load crops." }, { status: 500 });
  }
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  try {
    const body = await req.json();
    const name = cleanText(body.name || "", 60);
    const details = cleanText(body.details || "", 200);
    if (!isValidCropName(name)) {
      return NextResponse.json({ error: "Write crop name, like Cassava." }, { status: 400 });
    }
    const sql = getSql();
    await ensure(sql);
    const rows = await sql`INSERT INTO crops (user_id, name, details) VALUES (${Number(user.id)}, ${name}, ${details}) RETURNING id, name, details`;
    return NextResponse.json({ crop: rows[0] });
  } catch (e) {
    return NextResponse.json({ error: "Could not save crop." }, { status: 500 });
  }
}