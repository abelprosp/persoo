import {NextResponse} from "next/server";
import {z} from "zod";
import {workspaceAccess} from "@/lib/access";
import {adminQuery} from "@/lib/db/pool";
import {readJson,uuid} from "@/lib/security";
import {whatsAppGraph,workspaceWhatsApp} from "@/lib/whatsapp";
import {operationError} from "@/lib/operations-api";
const input=z.object({conversationId:uuid,body:z.string().trim().min(1).max(4096)});
export async function POST(request:Request){try{const {workspace}=await workspaceAccess();const data=input.parse(await readJson(request,12000));const connection=await workspaceWhatsApp(workspace.id);const conversation=(await adminQuery("SELECT id,wa_id FROM whatsapp_conversations WHERE id=$1 AND workspace_id=$2",[data.conversationId,workspace.id])).rows[0];if(!conversation)return NextResponse.json({error:"Conversa não encontrada."},{status:404});const requestId=crypto.randomUUID();const result=await whatsAppGraph(connection.phone_number_id,connection.token,{messaging_product:"whatsapp",to:conversation.wa_id,type:"text",text:{body:data.body}});const providerId=String(result.messages?.[0]?.id??"");await adminQuery("INSERT INTO whatsapp_messages(workspace_id,conversation_id,request_id,provider_id,direction,body,status) VALUES($1,$2,$3,$4,'out',$5,'sent')",[workspace.id,conversation.id,requestId,providerId||null,data.body]);return NextResponse.json({ok:true});}catch(error){return operationError(error);}}
