"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PasswordInput } from "@/components/ui/password-input";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
function Recovery() {
  const token = useSearchParams().get("token");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  return <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4"><form className="w-full space-y-5 rounded-2xl border bg-white p-6 shadow-sm" onSubmit={async e => {
    e.preventDefault(); const data = new FormData(e.currentTarget); setPending(true); setMessage("");
    try { const res = await fetch("/api/auth/recovery", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(token ? {action:"reset",token,password:data.get("password")} : {action:"request",email:data.get("email")})}); const body = await res.json(); setMessage(body.error || body.message); }
    catch { setMessage("Falha de conexão. Tente novamente."); } finally { setPending(false); }
  }}><h1 className="text-2xl font-semibold">{token ? "Crie sua nova senha" : "Recuperar acesso"}</h1><p className="text-sm text-muted-foreground">{token ? "Use pelo menos 12 caracteres. As sessões anteriores serão encerradas." : "Enviaremos um link de recuperação para seu e-mail."}</p>{token ? <label className="block space-y-2">Nova senha<PasswordInput name="password" autoComplete="new-password" minLength={12} maxLength={128} required /></label> : <label className="block space-y-2">E-mail<Input name="email" type="email" autoComplete="email" required /></label>}<Button disabled={pending} className="w-full">{pending ? "Aguarde…" : token ? "Redefinir senha" : "Enviar link"}</Button>{message && <p role="status" className="text-sm">{message}</p>}<Link className="block text-center text-sm underline" href="/login">Voltar ao login</Link></form></main>;
}
export default function Page() { return <Suspense fallback={<p>Carregando…</p>}><Recovery /></Suspense>; }
