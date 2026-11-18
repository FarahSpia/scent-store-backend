import express from "express";
const auth_route = express.Router();

 import auth_controller from "./auth_controller.ts";
// import user_controller from "./user_controller.ts";
import { validate } from "../../middleware/response_hanlder.ts";
import {
   LoginRequestSchema,
   LoginCompletationSchema
} from "./user_validate.ts"

auth_route.post("/login",validate(LoginRequestSchema),auth_controller.Login_Request);
auth_route.post("/login/otpCode",validate(LoginCompletationSchema),auth_controller.Login_Completation);

export {
    auth_route
}