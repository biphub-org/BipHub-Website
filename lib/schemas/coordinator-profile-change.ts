import { z } from 'zod' // Zod v3 — see CLAUDE.md (locked stack)

/**
 * Coordinator data-change request payload (migration 00059).
 *
 * A coordinator proposes new values for the editable profile fields. The
 * row lands in `coordinator_profile_change_requests` for admin review;
 * NOTHING is written to `profiles` until an admin approves.
 *
 * Notes:
 *   - `contact_email` is the public contact shown on the coordinator's BIPs.
 *     It never changes the auth sign-in email — the settings UI must say so.
 *   - No `country`: coordinator country is derived from the joined
 *     `universities.country` (same convention as profileSchema).
 *   - No `role` / `status`: approval metadata is set server-side by the
 *     admin actions, never by the requester.
 */
export const coordinatorProfileChangeSchema = z.object({
  full_name: z.string().trim().min(2, 'Please enter your full name.').max(120),
  contact_email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address.'),
  university_id: z.string().uuid('Please select your university.'),
  erasmus_code: z.string().trim().min(3, 'Erasmus code is required.').max(20),
})
export type CoordinatorProfileChangeValues = z.infer<
  typeof coordinatorProfileChangeSchema
>

/** Admin verdict note — optional context emailed to the coordinator. */
export const profileChangeReviewSchema = z.object({
  requestId: z.string().uuid('Missing request.'),
  note: z.string().trim().max(500).optional(),
})
export type ProfileChangeReviewValues = z.infer<typeof profileChangeReviewSchema>
