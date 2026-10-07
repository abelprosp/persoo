import {NextResponse} from "next/server";
import {z} from "zod";
import {workspaceAccess} from "@/lib/access";
import {adminQuery} from "@/lib/db/pool";
import {getDealKanbanColumns} from "@/lib/kanban-schema";
import {readJson,uuid} from "@/lib/security";
import {operationError,InputError} from "@/lib/operations-api";
const rule=z.object({name:z.string().trim().min(1).max(100),trigger:z.enum(["lead_created","deal_stage","deal_stale"]),stage:z.string().max(80).optional(),delay_hours:z.coerce.number().int().min(1).max(8760),action:z.enum(["task","notification"]),title:z.string().trim().min(1).max(180),assignee_id:uuid.nullable()});
export async function GET(){try{const {workspace}=await workspaceAccess(true);const [rules,runs,health,members]=await Promise.all([
 adminQuery("SELECT * FROM crm_automation_rules WHERE workspace_id=$1 ORDER BY created_at DESC",[workspace.id]),
 adminQuery("SELECT j.id,j.state,j.attempts,j.error,j.created_at,j.completed_at,r.name FROM crm_automation_runs j JOIN crm_automation_rules r ON r.id=j.rule_id WHERE j.workspace_id=$1 ORDER BY j.created_at DESC LIMIT 50",[workspace.id]),
 adminQuery("SELECT heartbeat_at FROM crm_worker_health WHERE name='automations'"),
 adminQuery("SELECT p.id,p.full_name FROM workspace_members m JOIN profiles p ON p.id=m.user_id WHERE m.workspace_id=$1",[workspace.id])]);
 return NextResponse.json({rules:rules.rows,runs:runs.rows,heartbeat:health.rows[0]?.heartbeat_at??null,members:members.rows,stages:getDealKanbanColumns(workspace.ai_schema)});
 }catch(error){return operationError(error);}}
export async function POST(request:Request){try{
 const {workspace}=await workspaceAccess(true);
 const body=z.discriminatedUnion("action",[z.object({action:z.literal("create"),rule}),z.object({action:z.literal("toggle"),id:uuid,enabled:z.boolean()}),z.object({action:z.literal("retry"),id:uuid})]).parse(await readJson(request));
 if(body.action==="create"){
  const r=body.rule;
  if(r.trigger==='deal_stage'&&!getDealKanbanColumns(workspace.ai_schema).some(c=>c.id===r.stage))throw new InputError("Selecione uma etapa válida.");
  if(r.assignee_id && !(await adminQuery("SELECT 1 FROM workspace_members WHERE workspace_id=$1 AND user_id=$2",[workspace.id,r.assignee_id])).rowCount)throw new InputError("Responsável não pertence à empresa.");
  if(Number((await adminQuery("SELECT count(*) FROM crm_automation_rules WHERE workspace_id=$1",[workspace.id])).rows[0].count)>=30)throw new InputError("Limite de 30 regras por empresa.");
  await adminQuery("INSERT INTO crm_automation_rules(workspace_id,name,trigger,stage,delay_hours,action,title,assignee_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",[workspace.id,r.name,r.trigger,r.stage??null,r.delay_hours,r.action,r.title,r.assignee_id]);
 }else if(body.action==="toggle")await adminQuery("UPDATE crm_automation_rules SET enabled=$1 WHERE id=$2 AND workspace_id=$3",[body.enabled,body.id,workspace.id]);
 else await adminQuery("UPDATE crm_automation_runs SET state='pending',attempts=0,available_at=now(),error=NULL WHERE id=$1 AND workspace_id=$2 AND state='failed'",[body.id,workspace.id]);
 return NextResponse.json({ok:true});
 }catch(error){return operationError(error);}}
