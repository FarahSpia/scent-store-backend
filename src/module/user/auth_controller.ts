import {prisma} from "../../util/prisma.util.ts";
import { Prisma } from "../../generated/prisma/client.ts";

import type { Request,Response } from "express";
import {sendSuccess,AppError} from "../../middleware/response_hanlder.ts";


import { 
    create_accessToken,
    create_refreshToken,
    hash_refreshToken,
    verify_accessToken,
    tokenExpiry
 } from "../../util/token.util.ts";

 import {
    hashCode,
    generateCode,
    codeProperties
 } from "../../util/code.util.ts";


//Logic

const code_Sender = async(phoneNumber:string)=>{
    const c = await prisma.otpCode.findFirst({where:{phoneNumber}});
    
    if( c && Date.now() - c.createdAt.getTime() < codeProperties.resend_Code_Time){
        throw new AppError("please wait a minute and retry again",429,"RESEND_TIME");
    }

    const code = generateCode();
    
    await prisma.otpCode.deleteMany({where:{phoneNumber}});

    await prisma.otpCode.create({
        data:{
            phoneNumber,
            otpCode:hashCode(code),
            expiresAt:new Date(Date.now() + codeProperties.otpCode_expireTime), 
        }

    })

    
     return {code};
     
}

const LoginChecker = async(phoneNumber:string,otpCode:string)=>{
    const otp = await prisma.otpCode.findFirst({where:{phoneNumber}});
    if(!otp || otp.expiresAt < new Date()){
        throw new AppError("otpCode is expired or doesnt exists",400,"EXPIRED_NOTFOUND");
    }

    if(otp.attempts >= codeProperties.max_Attempts){
        throw new AppError("Excessive effort",429,"EXESSIVE_EFFORT")
    }

    if(otp.otpCode !== hashCode(otpCode)){
        await prisma.otpCode.update({
            where:{id:otp.id},
            data:{attempts:{increment:1}}
        })

        throw new AppError("otpCode isn't valid",400,"OTP_INVALID");
    }

    await prisma.otpCode.deleteMany({ where: { phoneNumber } });

    const user = await prisma.user.upsert({
       where: {  phoneNumber },
       update: {},
       create: { phoneNumber },
       });
  

    const accessToken = create_accessToken({userId:user.id,role:user.role});   

    const refreshToken = create_refreshToken();
    
      await prisma.refreshToken.upsert({
        where:{userId:user.id},   
        update:{
            refreshToken:hash_refreshToken(refreshToken),
            expiresAt:tokenExpiry()
        },
        create:{
            userId:user.id,
            refreshToken:hash_refreshToken(refreshToken),
            expiresAt:tokenExpiry()
        },
    })

    
   return {user:{userId:user.id,role:user.role},accessToken:accessToken,refreshToken:refreshToken};


}



//controller

const Login_Request = async(req:Request,res:Response)=>{
    const {phoneNumber} = req.body;
     const data = await code_Sender(phoneNumber);
     
     sendSuccess(res,{otpCode:data.code},{statusCode:200,message:"code sent to your phone Number",redirect:"/login/otpcode"})
    
}

const Login_Completation = async(req:Request,res:Response)=>{
    const {phoneNumber,otpCode} = req.body;
    const data = await LoginChecker(phoneNumber,otpCode);
    sendSuccess(res,data,{statusCode:200,message:"Login done successfully",redirect:"/home"});
}


export default {
     Login_Request,
     Login_Completation

}