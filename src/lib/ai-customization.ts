import { z } from "zod";
import { workspaceAccess } from "@/lib/access";
import { adminQuery, transaction } from "@/lib/db/pool";
import { readJson, rateLimit } from "@/lib/security";
import { NextResponse } from "next/server";

const modules = ["leads","deals","contacts","organizations","products","tasks","notes"] as const;
const key = z.string().regex(/^[a-z][a-z0-9_]{0,59}$/).refine(v=>!["constructor","prototype","__proto__"].includes(v));
const field = z.object({key,label:z.string().min(1).max(80),type:z.enum(["text","number","date"])});
const columns = z.array(z.object({id:key,title:z.string().min(1).max(80)})).min(2).max(12).refine(a=>new Set(a.map(c=>c.id)).size===a.length);
const labels = z.record(key,z.string().max(80));
const resultSchema = z.object({industry:z.string().max(80).optional(),summary:z.string().max(260).optional(),moduleLabels:labels.optional(),entityLabels:z.partialRecord(z.enum(modules),labels).optional(),customFields:z.partialRecord(z.enum(modules),z.array(field).max(40)).optional(),kanban:z.object({leads:columns.optional(),deals:columns.optional(),tasks:columns.optional()}).optional()});
const requestSchema=z.object({description:z.string().trim().min(8).max(4000).optional(),instruction:z.string().trim().min(6).max(4000).optional(),module:z.enum(modules).optional()});

function object(value:unknown):Record<string,unknown> { return value && typeof value==="object" && !Array.isArray(value) ? value as Record<string,unknown> : {}; }
export function mergeCustomization(previous:Record<string,unknown>, generated:z.infer<typeof resultSchema>) {
  const next:Record<string,unknown>={...previous,...generated};
  for(const name of ["moduleLabels","entityLabels","kanban"] as const) next[name]={...object(previous[name]),...object(generated[name])};
  const custom={...object(previous.customFields)};
  for(const [entity,fields] of Object.entries(generated.customFields ?? {})) {
    const existing=Array.isArray(custom[entity]) ? custom[entity] as z.infer<typeof field>[] : [];
    const byKey=new Map(existing.map(f=>[f.key,f]));
    for(const f of fields ?? []) byKey.set(f.key,f);
    custom[entity]=[...byKey.values()];
  }
  next.customFields=custom;
  return next;
}

export async function generateCustomization(request:Request, moduleOnly=false) {
  let reservation:{workspaceId:string;period:string}|null=null;
  try {
    const input=requestSchema.parse(await readJson(request,16384));
    if(moduleOnly ? !input.module || !input.instruction : !input.description) return NextResponse.json({error:"Descreva a personalização."},{status:400});
    const {user,workspace}=await workspaceAccess(true);
    if(!process.env.OPENAI_API_KEY) return NextResponse.json({error:"Personalização por IA indisponível."},{status:503});
    if(!await rateLimit(`ai:${workspace.id}`,5,60)) return NextResponse.json({error:"Aguarde um minuto antes de gerar novamente."},{status:429});
    const period=await transaction(null,async run=>{
      const result=await run("SELECT s.status,s.trial_ends_at,s.current_period_end,p.slug FROM workspace_subscriptions s JOIN subscription_plans p ON p.id=s.plan_id WHERE s.workspace_id=$1 FOR UPDATE OF s",[workspace.id]);
      const sub=result.rows[0];
      const validTrial=sub?.status==="trialing" && new Date(sub.trial_ends_at).getTime()>Date.now();
      const validPro=sub?.status==="active" && sub.slug==="pro" && (!sub.current_period_end || new Date(sub.current_period_end).getTime()>Date.now());
      if(!validTrial && !validPro) throw new Error("Seu plano não permite gerar personalizações.");
      const period=validTrial ? "trial" : new Date().toISOString().slice(0,7);
      const limit=validTrial ? 7 : 30;
      const used=await run("INSERT INTO ai_usage(workspace_id,period,used) VALUES($1,$2,1) ON CONFLICT(workspace_id,period) DO UPDATE SET used=ai_usage.used+1 WHERE ai_usage.used<$3 RETURNING used",[workspace.id,period,limit]);
      if(!used.rows.length) throw new Error("Créditos de IA esgotados para este período.");
      return period;
    });
    reservation={workspaceId:workspace.id,period};
    const response=await fetch("https://api.openai.com/v1/chat/completions",{
      method:"POST",headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,"Content-Type":"application/json"},signal:AbortSignal.timeout(45000),
      body:JSON.stringify({model:process.env.OPENAI_MODEL||"gpt-4o-mini",response_format:{type:"json_object"},max_tokens:3000,messages:[
        {role:"system",content:`Gere personalização de CRM em português brasileiro. Responda só JSON com industry, summary, moduleLabels (mapa módulo->rótulo), entityLabels (mapa módulo->mapa campo->rótulo), customFields (mapa módulo->lista {key,label,type:text|number|date}), kanban (leads/deals/tasks -> lista {id,title}, 2 a 12 colunas). Módulos: ${modules.join(",")}. Use identificadores snake_case ASCII começando por letra. Inclua somente módulos solicitados. Não gere dados de clientes.`},
        {role:"user",content:moduleOnly ? `Personalize somente ${input.module}: ${input.instruction}` : input.description!}
      ]})});
    if(!response.ok) throw new Error("O serviço de IA não respondeu. Tente novamente.");
    const body=await response.json();
    const generated=resultSchema.parse(JSON.parse(body.choices?.[0]?.message?.content ?? "{}"));
    if(!Object.keys(generated).length) throw new Error("A IA não retornou uma personalização válida.");
    if(moduleOnly) {
      for(const name of ["moduleLabels","entityLabels","customFields","kanban"] as const) {
        const value=object(generated[name]);
        for(const k of Object.keys(value)) if(k!==input.module) delete value[k];
      }
      delete generated.industry;
    }
    const base=object(workspace.ai_schema);
    const next=mergeCustomization(base,generated);
    const saved=await adminQuery("INSERT INTO ai_previews(workspace_id,user_id,base_schema,schema) VALUES($1,$2,$3::jsonb,$4::jsonb) RETURNING id",[workspace.id,user.id,JSON.stringify(base),JSON.stringify(next)]);
    return NextResponse.json({previewId:saved.rows[0].id,schema:next,summary:generated.summary||"Revise os campos e etapas antes de aplicar."});
  } catch(error) {
    if(reservation) await adminQuery("UPDATE ai_usage SET used=greatest(0,used-1) WHERE workspace_id=$1 AND period=$2",[reservation.workspaceId,reservation.period]);
    return NextResponse.json({error:error instanceof z.ZodError ? "Personalização inválida. Revise o pedido e tente novamente." : error instanceof Error ? error.message : "Não foi possível gerar."},{status:400});
  }
}
