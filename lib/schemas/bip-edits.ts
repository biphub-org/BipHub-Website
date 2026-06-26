/**
 * Zod v3 schemas for Phase 8 bip-edits Server Action inputs (D-03, D-04, D-06a).
 *
 * Used for both client-side RHF validation (via `zodResolver`) and
 * server-side re-validation inside the edit Server Actions:
 *   - approveEditAction  (D-03: editId uuid guard)
 *   - rejectEditAction   (D-04: note min 10 / max 1000)
 *   - requestChangesEditAction (D-06a edit path: note min 10 / max 1000)
 *   - requestChangesBipAction  (D-06a new-submission path: note min 10 / max 1000)
 *
 * Zod v3 — see CLAUDE.md (locked stack; NOT v4, @hookform/resolvers v3.x compat).
 */
import { z } from 'zod' // Zod v3 — see CLAUDE.md (locked stack)

// ── Edit-path schemas (operate on bip_edits rows) ──────────────────────────

export const ApproveEditSchema = z.object({
  editId: z.string().uuid({ message: 'Invalid edit id.' }),
})
export type ApproveEditInput = z.infer<typeof ApproveEditSchema>

export const RejectEditSchema = z.object({
  editId: z.string().uuid({ message: 'Invalid edit id.' }),
  note: z
    .string()
    .min(10, 'Note must be at least 10 characters.')
    .max(1000, 'Note must be at most 1000 characters.'),
})
export type RejectEditInput = z.infer<typeof RejectEditSchema>

export const RequestChangesEditSchema = z.object({
  editId: z.string().uuid({ message: 'Invalid edit id.' }),
  note: z
    .string()
    .min(10, 'Note must be at least 10 characters.')
    .max(1000, 'Note must be at most 1000 characters.'),
})
export type RequestChangesEditInput = z.infer<typeof RequestChangesEditSchema>

// ── New-submission path schema (operates on bips rows — D-06a) ─────────────

export const RequestChangesBipSchema = z.object({
  bipId: z.string().uuid({ message: 'Invalid BIP id.' }),
  note: z
    .string()
    .min(10, 'Note must be at least 10 characters.')
    .max(1000, 'Note must be at most 1000 characters.'),
})
export type RequestChangesBipInput = z.infer<typeof RequestChangesBipSchema>
