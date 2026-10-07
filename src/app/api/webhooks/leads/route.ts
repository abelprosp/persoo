import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildLeadInsert,
  hashToken,
  insertLeadFromIntake,
  intakeCorsHeaders,
  parseIntakeFields,
  readBearerOrApiKey,
  readInboundPayload,
} from "@/lib/lead-intake";
import { NextResponse } from "next/server";
import { rateLimit, requestAddress } from "@/lib/security";

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: intakeCorsHeaders });
}

export async function POST(request: Request) {
  if (!await rateLimit("intake:" + requestAddress(request), 60, 60)) return NextResponse.json({ error: "Muitos envios. Aguarde um minuto." }, { status: 429, headers: intakeCorsHeaders });
  const token = readBearerOrApiKey(request);
  if (!token) {
    return NextResponse.json(
      { error: "Envie a chave no cabeçalho Authorization: Bearer ou X-Api-Key." },
      { status: 401, headers: intakeCorsHeaders }
    );
  }

  const admin = createAdminClient();
  const { data: key, error: keyError } = await admin
    .from("lead_api_keys")
    .select("id, workspace_id, fields, revoked_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (keyError) {
    return NextResponse.json(
      { error: keyError.message },
      { status: 500, headers: intakeCorsHeaders }
    );
  }
  if (!key || key.revoked_at) {
    return NextResponse.json(
      { error: "Chave inválida ou revogada." },
      { status: 401, headers: intakeCorsHeaders }
    );
  }

  const payload = await readInboundPayload(request);
  if (!payload.ok) {
    return NextResponse.json(
      { error: payload.error },
      { status: 400, headers: intakeCorsHeaders }
    );
  }

  const fields = parseIntakeFields(key.fields);
  if ("error" in fields) {
    return NextResponse.json(
      { error: "A chave não tem campos válidos." },
      { status: 500, headers: intakeCorsHeaders }
    );
  }

  const { data: workspace } = await admin
    .from("workspaces")
    .select("ai_schema")
    .eq("id", key.workspace_id)
    .maybeSingle();

  const lead = buildLeadInsert(
    fields,
    payload.data,
    (workspace?.ai_schema as Record<string, unknown> | null) ?? null
  );
  if ("error" in lead) {
    return NextResponse.json(
      { error: lead.error },
      { status: 400, headers: intakeCorsHeaders }
    );
  }

  const inserted = await insertLeadFromIntake(admin, key.workspace_id, lead);
  if (inserted.error) {
    return NextResponse.json(
      { error: inserted.error },
      { status: 500, headers: intakeCorsHeaders }
    );
  }

  await admin
    .from("lead_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", key.id);

  return NextResponse.json({ ok: true }, { headers: intakeCorsHeaders });
}
