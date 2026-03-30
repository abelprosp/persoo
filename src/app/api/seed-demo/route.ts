import { createClient } from "@/lib/supabase/server";
import { getOrCreateWorkspace } from "@/lib/workspace";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const ws = await getOrCreateWorkspace(supabase, user.id);
  if (!ws) {
    return NextResponse.json({ error: "Workspace" }, { status: 500 });
  }

  const wid = ws.id;

  const { count: orgCount } = await supabase
    .from("organizations")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", wid);

  if (orgCount && orgCount > 0) {
    return NextResponse.json({ ok: true, message: "Já existem dados." });
  }

  const orgs = await supabase
    .from("organizations")
    .insert([
      {
        workspace_id: wid,
        name: "Forge Digital",
        website: "forgedigital.example.com",
        industry: "Publicidade",
        annual_revenue: 4_000_000,
      },
      {
        workspace_id: wid,
        name: "Vertex Analytics",
        website: "vertex.example.com",
        industry: "Serviços financeiros",
        annual_revenue: 2_500_000,
      },
      {
        workspace_id: wid,
        name: "Acme Corp",
        website: "acme.example.com",
        industry: "Tecnologia",
        annual_revenue: 8_000_000,
      },
    ])
    .select("id,name");

  if (orgs.error) {
    return NextResponse.json({ error: orgs.error.message }, { status: 500 });
  }

  const forgeId = orgs.data?.find((o) => o.name === "Forge Digital")?.id;

  await supabase.from("contacts").insert([
    {
      workspace_id: wid,
      email: "ana@forgedigital.example.com",
      phone: "+351 910 000 000",
      organization_id: forgeId ?? null,
    },
    {
      workspace_id: wid,
      email: "rui@vertex.example.com",
      phone: "+351 920 000 000",
    },
  ]);

  await supabase.from("leads").insert([
    {
      workspace_id: wid,
      full_name: "Emma Silva",
      email: "emma@example.com",
      phone: "+351 900 111 222",
      company: "Forge Digital",
      status: "new",
      owner_name: "Sarah Connor",
      last_activity_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    },
    {
      workspace_id: wid,
      full_name: "João Pereira",
      email: "joao@example.com",
      company: "Vertex Analytics",
      status: "contacted",
      owner_name: "Sarah Connor",
      last_activity_at: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString(),
    },
  ]);

  await supabase.from("deals").insert([
    {
      workspace_id: wid,
      title: "Implementação anual",
      value: 750_000,
      stage: "demo",
      email: "contact@acme.example.com",
      phone: "+351 910 333 444",
      assignee_name: "Sarah Connor",
      organization_name: "Acme Corp",
      last_updated: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
    },
    {
      workspace_id: wid,
      title: "Licenciamento SaaS",
      value: 120_000,
      stage: "qualification",
      assignee_name: "Sarah Connor",
      organization_name: "Forge Digital",
      last_updated: new Date().toISOString(),
    },
    {
      workspace_id: wid,
      title: "Renovação multi-ano",
      value: 333_000,
      stage: "won",
      assignee_name: "Sarah Connor",
      organization_name: "Vertex Analytics",
      last_updated: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    },
  ]);

  await supabase.from("notes").insert([
    {
      workspace_id: wid,
      title: "Concorrência mencionada",
      content:
        "O cliente comparou com dois concorrentes; destacar integrações nativas.",
      author_name: "Sarah Connor",
    },
    {
      workspace_id: wid,
      title: "Discussão de preços",
      content: "Pediram desconto para contrato de 24 meses.",
      author_name: "Sarah Connor",
    },
  ]);

  await supabase.from("tasks").insert([
    {
      workspace_id: wid,
      title: "Enviar proposta",
      status: "in_progress",
      priority: "high",
      due_at: new Date(new Date().getFullYear(), 2, 31, 12, 0).toISOString(),
      assignee_name: "Sarah Connor",
    },
    {
      workspace_id: wid,
      title: "Ligar follow-up",
      status: "todo",
      priority: "medium",
      assignee_name: "Sarah Connor",
    },
  ]);

  return NextResponse.json({ ok: true });
}
