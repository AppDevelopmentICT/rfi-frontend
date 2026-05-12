import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status?: string | null;
  className?: string;
}

const statusStyles: Record<string, string> = {
  completed: "border-slate-200/80 bg-slate-50/60 text-slate-700",
  generating: "border-slate-200 bg-slate-50 text-slate-600",
  failed: "border-slate-200 bg-slate-50 text-slate-600",
  editing: "border-slate-200 bg-slate-50 text-slate-600",
  draft: "border-slate-200 bg-slate-50 text-slate-600",
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
