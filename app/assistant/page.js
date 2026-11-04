import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "../../lib/auth.js";
import AssistantChat from "./AssistantChat.js";

export default async function AssistantPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin");
  }
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold text-green-800">Farm Assistant 💬</h1>
        <p className="mt-1 text-lg">Ask, talk, or add a paper. I answer in simple words.</p>
        <div className="mt-4">
          <AssistantChat />
        </div>
      </div>
      <Link href="/dashboard" className="block w-full rounded-xl border-2 border-green-700 px-4 py-4 text-center text-lg font-bold text-green-800">
        Back to my farm
      </Link>
    </div>
  );
}