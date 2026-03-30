"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { createNote } from "@/app/app/notes/actions";

type Props = {
  /** Nome sugerido no campo autor (perfil) */
  defaultAuthorHint?: string | null;
};

export function CreateNoteDialog({ defaultAuthorHint }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const r = await createNote(fd);
    setPending(false);
    if ("error" in r) {
      setError(r.error);
      return;
    }
    setOpen(false);
    e.currentTarget.reset();
    router.refresh();
  }

  return (
    <>
      <Button
        type="button"
        className="bg-zinc-900 text-white hover:bg-zinc-800"
        onClick={() => setOpen(true)}
      >
        <Plus className="mr-2 size-4" />
        Criar
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={onSubmit}>
            <DialogHeader>
              <DialogTitle>Nova nota</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="note-title">Título *</Label>
                <Input
                  id="note-title"
                  name="title"
                  required
                  placeholder="Ex.: Reunião com cliente"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="note-content">Conteúdo</Label>
                <Textarea
                  id="note-content"
                  name="content"
                  rows={6}
                  placeholder="Detalhes da nota…"
                  className="resize-y min-h-[120px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="note-author">Autor (opcional)</Label>
                <Input
                  id="note-author"
                  name="author_name"
                  placeholder={defaultAuthorHint ?? "Deixe vazio para usar o seu nome"}
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "A guardar…" : "Criar nota"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
