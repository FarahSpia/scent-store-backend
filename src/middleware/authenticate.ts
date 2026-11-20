import {verify_accessToken} from "../util/token.util.ts";
import {AppError} from "./response_hanlder.ts"
import type { NextFunction,Request,Response } from "express";

import type { tokenType} from "../types/public_Types.ts";


const authenticate = (req:Request,res:Response,next:NextFunction)=>{
    
     let token = req.headers['authorization'];
     token = token?.split(" ")[1];
   
    if(!token) {
      throw new AppError("authentication failed,no token provided",401);
    }

    const checkToken = verify_accessToken(token) as tokenType;
    if(!checkToken) throw new AppError("the token is expired or invalid",401);

    req.user = {
         userId:checkToken.userId,
         role:checkToken.role 
    }


    next();

}

const optionalAuthenticate = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const authorization = req.headers.authorization;
  const [scheme, token] = authorization?.split(" ") ?? [];

  
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return next();
  }

  try {
    const checkToken = verify_accessToken(token) as tokenType;

    req.user = {
      userId: checkToken.userId,
      role: checkToken.role,
    };
  } catch {}

  return next();
};




export {
    authenticate,
     optionalAuthenticate
    
};