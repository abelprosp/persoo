import { CrmAppShell } from "@/components/crm/crm-app-shell";
import { createClient } from "@/lib/supabase/server";
import { getSidebarNavItems } from "@/lib/ai-schema";
import { getWorkspaceContext } from "@/lib/workspace";
import { isSuperAdmin } from "@/lib/admin";
import {
  evaluateWorkspaceAccess,
  getWorkspaceSubscription,
} from "@/lib/subscriptions";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!process.env.DATABASE_URL) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-8 text-center">
        <p className="max-w-md text-sm text-muted-foreground">
          Defina <code className="rounded bg-muted px-1">DATABASE_URL</code> para
          ligar ao PostgreSQL. Com Docker, use{" "}
          <code className="rounded bg-muted px-1">docker compose up --build</code>.
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

  const pathname = (await headers()).get("x-pathname") ?? "";
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.onboarding_completed) {
    redirect("/onboarding");
  }

  const ctx = await getWorkspaceContext(supabase, user.id);
  const showAdminNav = await isSuperAdmin(supabase, user);

  let showProPopup = false;
  if (
    ctx.active &&
    !pathname.startsWith("/app/billing-blocked") &&
    !pathname.startsWith("/app/settings/billing") &&
    !pathname.startsWith("/app/admin")
  ) {
    const sub = await getWorkspaceSubscription(supabase, ctx.active.id);
    const access = evaluateWorkspaceAccess(sub, { bypass: showAdminNav });
    if (!access.ok && access.reason !== "trial_expired") {
      redirect(`/app/billing-blocked?reason=${access.reason}`);
    }
    showProPopup = !access.ok && access.reason === "trial_expired";
  }

  const workspaces = ctx.list.map((w) => ({ id: w.id, name: w.name }));
  const navItems = getSidebarNavItems(
    ctx.active?.ai_schema as Record<string, unknown> | null
  );

  return (
    <CrmAppShell
      workspaces={workspaces}
      activeWorkspaceId={ctx.active?.id ?? ""}
      userLabel={profile?.full_name ?? user.email ?? "Conta"}
      navItems={navItems}
      showAdminNav={showAdminNav}
      showProPopup={showProPopup}
    >
      {children}
    </CrmAppShell>
  );
}
