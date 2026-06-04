import "server-only";

import { createAdminServiceClient } from "@/lib/admin/service";

type LogInput = {
  adminUserId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

export async function logAdminActivity({
  adminUserId,
  action,
  entityType,
  entityId,
  metadata,
}: LogInput) {
  try {
    const service = createAdminServiceClient();
    await service.from("admin_activity_logs").insert({
      admin_user_id: adminUserId,
      action,
      entity_type: entityType ?? null,
      entity_id: entityId ?? null,
      metadata: metadata ?? {},
    });
  } catch (error) {
    console.error("[admin] Failed to write activity log:", error);
  }
}
