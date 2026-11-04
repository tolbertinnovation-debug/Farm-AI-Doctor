"use client";

import { useState } from "react";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("farmer");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create account.");
        setLoading(false);
        return;
      }
      window.location.href = "/dashboard";
    } catch {
      setError("No internet. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow">
      <h1 className="text-2xl font-bold text-green-800">Create account</h1>
      <p className="mt-1">Free. Pick farmer or expert.</p>
      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <div>
          <label htmlFor="email" className="font-bold">Email</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ama@gmail.com" className="mt-1 w-full rounded-xl border p-4 text-lg" />
        </div>
        <div>
          <label htmlFor="password" className="font-bold">Password (6 letters or more)</label>
          <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-xl border p-4 text-lg" />
        </div>
        <div>
          <label htmlFor="role" className="font-bold">I am a</label>
          <select id="role" value={role} onChange={(e) => setRole(e.target.value)} className="mt-1 w-full rounded-xl border p-4 text-lg">
            <option value="farmer">Farmer</option>
            <option value="expert">Expert</option>
          </select>
        </div>
        {error ? <p className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p> : null}
        <button type="submit" disabled={loading} className="w-full rounded-xl bg-green-700 px-4 py-4 text-lg font-bold text-white disabled:opacity-50">
          {loading ? "Please wait..." : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-center">
        Have an account? <Link href="/signin" className="font-bold text-green-800 underline">Sign in</Link>
      </p>
    </div>
  );
}