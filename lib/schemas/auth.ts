import { z } from 'zod' // Zod v3 — see CLAUDE.md (locked stack)

/**
 * Auth Zod schemas — server-side enforcement of the same shape used by RHF on the client.
 *
 * NOTE: bcrypt's effective input cap is 72 bytes. Clamp `password` to `max(72)` so users see
 * the limit at validation time rather than getting a silently-truncated hash.
 */

// AUTH-03: sign-in payload.
export const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
})
export type LoginValues = z.infer<typeof loginSchema>

// AUTH-01: registration payload.
export const registerSchema = z
  .object({
    email: z.string().trim().email('Please enter a valid institutional email address.'),
    password: z.string().min(8, 'At least 8 characters.').max(72, 'Maximum 72 characters.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })
export type RegisterValues = z.infer<typeof registerSchema>

// AUTH-05a: request a password-reset email.
export const passwordResetSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address.'),
})
export type PasswordResetValues = z.infer<typeof passwordResetSchema>

// AUTH-05b: update the password after the recovery callback.
export const passwordUpdateSchema = z
  .object({
    password: z.string().min(8, 'At least 8 characters.').max(72, 'Maximum 72 characters.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })
export type PasswordUpdateValues = z.infer<typeof passwordUpdateSchema>
