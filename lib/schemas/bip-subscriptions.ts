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

// New preferences model — Countries first, Fields second, ISCED codes third. Single Apply.
export const alertPreferencesSchema = z
  .object({
    fields: z.array(z.string().trim().min(2).max(50)).default([]),
    countries: z
      .array(z.string().trim().length(2, "Country must be ISO2"))
      .default([]),
    iscedCodes: z
      .array(z.string().trim().length(4, "ISCED code must be 4 digits"))
      .default([]),
    frequency: z.enum(ALERT_FREQUENCIES).default("weekly"),
  })
  .refine((d) => d.fields.length > 0 || d.countries.length > 0 || d.iscedCodes.length > 0, {
    message: "Choose at least one field of study, country or ISCED code",
    path: ["fields"],
  })

export type AlertPreferencesValues = z.infer<typeof alertPreferencesSchema>
