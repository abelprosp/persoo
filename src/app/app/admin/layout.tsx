import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/admin";
import { redirect } from "next/navigation";
import { cn } from "@/lib/utils";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await isSuperAdmin(supabase, user))) {
    redirect("/app/dashboard");
  }

  const links = [
    { href: "/app/admin", label: "Resumo" },
    { href: "/app/admin/plans", label: "Planos" },
    { href: "/app/admin/workspaces", label: "Espaços & assinaturas" },
    { href: "/app/admin/users", label: "Utilizadores" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Super admin
        </p>
        <h1 className="text-xl font-semibold tracking-tight">
          Administração da plataforma
        </h1>
        <nav className="mt-3 flex flex-wrap gap-2 border-b border-border/80 pb-3">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
