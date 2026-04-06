"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  LayoutDashboard,
  Users,
  Handshake,
  UserCircle2,
  Building2,
  StickyNote,
  ListTodo,
  PanelLeft,
  PanelLeftClose,
  Sparkles,
  Package,
  Shield,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { SignOutButton } from "@/components/crm/sign-out-button";
import {
  WorkspaceSwitcher,
  type WorkspaceOption,
} from "@/components/crm/workspace-switcher";
import type { NavModuleKey, SidebarNavItem } from "@/lib/ai-schema";
import { PersooLogo } from "@/components/crm/persoo-logo";

const NAV_ICONS: Record<NavModuleKey, LucideIcon> = {
  notifications: Bell,
  dashboard: LayoutDashboard,
  leads: Users,
  deals: Handshake,
  contacts: UserCircle2,
  organizations: Building2,
  products: Package,
  notes: StickyNote,
  tasks: ListTodo,
};

type Props = {
  workspaces: WorkspaceOption[];
  activeWorkspaceId: string;
  userLabel: string;
  navItems: SidebarNavItem[];
  showAdminNav?: boolean;
};

export function CrmSidebar({
  workspaces,
  activeWorkspaceId,
  userLabel,
  navItems,
  showAdminNav = false,
}: Props) {
  const pathname = usePathname();
  const { toggleSidebar, state } = useSidebar();
  const collapsed = state === "collapsed";

  const adminActive =
    pathname === "/app/admin" || pathname.startsWith("/app/admin/");
  const settingsActive =
    pathname === "/app/settings" ||
    pathname.startsWith("/app/settings/profile") ||
    pathname.startsWith("/app/settings/billing") ||
    pathname.startsWith("/app/settings/team");
  const aiActive = pathname.startsWith("/app/settings/ai");

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-white/[0.06] bg-zinc-950 text-zinc-100 group-data-[collapsible=icon]:rounded-r-[1.75rem]"
    >
      <SidebarHeader className="border-b border-white/[0.06] px-3 py-4 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-3.5">
        <div className="flex items-center gap-3 rounded-xl px-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <div
            className={cn(
              "flex shrink-0 items-center justify-center rounded-2xl bg-white shadow-lg shadow-black/20 ring-1 ring-white/20 transition-[width,height,box-shadow]",
              collapsed ? "size-9" : "size-10"
            )}
          >
            <PersooLogo
              size={collapsed ? 26 : 40}
              className={cn(
                "object-contain",
                collapsed ? "size-[26px] max-h-[26px] max-w-[26px]" : "size-10"
              )}
              priority
            />
          </div>
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-semibold tracking-tight text-zinc-50">
              persooCRM
            </p>
            <p className="truncate text-xs text-zinc-500">{userLabel}</p>
          </div>
        </div>
        <div className="px-1 group-data-[collapsible=icon]:hidden">
          <WorkspaceSwitcher
            workspaces={workspaces}
            activeId={activeWorkspaceId}
            tone="onDark"
          />
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 group-data-[collapsible=icon]:px-1.5">
        <SidebarGroup className="py-2 group-data-[collapsible=icon]:py-2.5">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5 group-data-[collapsible=icon]:gap-1.5">
              {navItems.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                const Icon = NAV_ICONS[item.moduleKey];
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={active}
                      tooltip={item.label}
                      className={cn(
                        "h-10 rounded-xl px-2 transition-[color,background-color,box-shadow,transform]",
                        "group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!min-h-10 group-data-[collapsible=icon]:!p-0",
                        active
                          ? cn(
                              "!bg-white !font-medium !text-zinc-900 shadow-md shadow-black/10 ring-0 data-active:bg-white",
                              "group-data-[collapsible=icon]:!bg-white group-data-[collapsible=icon]:!text-zinc-900",
                              "group-data-[collapsible=icon]:hover:!bg-zinc-100"
                            )
                          : "text-zinc-500 hover:bg-white/[0.07] hover:text-zinc-100 group-data-[collapsible=icon]:hover:bg-white/10"
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-1 border-t border-white/[0.06] p-3 group-data-[collapsible=icon]:gap-1.5 group-data-[collapsible=icon]:px-1.5 group-data-[collapsible=icon]:py-3">
        <SidebarMenu className="gap-0.5 group-data-[collapsible=icon]:gap-1.5">
          <SidebarMenuItem>
            <SidebarMenuButton
              type="button"
              onClick={() => toggleSidebar()}
              tooltip={collapsed ? "Expandir menu" : "Recolher menu"}
              className={cn(
                "h-10 justify-start rounded-xl text-zinc-500 hover:bg-white/[0.07] hover:text-zinc-100",
                "group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!min-h-10 group-data-[collapsible=icon]:!justify-center group-data-[collapsible=icon]:!p-0",
                "hover:group-data-[collapsible=icon]:bg-white/10"
              )}
            >
              {collapsed ? (
                <PanelLeft className="size-4 shrink-0" />
              ) : (
                <PanelLeftClose className="size-4 shrink-0" />
              )}
              <span>{collapsed ? "Expandir" : "Recolher"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {showAdminNav ? (
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link href="/app/admin" />}
                tooltip="Admin"
                variant="outline"
                isActive={adminActive}
                className={cn(
                  "h-10 rounded-xl",
                  "group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!min-h-10 group-data-[collapsible=icon]:!p-0",
                  collapsed
                    ? cn(
                        "border-0 bg-transparent text-zinc-500 shadow-none ring-0 hover:bg-white/10 hover:text-zinc-100",
                        adminActive &&
                          "bg-amber-400/20 font-medium text-amber-200 ring-1 ring-amber-400/30"
                      )
                    : cn(
                        "border border-amber-500/30 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20 data-active:bg-amber-500/10",
                        adminActive && "ring-1 ring-amber-400/40"
                      )
                )}
              >
                <Shield
                  className={cn(
                    "size-4 shrink-0",
                    collapsed && adminActive && "text-amber-200"
                  )}
                />
                <span>Admin</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : null}
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/app/settings/profile" />}
              tooltip="Definições"
              variant="outline"
              isActive={settingsActive}
              className={cn(
                "h-10 rounded-xl",
                "group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!min-h-10 group-data-[collapsible=icon]:!p-0",
                collapsed
                  ? cn(
                      "border-0 bg-transparent text-zinc-500 shadow-none ring-0 hover:bg-white/10 hover:text-zinc-100",
                      settingsActive &&
                        "bg-white/15 font-medium text-white ring-1 ring-white/20"
                    )
                  : cn(
                      "border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10 data-active:bg-white/5",
                      settingsActive && "ring-1 ring-white/25"
                    )
              )}
            >
              <Settings className="size-4 shrink-0" />
              <span>Definições</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/app/settings/ai" />}
              tooltip="IA — CRM"
              variant="outline"
              isActive={aiActive}
              className={cn(
                "h-10 rounded-xl",
                "group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!min-h-10 group-data-[collapsible=icon]:!p-0",
                collapsed
                  ? cn(
                      "border-0 bg-transparent text-zinc-500 shadow-none ring-0 hover:bg-white/10 hover:text-zinc-100",
                      aiActive &&
                        "bg-violet-500/25 font-medium text-violet-100 ring-1 ring-violet-400/40"
                    )
                  : cn(
                      "border border-violet-400/30 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25 data-active:bg-violet-500/15",
                      aiActive && "ring-1 ring-violet-400/50"
                    )
              )}
            >
              <Sparkles
                className={cn(
                  "size-4 shrink-0",
                  collapsed && aiActive && "text-violet-200"
                )}
              />
              <span>IA — personalizar CRM</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SignOutButton tone="onDark" />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
