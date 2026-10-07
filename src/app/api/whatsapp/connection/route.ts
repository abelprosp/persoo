import {NextResponse} from "next/server";
import {z} from "zod";
import {workspaceAccess} from "@/lib/access";
import {adminQuery} from "@/lib/db/pool";
import {readJson} from "@/lib/security";
import {encryptWhatsAppToken} from "@/lib/whatsapp";
import {operationError} from "@/lib/operations-api";
const input=z.object({phoneNumberId:z.string().trim().regex(/^\d{6,30}$/),displayPhone:z.string().trim().min(3).max(40),accessToken:z.string().trim().min(20).max(4096)});
export async function GET(){try{const {workspace}=await workspaceAccess(true);const row=(await adminQuery("SELECT phone_number_id,display_phone,enabled,updated_at FROM whatsapp_connections WHERE workspace_id=$1",[workspace.id])).rows[0]??null;return NextResponse.json(row);}catch(error){return operationError(error);}}
export async function POST(request:Request){try{const {workspace}=await workspaceAccess(true);const value=input.parse(await readJson(request,10000));await adminQuery("INSERT INTO whatsapp_connections(workspace_id,phone_number_id,token_ciphertext,display_phone) VALUES($1,$2,$3,$4) ON CONFLICT(workspace_id) DO UPDATE SET phone_number_id=excluded.phone_number_id,token_ciphertext=excluded.token_ciphertext,display_phone=excluded.display_phone,enabled=true,updated_at=now()",[workspace.id,value.phoneNumberId,encryptWhatsAppToken(value.accessToken),value.displayPhone]);return NextResponse.json({ok:true});}catch(error){return operationError(error);}}
export async function DELETE(){try{const {workspace}=await workspaceAccess(true);await adminQuery("UPDATE whatsapp_connections SET enabled=false,updated_at=now() WHERE workspace_id=$1",[workspace.id]);return NextResponse.json({ok:true});}catch(error){return operationError(error);}}
