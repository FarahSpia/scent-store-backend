import express from "express";
const product_route = express.Router();

import { productImage_Uploader } from "../../util/file.util.ts";
import product_controller from "./product_controller.ts";
import { validate } from "../../middleware/response_hanlder.ts";
import { 
    listProductsSchema,
    createProductSchema,
    uploadProductImagesSchema,
    deleteProductImageSchema,
    setMainProductImageSchema,
    deleteProductSchema,
    updateProductSchema,
    createVariantSchema,
    updateVariantSchema,
    deleteVariantSchema,
    getProductByIdSchema,
    getProductBySlugSchema
} from "./product_validate.ts";

product_route.get("/",validate(listProductsSchema),product_controller.getAllProductWithPagination);
product_route.get("/:productId",validate(getProductByIdSchema),product_controller.getProductByIdCtrl);
product_route.get("/slug/:slug",validate(getProductBySlugSchema),product_controller.getProductBySlugCtrl);
product_route.post("/",validate(createProductSchema),product_controller.postProduct);
product_route.post("/:productId/image",productImage_Uploader.array("images", 10),validate(uploadProductImagesSchema),product_controller.postProductImage);
product_route.delete("/:productId/image/:imageId",validate(deleteProductImageSchema),product_controller.deleteProductImage);
product_route.patch("/:productId/image/:imageId/main",validate(setMainProductImageSchema),product_controller.setProductImageMain);

product_route.delete("/:productId",validate(deleteProductSchema),product_controller.removeProduct);
product_route.delete("/:productId/variant/:variantId",validate(deleteVariantSchema),product_controller.removeVariant);
product_route.patch("/:productId",validate(updateProductSchema),product_controller.editProduct);
product_route.post("/:productId/variant",validate(createVariantSchema),product_controller.postVariant);
product_route.patch("/:productId/variant/:variantId",validate(updateVariantSchema),product_controller.editVariant);
product_route.patch("/:productId/isActive",validate(deleteProductSchema),product_controller.setProductActive);
product_route.patch("/:productId/:variantId/isActive",validate(deleteVariantSchema),product_controller.setProductVariantActive);

export {
    product_route
}