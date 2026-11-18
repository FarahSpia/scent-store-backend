import {prisma} from "../../util/prisma.util.ts";
import { Prisma } from "../../generated/prisma/client.ts";

import type { Request,Response } from "express";
import {sendSuccess,AppError} from "../../middleware/response_hanlder.ts";

import {
    ListUsersQuery
} from "./user_validate.ts"


//Logic

const listUsers = async(q:ListUsersQuery)=>{
     const { page, limit, search, sort } = q;

  const where: Prisma.UserWhereInput = {
    ...(search && {
      OR: [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { phoneNumber : {contains:search,mode:"insensitive"}},
      ],
    }),
   
  };

  const orderBy: Prisma.UserOrderByWithRelationInput = sort === "desc" ? {createdAt: "desc"} : {createdAt:"asc"};

  const select = {
    id:true,
    firstName:true,
    lastName:true,
    phoneNumber:true,
    city:true,
    
  } satisfies Prisma.UserSelect;

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where, orderBy, select,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);



  return { users, total };

}

const getUserByIdCtrl = async(userId:string)=>{

    const userDetailInclude = {
      cartItems:true,
      favorites:true,
      comments:true,
      city:true,
      orders:true
    } satisfies Prisma.UserInclude;

     const u = await prisma.product.findUnique({
    where: { id: userId },
    include: userDetailInclude,
  });
  if (!u) throw new AppError("User not found", 404, "USER_NOT_FOUND");
  return u;
}


//controller

const getAllUserWithPagination = async(req:Request,res:Response)=>{
      const q = res.locals.query as ListUsersQuery;
  const { users, total } = await listUsers(q);

    return sendSuccess(res, users, {
      meta: {
        page: q.page,
        limit: q.limit,
        total,
        totalPage: Math.ceil(total / q.limit),
      },
    });
}

const getUserById = async(req:Request,res:Response)=>{
     const userId = req.params.userId as string;
     const data = await getUserByIdCtrl(userId);
     sendSuccess(res,data);
}


export default {
     getAllUserWithPagination,
     getUserById
}