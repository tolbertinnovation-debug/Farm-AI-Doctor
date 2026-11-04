import { NextResponse } from "next/server";
import { getSql } from "../../../../lib/db.js";
import { verifyPassword, signSession, COOKIE_NAME } from "../../../../lib/auth.js";
import { normalizeEmail } from "../../../../lib/validate.js";

export async function POST(req) {
  try {
    const body = await req.json();
    const email = normalizeEmail(body.email);
    const password = body.password || "";

    if (!email || !password) {
      return NextResponse.json({ error: "Write your email and password." }, { status: 400 });
    }

    let sql;
    try {
      sql = getSql();
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }

    await sql`
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'farmer',
  is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT FALSE`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;

    const rows = await sql`SELECT id, email, password_hash, role, is_blocked FROM users WHERE email = ${email} LIMIT 1`;
    if (rows.length === 0) {
      return NextResponse.json({ error: "Email or password is wrong." }, { status: 400 });
    }
    const user = rows[0];
    if (user.is_blocked) {
      return NextResponse.json({ error: "This account is blocked. Talk to admin." }, { status: 403 });
    }
    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      return NextResponse.json({ error: "Email or password is wrong." }, { status: 400 });
    }

    const token = signSession({ id: user.id, email: user.email, role: user.role });
    const res = NextResponse.json({ user: { id: user.id, email: user.email, role: user.role } });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      secure: process.env.NODE_ENV === "production"
    });
    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Sorry, we could not sign you in. Try again." }, { status: 500 });
  }
}