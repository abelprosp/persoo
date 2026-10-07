import {NextResponse} from "next/server";
import {workspaceAccess} from "@/lib/access";
import {userRunner} from "@/lib/db/pool";
import {searchSchema} from "@/lib/crm-search";
import {operationError} from "@/lib/operations-api";
export async function GET(request:Request){
 try{
 const {user,workspace}=await workspaceAccess();
 const filter=searchSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
 const run=userRunner(user.id);const tables=["leads","deals","contacts","organizations","tasks","products","notes"];
 const selected=filter.entity==="all"?tables:[filter.entity];
 // Table names are selected only from a fixed enum; all user values are bound parameters.
 const sql=selected.map(table=>`SELECT id,'${table}'::text AS entity,coalesce(to_jsonb(r)->>'full_name',to_jsonb(r)->>'title',to_jsonb(r)->>'name',to_jsonb(r)->>'email','Sem nome') AS title,
 to_jsonb(r)->>'email' AS email,to_jsonb(r)->>'phone' AS phone,coalesce(to_jsonb(r)->>'owner_name',to_jsonb(r)->>'assignee_name') AS owner,
 coalesce(to_jsonb(r)->>'stage',to_jsonb(r)->>'status') AS status,updated_at,to_jsonb(r)-'workspace_id' AS detail FROM ${table} r
 WHERE workspace_id=$1 AND ($2='all' OR active=($2='true'))
 AND ($3='' OR concat_ws(' ',to_jsonb(r)->>'full_name',to_jsonb(r)->>'title',to_jsonb(r)->>'name',to_jsonb(r)->>'email',to_jsonb(r)->>'phone',to_jsonb(r)->>'company',to_jsonb(r)->>'organization_name',to_jsonb(r)->>'content',to_jsonb(r)->>'custom_data') ILIKE $4 ESCAPE '\\')
 AND ($5='' OR lower(coalesce(to_jsonb(r)->>'owner_name',to_jsonb(r)->>'assignee_name',''))=lower($5))
 AND ($6='' OR coalesce(to_jsonb(r)->>'stage',to_jsonb(r)->>'status','')=$6)
 AND ($7::int=0 OR updated_at<now()-make_interval(days=>$7::int))
 AND ($8='any' OR (to_jsonb(r)->>'due_at')::timestamptz < CASE WHEN $8='today' THEN date_trunc('day',now())+interval '1 day' ELSE now() END AND ($8<>'today' OR (to_jsonb(r)->>'due_at')::timestamptz>=date_trunc('day',now())))`).join(" UNION ALL ");
 const term=filter.q.replace(/[\\%_]/g,"\\$&");
 const params=[workspace.id,filter.active,filter.q,"%"+term+"%",filter.owner,filter.status,Number(filter.stale),filter.due];
 const result=await run(`WITH results AS (${sql}) SELECT * FROM results ORDER BY updated_at DESC,id,entity LIMIT 26 OFFSET $9`,[...params,(filter.page-1)*25]);
 return NextResponse.json({rows:result.rows.slice(0,25),hasNext:result.rows.length>25});
 }catch(error){return operationError(error);}
}
