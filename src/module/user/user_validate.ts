import z from "zod";


const userIdParams = z.object({userId:z.string().uuid()});
 const otpCodeBody = z.object({otpCode:z.string({message:"must be string"}).trim().min(6,{message:"At least 6 chars"})})
 const phoneNumberBody = z.object({
         phoneNumber:z.string().min(11).trim()
         .transform((phone) => phone.replace(/^\+98/, "0"))
         .refine((phone) => /^09\d{9}$/.test(phone)),
        })

export const otpCodeSchema = {body:otpCodeBody};
export const phoneNumberSchema = {body:phoneNumberBody};        
export const userIdSchema = {params:userIdParams};

export const LoginRequestSchema = {
    body:phoneNumberBody
}

export const LoginCompletationSchema = {
    body:z.object({
        otpCode:z.string({message:"must be string"}).trim().min(6,{message:"At least 6 chars"}),
        phoneNumber:z.string().min(11).trim()
         .transform((phone) => phone.replace(/^\+98/, "0"))
         .refine((phone) => /^09\d{9}$/.test(phone))
    })
}

export const listUsersSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(12),
    search: z.string().trim().min(1).optional(),
    sort: z
      .enum(["desc", "asc"])
      .default("desc"),
  }),
};

export type ListUsersQuery = z.infer<typeof listUsersSchema.query>