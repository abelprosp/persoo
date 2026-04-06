"use client";

import type { CSSProperties } from "react";
import { CrmSidebar } from "@/components/crm/crm-sidebar";
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
      <SidebarInset className="bg-[#f3f4f6]">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border/60 bg-white px-4 md:hidden">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <PersooLogo size={28} className="size-7" />
            <span className="truncate text-sm font-medium">persooCRM</span>
          </div>
        </header>
        <div className="min-h-[calc(100vh-3rem)] p-6 md:min-h-screen md:p-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
