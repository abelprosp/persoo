import { workspaceAccess } from "@/lib/access";
import { transaction } from "@/lib/db/pool";
import { readJson } from "@/lib/security";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
const schema=z.discriminatedUnion("action",[z.object({action:z.literal("apply"),previewId:z.string().uuid()}),z.object({action:z.literal("undo")})]);
export async function POST(request:Request) {
  try {
    const data=schema.parse(await readJson(request));
    const {workspace,user}=await workspaceAccess(true);
    await transaction(null,async run=>{
      const current=await run("SELECT ai_schema FROM workspaces WHERE id=$1 FOR UPDATE",[workspace.id]);
      await run("SELECT set_config('request.jwt.claim.sub',$1,true)",[user.id]);
      if(data.action==="apply") {
        const result=await run("SELECT * FROM ai_previews WHERE id=$1 AND workspace_id=$2 AND user_id=$3 AND expires_at>now() FOR UPDATE",[data.previewId,workspace.id,user.id]);
        const preview=result.rows[0];
        if(!preview)throw new Error("Prévia expirada. Gere novamente.");
        const same=await run("SELECT $1::jsonb=$2::jsonb AS equal",[JSON.stringify(current.rows[0].ai_schema||{}),JSON.stringify(preview.base_schema)]);
        if(!same.rows[0].equal)throw new Error("A configuração mudou desde a prévia. Gere novamente para preservar as alterações.");
        await run("UPDATE workspaces SET ai_schema=$1::jsonb,industry=coalesce($2,industry),updated_at=now() WHERE id=$3",[JSON.stringify(preview.schema),preview.schema.industry,workspace.id]);
        await run("DELETE FROM ai_previews WHERE id=$1",[data.previewId]);
      } else {
        const previous=await run("SELECT * FROM workspace_schema_history WHERE workspace_id=$1 ORDER BY created_at DESC,id DESC LIMIT 1",[workspace.id]);
        if(!previous.rows[0])throw new Error("Não há configuração anterior para restaurar.");
        await run("UPDATE workspaces SET ai_schema=$1::jsonb,industry=$2,updated_at=now() WHERE id=$3",[JSON.stringify(previous.rows[0].schema),previous.rows[0].industry,workspace.id]);
      }
    });
    revalidatePath("/app","layout");
    return NextResponse.json({ok:true});
  }catch(error){return NextResponse.json({error:error instanceof z.ZodError ? "Pedido inválido." : error instanceof Error ? error.message : "Não foi possível aplicar."},{status:400});}
}
