"use client";

import { useMemo, useState, useTransition } from "react";
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
import {
  STANDARD_LEAD_FIELDS,
  slugKey,
  type IntakeField,
} from "@/lib/lead-intake";
import {
  createLeadApiKey,
  createLeadForm,
  disableLeadForm,
  revokeLeadApiKey,
} from "./actions";

type KeyRow = {
  id: string;
  name: string;
  token_prefix: string;
  can_export: boolean;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
  fields: IntakeField[];
};

type FormRow = {
  id: string;
  name: string;
  public_id: string;
  created_at: string;
  disabled_at: string | null;
  fields: IntakeField[];
};

function originOf(appUrl: string) {
  const configured = appUrl.trim().replace(/\/$/, "");
  if (configured) return configured;
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:18473";
}

/** Origem pública do exemplo curl, sem porta (o nginx termina o HTTPS). */
function originWithoutPort(value: string) {
  try {
    const url = new URL(value);
    url.port = "";
    return url.origin;
  } catch {
    return value.replace(/:\d+$/, "");
  }
}

function exampleBody(fields: IntakeField[]) {
  const body: Record<string, string> = {};
  for (const field of fields) {
    body[field.inboundKey] =
      field.target === "email" ? "ana@exemplo.com" : field.label;
  }
  return JSON.stringify(body, null, 2);
}

function iframeSnippet(origin: string, publicId: string) {
  return `<iframe src="${origin}/f/${publicId}" title="Formulário" style="width:100%;max-width:480px;height:720px;border:0;"></iframe>`;
}

export function CaptacaoPanel({
  appUrl,
  canManage,
  customFields,
  keys,
  forms,
}: {
  appUrl: string;
  canManage: boolean;
  customFields: { key: string; label: string; type: string }[];
  keys: KeyRow[];
  forms: FormRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [keyName, setKeyName] = useState("");
  const [canExport, setCanExport] = useState(false);
  const [formName, setFormName] = useState("");
  const [keyFields, setKeyFields] = useState<IntakeField[]>(STANDARD_LEAD_FIELDS);
  const [formFields, setFormFields] = useState<IntakeField[]>(STANDARD_LEAD_FIELDS);
  const [extraLabel, setExtraLabel] = useState("");
  const [extraTarget, setExtraTarget] = useState<"key" | "form">("key");
  const origin = originOf(appUrl);

  const webhookUrl = `${originWithoutPort(origin)}/api/webhooks/leads`;

  const unusedCustom = useMemo(() => {
    const used = new Set(
      [...keyFields, ...formFields].filter((field) => field.custom).map((field) => field.target)
    );
    return customFields.filter((field) => !used.has(field.key));
  }, [customFields, keyFields, formFields]);

  function toggle(list: IntakeField[], field: IntakeField, on: boolean) {
    if (field.target === "full_name") return list;
    if (on) return [...list, field];
    return list.filter((item) => item.target !== field.target);
  }

  function addExtra(which: "key" | "form") {
    const label = extraLabel.trim();
    if (!label) return;
    const target = slugKey(label);
    const field: IntakeField = {
      target,
      label,
      inboundKey: target,
      required: false,
      custom: true,
      type: "text",
    };
    if (which === "key") setKeyFields((prev) => toggle(prev, field, true));
    else setFormFields((prev) => toggle(prev, field, true));
    setExtraLabel("");
  }

  function createKey() {
    setMsg(null);
    setNewToken(null);
    startTransition(async () => {
      const result = await createLeadApiKey(keyName, keyFields, canExport);
      if ("error" in result) {
        setMsg(result.error);
        return;
      }
      setNewToken(result.token);
      setKeyName("");
      setMsg("Chave criada. Copie-a agora: ela não volta a ser mostrada.");
      router.refresh();
    });
  }

  function createForm() {
    setMsg(null);
    startTransition(async () => {
      const result = await createLeadForm(formName, formFields);
      if ("error" in result) {
        setMsg(result.error);
        return;
      }
      setFormName("");
      setMsg("Formulário criado. O código para incorporar está na lista.");
      router.refresh();
    });
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    setMsg("Copiado.");
  }

  return (
    <div className="space-y-8">
      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Webhook e chave de API</CardTitle>
          <CardDescription>
            Crie uma chave para uma landing page enviar leads para{" "}
            <code className="text-xs">{webhookUrl}</code>. O lead entra na
            primeira coluna do kanban.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {canManage && (
            <div className="space-y-3 rounded-lg border border-border/70 p-4">
              <div className="space-y-2">
                <Label htmlFor="key-name">Nome da chave</Label>
                <Input
                  id="key-name"
                  value={keyName}
                  onChange={(event) => setKeyName(event.target.value)}
                  placeholder="Landing de campanha"
                />
              </div>
              <FieldPicker
                selected={keyFields}
                customFields={customFields}
                onChange={setKeyFields}
              />
              <div className="flex flex-wrap gap-2">
                <Input
                  value={extraTarget === "key" ? extraLabel : ""}
                  onChange={(event) => {
                    setExtraTarget("key");
                    setExtraLabel(event.target.value);
                  }}
                  placeholder="Novo campo, ex.: Origem"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addExtra("key")}
                >
                  Adicionar campo
                </Button>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={canExport}
                  onChange={(event) => setCanExport(event.target.checked)}
                />
                Também permitir leitura para BI (Power BI, Metabase, Sheets)
              </label>
              <Button type="button" disabled={pending} onClick={createKey}>
                Criar chave
              </Button>
              <p className="text-xs text-muted-foreground">
                Com a leitura BI ativa, a mesma chave consulta{" "}
                <code>{origin}/api/bi</code> e, por recurso,{" "}
                <code>{origin}/api/bi/leads?limit=200&amp;offset=0</code>.
                Recursos: leads, deals, contacts, organizations, tasks, products
                e notes. Cada linha inclui custom_data, updated_at e active.
                Opcional: updated_since em ISO.
              </p>
            </div>
          )}

          {newToken && (
            <div className="space-y-2 rounded-lg bg-muted p-4">
              <p className="text-sm font-medium">Chave (mostrada uma vez)</p>
              <code className="block break-all text-xs">{newToken}</code>
              <pre className="overflow-x-auto text-xs">{`curl -X POST ${webhookUrl} \\
  -H "Authorization: Bearer ${newToken}" \\
  -H "Content-Type: application/json" \\
  -d '${exampleBody(keyFields).replace(/\n/g, "")}'`}</pre>
              <Button type="button" variant="outline" onClick={() => copy(newToken)}>
                Copiar chave
              </Button>
            </div>
          )}

          <KeyList
            keys={keys}
            canManage={canManage}
            pending={pending}
            onRevoke={(id) =>
              startTransition(async () => {
                const result = await revokeLeadApiKey(id);
                setMsg("error" in result ? result.error : "Chave revogada.");
                router.refresh();
              })
            }
          />
          {unusedCustom.length === 0 ? null : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Formulários para incorporar</CardTitle>
          <CardDescription>
            O formulário abre numa página pública, sem login, e pode ser colado
            noutra landing page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {canManage && (
            <div className="space-y-3 rounded-lg border border-border/70 p-4">
              <div className="space-y-2">
                <Label htmlFor="form-name">Nome do formulário</Label>
                <Input
                  id="form-name"
                  value={formName}
                  onChange={(event) => setFormName(event.target.value)}
                  placeholder="Pedido de contacto"
                />
              </div>
              <FieldPicker
                selected={formFields}
                customFields={customFields}
                onChange={setFormFields}
              />
              <div className="flex flex-wrap gap-2">
                <Input
                  value={extraTarget === "form" ? extraLabel : ""}
                  onChange={(event) => {
                    setExtraTarget("form");
                    setExtraLabel(event.target.value);
                  }}
                  placeholder="Novo campo, ex.: Nome do pet"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addExtra("form")}
                >
                  Adicionar campo
                </Button>
              </div>
              <Button type="button" disabled={pending} onClick={createForm}>
                Criar formulário
              </Button>
            </div>
          )}

          <ul className="space-y-4">
            {forms.length === 0 && (
              <li className="text-sm text-muted-foreground">
                Ainda não há formulários.
              </li>
            )}
            {forms.map((form) => {
              const snippet = iframeSnippet(origin, form.public_id);
              return (
                <li key={form.id} className="space-y-2 rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{form.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {form.disabled_at ? "Desativado" : "Ativo"} ·{" "}
                        {form.fields.map((field) => field.label).join(", ")}
                      </p>
                    </div>
                    {canManage && !form.disabled_at && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            const result = await disableLeadForm(form.id);
                            setMsg(
                              "error" in result
                                ? result.error
                                : "Formulário desativado."
                            );
                            router.refresh();
                          })
                        }
                      >
                        Desativar
                      </Button>
                    )}
                  </div>
                  {!form.disabled_at && (
                    <>
                      <p className="text-xs text-muted-foreground">
                        {origin}/f/{form.public_id}
                      </p>
                      <pre className="overflow-x-auto rounded bg-muted p-3 text-xs">
                        {snippet}
                      </pre>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => copy(snippet)}
                      >
                        Copiar embed
                      </Button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function FieldPicker({
  selected,
  customFields,
  onChange,
}: {
  selected: IntakeField[];
  customFields: { key: string; label: string; type: string }[];
  onChange: (fields: IntakeField[]) => void;
}) {
  const selectedTargets = new Set(selected.map((field) => field.target));
  const catalog: IntakeField[] = [
    ...STANDARD_LEAD_FIELDS,
    ...customFields.map((field) => ({
      target: field.key,
      label: field.label,
      inboundKey: field.key,
      required: false,
      custom: true,
      type: field.type,
    })),
    ...selected.filter(
      (field) =>
        field.custom && !customFields.some((item) => item.key === field.target)
    ),
  ];

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Campos recebidos</p>
      {catalog.map((field) => {
        const on = selectedTargets.has(field.target);
        const current = selected.find((item) => item.target === field.target);
        return (
          <div key={field.target} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-center">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={on || field.target === "full_name"}
                disabled={field.target === "full_name"}
                onChange={(event) => {
                  if (field.target === "full_name") return;
                  if (event.target.checked) onChange([...selected, field]);
                  else onChange(selected.filter((item) => item.target !== field.target));
                }}
              />
              {field.label}
              {field.custom ? " (personalizado)" : ""}
            </label>
            <Input
              value={current?.inboundKey ?? field.inboundKey}
              disabled={!on && field.target !== "full_name"}
              onChange={(event) =>
                onChange(
                  selected.map((item) =>
                    item.target === field.target
                      ? { ...item, inboundKey: slugKey(event.target.value) }
                      : item
                  )
                )
              }
              aria-label={`Chave JSON de ${field.label}`}
            />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={field.target === "full_name" || Boolean(current?.required)}
                disabled={field.target === "full_name" || !on}
                onChange={(event) =>
                  onChange(
                    selected.map((item) =>
                      item.target === field.target
                        ? { ...item, required: event.target.checked }
                        : item
                    )
                  )
                }
              />
              Obrigatório
            </label>
          </div>
        );
      })}
    </div>
  );
}

function KeyList({
  keys,
  canManage,
  pending,
  onRevoke,
}: {
  keys: KeyRow[];
  canManage: boolean;
  pending: boolean;
  onRevoke: (id: string) => void;
}) {
  if (keys.length === 0) {
    return <p className="text-sm text-muted-foreground">Ainda não há chaves.</p>;
  }
  return (
    <ul className="space-y-2">
      {keys.map((key) => (
        <li
          key={key.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
        >
          <div>
            <p className="font-medium">{key.name}</p>
            <p className="text-xs text-muted-foreground">
              {key.token_prefix}… · {key.revoked_at ? "Revogada" : "Ativa"}
              {key.can_export ? " · Entrada + BI" : ""}
              {key.last_used_at ? ` · último uso ${key.last_used_at.slice(0, 16).replace("T", " ")}` : ""}
            </p>
          </div>
          {canManage && !key.revoked_at && (
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => onRevoke(key.id)}
            >
              Revogar
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
