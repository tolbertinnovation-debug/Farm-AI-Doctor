"use client";

import { useState } from "react";
import Link from "next/link";

export default function SigninPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Email or password is wrong.");
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
      <h1 className="text-2xl font-bold text-green-800">Welcome back</h1>
      <p className="mt-1">Sign in to see your farm.</p>
      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <div>
          <label htmlFor="email" className="font-bold">Email</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-xl border p-4 text-lg" />
        </div>
        <div>
          <label htmlFor="password" className="font-bold">Password</label>
          <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-xl border p-4 text-lg" />
        </div>
        {error ? <p className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p> : null}
        <button type="submit" disabled={loading} className="w-full rounded-xl bg-green-700 px-4 py-4 text-lg font-bold text-white disabled:opacity-50">
          {loading ? "Please wait..." : "Sign in"}
        </button>
      </form>
      <p className="mt-4 text-center">
        New here? <Link href="/signup" className="font-bold text-green-800 underline">Create account</Link>
      </p>
    </div>
  );
}