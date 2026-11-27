import {prisma} from "../../../util/prisma.util.ts";
import { Prisma } from "../../../generated/prisma/client.ts";

import type { Request,Response } from "express";
import {sendSuccess,AppError} from "../../../middleware/response_hanlder.ts";

import type {
  ListDiscountQuery,
  CreateDiscountBody,
  UpdateDiscountBody
} from "./discount_validate.ts";


//logic

const assertDiscount = async (discountId: string) => {
  const d = await prisma.discountCode.findUnique({ where: { id: discountId } });
  if (!d) throw new AppError("Discount code not found", 404, "DISCOUNT_NOT_FOUND");
  return d;
};

const listDiscount = async (q: ListDiscountQuery) => {
  const { page, limit, search, type, isActive, sort } = q;

  const where: Prisma.DiscountCodeWhereInput = {
    ...(search && { code: { contains: search, mode: "insensitive" } }),
    ...(type && { type }),
    ...(isActive !== undefined && { isActive }),
  };

  const [items, total] = await prisma.$transaction([
    prisma.discountCode.findMany({
      where,
      orderBy: { createdAt: sort === "newest" ? "desc" : "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.discountCode.count({ where }),
  ]);

  return { items, total };
};

const getDiscountById = async (discountId: string) => {
  const d = await prisma.discountCode.findUnique({
    where: { id: discountId },
    include: { _count: { select: { orders: true } } },
  });
  if (!d) throw new AppError("Discount code not found", 404, "DISCOUNT_NOT_FOUND");
  return d;
};

const createDiscount = async (body: CreateDiscountBody) => {
  try {
    return await prisma.discountCode.create({ data: body });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      throw new AppError("Discount code already exists", 409, "DISCOUNT_EXISTS");
    throw e;
  }
};

const updateDiscount = async (discountId: string, body: UpdateDiscountBody) => {
  const current = await assertDiscount(discountId);

  const type = body.type ?? current.type;
  const value = body.value ?? current.value;
  if (type === "Percent" && value > 100)
    throw new AppError("percent cannot be greater than 100", 400, "DISCOUNT_VALUE_INVALID");

  const startAt = body.startAt === undefined ? current.startAt : body.startAt;
  const expireAt = body.expireAt === undefined ? current.expireAt : body.expireAt;
  if (startAt && expireAt && expireAt <= startAt)
    throw new AppError("expireAt must be after startAt", 400, "DISCOUNT_DATE_INVALID");

  if (body.usageLimit && body.usageLimit < current.usedCount)
    throw new AppError("usageLimit cannot be less than usedCount", 400, "DISCOUNT_LIMIT_INVALID");

  try {
    return await prisma.discountCode.update({ where: { id: discountId }, data: body });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      throw new AppError("Discount code already exists", 409, "DISCOUNT_EXISTS");
    throw e;
  }
};

const deleteDiscount = async (discountId: string) => {
  await assertDiscount(discountId);
  await prisma.discountCode.delete({ where: { id: discountId } });
};


//controller

const getAllDiscount = async (req: Request, res: Response) => {
  const q = res.locals.query as ListDiscountQuery;
  const { items, total } = await listDiscount(q);

  sendSuccess(res, items, {
    meta: { page: q.page, limit: q.limit, total, totalPage: Math.ceil(total / q.limit) },
  });
};

const getDiscount = async (req: Request, res: Response) => {
  const discountId = req.params.discountId as string;
  const data = await getDiscountById(discountId);
  sendSuccess(res, data);
};

const postDiscount = async (req: Request, res: Response) => {
  const data = await createDiscount(req.body as CreateDiscountBody);
  sendSuccess(res, data, { statusCode: 201, message: "Discount code created" });
};

const editDiscount = async (req: Request, res: Response) => {
  const discountId = req.params.discountId as string;
  const data = await updateDiscount(discountId, req.body as UpdateDiscountBody);
  sendSuccess(res, data, { message: "Discount code updated" });
};

const removeDiscount = async (req: Request, res: Response) => {
  const discountId = req.params.discountId as string;
  await deleteDiscount(discountId);
  sendSuccess(res, null, { message: "Discount code deleted" });
};


export default {
    getAllDiscount,
    getDiscount,
    postDiscount,
    editDiscount,
    removeDiscount
}
