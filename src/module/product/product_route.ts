import express from "express";
const product_route = express.Router();
import product_controller from "./product_controller.ts";

product_route.get("/",product_controller.getAllProductWithPagination);


export {
    product_route
}