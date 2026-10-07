"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateNote } from "@/app/app/notes/actions";
import { setRecordActive } from "@/app/app/records/actions";
import type { CustomFieldDef } from "@/lib/ai-schema";
import { readRowCustomData } from "@/lib/ai-schema";

type NoteItem = {
  id: string;
  title: string;
  content: string | null;
  author_name: string | null;
  custom_data?: unknown;
  active?: boolean;
};

export function NoteCardActions({
  note,
  customFields = [],
}: {
  note: NoteItem;
  customFields?: CustomFieldDef[];
}) {
  const router = useRouter();
  const [openEdit, setOpenEdit] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const custom = readRowCustomData(note);
  const isActive = note.active !== false;

  async function onToggle() {
    const ok = window.confirm(
      isActive ? "Desativar esta nota?" : "Reativar esta nota?"
    );
    if (!ok) return;
    setPending(true);
    setError(null);
    try {
      const r = await setRecordActive("notes", note.id, !isActive);
      if ("error" in r) {
        setError(r.error);
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function onEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const fd = new FormData(e.currentTarget);
      const r = await updateNote(fd);
      if ("error" in r) {
        setError(r.error);
        return;
      }
      setOpenEdit(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex size-8 items-center justify-center rounded-md hover:bg-muted"
          aria-label="Ações da nota"
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setOpenEdit(true)}>
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => void onToggle()}
            disabled={pending}
          >
            {isActive ? "Desativar" : "Reativar"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={onEditSubmit}>
            <DialogHeader>
              <DialogTitle>Editar nota</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
              <input type="hidden" name="id" value={note.id} />
              <div className="space-y-2">
                <Label htmlFor={`note-title-${note.id}`}>Título *</Label>
                <Input
                  id={`note-title-${note.id}`}
                  name="title"
                  defaultValue={note.title}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`note-content-${note.id}`}>Conteúdo</Label>
                <Textarea
                  id={`note-content-${note.id}`}
                  name="content"
                  rows={6}
                  defaultValue={note.content ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`note-author-${note.id}`}>Autor</Label>
                <Input
                  id={`note-author-${note.id}`}
                  name="author_name"
                  defaultValue={note.author_name ?? ""}
                />
              </div>
              {customFields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={`note-cf-${note.id}-${field.key}`}>{field.label}</Label>
                  <Input
                    id={`note-cf-${note.id}-${field.key}`}
                    name={`custom_${field.key}`}
                    defaultValue={custom[field.key] == null ? "" : String(custom[field.key])}
                  />
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenEdit(false)}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "A guardar..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
