import express from "express";
const shipping_route = express.Router();

import shipping_controller from "./shipping_controller.ts";
import { validate } from "../../../middleware/response_hanlder.ts";
import { authenticate, optionalAuthenticate } from "../../../middleware/authenticate.ts";
import { authorize } from "../../../middleware/authorize.ts";
import {
    listShippingSchema,
    createShippingSchema,
    updateShippingSchema,
    shippingIdSchema
} from "./shipping_validate.ts";

shipping_route.get("/",optionalAuthenticate,validate(listShippingSchema),shipping_controller.getAllShipping);
shipping_route.get("/:shippingId",optionalAuthenticate,validate(shippingIdSchema),shipping_controller.getShipping);
shipping_route.post("/",authenticate,authorize(["Admin"]),validate(createShippingSchema),shipping_controller.postShipping);
shipping_route.patch("/:shippingId",authenticate,authorize(["Admin"]),validate(updateShippingSchema),shipping_controller.editShipping);
shipping_route.delete("/:shippingId",authenticate,authorize(["Admin"]),validate(shippingIdSchema),shipping_controller.removeShipping);

export {
    shipping_route
}
