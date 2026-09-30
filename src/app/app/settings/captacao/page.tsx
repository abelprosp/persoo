import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { userCanManageWorkspaceBilling } from "@/lib/workspace-billing";
import { getCustomFields } from "@/lib/ai-schema";
import { asIntakeFields } from "@/lib/lead-intake";
import { CaptacaoPanel } from "./captacao-panel";

export default async function CaptacaoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { active } = await getWorkspaceContext(supabase, user.id);
  if (!active) redirect("/app/dashboard");

  const canManage = await userCanManageWorkspaceBilling(
    supabase,
    user.id,
    active.id
  );
  const schema = (active.ai_schema as Record<string, unknown> | null) ?? null;

  const [{ data: keys }, { data: forms }] = await Promise.all([
    supabase
      .from("lead_api_keys")
      .select("id, name, token_prefix, can_export, fields, created_at, last_used_at, revoked_at")
      .eq("workspace_id", active.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("lead_forms")
      .select("id, name, public_id, fields, created_at, disabled_at")
      .eq("workspace_id", active.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <CaptacaoPanel
      appUrl={process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:18473"}
      canManage={canManage}
      customFields={getCustomFields(schema, "leads")}
      keys={(keys ?? []).map((row) => ({
        ...row,
        fields: asIntakeFields(row.fields),
      }))}
      forms={(forms ?? []).map((row) => ({
        ...row,
        fields: asIntakeFields(row.fields),
      }))}
    />
  );
}
