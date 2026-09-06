export const CONTACT_TOPICS = ["general", "bip-listing", "support"] as const
export type ContactTopic = (typeof CONTACT_TOPICS)[number]

export const CONTACT_TOPIC_LABELS: Record<ContactTopic, string> = {
  general: "General question",
  "bip-listing": "BIP listing help",
  support: "Bug report / support",
}
