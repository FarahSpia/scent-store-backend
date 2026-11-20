import {prisma} from "../../../util/prisma.util.ts";
import { Prisma } from "../../../generated/prisma/client.ts";

import type { Request,Response } from "express";
import {sendSuccess,AppError} from "../../../middleware/response_hanlder.ts";


import type { 
   listFavQuery
 } from "./favorite_validate.ts";


//logic

const addORremove_Favorite = async(productId:string,userId:string):Promise<string>=>{

    const key = { userId_productId : { productId,userId } }

    const f = await prisma.favorite.findUnique({where:key});
    if(f){
        await prisma.favorite.delete({where:key})
       return "the product remove from favorite list";
    }

    await prisma.favorite.create({data:{userId,productId}});
   
    return "the product added to favorite list";

}


const listFavorites = async(userId:string,q:listFavQuery)=>{
     const {page,limit} = q ;
     
      const select = {
       id: true,
       title: true,
       slug: true,
       shortDescription: true,
       rateAvg: true,
       rateCount: true,
       images: {where:{isMain:true}},
       variants: {
         where: { isActive: true },
         select: { id: true, title: true, price: true, discount: true, stock: true, isDefault: true },
       },
     } satisfies Prisma.ProductSelect;

     const [items, total] = await prisma.$transaction([
      prisma.favorite.findMany({
        where:{userId},
        select:{product:{select}},
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.favorite.count({ where:{userId}})
    ]);
    
    return {items,total}

}


//controller

const favorite_product = async(req:Request,res:Response)=>{
     const productId = req.params.productId as string;
     const userId = req.user?.userId as string;
    const message =  await addORremove_Favorite(productId,userId); 
     sendSuccess(res,null,{statusCode:200,message:message})
}


const getAllFavorite = async(req:Request,res:Response)=>{
    const q = res.locals.query as listFavQuery;
     const userId = req.user?.userId as string;
     const {total,items} = await listFavorites(userId,q);
     sendSuccess(res,items, {
      meta: {
        page: q.page,
        limit: q.limit,
        total,
        totalPage: Math.ceil(total / q.limit),
      },
    });
} 



export default {
    favorite_product,
     getAllFavorite
}