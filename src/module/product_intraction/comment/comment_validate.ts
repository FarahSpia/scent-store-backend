import z from "zod";


const commentIdParams = z.object({commentId:z.string().uuid().min(1)});

export const commentIdSchema = {params:commentIdParams};


export const editCommentSchema = {
    params:commentIdParams,
    body:z.object({
        content:z.string().min(5),
        rate:z.number().int().positive().min(1).max(5),
    })
}

export const createCommentSchema = {
    body:z.object({
        content:z.string().min(5),
        rate:z.number().int().positive().min(1).max(5),
        productId:z.string().uuid().min(1)
    })
}