/**
 * Zod v3 schemas for admin Server Action inputs (Phase 3).
 *
 * Used for both client-side RHF validation (via `zodResolver` from
 * `@hookform/resolvers` v3.x) and server-side re-validation inside
 * `approveBipAction` / `rejectBipAction`.
 *
 * Source: 03-CONTEXT.md D-04 modal constraints.
 */
import { z } from 'zod' // Zod v3 — see CLAUDE.md (locked stack)

export const ApproveBipSchema = z.object({
  bipId: z.string().uuid({ message: 'Invalid BIP id.' }),
  note: z.string().max(500, 'Note must be at most 500 characters.').optional(),
})
export type ApproveBipInput = z.infer<typeof ApproveBipSchema>

export const RejectBipSchema = z.object({
  bipId: z.string().uuid({ message: 'Invalid BIP id.' }),
  reason: z
    .string()
    .min(10, 'Reason must be at least 10 characters.')
    .max(1000, 'Reason must be at most 1000 characters.'),
})
export type RejectBipInput = z.infer<typeof RejectBipSchema>
