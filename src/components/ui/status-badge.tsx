import { Badge, type BadgeProps } from "@/components/ui/badge";

const statusVariant: Record<string, BadgeProps["variant"]> = {
  active: "success",
  admin: "success",
  onboarded: "success",
  completed: "success",
  sent: "success",
  failed: "destructive",
  archived: "destructive",
  "not-interested": "destructive",
  not_interested: "destructive",
  warning: "warning",
  pending: "warning",
  queued: "warning",
  processing: "warning",
  onboarding: "ai",
};

function formatStatus(status: string) {
  return status.replaceAll("_", " ").replaceAll("-", " ");
}

type StatusBadgeProps = Omit<BadgeProps, "variant" | "children"> & {
  status: string;
};

function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  const normalized = status.toLowerCase();

  return (
    <Badge
      className={className}
      variant={statusVariant[normalized] ?? "subtle"}
      {...props}
    >
      {formatStatus(status)}
    </Badge>
  );
}

export { StatusBadge };
