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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type SalesTrendPoint = {
  day: string;
  leads: number;
  deals: number;
  wins: number;
};

type Props = {
  /** Série temporal agregada no servidor; vazio = estado sem dados */
  trendData?: SalesTrendPoint[];
};

export function DashboardCharts({ trendData = [] }: Props) {
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
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="rounded-3xl border border-white/70 bg-white/55 shadow-lg shadow-slate-900/[0.04] ring-1 ring-white/80 backdrop-blur-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold tracking-tight text-zinc-900">
            Tendência de vendas
          </CardTitle>
          <p className="text-sm text-zinc-500">
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
                  allowDecimals
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
                  stroke="#eab308"
                  strokeWidth={2}
                  dot
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">
              Ainda não há dados agregados por dia para este período. Adicione
              leads e negócios para ver a tendência.
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="rounded-3xl border border-white/70 bg-white/55 shadow-lg shadow-slate-900/[0.04] ring-1 ring-white/80 backdrop-blur-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold tracking-tight text-zinc-900">
            Receita prevista
          </CardTitle>
          <p className="text-sm text-zinc-500">
            Projetado vs real com base na probabilidade do negócio
          </p>
        </CardHeader>
        <CardContent className="flex h-[280px] items-center justify-center text-sm text-zinc-500">
          Ligue dados de negócios para preencher este gráfico
        </CardContent>
      </Card>
    </div>
  );
}
