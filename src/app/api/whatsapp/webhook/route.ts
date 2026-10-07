import { NextResponse } from "next/server";
import { adminQuery } from "@/lib/db/pool";
import { readBody } from "@/lib/security";
import { verifyWhatsAppSignature } from "@/lib/whatsapp";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const valid = url.searchParams.get("hub.mode") === "subscribe" &&
    url.searchParams.get("hub.verify_token") === process.env.WHATSAPP_VERIFY_TOKEN;
  return valid ? new Response(url.searchParams.get("hub.challenge")) : NextResponse.json({ error: "Verificação inválida" }, { status: 403 });
}

type MetaEntry = { changes?: Array<{ value?: Record<string, unknown> }> };
type MetaMessage = { from?: string; id?: string; timestamp?: string; text?: { body?: string } };

export async function POST(request: Request) {
  const raw = await readBody(request, 1024 * 1024);
  if (!verifyWhatsAppSignature(raw, request.headers.get("x-hub-signature-256"))) return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  try {
    const payload = JSON.parse(raw.toString("utf8")) as { entry?: MetaEntry[] };
    for (const entry of payload.entry ?? []) for (const change of entry.changes ?? []) {
      const value = change.value ?? {};
      const metadata = (value.metadata ?? {}) as { phone_number_id?: string };
      const phoneNumberId = metadata.phone_number_id ?? "";
      if (!phoneNumberId) continue;
      const connection = (await adminQuery("SELECT workspace_id FROM whatsapp_connections WHERE phone_number_id=$1 AND enabled", [phoneNumberId])).rows[0];
      if (!connection) continue;
      for (const message of (value.messages as MetaMessage[] | undefined) ?? []) {
        const from = message.from ?? "", providerId = message.id ?? "";
        if (!from || !providerId) continue;
        await adminQuery(`WITH conversation AS (
          INSERT INTO whatsapp_conversations(workspace_id,wa_id,name,last_inbound_at) VALUES($1,$2,$2,now())
          ON CONFLICT(workspace_id,wa_id) DO UPDATE SET last_inbound_at=now(),updated_at=now() RETURNING id)
          INSERT INTO whatsapp_messages(workspace_id,conversation_id,provider_id,direction,body,status,provider_at)
          SELECT $1,id,$3,'in',$4,'received',to_timestamp($5) FROM conversation ON CONFLICT(provider_id) DO NOTHING`,
          [connection.workspace_id, from, providerId, message.text?.body ?? "[Mensagem não textual]", Number(message.timestamp ?? Date.now() / 1000)]);
      }
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("WhatsApp webhook failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Evento recebido para reprocessamento" }, { status: 500 });
  }
}
