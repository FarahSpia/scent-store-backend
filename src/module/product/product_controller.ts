import {prisma} from "../../util/prisma.util.ts";
import type { Request,Response } from "express";
import {response_Handler,custom_Error} from "../../middleware/response_hanlder.ts";

import type { productFilterRequest,productInfo } from "./product_type.ts";

const getAllProductWithPagination = async (req:productFilterRequest, res:Response) => {

     const{
       search,
       page=1,
       limit=10,
       sort="price",
       order = "asc",
       minPrice,
       maxPrice,
       category
     } =req.query;
   
     let where:productInfo = {};
    
     
     if (search) {
      where.title = {
        contains: search,
      };
    }

    if(category){
      where.category = {
         some: {
           name: { contains: category, mode: "insensitive" },
         },
      }
    }

     if(minPrice || maxPrice){
        
      where.price = {};

      if (minPrice) {
        where.price.gte = Number(minPrice);
      }

      if (maxPrice) {
        where.price.lte = Number(maxPrice);
      }
     }

     let Page = Number(page);
     let Limit = Number(limit);
     const skip = (Page - 1) * Limit;

     const products = await prisma.product.findMany({
      where,
      skip,
      take:Limit,
    //   orderBy:{
    //     [sort]:order === "desc" ? "desc" : "asc"
    //   },
      include:{
        categories:true
      }
      
     })


     const totalproduct = await prisma.product.count({})
    const totalPage = Math.ceil(totalproduct/Limit);
   
    response_Handler({
      statusCode:200,
      message:"all product result:",
      data:{
       pagination: {
       currentPage: Page,
       limit:Limit,
       totalproducts : totalproduct,
       totalPage:totalPage,
       },
      count:products.length,
      data: products
      },
      res
    });

};



export default {
    getAllProductWithPagination
}