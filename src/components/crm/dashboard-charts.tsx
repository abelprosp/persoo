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
    <div className="grid gap-6 lg:grid-cols-2">
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
                  stroke="#eab308"
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
