"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  setRecordActive,
  type ActiveEntity,
} from "@/app/app/records/actions";

export function RecordActiveButton({
  entity,
  id,
  active,
  stopPropagation = false,
}: {
  entity: ActiveEntity;
  id: string;
  active?: boolean;
  stopPropagation?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const isActive = active !== false;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-xs"
      disabled={pending}
      onClick={async (event) => {
        if (stopPropagation) event.stopPropagation();
        setPending(true);
        const result = await setRecordActive(entity, id, !isActive);
        setPending(false);
        if ("error" in result) {
          window.alert(result.error);
          return;
        }
        router.refresh();
      }}
    >
      {pending ? "A guardar..." : isActive ? "Desativar" : "Reativar"}
    </Button>
  );
}
