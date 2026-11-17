import express from "express";
const cat_route = express.Router();

import { productImage_Uploader } from "../../util/file.util.ts";
import category_controller from "./category_controller.ts";
import { validate } from "../../middleware/response_hanlder.ts";
import { 
    listCategoriesSchema,
    createCategorySchema,
    categorySchema,
    categoryIdSchema,
    slugSchema
} from "./category_validate.ts";


cat_route.post("/",validate(createCategorySchema),category_controller.postCategory);
cat_route.get("/",validate(listCategoriesSchema),category_controller.getCategoryWithPagination);
cat_route.get("/:slug",validate(slugSchema),category_controller.getCategoryBySlug);
cat_route.delete("/:categoryId",validate(categoryIdSchema),category_controller.deleteCategory);
cat_route.post("/:categoryId/product/:productId",validate(categorySchema),category_controller.addProductToCat)
cat_route.delete("/:categoryId/product/:productId",validate(categorySchema),category_controller.deleteProductCategory);

export {
    cat_route
}