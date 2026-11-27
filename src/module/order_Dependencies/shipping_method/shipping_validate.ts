import { z } from "zod";

const boolFromString = z.enum(["true", "false"]).transform((v) => v === "true");

const shippingIdParams = z.object({ shippingId: z.string().uuid() });

export const listShippingSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().min(1).optional(),
    isActive: boolFromString.optional(),
    sort: z.enum(["newest", "oldest", "price_asc", "price_desc"]).default("newest"),
  }),
};

export const createShippingSchema = {
  body: z.object({
    title: z.string().trim().min(2).max(100),
    description: z.string().trim().min(1).max(500).optional(),
    price: z.number().int().min(0),
    isActive: z.boolean().default(true),
  }),
};

export const updateShippingSchema = {
  params: shippingIdParams,
  body: z
    .object({
      title: z.string().trim().min(2).max(100),
      description: z.string().trim().min(1).max(500).nullable(),
      price: z.number().int().min(0),
      isActive: z.boolean(),
    })
    .partial()
    .refine((v) => Object.keys(v).length > 0, "at least one field is required"),
};

export const shippingIdSchema = { params: shippingIdParams };

export type ListShippingQuery = z.infer<typeof listShippingSchema.query>;
export type CreateShippingBody = z.infer<typeof createShippingSchema.body>;
export type UpdateShippingBody = z.infer<typeof updateShippingSchema.body>;
