import { z } from "zod";

export const submitReviewSchema = z
  .object({
    scope: z.enum(["TRADE", "TRANSPORT"]),
    purchaseId: z.string().optional(),
    transportJobId: z.string().optional(),
    subjectId: z.string().min(1),
    rating: z.coerce.number().int().min(1).max(5),
    comment: z.string().trim().max(1000).optional(),
  })
  .refine(
    (v) =>
      v.scope === "TRADE" ? Boolean(v.purchaseId) : Boolean(v.transportJobId),
    { message: "Opinia musi dotyczyć konkretnej transakcji" },
  );

export type SubmitReviewInput = z.infer<typeof submitReviewSchema>;
