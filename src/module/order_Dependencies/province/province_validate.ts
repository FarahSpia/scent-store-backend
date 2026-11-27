import { z } from "zod";

const boolFromString = z.enum(["true", "false"]).transform((v) => v === "true");

const provinceIdParams = z.object({ provinceId: z.string().uuid() });

export const listProvinceSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    search: z.string().trim().min(1).optional(),
    isActive: boolFromString.optional(),
    sort: z.enum(["name", "newest", "oldest"]).default("name"),
  }),
};

export const createProvinceSchema = {
  body: z.object({
    name: z.string().trim().min(2).max(100),
    isActive: z.boolean().default(true),
  }),
};

export const updateProvinceSchema = {
  params: provinceIdParams,
  body: z
    .object({
      name: z.string().trim().min(2).max(100),
      isActive: z.boolean(),
    })
    .partial()
    .refine((v) => Object.keys(v).length > 0, "at least one field is required"),
};

export const provinceIdSchema = { params: provinceIdParams };

export type ListProvinceQuery = z.infer<typeof listProvinceSchema.query>;
export type CreateProvinceBody = z.infer<typeof createProvinceSchema.body>;
export type UpdateProvinceBody = z.infer<typeof updateProvinceSchema.body>;
