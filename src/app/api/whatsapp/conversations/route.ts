import {NextResponse} from "next/server";
import {workspaceAccess} from "@/lib/access";
import {adminQuery} from "@/lib/db/pool";
import {operationError} from "@/lib/operations-api";
export async function GET(){try{const {workspace}=await workspaceAccess();const result=await adminQuery("SELECT c.id,c.wa_id,c.name,c.updated_at,c.last_inbound_at,(SELECT json_agg(m ORDER BY m.created_at DESC) FROM (SELECT id,direction,body,status,created_at FROM whatsapp_messages WHERE conversation_id=c.id ORDER BY created_at DESC LIMIT 50) m) AS messages FROM whatsapp_conversations c WHERE c.workspace_id=$1 ORDER BY c.updated_at DESC LIMIT 100",[workspace.id]);return NextResponse.json(result.rows);}catch(error){return operationError(error);}}
