import { NextResponse } from "next/server";
import { z } from "zod";
import { workspaceAccess } from "@/lib/access";
import { transaction } from "@/lib/db/pool";
import { readJson, uuid } from "@/lib/security";
const text = z.string().trim().max(300).optional().transform(v=>v || null);
const email = z.union([z.email().max(254),z.literal("")]).optional().transform(v=>v || null);
const money = z.union([z.number(),z.string()]).transform(v=>String(v).trim()==="" ? null : Number(String(v).replace(",","."))).refine(v=>v===null || Number.isFinite(v) && v>=0 && v<=1e12);
const custom = z.record(z.string().max(80),z.union([z.string().max(4000),z.number().finite(),z.boolean(),z.null()])).optional();
const common = {email,phone:text,custom_data:custom};
const payloads = {
 lead:z.object({...common,full_name:z.string().trim().min(1).max(200),company:text,owner_name:text,qualified_at:z.iso.datetime().nullable().optional()}),
 deal:z.object({...common,title:z.string().trim().min(1).max(200),organization_name:text,assignee_name:text,value:money,outcome:z.enum(["open","won","lost"]).optional(),probability:z.coerce.number().min(0).max(1).optional(),expected_close_at:z.union([z.iso.date(),z.literal("")]).optional().transform(v=>v===""?null:v)}),
 task:z.object({title:z.string().trim().min(1).max(200),priority:z.enum(["low","medium","high","urgent"]),assignee_name:text,due_at:z.union([z.iso.datetime({offset:true}),z.literal(""),z.null()]).optional().transform(v=>v || null),custom_data:custom})
};
export async function POST(request:Request) {
 try {
  const body=z.object({id:uuid,variant:z.enum(["lead","deal","task"]),payload:z.unknown()}).parse(await readJson(request));
  const parsed=payloads[body.variant].safeParse(body.payload);
  if (!parsed.success) return NextResponse.json({error:"Revise os campos, valores e datas."},{status:400});
  const {user,workspace}=await workspaceAccess();
  const table={lead:"leads",deal:"deals",task:"tasks"}[body.variant];
  const fields=Object.entries(parsed.data).filter(([,v])=>v!==undefined);
  const changed=await transaction(user.id,async run=>{
    const result=await run(`UPDATE ${table} SET ${fields.map(([key],i)=>'"'+key+'"=$'+(i+3)).join(",")},updated_at=now() WHERE workspace_id=$1 AND id=$2 RETURNING id`,[workspace.id,body.id,...fields.map(([,v])=>typeof v==="object" && v!==null?JSON.stringify(v):v)]);
    if(!result.rowCount) return false;
    await run("INSERT INTO card_activities(workspace_id,entity_type,entity_id,kind,title,description,author_name) VALUES($1,$2,$3,'edit','Registro atualizado','Campos editados',$4)",[workspace.id,body.variant,body.id,user.email]);
    return true;
  });
  return NextResponse.json(changed?{ok:true}:{error:"Registro não encontrado."},{status:changed?200:404});
 } catch(error) { return NextResponse.json({error:error instanceof z.ZodError?"Pedido inválido.":"Não foi possível salvar. Verifique seu acesso e tente novamente."},{status:error instanceof z.ZodError?400:403}); }
}
