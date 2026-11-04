import { NextResponse } from "next/server";
import { getSql } from "../../../../lib/db.js";
import { getCurrentUser } from "../../../../lib/auth.js";
import { formatCheckDate } from "../../../../lib/format.js";

export async function GET(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const userId = Number(user.id);
  const id = Number(params.id);
  if (!Number.isInteger(userId) || !Number.isInteger(id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  try {
    const sql = getSql();
    const rows = await sql`SELECT id, kind, title, summary, created_at FROM checks WHERE id = ${id} AND user_id = ${userId} LIMIT 1`;
    if (rows.length === 0) return NextResponse.json({ error: "Not found." }, { status: 404 });
    const r = rows[0];
    return NextResponse.json({
      check: { id: r.id, kind: r.kind, title: r.title, summary: r.summary || "", created_at: formatCheckDate(r.created_at) }
    });
  } catch {
    return NextResponse.json({ error: "Could not load this check." }, { status: 500 });
  }
}