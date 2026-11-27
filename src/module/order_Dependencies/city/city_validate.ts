import { z } from "zod";

const boolFromString = z.enum(["true", "false"]).transform((v) => v === "true");

const cityIdParams = z.object({ cityId: z.string().uuid() });

export const listCitySchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    search: z.string().trim().min(1).optional(),
    provinceId: z.string().uuid().optional(),
    isActive: boolFromString.optional(),
    sort: z.enum(["name", "newest", "oldest"]).default("name"),
  }),
};

export const createCitySchema = {
  body: z.object({
    name: z.string().trim().min(2).max(100),
    provinceId: z.string().uuid(),
    isActive: z.boolean().default(true),
  }),
};

export const updateCitySchema = {
  params: cityIdParams,
  body: z
    .object({
      name: z.string().trim().min(2).max(100),
      provinceId: z.string().uuid(),
      isActive: z.boolean(),
    })
    .partial()
    .refine((v) => Object.keys(v).length > 0, "at least one field is required"),
};

export const cityIdSchema = { params: cityIdParams };

export type ListCityQuery = z.infer<typeof listCitySchema.query>;
export type CreateCityBody = z.infer<typeof createCitySchema.body>;
export type UpdateCityBody = z.infer<typeof updateCitySchema.body>;
