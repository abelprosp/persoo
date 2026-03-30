"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  labelChipClass,
  type CardChecklist,
  type CardEnrichment,
  type CardLabel,
} from "@/lib/card-enrichment";
import { Plus, Trash2 } from "lucide-react";

const LABEL_COLORS = [
  "slate",
  "blue",
  "green",
  "amber",
  "red",
  "violet",
] as const;

function rid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2, 12)}`;
}

type Props = {
  value: CardEnrichment;
  onChange: (next: CardEnrichment) => void;
  onSave: () => void;
  pending: boolean;
};

export function KanbanCardEnrichmentEditor({
  value,
  onChange,
  onSave,
  pending,
}: Props) {
  function setLabels(labels: CardLabel[]) {
    onChange({ ...value, labels });
  }

  function setTeam(names: { id: string; name: string }[]) {
    onChange({ ...value, team_members: names });
  }

  function setDocuments(
    docs: { id: string; title: string; url: string }[]
  ) {
    onChange({ ...value, documents: docs });
  }

  function setChecklists(checklists: CardChecklist[]) {
    onChange({ ...value, checklists });
  }

  return (
    <div className="space-y-4 rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">
          Checklists, documentos, equipa e etiquetas
        </h4>
        <Button
          type="button"
          size="sm"
          onClick={() => void onSave()}
          disabled={pending}
        >
          {pending ? "A guardar..." : "Guardar"}
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Etiquetas</Label>
        <div className="space-y-2">
          {value.labels.map((l, i) => (
            <div key={l.id} className="flex flex-wrap items-center gap-2">
              <Input
                className="min-w-[120px] flex-1"
                placeholder="Nome"
                value={l.name}
                onChange={(e) => {
                  const next = [...value.labels];
                  next[i] = { ...l, name: e.target.value };
                  setLabels(next);
                }}
              />
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={l.color}
                onChange={(e) => {
                  const next = [...value.labels];
                  next[i] = { ...l, color: e.target.value };
                  setLabels(next);
                }}
              >
                {LABEL_COLORS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px]",
                  labelChipClass(l.color)
                )}
              >
                pré-visualização
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                onClick={() => setLabels(value.labels.filter((x) => x.id !== l.id))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() =>
              setLabels([
                ...value.labels,
                { id: rid(), name: "", color: "slate" },
              ])
            }
          >
            <Plus className="size-3.5" />
            Etiqueta
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Equipa (menções)</Label>
        <div className="space-y-2">
          {value.team_members.map((m, i) => (
            <div key={m.id} className="flex gap-2">
              <Input
                placeholder="Nome na equipa"
                value={m.name}
                onChange={(e) => {
                  const next = [...value.team_members];
                  next[i] = { ...m, name: e.target.value };
                  setTeam(next);
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 shrink-0"
                onClick={() =>
                  setTeam(value.team_members.filter((x) => x.id !== m.id))
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() =>
              setTeam([...value.team_members, { id: rid(), name: "" }])
            }
          >
            <Plus className="size-3.5" />
            Pessoa
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Documentos (links)</Label>
        <div className="space-y-2">
          {value.documents.map((d, i) => (
            <div key={d.id} className="flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="Título"
                value={d.title}
                onChange={(e) => {
                  const next = [...value.documents];
                  next[i] = { ...d, title: e.target.value };
                  setDocuments(next);
                }}
              />
              <Input
                className="sm:min-w-[200px]"
                placeholder="https://..."
                value={d.url}
                onChange={(e) => {
                  const next = [...value.documents];
                  next[i] = { ...d, url: e.target.value };
                  setDocuments(next);
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 shrink-0"
                onClick={() =>
                  setDocuments(value.documents.filter((x) => x.id !== d.id))
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() =>
              setDocuments([
                ...value.documents,
                { id: rid(), title: "", url: "" },
              ])
            }
          >
            <Plus className="size-3.5" />
            Documento
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Checklists</Label>
        <div className="space-y-3">
          {value.checklists.map((cl, ci) => (
            <div key={cl.id} className="rounded border p-2">
              <div className="mb-2 flex gap-2">
                <Input
                  placeholder="Título da checklist"
                  value={cl.title}
                  onChange={(e) => {
                    const next = [...value.checklists];
                    next[ci] = { ...cl, title: e.target.value };
                    setChecklists(next);
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9 shrink-0"
                  onClick={() =>
                    setChecklists(value.checklists.filter((c) => c.id !== cl.id))
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <ul className="space-y-2 pl-1">
                {cl.items.map((it, ii) => (
                  <li key={it.id} className="flex items-start gap-2">
                    <Checkbox
                      checked={it.done}
                      className="mt-1"
                      onCheckedChange={(v) => {
                        const next = [...value.checklists];
                        const items = [...next[ci].items];
                        items[ii] = { ...it, done: v === true };
                        next[ci] = { ...next[ci], items };
                        setChecklists(next);
                      }}
                    />
                    <Input
                      className="flex-1"
                      value={it.text}
                      onChange={(e) => {
                        const next = [...value.checklists];
                        const items = [...next[ci].items];
                        items[ii] = { ...it, text: e.target.value };
                        next[ci] = { ...next[ci], items };
                        setChecklists(next);
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0"
                      onClick={() => {
                        const next = [...value.checklists];
                        const items = next[ci].items.filter((x) => x.id !== it.id);
                        next[ci] = { ...next[ci], items };
                        setChecklists(next);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 gap-1"
                onClick={() => {
                  const next = [...value.checklists];
                  next[ci] = {
                    ...next[ci],
                    items: [...next[ci].items, { id: rid(), text: "", done: false }],
                  };
                  setChecklists(next);
                }}
              >
                <Plus className="size-3.5" />
                Item
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() =>
              setChecklists([
                ...value.checklists,
                { id: rid(), title: "Checklist", items: [] },
              ])
            }
          >
            <Plus className="size-3.5" />
            Nova checklist
          </Button>
        </div>
      </div>
    </div>
  );
}
