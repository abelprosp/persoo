/**
 * Templates verticais prontos (menu, rótulos, campos extra, kanbans).
 * Os ids das colunas kanban devem ser ASCII (a-z, 0-9, _) por causa do slugify.
 */

export type CrmTemplateId =
  | "recrutamento"
  | "logistica"
  | "telefonia"
  | "imobiliaria";

export type CrmTemplateMeta = {
  id: CrmTemplateId;
  title: string;
  shortDescription: string;
};

export const CRM_TEMPLATE_LIST: CrmTemplateMeta[] = [
  {
    id: "recrutamento",
    title: "Recrutamento & RH",
    shortDescription:
      "Candidaturas, vagas, seleção e acompanhamento de colaboradores.",
  },
  {
    id: "logistica",
    title: "Logística",
    shortDescription:
      "Fornecedores, produtos, transporte, fretes e operações.",
  },
  {
    id: "telefonia",
    title: "Telefonia",
    shortDescription:
      "Venda de linhas e pacotes, base de clientes e pós-venda.",
  },
  {
    id: "imobiliaria",
    title: "Imobiliário",
    shortDescription:
      "Venda, arrendamento, visitas e negociação de imóveis.",
  },
];

type CustomField = { key: string; label: string; type: string };
type KanbanCol = { id: string; title: string };

function cf(key: string, label: string, type = "text"): CustomField {
  return { key, label, type };
}

/** Schema parcial gravado em workspaces.ai_schema (+ industry na linha do workspace). */
export function getCrmTemplateSchema(id: CrmTemplateId): Record<string, unknown> {
  switch (id) {
    case "recrutamento":
      return {
        crm_template: "recrutamento",
        industry: "Recrutamento & RH",
        summary:
          "Template Recrutamento: candidatos em Leads, vagas em Negócios, colaboradores em Contactos, departamentos em Organizações.",
        moduleLabels: {
          leads: "Recrutamento",
          deals: "Vagas & contratação",
          contacts: "Colaboradores",
          organizations: "Departamentos",
          products: "Benefícios & pacotes",
          notes: "Notas RH",
          tasks: "Onboarding & tarefas",
        },
        entityLabels: {
          leads: {
            full_name: "Nome do candidato",
            email: "E-mail",
            phone: "Telefone",
            company: "Última empresa / origem",
            owner_name: "Recrutador",
            status: "Fase do processo",
          },
          deals: {
            title: "Título da vaga / processo",
            value: "Orçamento salarial (referência)",
            stage: "Estado da vaga",
            email: "E-mail de contacto",
            phone: "Telefone",
            assignee_name: "Responsável RH",
            organization_name: "Departamento",
          },
          contacts: {
            email: "E-mail interno",
            phone: "Telefone / extensão",
            organization: "Departamento",
          },
          organizations: {
            name: "Departamento / unidade",
            website: "Intranet / site",
            industry: "Área",
            annual_revenue: "Orçamento anual (ref.)",
          },
          products: {
            name: "Benefício / pacote",
            sku: "Código interno",
            description: "Descrição",
            unit_price: "Valor mensal (ref.)",
          },
          tasks: {
            title: "Tarefa",
            status: "Estado",
            priority: "Prioridade",
            due_at: "Prazo",
            assignee_name: "Responsável",
          },
        },
        customFields: {
          leads: [
            cf("cargo_pretendido", "Cargo pretendido"),
            cf("anos_experiencia", "Anos de experiência", "number"),
            cf("disponibilidade", "Disponibilidade"),
            cf("origem_candidatura", "Origem da candidatura"),
          ],
          deals: [
            cf("tipo_vinculo", "Tipo (efetivo / estágio / temporário)"),
            cf("numero_posicoes", "Nº de posições", "number"),
            cf("data_inicio_desejada", "Data início desejada", "date"),
          ],
          contacts: [
            cf("cargo_atual", "Cargo atual"),
            cf("data_admissao", "Data de admissão", "date"),
            cf("tipo_contrato", "Tipo de contrato"),
          ],
          organizations: [
            cf("chefe_departamento", "Chefe de departamento"),
            cf("localizacao_sede", "Localização"),
          ],
          products: [
            cf("fornecedor_beneficio", "Fornecedor do benefício"),
            cf("cobertura", "Cobertura"),
          ],
          tasks: [
            cf("tipo_onboarding", "Tipo (documentação / formação / equipamento)"),
          ],
        },
        kanban: {
          leads: [
            { id: "triagem", title: "Triagem" },
            { id: "entrevista", title: "Entrevista" },
            { id: "teste_tecnico", title: "Teste / caso prático" },
            { id: "oferta", title: "Oferta" },
            { id: "contratado", title: "Contratado" },
            { id: "nao_avancou", title: "Não avançou" },
          ] satisfies KanbanCol[],
          deals: [
            { id: "aberta", title: "Vaga aberta" },
            { id: "em_selecao", title: "Em seleção" },
            { id: "entrevistas", title: "Entrevistas" },
            { id: "oferta_emitida", title: "Oferta ao candidato" },
            { id: "preenchida", title: "Vaga preenchida" },
            { id: "congelada", title: "Congelada" },
          ] satisfies KanbanCol[],
          tasks: [
            { id: "backlog", title: "Backlog" },
            { id: "documentacao", title: "Documentação" },
            { id: "em_curso", title: "Em curso" },
            { id: "concluido", title: "Concluído" },
          ] satisfies KanbanCol[],
        },
      };

    case "logistica":
      return {
        crm_template: "logistica",
        industry: "Logística",
        summary:
          "Template Logística: cotações em Leads, contratos de frete em Negócios, fornecedores em Organizações, SKUs em Produtos.",
        moduleLabels: {
          leads: "Cotações & pedidos",
          deals: "Contratos de transporte",
          contacts: "Clientes & operadores",
          organizations: "Fornecedores",
          products: "Mercadorias & SKUs",
          notes: "Notas operacionais",
          tasks: "Rotas & cargas",
        },
        entityLabels: {
          leads: {
            full_name: "Referência do pedido",
            email: "E-mail",
            phone: "Telefone",
            company: "Cliente / remetente",
            owner_name: "Comercial logística",
            status: "Estado da cotação",
          },
          deals: {
            title: "Contrato / expedição",
            value: "Valor do frete",
            stage: "Estado operacional",
            email: "E-mail",
            phone: "Telefone",
            assignee_name: "Gestor de tráfego",
            organization_name: "Fornecedor / transportador",
          },
          contacts: {
            email: "E-mail",
            phone: "Telefone",
            organization: "Empresa",
          },
          organizations: {
            name: "Fornecedor / armazém",
            website: "Website",
            industry: "Tipo (transporte / 3PL / armazém)",
            annual_revenue: "Volume anual (ref.)",
          },
          products: {
            name: "Produto / SKU",
            sku: "SKU / código",
            description: "Descrição / embalagem",
            unit_price: "Preço unitário (ref.)",
          },
          tasks: {
            title: "Tarefa logística",
            status: "Estado",
            priority: "Prioridade",
            due_at: "Prazo de entrega",
            assignee_name: "Motorista / responsável",
          },
        },
        customFields: {
          leads: [
            cf("origem", "Origem / destino"),
            cf("peso_kg", "Peso (kg)", "number"),
            cf("volume_m3", "Volume (m³)", "number"),
            cf("incoterm", "Incoterm"),
          ],
          deals: [
            cf("numero_guia", "Nº guia / AWB"),
            cf("matricula", "Matrícula veículo"),
            cf("janela_carga", "Janela de carga"),
          ],
          contacts: [
            cf("tipo_contacto", "Tipo (cliente / motorista / despachante)"),
            cf("nif", "NIF / VAT"),
          ],
          organizations: [
            cf("certificacoes", "Certificações"),
            cf("capacidade_paletes", "Capacidade paletes", "number"),
          ],
          products: [
            cf("classe_adr", "Classe ADR / perigosidade"),
            cf("temperatura", "Temperatura controlada"),
          ],
          tasks: [
            cf("checkpoint", "Checkpoint / hub"),
          ],
        },
        kanban: {
          leads: [
            { id: "pedido", title: "Pedido recebido" },
            { id: "em_cotacao", title: "Em cotação" },
            { id: "cotacao_enviada", title: "Cotação enviada" },
            { id: "aceite", title: "Aceite" },
            { id: "perdido", title: "Perdido" },
          ] satisfies KanbanCol[],
          deals: [
            { id: "planeado", title: "Planeado" },
            { id: "em_pickup", title: "Recolha" },
            { id: "em_transito", title: "Em trânsito" },
            { id: "em_entrega", title: "Em entrega" },
            { id: "entregue", title: "Entregue" },
            { id: "faturado", title: "Faturado / fechado" },
          ] satisfies KanbanCol[],
          tasks: [
            { id: "aguarda", title: "Aguarda" },
            { id: "em_execucao", title: "Em execução" },
            { id: "incidente", title: "Incidente" },
            { id: "feito", title: "Feito" },
          ] satisfies KanbanCol[],
        },
      };

    case "telefonia":
      return {
        crm_template: "telefonia",
        industry: "Telecomunicações",
        summary:
          "Template Telefonia: leads comerciais, contratos de linhas em Negócios, base de clientes e planos em Produtos.",
        moduleLabels: {
          leads: "Leads comerciais",
          deals: "Contratos & linhas",
          contacts: "Clientes",
          organizations: "Parceiros & revenda",
          products: "Planos & pacotes",
          notes: "Notas de conta",
          tasks: "Instalações & tickets",
        },
        entityLabels: {
          leads: {
            full_name: "Nome do contacto",
            email: "E-mail",
            phone: "Telemóvel / fixo",
            company: "Empresa",
            owner_name: "Comercial",
            status: "Estado do lead",
          },
          deals: {
            title: "Contrato / oportunidade",
            value: "Valor mensal / TCV",
            stage: "Estado da venda",
            email: "E-mail",
            phone: "Telefone",
            assignee_name: "Account manager",
            organization_name: "Cliente / grupo",
          },
          contacts: {
            email: "E-mail",
            phone: "Número principal",
            organization: "Cliente",
          },
          organizations: {
            name: "Parceiro / revendedor",
            website: "Website",
            industry: "Canal",
            annual_revenue: "Volume (ref.)",
          },
          products: {
            name: "Plano / pacote",
            sku: "Código oferta",
            description: "Dados / voz / roaming",
            unit_price: "Preço mensal",
          },
          tasks: {
            title: "Tarefa",
            status: "Estado",
            priority: "Prioridade",
            due_at: "Agendamento",
            assignee_name: "Técnico / owner",
          },
        },
        customFields: {
          leads: [
            cf("operadora_atual", "Operadora atual"),
            cf("numero_linhas", "Nº linhas pretendidas", "number"),
            cf("interesse", "Interesse (móvel / fibra / empresas)"),
          ],
          deals: [
            cf("numero_contrato", "Nº contrato"),
            cf("data_ativacao", "Data ativação", "date"),
            cf("mnp", "Portabilidade (SIM/NÃO)"),
          ],
          contacts: [
            cf("nif", "NIF"),
            cf("titular_linha", "Titular da linha"),
          ],
          organizations: [
            cf("codigo_parceiro", "Código parceiro"),
          ],
          products: [
            cf("franquia_dados", "Franquia dados (GB)", "number"),
            cf("fidelizacao", "Fidelização (meses)", "number"),
          ],
          tasks: [
            cf("morada_instalacao", "Morada instalação"),
          ],
        },
        kanban: {
          leads: [
            { id: "novo", title: "Novo" },
            { id: "contactado", title: "Contactado" },
            { id: "qualificado", title: "Qualificado" },
            { id: "proposta", title: "Proposta" },
            { id: "negociacao", title: "Negociação" },
            { id: "ganho", title: "Ganho" },
            { id: "perdido", title: "Perdido" },
          ] satisfies KanbanCol[],
          deals: [
            { id: "provisioning", title: "Provisioning" },
            { id: "aguarda_docs", title: "Aguarda documentos" },
            { id: "ativacao", title: "Ativação" },
            { id: "ativa", title: "Ativa" },
            { id: "churn", title: "Cancelamento / churn" },
          ] satisfies KanbanCol[],
          tasks: [
            { id: "aberto", title: "Aberto" },
            { id: "agendado", title: "Agendado" },
            { id: "em_visita", title: "Em visita" },
            { id: "fechado", title: "Fechado" },
          ] satisfies KanbanCol[],
        },
      };

    case "imobiliaria":
      return {
        crm_template: "imobiliaria",
        industry: "Imobiliário",
        summary:
          "Template Imobiliário: interessados em Leads, negócios de venda/arrendamento em Negócios, proprietários em Contactos, empreendimentos em Organizações.",
        moduleLabels: {
          leads: "Interessados",
          deals: "Negócios (venda & arrendamento)",
          contacts: "Clientes & proprietários",
          organizations: "Empreendimentos",
          products: "Imóveis em carteira",
          notes: "Notas de visita",
          tasks: "Visitas & documentação",
        },
        entityLabels: {
          leads: {
            full_name: "Nome",
            email: "E-mail",
            phone: "Telefone",
            company: "Origem do lead",
            owner_name: "Agente imobiliário",
            status: "Estado",
          },
          deals: {
            title: "Referência do negócio",
            value: "Valor / renda",
            stage: "Fase",
            email: "E-mail",
            phone: "Telefone",
            assignee_name: "Agente",
            organization_name: "Empreendimento / condomínio",
          },
          contacts: {
            email: "E-mail",
            phone: "Telefone",
            organization: "Empresa / NIF",
          },
          organizations: {
            name: "Empreendimento / edifício",
            website: "Website",
            industry: "Tipologia (residencial / comercial)",
            annual_revenue: "Volume / receita (ref.)",
          },
          products: {
            name: "Ref. imóvel",
            sku: "ID interno",
            description: "Morada / fração",
            unit_price: "Preço / renda mensal",
          },
          tasks: {
            title: "Tarefa",
            status: "Estado",
            priority: "Prioridade",
            due_at: "Data / hora",
            assignee_name: "Agente",
          },
        },
        customFields: {
          leads: [
            cf("tipo_interesse", "Interesse (comprar / arrendar)"),
            cf("tipologia", "Tipologia pretendida"),
            cf("orcamento_max", "Orçamento máximo", "number"),
            cf("zona", "Zona preferida"),
          ],
          deals: [
            cf("tipo_negocio", "Tipo (venda / arrendamento)"),
            cf("ref_imovel", "Ref. artigo"),
            cf("data_escritura", "Data escritura prevista", "date"),
          ],
          contacts: [
            cf("nif", "NIF"),
            cf("perfil", "Perfil (comprador / vendedor / investidor)"),
          ],
          organizations: [
            cf("ano_construcao", "Ano construção", "number"),
            cf("fracoes", "Nº frações", "number"),
          ],
          products: [
            cf("area_util", "Área útil (m²)", "number"),
            cf("parking", "Estacionamento"),
            cf("certificado_energetico", "Certificado energético"),
          ],
          tasks: [
            cf("tipo_visita", "Tipo (primeira / segunda chave)"),
          ],
        },
        kanban: {
          leads: [
            { id: "novo", title: "Novo contacto" },
            { id: "qualificado", title: "Qualificado" },
            { id: "visita", title: "Visita agendada" },
            { id: "proposta", title: "Proposta" },
            { id: "negociacao", title: "Negociação" },
            { id: "fechado", title: "Fechado" },
            { id: "arquivado", title: "Arquivado" },
          ] satisfies KanbanCol[],
          deals: [
            { id: "captacao", title: "Captação" },
            { id: "comercializacao", title: "Em comercialização" },
            { id: "reserva", title: "Reserva" },
            { id: "cpv", title: "CPCV assinado" },
            { id: "escritura", title: "Escritura" },
            { id: "concluido", title: "Concluído" },
            { id: "arrendado", title: "Em arrendamento" },
          ] satisfies KanbanCol[],
          tasks: [
            { id: "a_agendar", title: "A agendar" },
            { id: "visita", title: "Visita" },
            { id: "documentos", title: "Documentação" },
            { id: "concluido", title: "Concluído" },
          ] satisfies KanbanCol[],
        },
      };

    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

export function isCrmTemplateId(v: string): v is CrmTemplateId {
  return (
    v === "recrutamento" ||
    v === "logistica" ||
    v === "telefonia" ||
    v === "imobiliaria"
  );
}
