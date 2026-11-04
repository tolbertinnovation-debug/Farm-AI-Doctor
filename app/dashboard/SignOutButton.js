"use client";

import { useState } from "react";

export default function SignOutButton() {
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.href = "/signin";
  }

  return (
    <button onClick={signOut} disabled={loading} className="w-full rounded-xl bg-red-600 px-4 py-4 text-lg font-bold text-white disabled:opacity-50">
      {loading ? "Signing out..." : "Sign out"}
    </button>
  );
}