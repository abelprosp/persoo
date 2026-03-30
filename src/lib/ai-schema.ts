export type CustomFieldDef = {
  key: string;
  label: string;
  type: string;
};

export type AiEntityName =
  | "organizations"
  | "contacts"
  | "leads"
  | "deals"
  | "tasks"
  | "products";

/** Chaves para `moduleLabels` no JSON da IA (menu lateral). */
export type NavModuleKey =
  | "notifications"
  | "dashboard"
  | "leads"
  | "deals"
  | "contacts"
  | "organizations"
  | "products"
  | "notes"
  | "tasks";

const NAV_HREF: Record<NavModuleKey, string> = {
  notifications: "/app/notifications",
  dashboard: "/app/dashboard",
  leads: "/app/leads",
  deals: "/app/deals",
  contacts: "/app/contacts",
  organizations: "/app/organizations",
  products: "/app/products",
  notes: "/app/notes",
  tasks: "/app/tasks",
};

const NAV_DEFAULT_LABEL: Record<NavModuleKey, string> = {
  notifications: "Notificações",
  dashboard: "Dashboard",
  leads: "Leads",
  deals: "Negócios",
  contacts: "Contatos",
  organizations: "Organizações",
  products: "Produtos",
  notes: "Notas",
  tasks: "Tarefas",
};

const NAV_ORDER: NavModuleKey[] = [
  "notifications",
  "dashboard",
  "leads",
  "deals",
  "contacts",
  "organizations",
  "products",
  "notes",
  "tasks",
];

export type SidebarNavItem = {
  moduleKey: NavModuleKey;
  href: string;
  label: string;
};

export function getModuleLabel(
  aiSchema: Record<string, unknown> | null | undefined,
  key: NavModuleKey
): string {
  const fallback = NAV_DEFAULT_LABEL[key];
  if (!aiSchema) return fallback;
  const ml = aiSchema.moduleLabels;
  if (!ml || typeof ml !== "object") return fallback;
  const v = (ml as Record<string, unknown>)[key];
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

/** Itens do menu na ordem fixa; rótulos vêm da IA quando definidos. */
export function getSidebarNavItems(
  aiSchema: Record<string, unknown> | null | undefined
): SidebarNavItem[] {
  return NAV_ORDER.map((moduleKey) => ({
    moduleKey,
    href: NAV_HREF[moduleKey],
    label: getModuleLabel(aiSchema, moduleKey),
  }));
}

export function readRowCustomData(row: {
  custom_data?: unknown;
}): Record<string, unknown> {
  const d = row.custom_data;
  if (d && typeof d === "object" && !Array.isArray(d)) {
    return d as Record<string, unknown>;
  }
  return {};
}

/** Lê valores `custom_${key}` do FormData para gravar em `custom_data`. */
export function customDataFromForm(
  formData: FormData,
  fields: CustomFieldDef[],
  namePrefix = "custom_"
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const raw = String(formData.get(`${namePrefix}${f.key}`) ?? "").trim();
    if (raw === "") continue;
    const t = f.type.toLowerCase();
    if (t === "number") {
      const n = Number.parseFloat(raw.replace(",", "."));
      if (!Number.isNaN(n)) out[f.key] = n;
    } else {
      out[f.key] = raw;
    }
  }
  return out;
}

export function getCustomFields(
  aiSchema: Record<string, unknown> | null | undefined,
  entity: AiEntityName
): CustomFieldDef[] {
  if (!aiSchema) return [];
  const cf = aiSchema.customFields;
  if (!cf || typeof cf !== "object") return [];
  const arr = (cf as Record<string, unknown>)[entity];
  if (!Array.isArray(arr)) return [];
  const out: CustomFieldDef[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const key = typeof o.key === "string" ? o.key.trim() : "";
    if (!key) continue;
    const label =
      typeof o.label === "string" && o.label.trim() ? o.label : key;
    const type = typeof o.type === "string" ? o.type : "text";
    out.push({ key, label, type });
  }
  return out;
}

export function getEntityLabel(
  aiSchema: Record<string, unknown> | null | undefined,
  entity: AiEntityName,
  fieldKey: string,
  fallback: string
): string {
  if (!aiSchema) return fallback;
  const el = aiSchema.entityLabels;
  if (!el || typeof el !== "object") return fallback;
  const em = (el as Record<string, unknown>)[entity];
  if (!em || typeof em !== "object") return fallback;
  const v = (em as Record<string, unknown>)[fieldKey];
  return typeof v === "string" && v.trim() ? v : fallback;
}

export function formatCustomFieldValue(
  value: unknown,
  type: string
): string {
  if (value === null || value === undefined || value === "") return "—";
  const t = type.toLowerCase();
  if (t === "number") {
    const n = Number(value);
    if (Number.isFinite(n)) {
      return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(
        n
      );
    }
    return String(value);
  }
  if (t === "date") {
    try {
      const d = new Date(String(value));
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleDateString("pt-PT", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      }
    } catch {
      /* empty */
    }
    return String(value);
  }
  return String(value);
}

export function getAiSummary(
  aiSchema: Record<string, unknown> | null | undefined
): string | null {
  if (!aiSchema) return null;
  const s = aiSchema.summary;
  return typeof s === "string" && s.trim() ? s.trim() : null;
}
