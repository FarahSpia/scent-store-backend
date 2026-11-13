import "dotenv/config"
import cors from "cors";
import type { Request,Response,RequestHandler } from "express";
import {globalError_Middleware} from "./middleware/error_middleware.ts";
import express from "express";
import {product_route} from "./module/product/product_route.ts"
const app = express();
const port = process.env.PORT;

app.use(cors());
app.use(express.json());

app.use("/product",product_route);

app.get("/",(req:Request,res:Response)=>{

    res.status(200).send("<style>body{background:black} h1{color:red}</style><h1>course platform server is running . . .</h1>");
});



app.use(globalError_Middleware);
app.listen(port,()=>console.log(`server is running on port:${port}`));
