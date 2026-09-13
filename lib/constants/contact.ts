export const CONTACT_TOPICS = ["general", "bip-listing", "support"] as const
export type ContactTopic = (typeof CONTACT_TOPICS)[number]

export const CONTACT_TOPIC_LABELS: Record<ContactTopic, string> = {
  general: "General question",
  "bip-listing": "BIP listing help",
  support: "Bug report / support",
}

/**
 * Route a submission to the right inbox: technical support goes to support@,
 * everything else (general questions, BIP listing help) to contact@.
 * Per-topic env vars override; ADMIN_NOTIFICATION_EMAIL stays as the middle
 * fallback so a misconfigured topic inbox still reaches a human.
 *
 * Lives here (not in lib/actions/contact.ts) because Server Action modules
 * may only export async functions — a sync helper export breaks the build.
 */
export function resolveContactRecipient(topic: ContactTopic): string {
  if (topic === 'support') {
    return (
      process.env.SUPPORT_TO_EMAIL ||
      process.env.ADMIN_NOTIFICATION_EMAIL ||
      'support@biphub.org'
    )
  }
  return (
    process.env.CONTACT_TO_EMAIL ||
    process.env.ADMIN_NOTIFICATION_EMAIL ||
    'contact@biphub.org'
  )
}
