"use client";

import { useEffect, useState } from "react";
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
import { createTask } from "@/app/app/tasks/actions";
import { cn } from "@/lib/utils";
import type { CustomFieldDef } from "@/lib/ai-schema";

export type TaskFormFieldLabels = {
  title?: string;
  status?: string;
  priority?: string;
  due_at?: string;
  assignee_name?: string;
};

export type TaskStatusOption = { id: string; label: string };

type Props = {
  statusOptions: TaskStatusOption[];
  customFields: CustomFieldDef[];
  fieldLabels?: TaskFormFieldLabels;
  dialogTitle?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultStatus?: string;
  defaultDueAt?: string;
  showTrigger?: boolean;
};

export function CreateTaskDialog({
  statusOptions,
  customFields,
  fieldLabels,
  dialogTitle = "Nova tarefa",
  open: controlledOpen,
  onOpenChange,
  defaultStatus = "todo",
  defaultDueAt = "",
  showTrigger = true,
}: Props) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const controlled = controlledOpen !== undefined;
  const open = controlled ? Boolean(controlledOpen) : internalOpen;
  function setOpen(next: boolean) {
    if (controlled) onOpenChange?.(next);
    else setInternalOpen(next);
  }

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState(defaultStatus);
  const [dueAt, setDueAt] = useState(defaultDueAt);

  const lb = {
    title: fieldLabels?.title ?? "Título",
    status: fieldLabels?.status ?? "Estado",
    priority: fieldLabels?.priority ?? "Prioridade",
    due_at: fieldLabels?.due_at ?? "Prazo",
    assignee_name: fieldLabels?.assignee_name ?? "Atribuído",
  };

  useEffect(() => {
    if (open) {
      setStatus(defaultStatus);
      setDueAt(defaultDueAt);
      setError(null);
    }
  }, [open, defaultStatus, defaultDueAt]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const r = await createTask(fd);
    setPending(false);
    if ("error" in r) {
      setError(r.error);
      return;
    }
    setOpen(false);
    e.currentTarget.reset();
    setStatus(defaultStatus);
    setDueAt(defaultDueAt);
    router.refresh();
  }

  return (
    <>
      {showTrigger && (
        <Button
          type="button"
          className="bg-zinc-900 text-white hover:bg-zinc-800"
          onClick={() => setOpen(true)}
        >
          <Plus className="mr-2 size-4" />
          Criar
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={onSubmit}>
            <DialogHeader>
              <DialogTitle>{dialogTitle}</DialogTitle>
            </DialogHeader>
            <div className="grid max-h-[min(70vh,520px)] gap-3 overflow-y-auto py-4">
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="task-title">{lb.title} *</Label>
                <Input id="task-title" name="title" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-status">{lb.status}</Label>
                <select
                  id="task-status"
                  name="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className={cn(
                    "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none",
                    "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  )}
                >
                  {statusOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-priority">{lb.priority}</Label>
                <select
                  id="task-priority"
                  name="priority"
                  defaultValue="medium"
                  className={cn(
                    "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none",
                    "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  )}
                >
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-due">{lb.due_at}</Label>
                <Input
                  id="task-due"
                  name="due_at"
                  type="datetime-local"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-assignee">{lb.assignee_name}</Label>
                <Input id="task-assignee" name="assignee_name" />
              </div>
              {customFields.map((f) => (
                <div key={f.key} className="space-y-2">
                  <Label htmlFor={`task-cf-${f.key}`}>{f.label}</Label>
                  <Input
                    id={`task-cf-${f.key}`}
                    name={`custom_${f.key}`}
                    type={
                      f.type.toLowerCase() === "number"
                        ? "text"
                        : f.type.toLowerCase() === "date"
                          ? "date"
                          : "text"
                    }
                    inputMode={
                      f.type.toLowerCase() === "number" ? "decimal" : undefined
                    }
                  />
                </div>
              ))}
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
                {pending ? "A guardar…" : "Criar tarefa"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
