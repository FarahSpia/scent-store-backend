import crypto from "crypto";


 const codeProperties = {
   otpCode_expireTime : 2 * 60 * 1000,  //2m to expire
   resend_Code_Time : 1 * 60 * 1000,   //1m for resend new code
   max_Attempts : 5     
}


const generateCode = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

const hashCode = (otp: string): string => {
  return crypto.createHash("sha256").update(otp).digest("hex");
};



export  {
    generateCode,
    hashCode,
    codeProperties
}