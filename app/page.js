import Link from "next/link";
import { getCurrentUser } from "../lib/auth.js";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <div className="rounded-2xl bg-white p-6 shadow">
      <h1 className="text-2xl font-bold text-green-800">Healthy farm, happy family</h1>
      <p className="mt-2 text-lg">Check sick crops and animals. Talk to an expert.</p>
      {user ? (
        <div className="mt-6">
          <p className="text-lg">Hello, {user.email}</p>
          <Link href="/dashboard" className="mt-4 block w-full rounded-xl bg-green-700 px-4 py-4 text-center text-lg font-bold text-white">
            Go to my farm
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          <Link href="/signup" className="block w-full rounded-xl bg-green-700 px-4 py-4 text-center text-lg font-bold text-white">
            Create account
          </Link>
          <Link href="/signin" className="block w-full rounded-xl border-2 border-green-700 px-4 py-4 text-center text-lg font-bold text-green-800">
            Sign in
          </Link>
        </div>
      )}
    </div>
  );
}