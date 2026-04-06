"use client";

import type { CSSProperties } from "react";
import { CrmSidebar } from "@/components/crm/crm-sidebar";
import { CrmTopNav } from "@/components/crm/crm-top-nav";
import { PersooLogo } from "@/components/crm/persoo-logo";
import type { WorkspaceOption } from "@/components/crm/workspace-switcher";
import type { SidebarNavItem } from "@/lib/ai-schema";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

type Props = {
  workspaces: WorkspaceOption[];
  activeWorkspaceId: string;
  userLabel: string;
  navItems: SidebarNavItem[];
  /** Mostra atalho para /app/admin (super admin). */
  showAdminNav?: boolean;
  children: React.ReactNode;
};

export function CrmAppShell({
  workspaces,
  activeWorkspaceId,
  userLabel,
  navItems,
  showAdminNav = false,
  children,
}: Props) {
  return (
    <SidebarProvider
      style={
        {
          /** Ligeiramente mais largo que o default (3rem) para ícones + logo confortáveis */
          "--sidebar-width-icon": "3.5rem",
        } as CSSProperties
      }
    >
      <CrmSidebar
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        userLabel={userLabel}
        navItems={navItems}
        showAdminNav={showAdminNav}
      />
      <SidebarInset className="relative overflow-hidden bg-gradient-to-br from-sky-50/90 via-emerald-50/40 to-violet-100/50">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(56,189,248,0.18),transparent),radial-gradient(ellipse_60%_40%_at_100%_50%,rgba(167,139,250,0.12),transparent)]"
          aria-hidden
        />
        <header className="relative z-10 flex h-12 shrink-0 items-center gap-2 border-b border-white/40 bg-white/50 px-4 backdrop-blur-md md:hidden">
          <SidebarTrigger className="-ml-1 text-zinc-800" />
          <Separator orientation="vertical" className="mr-2 h-4 bg-zinc-200/80" />
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <PersooLogo size={28} className="size-7" />
            <span className="truncate text-sm font-semibold text-zinc-900">
              persooCRM
            </span>
          </div>
        </header>
        <div className="relative z-10 min-h-[calc(100vh-3rem)] p-4 md:min-h-screen md:p-8">
          <CrmTopNav navItems={navItems} userLabel={userLabel} />
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
