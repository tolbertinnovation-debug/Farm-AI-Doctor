import { NextResponse } from "next/server";
import { getSql } from "../../../lib/db.js";
import { getCurrentUser } from "../../../lib/auth.js";
import { cleanChatText, makeSessionTitle } from "../../../lib/chatsessions.js";

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
CREATE TABLE IF NOT EXISTS chat_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;
  await sql`
CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user',
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const userId = Number(user.id);
  if (!Number.isInteger(userId)) return NextResponse.json({ error: "Please sign out and sign in again." }, { status: 401 });
  try {
    const sql = getSql();
    await ensure(sql);
    const rows = await sql`SELECT id, title, updated_at FROM chat_sessions WHERE user_id = ${userId} ORDER BY updated_at DESC LIMIT 50`;
    return NextResponse.json({ sessions: rows });
  } catch (e) {
    return NextResponse.json({ error: "Could not load chats." }, { status: 500 });
  }
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const userId = Number(user.id);
  if (!Number.isInteger(userId)) return NextResponse.json({ error: "Please sign out and sign in again." }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    const first = cleanChatText(body.first || "", 200);
    const title = makeSessionTitle(first || "New chat");
    const sql = getSql();
    await ensure(sql);
    const rows = await sql`INSERT INTO chat_sessions (user_id, title) VALUES (${userId}, ${title.slice(0, 80)}) RETURNING id, title`;
    return NextResponse.json({ session: rows[0] });
  } catch (e) {
    return NextResponse.json({ error: "Could not start chat." }, { status: 500 });
  }
}