import { z } from "zod"
import { ALERT_FREQUENCIES } from "@/lib/constants/bip-alerts"

export const subscriptionSchema = z
  .object({
    field: z.string().trim().min(2).max(50).optional().or(z.literal("")),
    country: z
      .string()
      .trim()
      .length(2, "Country must be ISO2")
      .optional()
      .or(z.literal("")),
    frequency: z.enum(ALERT_FREQUENCIES).default("weekly"),
  })
  .refine((d) => Boolean(d.field) || Boolean(d.country), {
    message: "Choose at least a field of study or a country",
    path: ["field"],
  })

export type SubscriptionValues = z.infer<typeof subscriptionSchema>
