"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
type Preview={previewId:string;summary:string;schema:Record<string,unknown>};
export function AiPreview({module}:{module?:string}) {
 const router=useRouter();
 const [description,setDescription]=useState("");
 const [preview,setPreview]=useState<Preview|null>(null);
 const [pending,setPending]=useState(false);
 const [message,setMessage]=useState("");
 async function request(url:string,body:unknown) {
  setPending(true);setMessage("");
  try {const response=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const data=await response.json();if(!response.ok)throw new Error(data.error||"Não foi possível concluir.");return data;}
  catch(error){setMessage(error instanceof Error ? error.message : "Falha de conexão. Tente novamente.");return null;}finally{setPending(false);}
 }
 return <div className="space-y-4"><label className="block space-y-2"><span className="text-sm font-medium">Descreva o que deseja ajustar</span><Textarea rows={4} maxLength={4000} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Ex.: vendas B2B, campos para segmento e tamanho da empresa." /></label><p className="text-xs text-muted-foreground">Cada geração usa 1 crédito. Você revisa a proposta antes de aplicá-la. Campos existentes são preservados.</p><Button disabled={pending||description.trim().length<8} onClick={async()=>{const data=await request(module?"/api/ai/customize-module":"/api/ai/customize",module?{module,instruction:description}:{description});if(data)setPreview(data);}}>{pending?"Aguarde…":"Gerar prévia"}</Button>
 {preview && <section className="space-y-3 rounded-xl border bg-muted/30 p-4"><h3 className="font-semibold">Revise sua personalização</h3><p className="text-sm">{preview.summary}</p><PreviewDetails schema={preview.schema} /><Button disabled={pending} onClick={async()=>{if(await request("/api/ai/preview",{action:"apply",previewId:preview.previewId})){setPreview(null);setMessage("Personalização aplicada. Você pode restaurar a versão anterior.");router.refresh();}}}>Aplicar esta versão</Button><Button variant="ghost" disabled={pending} onClick={()=>setPreview(null)}>Descartar</Button></section>}
 <div><Button variant="outline" disabled={pending} onClick={async()=>{if(await request("/api/ai/preview",{action:"undo"})){setPreview(null);setMessage("Configuração anterior restaurada.");router.refresh();}}}>Restaurar configuração anterior</Button></div>{message && <p role="status" className="text-sm">{message}</p>}</div>;
}
function PreviewDetails({schema}:{schema:Record<string,unknown>}) {
 const fields=(schema.customFields||{}) as Record<string,{label:string}[]>;
 const boards=(schema.kanban||{}) as Record<string,unknown>;
 return <div className="space-y-2 text-sm">{Object.entries(fields).filter(([,v])=>Array.isArray(v)&&v.length).map(([k,v])=><p key={k}><strong>{k}:</strong> {v.map(f=>f.label).join(", ")}</p>)}{Object.entries(boards).filter(([,v])=>Array.isArray(v)).map(([k,v])=><p key={k}><strong>Etapas de {k}:</strong> {(v as {title:string}[]).map(c=>c.title).join(" → ")}</p>)}</div>;
}
