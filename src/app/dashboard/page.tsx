import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <main className="min-h-screen bg-asphalt px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-xl font-semibold text-warmwhite tracking-tight">
          Dashboard
        </h1>
        <p className="mt-2 text-sm text-warmwhite/60">
          Signed in as {user.email}
        </p>

        <div className="mt-8 rounded-xl border border-chrome/20 bg-panel p-6">
          <p className="text-sm text-warmwhite/50">
            This is the Phase 1 shell — the car seat visual, current route,
            and booking flow land here in Phase 2.
          </p>
        </div>
      </div>
    </main>
  );
}
