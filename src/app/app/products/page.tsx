import { createClient } from "@/lib/supabase/server";
import { getOrCreateWorkspace } from "@/lib/workspace";
import {
  formatCustomFieldValue,
  getCustomFields,
  getEntityLabel,
  getModuleLabel,
  readRowCustomData,
} from "@/lib/ai-schema";
import { CreateProductDialog } from "@/components/crm/create-product-dialog";
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
import { formatBRL, relativeTime } from "@/lib/format";
import { redirect } from "next/navigation";
import {
  sanitizeIlikeTerm,
  pickSortId,
  resolveSortOption,
} from "@/lib/list-toolbar-url";
import { AiModuleCustomizeButton } from "@/components/crm/ai-module-customize-button";

const PRODUCT_SORT: ListSortOption[] = [
  {
    id: "updated_desc",
    label: "Última alteração (recente)",
    column: "updated_at",
    ascending: false,
  },
  {
    id: "name_asc",
    label: "Nome A-Z",
    column: "name",
    ascending: true,
  },
  {
    id: "sku_asc",
    label: "SKU A-Z",
    column: "sku",
    ascending: true,
  },
  {
    id: "price_desc",
    label: "Preço (maior)",
    column: "unit_price",
    ascending: false,
  },
];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const q = sanitizeIlikeTerm(typeof sp.q === "string" ? sp.q : "");
  const sortId = pickSortId(
    PRODUCT_SORT,
    typeof sp.sort === "string" ? sp.sort : undefined,
    "updated_desc"
  );
  const sortOpt = resolveSortOption(PRODUCT_SORT, sortId);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const ws = await getOrCreateWorkspace(supabase, user.id);
  if (!ws) redirect("/login");

  const schema = ws.ai_schema as Record<string, unknown> | null;
  const extraCols = getCustomFields(schema, "products");

  const lblName = getEntityLabel(schema, "products", "name", "Nome");
  const lblSku = getEntityLabel(schema, "products", "sku", "SKU");
  const lblDesc = getEntityLabel(schema, "products", "description", "Descrição");
  const lblPrice = getEntityLabel(
    schema,
    "products",
    "unit_price",
    "Preço unitário"
  );

  const productFieldLabels = {
    name: lblName,
    sku: lblSku,
    description: lblDesc,
    unit_price: `${lblPrice} (R$)`,
  };

  let query = supabase
    .from("products")
    .select("*")
    .eq("workspace_id", ws.id);
  if (q) {
    const p = `%${q}%`;
    query = query.or(`name.ilike.${p},sku.ilike.${p},description.ilike.${p}`);
  }
  query = query.order(sortOpt.column, { ascending: sortOpt.ascending });

  const { data: rows } = await query;
  const list = rows ?? [];

  const colCount = 6 + extraCols.length; // checkbox + 5 fixas + extras

  return (
    <div className="space-y-4">
      <PageHeader
        breadcrumb={getModuleLabel(schema, "products")}
        viewLabel="Lista"
        createSlot={
          <div className="flex items-center gap-2">
            <CreateProductDialog
              customFields={extraCols}
              fieldLabels={productFieldLabels}
            />
            <AiModuleCustomizeButton module="products" title="Produtos" />
          </div>
        }
        toolbar={
          <PageToolbar
            sortOptions={PRODUCT_SORT}
            columns={[]}
            defaultSortId="updated_desc"
            searchPlaceholder="Nome, SKU ou descrição…"
            hideSortControl
            hideColumnsControl
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
              <TableHead>{lblName}</TableHead>
              <TableHead>{lblSku}</TableHead>
              <TableHead className="max-w-[200px]">{lblDesc}</TableHead>
              <TableHead className="text-right">{lblPrice}</TableHead>
              {extraCols.map(
                (f) => <TableHead key={f.key}>{f.label}</TableHead>
              )}
              <TableHead>Última alteração</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={colCount}
                  className="h-24 text-center text-muted-foreground"
                >
                  Sem produtos.
                </TableCell>
              </TableRow>
            ) : (
              list.map((row) => {
                const custom = readRowCustomData(row);
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Checkbox disabled />
                    </TableCell>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.sku ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {row.description ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBRL(row.unit_price)}
                    </TableCell>
                    {extraCols.map(
                      (f) => (
                        <TableCell
                          key={f.key}
                          className="text-muted-foreground"
                        >
                          {formatCustomFieldValue(custom[f.key], f.type)}
                        </TableCell>
                      )
                    )}
                    <TableCell className="text-muted-foreground">
                      {relativeTime(row.updated_at)}
                    </TableCell>
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
