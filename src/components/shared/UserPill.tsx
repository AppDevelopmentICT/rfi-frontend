import { cn } from "@/lib/utils";

interface UserPillProps {
  name?: string | null;
  email?: string | null;
  className?: string;
}

function initialsFor(name?: string | null, email?: string | null) {
  const source = name || email || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length > 1) {
    return parts
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function UserPill({ name, email, className }: UserPillProps) {
  const label = name || email || "Unknown user";
  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary ring-1 ring-primary/15">
        {initialsFor(name, email)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{label}</span>
        {email && name && (
          <span className="block truncate text-xs text-muted-foreground">{email}</span>
        )}
      </span>
    </div>
  );
}
