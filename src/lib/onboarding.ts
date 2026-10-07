import { z } from "zod";
import { getCrmTemplateSchema, isCrmTemplateId } from "@/lib/crm-templates";
import type { QueryRunner } from "@/lib/db/pool";

export const onboardingInput = z.object({
  fullName: z.string().trim().min(2).max(120),
  companyName: z.string().trim().min(2).max(120),
  mode: z.enum(["template", "ai"]),
  templateId: z.string().optional(),
  previewId: z.string().uuid().optional(),
});

/** Profile lock makes completion once-only, including concurrent submissions. */
export async function completeOnboardingWithRunner(run: QueryRunner, userId: string, workspaceId: string, input: z.infer<typeof onboardingInput>) {
  const profile = (await run("SELECT onboarding_completed FROM profiles WHERE id=$1 FOR UPDATE", [userId])).rows[0];
  if (!profile) throw new Error("Perfil não encontrado. Contate o suporte.");
  if (profile.onboarding_completed) return { alreadyCompleted: true };
  const workspace = (await run("SELECT w.* FROM workspaces w JOIN workspace_members m ON m.workspace_id=w.id WHERE w.id=$1 AND m.user_id=$2 FOR UPDATE OF w", [workspaceId, userId])).rows[0];
  if (!workspace) throw new Error("Espaço de trabalho não encontrado.");
  // Invited users complete their profile without changing the team's CRM.
  if (workspace.owner_id === userId) {
    let schema: Record<string, unknown>;
    if (input.mode === "template") {
      if (!input.templateId || !isCrmTemplateId(input.templateId)) throw new Error("Template inválido.");
      schema = { ...(workspace.ai_schema ?? {}), ...getCrmTemplateSchema(input.templateId) };
    } else {
      if (!input.previewId) throw new Error("Gere e revise a configuração da IA antes de concluir.");
      const preview = (await run("SELECT schema FROM ai_previews WHERE id=$1 AND workspace_id=$2 AND user_id=$3 AND expires_at>now() AND base_schema=$4::jsonb FOR UPDATE", [input.previewId, workspaceId, userId, JSON.stringify(workspace.ai_schema ?? {})])).rows[0];
      if (!preview) throw new Error("A prévia expirou ou o CRM mudou. Gere uma nova configuração.");
      schema = preview.schema;
    }
    await run("UPDATE workspaces SET name=$1,industry=$2,ai_schema=$3::jsonb,updated_at=now() WHERE id=$4", [input.companyName, typeof schema.industry === "string" ? schema.industry : "Geral", JSON.stringify(schema), workspaceId]);
    if (input.mode === "ai") await run("DELETE FROM ai_previews WHERE id=$1 AND user_id=$2", [input.previewId, userId]);
  }
  await run("UPDATE profiles SET full_name=$1,company_name=$2,onboarding_completed=true,onboarding_completed_at=now() WHERE id=$3", [input.fullName, input.companyName, userId]);
  return { alreadyCompleted: false };
}
