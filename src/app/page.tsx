import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MarketingPage() {
  const supabaseConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://your-project-id.supabase.co";

  const user = supabaseConfigured
    ? (await (await createClient()).auth.getUser()).data.user
    : null;

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
        background: "var(--bg)",
        color: "var(--text)",
        fontFamily: "var(--font)",
      }}
    >
      <section style={{ maxWidth: 640, textAlign: "center" }}>
        <p style={{ marginBottom: 12, color: "var(--text2)", fontSize: 14 }}>
          Nyabag
        </p>
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--font-title)",
            fontSize: "clamp(2.5rem, 6vw, 4.75rem)",
            lineHeight: 1,
            letterSpacing: 0,
          }}
        >
          Your second memory for design
        </h1>
        <p
          style={{
            margin: "1.25rem auto 0",
            maxWidth: 560,
            color: "var(--text2)",
            fontSize: 17,
            lineHeight: 1.6,
          }}
        >
          Save websites, screenshots, UI references, palettes, fonts, and ideas
          in one visual workspace.
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 12,
            flexWrap: "wrap",
            marginTop: 28,
          }}
        >
          {user ? (
            <Link className="btn-primary" href="/app">
              Open Nyabag
            </Link>
          ) : (
            <>
              <Link className="btn-primary" href="/signup">
                Sign up
              </Link>
              <Link className="btn-ghost" href="/login">
                Log in
              </Link>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
