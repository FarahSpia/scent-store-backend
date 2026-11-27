import express from "express";
const order_route = express.Router();

import order_controller from "./order_controller.ts";
import { validate } from "../../middleware/response_hanlder.ts";
import { authenticate } from "../../middleware/authenticate.ts";
import { authorize } from "../../middleware/authorize.ts";
import {
    createOrderSchema,
    paymentCallbackSchema,
    listOrdersSchema,
    orderIdSchema,
    updateOrderStatusSchema
} from "./order_validate.ts";

order_route.get("/payment/callback",validate(paymentCallbackSchema),order_controller.paymentCallback);
order_route.get("/all",authenticate,authorize(["Admin"]),validate(listOrdersSchema),order_controller.getAllOrders);
order_route.get("/",authenticate,validate(listOrdersSchema),order_controller.getMyOrders);
order_route.post("/",authenticate,validate(createOrderSchema),order_controller.postOrder);
order_route.get("/:orderId",authenticate,validate(orderIdSchema),order_controller.getOrder);
order_route.patch("/:orderId/cancel",authenticate,validate(orderIdSchema),order_controller.cancelOrder);
order_route.patch("/:orderId/status",authenticate,authorize(["Admin"]),validate(updateOrderStatusSchema),order_controller.editOrderStatus);

export {
    order_route
}
