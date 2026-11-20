import {prisma} from "../../util/prisma.util.ts";
import { Prisma } from "../../generated/prisma/client.ts";

import type { Request,Response } from "express";
import {sendSuccess,AppError} from "../../middleware/response_hanlder.ts";
import { slugify } from "../../util/slug.util.ts";
import { deleteProductImageFile,getProductImageUrl } from "../../util/file.util.ts";

import type { 
  ListProductsQuery,
  CreateProductBody,
  UpdateProductInput,
  CreateVariantInput,
  UpdateVariantInput
 } from "./product_validate.ts";


//logic

const productDetailInclude = {
  variants: { orderBy: { price: "asc" as const } },
  images: { orderBy: { sortOrder: "asc" as const } },
  categories: { include: { category: { select: { id: true, title: true, slug: true,imageUrl:true } } } },
} satisfies Prisma.ProductInclude;


const assertProduct = async (productId: string) => {
  const p = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!p) throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
};


 const listProducts = async (q: ListProductsQuery,userId:string | undefined) => {
  const { page, limit, search, categoryId, collectionId,
    minPrice, maxPrice, inStock, minRate, sort,isActive } = q;


  //varient        
  const variantWhere: Prisma.ProductVariantWhereInput = { isActive: true };
  if (minPrice !== undefined || maxPrice !== undefined) {
    variantWhere.price = { gte: minPrice, lte: maxPrice };
  }
  if (inStock) variantWhere.stock = { gt: 0 };

  const hasVariantFilter = Object.keys(variantWhere).length > 1;

  const where: Prisma.ProductWhereInput = {
    isActive: isActive,
    ...(search && {
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { shortDescription: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ],
    }),
    ...(categoryId && { categories: { some: { categoryId } } }),
    ...(collectionId && { collections: { some: { collectionId } } }),
    ...(minRate !== undefined && { rateAvg: { gte: minRate } }),
   

    variants: { some: hasVariantFilter ? variantWhere : { isActive: true } },
  };

  // console.log("categoryId:", categoryId, typeof categoryId);
  // console.log(JSON.stringify(where, null, 2));

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "rate" ? { rateAvg: "desc" }
    : sort === "popular" ? { rateCount: "desc" }
    : { createdAt: "desc" };

  const select = {
    id: true,
    title: true,
    slug: true,
    shortDescription: true,
    rateAvg: true,
    rateCount: true,
    images: {where:{isMain:true}},
    favorites: userId ? {where:{userId},select:{productId:true}} : false, 
    variants: {
      where: { isActive: true },
      select: { id: true, title: true, price: true, discount: true, stock: true, isDefault: true },
    },
  } satisfies Prisma.ProductSelect;

  const [items, total] = await prisma.$transaction([
    prisma.product.findMany({
      where, orderBy, select,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  
  const products = items.map(({ variants, ...p }) => {
    const finalPrices = variants.map((v) => v.price - (v.discount ?? 0));
    return {
      ...p,
      variants,
      isFavorites:p.favorites?.length > 0,
      minPrice: finalPrices.length ? Math.min(...finalPrices) : null,
      maxPrice: finalPrices.length ? Math.max(...finalPrices) : null,
      inStock: variants.some((v) => v.stock > 0),
    };
  });


  if (sort === "price_asc") products.sort((a, b) => (a.minPrice ?? 0) - (b.minPrice ?? 0));
  if (sort === "price_desc") products.sort((a, b) => (b.minPrice ?? 0) - (a.minPrice ?? 0));

  return { products, total };
};


 const getProductById = async (productId: string) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: productDetailInclude,
  });
  if (!product) throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
  return product;
};

 const getProductBySlug = async (slug: string) => {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: productDetailInclude,
  });
  if (!product) throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
  return product;
};

 const createProduct = async (body: CreateProductBody) => {
  const { variants, categoryIds, ...data } = body;

  const variantsData = variants.map((v, i) => ({
    ...v,
    isDefault: variants.some((x) => x.isDefault) ? v.isDefault : i === 0,
  }));


  const [cats] = await Promise.all([
    prisma.category.count({ where: { id: { in: categoryIds } } }),
  ]);
  if (cats !== new Set(categoryIds).size)
    throw new AppError("Some categories not found", 400, "CATEGORY_NOT_FOUND");
  

  try {
    return await prisma.product.create({
      data: {
        ...data,
        slug:slugify(data.title),
        details: data.details as Prisma.InputJsonValue | undefined,
        rateAvg: 0,
        rateCount: 0,
        variants: { create: variantsData },
        categories: {
          create: [...new Set(categoryIds)].map((categoryId) => ({ categoryId })),
        },
      },
      include: {
        variants: true,
        images: { orderBy: { sortOrder: "asc" } },
        categories: { include: { category: true } },
        collections: { include: { collection: true } },
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const target = (e.meta?.target as string[] | string | undefined)?.toString() ?? "";
      if (target.includes("sku")) throw new AppError("SKU already exists", 409, "SKU_EXISTS");
      if (target.includes("slug")) throw new AppError("Slug already exists", 409, "SLUG_EXISTS");
      throw new AppError("Duplicate value", 409, "DUPLICATE");
    }
    throw e;
  }
};

 const addProductImages = async (
  productId: string,
  files: Express.Multer.File[],
  alts: string[]
) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");

  const existingCount = await prisma.productImage.count({ where: { productId } });
  if (existingCount + files.length > 10)
    throw new AppError("A product can have at most 10 images", 400, "IMAGE_LIMIT_EXCEEDED");

  const hasMain = !!(await prisma.productImage.findFirst({
    where: { productId, isMain: true },
    select: { id: true },
  }));

  const urls = files.map(getProductImageUrl);

  const data = urls.map((url, i) => ({
    productId,
    url,
    alt: alts[i]?.trim() || null,
    isMain: i === 0 && !hasMain,
    sortOrder: existingCount + i,
  }));

  await prisma.productImage.createMany({ data });

  return prisma.productImage.findMany({
    where: { productId, sortOrder: { gte: existingCount } },
    orderBy: { sortOrder: "asc" },
  });
};

 const removeProductImage = async (productId: string, imageId: string) => {
  const image = await prisma.productImage.findFirst({
    where: { id: imageId, productId },
  });
  if (!image) throw new AppError("Image not found", 404, "IMAGE_NOT_FOUND");

  await prisma.$transaction(async (tx) => {
    await tx.productImage.delete({ where: { id: imageId } });

    if (image.isMain) {
      const next = await tx.productImage.findFirst({
        where: { productId },
        orderBy: { sortOrder: "asc" },
      });
      if (next) {
        await tx.productImage.update({
          where: { id: next.id },
          data: { isMain: true },
        });
      }
    }
  });

  await deleteProductImageFile(image.url);
};

 const setMainProductImage = async (productId: string, imageId: string) => {
  const image = await prisma.productImage.findFirst({
    where: { id: imageId, productId },
    select: { id: true },
  });
  if (!image) throw new AppError("Image not found", 404, "IMAGE_NOT_FOUND");

  // در یک transaction تا همیشه فقط یک عکس اصلی وجود داشته باشد
  return prisma.$transaction(async (tx) => {
    await tx.productImage.updateMany({
      where: { productId, isMain: true, NOT: { id: imageId } },
      data: { isMain: false },
    });

    return tx.productImage.update({
      where: { id: imageId },
      data: { isMain: true },
    });
  });
};


 const updateProduct = async (productId: string, input: UpdateProductInput) => {
  await assertProduct(productId);
  const { categoryIds, ...rest } = input;

  if (categoryIds) {
    const count = await prisma.category.count({ where: { id: { in: categoryIds } } });
    if (count !== new Set(categoryIds).size)
      throw new AppError("Category not found", 404, "CATEGORY_NOT_FOUND");
  }

  // slug عمداً تغییر نمی‌کند تا لینک‌های قبلی نشکنند
  return prisma.product.update({
    where: { id: productId },
    data: {
      ...rest,
      ...(categoryIds && {
        categories: {
          deleteMany: {}, // همه‌ی رابط‌های قبلی پاک و دوباره ساخته می‌شوند
          create: categoryIds.map((categoryId) => ({ categoryId })),
        },
      }),
    },
    include: { variants: true, images: true, categories: true },
  });
};

 const deleteProduct = async (productId: string) => {
  await assertProduct(productId);

  const images = await prisma.productImage.findMany({
    where: { productId },
    select: { url: true },
  });

  await prisma.$transaction([
    prisma.productImage.deleteMany({ where: { productId } }),
    prisma.productVariant.deleteMany({ where: { productId } }),
    prisma.productCategory.deleteMany({ where: { productId } }),
    prisma.productCollection.deleteMany({ where: { productId } }),
    prisma.product.delete({ where: { id: productId } }),
  ]);

  await Promise.allSettled(images.map((i) => deleteProductImageFile(i.url)));
};

 const addVariant = async (productId: string, input: CreateVariantInput) => {
  await assertProduct(productId);
  return prisma.productVariant.create({ data: { ...input, productId } });
};

 const updateVariant = async (
  productId: string,
  variantId: string,
  input: UpdateVariantInput
) => {
  const v = await prisma.productVariant.findFirst({ where: { id: variantId, productId } });
  if (!v) throw new AppError("Variant not found", 404, "VARIANT_NOT_FOUND");
  return prisma.productVariant.update({ where: { id: variantId }, data: input });
};

 const deleteVariant = async (productId: string, variantId: string) => {
  const v = await prisma.productVariant.findFirst({ where: { id: variantId, productId } });
  if (!v) throw new AppError("Variant not found", 404, "VARIANT_NOT_FOUND");

  const count = await prisma.productVariant.count({ where: { productId } });
  if (count <= 1)
    throw new AppError("Product needs at least one variant", 409, "LAST_VARIANT");

  await prisma.productVariant.delete({ where: { id: variantId } });
};

const switchActiveProduct = async(productId:string)=>{
    const p = await prisma.product.findFirst({where:{id:productId}});
    if(!p) throw new AppError("Product not found",404,"PRODUCT_NOT_FOUND");

    await prisma.product.update({where:{id:p.id},data:{isActive:!p.isActive}});
}

const switchActiveProductVariant = async(productId:string,variantId:string)=>{
    const v = await prisma.productVariant.findFirst({where:{id:variantId,productId}});
    if(!v) throw new AppError("Variant not found",404,"VARIANT_NOT_FOUND");

    await prisma.productVariant.update({where:{id:v.id},data:{isActive:!v.isActive}});
}



/////controller

const getAllProductWithPagination = async (req:Request, res:Response) => {
    
   const q = res.locals.query as ListProductsQuery;
   const userId = req.user?.userId ;
  const { products, total } = await listProducts(q,userId);
  

     sendSuccess(res, products, {
      meta: {
        page: q.page,
        limit: q.limit,
        total,
        totalPage: Math.ceil(total / q.limit),
      },
    });
};

const getProductByIdCtrl = async (req: Request, res: Response) =>{
  const productId = req.params.productId as string
  const data = await getProductById(productId)
  sendSuccess(res,data );
}

const getProductBySlugCtrl = async (req: Request, res: Response) =>{
  const slug = req.params.slug as string;
  const data = await getProductBySlug(slug)
  sendSuccess(res,data);
}

const postProduct = async (req: Request, res: Response) => {
  const product = await createProduct(req.body as CreateProductBody);
  return sendSuccess(res, product, { statusCode: 201, message: "Product created" });
};

 const postProductImage = async (req: Request, res: Response) => {
 const files = (req.files as Express.Multer.File[]) ?? [];
  if (files.length === 0) throw new AppError("At least one image is required", 400, "FILE_REQUIRED");
  const productId = req.params.productId as string;

  const image = await addProductImages(productId, files, req.body.alts);
  return sendSuccess(res, image, { statusCode: 201, message: "Image uploaded" });
};

 const deleteProductImage = async (req: Request, res: Response) => {
  const { productId, imageId } = req.params as {productId:string,imageId:string};

  await removeProductImage(productId, imageId);
  return sendSuccess(res, null, { message: "Image deleted" });
};

const setProductImageMain = async (req: Request, res: Response) => {
  const { productId, imageId } = req.params as {productId:string,imageId:string};
  const image = await setMainProductImage(productId, imageId);
  return sendSuccess(res, image, { message: "Main image updated" });
};

 const editProduct = async (req: Request, res: Response) =>{
  const productId = req.params.productId as string;
  const data = await updateProduct(productId, req.body)
  sendSuccess(res,data , { message: "Product updated" });
}

 const removeProduct = async (req: Request, res: Response) => {
  const productId = req.params.productId as string;
  await deleteProduct(productId);
  return sendSuccess(res, null, { message: "Product deleted" });
};

 const postVariant = async (req: Request, res: Response) =>{
  const productId = req.params.productId as string;
  const data = await addVariant(productId, req.body)
  res.status(201) && sendSuccess(res,data , { message: "Variant created" });
}

 const editVariant = async (req: Request, res: Response) =>{
  const {variantId,productId} = req.params as {productId:string,variantId:string};
  const data =  await updateVariant(productId,variantId, req.body)
  sendSuccess(res,data, { message: "Variant updated" });
}

const removeVariant = async (req: Request, res: Response) => {
  const {variantId,productId} = req.params as {productId:string,variantId:string};
  await deleteVariant(productId,variantId);
  return sendSuccess(res, null, { message: "Variant deleted" });
};

const setProductActive = async(req:Request,res:Response) => {
    const productId = req.params.productId as string;
    await switchActiveProduct(productId);
    sendSuccess(res,null,{message:"product active situation changed"});
}

const setProductVariantActive = async(req:Request,res:Response) => {
    const {productId,variantId} = req.params as {productId:string,variantId:string}
    await switchActiveProductVariant(productId,variantId);
    sendSuccess(res,null,{message:"product active situation changed"});
}



export default {
    getAllProductWithPagination,
    getProductByIdCtrl,
    getProductBySlugCtrl,
    postProduct,
    postProductImage,
    deleteProductImage,
    setProductImageMain, 
    
    editProduct,
    removeProduct,
    postVariant,
    editVariant,
    removeVariant,
    setProductActive,
    setProductVariantActive

}