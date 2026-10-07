import { hashPassword } from "@/lib/auth/password";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/auth/session";
import { transaction } from "@/lib/db/pool";
import { credentialsSchema, passwordSchema, readJson, rateLimit, requestAddress } from "@/lib/security";
import { z } from "zod";
import { NextResponse } from "next/server";
const schema = credentialsSchema.extend({ password: passwordSchema, fullName: z.string().trim().min(2).max(120) });
export async function POST(request: Request) {
  try {
    if (!await rateLimit(`signup:${requestAddress(request)}`, 5, 3600)) return NextResponse.json({ error: "Aguarde antes de criar outra conta." }, { status: 429 });
    const parsed = schema.safeParse(await readJson(request, 4096).catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Informe nome, e-mail válido e senha de 12 a 128 caracteres." }, { status: 400 });
    const { email, password, fullName } = parsed.data;
    const hash = await hashPassword(password);
    const token = await transaction(null, async run => {
      const created = await run("INSERT INTO auth.users(email,encrypted_password,raw_user_meta_data) VALUES($1,$2,$3::jsonb) RETURNING id,email", [email, hash, JSON.stringify({ full_name: fullName })]);
      return signSession(created.rows[0], run);
    });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    console.error("auth.signup", error);
    return NextResponse.json({ error: "Não foi possível criar a conta. Se já possui cadastro, entre ou recupere sua senha." }, { status: 400 });
  }
}
