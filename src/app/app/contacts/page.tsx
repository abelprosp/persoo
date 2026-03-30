import { createClient } from "@/lib/supabase/server";
import { getOrCreateWorkspace } from "@/lib/workspace";
import {
  formatCustomFieldValue,
  getCustomFields,
  getEntityLabel,
  readRowCustomData,
} from "@/lib/ai-schema";
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
import { relativeTime } from "@/lib/format";
import { Phone } from "lucide-react";
import { redirect } from "next/navigation";
import { AiModuleCustomizeButton } from "@/components/crm/ai-module-customize-button";
import {
  sanitizeIlikeTerm,
  parseHideSet,
  pickSortId,
  resolveSortOption,
  countVisibleTableColumns,
} from "@/lib/list-toolbar-url";

const CONTACTS_SORT: ListSortOption[] = [
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
    id: "email_asc",
    label: "E-mail A-Z",
    column: "email",
    ascending: true,
  },
  {
    id: "email_desc",
    label: "E-mail Z-A",
    column: "email",
    ascending: false,
  },
];

const FIXED_COL_IDS = ["email", "phone", "organization", "updated"] as const;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const qRaw = typeof sp.q === "string" ? sp.q : "";
  const q = sanitizeIlikeTerm(qRaw);
  const hide = parseHideSet(sp.hide);
  const sortId = pickSortId(
    CONTACTS_SORT,
    typeof sp.sort === "string" ? sp.sort : undefined,
    "updated_desc"
  );
  const sortOpt = resolveSortOption(CONTACTS_SORT, sortId);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const ws = await getOrCreateWorkspace(supabase, user.id);
  if (!ws) redirect("/login");

  const schema = ws.ai_schema as Record<string, unknown> | null;
  const extraCols = getCustomFields(schema, "contacts");
  const extraKeys = extraCols.map((f) => f.key);
  const colCount = countVisibleTableColumns(hide, [...FIXED_COL_IDS], extraKeys);

  const lblEmail = getEntityLabel(schema, "contacts", "email", "E-mail");
  const lblPhone = getEntityLabel(schema, "contacts", "phone", "Telefone");
  const lblOrg = getEntityLabel(
    schema,
    "contacts",
    "organization",
    "Organização"
  );

  let query = supabase
    .from("contacts")
    .select("*")
    .eq("workspace_id", ws.id);
  if (q) {
    const p = `%${q}%`;
    query = query.or(`email.ilike.${p},phone.ilike.${p}`);
  }
  query = query.order(sortOpt.column, { ascending: sortOpt.ascending });

  const { data: rows } = await query;
  const list = rows ?? [];

  const orgIds = [
    ...new Set(
      list.map((c) => c.organization_id).filter(Boolean) as string[]
    ),
  ];
  const { data: orgRows } =
    orgIds.length > 0
      ? await supabase
          .from("organizations")
          .select("id,name,logo_url")
          .in("id", orgIds)
      : { data: [] as { id: string; name: string; logo_url: string | null }[] };
  const orgById = Object.fromEntries(
    (orgRows ?? []).map((o) => [o.id, o])
  );

  const vis = (id: string) => !hide.has(id);

  const toolbarColumns = [
    { id: "email", label: lblEmail },
    { id: "phone", label: lblPhone },
    { id: "organization", label: lblOrg },
    ...extraCols.map((f) => ({ id: `extra:${f.key}`, label: f.label })),
    { id: "updated", label: "Última alteração" },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        breadcrumb="Contatos"
        viewLabel="Lista"
        createHref="/app/contacts"
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <AiModuleCustomizeButton module="contacts" title="Contatos" />
            <PageToolbar
              sortOptions={CONTACTS_SORT}
              columns={toolbarColumns}
              defaultSortId="updated_desc"
              searchPlaceholder="E-mail ou telefone…"
            />
          </div>
        }
      />
      <div className="overflow-hidden rounded-xl border border-border/80 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-10">
                <Checkbox disabled />
              </TableHead>
              {vis("email") ? <TableHead>{lblEmail}</TableHead> : null}
              {vis("phone") ? <TableHead>{lblPhone}</TableHead> : null}
              {vis("organization") ? <TableHead>{lblOrg}</TableHead> : null}
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
                  Sem contatos.
                </TableCell>
              </TableRow>
            ) : (
              list.map((c) => {
                const org = c.organization_id
                  ? orgById[c.organization_id]
                  : null;
                const custom = readRowCustomData(c);
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Checkbox disabled />
                    </TableCell>
                    {vis("email") ? (
                      <TableCell>{c.email ?? "—"}</TableCell>
                    ) : null}
                    {vis("phone") ? (
                      <TableCell>
                        {c.phone ? (
                          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                            <Phone className="size-3.5 shrink-0" />
                            {c.phone}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    ) : null}
                    {vis("organization") ? (
                      <TableCell>
                        {org ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="size-7">
                              {org.logo_url ? (
                                <AvatarImage src={org.logo_url} alt="" />
                              ) : null}
                              <AvatarFallback className="text-[10px]">
                                {org.name?.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span>{org.name}</span>
                          </div>
                        ) : (
                          "—"
                        )}
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
                        {relativeTime(c.updated_at)}
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
