import express from "express";
const fav_route = express.Router();

import { productImage_Uploader } from "../../../util/file.util.ts";
import favorite_controller from "./favorite_controller.ts";
import { validate } from "../../../middleware/response_hanlder.ts";
import { 
    listFavSchema,
    productIdSchema
} from "./favorite_validate.ts";
import { authenticate } from "../../../middleware/authenticate.ts";

fav_route.post("/:productId",authenticate,validate(productIdSchema),favorite_controller.favorite_product);
fav_route.get("/",authenticate,validate(listFavSchema),favorite_controller.getAllFavorite);


export {
    fav_route
}