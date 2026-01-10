import { Router, Request, Response } from "express";
import { prisma } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { z } from "zod";

export const contextRouter = Router();

const CreateContextSchema = z.object({
  date: z.string(), // YYYY-MM-DD format
  energyLevel: z.enum(["LOW", "MEDIUM", "HIGH"]),
  availableMinutes: z.number().min(0),
  stressLevel: z.number().min(0).optional(),
});

// Get today's context
contextRouter.get("/today", async (req: Request, res: Response) => {
  try {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

    const context = await prisma.dailyContext.findUnique({
      where: {
        userId_date: {
          userId: req.userId!,
          date: dateStr,
        },
      },
    });

    if (!context) {
      return res.json({
        ok: true,
        data: {
          date: dateStr,
          energyLevel: null,
          availableMinutes: null,
          stressLevel: null,
        },
      });
    }

    res.json({
      ok: true,
      data: {
        date: context.date,
        energyLevel: context.energyLevel,
        availableMinutes: context.availableMinutes,
        stressLevel: context.stressLevel,
      },
    });
  } catch (error) {
    throw new AppError(500, "internal_error", "Failed to fetch context");
  }
});

// Create or update context
contextRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { date, energyLevel, availableMinutes, stressLevel } =
      CreateContextSchema.parse(req.body);

    const context = await prisma.dailyContext.upsert({
      where: {
        userId_date: {
          userId: req.userId!,
          date: date,
        },
      },
      update: {
        energyLevel,
        availableMinutes,
        stressLevel,
      },
      create: {
        userId: req.userId!,
        date: date,
        energyLevel,
        availableMinutes,
        stressLevel,
      },
    });

    res.status(201).json({
      ok: true,
      data: {
        date: context.date,
        energyLevel: context.energyLevel,
        availableMinutes: context.availableMinutes,
        stressLevel: context.stressLevel,
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(400, "validation_error", "Invalid request");
  }
});
