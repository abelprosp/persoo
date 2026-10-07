/** Database outbox: each CRM mutation and its event are committed together. */
export async function runAutomationTick(db) {
 await db.query("BEGIN");
 try {
  const lock=await db.query("SELECT pg_try_advisory_xact_lock(hashtext('persoo-automation-worker')) AS locked");
  if(!lock.rows[0].locked){await db.query("ROLLBACK");return;}
  await db.query("INSERT INTO crm_worker_health(name,heartbeat_at) VALUES('automations',now()) ON CONFLICT(name) DO UPDATE SET heartbeat_at=now()");
  const events=await db.query("SELECT * FROM crm_events WHERE processed_at IS NULL ORDER BY occurred_at,id LIMIT 100 FOR UPDATE SKIP LOCKED");
  for(const event of events.rows){
   await db.query(`INSERT INTO crm_automation_runs(workspace_id,rule_id,entity_id,event_key)
    SELECT workspace_id,id,$2,$3 FROM crm_automation_rules WHERE workspace_id=$1 AND enabled AND trigger=$4
    AND created_at<=$6 AND ($4<>'deal_stage' OR stage=$5) AND workspace_access_allowed(workspace_id)
    ON CONFLICT(rule_id,event_key) DO NOTHING`,[event.workspace_id,event.entity_id,event.id,event.kind,event.stage,event.occurred_at]);
   await db.query("UPDATE crm_events SET processed_at=now() WHERE id=$1",[event.id]);
  }
  await db.query(`INSERT INTO crm_automation_runs(workspace_id,rule_id,entity_id,event_key)
   SELECT d.workspace_id,r.id,d.id,'stale:'||d.id::text||':'||d.updated_at::text FROM crm_automation_rules r
   JOIN deals d ON d.workspace_id=r.workspace_id WHERE r.enabled AND r.trigger='deal_stale'
   AND d.active AND NOT d.is_demo AND d.outcome='open' AND d.updated_at<now()-make_interval(hours=>r.delay_hours)
   AND workspace_access_allowed(d.workspace_id)
   AND NOT EXISTS(SELECT 1 FROM crm_automation_runs j WHERE j.rule_id=r.id AND j.event_key='stale:'||d.id::text||':'||d.updated_at::text)
   ORDER BY d.updated_at LIMIT 100 ON CONFLICT(rule_id,event_key) DO NOTHING`);
  const jobs=await db.query(`SELECT j.*,r.enabled,r.trigger,r.stage,r.action,r.title,r.delay_hours,r.assignee_id
   FROM crm_automation_runs j JOIN crm_automation_rules r ON r.id=j.rule_id
   WHERE j.state='pending' AND j.available_at<=now() ORDER BY j.available_at,j.id LIMIT 50 FOR UPDATE OF j SKIP LOCKED`);
  for(const job of jobs.rows){
   await db.query("SAVEPOINT automation_job");
   try{
    const ws=(await db.query("SELECT owner_id,ai_schema,workspace_access_allowed(id) AS allowed FROM workspaces WHERE id=$1",[job.workspace_id])).rows[0];
    const table=job.trigger==='lead_created'?'leads':'deals';
    const record=(await db.query(`SELECT * FROM ${table} WHERE workspace_id=$1 AND id=$2`,[job.workspace_id,job.entity_id])).rows[0];
    const staleStillValid=job.trigger!=='deal_stale' || record?.outcome==='open' && new Date(record.updated_at).getTime()<Date.now()-job.delay_hours*3600000;
    if(!job.enabled || !ws?.allowed || !record?.active || !staleStillValid || job.trigger==='deal_stage' && record.stage!==job.stage){
     await db.query("UPDATE crm_automation_runs SET state='skipped',completed_at=now() WHERE id=$1",[job.id]);continue;
    }
    const member=job.assignee_id?(await db.query("SELECT user_id FROM workspace_members WHERE workspace_id=$1 AND user_id=$2",[job.workspace_id,job.assignee_id])).rows[0]:null;
    const assignee=member?.user_id??ws.owner_id;
    const profile=(await db.query("SELECT full_name FROM profiles WHERE id=$1",[assignee])).rows[0];
    const entityType=table==='leads'?'lead':'deal';
    const title=(job.title+" · "+(record.full_name??record.title)).slice(0,300);
    if(job.action==='task'){
     const columns=ws.ai_schema?.kanban?.tasks;
     const status=Array.isArray(columns)&&typeof columns[0]?.id==='string'?columns[0].id:'todo';
     await db.query("INSERT INTO tasks(workspace_id,title,status,priority,due_at,assignee_name,related_type,related_id) VALUES($1,$2,$3,'medium',now()+make_interval(hours=>$4),$5,$6,$7)",[job.workspace_id,title,status,job.delay_hours,profile?.full_name??null,entityType,job.entity_id]);
    }
    const query=encodeURIComponent(record.full_name??record.title??'');
    await db.query("INSERT INTO crm_notifications(workspace_id,user_id,title,href,run_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT(run_id) DO NOTHING",[job.workspace_id,assignee,title,`/app/search?entity=${table}&q=${query}`,job.id]);
    await db.query("UPDATE crm_automation_runs SET state='done',attempts=attempts+1,completed_at=now(),error=NULL WHERE id=$1",[job.id]);
   }catch(error){
    await db.query("ROLLBACK TO SAVEPOINT automation_job");
    await db.query("UPDATE crm_automation_runs SET attempts=attempts+1,state=CASE WHEN attempts+1>=3 THEN 'failed' ELSE 'pending' END,available_at=now()+interval '5 minutes',error=$2 WHERE id=$1",[job.id,'Falha ao executar; código '+(error?.code??'unknown')]);
   }finally{await db.query("RELEASE SAVEPOINT automation_job");}
  }
  await db.query("COMMIT");
 }catch(error){await db.query("ROLLBACK");throw error;}
}
