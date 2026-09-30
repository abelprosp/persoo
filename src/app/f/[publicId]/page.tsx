import { createAdminClient } from "@/lib/supabase/admin";
import { asIntakeFields } from "@/lib/lead-intake";
import { PublicLeadForm } from "./public-lead-form";

export default async function PublicFormPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const admin = createAdminClient();
  const { data: form } = await admin
    .from("lead_forms")
    .select("name, fields, disabled_at")
    .eq("public_id", publicId)
    .maybeSingle();

  if (!form || form.disabled_at) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md items-center px-4">
        <p className="text-sm text-muted-foreground">
          Este formulário não está disponível.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-10">
      <PublicLeadForm
        publicId={publicId}
        name={form.name}
        fields={asIntakeFields(form.fields)}
      />
    </main>
  );
}
