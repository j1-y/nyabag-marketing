import { StatusBadge as UiStatusBadge } from "@/components/ui/status-badge";

type StatusBadgeProps = {
  status: string;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return <UiStatusBadge status={status} />;
}
