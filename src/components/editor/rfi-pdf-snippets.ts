import type {
  MasterEngineer,
  MasterProject,
} from "@/services/rfi-pdf.service";
import type { SidebarEntity } from "./RFIPdfSidebar";

function escapeHtml(value: string | null | undefined): string {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function row(cells: (string | null | undefined)[]): string {
  return `<tr>${cells.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`;
}

function headerRow(cells: string[]): string {
  return `<tr>${cells.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr>`;
}

export function buildProjectTable(project: MasterProject): string {
  const products = project.products
    .map((p) => p.model || p.brand || p.serial_number)
    .filter(Boolean)
    .join(", ");
  return [
    `<p><strong>${escapeHtml(project.name)}</strong></p>`,
    "<table>",
    "<thead>",
    headerRow(["Field", "Value"]),
    "</thead>",
    "<tbody>",
    row(["Project Code", project.project_code]),
    row(["Type", project.project_type]),
    row(["Status", project.status]),
    row(["Customer", project.customer?.name]),
    row(["Products", products || "—"]),
    "</tbody>",
    "</table>",
    "<p></p>",
  ].join("");
}

export function buildEngineerTable(engineer: MasterEngineer): string {
  return [
    `<p><strong>${escapeHtml(engineer.name || engineer.email)}</strong></p>`,
    "<table>",
    "<thead>",
    headerRow(["Field", "Value"]),
    "</thead>",
    "<tbody>",
    row(["Email", engineer.email]),
    row(["Roles", engineer.roles.join(", ") || "—"]),
    row(["Department", engineer.department?.name || "—"]),
    row(["Level", engineer.level || "—"]),
    row([
      "Years of Experience",
      engineer.years_experience != null
        ? `${engineer.years_experience.toFixed(1)} years`
        : "—",
    ]),
    row(["Join Date", engineer.join_date || "—"]),
    "</tbody>",
    "</table>",
    "<p></p>",
  ].join("");
}

export function buildEntityChip(entity: SidebarEntity): string {
  const label =
    entity.type === "project"
      ? entity.data.name
      : entity.data.name || entity.data.email;
  const refId =
    entity.type === "project" ? entity.data.id : String(entity.data.id);
  return `<p><span class="rfi-pdf-entity-chip" data-type="${entity.type}" data-ref-id="${escapeHtml(
    String(refId),
  )}">${escapeHtml(String(label))}</span></p>`;
}
