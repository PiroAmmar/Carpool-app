"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setError(error.message);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-asphalt px-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-semibold text-warmwhite tracking-tight">
          Carpool Hub
        </h1>
        <p className="mt-2 text-sm text-warmwhite/60">
          Sign in with your university Google account
        </p>

        <button
          onClick={signInWithGoogle}
          className="mt-8 w-full rounded-lg border border-chrome/30 bg-panel px-4 py-3 text-sm font-medium text-warmwhite transition-colors hover:bg-panel/70"
        >
          Continue with Google
        </button>

        {error && (
          <p className="mt-4 text-sm text-amber-400">
            {error}
          </p>
        )}

        <p className="mt-6 text-xs text-warmwhite/40">
          Only @nu.edu.pk accounts can sign in.
        </p>
      </div>
    </main>
  );
}
