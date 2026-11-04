import { neon } from "@neondatabase/serverless";

export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Missing DATABASE_URL. Copy .env.example to .env.local and add your Neon link.");
  }
  return neon(url);
}