import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function formatBRL(value: number | null | undefined) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

export function formatUSDShort(value: number | null | undefined) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  const n = Number(value);
  if (n >= 1_000_000)
    return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)
    return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export function relativeTime(date: string | Date | null | undefined) {
  if (!date) return "—";
  try {
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: ptBR,
    });
  } catch {
    return "—";
  }
}
