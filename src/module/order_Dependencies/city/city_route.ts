import express from "express";
const city_route = express.Router();

import city_controller from "./city_controller.ts";
import { validate } from "../../../middleware/response_hanlder.ts";
import { authenticate, optionalAuthenticate } from "../../../middleware/authenticate.ts";
import { authorize } from "../../../middleware/authorize.ts";
import {
    listCitySchema,
    createCitySchema,
    updateCitySchema,
    cityIdSchema
} from "./city_validate.ts";

city_route.get("/",optionalAuthenticate,validate(listCitySchema),city_controller.getAllCity);
city_route.get("/:cityId",optionalAuthenticate,validate(cityIdSchema),city_controller.getCity);
city_route.post("/",authenticate,authorize(["Admin"]),validate(createCitySchema),city_controller.postCity);
city_route.patch("/:cityId",authenticate,authorize(["Admin"]),validate(updateCitySchema),city_controller.editCity);
city_route.delete("/:cityId",authenticate,authorize(["Admin"]),validate(cityIdSchema),city_controller.removeCity);

export {
    city_route
}
