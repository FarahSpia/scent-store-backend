import type { tokenType } from "./public_Types.ts";

declare global {
  namespace Express {
    interface Request {
      user?: tokenType;
    }
  }
}

export {}
