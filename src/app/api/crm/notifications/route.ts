import {NextResponse} from "next/server";
import {z} from "zod";
import {workspaceAccess} from "@/lib/access";
import {userRunner} from "@/lib/db/pool";
import {readJson,uuid} from "@/lib/security";
import {operationError} from "@/lib/operations-api";
export async function GET(){try{const {workspace,user}=await workspaceAccess();const result=await userRunner(user.id)("SELECT id,title,href,read_at,created_at FROM crm_notifications WHERE workspace_id=$1 AND user_id=$2 ORDER BY created_at DESC LIMIT 100",[workspace.id,user.id]);return NextResponse.json(result.rows);}catch(error){return operationError(error);}}
export async function PATCH(request:Request){try{const {workspace,user}=await workspaceAccess();const input=z.object({id:uuid}).parse(await readJson(request,4096));await userRunner(user.id)("UPDATE crm_notifications SET read_at=coalesce(read_at,now()) WHERE id=$1 AND workspace_id=$2 AND user_id=$3",[input.id,workspace.id,user.id]);return NextResponse.json({ok:true});}catch(error){return operationError(error);}}
