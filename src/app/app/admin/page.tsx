import { createClient } from "@/lib/supabase/server";

export default async function AdminHomePage() {
  const supabase = await createClient();

  const [ws, prof, plans, subs] = await Promise.all([
    supabase.from("workspaces").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("subscription_plans").select("*", { count: "exact", head: true }),
    supabase.from("workspace_subscriptions").select("*", { count: "exact", head: true }),
  ]);

  const cards = [
    { label: "Espaços de trabalho", value: ws.count ?? "—" },
    { label: "Utilizadores (perfis)", value: prof.count ?? "—" },
    { label: "Planos definidos", value: plans.count ?? "—" },
    { label: "Assinaturas ativas", value: subs.count ?? "—" },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border border-border/80 bg-white p-4 shadow-sm"
        >
          <p className="text-xs font-medium text-muted-foreground">{c.label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{c.value}</p>
        </div>
      ))}
    </div>
  );
}
