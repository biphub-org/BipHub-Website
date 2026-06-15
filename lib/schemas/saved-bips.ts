import { z } from 'zod' // Zod v3 — see CLAUDE.md (locked stack)

/** Validates the bipId argument to saveAction / unsaveAction (STUD-04). */
export const SaveBipSchema = z.object({
  bipId: z.string().uuid({ message: 'Invalid BIP id.' }),
})
export type SaveBipInput = z.infer<typeof SaveBipSchema>
