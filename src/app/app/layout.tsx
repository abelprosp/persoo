import { CrmAppShell } from "@/components/crm/crm-app-shell";
import { createClient } from "@/lib/supabase/server";
import { getSidebarNavItems } from "@/lib/ai-schema";
import { getWorkspaceContext } from "@/lib/workspace";
import { isSuperAdmin } from "@/lib/admin";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-8 text-center">
        <p className="max-w-md text-sm text-muted-foreground">
          Defina <code className="rounded bg-muted px-1">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
          e{" "}
          <code className="rounded bg-muted px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
          no ficheiro <code className="rounded bg-muted px-1">.env.local</code>.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const ctx = await getWorkspaceContext(supabase, user.id);
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const workspaces = ctx.list.map((w) => ({ id: w.id, name: w.name }));
  const navItems = getSidebarNavItems(
    ctx.active?.ai_schema as Record<string, unknown> | null
  );
  const showAdminNav = await isSuperAdmin(supabase, user);

  return (
    <CrmAppShell
      workspaces={workspaces}
      activeWorkspaceId={ctx.active?.id ?? ""}
      userLabel={profile?.full_name ?? user.email ?? "Conta"}
      navItems={navItems}
      showAdminNav={showAdminNav}
    >
      {children}
    </CrmAppShell>
  );
}
