import {readFile,readdir} from "node:fs/promises";
import {createHash} from "node:crypto";
import pg from "pg";
const client=new pg.Client({connectionString:process.env.DATABASE_URL_ADMIN});
await client.connect();
try{
 await client.query("SELECT pg_advisory_lock(hashtext('persoo-migrations'))");
 await client.query("CREATE TABLE IF NOT EXISTS public.schema_migrations(name text primary key,sha256 text not null,applied_at timestamptz not null default now())");
 await client.query("REVOKE ALL ON public.schema_migrations FROM authenticated");
 const files=(await readdir(new URL("../supabase/migrations/",import.meta.url))).filter(n=>n.endsWith(".sql")).sort();
 for(const name of files){
  const sql=await readFile(new URL("../supabase/migrations/"+name,import.meta.url),"utf8");
  const hash=createHash("sha256").update(sql.replaceAll("\r\n","\n")).digest("hex");
  const applied=await client.query("SELECT sha256 FROM schema_migrations WHERE name=$1",[name]);
  if(applied.rowCount){if(applied.rows[0].sha256!==hash)throw Error("Migration alterada após aplicação: "+name); continue;}
  const baseline=process.argv.includes("--baseline-through-016") && name<"017";
  await client.query("BEGIN");
  try{
   if(!baseline)await client.query(sql);
   await client.query("INSERT INTO schema_migrations(name,sha256) VALUES($1,$2)",[name,hash]);
   await client.query("COMMIT");
   console.log(baseline?"Registrada base: "+name:"Aplicada: "+name);
  }catch(error){await client.query("ROLLBACK");throw error;}
 }
}finally{await client.end();}
