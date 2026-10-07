import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OnboardingForm } from "./onboarding-form";
import { getWorkspaceContext } from "@/lib/workspace";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/onboarding");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, company_name, onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.onboarding_completed) {
    redirect("/app/dashboard");
  }

  const { active } = await getWorkspaceContext(supabase, user.id);
  const { data: workspace } = active ? await supabase.from("workspaces").select("owner_id").eq("id", active.id).maybeSingle() : { data: null };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-4 py-10">
      <OnboardingForm
        initialFullName={profile?.full_name ?? ""}
        initialCompanyName={profile?.company_name ?? (workspace?.owner_id !== user.id ? active?.name ?? "" : "")}
        canPersonalize={workspace?.owner_id === user.id}
      />
    </div>
  );
}
