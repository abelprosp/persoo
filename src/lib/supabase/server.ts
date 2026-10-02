import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";
import { createDbClient } from "@/lib/db/client";

export async function createClient() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const user = token ? await verifySession(token) : null;
  return createDbClient({ user, mode: "user" });
}
