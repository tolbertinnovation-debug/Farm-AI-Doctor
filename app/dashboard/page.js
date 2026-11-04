import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "../../lib/auth.js";
import { getSql } from "../../lib/db.js";
import SignOutButton from "./SignOutButton.js";
import FarmManager from "./FarmManager.js";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin");
  }
  const userId = Number(user.id);

  let crops = [];
  let animals = [];
  let checks = [];
  let dbError = "";

  try {
    const sql = getSql();
    await sql`
CREATE TABLE IF NOT EXISTS crops (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;
    await sql`
CREATE TABLE IF NOT EXISTS animals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  details TEXT NOT NULL DEFAULT '',
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
    const cropRows = await sql`SELECT id, name, details FROM crops WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 50`;
    const animalRows = await sql`SELECT id, type, count, details FROM animals WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 50`;
    const checkRows = await sql`SELECT id, kind, title, summary, created_at FROM checks WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 5`;
    crops = cropRows.map((c) => ({ id: c.id, name: c.name, details: c.details || "" }));
    animals = animalRows.map((a) => ({ id: a.id, type: a.type, count: a.count, details: a.details || "" }));
    checks = checkRows.map((r) => ({ id: r.id, kind: r.kind, title: r.title, summary: r.summary || "", created_at: String(r.created_at || "") }));
  } catch (e) {
    dbError = "Could not load farm. Check internet and DATABASE_URL, then reload.";
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-green-700 p-6 text-white shadow">
        <h1 className="text-2xl font-bold">Hello 👋</h1>
        <p className="mt-1 text-lg">{user.email}</p>
        <p className="mt-1">You are: {user.role}</p>
      </div>

      {dbError ? <p className="rounded-xl bg-red-50 p-3 text-red-700">{dbError}</p> : null}

      <div className="rounded-2xl bg-white p-6 shadow">
        <h2 className="text-xl font-bold">Doctors</h2>
        <p className="mt-1">Pick one for help.</p>
        <div className="mt-4 space-y-3">
          <Link href="/crop-doctor" className="block w-full rounded-xl bg-green-700 px-4 py-4 text-center text-lg font-bold text-white">
            🌿 Crop Doctor
          </Link>
          <Link href="/livestock-doctor" className="block w-full rounded-xl bg-green-700 px-4 py-4 text-center text-lg font-bold text-white">
            🐐 Livestock Doctor
          </Link>
          <Link href="/assistant" className="block w-full rounded-xl border-2 border-green-700 px-4 py-4 text-center text-lg font-bold text-green-800">
            💬 Farm Assistant
          </Link>
        </div>
      </div>

      <FarmManager initialCrops={crops} initialAnimals={animals} />

      <div className="rounded-2xl bg-white p-6 shadow">
        <h2 className="text-xl font-bold">Recent checks</h2>
        {checks.length === 0 ? (
          <p className="mt-2">No checks yet. After you use Crop Doctor, you will see them here.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {checks.map((c) => (
              <li key={c.id} className="rounded-xl border p-3">
                <p className="font-bold">{c.title}</p>
                <p className="text-sm">{c.kind} · {c.created_at.slice(0, 10)}</p>
                {c.summary ? <p className="mt-1">{c.summary}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow">
        <SignOutButton />
      </div>
    </div>
  );
}