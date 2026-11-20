import z from "zod";

export const productIdParams = z.object({ productId: z.string().min(1) });


export const listFavSchema ={
    query:z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(50).default(12),
    })
}

export type listFavQuery = z.infer<typeof listFavSchema.query>;
export const productIdSchema = {params:productIdParams};