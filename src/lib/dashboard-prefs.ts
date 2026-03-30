/** Preferências do dashboard guardadas em `workspaces.ai_schema.dashboard`. */

export const KPI_DEFINITIONS = [
  {
    id: "lead_count",
    defaultLabel: "Total de leads",
  },
  {
    id: "lead_qualify_time",
    defaultLabel: "Tempo médio para qualificar lead",
  },
  {
    id: "deals_open",
    defaultLabel: "Negócios em curso",
  },
  {
    id: "deals_won",
    defaultLabel: "Negócios ganhos",
  },
  {
    id: "avg_won",
    defaultLabel: "Valor médio ganho",
  },
  {
    id: "avg_deal",
    defaultLabel: "Valor médio do negócio",
  },
  {
    id: "deal_close_time",
    defaultLabel: "Tempo médio para fechar negócio",
  },
] as const;

export type KpiId = (typeof KPI_DEFINITIONS)[number]["id"];

export type DashboardPrefs = {
  kpiLabels: Partial<Record<KpiId, string>>;
  hiddenKpis: KpiId[];
};

export function parseDashboardPrefs(
  aiSchema: Record<string, unknown> | null | undefined
): DashboardPrefs {
  if (!aiSchema) return { kpiLabels: {}, hiddenKpis: [] };
  const raw = aiSchema.dashboard;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { kpiLabels: {}, hiddenKpis: [] };
  }
  const d = raw as Record<string, unknown>;
  const labels: Partial<Record<KpiId, string>> = {};
  const kl = d.kpiLabels;
  if (kl && typeof kl === "object" && !Array.isArray(kl)) {
    for (const def of KPI_DEFINITIONS) {
      const v = (kl as Record<string, unknown>)[def.id];
      if (typeof v === "string" && v.trim()) labels[def.id] = v.trim();
    }
  }
  const hidden: KpiId[] = [];
  const hi = d.hiddenKpis;
  if (Array.isArray(hi)) {
    const allowed = new Set(KPI_DEFINITIONS.map((x) => x.id));
    for (const x of hi) {
      if (typeof x === "string" && allowed.has(x as KpiId)) {
        hidden.push(x as KpiId);
      }
    }
  }
  return { kpiLabels: labels, hiddenKpis: hidden };
}

export function kpiLabel(
  id: KpiId,
  prefs: DashboardPrefs
): string {
  const def = KPI_DEFINITIONS.find((k) => k.id === id);
  const fallback = def?.defaultLabel ?? id;
  return prefs.kpiLabels[id]?.trim() || fallback;
}

export function isKpiVisible(id: KpiId, prefs: DashboardPrefs): boolean {
  return !prefs.hiddenKpis.includes(id);
}

export type KpiValues = Record<KpiId, string>;

export function buildVisibleKpiRows(
  prefs: DashboardPrefs,
  values: KpiValues
): { id: KpiId; label: string; value: string }[] {
  return KPI_DEFINITIONS.filter((def) => isKpiVisible(def.id, prefs)).map(
    (def) => ({
      id: def.id,
      label: kpiLabel(def.id, prefs),
      value: values[def.id] ?? "—",
    })
  );
}

export function parsePeriodDays(raw: string | undefined): 7 | 30 | 90 {
  const n = Number(raw);
  if (n === 7 || n === 30 || n === 90) return n;
  return 30;
}

export type TeamScope = "all" | "sales";

/** Por omissão, alinhado com o UI anterior: &quot;Equipa de vendas&quot;. */
export function parseTeamScope(raw: string | undefined): TeamScope {
  if (raw === "all") return "all";
  return "sales";
}
