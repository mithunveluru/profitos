import { clsx } from "clsx";

const statusStyles = {
  draft: "bg-muted/20 text-muted", approved: "bg-success/10 text-success",
  pending: "bg-warning/10 text-warning", rejected: "bg-danger/10 text-danger",
  received: "bg-brand/10 text-brand-light", paid: "bg-success/10 text-success",
  unpaid: "bg-warning/10 text-warning", overdue: "bg-danger/10 text-danger",
  partial: "bg-brand/10 text-brand-light",
};

export function Badge({ label, status, className }) {
  return (
    <span className={clsx(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
      statusStyles[status?.toLowerCase()] ?? "bg-surface-3 text-gray-300", className,
    )}>
      {label ?? status}
    </span>
  );
}