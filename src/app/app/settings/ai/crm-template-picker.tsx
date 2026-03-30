"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CRM_TEMPLATE_LIST } from "@/lib/crm-templates";
import { applyCrmTemplate } from "./template-actions";
import { LayoutTemplate } from "lucide-react";

export function CrmTemplatePicker() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [okId, setOkId] = useState<string | null>(null);

  function onApply(templateId: string, title: string) {
    setError(null);
    setOkId(null);
    const msg =
      `Aplicar o template «${title}»? Isto substitui rótulos do menu, campos extra e colunas dos kanbans neste espaço. O dashboard e os créditos de IA mantêm-se.`;
    if (!window.confirm(msg)) return;

    startTransition(async () => {
      const res = await applyCrmTemplate(templateId);
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setOkId(templateId);
      router.refresh();
    });
  }

  return (
    <Card className="border-slate-200/90 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <LayoutTemplate className="size-5 text-slate-600" />
          Templates prontos
        </CardTitle>
        <CardDescription>
          Quatro verticais com menu, formulários e kanbans já configurados. As
          rotas não mudam (continua a usar Leads, Negócios, etc.); só os nomes e
          o fluxo visual adaptam-se ao setor.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {okId && (
          <p className="text-sm text-emerald-800" role="status">
            Template aplicado. Atualize o menu ou abra o dashboard.
          </p>
        )}
        <ul className="grid gap-3 sm:grid-cols-2">
          {CRM_TEMPLATE_LIST.map((t) => (
            <li
              key={t.id}
              className="flex flex-col rounded-lg border border-slate-100 bg-slate-50/50 p-4"
            >
              <p className="font-medium text-slate-900">{t.title}</p>
              <p className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground">
                {t.shortDescription}
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-3 w-full sm:w-auto"
                disabled={pending}
                onClick={() => onApply(t.id, t.title)}
              >
                {pending ? "A aplicar…" : "Aplicar template"}
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
