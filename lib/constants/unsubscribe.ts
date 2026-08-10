/**
 * Unsubscribe HMAC helpers — Phase 11 (ALRT-05/06).
 * Mirrors the Edge Function logic (Deno crypto.subtle) but for Node (Next.js).
 * Token = base64url( subscriptionId + "." + hmac ), hmac = HMAC-SHA256(secret, userId:subscriptionId)
 */
import { createHmac, timingSafeEqual } from "node:crypto"

const SECRET = process.env.UNSUBSCRIBE_HMAC_SECRET ?? process.env.CRON_SECRET ?? "dev-only-secret-change-me"

function base64UrlEncode(buf: Buffer | string): string {
  const b = typeof buf === "string" ? Buffer.from(buf) : buf
  return b.toString("base64").replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")
}

function base64UrlDecode(s: string): string {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4))
  return Buffer.from(s.replaceAll("-", "+").replaceAll("_", "/") + pad, "base64").toString("utf-8")
}

export function signUnsubscribeToken(userId: string, subscriptionId: string): string {
  const hmac = createHmac("sha256", SECRET).update(`${userId}:${subscriptionId}`).digest()
  const b64 = base64UrlEncode(hmac)
  const payload = `${subscriptionId}.${b64}`
  return base64UrlEncode(payload)
}

export function verifyUnsubscribeToken(token: string): { subscriptionId: string; hmac: string } | null {
  try {
    const payload = base64UrlDecode(token)
    const dot = payload.lastIndexOf(".")
    if (dot === -1) return null
    const subscriptionId = payload.slice(0, dot)
    const hmac = payload.slice(dot + 1)
    if (!subscriptionId || !hmac) return null
    return { subscriptionId, hmac }
  } catch {
    return null
  }
}

export function verifyUnsubscribeHmac(userId: string, subscriptionId: string, hmacB64: string): boolean {
  const expected = createHmac("sha256", SECRET).update(`${userId}:${subscriptionId}`).digest()
  const expectedB64 = base64UrlEncode(expected)
  // timingSafeEqual requires same length buffers
  const a = Buffer.from(expectedB64)
  const b = Buffer.from(hmacB64)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
