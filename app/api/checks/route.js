import { NextResponse } from "next/server";
import { getSql } from "../../../lib/db.js";
import { getCurrentUser } from "../../../lib/auth.js";
import { cleanHistorySearch, isValidHistoryKind, isValidHistoryDate, filterChecks } from "../../../lib/history.js";
import { formatCheckDate } from "../../../lib/format.js";

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
CREATE TABLE IF NOT EXISTS checks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'crop',
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;
}

export async function GET(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const userId = Number(user.id);
  if (!Number.isInteger(userId)) {
    return NextResponse.json({ error: "Please sign out and sign in again." }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const q = cleanHistorySearch(searchParams.get("q") || "");
  let kind = String(searchParams.get("kind") || "").trim();
  if (kind === "all") kind = "";
  if (!isValidHistoryKind(kind)) kind = "";
  let date = String(searchParams.get("date") || "").trim();
  if (date && !isValidHistoryDate(date)) date = "";
  try {
    const sql = getSql();
    await ensure(sql);
    const rows = await sql`SELECT id, kind, title, summary, created_at FROM checks WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 100`;
    const all = rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      title: r.title,
      summary: r.summary || "",
      created_at: formatCheckDate(r.created_at)
    }));
    const checks = filterChecks(all, { q, kind, date });
    return NextResponse.json({ checks });
  } catch {
    return NextResponse.json({ error: "Could not load history." }, { status: 500 });
  }
}