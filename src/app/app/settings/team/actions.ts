"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type RpcInviteResult = {
  ok?: boolean;
  kind?: string;
  token?: string;
  error?: string;
};

type RpcAcceptResult = {
  ok?: boolean;
  workspace_id?: string;
  error?: string;
};

function inviteErrorMessage(code: string): string {
  switch (code) {
    case "forbidden":
      return "Sem permissão para convidar neste espaço.";
    case "invalid_email":
      return "Indique um e-mail válido.";
    case "invalid_role":
      return "Função inválida.";
    case "cannot_invite_self":
      return "Não pode convidar o seu próprio e-mail.";
    default:
      return code;
  }
}

export async function inviteWorkspaceMember(
  workspaceId: string,
  email: string,
  role: "admin" | "member"
): Promise<
  | { ok: true; kind: string; token?: string }
  | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data, error } = await supabase.rpc("invite_workspace_member", {
    p_workspace_id: workspaceId,
    p_email: email.trim(),
    p_role: role,
  });

  if (error) return { error: error.message };

  const row = data as RpcInviteResult;
  if (row?.error) return { error: inviteErrorMessage(String(row.error)) };

  revalidatePath("/app/settings/team");
  return {
    ok: true,
    kind: String(row.kind ?? "unknown"),
    token: typeof row.token === "string" ? row.token : undefined,
  };
}

export async function removeWorkspaceMember(
  workspaceId: string,
  targetUserId: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: target } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (!target) return { error: "Membro não encontrado." };
  if (target.role === "owner") {
    return { error: "Não é possível remover o dono do espaço." };
  }

  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", targetUserId);

  if (error) return { error: error.message };

  revalidatePath("/app/settings/team");
  return { ok: true };
}

export async function updateWorkspaceMemberRole(
  workspaceId: string,
  targetUserId: string,
  role: "admin" | "member"
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: target } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (!target) return { error: "Membro não encontrado." };
  if (target.role === "owner") {
    return { error: "A função do dono não pode ser alterada aqui." };
  }

  const { error } = await supabase
    .from("workspace_members")
    .update({ role })
    .eq("workspace_id", workspaceId)
    .eq("user_id", targetUserId);

  if (error) return { error: error.message };

  revalidatePath("/app/settings/team");
  return { ok: true };
}

export async function cancelWorkspaceInvitation(
  invitationId: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { error } = await supabase
    .from("workspace_invitations")
    .delete()
    .eq("id", invitationId);

  if (error) return { error: error.message };

  revalidatePath("/app/settings/team");
  return { ok: true };
}

export async function acceptWorkspaceInvitation(
  token: string
): Promise<
  | { ok: true; workspaceId: string }
  | { error: string; needsLogin?: boolean }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Inicie sessão para aceitar.", needsLogin: true };

  const { data, error } = await supabase.rpc("accept_workspace_invitation", {
    p_token: token.trim(),
  });

  if (error) return { error: error.message };

  const row = data as RpcAcceptResult;
  if (row?.error) {
    const code = String(row.error);
    if (code === "email_mismatch") {
      return {
        error:
          "Este convite foi enviado para outro e-mail. Use a conta com o e-mail do convite.",
      };
    }
    if (code === "invalid_or_expired") {
      return { error: "Convite inválido ou expirado." };
    }
    return { error: code };
  }

  const ws = row.workspace_id;
  if (!ws || typeof ws !== "string") {
    return { error: "Resposta inesperada do servidor." };
  }

  revalidatePath("/app/dashboard");
  revalidatePath("/app/settings/team");
  return { ok: true, workspaceId: ws };
}
