"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type TaskCalendarItem = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueAtIso: string;
  assigneeName: string | null;
};

type Props = {
  items: TaskCalendarItem[];
  onCreateClick?: () => void;
  onDayClick?: (dateYmd: string) => void;
};

type CalendarDay = {
  date: Date;
  ymd: string;
  inCurrentMonth: boolean;
};

const WEEK_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function toYmdLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function getGridDays(month: Date): CalendarDay[] {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const startWeekday = start.getDay();
  const gridStart = new Date(start);
  gridStart.setDate(start.getDate() - startWeekday);

  const endWeekday = end.getDay();
  const gridEnd = new Date(end);
  gridEnd.setDate(end.getDate() + (6 - endWeekday));

  const out: CalendarDay[] = [];
  const cursor = new Date(gridStart);
  while (cursor <= gridEnd) {
    const cellDate = new Date(cursor);
    out.push({
      date: cellDate,
      ymd: toYmdLocal(cellDate),
      inCurrentMonth: cellDate.getMonth() === month.getMonth(),
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

function priorityTone(priority: string): "default" | "secondary" | "destructive" {
  if (priority === "high") return "destructive";
  if (priority === "low") return "secondary";
  return "default";
}

export function TaskCalendarView({ items, onCreateClick, onDayClick }: Props) {
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
  const days = useMemo(() => getGridDays(monthCursor), [monthCursor]);

  const byDay = useMemo(() => {
    const map = new Map<string, TaskCalendarItem[]>();
    for (const item of items) {
      const d = new Date(item.dueAtIso);
      if (Number.isNaN(d.getTime())) continue;
      const key = toYmdLocal(d);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => +new Date(a.dueAtIso) - +new Date(b.dueAtIso));
    }
    return map;
  }, [items]);

  const totalMonth = useMemo(() => {
    const y = monthCursor.getFullYear();
    const m = monthCursor.getMonth();
    let count = 0;
    for (const item of items) {
      const d = new Date(item.dueAtIso);
      if (!Number.isNaN(d.getTime()) && d.getFullYear() === y && d.getMonth() === m) {
        count += 1;
      }
    }
    return count;
  }, [items, monthCursor]);

  const nowYmd = toYmdLocal(new Date());

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() =>
              setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
            }
          >
            <ChevronLeft className="size-4" />
          </Button>
          <p className="min-w-[180px] text-sm font-medium capitalize">
            {monthLabel(monthCursor)}
          </p>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() =>
              setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
            }
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{totalMonth} agendamentos no mês</Badge>
          <Button type="button" size="sm" onClick={onCreateClick}>
            Novo agendamento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {WEEK_LABELS.map((w) => (
          <div key={w} className="px-1 text-xs font-medium text-muted-foreground">
            {w}
          </div>
        ))}
        {days.map((day) => {
          const dayItems = byDay.get(day.ymd) ?? [];
          return (
            <div
              key={day.ymd}
              className={`min-h-28 rounded-md border p-1.5 transition-colors ${
                day.inCurrentMonth ? "bg-background" : "bg-muted/35"
              } ${onDayClick ? "cursor-pointer hover:bg-muted/30" : ""}`}
              onClick={() => onDayClick?.(day.ymd)}
              role={onDayClick ? "button" : undefined}
              tabIndex={onDayClick ? 0 : undefined}
              onKeyDown={(e) => {
                if (!onDayClick) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onDayClick(day.ymd);
                }
              }}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={`text-xs ${
                    day.ymd === nowYmd
                      ? "rounded bg-zinc-900 px-1.5 py-0.5 text-white"
                      : "text-muted-foreground"
                  }`}
                >
                  {day.date.getDate()}
                </span>
                {dayItems.length > 0 ? (
                  <span className="text-[10px] text-muted-foreground">{dayItems.length}</span>
                ) : null}
              </div>

              <div className="space-y-1">
                {dayItems.slice(0, 3).map((item) => {
                  const hour = new Date(item.dueAtIso).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return (
                    <div key={item.id} className="rounded border bg-card px-1.5 py-1">
                      <p className="truncate text-[11px] font-medium">{item.title}</p>
                      <div className="mt-0.5 flex items-center justify-between gap-1">
                        <span className="text-[10px] text-muted-foreground">{hour}</span>
                        <Badge variant={priorityTone(item.priority)} className="h-4 px-1 text-[9px]">
                          {item.priority === "high"
                            ? "Alta"
                            : item.priority === "low"
                              ? "Baixa"
                              : "Média"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
                {dayItems.length > 3 ? (
                  <p className="text-[10px] text-muted-foreground">+{dayItems.length - 3} mais</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
