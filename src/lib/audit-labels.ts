/** Canonical audit `action` strings → short UI titles (admin audit log, activity cards). */
const AUDIT_ACTION_LABELS: Record<string, string> = {
  "auth.login": "User Login",
  "auth.logout": "User Logout",

  "admin.user_role_update": "User Role Updated",

  "rfi.autofill": "RFI Autofill",
  "rfi.generate_started": "RFI Generation Started",
  "rfi.lock_acquired": "RFI Lock Acquired",
  "rfi.lock_released": "RFI Lock Released",
  "rfi.update_cell": "RFI Cell Updated",
  "rfi.save": "Save RFI",
  "rfi.export": "Export RFI",
  "rfi.soft_delete": "Move RFI to Trash",
  "rfi.restore": "Restore RFI Project",
  "rfi.hard_delete": "Permanently Delete RFI",

  "rfp.create": "Create RFP Project",
  "rfp.lock_acquired": "RFP Lock Acquired",
  "rfp.lock_released": "RFP Lock Released",
  "rfp.save": "Save RFP",
  "rfp.prompt": "RFP Chat Prompt",
  "rfp.assistant": "RFP AI Response",
  "rfp.background_generate_started": "RFP Background Generation Started",
  "rfp.background_generate_completed": "RFP Background Generation Completed",
  "rfp.background_generate_failed": "RFP Background Generation Failed",
  "rfp.soft_delete": "Move RFP to Trash",
  "rfp.restore": "Restore RFP Project",
  "rfp.hard_delete": "Permanently Delete RFP",

  "knowledge.ingest": "Knowledge Base Ingest",
  "knowledge.sync": "Knowledge Base Sync",
  "knowledge.delete": "Knowledge Base Delete",
  "knowledge.bulk_delete": "Knowledge Base Bulk Delete",
  "knowledge.download": "Knowledge Base Download",

  "ai.generate_all": "Generate All Answers",
  "ai.regenerate": "Regenerate Answer",

  "document.upload_excel": "Upload Excel",
};

const AUDIT_RESOURCE_LABELS: Record<string, string> = {
  user: "User",
  rfi_project: "RFI Project",
  rfp_project: "RFP Project",
  rfi: "RFI",
  document: "Knowledge Document",
  minio: "Storage",
  session: "Session",
  excel: "Excel",
};

function titleCaseWords(text: string): string {
  return text
    .split(/[\s._]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Human-readable title for an audit `action` (e.g. `auth.login` → "User Login").
 * Unknown actions get a best-effort title from dot / underscore segments.
 */
export function formatAuditActionTitle(action: string): string {
  const trimmed = action.trim();
  if (!trimmed) return "—";
  const mapped = AUDIT_ACTION_LABELS[trimmed];
  if (mapped) return mapped;
  return titleCaseWords(trimmed.replace(/\./g, " "));
}

/**
 * Human-readable label for `resource_type` from the audit API.
 */
export function formatAuditResourceType(resourceType: string): string {
  const trimmed = resourceType.trim();
  if (!trimmed) return "—";
  const mapped = AUDIT_RESOURCE_LABELS[trimmed];
  if (mapped) return mapped;
  return titleCaseWords(trimmed.replace(/_/g, " "));
}
