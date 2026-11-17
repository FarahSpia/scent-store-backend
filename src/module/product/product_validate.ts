import { z } from "zod";

export const listProductsSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(12),
    search: z.string().trim().min(1).optional(),
    categoryId: z.coerce.number().int().positive().optional(),
    collectionId: z.coerce.number().int().positive().optional(),
    minPrice: z.coerce.number().int().min(0).optional(),
    maxPrice: z.coerce.number().int().min(0).optional(),
    isActive:z.enum(["true", "false"]).transform((v) => v === "true").optional(),
    inStock: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
    minRate: z.coerce.number().min(0).max(5).optional(),
    sort: z
      .enum(["newest", "price_asc", "price_desc", "rate", "popular"])
      .default("newest"),
  }),
};

const variantSchema = z.object({
  title: z.string().trim().min(1),
  sku: z.string().trim().min(1),
  volume: z.string().optional(),
  price: z.number().int().min(0),
  discount: z.number().int().min(0).optional(),
  stock: z.number().int().min(0).default(0),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
}).refine((v) => v.discount === undefined || v.discount <= v.price, {
  message: "discount cannot be greater than price",
  path: ["discount"],
});

const imageSchema = z.object({
  url: z.string().url(),
  alt: z.string().optional(),
  sortOrder: z.number().int().default(0),
  isMain: z.boolean().default(false),
});

export const createProductSchema = {
  body: z.object({
    title: z.string().trim().min(2),
    // slug: z.string().trim().min(2).regex(/^[a-z0-9\u0600-\u06FF]+(?:-[a-z0-9\u0600-\u06FF]+)*$/, "invalid slug"),
    shortDescription: z.string().optional(),
    description: z.string().min(1),
    details: z.record(z.string(), z.any()).optional(),
    howToUse: z.string().optional(),
    warning: z.string().optional(),
    isActive: z.boolean().default(true),

    variants: z.array(variantSchema).min(1, "at least one variant is required"),
    // images: z.array(imageSchema).default([]),
    categoryIds: z.array(z.coerce.number().int().positive()).default([]),
    // collectionIds: z.array(z.string()).default([]),
  }).superRefine((b, ctx) => {
    const skus = b.variants.map((v) => v.sku);
    if (new Set(skus).size !== skus.length)
      ctx.addIssue({ code: "custom", path: ["variants"], message: "duplicate sku" });

    if (b.variants.filter((v) => v.isDefault).length > 1)
      ctx.addIssue({ code: "custom", path: ["variants"], message: "only one default variant" });

    // if (b.images.filter((i) => i.isMain).length > 1)
    //   ctx.addIssue({ code: "custom", path: ["images"], message: "only one main image" });
  }),
};


export const uploadProductImagesSchema = {
  params: z.object({ productId: z.string().min(1) }),
  body: z.object({
    alts: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .transform((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v])),
  }),
};

export const deleteProductImageSchema = {
  params: z.object({
    productId: z.string().min(1),
    imageId: z.string().min(1),
  }),
};

export const setMainProductImageSchema = {
  params: z.object({
    productId: z.string().min(1),
    imageId: z.string().min(1),
  }),
};

export type ListProductsQuery = z.infer<typeof listProductsSchema.query>
export type CreateProductBody = z.infer<typeof createProductSchema.body>


const variantFields = {
  sku: z.string().trim().min(1).max(64),
  title: z.string().trim().min(1).max(100),
  volume: z.string().trim().min(1).max(20),
  price: z.number().int().nonnegative(),
  discount:z.number().int().nonnegative().max(100).default(0),
  stock: z.number().int().nonnegative().default(0),
};

export const productIdParams = z.object({ productId: z.string().min(1) });
export const variantParams = productIdParams.extend({ variantId: z.string().min(1) });

export const updateProductSchema = {
  params: productIdParams,
  body: z
    .object({
      title: z.string().trim().min(1).max(200),
      description: z.string(),
      shortDescription: z.string(),
      details: z.string(),
      howToUse: z.string(),
      warning: z.string().nullable(),
      isActive: z.boolean(),
      categoryIds: z.array(z.coerce.number().int().positive()).min(1),
    })
    .partial()
    .refine((v) => Object.keys(v).length > 0, "حداقل یک فیلد بفرست"),
};

export const deleteProductSchema = { params: productIdParams };

export const createVariantSchema = {
  params: productIdParams,
  body: z.object(variantFields),
};

export const updateVariantSchema = {
  params: variantParams,
  body: z
    .object(variantFields)
    .partial()
    .refine((v) => Object.keys(v).length > 0, "حداقل یک فیلد بفرست"),
};

export const deleteVariantSchema = { params: variantParams };

export type UpdateProductInput = z.infer<typeof updateProductSchema.body>;
export type CreateVariantInput = z.infer<typeof createVariantSchema.body>;
export type UpdateVariantInput = z.infer<typeof updateVariantSchema.body>;

export const getProductByIdSchema = {
  params: z.object({ productId: z.string().min(1) }),
};

export const getProductBySlugSchema = {
  params: z.object({ slug: z.string().trim().min(1).max(255) }),
};