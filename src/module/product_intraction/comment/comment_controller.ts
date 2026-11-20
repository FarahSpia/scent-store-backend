import {prisma} from "../../../util/prisma.util.ts";
import { Prisma } from "../../../generated/prisma/client.ts";

import type { Request,Response } from "express";
import {sendSuccess,AppError} from "../../../middleware/response_hanlder.ts";

import type { 
   
 } from "./comment_validate.ts";


//Logic

//likeDislikeLogic
const toBooleanReaction=(type: "Like" | "DisLike" | null)=> {
  return {
    isLiked: type === "Like",
    isDisliked: type === "DisLike",
  };
}

 const setReactionComment =async(commentId:string,userId:string,type:"Like" | "DisLike")=>{
 
    const key = { userId_commentId : { userId,commentId } }

  return await prisma.$transaction(async (tx) => {
       
    const existing = await tx.likeComment.findUnique({
      where: key,
    });
    
    let finalType : "Like" | "DisLike" | null;

    if (!existing) {
     
      await tx.likeComment.create({ data: { userId, commentId, type } });
      if (type === "Like") {
        await tx.comment.update({
          where: { id: commentId },
          data: { like: { increment: 1 } },
        });
      } else {
        await tx.comment.update({
          where: { id: commentId },
          data: { dislike: { increment: 1 } },
        });
    
      }
      finalType = type;
    } 
    
    else if (existing.type === type) {
     
      await tx.likeComment.delete({ where: key });
      if (type === "Like") {
        await tx.comment.update({
          where: { id: commentId },
          data: { like: { decrement: 1 } },
        });
      } else {
        await tx.comment.update({
          where: { id: commentId },
          data: { dislike: { decrement: 1 } },
        });
      }
      finalType = null;
    } 
    
    else {
     
      await tx.likeComment.update({
        where: key,
        data: { type },
      });
      if (type === "Like") {
        await tx.comment.update({
          where: { id: commentId },
          data: {
            like: { increment: 1 },
            dislike: { decrement: 1 },
          },
        });
      } else {
        await tx.comment.update({
          where: { id: commentId },
          data: {
            dislike: { increment: 1 },
            like: { decrement: 1 },
          },
        });
      }
      finalType = type;
    }

  
    
    return { ...toBooleanReaction(finalType)};
  });
}

interface commentRequest {
    productId:string,
    userId:string,
    content:string,
    rate:number
}

const addComment = async({productId,userId,content,rate}:commentRequest):Promise<void>=>{
    if(rate > 5 || rate < 1) throw new AppError("rate isnt valid",400);
    await prisma.comment.create({
        data:{
            productId,
            userId,
            content,
            rate
        }
    })
}

const deleteComment = async(commentId:string,userId:string):Promise<void>=>{
    const c = await prisma.comment.findFirst({where:{id:commentId,userId}});
    if(!c) throw new AppError("the comment not found",404,"COMMENT_NOT_FOUND");
    await prisma.comment.delete({where:{id:c.id}});
}

interface updateCommentRequest {
     commentId:string,
     userId:string,
     rate:number,
     content:string
}

const updateComment = async({commentId,userId,rate,content}:updateCommentRequest):Promise<void>=>{
     const c = await prisma.comment.findFirst({where:{id:commentId,userId}});
    if(!c) throw new AppError("the comment not found",404,"COMMENT_NOT_FOUND");

    await prisma.comment.update({
        where:{id:c.id},
        data:{
            productId:c.productId,
            userId,
            content:content,
            rate:rate,
        }
    })
}


const getGreateComment = async()=>{
     
}





//controller

const getGoodComment = async(req:Request,res:Response)=>{
    
    

}


const comment = async(req:Request,res:Response)=>{
    const {productId,content,rate} = req.body;
    const userId = req.user?.userId as string;
    await addComment({productId,content,rate,userId});
    sendSuccess(res,null,{statusCode:200,message:"comment successfully"});

}

const removeComment = async(req:Request,res:Response)=>{
     const commentId = req.params.commentId as string;
     const userId = req.user?.userId as string;
     await deleteComment(commentId,userId);
     sendSuccess(res,null,{statusCode:200,message:"comment removed successfully"});
}

const editComment = async(req:Request,res:Response)=>{
      const commentId = req.params.commentId as string;
     const userId = req.user?.userId as string;
     const {content,rate} = req.body;
     await updateComment({commentId,userId,rate,content});
     sendSuccess(res,null,{statusCode:200,message:"comment edited successfully"})
}

const likeComment = async(req:Request,res:Response)=>{
     const commentId = req.params.commentId as string;
     const userId = req.user?.userId as string;
     const result = await setReactionComment(commentId,userId,"Like");
     const message = result.isLiked ? 'comment liked' : "like removed";
     sendSuccess(res,null,{message});
}

const dislikeComment = async(req:Request,res:Response)=>{
     const commentId = req.params.commentId as string;
     const userId = req.user?.userId as string;
     const result = await setReactionComment(commentId,userId,"DisLike");
     const message = result.isDisliked ? 'comment disliked' : "dislike removed";
     sendSuccess(res,null,{message});
}



 export default {
     addComment,
     likeComment,
     dislikeComment,
     editComment,
     removeComment,
     comment

}