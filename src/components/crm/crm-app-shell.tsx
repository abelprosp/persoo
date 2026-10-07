"use client";

import type { CSSProperties } from "react";
import { CrmSidebar } from "@/components/crm/crm-sidebar";
import { ProTrialDialog } from "@/components/crm/pro-trial-dialog";
import { PersooLogo } from "@/components/crm/persoo-logo";
import type { WorkspaceOption } from "@/components/crm/workspace-switcher";
import type { SidebarNavItem } from "@/lib/ai-schema";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { Search, Bell } from "lucide-react";

type Props = {
  workspaces: WorkspaceOption[];
  activeWorkspaceId: string;
  userLabel: string;
  navItems: SidebarNavItem[];
  /** Mostra atalho para /app/admin (super admin). */
  showAdminNav?: boolean;
  /** Teste de 7 dias terminou e ainda não há plano Pro ativo. */
  showProPopup?: boolean;
  children: React.ReactNode;
};

export function CrmAppShell({
  workspaces,
  activeWorkspaceId,
  userLabel,
  navItems,
  showAdminNav = false,
  showProPopup = false,
  children,
}: Props) {
  return (
    <SidebarProvider
      defaultOpen={false}
      className="persoo-workspace"
      style={
        {
          /** Ligeiramente mais largo que o default (3rem) para ícones + logo confortáveis */
          "--sidebar-width-icon": "4.5rem",
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
      <SidebarInset className="bg-[#eff1f4]">
        <header className="flex min-h-20 shrink-0 flex-wrap items-center gap-3 px-4 py-3 md:px-8">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="hidden h-6 sm:block" />
          <Link href="/app/dashboard" aria-label="PersooCRM — início"><PersooLogo size={48} wordmark priority /></Link>
          <form action="/app/search" className="order-last flex w-full items-center gap-2 rounded-full bg-white px-4 py-2.5 sm:order-none sm:ml-4 sm:w-auto sm:max-w-sm sm:flex-1">
            <Search className="size-4 shrink-0 text-slate-400" aria-hidden />
            <input type="search" name="q" aria-label="Buscar no CRM" placeholder="Buscar no seu CRM…" className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-slate-400" />
          </form>
          <div className="ml-auto flex items-center gap-3">
            <Link href="/app/notifications" aria-label="Notificações" className="rounded-full bg-white p-3 text-slate-600 hover:text-blue-600"><Bell className="size-4" /></Link>
            <Link href="/app/settings/profile" title={userLabel} className="flex size-10 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">{userLabel.slice(0, 2).toUpperCase()}</Link>
          </div>
        </header>
        <div className="min-w-0 flex-1 px-4 pb-8 pt-3 md:px-8">
          {children}
        </div>
        {showProPopup ? <ProTrialDialog /> : null}
      </SidebarInset>
    </SidebarProvider>
  );
}
