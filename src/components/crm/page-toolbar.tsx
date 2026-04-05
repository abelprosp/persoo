"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  RefreshCw,
  Filter,
  ArrowUpDown,
  Columns3,
  MoreHorizontal,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseHideSet } from "@/lib/list-toolbar-url";
import { cn } from "@/lib/utils";

export type ListSortOption = {
  id: string;
  label: string;
  column: string;
  ascending: boolean;
};

export type ListColumnDef = { id: string; label: string };

export type PageToolbarProps =
  | { variant: "kanban"; kanbanExtra?: ReactNode }
  | {
      variant?: "table" | "cards";
      sortOptions: ListSortOption[];
      columns: ListColumnDef[];
      defaultSortId: string;
      searchPlaceholder?: string;
      hideSortControl?: boolean;
      hideColumnsControl?: boolean;
    };

function ToolbarSkeleton() {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="h-9 w-16 animate-pulse rounded-lg bg-muted md:w-20"
        />
      ))}
    </div>
  );
}

function KanbanToolbar({ extra }: { extra?: ReactNode }) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();

  function copyPageLink() {
    void navigator.clipboard.writeText(window.location.href);
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        className="size-9"
        type="button"
        disabled={refreshing}
        onClick={() => startRefresh(() => router.refresh())}
        title="Atualizar"
      >
        <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(buttonVariants({ variant: "outline", size: "icon" }), "size-9")}
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => startRefresh(() => router.refresh())}
          >
            Atualizar quadro
          </DropdownMenuItem>
          <DropdownMenuItem onClick={copyPageLink}>
            Copiar link desta página
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {extra}
    </div>
  );
}

function TableToolbarInner({
  sortOptions,
  columns,
  defaultSortId,
  searchPlaceholder = "Pesquisar…",
  variant = "table",
  hideSortControl = false,
  hideColumnsControl = false,
}: {
  sortOptions: ListSortOption[];
  columns: ListColumnDef[];
  defaultSortId: string;
  searchPlaceholder?: string;
  variant?: "table" | "cards";
  hideSortControl?: boolean;
  hideColumnsControl?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [refreshing, startRefresh] = useTransition();
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftQ, setDraftQ] = useState(() => searchParams.get("q") ?? "");

  useEffect(() => {
    setDraftQ(searchParams.get("q") ?? "");
  }, [searchParams]);

  const pushParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, searchParams]
  );

  const hideSet = parseHideSet(searchParams.get("hide") ?? undefined);
  const sortId =
    searchParams.get("sort") &&
    sortOptions.some((o) => o.id === searchParams.get("sort"))
      ? searchParams.get("sort")!
      : defaultSortId;

  function toggleColumn(colId: string, visible: boolean) {
    const next = new Set(hideSet);
    if (visible) next.delete(colId);
    else next.add(colId);
    const hideStr = [...next].sort().join(",");
    pushParams({ hide: hideStr || null });
  }

  function showAllColumns() {
    pushParams({ hide: null });
  }

  function clearListFilters() {
    pushParams({
      q: null,
      hide: null,
      sort: null,
    });
    setDraftQ("");
  }

  function applySearch() {
    const t = draftQ.trim();
    pushParams({ q: t || null });
    setFilterOpen(false);
  }

  function copyPageLink() {
    void navigator.clipboard.writeText(window.location.href);
  }

  const showColunas = !hideColumnsControl && columns.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        className="size-9"
        type="button"
        disabled={refreshing}
        title="Atualizar lista"
        onClick={() => startRefresh(() => router.refresh())}
      >
        <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
      </Button>

      <Popover open={filterOpen} onOpenChange={setFilterOpen}>
        <PopoverTrigger
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "gap-1.5"
          )}
        >
          <Filter className="size-4" />
          Filtrar
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3" align="end">
          <div className="space-y-2">
            <Label htmlFor="toolbar-q" className="text-xs">
              Pesquisa rápida
            </Label>
            <Input
              id="toolbar-q"
              value={draftQ}
              onChange={(e) => setDraftQ(e.target.value)}
              placeholder={searchPlaceholder}
              onKeyDown={(e) => {
                if (e.key === "Enter") applySearch();
              }}
            />
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDraftQ("");
                  pushParams({ q: null });
                  setFilterOpen(false);
                }}
              >
                Limpar
              </Button>
              <Button type="button" size="sm" onClick={applySearch}>
                Aplicar
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {!hideSortControl ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "gap-1.5"
            )}
          >
            <ArrowUpDown className="size-4" />
            Ordenar
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[220px]">
            <DropdownMenuLabel className="text-xs">Ordenação</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={sortId}
              onValueChange={(v) => {
                if (v === defaultSortId) pushParams({ sort: null });
                else pushParams({ sort: v });
              }}
            >
              {sortOptions.map((o) => (
                <DropdownMenuRadioItem key={o.id} value={o.id}>
                  {o.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      {showColunas ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "gap-1.5"
            )}
          >
            <Columns3 className="size-4" />
            Colunas
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[220px]">
            <DropdownMenuLabel className="text-xs">Visibilidade</DropdownMenuLabel>
            {columns.map((c) => (
              <DropdownMenuCheckboxItem
                key={c.id}
                checked={!hideSet.has(c.id)}
                onCheckedChange={(checked) =>
                  toggleColumn(c.id, checked === true)
                }
              >
                {c.label}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={showAllColumns}>
              Mostrar todas
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(buttonVariants({ variant: "outline", size: "icon" }), "size-9")}
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => startRefresh(() => router.refresh())}>
            Atualizar dados
          </DropdownMenuItem>
          <DropdownMenuItem onClick={copyPageLink}>
            Copiar link desta vista
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={clearListFilters}>
            Limpar filtros e colunas
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function PageToolbarInner(props: PageToolbarProps) {
  if (props.variant === "kanban") {
    return <KanbanToolbar extra={props.kanbanExtra} />;
  }
  return (
    <TableToolbarInner
      sortOptions={props.sortOptions}
      columns={props.columns}
      defaultSortId={props.defaultSortId}
      searchPlaceholder={props.searchPlaceholder}
      variant={props.variant ?? "table"}
        hideSortControl={props.hideSortControl}
        hideColumnsControl={props.hideColumnsControl}
    />
  );
}

export function PageToolbar(props: PageToolbarProps) {
  return (
    <Suspense fallback={<ToolbarSkeleton />}>
      <PageToolbarInner {...props} />
    </Suspense>
  );
}
