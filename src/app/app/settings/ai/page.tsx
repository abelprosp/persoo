import { AiPreview } from "@/components/crm/ai-preview";
import { CrmTemplatePicker } from "./crm-template-picker";
export default function AiSettingsPage(){return <div className="mx-auto max-w-3xl space-y-6"><div><h1 className="text-2xl font-semibold">Personalize seu CRM</h1><p className="mt-2 text-muted-foreground">Adapte campos, nomes e etapas ao seu negócio.</p></div><CrmTemplatePicker /><section className="space-y-4 rounded-2xl border bg-white p-6"><h2 className="text-lg font-semibold">Criar com IA</h2><AiPreview /></section></div>;}
