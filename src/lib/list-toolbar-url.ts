/** Remove caracteres problemáticos para padrões ILIKE. */
export function sanitizeIlikeTerm(raw: string): string {
  return raw.trim().slice(0, 120).replace(/[%_\\]/g, "");
}

export function parseHideSet(
  raw: string | string[] | undefined
): Set<string> {
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (!s?.trim()) return new Set();
  return new Set(s.split(",").map((x) => x.trim()).filter(Boolean));
}

export function countVisibleTableColumns(
  hide: Set<string>,
  fixedIds: string[],
  extraFieldKeys: string[]
): number {
  let n = 1;
  for (const id of fixedIds) {
    if (!hide.has(id)) n++;
  }
  for (const key of extraFieldKeys) {
    if (!hide.has(`extra:${key}`)) n++;
  }
  return n;
}

export function pickSortId(
  options: { id: string }[],
  requested: string | undefined,
  fallback: string
): string {
  if (requested && options.some((o) => o.id === requested)) {
    return requested;
  }
  if (options.some((o) => o.id === fallback)) return fallback;
  return options[0]?.id ?? fallback;
}

export function resolveSortOption<T extends { id: string; column: string; ascending: boolean }>(
  options: T[],
  sortId: string
): T {
  return options.find((o) => o.id === sortId) ?? options[0]!;
}
