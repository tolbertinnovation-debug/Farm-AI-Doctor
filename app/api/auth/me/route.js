import { NextResponse } from "next/server";
import { verifySession, COOKIE_NAME } from "../../../../lib/auth.js";

export async function GET(req) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  const user = verifySession(token);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({ user });
}