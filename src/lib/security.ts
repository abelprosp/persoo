import { createHash } from "node:crypto";
import { adminQuery } from "@/lib/db/pool";
import { z } from "zod";

export const uuid = z.string().uuid();
export const passwordSchema = z.string().min(12, "Use pelo menos 12 caracteres.").max(128);
export const credentialsSchema = z.object({ email: z.email().max(254).transform(v => v.toLowerCase()), password: z.string().min(1).max(128) });

/** Distributed, atomic limiter. Expired buckets are periodically pruned by maintenance. */
export async function rateLimit(key: string, limit: number, seconds: number) {
  const bucket = Math.floor(Date.now() / (seconds * 1000));
  const hash = createHash("sha256").update(key).digest("hex");
  const result = await adminQuery(`INSERT INTO app_rate_limits (key, bucket, hits, expires_at)
    VALUES ($1,$2,1,now()+make_interval(secs=>$3))
    ON CONFLICT (key,bucket) DO UPDATE SET hits=app_rate_limits.hits+1
    RETURNING hits`, [hash, bucket, seconds]);
  return Number(result.rows[0].hits) <= limit;
}

export function requestAddress(request: Request) {
  // Only trust this header when a trusted reverse proxy overwrites it.
  return process.env.TRUST_PROXY === "true"
    ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    : "local";
}

export async function readJson(request: Request, maxBytes = 65536): Promise<unknown> {
  if (!request.headers.get("content-type")?.includes("application/json")) throw new Error("Envie JSON.");
  return JSON.parse((await readBody(request,maxBytes)).toString("utf8"));
}

export async function readBody(request: Request,maxBytes=65536):Promise<Buffer> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Pedido vazio.");
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new Error("Pedido muito grande."); }
      parts.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(parts);
}

export function appOrigin() {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (!configured && process.env.NODE_ENV === "production") throw new Error("Configure NEXT_PUBLIC_APP_URL.");
  return new URL(configured || "http://localhost:3000").origin;
}
