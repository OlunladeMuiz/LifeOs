import { Router, Request, Response, NextFunction } from "express";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { z } from "zod";
import { logger } from "../utils/logger";

export const authRouter = Router();

// Async handler wrapper to catch errors
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const generateTokens = (userId: string) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET || "secret",
    { expiresIn: "1h" }
  );

  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET || "refresh-secret",
    { expiresIn: "7d" }
  );

  return { accessToken, refreshToken };
};

authRouter.post("/register", asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = RegisterSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError(400, "email_already_exists", "Email already registered");
  }

  const passwordHash = await bcryptjs.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, password: passwordHash },
  });

  const { accessToken, refreshToken } = generateTokens(user.id);

  res.status(201).json({
    ok: true,
    data: {
      user: { id: user.id, email: user.email },
      accessToken,
      refreshToken,
    },
  });
}));

authRouter.post("/login", asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = LoginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError(401, "invalid_credentials", "Invalid credentials");
  }

  const passwordMatch = await bcryptjs.compare(password, user.password);
  if (!passwordMatch) {
    throw new AppError(401, "invalid_credentials", "Invalid credentials");
  }

  const { accessToken, refreshToken } = generateTokens(user.id);

  res.json({
    ok: true,
    data: {
      user: { id: user.id, email: user.email },
      accessToken,
      refreshToken,
    },
  });
}));

authRouter.post("/refresh", asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new AppError(400, "missing_token", "Refresh token required");
  }

  const decoded = jwt.verify(
    refreshToken,
    process.env.JWT_REFRESH_SECRET || "refresh-secret"
  ) as { userId: string };

  const accessToken = jwt.sign(
    { userId: decoded.userId },
    process.env.JWT_SECRET || "secret",
    { expiresIn: "1h" }
  );

  res.json({
    ok: true,
    data: { accessToken },
  });
}));
