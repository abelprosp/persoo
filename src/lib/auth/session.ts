import type { AppUser } from "@/lib/db/types";
import { adminQuery } from "@/lib/db/pool";

export const SESSION_COOKIE = "persoo_session";
const SESSION_SECONDS = 60 * 60 * 24 * 14;

export function getAuthSecret(): string {
  const fromEnv = process.env.AUTH_SECRET?.trim();
  if (!fromEnv || fromEnv.length < 32 || fromEnv === "persoo-docker-dev-secret") {
    throw new Error("Configure AUTH_SECRET com pelo menos 32 caracteres aleatórios.");
  }
  return fromEnv;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production" || process.env.AUTH_COOKIE_SECURE === "true",
    path: "/",
    maxAge: SESSION_SECONDS,
  };
}

type SessionPayload = {
  sub: string;
  email: string;
  exp: number;
  sid: string;
  version: number;
};

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(input: string): Uint8Array {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function textToBase64Url(text: string): string {
  return bytesToBase64Url(new TextEncoder().encode(text));
}

async function sign(body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getAuthSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body)
  );
  return bytesToBase64Url(new Uint8Array(sig));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signSession(user: {
  id: string;
  email: string;
}): Promise<string> {
  getAuthSecret();
  const result = await adminQuery("SELECT session_version FROM auth.users WHERE id=$1", [user.id]);
  if (!result.rows[0]) throw new Error("Conta não encontrada.");
  const payload: SessionPayload = {
    sub: user.id,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
    sid: crypto.randomUUID(),
    version: result.rows[0].session_version,
  };
  const body = textToBase64Url(JSON.stringify(payload));
  const sig = await sign(body);
  await adminQuery("INSERT INTO auth.sessions(id,user_id,expires_at) VALUES($1,$2,to_timestamp($3))", [payload.sid, user.id, payload.exp]);
  return `${body}.${sig}`;
}

export async function verifySession(token: string): Promise<AppUser | null> {
  if (token.length > 4096) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!body || !sig) return null;
  const expected = await sign(body);
  if (!safeEqual(expected, sig)) return null;
  try {
    const json = new TextDecoder().decode(base64UrlToBytes(body));
    const payload = JSON.parse(json) as SessionPayload;
    if (!payload.sub || !payload.sid || !Number.isInteger(payload.version) || !Number.isFinite(payload.exp) || payload.exp < Date.now() / 1000) {
      return null;
    }
    const result = await adminQuery(`SELECT u.id,u.email FROM auth.users u JOIN auth.sessions s ON s.user_id=u.id
      WHERE u.id=$1 AND s.id=$2 AND u.session_version=$3 AND s.expires_at>now()`, [payload.sub, payload.sid, payload.version]);
    return result.rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function revokeSession(token: string) {
  const user = await verifySession(token);
  if (!user) return;
  const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(token.split(".")[0]))) as SessionPayload;
  await adminQuery("DELETE FROM auth.sessions WHERE id=$1 AND user_id=$2", [payload.sid, user.id]);
}
