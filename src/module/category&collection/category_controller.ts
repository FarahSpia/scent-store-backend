import {prisma} from "../../util/prisma.util.ts";
import { Prisma } from "../../generated/prisma/client.ts";

import type { Request,Response } from "express";
import {sendSuccess,AppError} from "../../middleware/response_hanlder.ts";
import { slugify } from "../../util/slug.util.ts";
import { deleteProductImageFile,getProductImageUrl } from "../../util/file.util.ts";

import type { 
   createCategoryBody,
   listCategoriesQuery
 } from "./category_validate.ts";


//logic
const sortMap: Record<listCategoriesQuery["sort"], Prisma.CategoryOrderByWithRelationInput> = {
  newest: { createdAt: "desc" },
  oldest: { createdAt: "asc" },
  title: { title: "asc" },
};

const productDetailInclude = {
  variants: { orderBy: { price: "asc" as const } },
  images: { orderBy: { sortOrder: "asc" as const } },
  categories: { include: { category: { select: { id: true, title: true, slug: true,imageUrl:true } } } },
} satisfies Prisma.ProductInclude;


export const listCategories = async (query: listCategoriesQuery) => {
  const { page, limit, search, parentId, root, isActive, sort } = query;

  const where: Prisma.CategoryWhereInput = {};

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
    ];
  }

  if (parentId) where.parentId = parentId;
  else if (root) where.parentId = null;

  if (isActive !== undefined) where.isActive = isActive;

  const [items, total] = await prisma.$transaction([
    prisma.category.findMany({
      where,
      orderBy: sortMap[sort],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { products: true, children: true } },
      },
    }),
    prisma.category.count({ where }),
  ]);

  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
};

 const getCatBySlug = async (slug: string) => {
  const cat = await prisma.category.findUnique({
    where: { slug },
    include: {
        _count: { select: { products: true, children: true } },
      },
  });
  if (!cat) throw new AppError("Category not found", 404, "CATEGORY_NOT_FOUND");
  return cat;
};


const createCategory = async(body:createCategoryBody)=>{
     const title = body.title.trim()
     const slug = slugify(title);

    const c = await prisma.category.findUnique({where:{slug}});
    if(c) throw new AppError("category exits",409,"CATEGORY_EXIST");
   

   try {
    return await prisma.category.create({
      data: {
        title,
        slug,
        description: body.description?.trim() || null,
        // imageUrl: body.imageUrl ?? null,
        parentId: body.parentId ?? null,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new AppError("category exits", 409, "CATEGORY_EXISTS");
    }
    throw e;
  }
    

}

const addProductToCategory = async(productId:string,categoryId:number)=>{
     const [p,pc,c] = await prisma.$transaction([
        prisma.product.findFirst({where:{id:productId}}),
        prisma.productCategory.findFirst({where:{productId,categoryId}}),
        prisma.category.findFirst({where:{id:categoryId}})
     ])

     if(!p) throw new AppError("product not found",404,"PRODUCT_NOT_FOUND");
     if(!c) throw new AppError("category not found",404,"CATEGORY_NOT_FOUND");
     if(pc) throw new AppError("product aleardy added to category ",409,"PRODUCT_CATEGORY_NOT_EXIST");

    await prisma.productCategory.create({data:{productId,categoryId}});

}

const removeCategory = async(categoryId:number)=>{
    const c = await prisma.category.findFirst({where:{id:categoryId}});
    if(!c) throw new AppError("category not found",404,"CATEGORY_NOT_FOUND");

    await prisma.category.delete({where:{id:c.id}});
}

const removeProductCategoryRelation = async(productId:string,categoryId:number)=>{
    
    const pc = await prisma.productCategory.findFirst({where:{productId,categoryId}});
    if(!pc) throw new AppError("there is no productCategory relation",404,"PRODUCT_CATEGORY_NOT_FOUND");

    await prisma.productCategory.delete({where:{productId_categoryId:{productId,categoryId}}});

}

//controller



const postCategory = async(req:Request,res:Response)=>{
   const data = await createCategory(req.body as createCategoryBody);
   sendSuccess(res,data,{message:"category created successfully"});
}

const getCategoryWithPagination = async (req: Request, res: Response) => {
    const q = res.locals.query as listCategoriesQuery;
    const data = await listCategories(q);
    sendSuccess(res,data.items,{statusCode:200,meta:data.meta})
};

const getCategoryBySlug = async(req:Request,res:Response)=>{
    const slug = req.params.slug as string;
    const data = await getCatBySlug(slug);
    sendSuccess(res,data);
}

const deleteCategory = async(req:Request,res:Response)=>{
   const {categoryId} = req.params as {categoryId:string};

   await removeCategory(Number(categoryId));

   sendSuccess(res,null,{statusCode:200,message:"category removed successfully"});
}

const deleteProductCategory = async(req:Request,res:Response)=>{
    const {productId,categoryId} = req.params as {productId:string,categoryId:string};
   await removeProductCategoryRelation(productId,Number(categoryId));

   sendSuccess(res,null,{message:"product removed from the category"});
}

const addProductToCat = async(req:Request,res:Response)=>{
    const {productId,categoryId} = req.params as {productId:string,categoryId:string};
     await addProductToCategory(productId,Number(categoryId));

    sendSuccess(res,null,{statusCode:200,message:"product added to category successfully"});
}

export default {
    getCategoryWithPagination,
     getCategoryBySlug,
    postCategory,
    addProductToCat,
    deleteProductCategory,
    deleteCategory
}