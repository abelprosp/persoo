import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/auth/session";
import { adminQuery } from "@/lib/db/pool";
import { credentialsSchema, readJson, rateLimit, requestAddress } from "@/lib/security";
import { NextResponse } from "next/server";
let dummyHash: Promise<string> | undefined;
export async function POST(request: Request) {
  try {
    if (!await rateLimit(`login-ip:${requestAddress(request)}`, 60, 900)) return NextResponse.json({ error: "Muitas tentativas. Aguarde 15 minutos." }, { status: 429, headers: { "Retry-After": "900" } });
    const parsed = credentialsSchema.safeParse(await readJson(request, 4096).catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Informe e-mail e senha válidos." }, { status: 400 });
    const { email, password } = parsed.data;
    if (!await rateLimit(`login-account:${email}`, 10, 900)) return NextResponse.json({ error: "Muitas tentativas. Aguarde 15 minutos." }, { status: 429, headers: { "Retry-After": "900" } });
    const found = await adminQuery("SELECT id,email,encrypted_password FROM auth.users WHERE email=$1", [email]);
    const user = found.rows[0];
    dummyHash ??= hashPassword(crypto.randomUUID());
    const valid = await verifyPassword(password, user?.encrypted_password ?? await dummyHash);
    if (!user || !valid) return NextResponse.json({ error: "E-mail ou senha incorretos." }, { status: 401 });
    const token = await signSession(user);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    console.error("auth.login", error);
    return NextResponse.json({ error: "Não foi possível entrar. Tente novamente." }, { status: 503 });
  }
}
