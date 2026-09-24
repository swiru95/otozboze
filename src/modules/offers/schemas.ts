import { z } from "zod";

import { GrainType } from "@/generated/prisma/enums";

export const createOfferSchema = z.object({
  grainType: z.enum(GrainType),
  harvestYear: z.coerce.number().int().min(2000).max(2100),
  tonnage: z.coerce.number().positive().max(100000),
  pricePerTonne: z.coerce.number().positive().max(100000),
  postalCode: z
    .string()
    .regex(/^\d{2}-\d{3}$/, "Kod pocztowy w formacie 00-000"),
  city: z.string().min(2, "Podaj miejscowość"),
  title: z.string().max(120).optional(),
  /// Optional paid promotion. An unticked checkbox omits the key entirely; a
  /// ticked one submits "on".
  ///
  /// Matched against an explicit allow-list rather than coerced: `Boolean()`
  /// is true for every non-empty string, so a coercing schema would read a
  /// literal "false" as a yes and bill the farmer for a highlight they never
  /// asked for.
  isHighlighted: z
    .string()
    .optional()
    .transform((value) => value === "on" || value === "true"),
});

export type CreateOfferInput = z.infer<typeof createOfferSchema>;
