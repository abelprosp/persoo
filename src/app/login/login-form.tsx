"use client";

import { safeRedirect } from "@/lib/safe-redirect";
import { PasswordInput } from "@/components/ui/password-input";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PersooLogo } from "@/components/crm/persoo-logo";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirect(searchParams.get("redirect"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push(redirectTo);
    router.refresh();
    } catch { setError("Falha de conexão. Tente novamente."); } finally { setLoading(false); }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f3f4f6] px-4">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-border/60">
          <PersooLogo size={48} className="size-12" priority />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">persooCRM</h1>
          <p className="text-sm text-muted-foreground">
            CRM SaaS com IA para o seu setor
          </p>
        </div>
      </div>
      <Card className="w-full max-w-md border-border/80 shadow-lg">
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
          <CardDescription>
            Use o e-mail e a senha da sua conta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <PasswordInput
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="w-full bg-zinc-900 text-white"
              disabled={loading}
            >
              {loading ? "A entrar…" : "Entrar"}
            </Button>
          </form>
          <Link href="/recover" className="mt-4 block text-center text-sm underline">Esqueci minha senha</Link>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Ainda não tem conta?{" "}
            <Link href={`/signup?redirect=${encodeURIComponent(redirectTo)}`} className="font-medium text-violet-700 underline">
              Criar conta
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
