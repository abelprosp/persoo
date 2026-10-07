# Persoo: comparação competitiva e lacunas de produto

Pesquisa realizada em 7 de outubro de 2026.

## Escopo e conclusão

Comparação entre o código local da Persoo e recursos publicados oficialmente por HubSpot, Pipedrive, Kommo, RD Station, Zoho e Salesforce. São referências por especialidade, não um ranking universal. Recursos de concorrentes podem depender de plano, módulo adicional ou integração. Não foram testadas contas desses produtos. A inspeção da Persoo é estática: presença no código não comprova funcionamento, migração aplicada ou disponibilidade em produção. Há alterações locais ainda em desenvolvimento.

Premissa de priorização: pequenas equipes comerciais brasileiras, com atendimento consultivo e uso frequente de WhatsApp. Se o foco for grandes empresas, governança, identidade corporativa e integrações ganham prioridade.

A Persoo já tem a estrutura de um CRM personalizável. A principal distância competitiva é transformar registros separados em uma rotina comercial conectada: identificar o cliente, conversar, definir o próximo contato, acompanhar a oportunidade e medir o resultado.

## Referências de mercado

| Produto | Recursos documentados relevantes | Aplicação à Persoo |
|---|---|---|
| [Pipedrive](https://www.pipedrive.com/en/products/sales/email-and-communications) | Sincronização de e-mail, modelos, agendamento e agenda integrada | Reduzir o trabalho de registrar conversas e marcar reuniões |
| [HubSpot Sales Hub](https://www.hubspot.com/products/sales) | Sequências, priorização de negócios, próxima ação e previsão | Organizar a rotina do vendedor e usar IA com contexto do cliente |
| [Kommo WhatsApp Business](https://support.kommo.com/docs/pt-br/whatsapp-business-overview) | Integração oficial para gerenciar conversas de WhatsApp no CRM | Fazer a conversa alimentar o histórico e a oportunidade |
| [RD Station CRM](https://www.rdstation.com/produtos/crm/) | Múltiplos funis, automações, gestão de equipes e integração com Marketing | Referência próxima da operação comercial brasileira |
| [Zoho Blueprint](https://www.zoho.com/crm/process-management/blueprint.html) | Condições por etapa, tarefas automáticas, alertas e processos padronizados | Transformar o funil em um processo executável |
| [Salesforce Sales](https://www.salesforce.com/sales/) | Dados integrados, análises de vendas, gestão de metas e soluções de propostas e contratos | Referência para evolução de gestão e operações mais complexas |

## O que já existe na Persoo

- Módulos de leads, negócios, contatos, organizações, produtos, notas e tarefas.
- Quadros com etapas personalizáveis e calendário interno de tarefas.
- Histórico por cartão, notas, etiquetas, checklists e documentos por URL.
- Espaços de trabalho, membros e papéis de proprietário, administrador e membro.
- Captação por formulário público e webhook; exportação por API para BI.
- Modelos por segmento, campos e rótulos personalizados, geração de configuração por IA.
- Código local para prévia e restauração da personalização, paginação, previsão ponderada, sessões revogáveis, auditoria e proteção de assinatura. Estes itens precisam ser validados antes de serem anunciados como concluídos.

## Lacunas priorizadas

| Prioridade | Lacuna e evidência local | Primeira entrega verificável |
|---|---|---|
| P0 — base | Negócios usam `organization_name` e `assignee_name`; leads usam `owner_name`. Não encontrei relacionamento de negócio com contato/lead nem responsável por usuário nesses registros. | Relacionamentos por ID dentro da mesma empresa; conversão de lead em contato + negócio preservando origem e histórico. Renomear um vendedor não quebra seus relatórios. |
| P0 — confiabilidade | Dashboard local consulta `leads.created_at` e `deals.created_at`, mas as migrações inspecionadas não criam essas colunas. | Migração e testes em banco novo e atualizado. Não atribuir data de criação histórica fictícia aos registros existentes. |
| P1 — rotina | Notificações são uma página estática; tarefas têm prazo, mas não encontrei fila de lembretes e escalonamento. | Tela “Hoje”: atrasados, contatos do dia, negócios sem próxima ação; concluir ou reagendar com poucos cliques. Alertas persistidos e marcáveis como lidos. |
| P1 — adoção | Não encontrei importador CSV/XLSX, detecção de duplicidade ou mesclagem de clientes. | Importação com mapeamento, prévia, validação por linha e resolução de duplicados por e-mail/telefone normalizados; reenvio do arquivo não duplica silenciosamente. |
| P1 — comunicação | Não encontrei integração operacional de WhatsApp, Gmail ou Outlook. E-mail de recuperação de senha não é integração comercial. | Começar por WhatsApp oficial se a premissa de público se confirmar: caixa compartilhada, responsável, associação ao cliente, recebimento/envio e estados de entrega. Depois e-mail e agenda. |
| P1 — automação | Não encontrei mecanismo de gatilhos, condições, ações e execução em segundo plano. | Modelos: novo lead cria tarefa; etapa “Proposta” agenda retorno; negócio parado alerta responsável. Cada execução tem histórico, prevenção de duplicidade, tentativas limitadas e opção de pausa. |
| P1 — atendimento | Histórico está centrado no cartão; tarefas e negócios não formam uma visão única do cliente. | Ficha do cliente reunindo contatos, negócios, conversas, tarefas, propostas e eventos em uma linha do tempo. |
| P2 — processo | Configuração de etapas por módulo, sem entidade de múltiplos funis de negócio encontrada. | Funis separados para venda nova, renovação e expansão; regras por etapa, campos obrigatórios e motivo de perda. |
| P2 — gestão | Existem indicadores e previsão em desenvolvimento, mas não encontrei metas, resultados por vendedor, origem da aquisição e análises completas de conversão. | Painel de conversão por etapa, tempo de primeira resposta, motivos de perda, metas e realizado versus previsto. Definições de datas e denominadores explícitas. |
| P2 — fechamento | Produtos e links de documentos existem; não encontrei itens de proposta vinculados ao negócio, versões, aceite ou assinatura. | Proposta com produtos, quantidade, descontos, validade, PDF/link, versões e aceite registrado. Assinatura eletrônica via integração quando necessária. |
| P2 — IA comercial | IA atual configura campos e etapas; não encontrei análise de conversas nem recomendação comercial por oportunidade. | Resumo do histórico, extração de próximos passos e rascunho de acompanhamento. Mostrar fontes e pedir revisão antes de enviar mensagens ou alterar dados. |
| P2 — governança | Papéis por empresa existem; não encontrei MFA, acesso por carteira/equipe ou permissões por campo. | MFA, gestão de sessões, carteiras por responsável e permissões de visualizar/editar/exportar. Auditoria consultável e rotinas de backup com restauração testada. |
| P3 — ecossistema | Há entrada de leads e saída para BI, mas não encontrei uma API geral documentada ou webhooks de saída. | Eventos assinados, escopos de API, logs, tentativas de entrega e integrações com ferramentas de automação. |

P0 prepara uma base confiável; P1 entrega valor diário e facilita adoção; P2 amplia a operação; P3 expande o ecossistema. A ordem é recomendação de produto, não estimativa de prazo ou ganho financeiro.

## Design e usabilidade

1. Abrir o produto numa central de trabalho com pendências e próximos contatos. O dashboard gerencial pode permanecer separado.
2. Busca global entre entidades e filtros salvos como “Meus negócios”, “Sem contato há 7 dias” e “Fechamento neste mês”. A busca atual do Kanban filtra somente os cartões carregados; contagens e valores também refletem esse subconjunto.
3. Lista tabular verdadeira com seleção e edição em lote. O modo Lista atual do quadro apenas reorganiza colunas verticalmente.
4. Cabeçalho do negócio com cliente, valor, responsável, etapa, resultado e próxima ação. Detalhes complementares em abas ou painel lateral.
5. Ações rápidas: registrar contato, criar tarefa, reagendar, enviar proposta e concluir atividade. Evitar obrigar o vendedor a alternar entre vários módulos para uma única interação.
6. No celular, priorizar lista, busca e ações de contato; manter alternativa acessível ao arrastar cartões. Validar teclado, leitor de tela e telas estreitas com o aplicativo em execução.
7. Onboarding orientado à primeira operação completa: importar/criar cliente, abrir negócio, agendar retorno e concluir atividade. Medir essa jornada antes de acrescentar mais configurações.

## Ordem recomendada de desenvolvimento

**Entrega A — base utilizável:** concluir validação das mudanças em andamento; corrigir divergências entre banco e aplicação; relacionar entidades e responsáveis; importar dados e tratar duplicados.

**Entrega B — rotina comercial:** visão “Hoje”, próxima ação por negócio, notificações reais, ficha unificada e busca global.

**Entrega C — comunicação e automação:** escolher um canal inicial com clientes-piloto, implementar integração e rastreabilidade, depois liberar automações simples e confiáveis.

**Entrega D — gestão e diferenciação:** múltiplos funis, propostas, relatórios, metas e IA que aproveita o contexto acumulado.

Segurança, isolamento entre empresas e testes de regressão acompanham todas as entregas. Não são uma fase final. Integrações dependem de contas, credenciais e configuração dos respectivos provedores.

## Como validar a direção

Conversar com clientes-piloto sobre onde recebem leads, quantas pessoas atendem, como lembram de retornar e por que perdem negócios. Instrumentar tempo até a primeira operação completa, proporção de negócios abertos com próxima ação, contatos vencidos, tempo de primeira resposta e vendedores ativos semanalmente. Definir metas depois de medir uma linha de base.

O posicionamento proposto é: CRM simples para pequenas equipes, adaptado ao segmento e que ajuda cada vendedor a saber com quem falar e o que fazer a seguir. A personalização por IA apoia essa promessa; seu valor deve aparecer na rotina comercial.

## Evidências no repositório

- `supabase/migrations/001_persoo_crm.sql`: estrutura de entidades e responsáveis por nome.
- `supabase/migrations/010_card_notes_and_activities.sql`, `011_card_column_time_tracking.sql`, `012_card_enrichments.sql`: histórico e complementos por cartão.
- `supabase/migrations/014_lead_intake.sql`, `src/app/api/bi`: captação e exportação existentes.
- `src/app/app/notifications/page.tsx`: estado estático de notificações.
- `src/app/app/deals/actions.ts`, `src/app/app/tasks/actions.ts`: criação de registros e campos disponíveis.
- `src/components/crm/kanban-board.tsx`: busca local e modo Lista.
- `src/app/app/dashboard/page.tsx`, `src/lib/dashboard-prefs.ts`: cálculos e indicadores locais.
- `src/lib/ai-customization.ts`, `src/components/crm/ai-preview.tsx`: escopo atual da IA.
- `src/app/app/settings/team/actions.ts`: papéis de equipe existentes.

Ausência significa “não localizada no código e nas migrações inspecionados”, não uma afirmação sobre serviços externos ou funcionalidades implantadas fora deste repositório.
