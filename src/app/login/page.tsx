"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SpinnerIcon } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { timeAsync } from "@/lib/perf";
import { getSafeInternalPath } from "@/lib/security/redirect-safety";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = getSafeInternalPath(searchParams.get("next"), "/app");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const supabaseReady =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://your-project-id.supabase.co";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabaseReady) {
      setError("Supabase is not configured. See the setup guide on the home page.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await timeAsync("login submit client flow", async () => {
  console.time("login: create supabase client");
  const supabase = createClient();
  console.timeEnd("login: create supabase client");

  console.time("login: signInWithPassword");
  const { error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  console.timeEnd("login: signInWithPassword");

  if (authError) {
    setError(authError.message);
    setLoading(false);
    return;
  }

  console.time("login: router replace");
  router.replace(nextPath);
  console.timeEnd("login: router replace");
});
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed");
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
          <div className="auth-logo">
            <img src="/assets/logo.svg" alt="Nyabag logo" className="h-8 w-auto object-contain"/>
            </div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to access your bookmarks</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}
          {!supabaseReady && (
            <div className="auth-error">
              ⚠️ Supabase env vars not configured. Fill in <code>.env.local</code> and restart the server.
            </div>
          )}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="btn-primary auth-submit"
            disabled={loading}
          >
            {loading && (
              <SpinnerIcon
                size={15}
                className="phosphor"
                style={{ animation: "spin 1s linear infinite" }}
              />
            )}
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="auth-footer">
          No account? <Link href="/signup">Create one</Link>
        </p>
      </div>
    </div>
  );
}
