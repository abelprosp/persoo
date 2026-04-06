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
      className="border-r border-border/70 bg-[#f9fafb] group-data-[collapsible=icon]:border-border/50 group-data-[collapsible=icon]:bg-gradient-to-b group-data-[collapsible=icon]:from-[#fafafa] group-data-[collapsible=icon]:to-[#f4f4f5]"
    >
      <SidebarHeader className="border-b border-border/50 px-3 py-4 group-data-[collapsible=icon]:border-border/40 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-3.5">
        <div className="flex items-center gap-3 rounded-lg px-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <div
            className={cn(
              "flex shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/[0.06] transition-[width,height,box-shadow]",
              collapsed ? "size-9 shadow-md ring-black/[0.04]" : "size-10"
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
            <p className="truncate text-sm font-semibold tracking-tight">
              persooCRM
            </p>
            <p className="truncate text-xs text-muted-foreground">{userLabel}</p>
          </div>
        </div>
        <div className="px-1 group-data-[collapsible=icon]:hidden">
          <WorkspaceSwitcher
            workspaces={workspaces}
            activeId={activeWorkspaceId}
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
                        "h-9 rounded-lg px-2 transition-[color,background-color,box-shadow,transform]",
                        "group-data-[collapsible=icon]:!size-9 group-data-[collapsible=icon]:!min-h-9 group-data-[collapsible=icon]:!p-0",
                        active
                          ? cn(
                              "!bg-white font-medium text-foreground shadow-sm ring-1 ring-border/80 data-active:bg-white",
                              "group-data-[collapsible=icon]:!bg-zinc-900 group-data-[collapsible=icon]:!text-white group-data-[collapsible=icon]:shadow-md group-data-[collapsible=icon]:ring-0",
                              "group-data-[collapsible=icon]:data-active:!bg-zinc-900",
                              "group-data-[collapsible=icon]:hover:!bg-zinc-800 group-data-[collapsible=icon]:hover:!text-white"
                            )
                          : "text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:hover:bg-white/80"
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
      <SidebarFooter className="gap-1 border-t border-border/50 p-3 group-data-[collapsible=icon]:gap-1.5 group-data-[collapsible=icon]:border-border/40 group-data-[collapsible=icon]:px-1.5 group-data-[collapsible=icon]:py-3">
        <SidebarMenu className="gap-0.5 group-data-[collapsible=icon]:gap-1.5">
          <SidebarMenuItem>
            <SidebarMenuButton
              type="button"
              onClick={() => toggleSidebar()}
              tooltip={collapsed ? "Expandir menu" : "Recolher menu"}
              className={cn(
                "h-9 justify-start text-muted-foreground",
                "group-data-[collapsible=icon]:!size-9 group-data-[collapsible=icon]:!min-h-9 group-data-[collapsible=icon]:!justify-center group-data-[collapsible=icon]:!p-0",
                "group-data-[collapsible=icon]:rounded-lg group-data-[collapsible=icon]:text-muted-foreground hover:group-data-[collapsible=icon]:bg-white/80"
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
                  "h-9",
                  "group-data-[collapsible=icon]:!size-9 group-data-[collapsible=icon]:!min-h-9 group-data-[collapsible=icon]:!p-0",
                  collapsed
                    ? cn(
                        "border-0 bg-transparent text-muted-foreground shadow-none ring-0 hover:bg-white/80 hover:text-foreground",
                        adminActive &&
                          "bg-white font-medium text-foreground shadow-sm ring-1 ring-border/60"
                      )
                    : cn(
                        "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 data-active:bg-amber-50",
                        adminActive && "ring-1 ring-amber-300"
                      )
                )}
              >
                <Shield
                  className={cn(
                    "size-4 shrink-0",
                    collapsed && adminActive && "text-amber-700"
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
                "h-9",
                "group-data-[collapsible=icon]:!size-9 group-data-[collapsible=icon]:!min-h-9 group-data-[collapsible=icon]:!p-0",
                collapsed
                  ? cn(
                      "border-0 bg-transparent text-muted-foreground shadow-none ring-0 hover:bg-white/80 hover:text-foreground",
                      settingsActive &&
                        "bg-white font-medium text-foreground shadow-sm ring-1 ring-border/60"
                    )
                  : cn(
                      "border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 data-active:bg-slate-50",
                      settingsActive && "ring-1 ring-slate-300"
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
                "h-9",
                "group-data-[collapsible=icon]:!size-9 group-data-[collapsible=icon]:!min-h-9 group-data-[collapsible=icon]:!p-0",
                collapsed
                  ? cn(
                      "border-0 bg-transparent text-muted-foreground shadow-none ring-0 hover:bg-white/80 hover:text-foreground",
                      aiActive &&
                        "bg-white font-medium text-violet-700 shadow-sm ring-1 ring-violet-200/80"
                    )
                  : cn(
                      "border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100 data-active:bg-violet-50",
                      aiActive && "ring-1 ring-violet-300"
                    )
              )}
            >
              <Sparkles
                className={cn(
                  "size-4 shrink-0",
                  collapsed && aiActive && "text-violet-600"
                )}
              />
              <span>IA — personalizar CRM</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SignOutButton />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
