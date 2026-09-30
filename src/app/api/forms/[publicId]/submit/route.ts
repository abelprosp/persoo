import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildLeadInsert,
  insertLeadFromIntake,
  intakeCorsHeaders,
  parseIntakeFields,
  readInboundPayload,
} from "@/lib/lead-intake";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ publicId: string }> };

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: intakeCorsHeaders });
}

export async function POST(request: Request, { params }: Params) {
  const { publicId } = await params;
  const admin = createAdminClient();
  const { data: form, error } = await admin
    .from("lead_forms")
    .select("id, workspace_id, fields, disabled_at")
    .eq("public_id", publicId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: intakeCorsHeaders }
    );
  }
  if (!form || form.disabled_at) {
    return NextResponse.json(
      { error: "Formulário indisponível." },
      { status: 404, headers: intakeCorsHeaders }
    );
  }

  const payload = await readInboundPayload(request);
  if (!payload.ok) {
    return NextResponse.json(
      { error: payload.error },
      { status: 400, headers: intakeCorsHeaders }
    );
  }

  const fields = parseIntakeFields(form.fields);
  if ("error" in fields) {
    return NextResponse.json(
      { error: "Formulário sem campos válidos." },
      { status: 500, headers: intakeCorsHeaders }
    );
  }

  const { data: workspace } = await admin
    .from("workspaces")
    .select("ai_schema")
    .eq("id", form.workspace_id)
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

  const inserted = await insertLeadFromIntake(admin, form.workspace_id, lead);
  if (inserted.error) {
    return NextResponse.json(
      { error: inserted.error },
      { status: 500, headers: intakeCorsHeaders }
    );
  }

  return NextResponse.json({ ok: true }, { headers: intakeCorsHeaders });
}
