import express from "express";
const discount_route = express.Router();

import discount_controller from "./discount_controller.ts";
import { validate } from "../../../middleware/response_hanlder.ts";
import { authenticate } from "../../../middleware/authenticate.ts";
import { authorize } from "../../../middleware/authorize.ts";
import {
    listDiscountSchema,
    createDiscountSchema,
    updateDiscountSchema,
    discountIdSchema
} from "./discount_validate.ts";

discount_route.get("/",authenticate,authorize(["Admin"]),validate(listDiscountSchema),discount_controller.getAllDiscount);
discount_route.get("/:discountId",authenticate,authorize(["Admin"]),validate(discountIdSchema),discount_controller.getDiscount);
discount_route.post("/",authenticate,authorize(["Admin"]),validate(createDiscountSchema),discount_controller.postDiscount);
discount_route.patch("/:discountId",authenticate,authorize(["Admin"]),validate(updateDiscountSchema),discount_controller.editDiscount);
discount_route.delete("/:discountId",authenticate,authorize(["Admin"]),validate(discountIdSchema),discount_controller.removeDiscount);

export {
    discount_route
}
