"use client";

import { useState } from "react";
import type { IntakeField } from "@/lib/lead-intake";
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

export function PublicLeadForm({
  publicId,
  name,
  fields,
}: {
  publicId: string;
  name: string;
  fields: IntakeField[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const data = new FormData(event.currentTarget);
    const payload: Record<string, string> = {};
    for (const field of fields) {
      payload[field.inboundKey] = String(data.get(field.inboundKey) ?? "");
    }
    const response = await fetch(`/api/forms/${publicId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    setLoading(false);
    if (!response.ok) {
      setError(body?.error ?? "Não foi possível enviar.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Pedido enviado</CardTitle>
          <CardDescription>Obrigado. Entraremos em contacto.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{name}</CardTitle>
        <CardDescription>Preencha os dados para ser contactado.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          {fields.map((field) => (
            <div key={field.target} className="space-y-2">
              <Label htmlFor={field.inboundKey}>
                {field.label}
                {field.required ? " *" : ""}
              </Label>
              <Input
                id={field.inboundKey}
                name={field.inboundKey}
                type={field.target === "email" ? "email" : "text"}
                required={field.required}
              />
            </div>
          ))}
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "A enviar…" : "Enviar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
