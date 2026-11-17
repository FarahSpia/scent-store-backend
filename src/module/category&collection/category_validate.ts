import { z } from "zod";


export const productIdParams = z.object({ productId: z.string().min(1) });
export const categoryIdParams = z.object({ categoryId: z.coerce.number().min(1).positive() });
export const categoryParams = productIdParams.extend({categoryId: z.coerce.number().min(1).positive() });
export const slugParams = z.object({slug : z.string().min(1)});

const boolFromString = z
  .enum(["true", "false"])
  .transform((v) => v === "true");

export const listCategoriesSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().min(1).optional(),
    parentId: z.coerce.number().int().positive().optional(),
    root: boolFromString.optional(),
    isActive: boolFromString.optional(),
    sort: z.enum(["newest", "oldest", "title"]).default("newest"),
  }),
};


export const createCategorySchema = {
    body:z.object({
        title:z.string().trim().min(3),
        description:z.string().trim().min(5),
        parentId: z.coerce.number().int().positive().optional(),
    })
}

export const productIdSchema = {params:productIdParams};
export const categorySchema = {params:categoryParams};
export const categoryIdSchema = {params:categoryIdParams}
export const slugSchema = {params:slugParams};

export type createCategoryBody = z.infer<typeof createCategorySchema.body>;
export type listCategoriesQuery = z.infer<typeof listCategoriesSchema.query>;
