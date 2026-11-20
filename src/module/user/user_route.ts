import express from "express";
const user_route = express.Router();

import user_controller from "./user_controller.ts";
import { validate } from "../../middleware/response_hanlder.ts";

import {
    listUsersSchema,
    userIdSchema
} from "./user_validate.ts"
import { authorize } from "../../middleware/authorize.ts";
import { authenticate } from "../../middleware/authenticate.ts";

user_route.get("/",authenticate,authorize(["User","Admin"]),validate(listUsersSchema),user_controller.getAllUserWithPagination);
user_route.get("/:userId",authenticate,authorize(["User","Admin"]),validate(userIdSchema),user_controller.getUserById);




export {
    user_route
}