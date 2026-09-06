"use server"

import { z } from "zod"
import { Resend } from "resend"

/**
 * Public contact-form submission (no auth — anyone can write to us).
 *
 * Validates with Zod v3, then emails the site inbox via Resend.
 * D-15-style dev fallback: when RESEND_API_KEY is unset, log and
 * still return ok so local dev never hard-fails.
 */

import { CONTACT_TOPICS, CONTACT_TOPIC_LABELS, type ContactTopic } from "@/lib/constants/contact"

// Re-exported so existing server-side callers keep working.
export { CONTACT_TOPICS, CONTACT_TOPIC_LABELS, type ContactTopic }

const contactSchema = z.object({
  name: z.string().trim().min(2, "Please tell us your name.").max(100),
  email: z.string().trim().email("Please enter a valid email address.").max(254),
  topic: z.enum(CONTACT_TOPICS),
  message: z
    .string()
    .trim()
    .min(20, "Please write at least a sentence or two (20+ characters).")
    .max(5000, "Please keep your message under 5000 characters."),
  // Honeypot — bots fill it, humans never see it.
  website: z.string().max(0, "Spam detected.").optional(),
})

export type ContactInput = z.infer<typeof contactSchema>
export type ContactField = "name" | "email" | "topic" | "message"
export type ContactResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Partial<Record<ContactField, string>> }

/** Simple per-IP throttle: 5 submissions / hour. In-memory is enough at our volume. */
const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
const rateLimitHits = new Map<string, number[]>()

function isRateLimited(key: string): boolean {
  const now = Date.now()
  const hits = (rateLimitHits.get(key) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
  if (hits.length >= RATE_LIMIT_MAX) {
    rateLimitHits.set(key, hits)
    return true
  }
  hits.push(now)
  rateLimitHits.set(key, hits)
  return false
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export async function submitContactAction(input: ContactInput): Promise<ContactResult> {
  const parsed = contactSchema.safeParse(input)
  if (!parsed.success) {
    const fieldErrors: Partial<Record<ContactField, string>> = {}
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as ContactField | undefined
      if (field && !fieldErrors[field]) fieldErrors[field] = issue.message
    }
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the form and try again.",
      fieldErrors,
    }
  }

  // Throttle after validation so bots hammering invalid payloads don't poison the bucket.
  // next/headers is async in Next 15 — dynamic import keeps this module importable in tests.
  let clientKey = "unknown"
  try {
    const { headers } = await import("next/headers")
    const h = await headers()
    clientKey =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip")?.trim() ||
      "unknown"
  } catch {
    clientKey = "unknown"
  }
  if (isRateLimited(`contact:${clientKey}`)) {
    return {
      ok: false,
      error: "You've sent a few messages recently — please wait a little while before trying again.",
    }
  }

  const { name, email, topic, message } = parsed.data

  const to =
    process.env.CONTACT_TO_EMAIL ||
    process.env.ADMIN_NOTIFICATION_EMAIL ||
    "biphub.org@gmail.com"
  const subject = `[BipHub contact · ${CONTACT_TOPIC_LABELS[topic]}] ${name}`
  const html = [
    `<p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>`,
    `<p><strong>Topic:</strong> ${escapeHtml(CONTACT_TOPIC_LABELS[topic])}</p>`,
    `<hr/>`,
    `<p>${escapeHtml(message).replace(/\n/g, "<br/>")}</p>`,
  ].join("")

  try {
    if (!process.env.RESEND_API_KEY) {
      console.log("[EMAIL DEV]", { to, subject, html: html.slice(0, 400) + (html.length > 400 ? "…" : "") })
      return { ok: true }
    }
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: "BipHub <noreply@biphub.eu>",
      to,
      replyTo: email,
      subject,
      html,
    })
    if (error) {
      console.error("[contact] Resend failed:", error.message)
      return { ok: false, error: "We couldn't send your message right now. Please email us directly at biphub.org@gmail.com." }
    }
    return { ok: true }
  } catch (e) {
    console.error("[contact] send failed:", e instanceof Error ? e.message : e)
    return { ok: false, error: "We couldn't send your message right now. Please email us directly at biphub.org@gmail.com." }
  }
}
