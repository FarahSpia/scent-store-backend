import {prisma} from "../../../util/prisma.util.ts";
import { Prisma } from "../../../generated/prisma/client.ts";

import type { Request,Response } from "express";
import {sendSuccess,AppError} from "../../../middleware/response_hanlder.ts";

import type {
  ListCityQuery,
  CreateCityBody,
  UpdateCityBody
} from "./city_validate.ts";


//logic

const sortMap: Record<ListCityQuery["sort"], Prisma.CityOrderByWithRelationInput> = {
  name: { name: "asc" },
  newest: { createdAt: "desc" },
  oldest: { createdAt: "asc" },
};

const assertProvince = async (provinceId: string) => {
  const p = await prisma.province.findUnique({ where: { id: provinceId }, select: { id: true } });
  if (!p) throw new AppError("Province not found", 404, "PROVINCE_NOT_FOUND");
};

const listCity = async (q: ListCityQuery, isAdmin: boolean) => {
  const { page, limit, search, provinceId, isActive, sort } = q;

  const where: Prisma.CityWhereInput = {
    ...(search && { name: { contains: search, mode: "insensitive" } }),
    ...(provinceId && { provinceId }),
    ...(isAdmin ? (isActive !== undefined && { isActive }) : { isActive: true, province: { isActive: true } }),
  };

  const [items, total] = await prisma.$transaction([
    prisma.city.findMany({
      where,
      orderBy: sortMap[sort],
      skip: (page - 1) * limit,
      take: limit,
      include: { province: { select: { id: true, name: true } } },
    }),
    prisma.city.count({ where }),
  ]);

  return { items, total };
};

const getCityById = async (cityId: string, isAdmin: boolean) => {
  const c = await prisma.city.findUnique({
    where: { id: cityId },
    include: { province: { select: { id: true, name: true, isActive: true } } },
  });
  if (!c || (!isAdmin && (!c.isActive || !c.province.isActive)))
    throw new AppError("City not found", 404, "CITY_NOT_FOUND");
  return c;
};

const createCity = async (body: CreateCityBody) => {
  await assertProvince(body.provinceId);

  try {
    return await prisma.city.create({ data: body });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      throw new AppError("City already exists in this province", 409, "CITY_EXISTS");
    throw e;
  }
};

const updateCity = async (cityId: string, body: UpdateCityBody) => {
  const c = await prisma.city.findUnique({ where: { id: cityId }, select: { id: true } });
  if (!c) throw new AppError("City not found", 404, "CITY_NOT_FOUND");

  if (body.provinceId) await assertProvince(body.provinceId);

  try {
    return await prisma.city.update({ where: { id: cityId }, data: body });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      throw new AppError("City already exists in this province", 409, "CITY_EXISTS");
    throw e;
  }
};

const deleteCity = async (cityId: string) => {
  const c = await prisma.city.findUnique({ where: { id: cityId }, select: { id: true } });
  if (!c) throw new AppError("City not found", 404, "CITY_NOT_FOUND");

  await prisma.city.delete({ where: { id: cityId } });
};


//controller

const getAllCity = async (req: Request, res: Response) => {
  const q = res.locals.query as ListCityQuery;
  const { items, total } = await listCity(q, req.user?.role === "Admin");

  sendSuccess(res, items, {
    meta: { page: q.page, limit: q.limit, total, totalPage: Math.ceil(total / q.limit) },
  });
};

const getCity = async (req: Request, res: Response) => {
  const cityId = req.params.cityId as string;
  const data = await getCityById(cityId, req.user?.role === "Admin");
  sendSuccess(res, data);
};

const postCity = async (req: Request, res: Response) => {
  const data = await createCity(req.body as CreateCityBody);
  sendSuccess(res, data, { statusCode: 201, message: "City created" });
};

const editCity = async (req: Request, res: Response) => {
  const cityId = req.params.cityId as string;
  const data = await updateCity(cityId, req.body as UpdateCityBody);
  sendSuccess(res, data, { message: "City updated" });
};

const removeCity = async (req: Request, res: Response) => {
  const cityId = req.params.cityId as string;
  await deleteCity(cityId);
  sendSuccess(res, null, { message: "City deleted" });
};


export default {
    getAllCity,
    getCity,
    postCity,
    editCity,
    removeCity
}
