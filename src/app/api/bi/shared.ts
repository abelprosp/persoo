import { rateLimit } from "@/lib/security";
import { adminQuery } from "@/lib/db/pool";
import { hashToken, intakeCorsHeaders, readBearerOrApiKey } from "@/lib/lead-intake";
import { createAdminClient } from "@/lib/supabase/admin";
export const BI_RESOURCES = [
  "leads",
  "deals",
  "contacts",
  "organizations",
  "tasks",
  "products",
  "notes",
] as const;

export type BiResource = (typeof BI_RESOURCES)[number];

export const biCors = {
  ...intakeCorsHeaders,
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export function biResourceList(origin: string) {
  return BI_RESOURCES.map((resource) => ({
    resource,
    url: `${origin}/api/bi/${resource}`,
  }));
}

export async function authorizeExport(request: Request): Promise<
  | { ok: true; workspaceId: string; keyId: string }
  | { ok: false; status: number; error: string }
> {
  const token = readBearerOrApiKey(request);
  if (!token) {
    return {
      ok: false,
      status: 401,
      error: "Envie a chave no cabeçalho Authorization: Bearer ou X-Api-Key.",
    };
  }
  const admin = createAdminClient();
  const { data: key, error } = await admin
    .from("lead_api_keys")
    .select("id, workspace_id, can_export, revoked_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (error) return { ok: false, status: 500, error: error.message };
  if (!key || key.revoked_at) {
    return { ok: false, status: 401, error: "Chave inválida ou revogada." };
  }
  if (!key.can_export) {
    return {
      ok: false,
      status: 403,
      error: "Esta chave não tem permissão de exportação para BI.",
    };
  }
  const access=await adminQuery("SELECT workspace_access_allowed($1) AS ok",[key.workspace_id]);
  if(!access.rows[0]?.ok) return {ok:false,status:403,error:"Assinatura inativa."};
  if(!await rateLimit("bi:"+key.id,120,60)) return {ok:false,status:429,error:"Muitas solicitações."};
  return { ok: true, workspaceId: key.workspace_id, keyId: key.id };
}

export function parseExportQuery(url: URL):
  | { limit: number; offset: number; updatedSince: string | null }
  | { error: string } {
  const limitRaw = Number(url.searchParams.get("limit") ?? "200");
  const offsetRaw = Number(url.searchParams.get("offset") ?? "0");
  if (!Number.isInteger(limitRaw) || limitRaw < 1 || limitRaw > 1000) {
    return { error: "limit deve ser um inteiro entre 1 e 1000." };
  }
  if (!Number.isInteger(offsetRaw) || offsetRaw < 0) {
    return { error: "offset deve ser um inteiro maior ou igual a 0." };
  }
  const updatedSince = url.searchParams.get("updated_since");
  if (updatedSince && Number.isNaN(Date.parse(updatedSince))) {
    return { error: "updated_since deve ser uma data ISO." };
  }
  return {
    limit: limitRaw,
    offset: offsetRaw,
    updatedSince: updatedSince ? new Date(updatedSince).toISOString() : null,
  };
}

export async function exportResource(
  resource: BiResource,
  workspaceId: string,
  limit: number,
  offset: number,
  updatedSince: string | null
) {
  const where = updatedSince
    ? "workspace_id = $1 and updated_at >= $2::timestamptz"
    : "workspace_id = $1";
  const params = updatedSince ? [workspaceId, updatedSince] : [workspaceId];
  const count = await adminQuery(
    `select count(*)::int as total from public.${resource} where ${where}`,
    params
  );
  const rows = await adminQuery(
    `select * from public.${resource}
      where ${where}
      order by updated_at asc, id asc
      limit $${params.length + 1} offset $${params.length + 2}`,
    [...params, limit, offset]
  );
  return {
    total: Number(count.rows[0]?.total ?? 0),
    data: rows.rows,
  };
}
