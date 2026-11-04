import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "../../../lib/auth.js";
import { getSql } from "../../../lib/db.js";
import { formatCheckDate } from "../../../lib/format.js";

export default async function HistoryDetailPage({ params }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin");
  }
  const userId = Number(user.id);
  const id = Number(params.id);
  if (!Number.isInteger(userId) || !Number.isInteger(id)) {
    redirect("/history");
  }
  let check = null;
  try {
    const sql = getSql();
    const rows = await sql`SELECT id, kind, title, summary, created_at FROM checks WHERE id = ${id} AND user_id = ${userId} LIMIT 1`;
    if (rows.length > 0) {
      const r = rows[0];
      check = { id: r.id, kind: r.kind, title: r.title, summary: r.summary || "", created_at: formatCheckDate(r.created_at) };
    }
  } catch {
    check = null;
  }
  if (!check) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold text-green-800">Not found</h1>
        <p className="mt-2 text-lg">This check is not there.</p>
        <Link href="/history" className="mt-4 block w-full rounded-xl bg-green-700 px-4 py-4 text-center text-lg font-bold text-white">
          Back to history
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-6 shadow">
        <p className="text-sm">{check.kind} · {String(check.created_at).slice(0, 10)}</p>
        <h1 className="mt-1 text-2xl font-bold text-green-800">{check.title}</h1>
        {check.summary ? <p className="mt-3 text-lg">{check.summary}</p> : null}
      </div>
      <Link href="/history" className="block w-full rounded-xl border-2 border-green-700 px-4 py-4 text-center text-lg font-bold text-green-800">
        Back to history
      </Link>
    </div>
  );
}