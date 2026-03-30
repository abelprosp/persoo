"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { acceptWorkspaceInvitation } from "@/app/app/settings/team/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PersooLogo } from "@/components/crm/persoo-logo";
import { cn } from "@/lib/utils";

export function JoinClient({ initialToken }: { initialToken: string }) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });
  }, []);

  const loginHref = `/login?redirect=${encodeURIComponent(`/join?token=${encodeURIComponent(initialToken)}`)}`;
  const signupHref = `/signup?redirect=${encodeURIComponent(`/join?token=${encodeURIComponent(initialToken)}`)}`;

  function accept() {
    if (!initialToken) {
      setMsg("Link inválido: falta o token do convite.");
      return;
    }
    setMsg(null);
    startTransition(async () => {
      const r = await acceptWorkspaceInvitation(initialToken);
      if ("error" in r) {
        setMsg(r.error);
        return;
      }
      const sw = await fetch("/api/workspace/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: r.workspaceId }),
      });
      if (!sw.ok) {
        const body = (await sw.json().catch(() => null)) as {
          error?: string;
        } | null;
        setMsg(
          body?.error ??
            "Convite aceite, mas não foi possível selecionar o espaço. Escolha-o no menu lateral."
        );
        router.refresh();
        router.replace("/app/dashboard");
        return;
      }
      router.refresh();
      router.replace("/app/dashboard");
    });
  }

  if (userId === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f4f6] text-sm text-muted-foreground">
        A carregar…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f3f4f6] px-4 py-12">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-border/60">
          <PersooLogo size={48} className="size-12" priority />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">persooCRM</h1>
          <p className="text-sm text-muted-foreground">Convite para a equipa</p>
        </div>
      </div>

      <Card className="w-full max-w-md border-border/80 shadow-lg">
        <CardHeader>
          <CardTitle>Entrar no espaço de trabalho</CardTitle>
          <CardDescription>
            {initialToken
              ? "Aceite o convite para aceder ao CRM da equipa. Tem de usar o mesmo e-mail para o qual o convite foi enviado."
              : "Este link está incompleto. Peça um novo convite ao administrador."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!initialToken ? null : !userId ? (
            <div className="flex flex-col gap-2">
              <Link href={loginHref} className={cn(buttonVariants())}>
                Iniciar sessão
              </Link>
              <Link
                href={signupHref}
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                Criar conta
              </Link>
              <p className="text-xs text-muted-foreground pt-2">
                Ao criar conta, use o mesmo e-mail indicado no convite. Depois
                volte a esta página para aceitar.
              </p>
            </div>
          ) : (
            <Button
              type="button"
              className="w-full bg-zinc-900 text-white"
              disabled={pending}
              onClick={accept}
            >
              {pending ? "A aceitar…" : "Aceitar convite"}
            </Button>
          )}

          {msg ? (
            <p className="text-sm text-destructive" role="alert">
              {msg}
            </p>
          ) : null}

          <Link
            href="/app/dashboard"
            className="block text-center text-sm text-muted-foreground underline"
          >
            Ir para o CRM
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
