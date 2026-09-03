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

export const CONTACT_TOPICS = ["general", "bip-listing", "support"] as const
export type ContactTopic = (typeof CONTACT_TOPICS)[number]

export const CONTACT_TOPIC_LABELS: Record<ContactTopic, string> = {
  general: "General question",
  "bip-listing": "BIP listing help",
  support: "Bug report / support",
}

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
export type ContactResult = { ok: true } | { ok: false; error: string }

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
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form and try again." }
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
