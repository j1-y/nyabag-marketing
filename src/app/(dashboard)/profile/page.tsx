import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/profile";
import { ProfileForm } from "@/components/profile/ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const profile = await getUserProfile(supabase, user);

  return (
    <main className="profile-page">
      <div className="profile-shell">
        <header className="profile-heading">
          <span>Account</span>
          <h1>Profile</h1>
          <p>Manage the details shown around your workspace.</p>
        </header>

        <ProfileForm profile={profile} />
      </div>
    </main>
  );
}
