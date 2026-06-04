import { AdminHeader } from "@/components/admin/AdminHeader";
import { StatCard } from "@/components/admin/StatCard";
import { DataTable } from "@/components/admin/DataTable";
import { getAdminOverview } from "@/lib/admin/data";

export default async function AdminOverviewPage() {
  const overview = await getAdminOverview();

  const stats = [
    ["Authenticated users", overview.totalUsers],
    ["Profiles", overview.totalProfiles],
    ["Bookmarks", overview.totalBookmarks],
    ["Canvas notes", overview.totalCanvasNotes],
    ["Early access", overview.totalEarlyAccess],
    ["Email templates", overview.totalEmailTemplates],
    ["Emails sent", overview.totalEmailsSent],
    ["Storage files", overview.totalStorageFiles],
  ] as const;

  return (
    <>
      <AdminHeader title="Overview" description="A compact read on Nyabag's users, content, signups, email, and storage." />
      <section className="admin-stats-grid">
        {stats.map(([label, value]) => <StatCard key={label} label={label} value={value} />)}
        <StatCard label="Storage used" value={formatBytes(overview.storageBytes)} helper="Approximate listed usage" />
      </section>
      <section className="admin-grid-two">
        <div className="admin-card">
          <h2>Latest users</h2>
          <DataTable headers={["Name", "Email", "Created"]} hasRows={overview.latestProfiles.length > 0}>
            {overview.latestProfiles.map((profile) => (
              <tr key={profile.user_id}>
                <td>{profile.name || "-"}</td>
                <td>{profile.email || "-"}</td>
                <td>{new Date(profile.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </DataTable>
        </div>
        <div className="admin-card">
          <h2>Latest early access</h2>
          <DataTable headers={["Email", "Status", "Created"]} hasRows={overview.latestSignups.length > 0}>
            {overview.latestSignups.map((signup) => (
              <tr key={signup.id}>
                <td>{signup.email}</td>
                <td>{signup.status ?? "new"}</td>
                <td>{new Date(signup.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </DataTable>
        </div>
        <div className="admin-card">
          <h2>Latest emails</h2>
          <DataTable headers={["Recipient", "Status", "Created"]} hasRows={overview.latestEmails.length > 0}>
            {overview.latestEmails.map((email) => (
              <tr key={email.id}>
                <td>{email.recipient_email}</td>
                <td>{email.status}</td>
                <td>{new Date(email.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </DataTable>
        </div>
        <div className="admin-card">
          <h2>Recent media</h2>
          <DataTable headers={["Bucket", "Path", "Size"]} hasRows={overview.recentStorage.length > 0}>
            {overview.recentStorage.map((file) => (
              <tr key={`${file.bucket}:${file.path}`}>
                <td>{file.bucket}</td>
                <td>{file.path}</td>
                <td>{formatBytes(file.size)}</td>
              </tr>
            ))}
          </DataTable>
        </div>
      </section>
    </>
  );
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
