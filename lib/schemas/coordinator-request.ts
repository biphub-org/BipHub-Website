import { z } from 'zod' // Zod v3 — see CLAUDE.md (locked stack)
import { profileSchema } from './profile'

/**
 * Coordinator access-request payload.
 *
 * The request carries the coordinator details (full name, university,
 * country, Erasmus code) PLUS the single `email` that is both the
 * reachable address during review and the login/contact email once
 * approved. No password: approved coordinators set it via the Supabase
 * invite link. Stored in `coordinator_requests` (migration 00054),
 * never in `profiles`.
 */
export const coordinatorRequestSchema = profileSchema
  .omit({ contact_email: true })
  .extend({
    email: z.string().trim().toLowerCase().email('Please enter a valid email address.'),
  })
export type CoordinatorRequestValues = z.infer<typeof coordinatorRequestSchema>
