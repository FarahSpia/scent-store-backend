import {AppError} from "./response_hanlder.ts"
import type { NextFunction,Request,Response } from "express";

import type {tokenType,userRole} from "../types/public_Types.ts";



const authorize = (roles:userRole[])=> {
   return (req:Request,res:Response,next:NextFunction)=>{
    
    const user = req.user as tokenType;
    const Role = user.role as userRole;

    if (!user) {
      throw new AppError("Unauthorized", 401);
      
    }

    if(roles.length &&  !roles.includes(Role)){
       throw new AppError("you dont have premission",401);
    }

    next();

}
}

export {
    authorize
}
   


