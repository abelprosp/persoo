export function showingInactive(sp: {
  inativos?: string | string[] | undefined;
}): boolean {
  const raw = sp.inativos;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === "1";
}
