"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setProfileSuperAdmin } from "@/app/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Profile = {
  id: string;
  full_name: string | null;
  is_super_admin: boolean;
  created_at: string;
};

export function UsersAdmin({ profiles }: { profiles: Profile[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(id: string, next: boolean) {
    setMsg(null);
    startTransition(async () => {
      const r = await setProfileSuperAdmin(id, next);
      if ("error" in r) setMsg(r.error);
      else {
        setMsg("Atualizado.");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      {msg && (
        <p className="text-sm text-muted-foreground" role="status">
          {msg}
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        Também pode definir super admins pela variável de ambiente{" "}
        <code className="rounded bg-muted px-1">SUPER_ADMIN_EMAILS</code> (emails
        separados por vírgula).
      </p>
      <div className="overflow-hidden rounded-xl border border-border/80 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Nome</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Super admin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">
                  {p.full_name ?? "—"}
                </TableCell>
                <TableCell className="max-w-[200px] truncate font-mono text-xs text-muted-foreground">
                  {p.id}
                </TableCell>
                <TableCell>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={p.is_super_admin}
                      disabled={pending}
                      onCheckedChange={(c) => toggle(p.id, c === true)}
                    />
                    Acesso admin
                  </label>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
