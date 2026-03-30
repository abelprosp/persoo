import { createClient } from "@/lib/supabase/server";
import { getOrCreateWorkspace } from "@/lib/workspace";
import {
  formatCustomFieldValue,
  getCustomFields,
  getEntityLabel,
  readRowCustomData,
} from "@/lib/ai-schema";
import { CreateOrganizationDialog } from "@/components/crm/create-organization-dialog";
import { PageHeader } from "@/components/crm/page-header";
import {
  PageToolbar,
  type ListSortOption,
} from "@/components/crm/page-toolbar";
import { DataTableFooter } from "@/components/crm/table-footer";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatBRL, relativeTime } from "@/lib/format";
import { redirect } from "next/navigation";
import {
  sanitizeIlikeTerm,
  parseHideSet,
  pickSortId,
  resolveSortOption,
  countVisibleTableColumns,
} from "@/lib/list-toolbar-url";

const ORG_SORT: ListSortOption[] = [
  {
    id: "updated_desc",
    label: "Última alteração (recente)",
    column: "updated_at",
    ascending: false,
  },
  {
    id: "updated_asc",
    label: "Última alteração (antiga)",
    column: "updated_at",
    ascending: true,
  },
  {
    id: "name_asc",
    label: "Nome A-Z",
    column: "name",
    ascending: true,
  },
  {
    id: "name_desc",
    label: "Nome Z-A",
    column: "name",
    ascending: false,
  },
  {
    id: "revenue_desc",
    label: "Receita (maior)",
    column: "annual_revenue",
    ascending: false,
  },
];

const FIXED_COL_IDS = [
  "name",
  "website",
  "industry",
  "revenue",
  "updated",
] as const;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const q = sanitizeIlikeTerm(typeof sp.q === "string" ? sp.q : "");
  const hide = parseHideSet(sp.hide);
  const sortId = pickSortId(
    ORG_SORT,
    typeof sp.sort === "string" ? sp.sort : undefined,
    "updated_desc"
  );
  const sortOpt = resolveSortOption(ORG_SORT, sortId);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const ws = await getOrCreateWorkspace(supabase, user.id);
  if (!ws) redirect("/login");

  const schema = ws.ai_schema as Record<string, unknown> | null;
  const extraCols = getCustomFields(schema, "organizations");
  const extraKeys = extraCols.map((f) => f.key);
  const colCount = countVisibleTableColumns(hide, [...FIXED_COL_IDS], extraKeys);

  const lblRevenue = getEntityLabel(
    schema,
    "organizations",
    "annual_revenue",
    "Receita anual"
  );

  const orgFieldLabels = {
    name: getEntityLabel(schema, "organizations", "name", "Nome"),
    website: getEntityLabel(schema, "organizations", "website", "Website"),
    industry: getEntityLabel(schema, "organizations", "industry", "Setor"),
    annual_revenue: getEntityLabel(
      schema,
      "organizations",
      "annual_revenue",
      "Receita anual (R$)"
    ),
    logo_url: getEntityLabel(
      schema,
      "organizations",
      "logo_url",
      "URL do logótipo"
    ),
  };

  let query = supabase
    .from("organizations")
    .select("*")
    .eq("workspace_id", ws.id);
  if (q) {
    const p = `%${q}%`;
    query = query.or(`name.ilike.${p},website.ilike.${p},industry.ilike.${p}`);
  }
  query = query.order(sortOpt.column, { ascending: sortOpt.ascending });

  const { data: rows } = await query;
  const list = rows ?? [];

  const vis = (id: string) => !hide.has(id);

  const toolbarColumns = [
    { id: "name", label: orgFieldLabels.name },
    { id: "website", label: orgFieldLabels.website },
    { id: "industry", label: orgFieldLabels.industry },
    { id: "revenue", label: lblRevenue },
    ...extraCols.map((f) => ({ id: `extra:${f.key}`, label: f.label })),
    { id: "updated", label: "Última alteração" },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        breadcrumb="Organizações"
        viewLabel="Lista"
        createSlot={
          <CreateOrganizationDialog
            customFields={extraCols}
            fieldLabels={orgFieldLabels}
          />
        }
        toolbar={
          <PageToolbar
            sortOptions={ORG_SORT}
            columns={toolbarColumns}
            defaultSortId="updated_desc"
            searchPlaceholder="Nome, site ou setor…"
          />
        }
      />
      <div className="overflow-hidden rounded-xl border border-border/80 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-10">
                <Checkbox disabled />
              </TableHead>
              {vis("name") ? <TableHead>Organização</TableHead> : null}
              {vis("website") ? <TableHead>Website</TableHead> : null}
              {vis("industry") ? <TableHead>Setor</TableHead> : null}
              {vis("revenue") ? (
                <TableHead className="text-right">{lblRevenue}</TableHead>
              ) : null}
              {extraCols.map(
                (f) =>
                  vis(`extra:${f.key}`) ? (
                    <TableHead key={f.key}>{f.label}</TableHead>
                  ) : null
              )}
              {vis("updated") ? (
                <TableHead>Última alteração</TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={colCount}
                  className="h-24 text-center text-muted-foreground"
                >
                  Sem organizações. Use &quot;Carregar dados de demonstração&quot;
                  no dashboard.
                </TableCell>
              </TableRow>
            ) : (
              list.map((org) => {
                const custom = readRowCustomData(org);
                return (
                  <TableRow key={org.id}>
                    <TableCell>
                      <Checkbox disabled />
                    </TableCell>
                    {vis("name") ? (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="size-8 rounded-md">
                            {org.logo_url ? (
                              <AvatarImage src={org.logo_url} alt="" />
                            ) : null}
                            <AvatarFallback className="rounded-md text-xs">
                              {org.name?.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{org.name}</span>
                        </div>
                      </TableCell>
                    ) : null}
                    {vis("website") ? (
                      <TableCell className="text-muted-foreground">
                        {org.website ?? "—"}
                      </TableCell>
                    ) : null}
                    {vis("industry") ? (
                      <TableCell>{org.industry ?? "—"}</TableCell>
                    ) : null}
                    {vis("revenue") ? (
                      <TableCell className="text-right tabular-nums">
                        {formatBRL(org.annual_revenue)}
                      </TableCell>
                    ) : null}
                    {extraCols.map(
                      (f) =>
                        vis(`extra:${f.key}`) ? (
                          <TableCell
                            key={f.key}
                            className="text-muted-foreground"
                          >
                            {formatCustomFieldValue(custom[f.key], f.type)}
                          </TableCell>
                        ) : null
                    )}
                    {vis("updated") ? (
                      <TableCell className="text-muted-foreground">
                        {relativeTime(org.updated_at)}
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <DataTableFooter total={list.length} />
      </div>
    </div>
  );
}
