"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, ChevronDown, Plus } from "lucide-react";

export type WorkspaceOption = { id: string; name: string };

type Props = {
  workspaces: WorkspaceOption[];
  activeId: string;
};

export function WorkspaceSwitcher({ workspaces, activeId }: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  const active = workspaces.find((w) => w.id === activeId) ?? workspaces[0];
  const label = active?.name ?? "Espaço de trabalho";

  async function switchWs(id: string) {
    if (id === activeId) return;
    setBusy(true);
    try {
      const res = await fetch("/api/workspace/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: id }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function createWs(e: React.FormEvent) {
    e.preventDefault();
    const n = newName.trim() || "Novo espaço";
    setBusy(true);
    try {
      const res = await fetch("/api/workspace/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n }),
      });
      if (res.ok) {
        setDialogOpen(false);
        setNewName("");
        router.push("/app/settings/ai?novo=1");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={busy || workspaces.length === 0}
          className="mt-2 flex w-full max-w-full items-center justify-between gap-2 rounded-md border border-transparent px-2 py-1.5 text-left text-[11px] text-muted-foreground outline-none transition-colors hover:border-border/80 hover:bg-white/80 focus-visible:ring-2 focus-visible:ring-sidebar-ring disabled:opacity-50"
        >
          <span className="min-w-0 flex-1 truncate font-medium text-foreground">
            {label}
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-60" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-56" align="start">
          {workspaces.map((w) => (
            <DropdownMenuItem
              key={w.id}
              className="gap-2"
              onClick={() => void switchWs(w.id)}
            >
              <span className="min-w-0 flex-1 truncate">{w.name}</span>
              {w.id === activeId ? (
                <Check className="size-4 shrink-0 text-violet-600" />
              ) : null}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 size-4" />
            Novo espaço de trabalho
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={createWs}>
            <DialogHeader>
              <DialogTitle>Novo espaço de trabalho</DialogTitle>
            </DialogHeader>
            <div className="grid gap-2 py-4">
              <Label htmlFor="ws-name">Nome</Label>
              <Input
                id="ws-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex.: Equipa comercial Norte"
                autoComplete="organization"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "A criar…" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
