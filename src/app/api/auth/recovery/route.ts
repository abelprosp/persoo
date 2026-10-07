import { createHash, randomBytes } from "node:crypto";
import { adminQuery, transaction } from "@/lib/db/pool";
import { appOrigin, passwordSchema, rateLimit, readJson, requestAddress } from "@/lib/security";
import { hashPassword } from "@/lib/auth/password";
import { z } from "zod";
import { NextResponse } from "next/server";
const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("request"), email: z.email().max(254) }),
  z.object({ action: z.literal("reset"), token: z.string().regex(/^[a-f0-9]{64}$/), password: passwordSchema }),
]);
export async function POST(request: Request) {
  try {
    if (!await rateLimit(`recovery-ip:${requestAddress(request)}`, 10, 3600)) return NextResponse.json({ error: "Aguarde antes de tentar novamente." }, { status: 429 });
    const parsed = bodySchema.safeParse(await readJson(request, 4096).catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos. Use uma senha com 12 a 128 caracteres." }, { status: 400 });
    const data = parsed.data;
    if (data.action === "request") {
      if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) return NextResponse.json({ error: "Recuperação por e-mail indisponível. Entre em contato com o suporte." }, { status: 503 });
      const email = data.email.toLowerCase();
      if (await rateLimit(`recovery-email:${email}`, 3, 3600)) {
        const found = await adminQuery("SELECT id FROM auth.users WHERE email=$1", [email]);
        if (found.rows[0]) {
          const token = randomBytes(32).toString("hex");
          const hash = createHash("sha256").update(token).digest("hex");
          await adminQuery("INSERT INTO auth.password_resets(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '30 minutes')", [hash, found.rows[0].id]);
          const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" }, signal: AbortSignal.timeout(10000), body: JSON.stringify({ from: process.env.MAIL_FROM, to: email, subject: "Redefinir sua senha — persooCRM", text: `Abra o link para redefinir sua senha em até 30 minutos: ${appOrigin()}/recover?token=${token}\nSe não foi você, ignore este e-mail.` }) });
          if (!response.ok) { await adminQuery("DELETE FROM auth.password_resets WHERE token_hash=$1", [hash]); console.error("mail.recovery_failed", response.status); }
        }
      }
      return NextResponse.json({ ok: true, message: "Se houver uma conta com esse e-mail, você receberá as instruções." });
    }
    const hash = createHash("sha256").update(data.token).digest("hex");
    const password = await hashPassword(data.password);
    await transaction(null, async run => {
      const token = await run("UPDATE auth.password_resets SET used_at=now() WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now() RETURNING user_id", [hash]);
      if (!token.rows[0]) throw new Error("invalid_token");
      await run("UPDATE auth.users SET encrypted_password=$1,session_version=session_version+1 WHERE id=$2", [password, token.rows[0].user_id]);
      await run("UPDATE auth.password_resets SET used_at=now() WHERE user_id=$1 AND used_at IS NULL", [token.rows[0].user_id]);
      await run("DELETE FROM auth.sessions WHERE user_id=$1", [token.rows[0].user_id]);
    });
    return NextResponse.json({ ok: true, message: "Senha atualizada. Entre novamente." });
  } catch (error) {
    console.error("auth.recovery", error instanceof Error ? error.message : "failed");
    return NextResponse.json({ error: "Não foi possível concluir. Solicite um novo link e tente novamente." }, { status: 400 });
  }
}
