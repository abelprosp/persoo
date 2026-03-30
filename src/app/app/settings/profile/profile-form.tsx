"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { updateAccountPassword, updateProfileFullName } from "./actions";

export function ProfileForm({
  email,
  initialFullName,
}: {
  email: string;
  initialFullName: string;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialFullName);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setFullName(initialFullName);
  }, [initialFullName]);

  function saveName(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const r = await updateProfileFullName(fullName);
      if ("error" in r) setMsg(r.error);
      else {
        setMsg("Nome guardado.");
        router.refresh();
      }
    });
  }

  function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (password !== confirmPassword) {
      setMsg("As palavras-passe não coincidem.");
      return;
    }
    if (!password) {
      setMsg("Indique a nova palavra-passe.");
      return;
    }
    startTransition(async () => {
      const r = await updateAccountPassword(password);
      if ("error" in r) setMsg(r.error);
      else {
        setPassword("");
        setConfirmPassword("");
        setMsg("Palavra-passe atualizada.");
      }
    });
  }

  return (
    <div className="space-y-8">
      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Perfil público</CardTitle>
          <CardDescription>
            O nome aparece no menu lateral e como sugestão em notas e outros
            campos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveName} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-muted/50"
              />
              <p className="text-xs text-muted-foreground">
                O e-mail de início de sessão é gerido pelo Supabase Auth. Para o
                alterar, use o painel do projeto ou um fluxo de recuperação.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome a apresentar</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                placeholder="O seu nome"
              />
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? "A guardar…" : "Guardar nome"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Segurança</CardTitle>
          <CardDescription>
            Defina uma nova palavra-passe para esta conta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={savePassword} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="password">Nova palavra-passe</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
              />
            </div>
            <Button type="submit" variant="secondary" disabled={pending}>
              {pending ? "A atualizar…" : "Atualizar palavra-passe"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {msg ? (
        <p className="text-sm text-muted-foreground" role="status">
          {msg}
        </p>
      ) : null}
    </div>
  );
}
