import "server-only";

import { createAdminServiceClient } from "@/lib/admin/service";

export type AdminOverview = Awaited<ReturnType<typeof getAdminOverview>>;

async function getCount(table: string) {
  const service = createAdminServiceClient();
  const { count } = await service.from(table).select("*", { count: "exact", head: true });
  return count ?? 0;
}

export async function getAdminOverview() {
  const service = createAdminServiceClient();
  const [
    authUsers,
    profiles,
    bookmarks,
    canvasNotes,
    earlyAccess,
    templates,
    emailSends,
    latestProfiles,
    latestSignups,
    latestEmails,
  ] = await Promise.all([
    service.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    getCount("profiles"),
    getCount("bookmarks"),
    getCount("canvas_notes"),
    getCount("early_access_signups"),
    getCount("email_templates"),
    getCount("email_sends"),
    service.from("profiles").select("user_id,name,email,created_at").order("created_at", { ascending: false }).limit(5),
    service.from("early_access_signups").select("*").order("created_at", { ascending: false }).limit(5),
    service.from("email_sends").select("*").order("created_at", { ascending: false }).limit(5),
  ]);

  const storage = await getStorageSummary();

  return {
    totalUsers: authUsers.data?.users.length ?? 0,
    totalProfiles: profiles,
    totalBookmarks: bookmarks,
    totalCanvasNotes: canvasNotes,
    totalEarlyAccess: earlyAccess,
    totalEmailTemplates: templates,
    totalEmailsSent: emailSends,
    totalStorageFiles: storage.fileCount,
    storageBytes: storage.totalBytes,
    latestProfiles: latestProfiles.data ?? [],
    latestSignups: latestSignups.data ?? [],
    latestEmails: latestEmails.data ?? [],
    recentStorage: storage.files.slice(0, 5),
  };
}

export async function getEarlyAccessSignups(search?: string, status?: string) {
  const service = createAdminServiceClient();
  let query = service
    .from("early_access_signups")
    .select("*")
    .order("created_at", { ascending: false });

  if (status && status !== "all") query = query.eq("status", status);
  if (search) {
    const term = `%${search}%`;
    query = query.or(`email.ilike.${term},name.ilike.${term}`);
  }

  const { data } = await query;
  return data ?? [];
}

export async function getEmailTemplates(includeArchived = false) {
  const service = createAdminServiceClient();
  let query = service.from("email_templates").select("*").order("updated_at", { ascending: false });
  if (!includeArchived) query = query.neq("status", "archived");
  const { data } = await query;
  return data ?? [];
}

export async function getEmailTemplate(id: string) {
  const service = createAdminServiceClient();
  const { data } = await service.from("email_templates").select("*").eq("id", id).maybeSingle();
  return data;
}

export async function getEmailSends() {
  const service = createAdminServiceClient();
  const { data } = await service.from("email_sends").select("*").order("created_at", { ascending: false }).limit(100);
  return data ?? [];
}

export async function getAdminLogs() {
  const service = createAdminServiceClient();
  const { data } = await service
    .from("admin_activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(150);
  return data ?? [];
}

export async function getUsers(search?: string, onlyAdmins = false) {
  const service = createAdminServiceClient();
  const { data: listed } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const users = listed?.users ?? [];
  const ids = users.map((user) => user.id);

  const [{ data: profiles }, { data: admins }, { data: bookmarkCounts }, { data: noteCounts }] = await Promise.all([
    service.from("profiles").select("*").in("user_id", ids),
    service.from("admin_users").select("*").in("user_id", ids),
    service.from("bookmarks").select("user_id").in("user_id", ids),
    service.from("canvas_notes").select("user_id").in("user_id", ids),
  ]);

  const profileById = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));
  const adminById = new Set((admins ?? []).map((admin) => admin.user_id));
  const countByUser = (rows: { user_id: string }[] | null) =>
    (rows ?? []).reduce<Record<string, number>>((acc, row) => {
      acc[row.user_id] = (acc[row.user_id] ?? 0) + 1;
      return acc;
    }, {});

  const bookmarkCountByUser = countByUser(bookmarkCounts);
  const noteCountByUser = countByUser(noteCounts);
  const normalizedSearch = search?.toLowerCase().trim();

  return users
    .map((user) => {
      const profile = profileById.get(user.id);
      return {
        id: user.id,
        email: user.email ?? profile?.email ?? "",
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        profile,
        isAdmin: adminById.has(user.id),
        bookmarksCount: bookmarkCountByUser[user.id] ?? 0,
        notesCount: noteCountByUser[user.id] ?? 0,
      };
    })
    .filter((user) => (onlyAdmins ? user.isAdmin : true))
    .filter((user) => {
      if (!normalizedSearch) return true;
      return (
        user.email.toLowerCase().includes(normalizedSearch) ||
        (user.profile?.name ?? "").toLowerCase().includes(normalizedSearch)
      );
    });
}

export async function getUserDetail(userId: string) {
  const service = createAdminServiceClient();
  const [{ data: authUser }, { data: profile }, { data: bookmarks }, { data: notes }] = await Promise.all([
    service.auth.admin.getUserById(userId),
    service.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    service.from("bookmarks").select("id,title,url,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
    service.from("canvas_notes").select("id,type,media_path,media_mime,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
  ]);

  return {
    user: authUser.user,
    profile,
    bookmarks: bookmarks ?? [],
    notes: notes ?? [],
  };
}

export async function getStorageSummary(bucketFilter?: string, search?: string) {
  const service = createAdminServiceClient();
  const buckets = bucketFilter && bucketFilter !== "all" ? [bucketFilter] : ["canvas-media", "profile-avatars"];
  const files = [];

  for (const bucket of buckets) {
    const { data } = await service.storage.from(bucket).list("", {
      limit: 100,
      sortBy: { column: "created_at", order: "desc" },
    });

    for (const file of data ?? []) {
      if (!file.name || file.name === ".emptyFolderPlaceholder") continue;
      const path = file.name;
      if (search && !path.toLowerCase().includes(search.toLowerCase())) continue;
      const signed =
        bucket === "canvas-media"
          ? await service.storage.from(bucket).createSignedUrl(path, 60 * 10)
          : null;
      const publicUrl =
        bucket === "profile-avatars" ? service.storage.from(bucket).getPublicUrl(path).data.publicUrl : null;

      files.push({
        bucket,
        path,
        name: file.name,
        size: file.metadata?.size ?? 0,
        mimeType: file.metadata?.mimetype ?? file.metadata?.mimeType ?? "",
        createdAt: file.created_at,
        updatedAt: file.updated_at,
        previewUrl: signed?.data?.signedUrl ?? publicUrl,
      });
    }
  }

  return {
    files,
    fileCount: files.length,
    totalBytes: files.reduce((sum, file) => sum + Number(file.size ?? 0), 0),
  };
}
