"use client";

import { formatDistanceToNow } from "date-fns";

interface RelativeTimeProps {
  iso?: string | null;
  className?: string;
}

function formatExact(iso?: string | null) {
  if (!iso) return "Unknown time";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function RelativeTime({ iso, className }: RelativeTimeProps) {
  if (!iso) {
    return <span className={className}>Unknown</span>;
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return <span className={className}>Unknown</span>;
  }

  return (
    <span className={className} title={formatExact(iso)}>
      {formatDistanceToNow(date, { addSuffix: true })}
    </span>
  );
}

export function ExactTime({ iso, className }: RelativeTimeProps) {
  return (
    <span className={className} title={iso || undefined}>
      {formatExact(iso)}
    </span>
  );
}
