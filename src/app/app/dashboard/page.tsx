import { createClient } from "@/lib/supabase/server";
import { getOrCreateWorkspace } from "@/lib/workspace";
import { DashboardCharts } from "@/components/crm/dashboard-charts";
import { DashboardToolbar } from "@/components/crm/dashboard-toolbar";
import { Card, CardContent } from "@/components/ui/card";
import { userRunner } from "@/lib/db/pool";
import { formatBRL } from "@/lib/format";
import { getAiSummary, getCustomFields } from "@/lib/ai-schema";
import {
  buildVisibleKpiRows,
  parseDashboardPrefs,
  parsePeriodDays,
  parseTeamScope,
  type KpiValues,
} from "@/lib/dashboard-prefs";
import { redirect } from "next/navigation";
import { showingInactive } from "@/lib/active-view";
import { ShowInactiveToggle } from "@/components/crm/show-inactive-toggle";

function sinceIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; team?: string; inativos?: string }>;
}) {
  const sp = await searchParams;
  const days = parsePeriodDays(sp.days);
  const team = parseTeamScope(sp.team);
  const since = sinceIso(days);
  const activeFlag = !showingInactive(sp);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ws = await getOrCreateWorkspace(supabase, user.id);
  if (!ws) redirect("/login");

  const run = userRunner(user.id);
  const params = [ws.id, activeFlag, since, team === "sales"];
  const [metrics, series] = await Promise.all([
    run(`WITH l AS (SELECT * FROM leads WHERE workspace_id=$1 AND active=$2 AND (NOT $4::boolean OR owner_name IS NOT NULL)),
    d AS (SELECT * FROM deals WHERE workspace_id=$1 AND active=$2 AND (NOT $4::boolean OR assignee_name IS NOT NULL))
    SELECT (SELECT count(*) FROM l WHERE created_at >= $3::timestamptz) AS leads,
    (SELECT avg(extract(epoch FROM (qualified_at-created_at))/86400) FROM l WHERE qualified_at >= $3::timestamptz) AS qualify_days,
    count(*) FILTER (WHERE outcome='open') AS open,
    count(*) FILTER (WHERE outcome='won' AND closed_at >= $3::timestamptz) AS won,
    avg(value) FILTER (WHERE created_at >= $3::timestamptz) AS avg_deal,
    avg(value) FILTER (WHERE outcome='won' AND closed_at >= $3::timestamptz) AS avg_won,
    avg(extract(epoch FROM (closed_at-created_at))/86400) FILTER (WHERE outcome='won' AND closed_at >= $3::timestamptz) AS close_days,
    coalesce(sum(value) FILTER (WHERE outcome='won' AND closed_at >= $3::timestamptz),0) AS revenue,
    coalesce(sum(value*probability) FILTER (WHERE outcome='open' AND expected_close_at BETWEEN CURRENT_DATE AND CURRENT_DATE+30),0) AS forecast
    FROM d`,params),
    run(`WITH events AS (
      SELECT (created_at AT TIME ZONE 'America/Sao_Paulo')::date AS day, 1 AS leads, 0 AS deals, 0 AS wins FROM leads WHERE workspace_id=$1 AND active=$2 AND created_at >= $3::timestamptz AND (NOT $4::boolean OR owner_name IS NOT NULL)
      UNION ALL SELECT (created_at AT TIME ZONE 'America/Sao_Paulo')::date,0,1,0 FROM deals WHERE workspace_id=$1 AND active=$2 AND created_at >= $3::timestamptz AND (NOT $4::boolean OR assignee_name IS NOT NULL)
      UNION ALL SELECT (closed_at AT TIME ZONE 'America/Sao_Paulo')::date,0,0,1 FROM deals WHERE workspace_id=$1 AND active=$2 AND outcome='won' AND closed_at >= $3::timestamptz AND (NOT $4::boolean OR assignee_name IS NOT NULL))
      SELECT to_char(d.day,'DD/MM') AS day, coalesce(sum(e.leads),0)::int AS leads, coalesce(sum(e.deals),0)::int AS deals, coalesce(sum(e.wins),0)::int AS wins
      FROM generate_series(($3::timestamptz AT TIME ZONE 'America/Sao_Paulo')::date,(now() AT TIME ZONE 'America/Sao_Paulo')::date,'1 day') AS d(day)
      LEFT JOIN events e ON e.day=d.day GROUP BY d.day ORDER BY d.day`,params)
  ]);
  const metric = metrics.rows[0];
  const duration = (value: unknown) => value == null ? "—" : Number(value).toLocaleString("pt-BR", {maximumFractionDigits:1}) + " dias";

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
    lead_count: String(metric.leads),
    lead_qualify_time: duration(metric.qualify_days),
    deals_open: String(metric.open),
    deals_won: String(metric.won),
    avg_won: formatBRL(Number(metric.avg_won ?? 0)),
    avg_deal: formatBRL(Number(metric.avg_deal ?? 0)),
    deal_close_time: duration(metric.close_days),
  };

  const kpiRows = buildVisibleKpiRows(prefs, values);
  const firstRow = kpiRows.slice(0, 5);
  const secondRow = kpiRows.slice(5);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <ShowInactiveToggle />
      </div>
      <DashboardToolbar days={days} team={team} prefs={prefs}>
        {hasVertical ? (
          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm">
            <p className="font-medium text-blue-950">
              {ws.industry && ws.industry !== "Geral"
                ? `Personalização ativa · ${ws.industry}`
                : "Personalização ativa"}
            </p>
            {aiSummary && (
              <p className="mt-1 text-blue-900/80">{aiSummary}</p>
            )}
          </div>
        ) : null}
      </DashboardToolbar>

      <DashboardCharts trendData={series.rows} revenue={Number(metric.revenue)} forecast={Number(metric.forecast)} />

      {kpiRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum indicador visível. Clique em &quot;Editar&quot; para mostrar
          cartões no dashboard.
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {firstRow.map((k) => (
              <Card
                key={k.id}
                className="border-border/80 bg-white shadow-sm"
              >
                <CardContent className="p-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    {k.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums">
                    {k.value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          {secondRow.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {secondRow.map((k) => (
                <Card
                  key={k.id}
                  className="border-border/80 bg-white shadow-sm"
                >
                  <CardContent className="p-4">
                    <p className="text-xs font-medium text-muted-foreground">
                      {k.label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold tabular-nums">
                      {k.value}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}
        </>
      )}

      <p className="max-w-4xl text-xs leading-relaxed text-muted-foreground">Novos registros por data de criação; ganhos por data de fechamento. Negócios abertos representam o estoque atual. Datas em America/Sao_Paulo. Registros antigos sem data de fechamento não entram no período.</p>
    </div>
  );
}
