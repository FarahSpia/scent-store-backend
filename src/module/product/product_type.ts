import type {Request} from "express";

import { AccountType } from "../../types/model_type.ts";
export type productFilterRequest = Request & {
    query:{
     search?:string,
       page?:string,
       limit?:string,
       sort?:string,
       order?:"asc" | "desc",
       minPrice?:string,
       maxPrice?:string,
       category?:string
    }
}

export interface productInfo {
   
    title?:{
        contains: string;
    },
    category?:{
    some?:{
      name:{contains:string,mode:"insensitive"}
    }
   },
    price?:{
        gte?:number,
        lte?:number
    },
   
}


export type productCreateRequest = Request & {
      body:{
        title:string,
        description:string ,
        price:number,
        categoryId:string,
        productTopics:string[]
      };
      file:{
        filename:string
      }
     
}


export type createLessonRequest = Request & {
     body:{
       topicId:string,
       lessonName:string
     };
     file:{
      filename:string
     }
}