import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/profile";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabaseConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://your-project-id.supabase.co";

  if (!supabaseConfigured) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: "var(--bg)", color: "var(--text)",
        fontFamily: "var(--font)", padding: "2rem",
      }}>
        <div style={{
          maxWidth: 520, background: "var(x --bg2)", border: "1px solid var(--border2)",
          borderRadius: 10, padding: "2.5rem", boxShadow: "var(--shadow)",
        }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>🛍️</div>
          <h1 style={{ fontFamily: "var(--font-title)", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
            Nyabag needs Supabase
          </h1>
          <p style={{ color: "var(--text2)", fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
            Your <code style={{ background: "var(--bg3)", padding: "0 8px", borderRadius: 10 }}>.env.local</code> file
            has placeholder values. Follow these steps to connect your database:
          </p>
          <ol style={{ color: "var(--text2)", fontSize: 13, lineHeight: 2, paddingLeft: 24 }}>
            <li>Go to <strong>supabase.com</strong> and create a free project</li>
            <li>Open <strong>Project Settings → API</strong></li>
            <li>Copy <strong>Project URL</strong> → <code style={{ background: "var(--bg3)", padding: "0 8px", borderRadius: 10 }}>NEXT_PUBLIC_SUPABASE_URL</code></li>
            <li>Copy <strong>anon / public</strong> key → <code style={{ background: "var(--bg3)", padding: "0 8px", borderRadius: 10 }}>NEXT_PUBLIC_SUPABASE_ANON_KEY</code></li>
            <li>Run <code style={{ background: "var(--bg3)", padding: "0 8px", borderRadius: 10 }}>supabase/schema.sql</code> in the SQL editor</li>
            <li>Restart the dev server: <code style={{ background: "var(--bg3)", padding: "0 8px", borderRadius: 10 }}>npm run dev</code></li>
          </ol>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const profile = await getUserProfile(supabase, user);

  return (
    <DashboardShell
      userEmail={user.email ?? ""}
      profileName={profile.name}
      profileAvatarUrl={profile.avatar_url ?? null}
    >
      {children}
    </DashboardShell>
  );
}

