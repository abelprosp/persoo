import pg from "pg";
import {runAutomationTick} from "./automation-engine.mjs";
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL_ADMIN,max:1,connectionTimeoutMillis:5000,statement_timeout:15000});
let stopped=false;
process.on("SIGINT",()=>{stopped=true;});process.on("SIGTERM",()=>{stopped=true;});
try{
 do{
  let client;
  try{client=await pool.connect();await runAutomationTick(client);}
  catch(error){console.error("Automation worker failed",error?.code??error?.name);if(process.argv.includes("--once"))process.exitCode=1;}
  finally{client?.release();}
  if(stopped || process.argv.includes("--once"))break;
  for(let i=0;i<15&&!stopped;i++)await new Promise(resolve=>setTimeout(resolve,1000));
 }while(!stopped);
}finally{await pool.end();}
