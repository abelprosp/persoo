import { verifyPassword } from "@/lib/auth/password";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/auth/session";
import { adminQuery } from "@/lib/db/pool";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
  } | null;
  const email = body?.email?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Indique e-mail e palavra-passe." },
      { status: 400 }
    );
  }

  try {
    const found = await adminQuery(
      `SELECT id, email, encrypted_password
         FROM auth.users
        WHERE email = $1`,
      [email]
    );
    const row = found.rows[0] as
      | { id: string; email: string; encrypted_password: string }
      | undefined;
    if (!row || !(await verifyPassword(password, row.encrypted_password))) {
      return NextResponse.json(
        { error: "E-mail ou palavra-passe incorretos." },
        { status: 401 }
      );
    }
    const token = await signSession({ id: row.id, email: row.email });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao entrar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
