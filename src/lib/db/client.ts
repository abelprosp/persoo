import { hashPassword } from "@/lib/auth/password";
import { adminQuery, adminRunner, userRunner, type QueryRunner } from "@/lib/db/pool";
import { passwordSchema } from "@/lib/security";
import { QueryBuilder } from "@/lib/db/query";
import type { AppUser, DbClient, DbResult } from "@/lib/db/types";

const IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export function createDbClient(options: {
  user: AppUser | null;
  mode: "user" | "admin";
  run?: QueryRunner;
}): DbClient {
  const run =
    options.run ?? (options.mode === "admin" ? adminRunner : userRunner(options.user?.id ?? null));

  return {
    from(table: string) {
      return new QueryBuilder(table, run);
    },
    async rpc(fn: string, args: Record<string, unknown> = {}): Promise<DbResult> {
      if (!IDENT.test(fn)) {
        return {
          data: null,
          error: { message: "Função inválida", details: null },
          count: null,
        };
      }
      const values = Object.values(args);
      const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");
      try {
        const result = await run(
          `SELECT public."${fn}"(${placeholders}) AS result`,
          values
        );
        return { data: result.rows[0]?.result ?? null, error: null, count: null };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erro na função";
        const code =
          error && typeof error === "object" && "code" in error
            ? String((error as { code?: string }).code ?? "")
            : undefined;
        return {
          data: null,
          error: { message, code, details: null },
          count: null,
        };
      }
    },
    auth: {
      async getUser() {
        return { data: { user: options.user }, error: null };
      },
      async updateUser(attrs) {
        if (!options.user) {
          return {
            data: { user: null },
            error: { message: "Não autenticado.", details: null },
          };
        }
        if (!attrs.password) {
          return { data: { user: options.user }, error: null };
        }
        if (!passwordSchema.safeParse(attrs.password).success) {
          return {
            data: { user: null },
            error: {
              message: "Use uma senha entre 12 e 128 caracteres.",
              details: null,
            },
          };
        }
        try {
          const hash = await hashPassword(attrs.password);
          await adminQuery(
            `UPDATE auth.users SET encrypted_password = $1, session_version=session_version+1 WHERE id = $2`,
            [hash, options.user.id]
          );
          return { data: { user: options.user }, error: null };
        } catch (error) {
          const message = error instanceof Error ? error.message : "Falha ao atualizar";
          return {
            data: { user: null },
            error: { message, details: null },
          };
        }
      },
      async exchangeCodeForSession() {
        return {
          error: {
            message: "Confirmação por código não é usada com PostgreSQL local.",
            details: null,
          },
        };
      },
    },
  };
}
