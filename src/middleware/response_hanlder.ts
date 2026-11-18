import type {NextFunction, Request, Response} from "express";
import { ZodSchema } from "zod";

// types
export interface SuccessResponse<T> {
  success: true;
  message?: string;
  data: T | null;
  meta?: { page: number; limit: number; totalPage?:number; total: number };
}

export interface ErrorResponse {
  success: false;
  message: string;
  error: {
    code: string;
    details?: { field?: string; message: string }[];
  };
}


const sendSuccess = <T>(
  res: Response,
  data: T | null = null,
  options: { statusCode?: number;redirect?:string ;message?: string; meta?: SuccessResponse<T>["meta"] } = {}
) => {
  const { statusCode = 200, message, meta } = options;
  const body: SuccessResponse<T> = { success: true, message, data, meta };
  return res.status(statusCode).json(body);
};

class AppError extends Error {
  constructor(
    public message: string,
    public statusCode = 500,
    public code = "INTERNAL_ERROR",
    public details?: { field?: string; message: string }[]
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const isApp = err instanceof AppError;
  const statusCode = isApp ? err.statusCode : 500;

  const body: ErrorResponse = {
    success: false,
    message: isApp ? err.message : "Internal server error",
    error: {
      code: isApp ? err.code : "INTERNAL_ERROR",
      details: isApp ? err.details : undefined,
    },
  };
  if (!isApp) console.error(err);
  res.status(statusCode).json(body);
};

 const validate =
  (schema: { body?: ZodSchema; query?: ZodSchema; params?: ZodSchema }) =>
  (req: Request, res: Response, next: NextFunction) => {
    const details: { field: string; message: string }[] = [];

    for (const key of ["body", "query", "params"] as const) {
      const s = schema[key];
      if (!s) continue;

      const result = s.safeParse(req[key]);
      if (!result.success) {
        details.push(
          ...result.error.issues.map((i) => ({
            field: [key, ...i.path].join("."),
            message: i.message,
          }))
        );
      } else if (key === "query") {
        res.locals.query = result.data; 
      } else {
        (req as any)[key] = result.data;
      }
    }

    if (details.length) {
      throw new AppError("Validation failed", 400, "VALIDATION_ERROR", details);
    }
    next();
  };


export {
    
    sendSuccess,
    AppError,
    errorHandler,
    validate
  
};