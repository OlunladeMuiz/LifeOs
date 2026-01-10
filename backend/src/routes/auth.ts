import { Router, Request, Response } from "express";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { z } from "zod";

export const authRouter = Router();

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

authRouter.post("/register", async (req: Request, res: Response) => {
  try {
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
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    // Handle Prisma errors
    if ((error as any).code === 'P2002') {
      throw new AppError(400, "email_already_exists", "Email already registered");
    }
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      throw new AppError(400, "validation_error", "Invalid email or password format");
    }
    
    console.error('Register error:', error);
    throw new AppError(500, "server_error", "Failed to create account");
  }
});

authRouter.post("/login", async (req: Request, res: Response) => {
  try {
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
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(400, "validation_error", "Invalid request");
  }
});

authRouter.post("/refresh", async (req: Request, res: Response) => {
  try {
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
  } catch {
    throw new AppError(401, "invalid_token", "Invalid refresh token");
  }
});
