import fs from "node:fs";
import { neon } from "@neondatabase/serverless";

function loadFile(path) {
  try {
    const text = fs.readFileSync(path, "utf8");
    for (const line of text.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#") || !t.includes("=")) continue;
      const i = t.indexOf("=");
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {
    // no file, use real environment
  }
}

loadFile(".env.local");
loadFile(".env");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Missing DATABASE_URL. Copy .env.example to .env.local and add your Neon link.");
  process.exit(1);
}

const sql = neon(url);

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

console.log("users table ready. You can sign up now.");