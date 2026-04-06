import { createClient } from "@/lib/supabase/server";
import { getOrCreateWorkspace } from "@/lib/workspace";
import { BentoKpiCard } from "@/components/crm/bento-kpi-card";
import { DashboardCharts } from "@/components/crm/dashboard-charts";
import { DashboardToolbar } from "@/components/crm/dashboard-toolbar";
import { formatUSDShort } from "@/lib/format";
import { getAiSummary, getCustomFields } from "@/lib/ai-schema";
import {
  buildVisibleKpiRows,
  parseDashboardPrefs,
  parsePeriodDays,
  parseTeamScope,
  type KpiValues,
} from "@/lib/dashboard-prefs";
import { redirect } from "next/navigation";

function sinceIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; team?: string }>;
}) {
  const sp = await searchParams;
  const days = parsePeriodDays(sp.days);
  const team = parseTeamScope(sp.team);
  const since = sinceIso(days);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ws = await getOrCreateWorkspace(supabase, user.id);
  if (!ws) redirect("/login");

  let leadsCountQ = supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", ws.id)
    .gte("updated_at", since);
  if (team === "sales") {
    leadsCountQ = leadsCountQ.not("owner_name", "is", null);
  }

  let dealsOpenQ = supabase
    .from("deals")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", ws.id)
    .neq("stage", "won")
    .neq("stage", "lost")
    .gte("updated_at", since);
  if (team === "sales") {
    dealsOpenQ = dealsOpenQ.not("assignee_name", "is", null);
  }

  let dealsWonQ = supabase
    .from("deals")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", ws.id)
    .eq("stage", "won")
    .gte("updated_at", since);
  if (team === "sales") {
    dealsWonQ = dealsWonQ.not("assignee_name", "is", null);
  }

  let dealsAllQ = supabase
    .from("deals")
    .select("value")
    .eq("workspace_id", ws.id)
    .gte("updated_at", since);
  if (team === "sales") {
    dealsAllQ = dealsAllQ.not("assignee_name", "is", null);
  }

  let wonDealsQ = supabase
    .from("deals")
    .select("value")
    .eq("workspace_id", ws.id)
    .eq("stage", "won")
    .gte("updated_at", since);
  if (team === "sales") {
    wonDealsQ = wonDealsQ.not("assignee_name", "is", null);
  }

  const [
    leadRes,
    dealOpenRes,
    dealWonRes,
    deals,
    wonDeals,
  ] = await Promise.all([
    leadsCountQ,
    dealsOpenQ,
    dealsWonQ,
    dealsAllQ,
    wonDealsQ,
  ]);

  const dealRows = deals.data ?? [];
  const avgDeal =
    dealRows.length > 0
      ? dealRows.reduce((a, d) => a + Number(d.value ?? 0), 0) /
        dealRows.length
      : 0;
  const wonRows = wonDeals.data ?? [];
  const avgWon =
    wonRows.length > 0
      ? wonRows.reduce((a, d) => a + Number(d.value ?? 0), 0) / wonRows.length
      : 0;

  const schema = ws.ai_schema as Record<string, unknown> | null;
  const prefs = parseDashboardPrefs(schema);
  const aiSummary = getAiSummary(schema);
  const hasCustomCols =
    getCustomFields(schema, "organizations").length > 0 ||
    getCustomFields(schema, "contacts").length > 0 ||
    getCustomFields(schema, "leads").length > 0 ||
    getCustomFields(schema, "deals").length > 0 ||
    getCustomFields(schema, "tasks").length > 0 ||
    getCustomFields(schema, "products").length > 0;
  const hasVertical =
    Boolean(aiSummary) ||
    hasCustomCols ||
    (Boolean(ws.industry) && ws.industry !== "Geral");

  const values: KpiValues = {
    lead_count: String(leadRes.count ?? 0),
    lead_qualify_time: "—",
    deals_open: String(dealOpenRes.count ?? 0),
    deals_won: String(dealWonRes.count ?? 0),
    avg_won: formatUSDShort(avgWon),
    avg_deal: formatUSDShort(avgDeal),
    deal_close_time: "—",
  };

  const kpiRows = buildVisibleKpiRows(prefs, values);
  const firstRow = kpiRows.slice(0, 5);
  const secondRow = kpiRows.slice(5);

  const periodBadge =
    days === 7 ? "7 dias" : days === 30 ? "30 dias" : "90 dias";

  return (
    <div className="space-y-8">
      <DashboardToolbar days={days} team={team} prefs={prefs}>
        {hasVertical ? (
          <div className="rounded-3xl border border-violet-200/60 bg-white/50 px-5 py-4 text-sm shadow-md shadow-violet-900/[0.04] ring-1 ring-white/80 backdrop-blur-xl">
            <p className="font-semibold text-violet-950">
              {ws.industry && ws.industry !== "Geral"
                ? `Personalização ativa · ${ws.industry}`
                : "Personalização ativa"}
            </p>
            {aiSummary && (
              <p className="mt-1.5 leading-relaxed text-violet-900/75">
                {aiSummary}
              </p>
            )}
          </div>
        ) : null}
      </DashboardToolbar>

      {kpiRows.length === 0 ? (
        <p className="text-sm text-zinc-600">
          Nenhum indicador visível. Clique em &quot;Editar&quot; para mostrar
          cartões no dashboard.
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {firstRow.map((k, i) => (
              <BentoKpiCard
                key={k.id}
                label={k.label}
                value={k.value}
                index={i}
                badge={periodBadge}
              />
            ))}
          </div>
          {secondRow.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {secondRow.map((k, i) => (
                <BentoKpiCard
                  key={k.id}
                  label={k.label}
                  value={k.value}
                  index={i + firstRow.length}
                  badge={periodBadge}
                />
              ))}
            </div>
          ) : null}
        </>
      )}

      <DashboardCharts />
    </div>
  );
}
