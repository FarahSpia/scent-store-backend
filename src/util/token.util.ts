import jwt from "jsonwebtoken";
import "dotenv/config";
import { AppError } from "../middleware/response_hanlder.ts";
import crypto from "crypto";

import type { tokenType } from "../types/public_Types.ts";


const create_accessToken = (data:tokenType)=>{

 const  JWTsecret = process.env.JWT_ACCESS_SECRET;
 
 if(!JWTsecret) throw new AppError("jwtSecret undefined",500,"JWTSECRET_UNDEFINED");

 const token = jwt.sign(data,JWTsecret,{expiresIn: "15m"});
  
 return token;
}


const verify_accessToken = (token:string)=>{

   const  JWTsecret = process.env.JWT_ACCESS_SECRET;
   
   if(!JWTsecret) throw new AppError("jwtSecret undefined",500,"JWTSECRET_UNDEFINED");

   try{
   const verifyedToken = jwt.verify(token,JWTsecret);

   return verifyedToken

   }catch(error){
      if (error instanceof Error) {
      if (error.name === 'TokenExpiredError') {
        return null;
      }
      if (error.name === 'JsonWebTokenError') {
        return null;
      }
    }
      throw error;
   }
 
}


////////

const create_refreshToken = ():string=>{
  return crypto.randomBytes(40).toString('hex')
}

const hash_refreshToken =(token: string): string=>{
  return crypto.createHash('sha256').update(token).digest('hex')
}

const tokenExpiry=(): Date=> {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
}


export  {
    create_accessToken,
   
   verify_accessToken,
   create_refreshToken,
  
   hash_refreshToken,
   tokenExpiry
}

