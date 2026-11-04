import { NextResponse } from "next/server";
import { getSql } from "../../../../lib/db.js";
import { getCurrentUser } from "../../../../lib/auth.js";
import { isValidSessionId, cleanChatText } from "../../../../lib/chatsessions.js";

async function ensure(sql) {
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

export async function GET(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const sid = Number(params.id);
  if (!isValidSessionId(sid)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  try {
    const sql = getSql();
    await ensure(sql);
    const userId = Number(user.id);
    const s = await sql`SELECT id, title FROM chat_sessions WHERE id = ${sid} AND user_id = ${userId} LIMIT 1`;
    if (s.length === 0) return NextResponse.json({ error: "Not found." }, { status: 404 });
    const msgs = await sql`SELECT id, role, content, created_at FROM chat_messages WHERE session_id = ${sid} ORDER BY id ASC LIMIT 200`;
    return NextResponse.json({ session: s[0], messages: msgs });
  } catch (e) {
    return NextResponse.json({ error: "Could not open chat." }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const sid = Number(params.id);
  if (!isValidSessionId(sid)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  try {
    const body = await req.json();
    const title = cleanChatText(body.title || "", 80);
    if (!title) return NextResponse.json({ error: "Write a title." }, { status: 400 });
    const sql = getSql();
    await ensure(sql);
    const userId = Number(user.id);
    const rows = await sql`UPDATE chat_sessions SET title = ${title}, updated_at = NOW() WHERE id = ${sid} AND user_id = ${userId} RETURNING id, title`;
    if (rows.length === 0) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ session: rows[0] });
  } catch (e) {
    return NextResponse.json({ error: "Could not rename." }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const sid = Number(params.id);
  if (!isValidSessionId(sid)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  try {
    const sql = getSql();
    await ensure(sql);
    const userId = Number(user.id);
    await sql`DELETE FROM chat_messages WHERE session_id = ${sid} AND user_id = ${userId}`;
    const rows = await sql`DELETE FROM chat_sessions WHERE id = ${sid} AND user_id = ${userId} RETURNING id`;
    if (rows.length === 0) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Could not delete." }, { status: 500 });
  }
}