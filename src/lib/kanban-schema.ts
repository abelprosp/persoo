import type { KanbanColumnDef } from "@/components/crm/kanban-board";

export const LEAD_KANBAN_CARD_FIELD_KEYS = [
  "company",
  "email",
  "phone",
  "owner",
  "last_activity",
  "custom",
] as const;

export type LeadKanbanCardFieldKey =
  (typeof LEAD_KANBAN_CARD_FIELD_KEYS)[number];

export type LeadKanbanCardVisibility = Record<
  LeadKanbanCardFieldKey,
  boolean
>;

export const DEAL_KANBAN_CARD_FIELD_KEYS = [
  "org_or_title",
  "value",
  "email",
  "phone",
  "assignee",
  "last_updated",
  "custom",
] as const;

export type DealKanbanCardFieldKey =
  (typeof DEAL_KANBAN_CARD_FIELD_KEYS)[number];

export type DealKanbanCardVisibility = Record<
  DealKanbanCardFieldKey,
  boolean
>;

export const TASK_KANBAN_CARD_FIELD_KEYS = [
  "status",
  "priority",
  "due_at",
  "assignee",
  "updated_at",
  "custom",
] as const;

export type TaskKanbanCardFieldKey =
  (typeof TASK_KANBAN_CARD_FIELD_KEYS)[number];

export type TaskKanbanCardVisibility = Record<
  TaskKanbanCardFieldKey,
  boolean
>;

const DEFAULT_LEAD_CARD_VISIBILITY: LeadKanbanCardVisibility = {
  company: true,
  email: true,
  phone: true,
  owner: true,
  last_activity: true,
  custom: true,
};

const DEFAULT_DEAL_CARD_VISIBILITY: DealKanbanCardVisibility = {
  org_or_title: true,
  value: true,
  email: true,
  phone: true,
  assignee: true,
  last_updated: true,
  custom: true,
};

const DEFAULT_TASK_CARD_VISIBILITY: TaskKanbanCardVisibility = {
  status: true,
  priority: true,
  due_at: true,
  assignee: true,
  updated_at: true,
  custom: true,
};

/** Visibilidade de linhas no cartão Kanban de leads (guardado em `ai_schema.kanban.leadCardFields`). */
export function getLeadKanbanCardVisibility(
  aiSchema: Record<string, unknown> | null | undefined
): LeadKanbanCardVisibility {
  const out = { ...DEFAULT_LEAD_CARD_VISIBILITY };
  const kanban = aiSchema?.kanban;
  if (!kanban || typeof kanban !== "object" || Array.isArray(kanban)) {
    return out;
  }
  const raw = (kanban as Record<string, unknown>).leadCardFields;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  const o = raw as Record<string, unknown>;
  for (const k of LEAD_KANBAN_CARD_FIELD_KEYS) {
    if (typeof o[k] === "boolean") out[k] = o[k];
  }
  return out;
}

/** Visibilidade de linhas no cartão Kanban de negócios (`ai_schema.kanban.dealCardFields`). */
export function getDealKanbanCardVisibility(
  aiSchema: Record<string, unknown> | null | undefined
): DealKanbanCardVisibility {
  const out = { ...DEFAULT_DEAL_CARD_VISIBILITY };
  const kanban = aiSchema?.kanban;
  if (!kanban || typeof kanban !== "object" || Array.isArray(kanban)) {
    return out;
  }
  const raw = (kanban as Record<string, unknown>).dealCardFields;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  const o = raw as Record<string, unknown>;
  for (const k of DEAL_KANBAN_CARD_FIELD_KEYS) {
    if (typeof o[k] === "boolean") out[k] = o[k];
  }
  return out;
}

/** Visibilidade de linhas no cartão Kanban de tarefas (`ai_schema.kanban.taskCardFields`). */
export function getTaskKanbanCardVisibility(
  aiSchema: Record<string, unknown> | null | undefined
): TaskKanbanCardVisibility {
  const out = { ...DEFAULT_TASK_CARD_VISIBILITY };
  const kanban = aiSchema?.kanban;
  if (!kanban || typeof kanban !== "object" || Array.isArray(kanban)) {
    return out;
  }
  const raw = (kanban as Record<string, unknown>).taskCardFields;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  const o = raw as Record<string, unknown>;
  for (const k of TASK_KANBAN_CARD_FIELD_KEYS) {
    if (typeof o[k] === "boolean") out[k] = o[k];
  }
  return out;
}

/** Colunas padrão quando a IA não define pipeline ou a lista é inválida. */
export const DEFAULT_LEAD_COLUMNS: KanbanColumnDef[] = [
  { id: "new", title: "Novo", dotClass: "bg-zinc-900 ring-zinc-900/30" },
  {
    id: "contacted",
    title: "Contactado",
    dotClass: "bg-sky-500 ring-sky-500/30",
  },
  { id: "nurture", title: "Nutrir", dotClass: "bg-emerald-500 ring-emerald-500/30" },
  {
    id: "qualified",
    title: "Qualificado",
    dotClass: "bg-red-500 ring-red-500/30",
  },
  {
    id: "converted",
    title: "Convertido",
    dotClass: "bg-violet-500 ring-violet-500/30",
  },
];

export const DEFAULT_DEAL_COLUMNS: KanbanColumnDef[] = [
  {
    id: "qualification",
    title: "Qualificação",
    dotClass: "bg-zinc-900 ring-zinc-900/30",
  },
  { id: "demo", title: "Demo", dotClass: "bg-sky-500 ring-sky-500/30" },
  {
    id: "proposal",
    title: "Proposta / orçamento",
    dotClass: "bg-emerald-500 ring-emerald-500/30",
  },
  {
    id: "negotiation",
    title: "Negociação",
    dotClass: "bg-red-500 ring-red-500/30",
  },
  {
    id: "ready_to_close",
    title: "Pronto a fechar",
    dotClass: "bg-pink-500 ring-pink-500/30",
  },
  { id: "won", title: "Ganho", dotClass: "bg-violet-600 ring-violet-600/30" },
];

export const DEFAULT_TASK_COLUMNS: KanbanColumnDef[] = [
  { id: "backlog", title: "Backlog", dotClass: "bg-zinc-900 ring-zinc-900/30" },
  { id: "todo", title: "A fazer", dotClass: "bg-sky-500 ring-sky-500/30" },
  {
    id: "in_progress",
    title: "Em progresso",
    dotClass: "bg-amber-500 ring-amber-500/30",
  },
  { id: "done", title: "Concluído", dotClass: "bg-emerald-500 ring-emerald-500/30" },
];

const DOT_PALETTE = [
  "bg-zinc-900 ring-zinc-900/30",
  "bg-sky-500 ring-sky-500/30",
  "bg-emerald-500 ring-emerald-500/30",
  "bg-amber-500 ring-amber-500/30",
  "bg-red-500 ring-red-500/30",
  "bg-pink-500 ring-pink-500/30",
  "bg-violet-600 ring-violet-600/30",
  "bg-cyan-500 ring-cyan-500/30",
  "bg-orange-500 ring-orange-500/30",
  "bg-teal-500 ring-teal-500/30",
] as const;

/** Converte texto em id estável para `status` / `stage` na base de dados. */
export function slugifyKanbanId(raw: string): string {
  const s = raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
  if (!s || !/^[a-z]/.test(s)) return "";
  return s.length > 48 ? s.slice(0, 48) : s;
}

function parseKanbanColumnArray(
  raw: unknown,
  fallback: KanbanColumnDef[]
): KanbanColumnDef[] {
  if (!Array.isArray(raw)) return fallback;
  const seen = new Set<string>();
  const out: KanbanColumnDef[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id =
      typeof o.id === "string"
        ? slugifyKanbanId(o.id)
        : typeof o.id === "number"
          ? slugifyKanbanId(String(o.id))
          : "";
    if (!id || seen.has(id)) continue;
    const titleRaw = typeof o.title === "string" ? o.title.trim() : "";
    const title =
      titleRaw.length > 0 ? titleRaw.slice(0, 80) : id.replace(/_/g, " ");
    seen.add(id);
    const dotClass = DOT_PALETTE[out.length % DOT_PALETTE.length];
    out.push({ id, title, dotClass });
  }
  return out.length >= 2 ? out : fallback;
}

export function getLeadKanbanColumns(
  aiSchema: Record<string, unknown> | null | undefined
): KanbanColumnDef[] {
  const kanban = aiSchema?.kanban;
  if (!kanban || typeof kanban !== "object" || Array.isArray(kanban)) {
    return DEFAULT_LEAD_COLUMNS;
  }
  const leads = (kanban as Record<string, unknown>).leads;
  return parseKanbanColumnArray(leads, DEFAULT_LEAD_COLUMNS);
}

export function getDealKanbanColumns(
  aiSchema: Record<string, unknown> | null | undefined
): KanbanColumnDef[] {
  const kanban = aiSchema?.kanban;
  if (!kanban || typeof kanban !== "object" || Array.isArray(kanban)) {
    return DEFAULT_DEAL_COLUMNS;
  }
  const deals = (kanban as Record<string, unknown>).deals;
  return parseKanbanColumnArray(deals, DEFAULT_DEAL_COLUMNS);
}

export function getTaskKanbanColumns(
  aiSchema: Record<string, unknown> | null | undefined
): KanbanColumnDef[] {
  const kanban = aiSchema?.kanban;
  if (!kanban || typeof kanban !== "object" || Array.isArray(kanban)) {
    return DEFAULT_TASK_COLUMNS;
  }
  const tasks = (kanban as Record<string, unknown>).tasks;
  return parseKanbanColumnArray(tasks, DEFAULT_TASK_COLUMNS);
}

/** Colunas extra no Kanban para estados na BD que já não existem no pipeline IA. */
export function withOrphanKanbanColumns(
  columns: KanbanColumnDef[],
  itemsByColumn: Record<string, Record<string, unknown>[]>
): KanbanColumnDef[] {
  const ids = new Set(columns.map((c) => c.id));
  const orphans = Object.keys(itemsByColumn)
    .filter((k) => (itemsByColumn[k]?.length ?? 0) > 0 && !ids.has(k))
    .sort();
  return [
    ...columns,
    ...orphans.map((id, i) => ({
      id,
      title: `Outros · ${id.replace(/_/g, " ")}`,
      dotClass: DOT_PALETTE[(columns.length + i) % DOT_PALETTE.length],
    })),
  ];
}

export function firstLeadStatusId(
  aiSchema: Record<string, unknown> | null | undefined
): string {
  const cols = getLeadKanbanColumns(aiSchema);
  return cols[0]?.id ?? "new";
}

export function firstDealStageId(
  aiSchema: Record<string, unknown> | null | undefined
): string {
  const cols = getDealKanbanColumns(aiSchema);
  return cols[0]?.id ?? "qualification";
}

export function firstTaskStatusId(
  aiSchema: Record<string, unknown> | null | undefined
): string {
  const cols = getTaskKanbanColumns(aiSchema);
  return cols[0]?.id ?? "todo";
}

export function allowedLeadStatusSet(
  aiSchema: Record<string, unknown> | null | undefined
): Set<string> {
  return new Set(getLeadKanbanColumns(aiSchema).map((c) => c.id));
}

export function allowedDealStageSet(
  aiSchema: Record<string, unknown> | null | undefined
): Set<string> {
  return new Set(getDealKanbanColumns(aiSchema).map((c) => c.id));
}

export function allowedTaskStatusSet(
  aiSchema: Record<string, unknown> | null | undefined
): Set<string> {
  return new Set(getTaskKanbanColumns(aiSchema).map((c) => c.id));
}
