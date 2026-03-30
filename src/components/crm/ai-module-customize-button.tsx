"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ModuleKey =
  | "leads"
  | "deals"
  | "contacts"
  | "organizations"
  | "products"
  | "tasks"
  | "notes";

export function AiModuleCustomizeButton({
  module,
  title,
}: {
  module: ModuleKey;
  title: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  async function onApply() {
    setError(null);
    setOkMsg(null);
    setPending(true);
    try {
      const res = await fetch("/api/ai/customize-module", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module, instruction }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Não foi possível aplicar.");
        return;
      }
      setOkMsg("Personalização aplicada.");
      setInstruction("");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0"
        onClick={() => setOpen(true)}
        title={`Personalizar ${title} com IA`}
      >
        <Sparkles className="mr-1.5 size-4 text-violet-600" />
        IA
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Personalizar {title} com IA</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="module-ai-text">
              O que quer ajustar em {title.toLowerCase()}?
            </Label>
            <Textarea
              id="module-ai-text"
              rows={5}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Ex.: usar termos de imobiliária, mudar rótulos e criar 3 campos personalizados."
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {okMsg ? <p className="text-sm text-emerald-700">{okMsg}</p> : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Fechar
            </Button>
            <Button
              type="button"
              disabled={pending || instruction.trim().length < 6}
              onClick={onApply}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {pending ? "Aplicando..." : "Aplicar com IA"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
