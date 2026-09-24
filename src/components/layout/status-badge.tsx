import { Badge } from "@/components/ui/badge";

/** Semantic tokens, so status colour survives a palette change. */
const TONE: Record<string, string> = {
  ACTIVE: "bg-success/15 text-success",
  AVAILABLE: "bg-success/15 text-success",
  SOLD: "bg-role-buyer/15 text-role-buyer",
  IN_TRANSIT: "bg-warning/15 text-warning",
  IN_TRANSPORT: "bg-warning/15 text-warning",
  PENDING: "bg-warning/15 text-warning",
  ASSIGNED: "bg-warning/15 text-warning",
  DELIVERED: "bg-primary/15 text-primary",
  SETTLED: "bg-primary/15 text-primary",
  CONFIRMED: "bg-primary/15 text-primary",
  DRAFT: "bg-muted text-muted-foreground",
  EXPIRED: "bg-muted text-muted-foreground",
  RESERVED: "bg-muted text-muted-foreground",
  CANCELLED: "bg-destructive/15 text-destructive",
};

export function StatusBadge({
  status,
  label,
}: {
  status: string;
  label: string;
}) {
  return (
    <Badge variant="secondary" className={TONE[status] ?? ""}>
      {label}
    </Badge>
  );
}
