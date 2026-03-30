export type CardLabel = { id: string; name: string; color: string };

export type CardTeamMember = { id: string; name: string };

export type CardDocument = { id: string; title: string; url: string };

export type CardChecklistItem = { id: string; text: string; done: boolean };

export type CardChecklist = {
  id: string;
  title: string;
  items: CardChecklistItem[];
};

export type CardEnrichment = {
  checklists: CardChecklist[];
  documents: CardDocument[];
  team_members: CardTeamMember[];
  labels: CardLabel[];
};

function newId(): string {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2, 12)}`;
}

export function emptyCardEnrichment(): CardEnrichment {
  return {
    checklists: [],
    documents: [],
    team_members: [],
    labels: [],
  };
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function parseCardEnrichment(raw: unknown): CardEnrichment {
  const e = emptyCardEnrichment();
  if (!isObj(raw)) return e;

  if (Array.isArray(raw.checklists)) {
    e.checklists = raw.checklists
      .filter(isObj)
      .map((c) => ({
        id: String(c.id ?? newId()),
        title: String(c.title ?? "Checklist").slice(0, 200),
        items: Array.isArray(c.items)
          ? c.items
              .filter(isObj)
              .map((it) => ({
                id: String(it.id ?? newId()),
                text: String(it.text ?? "").slice(0, 500),
                done: Boolean(it.done),
              }))
          : [],
      }))
      .slice(0, 20);
  }
  if (Array.isArray(raw.documents)) {
    e.documents = raw.documents
      .filter(isObj)
      .map((d) => ({
        id: String(d.id ?? newId()),
        title: String(d.title ?? "Documento").slice(0, 200),
        url: String(d.url ?? "").slice(0, 2000),
      }))
      .filter((d) => d.url.length > 0)
      .slice(0, 50);
  }
  if (Array.isArray(raw.team_members)) {
    e.team_members = raw.team_members
      .filter(isObj)
      .map((t) => ({
        id: String(t.id ?? newId()),
        name: String(t.name ?? "").slice(0, 120),
      }))
      .filter((t) => t.name.length > 0)
      .slice(0, 30);
  }
  if (Array.isArray(raw.labels)) {
    e.labels = raw.labels
      .filter(isObj)
      .map((l) => ({
        id: String(l.id ?? newId()),
        name: String(l.name ?? "").slice(0, 80),
        color: String(l.color ?? "slate").slice(0, 32),
      }))
      .filter((l) => l.name.length > 0)
      .slice(0, 20);
  }
  return e;
}

export function rowToCardEnrichment(row: {
  checklists?: unknown;
  documents?: unknown;
  team_members?: unknown;
  labels?: unknown;
}): CardEnrichment {
  return parseCardEnrichment({
    checklists: row.checklists,
    documents: row.documents,
    team_members: row.team_members,
    labels: row.labels,
  });
}

export function checklistProgress(enrichment: CardEnrichment | null | undefined): {
  done: number;
  total: number;
} {
  if (!enrichment?.checklists?.length) return { done: 0, total: 0 };
  let done = 0;
  let total = 0;
  for (const cl of enrichment.checklists) {
    for (const it of cl.items) {
      total += 1;
      if (it.done) done += 1;
    }
  }
  return { done, total };
}

const LABEL_RING: Record<string, string> = {
  slate: "border-slate-400 bg-slate-100 text-slate-800",
  blue: "border-blue-400 bg-blue-50 text-blue-900",
  green: "border-emerald-400 bg-emerald-50 text-emerald-900",
  amber: "border-amber-400 bg-amber-50 text-amber-950",
  red: "border-red-400 bg-red-50 text-red-900",
  violet: "border-violet-400 bg-violet-50 text-violet-900",
};

export function labelChipClass(color: string): string {
  return LABEL_RING[color] ?? LABEL_RING.slate;
}
