"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CustomFieldDef } from "@/lib/ai-schema";
import {
  ContactFormDialog,
  type ContactFormFieldLabels,
  type ContactRow,
} from "@/components/crm/contact-form-dialog";
import { setRecordActive } from "@/app/app/records/actions";

type Props = {
  contact: ContactRow;
  organizations: { id: string; name: string }[];
  customFields: CustomFieldDef[];
  fieldLabels: ContactFormFieldLabels;
};

export function ContactRowActions({
  contact,
  organizations,
  customFields,
  fieldLabels,
}: Props) {
  const router = useRouter();
  const [openEdit, setOpenEdit] = useState(false);
  const [pending, setPending] = useState(false);

  const isActive = contact.active !== false;

  async function onToggle() {
    const ok = window.confirm(
      isActive ? "Desativar este contacto?" : "Reativar este contacto?"
    );
    if (!ok) return;
    setPending(true);
    const r = await setRecordActive("contacts", contact.id, !isActive);
    setPending(false);
    if ("error" in r) {
      window.alert(r.error);
      return;
    }
    router.refresh();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex size-8 items-center justify-center rounded-md hover:bg-muted"
          aria-label="Ações do contacto"
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setOpenEdit(true)}>
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => void onToggle()}
            disabled={pending}
          >
            {isActive ? "Desativar" : "Reativar"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ContactFormDialog
        organizations={organizations}
        customFields={customFields}
        fieldLabels={fieldLabels}
        contact={contact}
        open={openEdit}
        onOpenChange={setOpenEdit}
        showTrigger={false}
      />
    </>
  );
}
