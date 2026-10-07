import { NextResponse } from "next/server";
import { z } from "zod";
import { workspaceAccess } from "@/lib/access";
import { adminQuery, transaction } from "@/lib/db/pool";
import { readJson, rateLimit, uuid } from "@/lib/security";
import { importRowSchema, type ImportRow } from "@/lib/crm-import";
import { firstLeadStatusId } from "@/lib/kanban-schema";
import { InputError,operationError } from "@/lib/operations-api";

const schema=z.discriminatedUnion("action",[
 z.object({action:z.literal("preview"),entity:z.enum(["leads","contacts"]),rows:z.array(importRowSchema).min(1).max(1000)}),
 z.object({action:z.literal("commit"),id:uuid,duplicates:z.enum(["skip","fill"])}),
]);
export async function POST(request:Request) {
 try {
  const {workspace,user}=await workspaceAccess(true);
  if(!await rateLimit("import:"+user.id,20,3600))throw new InputError("Limite de importações atingido. Tente mais tarde.");
  const input=schema.parse(await readJson(request,2*1024*1024));
  if(input.action==="preview"){
   const existing=await adminQuery(`SELECT id,lower(trim(email)) AS email,regexp_replace(coalesce(phone,''),'[^0-9]','','g') AS phone FROM ${input.entity} WHERE workspace_id=$1`,[workspace.id]);
   const emails=new Set(existing.rows.map(r=>r.email).filter(Boolean));const phones=new Set(existing.rows.map(r=>r.phone).filter(Boolean));
   let duplicateCount=0;
   for(const row of input.rows){if(row.email && emails.has(row.email) || row.phone && phones.has(row.phone))duplicateCount++;if(row.email)emails.add(row.email);if(row.phone)phones.add(row.phone);}
   const saved=await adminQuery("INSERT INTO crm_imports(workspace_id,user_id,entity,rows) VALUES($1,$2,$3,$4::jsonb) RETURNING id",[workspace.id,user.id,input.entity,JSON.stringify(input.rows)]);
   return NextResponse.json({id:saved.rows[0].id,total:input.rows.length,duplicates:duplicateCount,newRecords:input.rows.length-duplicateCount});
  }
  const result=await transaction(null,async run=>{
   await run("SELECT pg_advisory_xact_lock(hashtext($1))",["import:"+workspace.id]);
   await run("SELECT set_config('request.jwt.claim.sub',$1,true)",[user.id]);
   const draft=(await run("SELECT * FROM crm_imports WHERE id=$1 AND workspace_id=$2 AND user_id=$3 FOR UPDATE",[input.id,workspace.id,user.id])).rows[0];
   if(!draft)throw new InputError("Prévia não encontrada.");
   if(draft.result)return draft.result;
   if(new Date(draft.expires_at).getTime()<Date.now())throw new InputError("Prévia expirada. Gere outra.");
   const result={created:0,updated:0,skipped:0,conflicts:0};
   const table=draft.entity==="leads"?"leads":"contacts";
   const existing=await run(`SELECT id,email,phone,full_name,active${table==="leads"?",company":""} FROM ${table} WHERE workspace_id=$1 FOR UPDATE`,[workspace.id]);
   const records=existing.rows;
   for(const row of draft.rows as ImportRow[]){
    const matches=records.filter(r=>row.email && String(r.email??"").trim().toLowerCase()===row.email || row.phone && String(r.phone??"").replace(/\D/g,"")===row.phone);
    if(matches.length>1){result.conflicts++;continue;}
    const match=matches[0];
    if(match){
     if(input.duplicates==="skip" || !match.active){result.skipped++;continue;}
     const fields=table==="leads"?["full_name","email","phone","company"] as const:["full_name","email","phone"] as const;
     const changes=fields.filter(key=>!String(match[key]??"").trim() && row[key]);
     if(!changes.length){result.skipped++;continue;}
     await run(`UPDATE ${table} SET ${changes.map((key,i)=>`${key}=$${i+3}`).join(",")},updated_at=now() WHERE id=$1 AND workspace_id=$2`,[match.id,workspace.id,...changes.map(key=>row[key])]);
     for(const key of changes)match[key]=row[key];result.updated++;
    }else{
     const fields=["workspace_id","full_name","email","phone",...(table==="leads"?["company","status"]:[])];
     const values=[workspace.id,row.full_name,row.email||null,row.phone||null,...(table==="leads"?[row.company||null,firstLeadStatusId(workspace.ai_schema)]:[])];
     const inserted=await run(`INSERT INTO ${table}(${fields.join(",")}) VALUES(${values.map((_,i)=>"$"+(i+1)).join(",")}) RETURNING *`,values);
     records.push(inserted.rows[0]);result.created++;
    }
   }
   await run("UPDATE crm_imports SET result=$1::jsonb,rows='[]'::jsonb WHERE id=$2",[JSON.stringify(result),input.id]);
   return result;
  });
  return NextResponse.json(result);
 }catch(error){return operationError(error);}
}
