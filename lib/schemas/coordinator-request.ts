import { z } from 'zod' // Zod v3 — see CLAUDE.md (locked stack)
import { profileSchema } from './profile'

/**
 * Coordinator access-request payload.
 *
 * The request carries everything the onboarding page collects (full name,
 * contact email, university, country, Erasmus code) PLUS the login `email`
 * the account will use once approved. No password: approved coordinators set
 * it via the Supabase invite link. Stored in `coordinator_requests`
 * (migration 00054), never in `profiles`.
 */
export const coordinatorRequestSchema = profileSchema.extend({
  email: z.string().trim().toLowerCase().email('Please enter a valid email address.'),
})
export type CoordinatorRequestValues = z.infer<typeof coordinatorRequestSchema>
