import { z } from "zod";

const boolFromString = z.enum(["true", "false"]).transform((v) => v === "true");

const discountIdParams = z.object({ discountId: z.string().uuid() });

export const listDiscountSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().min(1).optional(),
    type: z.enum(["Percent", "Fixed"]).optional(),
    isActive: boolFromString.optional(),
    sort: z.enum(["newest", "oldest"]).default("newest"),
  }),
};

const discountFields = {
  code: z.string().trim().min(3).max(50),
  type: z.enum(["Percent", "Fixed"]),
  value: z.number().int().positive(),
  minOrderAmount: z.number().int().min(0),
  usageLimit: z.number().int().positive(),
  startAt: z.coerce.date(),
  expireAt: z.coerce.date(),
  isActive: z.boolean(),
};

export const createDiscountSchema = {
  body: z.object({
    ...discountFields,
    minOrderAmount: discountFields.minOrderAmount.optional(),
    usageLimit: discountFields.usageLimit.optional(),
    startAt: discountFields.startAt.optional(),
    expireAt: discountFields.expireAt.optional(),
    isActive: discountFields.isActive.default(true),
  }).superRefine((b, ctx) => {
    if (b.type === "Percent" && b.value > 100)
      ctx.addIssue({ code: "custom", path: ["value"], message: "percent cannot be greater than 100" });

    if (b.startAt && b.expireAt && b.expireAt <= b.startAt)
      ctx.addIssue({ code: "custom", path: ["expireAt"], message: "expireAt must be after startAt" });
  }),
};

export const updateDiscountSchema = {
  params: discountIdParams,
  body: z
    .object({
      ...discountFields,
      minOrderAmount: discountFields.minOrderAmount.nullable(),
      usageLimit: discountFields.usageLimit.nullable(),
      startAt: discountFields.startAt.nullable(),
      expireAt: discountFields.expireAt.nullable(),
    })
    .partial()
    .refine((v) => Object.keys(v).length > 0, "at least one field is required")
    .refine((v) => !v.startAt || !v.expireAt || v.expireAt > v.startAt, {
      message: "expireAt must be after startAt",
      path: ["expireAt"],
    }),
};

export const discountIdSchema = { params: discountIdParams };

export type ListDiscountQuery = z.infer<typeof listDiscountSchema.query>;
export type CreateDiscountBody = z.infer<typeof createDiscountSchema.body>;
export type UpdateDiscountBody = z.infer<typeof updateDiscountSchema.body>;
