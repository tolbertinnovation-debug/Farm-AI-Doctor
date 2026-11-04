import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../lib/auth.js";
import { getSql } from "../../../lib/db.js";
import { buildAssistantMessages, MAX_DOC_CHARS } from "../../../lib/assistant.js";
import { metaChatCompletion } from "../../../lib/meta.js";

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

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const userId = Number(user.id);
  if (!Number.isInteger(userId)) {
    return NextResponse.json({ error: "Please sign out and sign in again." }, { status: 401 });
  }
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Write a question first." }, { status: 400 });
  }
  const raw = Array.isArray(body.messages) ? body.messages.slice(-10) : [];
  const cleaned = [];
  for (const m of raw) {
    if (!m || (m.role !== "user" && m.role !== "assistant")) continue;
    const c = String(m.content || "").trim().slice(0, 2000);
    if (!c) continue;
    cleaned.push({ role: m.role, content: c });
  }
  if (cleaned.length === 0 || cleaned[cleaned.length - 1].role !== "user") {
    return NextResponse.json({ error: "Write a question first." }, { status: 400 });
  }
  const docText = String(body.docText || "").slice(0, MAX_DOC_CHARS);
  if (!process.env.META_API_KEY) {
    return NextResponse.json({ error: "Missing META_API_KEY. Add it in .env.local, then try again." }, { status: 500 });
  }
  try {
    const sparkMsgs = buildAssistantMessages(cleaned, docText);
    const answer = await metaChatCompletion({ model: "muse-spark-1.3", messages: sparkMsgs, maxTokens: 600 });
    try {
      const sql = getSql();
      await ensure(sql);
      const firstQ = cleaned.find((m) => m.role === "user");
      const title = String(firstQ ? firstQ.content : "Chat").slice(0, 200);
      const summary = String(answer || "").slice(0, 500);
      await sql`INSERT INTO checks (user_id, kind, title, summary) VALUES (${userId}, 'chat', ${title}, ${summary})`;
    } catch {}
    return NextResponse.json({ answer });
  } catch (e) {
    const msg = e && e.message ? e.message : "";
    if (msg.includes("META_API_KEY")) return NextResponse.json({ error: msg }, { status: 500 });
    return NextResponse.json({ error: "Could not answer. Check internet and try again." }, { status: 500 });
  }
}