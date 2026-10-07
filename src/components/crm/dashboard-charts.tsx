"use client";

import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { formatBRL } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";

export type SalesTrendPoint = {
  day: string;
  leads: number;
  deals: number;
  wins: number;
};

type Props = {
  /** Série temporal agregada no servidor; vazio = estado sem dados */
  trendData?: SalesTrendPoint[];
  revenue?: number;
  forecast?: number;
};

export function DashboardCharts({ trendData = [], revenue = 0, forecast = 0 }: Props) {
  const hasTrend =
    trendData.length > 0 &&
    trendData.some(
      (p) => (p.leads ?? 0) > 0 || (p.deals ?? 0) > 0 || (p.wins ?? 0) > 0
    );

  const maxY = hasTrend
    ? Math.max(
        1,
        ...trendData.flatMap((p) => [p.leads ?? 0, p.deals ?? 0, p.wins ?? 0])
      )
    : 1;

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[0.85fr_1.1fr_1.1fr]">
      <section className="relative flex min-h-80 flex-col overflow-hidden rounded-[1.75rem] bg-[#0c1428] p-6 text-white lg:col-span-2 xl:col-span-1">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-blue-300"><Sparkles className="size-4" /> Feito para sua operação</div>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight">Seu CRM com IA</h2>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-400">Personalize campos e etapas de venda para o jeito que sua equipe trabalha.</p>
        <div className="persoo-ai-orbit mx-auto my-4" aria-hidden />
        <Link href="/app/settings/ai" className="relative mt-auto flex items-center justify-between rounded-full bg-white/10 py-2 pl-5 pr-2 text-sm font-medium hover:bg-white/20">Personalizar meu CRM<span className="rounded-full bg-blue-600 p-2"><ArrowUpRight className="size-5" /></span></Link>
      </section>
      <Card className="border-border/80 bg-white shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            Tendência de vendas
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Desempenho diário de leads, negócios e vitórias
          </p>
        </CardHeader>
        <CardContent className="h-[280px] pt-2">
          {hasTrend ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  domain={[0, Math.ceil(maxY * 1.15)]}
                  allowDecimals={false}
                />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="leads"
                  name="Leads"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot
                />
                <Line
                  type="monotone"
                  dataKey="deals"
                  name="Negócios"
                  stroke="#14b8a6"
                  strokeWidth={2}
                  dot
                />
                <Line
                  type="monotone"
                  dataKey="wins"
                  name="Ganhos"
                  stroke="#ff7954"
                  strokeWidth={2}
                  dot
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Ainda não há dados agregados por dia para este período. Adicione
              leads e negócios para ver a tendência.
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="border-border/80 bg-white shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            Receita prevista
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Receita realizada no período e previsão para os próximos 30 dias
          </p>
        </CardHeader>
        <CardContent className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
          <dl className="space-y-5 text-center"><div><dt>Receita realizada</dt><dd className="text-3xl font-semibold text-foreground">{formatBRL(revenue)}</dd></div><div><dt>Previsão ponderada</dt><dd className="text-3xl font-semibold text-foreground">{formatBRL(forecast)}</dd></div><p className="max-w-sm text-xs">Soma do valor × probabilidade dos negócios abertos com fechamento previsto nos próximos 30 dias. Não representa receita garantida.</p></dl>
        </CardContent>
      </Card>
    </div>
  );
}
