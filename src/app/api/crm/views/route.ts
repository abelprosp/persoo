import {NextResponse} from "next/server";
import {z} from "zod";
import {workspaceAccess} from "@/lib/access";
import {userRunner} from "@/lib/db/pool";
import {searchSchema} from "@/lib/crm-search";
import {readJson,uuid} from "@/lib/security";
import {operationError,InputError} from "@/lib/operations-api";
export async function GET(){try{const {workspace,user}=await workspaceAccess();const result=await userRunner(user.id)("SELECT id,name,filters FROM crm_saved_views WHERE workspace_id=$1 AND user_id=$2 ORDER BY name",[workspace.id,user.id]);return NextResponse.json(result.rows);}catch(error){return operationError(error);}}
export async function POST(request:Request){try{
 const {workspace,user}=await workspaceAccess();const body=z.discriminatedUnion("action",[z.object({action:z.literal("save"),name:z.string().trim().min(1).max(80),filters:searchSchema}),z.object({action:z.literal("delete"),id:uuid})]).parse(await readJson(request));
 const run=userRunner(user.id);
 if(body.action==="delete")await run("DELETE FROM crm_saved_views WHERE id=$1 AND workspace_id=$2 AND user_id=$3",[body.id,workspace.id,user.id]);
 else{
 const count=await run("SELECT count(*) FROM crm_saved_views WHERE workspace_id=$1 AND user_id=$2",[workspace.id,user.id]);
 if(Number(count.rows[0].count)>=30)throw new InputError("Limite de 30 filtros salvos. Remova um para continuar.");
 await run("INSERT INTO crm_saved_views(workspace_id,user_id,name,filters) VALUES($1,$2,$3,$4::jsonb) ON CONFLICT(workspace_id,user_id,name) DO UPDATE SET filters=excluded.filters",[workspace.id,user.id,body.name,JSON.stringify({...body.filters,page:1})]);
 }
 return NextResponse.json({ok:true});
 }catch(error){return operationError(error);}}
