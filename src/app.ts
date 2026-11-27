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
import { order_route } from "./module/order/order_route.ts";
import { shipping_route } from "./module/order_Dependencies/shipping_method/shipping_route.ts";
import { discount_route } from "./module/order_Dependencies/discount_code/discount_route.ts";
import { province_route } from "./module/order_Dependencies/province/province_route.ts";
import { city_route } from "./module/order_Dependencies/city/city_route.ts";

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
app.use("/order",order_route);
app.use("/shipping-method",shipping_route);
app.use("/discount",discount_route);
app.use("/province",province_route);
app.use("/city",city_route);


app.get("/",(req:Request,res:Response)=>{

    res.status(200).send("<style>body{background:black} h1{color:red}</style><h1>course platform server is running . . .</h1>");
});



app.use(global_errorHandler);
app.listen(port,()=>console.log(`server is running on port:${port}`));
