/**
 * Activity History Page — `/`
 *
 * Dashboard landing page showing recent user activity across
 * all RFI and RFP workflows. Replaces the previous generic "History" label
 * with a more descriptive name.
 *
 * ── Header ──────────────────────────────────────────────────
 * - Title: "Activity History"
 * - Description: overview of recent RFI/RFP activity
 *
 * ── Summary Stats (top cards) ───────────────────────────────
 * - Total documents count
 * - Active drafts count
 * - Submitted count
 * - Completed count
 *
 * ── Toolbar ─────────────────────────────────────────────────
 * - Filter tabs: "All Activity" | "RFI" | "RFP"
 * - Date range picker: filter by time period
 * - Search input: search activity log entries
 *
 * ── Activity Feed (main content) ────────────────────────────
 * Each feed entry shows:
 * - Action type icon: upload / edit / submit / complete / delete
 * - Description: e.g. "Uploaded RFI — Vendor Assessment Q2"
 * - Timestamp: relative time ("2 hours ago") or absolute date
 * - Status badge reflecting the action outcome
 * - Clickable — navigates to the related document
 *
 * ── Quick-Access Cards ──────────────────────────────────────
 * - "Recent Documents" section: last 3–5 documents worked on
 * - Each card shows: title, type (RFI/RFP), status, last modified
 * - Click to resume editing or view
 *
 * ── Empty State ─────────────────────────────────────────────
 * - Clock icon + "No activity yet"
 * - CTA: "Start by creating a new RFI or RFP"
 */
export default function HomePage() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          RFI / RFP Automation
        </h1>
        <p className="mt-2 text-muted-foreground">
          Upload your documents and let AI generate responses for your Request
          for Information and Request for Proposal workflows.
        </p>
      </div>
    </div>
  );
}
