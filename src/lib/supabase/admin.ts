import { createDbClient } from "@/lib/db/client";

/** Cliente com permissões de administrador da base — webhooks e tarefas internas. */
export function createAdminClient() {
  if (!process.env.DATABASE_URL_ADMIN && !process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL_ADMIN em falta.");
  }
  return createDbClient({ user: null, mode: "admin" });
}
