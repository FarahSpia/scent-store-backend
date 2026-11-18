import { Request } from "express";

export type tokenType =  {
    userId: string,
    role?: userRole 
};

export interface AuthRequest extends Request {
      user?:tokenType
}


//////////////////////////////////////
export const AccountType = {
  User: "User",
  Admin: "Admin"
} as const;
export type userRole = typeof AccountType[keyof typeof AccountType];

/////////////////////////////////