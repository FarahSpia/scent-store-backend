import express from "express";
const auth_route = express.Router();

 import auth_controller from "./auth_controller.ts";
// import user_controller from "./user_controller.ts";
import { validate } from "../../middleware/response_hanlder.ts";
import {
   LoginRequestSchema,
   LoginCompletationSchema,
   refresh_TokenSchema
} from "./user_validate.ts"
import { authenticate } from "../../middleware/authenticate.ts";

auth_route.post("/login",validate(LoginRequestSchema),auth_controller.Login_Request);
auth_route.post("/login/otpCode",validate(LoginCompletationSchema),auth_controller.Login_Completation);
auth_route.post("/refreshToken",authenticate,validate(refresh_TokenSchema),auth_controller.refreshAccessToken);

export {
    auth_route
}