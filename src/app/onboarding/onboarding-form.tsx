"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CRM_TEMPLATE_LIST, type CrmTemplateId } from "@/lib/crm-templates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  initialFullName: string;
  initialCompanyName: string;
};

export function OnboardingForm({ initialFullName, initialCompanyName }: Props) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialFullName);
  const [companyName, setCompanyName] = useState(initialCompanyName);
  const [mode, setMode] = useState<"template" | "ai">("template");
  const [templateId, setTemplateId] = useState<CrmTemplateId>(CRM_TEMPLATE_LIST[0]!.id);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    if (fullName.trim().length < 2 || companyName.trim().length < 2) return false;
    if (mode === "template") return true;
    return description.trim().length >= 8;
  }, [companyName, description, fullName, mode]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || loading) return;
    setLoading(true);
    setError(null);

    try {
      if (mode === "ai") {
        const aiRes = await fetch("/api/ai/customize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description }),
        });
        const aiData = (await aiRes.json().catch(() => ({}))) as { error?: string };
        if (!aiRes.ok) {
          setError(aiData.error ?? "Não foi possível personalizar com IA.");
          return;
        }
      }

      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          companyName,
          mode,
          templateId: mode === "template" ? templateId : undefined,
          description: mode === "ai" ? description : undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Não foi possível concluir o onboarding.");
        return;
      }
      router.push("/app/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full border-border/80 shadow-lg">
      <CardHeader>
        <CardTitle>Bem-vindo ao persooCRM</CardTitle>
        <CardDescription>
          Configure seu primeiro acesso para já entrar com CRM personalizado.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Seu nome</Label>
              <Input
                id="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Nome da empresa</Label>
              <Input
                id="company"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Como quer começar?</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setMode("template")}
                className={`rounded-lg border p-4 text-left transition ${
                  mode === "template"
                    ? "border-violet-500 bg-violet-50"
                    : "border-border hover:border-violet-300"
                }`}
              >
                <p className="font-medium">Escolher template</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Já começa com estrutura pronta por segmento.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setMode("ai")}
                className={`rounded-lg border p-4 text-left transition ${
                  mode === "ai"
                    ? "border-violet-500 bg-violet-50"
                    : "border-border hover:border-violet-300"
                }`}
              >
                <p className="font-medium">Descrever operação para IA</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  A IA ajusta menu, campos e fluxo para seu negócio.
                </p>
              </button>
            </div>
          </div>

          {mode === "template" ? (
            <div className="space-y-2">
              <Label>Template</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {CRM_TEMPLATE_LIST.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setTemplateId(template.id)}
                    className={`rounded-lg border p-3 text-left transition ${
                      templateId === template.id
                        ? "border-violet-500 bg-violet-50"
                        : "border-border hover:border-violet-300"
                    }`}
                  >
                    <p className="text-sm font-medium">{template.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {template.shortDescription}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="description">Descreva sua operação comercial</Label>
              <Textarea
                id="description"
                rows={5}
                className="resize-none"
                placeholder="Ex.: vendemos software B2B para indústrias, ciclo médio de 45 dias, equipe de 6 closers e foco em inbound."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" disabled={!canSubmit || loading} className="w-full bg-zinc-900 text-white">
            {loading ? "A preparar seu CRM..." : "Concluir e começar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
