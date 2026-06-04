import { AdminHeader } from "@/components/admin/AdminHeader";
import { StatCard } from "@/components/admin/StatCard";
import { StorageTable } from "@/components/admin/StorageTable";
import { getStorageSummary } from "@/lib/admin/data";

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminStoragePage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const bucket = typeof params.bucket === "string" ? params.bucket : "all";
  const q = typeof params.q === "string" ? params.q : "";
  const summary = await getStorageSummary(bucket, q);

  return (
    <>
      <AdminHeader title="Storage" description="Browse Nyabag media without changing bucket privacy." />
      <section className="admin-stats-grid compact">
        <StatCard label="Files listed" value={summary.fileCount} />
        <StatCard label="Approx usage" value={formatBytes(summary.totalBytes)} />
      </section>
      <form className="admin-toolbar">
        <input name="q" placeholder="Search path" defaultValue={q} />
        <select name="bucket" defaultValue={bucket}>
          <option value="all">All buckets</option>
          <option value="canvas-media">canvas-media</option>
          <option value="profile-avatars">profile-avatars</option>
        </select>
        <button className="btn-ghost" type="submit">Filter</button>
      </form>
      <StorageTable files={summary.files} />
    </>
  );
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
