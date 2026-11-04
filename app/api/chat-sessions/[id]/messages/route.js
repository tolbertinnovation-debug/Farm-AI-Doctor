import { NextResponse } from "next/server";
import { getSql } from "../../../../../lib/db.js";
import { getCurrentUser } from "../../../../../lib/auth.js";
import { isValidSessionId, cleanChatText, makeSessionTitle, buildAssistantMessages } from "../../../../../lib/chatsessions.js";
import { metaChatCompletion } from "../../../../../lib/meta.js";

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

export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const sid = Number(params.id);
  if (!isValidSessionId(sid)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const userId = Number(user.id);
  if (!Number.isInteger(userId)) return NextResponse.json({ error: "Please sign out and sign in again." }, { status: 401 });

  let text = "";
  try {
    const body = await req.json();
    text = cleanChatText(body.text || "", 2000);
  } catch {
    return NextResponse.json({ error: "Could not read message." }, { status: 400 });
  }
  if (!text) return NextResponse.json({ error: "Write a question first." }, { status: 400 });

  if (!process.env.META_API_KEY) {
    return NextResponse.json({ error: "Missing META_API_KEY. Add it in .env.local, then try again." }, { status: 500 });
  }

  try {
    const sql = getSql();
    await ensure(sql);
    const s = await sql`SELECT id, title FROM chat_sessions WHERE id = ${sid} AND user_id = ${userId} LIMIT 1`;
    if (s.length === 0) return NextResponse.json({ error: "Not found." }, { status: 404 });

    await sql`INSERT INTO chat_messages (session_id, user_id, role, content) VALUES (${sid}, ${userId}, 'user', ${text})`;

    const old = await sql`SELECT role, content FROM chat_messages WHERE session_id = ${sid} ORDER BY id ASC LIMIT 40`;
    const history = old.slice(0, -1).map((m) => ({ role: m.role, content: m.content }));
    const messages = buildAssistantMessages(history, text);
    let answer = "";
    try {
      answer = await metaChatCompletion({ model: "muse-spark-1.3", messages, maxTokens: 600 });
    } catch (e) {
      const m = e && e.message ? e.message : "";
      if (m.includes("META_API_KEY")) return NextResponse.json({ error: m }, { status: 500 });
      return NextResponse.json({ error: "No answer. Check internet and try again." }, { status: 500 });
    }
    answer = cleanChatText(answer, 3000) || "Sorry, no answer. Try again.";
    await sql`INSERT INTO chat_messages (session_id, user_id, role, content) VALUES (${sid}, ${userId}, 'assistant', ${answer})`;

    if (!s[0].title || s[0].title === "New chat") {
      const t = makeSessionTitle(text);
      await sql`UPDATE chat_sessions SET title = ${t.slice(0, 80)}, updated_at = NOW() WHERE id = ${sid}`;
    } else {
      await sql`UPDATE chat_sessions SET updated_at = NOW() WHERE id = ${sid}`;
    }

    return NextResponse.json({ answer });
  } catch (e) {
    return NextResponse.json({ error: "Could not send. Try again." }, { status: 500 });
  }
}