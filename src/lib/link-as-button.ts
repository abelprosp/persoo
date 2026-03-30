/**
 * Classes equivalentes aos botões shadcn para <Link> em Server Components.
 * Não importar `buttonVariants` de `@/components/ui/button` (ficheiro "use client").
 */
export const linkButtonOutline =
  "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium whitespace-nowrap outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px";

export const linkButtonOutlineSm =
  "inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-[min(var(--radius-md),12px)] border border-border bg-background px-2.5 text-[0.8rem] font-medium whitespace-nowrap outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px";

export const linkButtonSecondarySm =
  "inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-[min(var(--radius-md),12px)] border border-transparent bg-secondary px-2.5 text-[0.8rem] font-medium whitespace-nowrap text-secondary-foreground outline-none transition-colors hover:bg-secondary/80 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px";
