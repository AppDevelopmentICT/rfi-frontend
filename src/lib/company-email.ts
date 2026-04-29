/** Allowed sign-in domains (comma-separated). Empty or * = skip check in UI (backend may still enforce). */

export function getCompanyEmailDomains(): string[] | null {
  const raw = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS?.trim();
  if (!raw || raw === "*") return null;
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

export function isCompanyEmail(email: string | undefined | null): boolean {
  const domains = getCompanyEmailDomains();
  if (!domains?.length) return true;
  const trimmed = email?.trim().toLowerCase() ?? "";
  const at = trimmed.lastIndexOf("@");
  if (at <= 0) return false;
  const domain = trimmed.slice(at + 1);
  return domains.includes(domain);
}
