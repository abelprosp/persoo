"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  inviteWorkspaceMember,
  removeWorkspaceMember,
  updateWorkspaceMemberRole,
  cancelWorkspaceInvitation,
} from "./actions";

type MemberRow = {
  userId: string;
  role: "owner" | "admin" | "member";
  name: string;
  isSelf: boolean;
};

type InvitationRow = {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  created_at: string;
  token: string;
};

const ROLE_LABEL: Record<string, string> = {
  owner: "Dono",
  admin: "Administrador",
  member: "Membro",
};

export function TeamPanel({
  workspaceId,
  workspaceName,
  canManage,
  members,
  invitations,
}: {
  workspaceId: string;
  workspaceName: string;
  canManage: boolean;
  members: MemberRow[];
  invitations: InvitationRow[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [msg, setMsg] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function joinUrl(token: string) {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/join?token=${encodeURIComponent(token)}`;
  }

  function submitInvite(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setInviteLink(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setMsg("Indique o e-mail.");
      return;
    }
    startTransition(async () => {
      const r = await inviteWorkspaceMember(workspaceId, trimmed, inviteRole);
      if ("error" in r) {
        setMsg(r.error);
        return;
      }
      setEmail("");
      if (r.kind === "invited" && r.token) {
        setInviteLink(joinUrl(r.token));
        setMsg(
          "Convite criado. Partilhe o link abaixo com a pessoa (tem de criar conta ou entrar com o mesmo e-mail)."
        );
      } else if (r.kind === "added") {
        setMsg("Utilizador adicionado ao espaço — já tinha conta.");
      } else if (r.kind === "already_member") {
        setMsg("Este utilizador já é membro deste espaço.");
      } else if (r.kind === "already_invited") {
        setMsg("Já existe um convite pendente para este e-mail.");
      } else {
        setMsg("Operação concluída.");
      }
      router.refresh();
    });
  }

  function copy(text: string) {
    void navigator.clipboard.writeText(text);
    setMsg("Link copiado para a área de transferência.");
  }

  return (
    <div className="space-y-8">
      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Membros — {workspaceName}</CardTitle>
          <CardDescription>
            Quem tem acesso a leads, negócios e restantes dados deste espaço de
            trabalho.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Nome</TableHead>
                <TableHead>Função</TableHead>
                {canManage ? <TableHead className="w-[200px]" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.userId}>
                  <TableCell className="font-medium">
                    {m.name}
                    {m.isSelf ? (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        (eu)
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {canManage && m.role !== "owner" && !m.isSelf ? (
                      <Select
                        value={m.role}
                        disabled={pending}
                        onValueChange={(v) => {
                          const next = v as "admin" | "member";
                          startTransition(async () => {
                            const r = await updateWorkspaceMemberRole(
                              workspaceId,
                              m.userId,
                              next
                            );
                            setMsg("error" in r ? r.error : "Função atualizada.");
                            router.refresh();
                          });
                        }}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="member">Membro</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-muted-foreground">
                        {ROLE_LABEL[m.role] ?? m.role}
                      </span>
                    )}
                  </TableCell>
                  {canManage ? (
                    <TableCell className="text-right">
                      {m.role !== "owner" && !m.isSelf ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={pending}
                          onClick={() => {
                            if (
                              !window.confirm(
                                "Remover este membro do espaço de trabalho?"
                              )
                            ) {
                              return;
                            }
                            startTransition(async () => {
                              const r = await removeWorkspaceMember(
                                workspaceId,
                                m.userId
                              );
                              setMsg("error" in r ? r.error : "Membro removido.");
                              router.refresh();
                            });
                          }}
                        >
                          Remover
                        </Button>
                      ) : null}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {canManage ? (
        <>
          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Convidar por e-mail</CardTitle>
              <CardDescription>
                Se a pessoa já tiver conta, é adicionada de imediato. Caso
                contrário, gere um link de convite (válido 14 dias).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitInvite} className="space-y-4 max-w-lg">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">E-mail</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="colega@empresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Função</Label>
                  <Select
                    value={inviteRole}
                    onValueChange={(v) =>
                      setInviteRole(v as "admin" | "member")
                    }
                  >
                    <SelectTrigger className="w-[220px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">
                        Membro — acede aos dados do CRM
                      </SelectItem>
                      <SelectItem value="admin">
                        Administrador — gere também a equipa
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={pending}>
                  {pending ? "A enviar…" : "Convidar"}
                </Button>
              </form>
              {inviteLink ? (
                <div className="mt-4 rounded-lg border border-violet-200 bg-violet-50/80 p-4 text-sm">
                  <p className="font-medium text-violet-950">Link do convite</p>
                  <p className="mt-1 break-all font-mono text-xs text-violet-900/90">
                    {inviteLink}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => copy(inviteLink)}
                  >
                    Copiar link
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Convites pendentes</CardTitle>
              <CardDescription>
                E-mails que ainda não aceitaram ou não criaram conta.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invitations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum convite pendente.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead>E-mail</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead>Expira</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell>{inv.email}</TableCell>
                        <TableCell>
                          {ROLE_LABEL[inv.role] ?? inv.role}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(inv.expires_at).toLocaleDateString("pt-PT")}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => copy(joinUrl(inv.token))}
                          >
                            Copiar link
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            disabled={pending}
                            onClick={() => {
                              startTransition(async () => {
                                const r = await cancelWorkspaceInvitation(inv.id);
                                setMsg(
                                  "error" in r ? r.error : "Convite anulado."
                                );
                                router.refresh();
                              });
                            }}
                          >
                            Anular
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Apenas o dono ou um administrador pode convidar ou remover membros.
        </p>
      )}

      {msg ? (
        <p className="text-sm text-muted-foreground" role="status">
          {msg}
        </p>
      ) : null}
    </div>
  );
}
