import { workspaceAccess } from "@/lib/access";
import { transaction } from "@/lib/db/pool";
import { firstLeadStatusId, firstDealStageId, firstTaskStatusId } from "@/lib/kanban-schema";
import { NextResponse } from "next/server";
export async function POST() {
  try {
    const {user,workspace}=await workspaceAccess(true);
    await transaction(user.id,async run=>{
      await run("SELECT pg_advisory_xact_lock(hashtext($1))",[workspace.id]);
      if((await run("SELECT id FROM leads WHERE workspace_id=$1 AND is_demo=true AND active=true LIMIT 1",[workspace.id])).rowCount) return;
      const org=await run("INSERT INTO organizations(workspace_id,name,is_demo) VALUES($1,'Empresa exemplo',true) RETURNING id",[workspace.id]);
      await run("INSERT INTO contacts(workspace_id,email,organization_id,is_demo) VALUES($1,'contato@example.com',$2,true)",[workspace.id,org.rows[0].id]);
      await run("INSERT INTO leads(workspace_id,full_name,company,status,is_demo) VALUES($1,'Ana — demonstração','Empresa exemplo',$2,true)",[workspace.id,firstLeadStatusId(workspace.ai_schema)]);
      await run("INSERT INTO deals(workspace_id,title,value,stage,is_demo) VALUES($1,'Proposta de demonstração',5000,$2,true)",[workspace.id,firstDealStageId(workspace.ai_schema)]);
      await run("INSERT INTO tasks(workspace_id,title,status,due_at,is_demo) VALUES($1,'Preparar proposta de exemplo',$2,now()+interval '2 days',true)",[workspace.id,firstTaskStatusId(workspace.ai_schema)]);
      await run("INSERT INTO notes(workspace_id,title,content,is_demo) VALUES($1,'Comece por aqui','Explore os exemplos. A limpeza arquiva somente registros marcados como demonstração.',true)",[workspace.id]);
    });
    return NextResponse.json({ok:true});
  } catch(error) { return NextResponse.json({error:error instanceof Error ? error.message : "Não foi possível criar demonstração."},{status:400}); }
}
