import {prisma} from "../../util/prisma.util.ts";
import { Prisma } from "../../generated/prisma/client.ts";

import type { Request,Response } from "express";
import {sendSuccess,AppError} from "../../middleware/response_hanlder.ts";
import { requestPayment,verifyPayment } from "../../util/zarinpal.util.ts";

import type {
  CreateOrderBody,
  PaymentCallbackQuery,
  ListOrdersQuery,
  UpdateOrderStatusBody
} from "./order_validate.ts";


//logic

const orderDetailInclude = {
  items: true,
  payment: { omit: { authority: true } },
  shippingMethod: true,
} satisfies Prisma.OrderInclude;

const getDiscountAmount = (
  code: { type: "Percent" | "Fixed"; value: number },
  subtotal: number
) => {
  const amount = code.type === "Percent" ? Math.floor((subtotal * code.value) / 100) : code.value;
  return Math.min(amount, subtotal);
};

//give back stock and discount usage of an order which will not be paid
const releaseOrder = async (tx: Prisma.TransactionClient, orderId: string) => {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return;

  for (const item of order.items) {
    await tx.productVariant.update({
      where: { id: item.variantId },
      data: { stock: { increment: item.quantity } },
    });
  }

  if (order.discountCodeId) {
    await tx.discountCode.updateMany({
      where: { id: order.discountCodeId, usedCount: { gt: 0 } },
      data: { usedCount: { decrement: 1 } },
    });
  }
};

const failOrder = async (orderId: string, paymentStatus: "Failed" | "Cancelled") => {
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.payment.updateMany({
      where: { orderId, status: "Pending" },
      data: { status: paymentStatus },
    });
    if (claimed.count === 0) return false;

    await tx.order.update({ where: { id: orderId }, data: { status: "Cancelled" } });
    await releaseOrder(tx, orderId);
    return true;
  });
};

const createOrder = async (userId: string, body: CreateOrderBody) => {
  const { items, shippingMethodId, discountCode, ...address } = body;

  const shippingMethod = await prisma.shippingMethod.findFirst({
    where: { id: shippingMethodId, isActive: true },
  });
  if (!shippingMethod) throw new AppError("Shipping method not found", 404, "SHIPPING_METHOD_NOT_FOUND");

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: items.map((i) => i.variantId) }, isActive: true, product: { isActive: true } },
    include: { product: { select: { id: true, title: true } } },
  });
  if (variants.length !== items.length)
    throw new AppError("Some products not found", 404, "VARIANT_NOT_FOUND");

  const orderItems = items.map((item) => {
    const variant = variants.find((v) => v.id === item.variantId)!;
    if (variant.stock < item.quantity)
      throw new AppError(`${variant.product.title} is out of stock`, 409, "OUT_OF_STOCK");

    const unitPrice = variant.price - (variant.discount ?? 0);
    return {
      productId: variant.product.id,
      variantId: variant.id,
      productTitle: variant.product.title,
      variantTitle: variant.title,
      unitPrice,
      quantity: item.quantity,
      totalPrice: unitPrice * item.quantity,
    };
  });

  const subtotalPrice = orderItems.reduce((sum, i) => sum + i.totalPrice, 0);

  let discountCodeId: string | null = null;
  let discountAmount = 0;

  if (discountCode) {
    const code = await prisma.discountCode.findUnique({ where: { code: discountCode } });
    const now = new Date();

    if (!code || !code.isActive) throw new AppError("Discount code is invalid", 400, "DISCOUNT_INVALID");
    if ((code.startAt && code.startAt > now) || (code.expireAt && code.expireAt < now))
      throw new AppError("Discount code is expired", 400, "DISCOUNT_EXPIRED");
    if (code.usageLimit !== null && code.usedCount >= code.usageLimit)
      throw new AppError("Discount code usage limit reached", 400, "DISCOUNT_LIMIT_REACHED");
    if (code.minOrderAmount !== null && subtotalPrice < code.minOrderAmount)
      throw new AppError("Order amount is less than discount minimum", 400, "DISCOUNT_MIN_AMOUNT");

    discountCodeId = code.id;
    discountAmount = getDiscountAmount(code, subtotalPrice);
  }

  const shippingPrice = shippingMethod.price;
  const totalPrice = subtotalPrice + shippingPrice - discountAmount;

  const order = await prisma.$transaction(async (tx) => {
    for (const item of orderItems) {
      const updated = await tx.productVariant.updateMany({
        where: { id: item.variantId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (updated.count === 0)
        throw new AppError(`${item.productTitle} is out of stock`, 409, "OUT_OF_STOCK");
    }

    if (discountCodeId) {
      const code = await tx.discountCode.findUniqueOrThrow({ where: { id: discountCodeId } });
      const updated = await tx.discountCode.updateMany({
        where: {
          id: discountCodeId,
          ...(code.usageLimit !== null && { usedCount: { lt: code.usageLimit } }),
        },
        data: { usedCount: { increment: 1 } },
      });
      if (updated.count === 0)
        throw new AppError("Discount code usage limit reached", 400, "DISCOUNT_LIMIT_REACHED");
    }

    return tx.order.create({
      data: {
        userId,
        shippingMethodId,
        discountCodeId,
        subtotalPrice,
        shippingPrice,
        discountAmount,
        totalPrice,
        ...address,
        items: { create: orderItems },
        payment: { create: { amount: totalPrice } },
      },
      include: { items: true },
    });
  });

  try {
    const { authority, paymentUrl } = await requestPayment({
      amount: totalPrice,
      callbackUrl: `${process.env.BASE_URL}/order/payment/callback`,
      description: `order ${order.id}`,
      phoneNumber: address.receiverPhone,
    });

    await prisma.payment.update({ where: { orderId: order.id }, data: { authority } });

    return { order, paymentUrl };
  } catch (e) {
    await failOrder(order.id, "Failed");
    throw e;
  }
};

const handlePaymentCallback = async ({ Authority, Status }: PaymentCallbackQuery) => {
  const payment = await prisma.payment.findFirst({ where: { authority: Authority } });
  if (!payment) throw new AppError("Payment not found", 404, "PAYMENT_NOT_FOUND");

  if (payment.status !== "Pending")
    return { orderId: payment.orderId, status: payment.status, refId: payment.refId };

  if (Status !== "OK") {
    await failOrder(payment.orderId, "Failed");
    return { orderId: payment.orderId, status: "Failed" as const, refId: null };
  }

  const { verified, refId } = await verifyPayment(payment.amount, Authority);

  if (!verified) {
    await failOrder(payment.orderId, "Failed");
    return { orderId: payment.orderId, status: "Failed" as const, refId: null };
  }

  await prisma.payment.updateMany({
    where: { id: payment.id, status: "Pending" },
    data: { status: "Paid", refId, paidAt: new Date() },
  });

  return { orderId: payment.orderId, status: "Paid" as const, refId };
};

const listOrders = async (q: ListOrdersQuery, userId?: string) => {
  const { page, limit, status, sort } = q;

  const where: Prisma.OrderWhereInput = {
    ...(userId && { userId }),
    ...(status && { status }),
  };

  const [orders, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: sort },
      include: {
        items: true,
        payment: { select: { status: true, amount: true, paidAt: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return { orders, total };
};

const getOrderById = async (orderId: string, userId: string, role?: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: orderDetailInclude,
  });
  if (!order || (role !== "Admin" && order.userId !== userId))
    throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
  return order;
};

const cancelPendingOrder = async (orderId: string, userId: string) => {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: { payment: true },
  });
  if (!order) throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");

  if (order.status !== "Processing" || order.payment?.status !== "Pending")
    throw new AppError("Only unpaid order can be cancelled", 409, "ORDER_NOT_CANCELLABLE");

  const cancelled = await failOrder(order.id, "Cancelled");
  if (!cancelled) throw new AppError("Only unpaid order can be cancelled", 409, "ORDER_NOT_CANCELLABLE");
};

const updateOrderStatus = async (orderId: string, { status }: UpdateOrderStatusBody) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payment: true },
  });
  if (!order) throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");

  if (order.payment?.status !== "Paid")
    throw new AppError("Order is not paid", 409, "ORDER_NOT_PAID");

  const allowed = status === "SHipping" ? order.status === "Processing" : order.status === "SHipping";
  if (!allowed)
    throw new AppError(`Cant change order from ${order.status} to ${status}`, 409, "INVALID_STATUS_CHANGE");

  return prisma.order.update({ where: { id: orderId }, data: { status } });
};


//controller

const postOrder = async (req: Request, res: Response) => {
  const userId = req.user?.userId as string;
  const data = await createOrder(userId, req.body as CreateOrderBody);
  sendSuccess(res, data, { statusCode: 201, message: "Order created, redirect user to paymentUrl" });
};

const paymentCallback = async (req: Request, res: Response) => {
  const q = res.locals.query as PaymentCallbackQuery;
  const result = await handlePaymentCallback(q);
  const message = result.status === "Paid" ? "payment successful" : "payment failed";
  sendSuccess(res, result, { message });
};

const getMyOrders = async (req: Request, res: Response) => {
  const q = res.locals.query as ListOrdersQuery;
  const userId = req.user?.userId as string;
  const { orders, total } = await listOrders(q, userId);

  sendSuccess(res, orders, {
    meta: { page: q.page, limit: q.limit, total, totalPage: Math.ceil(total / q.limit) },
  });
};

const getAllOrders = async (req: Request, res: Response) => {
  const q = res.locals.query as ListOrdersQuery;
  const { orders, total } = await listOrders(q);

  sendSuccess(res, orders, {
    meta: { page: q.page, limit: q.limit, total, totalPage: Math.ceil(total / q.limit) },
  });
};

const getOrder = async (req: Request, res: Response) => {
  const orderId = req.params.orderId as string;
  const userId = req.user?.userId as string;
  const data = await getOrderById(orderId, userId, req.user?.role);
  sendSuccess(res, data);
};

const cancelOrder = async (req: Request, res: Response) => {
  const orderId = req.params.orderId as string;
  const userId = req.user?.userId as string;
  await cancelPendingOrder(orderId, userId);
  sendSuccess(res, null, { message: "order cancelled successfully" });
};

const editOrderStatus = async (req: Request, res: Response) => {
  const orderId = req.params.orderId as string;
  const data = await updateOrderStatus(orderId, req.body as UpdateOrderStatusBody);
  sendSuccess(res, data, { message: "order status updated" });
};


export default {
    postOrder,
    paymentCallback,
    getMyOrders,
    getAllOrders,
    getOrder,
    cancelOrder,
    editOrderStatus
}
