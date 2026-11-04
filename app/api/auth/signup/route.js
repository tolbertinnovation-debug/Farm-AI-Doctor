import { NextResponse } from "next/server";
import { getSql } from "../../../../lib/db.js";
import { hashPassword, signSession, COOKIE_NAME } from "../../../../lib/auth.js";
import { normalizeEmail, isValidEmail, isValidPassword, isValidSignupRole } from "../../../../lib/validate.js";

export async function POST(req) {
  try {
    const body = await req.json();
    const email = normalizeEmail(body.email);
    const password = body.password || "";
    const role = body.role || "farmer";

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Write a correct email, like ama@gmail.com." }, { status: 400 });
    }
    if (!isValidPassword(password)) {
      return NextResponse.json({ error: "Password must be 6 letters or more." }, { status: 400 });
    }
    if (!isValidSignupRole(role)) {
      return NextResponse.json({ error: "Role must be farmer or expert." }, { status: 400 });
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

    const found = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
    if (found.length > 0) {
      return NextResponse.json({ error: "This email already has an account. Please sign in." }, { status: 400 });
    }

    const password_hash = await hashPassword(password);
    const rows = await sql`INSERT INTO users (email, password_hash, role) VALUES (${email}, ${password_hash}, ${role}) RETURNING id, email, role, created_at`;
    const user = rows[0];
    const token = signSession({ id: user.id, email: user.email, role: user.role });

    const res = NextResponse.json({ user });
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
    const m = err && err.message ? String(err.message) : "";
    if (m.includes("AUTH_SECRET") || m.includes("DATABASE_URL")) {
      return NextResponse.json({ error: m }, { status: 500 });
    }
    return NextResponse.json({ error: "Sorry, we could not create the account. Try again." }, { status: 500 });
  }
}