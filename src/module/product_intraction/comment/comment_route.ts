import express from "express";
const comment_route = express.Router();

import { productImage_Uploader } from "../../../util/file.util.ts";
import comment_controller from "./comment_controller.ts";
import { validate } from "../../../middleware/response_hanlder.ts";
import { 
   commentIdSchema,
   editCommentSchema,
   createCommentSchema
} from "./comment_validate.ts";
import { authenticate } from "../../../middleware/authenticate.ts";

comment_route.post("/",authenticate,validate(createCommentSchema),comment_controller.comment);
comment_route.delete("/:commentId",authenticate,validate(commentIdSchema),comment_controller.removeComment);
comment_route.put("/:commentId",authenticate,validate(editCommentSchema),comment_controller.editComment);
comment_route.post("/:commentId/like",authenticate,validate(commentIdSchema),comment_controller.likeComment);
comment_route.post("/:commentId/dislike",authenticate,validate(commentIdSchema),comment_controller.dislikeComment);


export {
    comment_route
}