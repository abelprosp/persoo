"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/app/settings/profile", label: "Perfil" },
  { href: "/app/settings/billing", label: "Faturação" },
  { href: "/app/settings/team", label: "Equipa" },
  { href: "/app/settings/ai", label: "IA" },
] as const;

export function SettingsSubNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "flex flex-wrap gap-2 border-b border-border/60 pb-3",
        className
      )}
      aria-label="Secções de definições"
    >
      {ITEMS.map(({ href, label }) => {
        const active =
          pathname === href ||
          (href === "/app/settings/profile" && pathname === "/app/settings");
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
