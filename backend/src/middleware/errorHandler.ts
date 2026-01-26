import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('[ERROR HANDLER]', err);
  logger.error('Request failed', err, { path: req.path, method: req.method });

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      ok: false,
      error: err.code,
      message: err.message,
    });
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      ok: false,
      error: "validation_error",
      message: "Invalid request data",
      details: err.errors,
    });
  }

  // Handle Prisma unique constraint errors
  if ((err as any).code === 'P2002') {
    return res.status(400).json({
      ok: false,
      error: "duplicate_entry",
      message: "This record already exists",
    });
  }

  res.status(500).json({
    ok: false,
    error: "internal_server_error",
    message: "An unexpected error occurred. Please try again or contact support if the issue persists.",
  });
};
