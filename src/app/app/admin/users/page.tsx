import { createClient } from "@/lib/supabase/server";
import { UsersAdmin } from "@/app/app/admin/users/users-admin";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name, is_super_admin, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <p className="text-sm text-destructive">
        Erro ao carregar perfis. Execute a migração 005 (coluna is_super_admin).
      </p>
    );
  }

  return <UsersAdmin profiles={profiles ?? []} />;
}
