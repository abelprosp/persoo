import { workspaceAccess } from "@/lib/access";
import { transaction } from "@/lib/db/pool";
import { readJson, uuid } from "@/lib/security";
import { getLeadKanbanColumns,getDealKanbanColumns,getTaskKanbanColumns } from "@/lib/kanban-schema";
import { z } from "zod";
import { NextResponse } from "next/server";
const schema=z.object({variant:z.enum(["lead","deal","task"]),id:uuid,fromColumn:z.string().max(80).optional(),toColumn:z.string().min(1).max(80)});
export async function POST(req:Request) {
  try {
    const data=schema.parse(await readJson(req));
    const {user,workspace}=await workspaceAccess();
    const columns=data.variant==="lead" ? getLeadKanbanColumns(workspace.ai_schema) : data.variant==="deal" ? getDealKanbanColumns(workspace.ai_schema) : getTaskKanbanColumns(workspace.ai_schema);
    if(!columns.some(c=>c.id===data.toColumn)) return NextResponse.json({error:"Etapa inválida."},{status:400});
    const table={lead:"leads",deal:"deals",task:"tasks"}[data.variant];
    const column=data.variant==="deal" ? "stage" : "status";
    await transaction(user.id,async run=>{
      const result=await run(`SELECT ${column} AS previous FROM ${table} WHERE id=$1 AND workspace_id=$2 FOR UPDATE`,[data.id,workspace.id]);
      if(!result.rows[0]) throw new Error("Registro não encontrado.");
      const previous=result.rows[0].previous;
      if(data.fromColumn && previous!==data.fromColumn) throw new Error("Este cartão mudou. Atualize o quadro e tente novamente.");
      if(previous===data.toColumn)return;
      await run(`UPDATE ${table} SET ${column}=$1,updated_at=now() WHERE id=$2 AND workspace_id=$3`,[data.toColumn,data.id,workspace.id]);
      await run("INSERT INTO card_activities(workspace_id,entity_type,entity_id,kind,title,description,author_name,meta) VALUES($1,$2,$3,'move','Etapa alterada',$4,$5,$6::jsonb)",[workspace.id,data.variant,data.id,`Movido de ${previous} para ${data.toColumn}.`,user.email,JSON.stringify({from:previous,to:data.toColumn})]);
      await run("UPDATE card_column_history SET exited_at=now() WHERE workspace_id=$1 AND entity_type=$2 AND entity_id=$3 AND exited_at IS NULL",[workspace.id,data.variant,data.id]);
      await run("INSERT INTO card_column_history(workspace_id,entity_type,entity_id,column_id,entered_at) VALUES($1,$2,$3,$4,now())",[workspace.id,data.variant,data.id,data.toColumn]);
    });
    return NextResponse.json({ok:true});
  }catch(error){return NextResponse.json({error:error instanceof z.ZodError ? "Pedido inválido." : error instanceof Error ? error.message : "Falha ao mover cartão."},{status:400});}
}
