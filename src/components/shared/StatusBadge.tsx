import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status?: string | null;
  className?: string;
}

const statusStyles: Record<string, string> = {
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  generating: "border-blue-200 bg-blue-50 text-blue-700",
  failed: "border-red-200 bg-red-50 text-red-700",
  editing: "border-amber-200 bg-amber-50 text-amber-700",
  draft: "border-slate-200 bg-slate-50 text-slate-700",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const value = (status || "draft").toLowerCase();
  return (
    <Badge
      variant="outline"
      className={cn("capitalize", statusStyles[value] || statusStyles.draft, className)}
    >
      {value.replace(/_/g, " ")}
    </Badge>
  );
}
