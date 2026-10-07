import { createHash, randomBytes } from "node:crypto";
import type { DbClient } from "@/lib/db/types";
import { allowedLeadStatusSet, firstLeadStatusId } from "@/lib/kanban-schema";

export type IntakeField = {
  target: string;
  label: string;
  inboundKey: string;
  required: boolean;
  custom: boolean;
  type?: string;
};

export const STANDARD_LEAD_FIELDS: IntakeField[] = [
  {
    target: "full_name",
    label: "Nome",
    inboundKey: "nome",
    required: true,
    custom: false,
  },
  {
    target: "email",
    label: "E-mail",
    inboundKey: "email",
    required: false,
    custom: false,
  },
  {
    target: "phone",
    label: "Telefone",
    inboundKey: "telefone",
    required: false,
    custom: false,
  },
  {
    target: "company",
    label: "Empresa",
    inboundKey: "empresa",
    required: false,
    custom: false,
  },
];

const TARGET_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export const intakeCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Api-Key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateApiToken(): {
  token: string;
  hash: string;
  prefix: string;
} {
  const token = `psk_${randomBytes(24).toString("base64url")}`;
  return { token, hash: hashToken(token), prefix: token.slice(0, 12) };
}

export function generateFormPublicId(): string {
  return randomBytes(9).toString("base64url");
}

export function slugKey(input: string): string {
  const slug = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!slug) return "campo";
  return /^[a-z_]/.test(slug) ? slug : `campo_${slug}`;
}

export function parseIntakeFields(value: unknown): IntakeField[] | { error: string } {
  if (!Array.isArray(value) || value.length === 0) {
    return { error: "Indique pelo menos o campo de nome." };
  }
  if (value.length > 40) {
    return { error: "No máximo 40 campos." };
  }
  const fields: IntakeField[] = [];
  const inbound = new Set<string>();
  const targets = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object") {
      return { error: "Campo inválido." };
    }
    const row = item as Record<string, unknown>;
    const target = typeof row.target === "string" ? row.target.trim() : "";
    const label = typeof row.label === "string" ? row.label.trim() : "";
    const inboundKey =
      typeof row.inboundKey === "string" ? row.inboundKey.trim() : "";
    const custom = Boolean(row.custom);
    const required = Boolean(row.required);
    const type = typeof row.type === "string" ? row.type : "text";
    if (!TARGET_RE.test(target) || !TARGET_RE.test(inboundKey)) {
      return {
        error: "As chaves dos campos só podem ter letras, números e _.",
      };
    }
    if (!label || label.length > 80) {
      return { error: "Cada campo precisa de um nome até 80 caracteres." };
    }
    if (inbound.has(inboundKey) || targets.has(target)) {
      return { error: `Campo repetido: ${label}.` };
    }
    inbound.add(inboundKey);
    targets.add(target);
    fields.push({ target, label, inboundKey, required, custom, type });
  }
  const name = fields.find((field) => field.target === "full_name");
  if (!name || name.custom) {
    return { error: "O formulário tem de incluir o nome do lead." };
  }
  name.required = true;
  return fields;
}

export function readBearerOrApiKey(request: Request): string | null {
  const header = request.headers.get("x-api-key")?.trim();
  if (header) return header;
  const auth = request.headers.get("authorization")?.trim() ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(auth);
  return match?.[1]?.trim() || null;
}

export async function readInboundPayload(
  request: Request
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: string }> {
  let bounded: Request;
  try { const bytes=await request.arrayBuffer(); if(bytes.byteLength>65536) throw Error(); bounded=new Request(request.url,{method:"POST",headers:request.headers,body:bytes}); } catch { return {ok:false,error:"Pedido inválido ou maior que 64 KB."}; }
  const type = request.headers.get("content-type") ?? "";
  if (
    type.includes("application/x-www-form-urlencoded") ||
    type.includes("multipart/form-data")
  ) {
    const form = await bounded.formData();
    const data: Record<string, unknown> = {};
    for (const [key, value] of form.entries()) {
      if (typeof value === "string") data[key] = value;
    }
    return { ok: true, data };
  }
  const body = (await bounded.json().catch(() => null)) as unknown;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Envie um objeto JSON com os campos do lead." };
  }
  return { ok: true, data: body as Record<string, unknown> };
}

function rawValue(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

export function buildLeadInsert(
  fields: IntakeField[],
  payload: Record<string, unknown>,
  schema: Record<string, unknown> | null
):
  | {
      full_name: string;
      email: string | null;
      phone: string | null;
      company: string | null;
      owner_name: string | null;
      status: string;
      custom_data: Record<string, unknown>;
    }
  | { error: string } {
  const missing: string[] = [];
  const custom_data: Record<string, unknown> = {};
  let full_name = "";
  let email: string | null = null;
  let phone: string | null = null;
  let company: string | null = null;
  let owner_name: string | null = null;
  let statusRaw = "";

  for (const field of fields) {
    const raw = rawValue(payload, field.inboundKey);
    if (raw.length > 4000) return {error:"Campo muito longo."};
    if (field.target==="email" && raw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return {error:"E-mail inválido."};
    if (!raw) {
      if (field.required) missing.push(field.label);
      continue;
    }
    if (field.custom) {
      if ((field.type ?? "text").toLowerCase() === "number") {
        const n = Number(raw.replace(",", "."));
        if (!Number.isFinite(n)) return {error:"Número inválido: "+field.label};
        custom_data[field.target] = n;
      } else {
        custom_data[field.target] = raw;
      }
      continue;
    }
    if (field.target === "full_name") full_name = raw;
    else if (field.target === "email") email = raw;
    else if (field.target === "phone") phone = raw;
    else if (field.target === "company") company = raw;
    else if (field.target === "owner_name") owner_name = raw;
    else if (field.target === "status") statusRaw = raw;
  }

  if (missing.length > 0) {
    return { error: `Preencha: ${missing.join(", ")}.` };
  }
  if (!full_name) return { error: "Indique o nome do lead." };

  const allowed = allowedLeadStatusSet(schema);
  const status = allowed.has(statusRaw) ? statusRaw : firstLeadStatusId(schema);
  return { full_name, email, phone, company, owner_name, status, custom_data };
}

export function mergeLeadCustomFields(
  schema: Record<string, unknown> | null,
  fields: IntakeField[]
): Record<string, unknown> {
  const base =
    schema && typeof schema === "object" && !Array.isArray(schema)
      ? { ...schema }
      : {};
  const current =
    base.customFields &&
    typeof base.customFields === "object" &&
    !Array.isArray(base.customFields)
      ? { ...(base.customFields as Record<string, unknown>) }
      : {};
  const leads = Array.isArray(current.leads) ? [...current.leads] : [];
  const known = new Set(
    leads
      .map((item) =>
        item && typeof item === "object"
          ? String((item as { key?: string }).key ?? "")
          : ""
      )
      .filter(Boolean)
  );
  for (const field of fields) {
    if (!field.custom || known.has(field.target)) continue;
    leads.push({
      key: field.target,
      label: field.label,
      type: field.type || "text",
    });
    known.add(field.target);
  }
  current.leads = leads;
  base.customFields = current;
  return base;
}

export async function insertLeadFromIntake(
  admin: DbClient,
  workspaceId: string,
  row: Exclude<ReturnType<typeof buildLeadInsert>, { error: string }>
): Promise<{ error: string | null }> {
  const now = new Date().toISOString();
  const { error } = await admin.from("leads").insert({
    workspace_id: workspaceId,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    company: row.company,
    owner_name: row.owner_name,
    status: row.status,
    last_activity_at: now,
    updated_at: now,
    active: true,
    custom_data: row.custom_data,
  });
  return { error: error?.message ?? null };
}

export function asIntakeFields(value: unknown): IntakeField[] {
  const parsed = parseIntakeFields(value);
  return Array.isArray(parsed) ? parsed : [];
}
