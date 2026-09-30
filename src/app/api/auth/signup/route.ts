import { hashPassword } from "@/lib/auth/password";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/auth/session";
import { adminQuery } from "@/lib/db/pool";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
    fullName?: string;
  } | null;
  const email = body?.email?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";
  const fullName = body?.fullName?.trim() ?? "";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Indique um e-mail válido." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "A palavra-passe deve ter pelo menos 6 caracteres." },
      { status: 400 }
    );
  }

  try {
    const hash = await hashPassword(password);
    const created = await adminQuery(
      `INSERT INTO auth.users (email, encrypted_password, raw_user_meta_data)
       VALUES ($1, $2, $3::jsonb)
       RETURNING id, email`,
      [email, hash, JSON.stringify({ full_name: fullName })]
    );
    const user = created.rows[0] as { id: string; email: string };
    const token = await signSession({ id: user.id, email: user.email });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: string }).code ?? "")
        : "";
    if (code === "23505") {
      return NextResponse.json(
        { error: "Já existe uma conta com este e-mail." },
        { status: 409 }
      );
    }
    const message = error instanceof Error ? error.message : "Falha ao criar conta";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
