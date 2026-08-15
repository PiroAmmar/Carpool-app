"use client";

import { createClient } from "@/lib/supabase/client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

const ERROR_MESSAGES: Record<string, string> = {
  wrong_domain: "That account isn't on the university domain. Sign in with your @nu.edu.pk email.",
  auth_failed: "Sign-in didn't go through. Give it another try.",
  missing_code: "Something interrupted the sign-in. Give it another try.",
};

function LoginForm() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("error");
  const initialError = errorCode
    ? ERROR_MESSAGES[errorCode] ?? "Something went wrong. Give it another try."
    : null;
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const reason = searchParams.get("reason");
    if (reason) console.error("[login] auth error reason:", decodeURIComponent(reason));
  }, [searchParams]);

  async function signInWithGoogle() {
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // On success the browser navigates away to Google, so no need to
    // reset `loading` in that branch.
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-asphalt px-6 flex items-center justify-center">
      {/* Faint route-line running the full height, behind everything —
          the same structural motif used on the dashboard, not decoration
          bolted on just for this screen. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-full w-px -translate-x-1/2 opacity-[0.08]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, var(--color-chrome) 0 10px, transparent 10px 20px)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-sm"
      >
        <div className="rounded-2xl border border-chrome/15 bg-panel px-8 py-10 text-center shadow-[0_0_0_1px_rgba(201,205,211,0.04)]">
          {/* A single instrument-panel indicator dot, idle-pulsing like
              the seat visual will later — the one moment of ambient
              motion on this screen. */}
          <div className="mx-auto mb-6 flex h-2 w-2 items-center justify-center">
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-route-green"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>

          <h1 className="text-xl font-semibold text-warmwhite tracking-tight">
            Ammar FAST Carpool
          </h1>
          <p className="mt-2 text-sm text-warmwhite/50">
            Sign in with your university account to continue
          </p>

          <motion.button
            onClick={signInWithGoogle}
            disabled={loading}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 flex w-full items-center justify-center gap-3 rounded-lg border border-chrome/25 bg-asphalt/60 px-4 py-3 text-sm font-medium text-warmwhite transition-colors hover:bg-asphalt/30 disabled:opacity-50"
          >
            <GoogleIcon />
            {loading ? "Connecting…" : "Continue with Google"}
          </motion.button>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="mt-4 text-sm text-signal-amber"
              role="alert"
            >
              {error}
            </motion.p>
          )}

          <p className="mt-8 font-mono text-[11px] tracking-wide text-warmwhite/30">
            RESTRICTED · @NU.EDU.PK ONLY
          </p>
        </div>
      </motion.div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.8v3.84h5.34c-.24 1.38-1.68 4.05-5.34 4.05-3.21 0-5.84-2.66-5.84-5.94s2.63-5.94 5.84-5.94c1.83 0 3.06.78 3.76 1.45l2.57-2.47C16.71 4.14 14.56 3 12 3 6.98 3 2.93 7.03 2.93 12s4.05 9 9.07 9c5.23 0 8.71-3.68 8.71-8.86 0-.6-.06-1.05-.14-1.5H12z"
      />
    </svg>
  );
}
