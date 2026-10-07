import Link from "next/link";
import { Cable, FileInput, MessageCircle, Workflow } from "lucide-react";
import CaptacaoPage from "../settings/captacao/page";

const connections = [
  { href: "#origins", title: "Origens de leads", description: "Cadastre uma chave por origem ou crie um formulário para seu site. O nome identifica de onde o lead veio.", icon: Cable, action: "Configurar origens" },
  { href: "/app/settings/whatsapp", title: "WhatsApp", description: "Configure sua conexão com a API oficial e consulte as conversas recebidas.", icon: MessageCircle, action: "Configurar WhatsApp" },
  { href: "/app/settings/import", title: "Planilhas", description: "Importe leads e contatos de CSV ou Excel com prévia e tratamento de duplicados.", icon: FileInput, action: "Importar dados" },
  { href: "/app/settings/automations", title: "Automações", description: "Crie tarefas e notificações quando leads entrarem ou negócios mudarem de etapa.", icon: Workflow, action: "Configurar automações" },
];

export default async function IntegrationsPage() {
  const intake = await CaptacaoPage();
  return <main className="space-y-8">
    <header className="space-y-2"><h1 className="text-2xl font-semibold tracking-tight">Integrações</h1><p className="max-w-3xl text-sm text-muted-foreground">Conecte seus canais de captação e organize a origem dos leads em um só lugar.</p></header>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{connections.map(({ href, title, description, icon: Icon, action }) => <section key={title} className="flex flex-col rounded-xl border bg-card p-5 shadow-sm"><Icon className="mb-4 size-6 text-violet-600" aria-hidden /><h2 className="font-semibold">{title}</h2><p className="mb-5 mt-2 flex-1 text-sm text-muted-foreground">{description}</p><Link href={href} className="text-sm font-medium text-violet-700 underline-offset-4 hover:underline">{action} →</Link></section>)}</div>
    <section id="origins" className="scroll-mt-6 space-y-4"><div><h2 className="text-xl font-semibold">Cadastrar origens de leads</h2><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Use nomes como “Site — orçamento”, “Agência — campanha outubro” ou “Indicações”. Para ferramentas externas, configure o envio pelo webhook usando a chave e o exemplo abaixo. Criar uma chave não conecta automaticamente uma plataforma de anúncios.</p><p className="mt-2 text-sm text-muted-foreground">Novos leads recebidos por essas conexões terão a origem registrada. Leads antigos permanecem sem atribuição retroativa.</p></div>{intake}</section>
  </main>;
}
