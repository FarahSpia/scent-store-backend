import {prisma} from "../../../util/prisma.util.ts";
import { Prisma } from "../../../generated/prisma/client.ts";

import type { Request,Response } from "express";
import {sendSuccess,AppError} from "../../../middleware/response_hanlder.ts";

import type {
  ListShippingQuery,
  CreateShippingBody,
  UpdateShippingBody
} from "./shipping_validate.ts";


//logic

const sortMap: Record<ListShippingQuery["sort"], Prisma.ShippingMethodOrderByWithRelationInput> = {
  newest: { createdAt: "desc" },
  oldest: { createdAt: "asc" },
  price_asc: { price: "asc" },
  price_desc: { price: "desc" },
};

const listShipping = async (q: ListShippingQuery, isAdmin: boolean) => {
  const { page, limit, search, isActive, sort } = q;

  const where: Prisma.ShippingMethodWhereInput = {
    ...(search && { title: { contains: search, mode: "insensitive" } }),
    ...(isAdmin ? (isActive !== undefined && { isActive }) : { isActive: true }),
  };

  const [items, total] = await prisma.$transaction([
    prisma.shippingMethod.findMany({
      where,
      orderBy: sortMap[sort],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.shippingMethod.count({ where }),
  ]);

  return { items, total };
};

const getShippingById = async (shippingId: string, isAdmin: boolean) => {
  const s = await prisma.shippingMethod.findUnique({ where: { id: shippingId } });
  if (!s || (!isAdmin && !s.isActive))
    throw new AppError("Shipping method not found", 404, "SHIPPING_METHOD_NOT_FOUND");
  return s;
};

const createShipping = async (body: CreateShippingBody) => {
  return prisma.shippingMethod.create({ data: body });
};

const updateShipping = async (shippingId: string, body: UpdateShippingBody) => {
  const s = await prisma.shippingMethod.findUnique({ where: { id: shippingId }, select: { id: true } });
  if (!s) throw new AppError("Shipping method not found", 404, "SHIPPING_METHOD_NOT_FOUND");

  return prisma.shippingMethod.update({ where: { id: shippingId }, data: body });
};

const deleteShipping = async (shippingId: string) => {
  const s = await prisma.shippingMethod.findUnique({ where: { id: shippingId }, select: { id: true } });
  if (!s) throw new AppError("Shipping method not found", 404, "SHIPPING_METHOD_NOT_FOUND");

  await prisma.shippingMethod.delete({ where: { id: shippingId } });
};


//controller

const getAllShipping = async (req: Request, res: Response) => {
  const q = res.locals.query as ListShippingQuery;
  const { items, total } = await listShipping(q, req.user?.role === "Admin");

  sendSuccess(res, items, {
    meta: { page: q.page, limit: q.limit, total, totalPage: Math.ceil(total / q.limit) },
  });
};

const getShipping = async (req: Request, res: Response) => {
  const shippingId = req.params.shippingId as string;
  const data = await getShippingById(shippingId, req.user?.role === "Admin");
  sendSuccess(res, data);
};

const postShipping = async (req: Request, res: Response) => {
  const data = await createShipping(req.body as CreateShippingBody);
  sendSuccess(res, data, { statusCode: 201, message: "Shipping method created" });
};

const editShipping = async (req: Request, res: Response) => {
  const shippingId = req.params.shippingId as string;
  const data = await updateShipping(shippingId, req.body as UpdateShippingBody);
  sendSuccess(res, data, { message: "Shipping method updated" });
};

const removeShipping = async (req: Request, res: Response) => {
  const shippingId = req.params.shippingId as string;
  await deleteShipping(shippingId);
  sendSuccess(res, null, { message: "Shipping method deleted" });
};


export default {
    getAllShipping,
    getShipping,
    postShipping,
    editShipping,
    removeShipping
}
