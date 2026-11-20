import "dotenv/config"
import cors from "cors";
import type { Request,Response,RequestHandler } from "express";
// import {globalError_Middleware} from "./middleware/error_middleware.ts";
import { global_errorHandler } from "./middleware/response_hanlder.ts";
import express from "express";

import {product_route} from "./module/product/product_route.ts"
import {cat_route} from "./module/category&collection/category_route.ts"
import {auth_route} from "./module/user/auth_route.ts";
import {user_route} from "./module/user/user_route.ts";
import { fav_route } from "./module/product_intraction/favorite/favorite_route.ts";
import { comment_route } from "./module/product_intraction/comment/comment_route.ts";

const app = express();
const port = process.env.PORT;

app.use(cors());
app.use(express.json());
app.use("/uploads/product", express.static("src/uploads/product"));

app.use("/",auth_route);
app.use("/user",user_route);
app.use("/category",cat_route);
app.use("/product",product_route);
app.use("/product/comment",comment_route);
app.use("/favorite",fav_route);


app.get("/",(req:Request,res:Response)=>{

    res.status(200).send("<style>body{background:black} h1{color:red}</style><h1>course platform server is running . . .</h1>");
});



app.use(global_errorHandler);
app.listen(port,()=>console.log(`server is running on port:${port}`));
