import { createClient } from "@/lib/supabase/server";
import { getOrCreateWorkspace } from "@/lib/workspace";
import { CreateNoteDialog } from "@/components/crm/create-note-dialog";
import { PageHeader } from "@/components/crm/page-header";
import {
  PageToolbar,
  type ListSortOption,
} from "@/components/crm/page-toolbar";
import { DataTableFooter } from "@/components/crm/table-footer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { relativeTime } from "@/lib/format";
import { MoreHorizontal } from "lucide-react";
import { redirect } from "next/navigation";
import { AiModuleCustomizeButton } from "@/components/crm/ai-module-customize-button";
import {
  sanitizeIlikeTerm,
  parseHideSet,
  pickSortId,
  resolveSortOption,
} from "@/lib/list-toolbar-url";

const NOTES_SORT: ListSortOption[] = [
  {
    id: "updated_desc",
    label: "Mais recentes",
    column: "updated_at",
    ascending: false,
  },
  {
    id: "updated_asc",
    label: "Mais antigas",
    column: "updated_at",
    ascending: true,
  },
  {
    id: "title_asc",
    label: "Título A-Z",
    column: "title",
    ascending: true,
  },
];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function NotesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const q = sanitizeIlikeTerm(typeof sp.q === "string" ? sp.q : "");
  const hide = parseHideSet(sp.hide);
  const sortId = pickSortId(
    NOTES_SORT,
    typeof sp.sort === "string" ? sp.sort : undefined,
    "updated_desc"
  );
  const sortOpt = resolveSortOption(NOTES_SORT, sortId);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const ws = await getOrCreateWorkspace(supabase, user.id);
  if (!ws) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  let query = supabase.from("notes").select("*").eq("workspace_id", ws.id);
  if (q) {
    const p = `%${q}%`;
    query = query.or(
      `title.ilike.${p},content.ilike.${p},author_name.ilike.${p}`
    );
  }
  query = query.order(sortOpt.column, { ascending: sortOpt.ascending });

  const { data: rows } = await query;
  const list = rows ?? [];

  const vis = (id: string) => !hide.has(id);

  const toolbarColumns = [
    { id: "title", label: "Título" },
    { id: "content", label: "Conteúdo" },
    { id: "author", label: "Autor" },
    { id: "updated", label: "Data" },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        breadcrumb="Notas"
        viewLabel="Vista em notas"
        createSlot={
          <div className="flex items-center gap-2">
            <CreateNoteDialog
              defaultAuthorHint={profile?.full_name ?? undefined}
            />
            <AiModuleCustomizeButton module="notes" title="Notas" />
          </div>
        }
        toolbar={
          <PageToolbar
            variant="cards"
            sortOptions={NOTES_SORT}
            columns={toolbarColumns}
            defaultSortId="updated_desc"
            searchPlaceholder="Título, texto ou autor…"
          />
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.length === 0 ? (
          <p className="col-span-full text-center text-muted-foreground">
            Sem notas.
          </p>
        ) : (
          list.map((n) => (
            <Card
              key={n.id}
              className="border-border/80 bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                {vis("title") ? (
                  <h3 className="line-clamp-2 font-semibold leading-snug">
                    {n.title}
                  </h3>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
                <Button variant="ghost" size="icon" className="size-8 shrink-0">
                  <MoreHorizontal className="size-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {vis("content") ? (
                  <p className="line-clamp-4 text-sm text-muted-foreground">
                    {n.content ?? "—"}
                  </p>
                ) : null}
                {vis("author") || vis("updated") ? (
                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                    {vis("author") ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="size-6">
                          <AvatarFallback className="text-[9px]">
                            {n.author_name?.charAt(0) ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        {n.author_name ?? "—"}
                      </div>
                    ) : (
                      <span />
                    )}
                    {vis("updated") ? (
                      <span>{relativeTime(n.updated_at)}</span>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))
        )}
      </div>
      <div className="overflow-hidden rounded-xl border border-border/80 bg-white">
        <DataTableFooter total={list.length} />
      </div>
    </div>
  );
}
