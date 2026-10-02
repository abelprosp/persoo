import { Pool, types, type QueryResult } from "pg";

types.setTypeParser(1700, (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : value;
});

const globalForPg = globalThis as unknown as {
  persooAppPool?: Pool;
  persooAdminPool?: Pool;
};

function appUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL em falta.");
  return url;
}

function adminUrl(): string {
  const url = (process.env.DATABASE_URL_ADMIN || process.env.DATABASE_URL)?.trim();
  if (!url) throw new Error("DATABASE_URL_ADMIN em falta.");
  return url;
}

export function getAppPool(): Pool {
  if (!globalForPg.persooAppPool) {
    globalForPg.persooAppPool = new Pool({ connectionString: appUrl() });
  }
  return globalForPg.persooAppPool;
}

export function getAdminPool(): Pool {
  if (!globalForPg.persooAdminPool) {
    globalForPg.persooAdminPool = new Pool({ connectionString: adminUrl() });
  }
  return globalForPg.persooAdminPool;
}

export async function adminQuery(
  text: string,
  params: unknown[] = []
): Promise<QueryResult> {
  return getAdminPool().query(text, params);
}

export type QueryRunner = (
  text: string,
  params?: unknown[]
) => Promise<QueryResult>;

/** Consultas da aplicação: assume o papel `authenticated` e define auth.uid(). */
export function userRunner(userId: string | null): QueryRunner {
  return async (text, params = []) => {
    const client = await getAppPool().connect();
    let committed = false;
    try {
      await client.query("BEGIN");
      if (userId) {
        await client.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [
          userId,
        ]);
        await client.query("SET LOCAL ROLE authenticated");
      }
      const result = await client.query(text, params);
      await client.query("COMMIT");
      committed = true;
      return result;
    } catch (error) {
      if (!committed) {
        try {
          await client.query("ROLLBACK");
        } catch {
          /* ligação já fechada */
        }
      }
      throw error;
    } finally {
      client.release();
    }
  };
}

export const adminRunner: QueryRunner = async (text, params = []) => {
  return adminQuery(text, params);
};
