"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Sparkles, CheckCircle2 } from "lucide-react";

function NovoWorkspaceHint() {
  const sp = useSearchParams();
  if (sp.get("novo") !== "1") return null;
  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/90 px-4 py-3 text-sm text-violet-950">
      <p className="font-medium">Novo espaço de trabalho</p>
      <p className="mt-1 text-xs text-violet-900/85">
        Descreva abaixo o negócio deste espaço. A IA define setor, nomes no menu,
        rótulos dos formulários e campos extra para organizações, leads,
        negócios, tarefas e produtos — aplicados só a este workspace.
      </p>
    </div>
  );
}

export default function AiSettingsPage() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);
  const [trialCredits, setTrialCredits] = useState<{
    total: number;
    used: number;
    remaining: number;
  } | null>(null);
  const [monthlyCredits, setMonthlyCredits] = useState<{
    plan: string;
    month: string;
    total: number;
    used: number;
    remaining: number;
  } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setSavedOk(false);
    setTrialCredits(null);
    setMonthlyCredits(null);
    setLoading(true);
    try {
      const res = await fetch("/api/ai/customize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const data = (await res.json()) as {
        schema?: unknown;
        error?: string;
        trialCredits?: { total: number; used: number; remaining: number };
        monthlyCredits?: {
          plan: string;
          month: string;
          total: number;
          used: number;
          remaining: number;
        };
      };
      if (!res.ok) {
        setError(data.error ?? "Erro");
        if (data.trialCredits) setTrialCredits(data.trialCredits);
        if (data.monthlyCredits) setMonthlyCredits(data.monthlyCredits);
        return;
      }
      setResult(JSON.stringify(data.schema, null, 2));
      setSavedOk(true);
      if (data.trialCredits) setTrialCredits(data.trialCredits);
      if (data.monthlyCredits) setMonthlyCredits(data.monthlyCredits);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-lg font-semibold">IA e vertical</h2>
      <Suspense fallback={null}>
        <NovoWorkspaceHint />
      </Suspense>
      <Card className="border-violet-200/80 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-violet-600" />
            Personalização por vertical
          </CardTitle>
          <CardDescription>
            Descreva o seu negócio (ex.: frota, SaaS B2B, clínica). A IA gera
            setor, nomes no menu, rótulos, campos extra e colunas dinâmicas nos
            Kanbans de leads e negócios (fluxo à medida). Os ids das colunas
            gravam-se em{" "}
            <code className="text-xs">status</code> /{" "}
            <code className="text-xs">stage</code>; campos extra em{" "}
            <code className="text-xs">custom_data</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="desc">Descrição do negócio</Label>
              <Textarea
                id="desc"
                placeholder="Somos uma empresa de logística com 40 camiões, foco em carga paletizada e rastreamento em tempo real."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="resize-none"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            {trialCredits && (
              <p className="text-xs text-muted-foreground">
                Créditos do trial: {trialCredits.remaining}/{trialCredits.total}{" "}
                restantes.
              </p>
            )}
            {monthlyCredits && (
              <p className="text-xs text-muted-foreground">
                Créditos mensais ({monthlyCredits.plan.toUpperCase()}):{" "}
                {monthlyCredits.remaining}/{monthlyCredits.total} restantes em{" "}
                {monthlyCredits.month}.
              </p>
            )}
            {savedOk && (
              <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-sm text-emerald-900">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                <div>
                  <p className="font-medium">Personalização aplicada</p>
                  <p className="mt-0.5 text-xs text-emerald-800/90">
                    O menu e o dashboard passam a refletir esta vertical ao navegar
                    (ou abra o Dashboard). Nas listas — Organizações, Produtos,
                    Contatos, Tarefas, Leads, Negócios — vê colunas e rótulos
                    novos; em &quot;Criar&quot;, use os campos IA em{" "}
                    <code className="rounded bg-white/70 px-0.5">custom_data</code>.
                  </p>
                </div>
              </div>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {loading ? "A gerar…" : "Gerar personalização"}
            </Button>
          </form>
          {result && (
            <details className="mt-6">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                Ver JSON guardado no workspace
              </summary>
              <pre className="mt-2 max-h-[360px] overflow-auto rounded-lg border bg-muted/40 p-4 text-xs">
                {result}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
