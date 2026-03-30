"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { relativeTime } from "@/lib/format";

type Variant = "lead" | "deal" | "task";

type NoteItem = {
  id: string;
  title: string;
  content: string | null;
  author_name: string | null;
  created_at: string;
  updated_at: string;
};

type ActivityItem = {
  id: string;
  kind: string;
  title: string;
  description: string | null;
  author_name: string | null;
  created_at: string;
};

type Props = {
  variant: Variant;
  cardId: string;
  title: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function KanbanCardDetailsDialog({
  variant,
  cardId,
  title,
  open,
  onOpenChange,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [row, setRow] = useState<Record<string, unknown> | null>(null);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [activityTitle, setActivityTitle] = useState("");
  const [activityDescription, setActivityDescription] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    const res = await fetch(
      `/api/kanban/card-details?variant=${variant}&id=${cardId}`,
      { cache: "no-store" }
    );
    setLoading(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setError(j.error ?? "Falha ao carregar detalhes");
      return;
    }
    const j = (await res.json()) as {
      row: Record<string, unknown>;
      notes: NoteItem[];
      activities: ActivityItem[];
    };
    setRow(j.row);
    setNotes(j.notes ?? []);
    setActivities(j.activities ?? []);
  }

  const entries = Object.entries(row ?? {});

  async function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (next) await load();
  }

  async function addNote() {
    if (!noteTitle.trim()) return;
    setPending(true);
    setError(null);
    const res = await fetch("/api/kanban/card-details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add_note",
        variant,
        id: cardId,
        title: noteTitle.trim(),
        content: noteContent.trim(),
      }),
    });
    setPending(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setError(j.error ?? "Falha ao criar nota");
      return;
    }
    setNoteTitle("");
    setNoteContent("");
    await load();
  }

  async function addActivity() {
    if (!activityTitle.trim()) return;
    setPending(true);
    setError(null);
    const res = await fetch("/api/kanban/card-details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add_activity",
        variant,
        id: cardId,
        title: activityTitle.trim(),
        description: activityDescription.trim(),
        kind: "manual",
      }),
    });
    setPending(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setError(j.error ?? "Falha ao criar atividade");
      return;
    }
    setActivityTitle("");
    setActivityDescription("");
    await load();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => void handleOpenChange(v)}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {loading ? <p className="text-sm text-muted-foreground">A carregar...</p> : null}

        <section className="space-y-2">
          <h4 className="text-sm font-semibold">Dados</h4>
          <div className="grid grid-cols-1 gap-2 rounded-md border p-3 sm:grid-cols-2">
            {entries.map(([k, v]) => (
              <div key={k} className="text-xs">
                <p className="font-medium text-muted-foreground">{k}</p>
                <p className="break-words">
                  {typeof v === "object" ? JSON.stringify(v) : String(v ?? "—")}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h4 className="text-sm font-semibold">Nova nota</h4>
          <div className="grid gap-2 rounded-md border p-3">
            <Input
              placeholder="Título da nota"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
            />
            <Textarea
              placeholder="Conteúdo da nota"
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={3}
            />
            <div>
              <Button onClick={() => void addNote()} disabled={pending}>
                {pending ? "A guardar..." : "Adicionar nota"}
              </Button>
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <h4 className="text-sm font-semibold">Notas</h4>
          <div className="space-y-2 rounded-md border p-3">
            {notes.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem notas ainda.</p>
            ) : (
              notes.map((n) => (
                <div key={n.id} className="rounded border p-2">
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.content ? <p className="mt-1 text-xs">{n.content}</p> : null}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {n.author_name ?? "—"} · {relativeTime(n.updated_at)}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="space-y-2">
          <h4 className="text-sm font-semibold">Nova atividade</h4>
          <div className="grid gap-2 rounded-md border p-3">
            <Input
              placeholder="Título da atividade"
              value={activityTitle}
              onChange={(e) => setActivityTitle(e.target.value)}
            />
            <Textarea
              placeholder="Descrição da atividade"
              value={activityDescription}
              onChange={(e) => setActivityDescription(e.target.value)}
              rows={3}
            />
            <div>
              <Button onClick={() => void addActivity()} disabled={pending}>
                {pending ? "A guardar..." : "Adicionar atividade"}
              </Button>
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <h4 className="text-sm font-semibold">Atividades</h4>
          <div className="space-y-2 rounded-md border p-3">
            {activities.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem atividades ainda.</p>
            ) : (
              activities.map((a) => (
                <div key={a.id} className="rounded border p-2">
                  <p className="text-sm font-medium">{a.title}</p>
                  {a.description ? <p className="mt-1 text-xs">{a.description}</p> : null}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {a.author_name ?? "—"} · {relativeTime(a.created_at)}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
}
