import { redirect } from "next/navigation";
import { getCurrentUser } from "../../lib/auth.js";
import SignOutButton from "./SignOutButton.js";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-green-700 p-6 text-white shadow">
        <h1 className="text-2xl font-bold">Hello 👋</h1>
        <p className="mt-1 text-lg">{user.email}</p>
        <p className="mt-1">You are: {user.role}</p>
      </div>
      <div className="rounded-2xl bg-white p-6 shadow">
        <h2 className="text-xl font-bold">Stage 1 is done</h2>
        <p className="mt-2">Sign up, sign in and sign out work. Only signed-in people can see this page.</p>
        <p className="mt-2">Next stage will add your farm, doctors and recent checks.</p>
        <div className="mt-4">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}