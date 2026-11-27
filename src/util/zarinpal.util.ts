import "dotenv/config"
import { AppError } from "../middleware/response_hanlder.ts";

const zarinpalBase = process.env.ZARINPAL_BASE ?? "https://sandbox.zarinpal.com";
const merchantId = process.env.ZARINPAL_MERCHANT_ID as string;

interface paymentRequestInput {
    amount:number,
    callbackUrl:string,
    description:string,
    phoneNumber?:string
}

interface zarinpalResponse<T> {
    data: T | [],
    errors: { code:number, message:string } | []
}

const postToZarinpal = async<T>(path:string,body:object):Promise<zarinpalResponse<T>>=>{
    try {
        const response = await fetch(`${zarinpalBase}/pg/v4/payment/${path}`,{
            method:"POST",
            headers:{"Content-Type":"application/json",Accept:"application/json"},
            body:JSON.stringify({merchant_id:merchantId,...body})
        });
        return await response.json() as zarinpalResponse<T>;
    } catch {
        throw new AppError("payment gateway is not available",502,"GATEWAY_UNAVAILABLE");
    }
}

const requestPayment = async({amount,callbackUrl,description,phoneNumber}:paymentRequestInput)=>{
    const result = await postToZarinpal<{code:number,authority:string}>("request.json",{
        amount,
        currency:"IRT",
        callback_url:callbackUrl,
        description,
        metadata: phoneNumber ? {mobile:phoneNumber} : undefined
    });

    const data = result.data as {code:number,authority:string};
    if(Array.isArray(result.data) || data.code !== 100)
        throw new AppError("cant create payment request",502,"GATEWAY_REQUEST_FAILED");

    return {
        authority:data.authority,
        paymentUrl:`${zarinpalBase}/pg/StartPay/${data.authority}`
    };
}

const verifyPayment = async(amount:number,authority:string)=>{
    const result = await postToZarinpal<{code:number,ref_id:number}>("verify.json",{amount,authority});

    if(Array.isArray(result.data)) return {verified:false,refId:null};

    const data = result.data as {code:number,ref_id:number};
    //100 => verified , 101 => already verified
    if(data.code === 100 || data.code === 101) return {verified:true,refId:String(data.ref_id)};

    return {verified:false,refId:null};
}

export {
    requestPayment,
    verifyPayment
}
