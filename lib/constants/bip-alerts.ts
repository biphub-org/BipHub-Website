/**
 * BIP alert constants — Phase 11 (ALRT-08/09).
 *
 * Single source for frequency enum, cap, and the explicit consent text that
 * is stored on every bip_subscriptions row (ALRT-08). Mirrors the DB CHECK
 * on bip_subscriptions.frequency.
 */

export const ALERT_FREQUENCIES = ['weekly', 'daily'] as const
export type AlertFrequency = (typeof ALERT_FREQUENCIES)[number]

export const ALERT_FREQUENCY_LABEL: Record<AlertFrequency, string> = {
  weekly: 'Weekly',
  daily: 'Daily',
}

export const ALERT_SUBSCRIPTION_CAP = 5

/**
 * Explicit consent text captured at subscription creation (ALRT-08).
 * Stored verbatim in bip_subscriptions.consent_text so the dashboard and
 * any audit can show what the student agreed to.
 */
export const ALERT_CONSENT_TEXT =
  'I agree to receive email alerts about newly approved BIPs matching my subscription (field of study and/or country) at the frequency I selected, and I can unsubscribe at any time via the link in the email or from my dashboard.'

/**
 * Unsubscribe HMAC helper — Node `crypto` (no new dep).
 * Token format: base64url( `${subscriptionId}.${hmac}` ) where hmac = HMAC-SHA256(secret, `${userId}:${subscriptionId}`).
 * Verification uses timingSafeEqual (see lib/constants/unsubscribe.ts for the full impl used in the Route Handler).
 */
export const UNSUBSCRIBE_HMAC_ALGO = 'sha256' as const
