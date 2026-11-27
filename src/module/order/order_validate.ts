import { z } from "zod";

const orderIdParams = z.object({ orderId: z.string().uuid() });

const orderItemSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1).max(20),
});

export const createOrderSchema = {
  body: z.object({
    items: z.array(orderItemSchema).min(1, "at least one item is required"),
    shippingMethodId: z.string().uuid(),
    discountCode: z.string().trim().min(1).optional(),

    receiverName: z.string().trim().min(2).max(100),
    receiverPhone: z.string().trim().regex(/^09\d{9}$/, "invalid phone number"),
    province: z.string().trim().min(1),
    city: z.string().trim().min(1),
    addressLine: z.string().trim().min(5),
    postalCode: z.string().trim().regex(/^\d{10}$/, "invalid postal code"),
    note: z.string().trim().max(500).optional(),
  }).superRefine((b, ctx) => {
    const ids = b.items.map((i) => i.variantId);
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({ code: "custom", path: ["items"], message: "duplicate variant" });
  }),
};

export const paymentCallbackSchema = {
  query: z.object({
    Authority: z.string().trim().min(1),
    Status: z.string().trim().min(1),
  }),
};

export const listOrdersSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    status: z.enum(["Processing", "SHipping", "Completed", "Cancelled"]).optional(),
    sort: z.enum(["asc", "desc"]).default("desc"),
  }),
};

export const orderIdSchema = { params: orderIdParams };

export const updateOrderStatusSchema = {
  params: orderIdParams,
  body: z.object({
    status: z.enum(["SHipping", "Completed"]),
  }),
};

export type CreateOrderBody = z.infer<typeof createOrderSchema.body>;
export type PaymentCallbackQuery = z.infer<typeof paymentCallbackSchema.query>;
export type ListOrdersQuery = z.infer<typeof listOrdersSchema.query>;
export type UpdateOrderStatusBody = z.infer<typeof updateOrderStatusSchema.body>;
