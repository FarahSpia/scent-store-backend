import express from "express";
const province_route = express.Router();

import province_controller from "./province_controller.ts";
import { validate } from "../../../middleware/response_hanlder.ts";
import { authenticate, optionalAuthenticate } from "../../../middleware/authenticate.ts";
import { authorize } from "../../../middleware/authorize.ts";
import {
    listProvinceSchema,
    createProvinceSchema,
    updateProvinceSchema,
    provinceIdSchema
} from "./province_validate.ts";

province_route.get("/",optionalAuthenticate,validate(listProvinceSchema),province_controller.getAllProvince);
province_route.get("/:provinceId",optionalAuthenticate,validate(provinceIdSchema),province_controller.getProvince);
province_route.post("/",authenticate,authorize(["Admin"]),validate(createProvinceSchema),province_controller.postProvince);
province_route.patch("/:provinceId",authenticate,authorize(["Admin"]),validate(updateProvinceSchema),province_controller.editProvince);
province_route.delete("/:provinceId",authenticate,authorize(["Admin"]),validate(provinceIdSchema),province_controller.removeProvince);

export {
    province_route
}
