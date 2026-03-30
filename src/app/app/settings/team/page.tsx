import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { TeamPanel } from "./team-panel";

export default async function TeamSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ctx = await getWorkspaceContext(supabase, user.id);
  const wsId = ctx.active?.id;
  if (!wsId) redirect("/app/dashboard");

  const { data: members } = await supabase
    .from("workspace_members")
    .select("user_id, role")
    .eq("workspace_id", wsId)
    .order("role", { ascending: true });

  const userIds = [...new Set((members ?? []).map((m) => m.user_id))];
  let profiles: { id: string; full_name: string | null }[] = [];
  if (userIds.length > 0) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);
    profiles = prof ?? [];
  }

  const nameByUser = new Map(profiles.map((p) => [p.id, p.full_name]));

  const { data: wsRow } = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", wsId)
    .single();

  const myRow = (members ?? []).find((m) => m.user_id === user.id);
  const canManage =
    wsRow?.owner_id === user.id ||
    myRow?.role === "owner" ||
    myRow?.role === "admin";

  let invites: {
    id: string;
    email: string;
    role: string;
    expires_at: string;
    created_at: string;
    token: string;
  }[] = [];

  if (canManage) {
    const { data: inv } = await supabase
      .from("workspace_invitations")
      .select("id, email, role, expires_at, created_at, token")
      .eq("workspace_id", wsId)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    invites = inv ?? [];
  }

  const rows = (members ?? []).map((m) => ({
    userId: m.user_id,
    role: m.role as "owner" | "admin" | "member",
    name:
      nameByUser.get(m.user_id)?.trim() ||
      (m.user_id === user.id ? "Eu" : "Utilizador"),
    isSelf: m.user_id === user.id,
  }));

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Equipa</h2>
      <TeamPanel
        workspaceId={wsId}
        workspaceName={ctx.active?.name ?? "Espaço"}
        canManage={canManage}
        members={rows}
        invitations={invites}
      />
    </div>
  );
}
