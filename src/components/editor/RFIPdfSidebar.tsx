"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Users,
  FolderKanban,
  Loader2,
  Plus,
  GripVertical,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  listMasterEngineers,
  listMasterProjects,
  type MasterEngineer,
  type MasterProject,
} from "@/services/rfi-pdf.service";

export type SidebarEntity =
  | { type: "project"; data: MasterProject }
  | { type: "engineer"; data: MasterEngineer };

interface RFIPdfSidebarProps {
  onInsert: (entity: SidebarEntity) => void;
  disabled?: boolean;
}

type Tab = "projects" | "engineers";

const SEARCH_DEBOUNCE_MS = 300;

function useDebouncedValue<T>(value: T, delay = SEARCH_DEBOUNCE_MS): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(handle);
  }, [value, delay]);
  return debounced;
}

export function RFIPdfSidebar({ onInsert, disabled }: RFIPdfSidebarProps) {
  const [tab, setTab] = useState<Tab>("projects");

  const [projectSearch, setProjectSearch] = useState("");
  const [projectProduct, setProjectProduct] = useState("");
  const [projectYears, setProjectYears] = useState<string>("");

  const [engineerSearch, setEngineerSearch] = useState("");
  const [engineerRole, setEngineerRole] = useState("");
  const [engineerYears, setEngineerYears] = useState<string>("");

  const [projects, setProjects] = useState<MasterProject[]>([]);
  const [projectsTotal, setProjectsTotal] = useState(0);
  const [projectsLoading, setProjectsLoading] = useState(false);

  const [engineers, setEngineers] = useState<MasterEngineer[]>([]);
  const [engineersTotal, setEngineersTotal] = useState(0);
  const [engineersLoading, setEngineersLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const debProjectSearch = useDebouncedValue(projectSearch);
  const debProjectProduct = useDebouncedValue(projectProduct);
  const debProjectYears = useDebouncedValue(projectYears);
  const debEngineerSearch = useDebouncedValue(engineerSearch);
  const debEngineerRole = useDebouncedValue(engineerRole);
  const debEngineerYears = useDebouncedValue(engineerYears);

  const requestId = useRef(0);

  const loadProjects = useCallback(async () => {
    const my = ++requestId.current;
    setProjectsLoading(true);
    setError(null);
    try {
      const yearsBack = debProjectYears
        ? Number.parseInt(debProjectYears, 10)
        : undefined;
      const response = await listMasterProjects({
        search: debProjectSearch,
        product: debProjectProduct,
        yearsBack: Number.isFinite(yearsBack) ? yearsBack : undefined,
        limit: 50,
      });
      if (my !== requestId.current) return;
      setProjects(response.items);
      setProjectsTotal(response.total);
    } catch (err: unknown) {
      if (my !== requestId.current) return;
      setError(
        err instanceof Error ? err.message : "Could not load master projects."
      );
      setProjects([]);
      setProjectsTotal(0);
    } finally {
      if (my === requestId.current) {
        setProjectsLoading(false);
      }
    }
  }, [debProjectSearch, debProjectProduct, debProjectYears]);

  const loadEngineers = useCallback(async () => {
    const my = ++requestId.current;
    setEngineersLoading(true);
    setError(null);
    try {
      const min = debEngineerYears
        ? Number.parseFloat(debEngineerYears)
        : undefined;
      const response = await listMasterEngineers({
        search: debEngineerSearch,
        role: debEngineerRole,
        minExperienceYears: Number.isFinite(min) ? min : undefined,
        limit: 50,
      });
      if (my !== requestId.current) return;
      setEngineers(response.items);
      setEngineersTotal(response.total);
    } catch (err: unknown) {
      if (my !== requestId.current) return;
      setError(
        err instanceof Error ? err.message : "Could not load engineers."
      );
      setEngineers([]);
      setEngineersTotal(0);
    } finally {
      if (my === requestId.current) {
        setEngineersLoading(false);
      }
    }
  }, [debEngineerSearch, debEngineerRole, debEngineerYears]);

  useEffect(() => {
    if (tab === "projects") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadProjects();
    }
  }, [tab, loadProjects]);

  useEffect(() => {
    if (tab === "engineers") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadEngineers();
    }
  }, [tab, loadEngineers]);

  const handleDragStart = useCallback(
    (event: React.DragEvent<HTMLDivElement>, entity: SidebarEntity) => {
      const payload = JSON.stringify({ type: entity.type, data: entity.data });
      event.dataTransfer.setData("application/x-rfi-entity", payload);
      event.dataTransfer.setData("text/plain", entityLabel(entity));
      event.dataTransfer.effectAllowed = "copy";
    },
    []
  );

  const headerTotal = useMemo(
    () => (tab === "projects" ? projectsTotal : engineersTotal),
    [tab, projectsTotal, engineersTotal]
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <Card className="flex min-h-0 flex-1 flex-col border-border/70 shadow-sm">
        <CardHeader className="flex flex-col gap-3 border-b py-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderKanban className="size-4 text-muted-foreground" />
              Insert Data
            </CardTitle>
            <Badge variant="secondary">{headerTotal} results</Badge>
          </div>
          <div className="flex items-center rounded-lg border p-0.5">
            <button
              type="button"
              onClick={() => setTab("projects")}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                tab === "projects"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/40"
              )}
            >
              Projects
            </button>
            <button
              type="button"
              onClick={() => setTab("engineers")}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                tab === "engineers"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/40"
              )}
            >
              Engineers
            </button>
          </div>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3">
          {tab === "projects" ? (
            <>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    placeholder="Search project name or code"
                    className="pl-8"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={projectProduct}
                    onChange={(e) => setProjectProduct(e.target.value)}
                    placeholder="Product"
                  />
                  <Input
                    value={projectYears}
                    onChange={(e) => setProjectYears(e.target.value)}
                    placeholder="Years"
                    type="number"
                    min={1}
                    max={20}
                  />
                </div>
              </div>
              <Separator />
              <div className="-mr-1 flex-1 overflow-y-auto pr-1">
                {projectsLoading ? (
                  <LoadingState />
                ) : projects.length === 0 ? (
                  <EmptyState
                    icon={<FolderKanban className="size-5" />}
                    title="No matching projects"
                    description="Adjust the filters above or import master data."
                  />
                ) : (
                  <ul className="space-y-2">
                    {projects.map((project) => (
                      <ProjectRow
                        key={project.id}
                        project={project}
                        disabled={disabled}
                        onInsert={onInsert}
                        onDragStart={handleDragStart}
                      />
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={engineerSearch}
                    onChange={(e) => setEngineerSearch(e.target.value)}
                    placeholder="Search engineer name or email"
                    className="pl-8"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={engineerRole}
                    onChange={(e) => setEngineerRole(e.target.value)}
                    placeholder="Role (e.g. Engineer)"
                  />
                  <Input
                    value={engineerYears}
                    onChange={(e) => setEngineerYears(e.target.value)}
                    placeholder="Min years"
                    type="number"
                    min={0}
                    step={0.5}
                  />
                </div>
              </div>
              <Separator />
              <div className="-mr-1 flex-1 overflow-y-auto pr-1">
                {engineersLoading ? (
                  <LoadingState />
                ) : engineers.length === 0 ? (
                  <EmptyState
                    icon={<Users className="size-5" />}
                    title="No matching engineers"
                    description="Adjust the filters above or seed master profiles."
                  />
                ) : (
                  <ul className="space-y-2">
                    {engineers.map((engineer) => (
                      <EngineerRow
                        key={engineer.id}
                        engineer={engineer}
                        disabled={disabled}
                        onInsert={onInsert}
                        onDragStart={handleDragStart}
                      />
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
          {error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground">
            Drag a row into the editor to insert it inline, or click + to append
            a markdown table block.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ProjectRow({
  project,
  onInsert,
  onDragStart,
  disabled,
}: {
  project: MasterProject;
  onInsert: (entity: SidebarEntity) => void;
  onDragStart: (
    event: React.DragEvent<HTMLDivElement>,
    entity: SidebarEntity
  ) => void;
  disabled?: boolean;
}) {
  const entity: SidebarEntity = { type: "project", data: project };
  const previewProducts = project.products.slice(0, 3);
  return (
    <li>
      <div
        draggable={!disabled}
        onDragStart={(e) => onDragStart(e, entity)}
        className={cn(
          "group flex items-start gap-2 rounded-lg border border-border/60 bg-card p-2 transition-all overflow-hidden",
          !disabled &&
            "cursor-grab hover:border-border hover:shadow-sm active:cursor-grabbing",
          disabled && "opacity-60"
        )}
      >
        <GripVertical className="mt-1 size-3.5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={project.name}>
            {project.name}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {project.project_code || "—"} · {project.project_type || "—"}
          </p>
          {project.customer?.name && (
            <p className="truncate text-[11px] text-muted-foreground">
              {project.customer.name}
            </p>
          )}
          {previewProducts.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {previewProducts.map((product, idx) => {
                const label =
                  `${product.model || product.brand || ""}`.trim() ||
                  `Product ${idx + 1}`;
                const keySuffix = `${product.serial_number ?? ""}|${
                  product.model ?? ""
                }|${product.brand ?? ""}`;
                return (
                  <Badge
                    key={`${project.id}-pb-${
                      product.product_id ?? `i${idx}`
                    }-${keySuffix}`}
                    variant="secondary"
                    className="px-1.5 py-0 text-[10px]"
                  >
                    {label}
                  </Badge>
                );
              })}
              {project.products.length > previewProducts.length && (
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                  +{project.products.length - previewProducts.length}
                </Badge>
              )}
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Insert into editor"
          onClick={() => onInsert(entity)}
          disabled={disabled}
          className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
        >
          <Plus className="size-3.5" />
        </Button>
      </div>
    </li>
  );
}

function EngineerRow({
  engineer,
  onInsert,
  onDragStart,
  disabled,
}: {
  engineer: MasterEngineer;
  onInsert: (entity: SidebarEntity) => void;
  onDragStart: (
    event: React.DragEvent<HTMLDivElement>,
    entity: SidebarEntity
  ) => void;
  disabled?: boolean;
}) {
  const entity: SidebarEntity = { type: "engineer", data: engineer };
  return (
    <li>
      <div
        draggable={!disabled}
        onDragStart={(e) => onDragStart(e, entity)}
        className={cn(
          "group flex items-start gap-2 rounded-lg border border-border/60 bg-card p-2 transition-all",
          !disabled &&
            "cursor-grab hover:border-border hover:shadow-sm active:cursor-grabbing",
          disabled && "opacity-60"
        )}
      >
        <GripVertical className="mt-1 size-3.5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {engineer.name || engineer.email}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {engineer.roles.slice(0, 2).join(", ") || "—"}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {engineer.department?.name || "—"}
          </p>
          {engineer.years_experience != null && (
            <Badge variant="secondary" className="mt-1 px-1.5 py-0 text-[10px]">
              {engineer.years_experience.toFixed(1)} yrs
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Insert into editor"
          onClick={() => onInsert(entity)}
          disabled={disabled}
          className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
        >
          <Plus className="size-3.5" />
        </Button>
      </div>
    </li>
  );
}

function LoadingState() {
  return (
    <div className="flex h-full items-center justify-center py-10 text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm">
      <div className="rounded-full bg-muted p-2 text-muted-foreground">
        {icon}
      </div>
      <p className="font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function entityLabel(entity: SidebarEntity): string {
  if (entity.type === "project") return entity.data.name;
  return entity.data.name || entity.data.email;
}
