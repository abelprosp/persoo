import { SettingsSubNav } from "@/components/crm/settings-sub-nav";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Definições</h1>
        <p className="text-sm text-muted-foreground">
          Perfil, faturação do espaço ativo, equipa e personalização por IA.
        </p>
        <SettingsSubNav className="mt-4" />
      </header>
      {children}
    </div>
  );
}
