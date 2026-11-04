"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function HistoryList() {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("");
  const [date, setDate] = useState("");
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(qq, kk, dd) {
    setLoading(true);
    setError("");
    try {
      const p = new URLSearchParams();
      if (qq) p.set("q", qq);
      if (kk) p.set("kind", kk);
      if (dd) p.set("date", dd);
      const res = await fetch("/api/checks?" + p.toString());
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not load history.");
        setChecks([]);
      } else {
        setChecks(data.checks || []);
      }
    } catch {
      setError("No internet. Try again.");
      setChecks([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load("", "", "");
  }, []);

  function onSearch(e) {
    e.preventDefault();
    load(q, kind, date);
  }

  function onClear() {
    setQ("");
    setKind("");
    setDate("");
    load("", "", "");
  }

  return (
    <div>
      <form onSubmit={onSearch} className="mt-4 space-y-3">
        <div>
          <label htmlFor="hq" className="font-bold">Search</label>
          <input id="hq" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cassava, goat..." className="mt-1 w-full rounded-xl border p-4 text-lg" />
        </div>
        <div>
          <label htmlFor="hkind" className="font-bold">Type</label>
          <select id="hkind" value={kind} onChange={(e) => setKind(e.target.value)} className="mt-1 w-full rounded-xl border p-4 text-lg">
            <option value="">All</option>
            <option value="crop">Crops</option>
            <option value="livestock">Animals</option>
            <option value="chat">Chat</option>
          </select>
        </div>
        <div>
          <label htmlFor="hdate" className="font-bold">Date</label>
          <input id="hdate" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-xl border p-4 text-lg" />
        </div>
        {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p> : null}
        <div className="flex gap-2">
          <button type="submit" className="flex-1 rounded-xl bg-green-700 px-4 py-4 text-lg font-bold text-white">Search</button>
          <button type="button" onClick={onClear} className="rounded-xl border-2 border-green-700 px-4 py-4 text-lg font-bold text-green-800">Clear</button>
        </div>
      </form>
      <div className="mt-4" aria-live="polite">
        {loading ? (
          <p>Loading...</p>
        ) : checks.length === 0 ? (
          <p>No checks yet. Use Crop Doctor or Livestock Doctor first.</p>
        ) : (
          <ul className="space-y-2">
            {checks.map((c) => (
              <li key={c.id} className="rounded-xl border p-3">
                <Link href={"/history/" + c.id} className="block">
                  <p className="font-bold">{c.title}</p>
                  <p className="text-sm">{c.kind} · {String(c.created_at || "").slice(0, 10)}</p>
                  {c.summary ? <p className="mt-1">{String(c.summary).slice(0, 120)}</p> : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}