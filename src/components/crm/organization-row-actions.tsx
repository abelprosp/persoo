"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CustomFieldDef } from "@/lib/ai-schema";
import { readRowCustomData } from "@/lib/ai-schema";
import { updateOrganization } from "@/app/app/organizations/actions";
import { setRecordActive } from "@/app/app/records/actions";

export type OrganizationFormLabels = {
  name: string;
  website: string;
  industry: string;
  annual_revenue: string;
  logo_url: string;
};

type OrgRow = {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  annual_revenue: number | null;
  logo_url: string | null;
  custom_data?: unknown;
  active?: boolean;
};

export function OrganizationRowActions({
  org,
  customFields,
  fieldLabels,
}: {
  org: OrgRow;
  customFields: CustomFieldDef[];
  fieldLabels: OrganizationFormLabels;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const custom = readRowCustomData(org);
  const isActive = org.active !== false;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await updateOrganization(new FormData(event.currentTarget));
    setPending(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  async function onToggle() {
    setPending(true);
    const result = await setRecordActive("organizations", org.id, !isActive);
    setPending(false);
    if ("error" in result) {
      window.alert(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex size-8 items-center justify-center rounded-md hover:bg-muted"
          aria-label="Ações da organização"
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setOpen(true)}>Editar</DropdownMenuItem>
          <DropdownMenuItem onClick={() => void onToggle()} disabled={pending}>
            {isActive ? "Desativar" : "Reativar"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={onSubmit}>
            <DialogHeader>
              <DialogTitle>Editar organização</DialogTitle>
            </DialogHeader>
            <div className="grid max-h-[min(70vh,560px)] gap-3 overflow-y-auto py-4">
              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
              <input type="hidden" name="id" value={org.id} />
              <div className="space-y-2">
                <Label htmlFor={`org-name-${org.id}`}>{fieldLabels.name} *</Label>
                <Input id={`org-name-${org.id}`} name="name" required defaultValue={org.name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`org-website-${org.id}`}>{fieldLabels.website}</Label>
                <Input id={`org-website-${org.id}`} name="website" defaultValue={org.website ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`org-industry-${org.id}`}>{fieldLabels.industry}</Label>
                <Input id={`org-industry-${org.id}`} name="industry" defaultValue={org.industry ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`org-revenue-${org.id}`}>{fieldLabels.annual_revenue}</Label>
                <Input
                  id={`org-revenue-${org.id}`}
                  name="annual_revenue"
                  defaultValue={org.annual_revenue ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`org-logo-${org.id}`}>{fieldLabels.logo_url}</Label>
                <Input id={`org-logo-${org.id}`} name="logo_url" defaultValue={org.logo_url ?? ""} />
              </div>
              {customFields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={`org-cf-${org.id}-${field.key}`}>{field.label}</Label>
                  <Input
                    id={`org-cf-${org.id}-${field.key}`}
                    name={`custom_${field.key}`}
                    defaultValue={custom[field.key] == null ? "" : String(custom[field.key])}
                  />
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "A guardar..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
