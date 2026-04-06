"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SidebarNavItem } from "@/lib/ai-schema";

type Props = {
  navItems: SidebarNavItem[];
  userLabel: string;
};

export function CrmTopNav({ navItems, userLabel }: Props) {
  const pathname = usePathname();

  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <nav
        className="-mx-1 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pb-1 sm:pb-0"
        aria-label="Módulos"
      >
        {navItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-zinc-900 text-white shadow-md shadow-zinc-900/20"
                  : "bg-white/60 text-zinc-600 ring-1 ring-zinc-200/80 backdrop-blur-sm hover:bg-white/90 hover:text-zinc-900"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex shrink-0 items-center justify-end gap-2">
        <Link
          href="/app/notifications"
          className={cn(
            "flex size-10 items-center justify-center rounded-full bg-white/70 ring-1 ring-zinc-200/80 backdrop-blur-sm transition-colors",
            "hover:bg-white hover:text-zinc-900",
            pathname.startsWith("/app/notifications") && "bg-zinc-900 text-white ring-0"
          )}
          aria-label="Notificações"
        >
          <Bell className="size-[18px]" />
        </Link>
        <div
          className="flex max-w-[10rem] items-center gap-2 rounded-full bg-white/70 py-1.5 pr-3 pl-1.5 ring-1 ring-zinc-200/80 backdrop-blur-sm"
          title={userLabel}
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-violet-500 text-xs font-bold text-white">
            {userLabel.slice(0, 1).toUpperCase()}
          </span>
          <span className="truncate text-xs font-medium text-zinc-800">
            {userLabel.split(" ")[0] ?? userLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
