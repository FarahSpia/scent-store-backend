import {prisma} from "../../../util/prisma.util.ts";
import { Prisma } from "../../../generated/prisma/client.ts";

import type { Request,Response } from "express";
import {sendSuccess,AppError} from "../../../middleware/response_hanlder.ts";

import type {
  ListProvinceQuery,
  CreateProvinceBody,
  UpdateProvinceBody
} from "./province_validate.ts";


//logic

const sortMap: Record<ListProvinceQuery["sort"], Prisma.ProvinceOrderByWithRelationInput> = {
  name: { name: "asc" },
  newest: { createdAt: "desc" },
  oldest: { createdAt: "asc" },
};

const listProvince = async (q: ListProvinceQuery, isAdmin: boolean) => {
  const { page, limit, search, isActive, sort } = q;

  const where: Prisma.ProvinceWhereInput = {
    ...(search && { name: { contains: search, mode: "insensitive" } }),
    ...(isAdmin ? (isActive !== undefined && { isActive }) : { isActive: true }),
  };

  const [items, total] = await prisma.$transaction([
    prisma.province.findMany({
      where,
      orderBy: sortMap[sort],
      skip: (page - 1) * limit,
      take: limit,
      include: { _count: { select: { cities: true } } },
    }),
    prisma.province.count({ where }),
  ]);

  return { items, total };
};

const getProvinceById = async (provinceId: string, isAdmin: boolean) => {
  const p = await prisma.province.findUnique({
    where: { id: provinceId },
    include: {
      cities: {
        where: isAdmin ? {} : { isActive: true },
        orderBy: { name: "asc" },
      },
    },
  });
  if (!p || (!isAdmin && !p.isActive))
    throw new AppError("Province not found", 404, "PROVINCE_NOT_FOUND");
  return p;
};

const createProvince = async (body: CreateProvinceBody) => {
  try {
    return await prisma.province.create({ data: body });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      throw new AppError("Province already exists", 409, "PROVINCE_EXISTS");
    throw e;
  }
};

const updateProvince = async (provinceId: string, body: UpdateProvinceBody) => {
  const p = await prisma.province.findUnique({ where: { id: provinceId }, select: { id: true } });
  if (!p) throw new AppError("Province not found", 404, "PROVINCE_NOT_FOUND");

  try {
    return await prisma.province.update({ where: { id: provinceId }, data: body });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      throw new AppError("Province already exists", 409, "PROVINCE_EXISTS");
    throw e;
  }
};

const deleteProvince = async (provinceId: string) => {
  const p = await prisma.province.findUnique({ where: { id: provinceId }, select: { id: true } });
  if (!p) throw new AppError("Province not found", 404, "PROVINCE_NOT_FOUND");

  await prisma.province.delete({ where: { id: provinceId } });
};


//controller

const getAllProvince = async (req: Request, res: Response) => {
  const q = res.locals.query as ListProvinceQuery;
  const { items, total } = await listProvince(q, req.user?.role === "Admin");

  sendSuccess(res, items, {
    meta: { page: q.page, limit: q.limit, total, totalPage: Math.ceil(total / q.limit) },
  });
};

const getProvince = async (req: Request, res: Response) => {
  const provinceId = req.params.provinceId as string;
  const data = await getProvinceById(provinceId, req.user?.role === "Admin");
  sendSuccess(res, data);
};

const postProvince = async (req: Request, res: Response) => {
  const data = await createProvince(req.body as CreateProvinceBody);
  sendSuccess(res, data, { statusCode: 201, message: "Province created" });
};

const editProvince = async (req: Request, res: Response) => {
  const provinceId = req.params.provinceId as string;
  const data = await updateProvince(provinceId, req.body as UpdateProvinceBody);
  sendSuccess(res, data, { message: "Province updated" });
};

const removeProvince = async (req: Request, res: Response) => {
  const provinceId = req.params.provinceId as string;
  await deleteProvince(provinceId);
  sendSuccess(res, null, { message: "Province deleted" });
};


export default {
    getAllProvince,
    getProvince,
    postProvince,
    editProvince,
    removeProvince
}
