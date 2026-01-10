import { Router, Request, Response } from "express";
import { prisma } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { z } from "zod";

export const goalsRouter = Router();

const CreateGoalSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  importance: z.number().min(1).default(50),
});

const UpdateGoalSchema = z.object({
  title: z.string().min(1).optional(),
  importance: z.number().min(1).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

// Get all goals for user
goalsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const goals = await prisma.goal.findMany({
      where: { userId: req.userId },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { importance: "desc" },
    });

    const data = goals.map((goal: any) => ({
      id: goal.id,
      title: goal.title,
      description: goal.description,
      status: goal.status,
      importance: goal.importance,
      createdAt: goal.createdAt,
      taskCount: goal._count.tasks,
    }));

    res.json({ ok: true, data: { goals: data } });
  } catch (error) {
    throw new AppError(500, "internal_error", "Failed to fetch goals");
  }
});

// Create goal (with max 3 active goals check)
goalsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { title, description, importance } = CreateGoalSchema.parse(req.body);

    // Check max active goals
    const activeCount = await prisma.goal.count({
      where: { userId: req.userId, status: "ACTIVE" },
    });

    if (activeCount >= 3) {
      throw new AppError(
        400,
        "max_active_goals_reached",
        "Maximum 3 active goals allowed"
      );
    }

    const goal = await prisma.goal.create({
      data: {
        userId: req.userId!,
        title,
        description,
        importance,
      },
    });

    res.status(201).json({
      ok: true,
      data: {
        id: goal.id,
        title: goal.title,
        description: goal.description,
        status: goal.status,
        importance: goal.importance,
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(400, "validation_error", "Invalid request");
  }
});

// Update goal
goalsRouter.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = UpdateGoalSchema.parse(req.body);

    const goal = await prisma.goal.findUnique({ where: { id } });

    if (!goal) {
      throw new AppError(404, "goal_not_found", "Goal not found");
    }

    if (goal.userId !== req.userId) {
      throw new AppError(403, "not_owner", "Not authorized");
    }

    const updated = await prisma.goal.update({
      where: { id },
      data: updates,
    });

    res.json({
      ok: true,
      data: {
        id: updated.id,
        title: updated.title,
        importance: updated.importance,
        status: updated.status,
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(400, "validation_error", "Invalid request");
  }
});

// Delete goal
goalsRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const goal = await prisma.goal.findUnique({ where: { id } });

    if (!goal) {
      throw new AppError(404, "goal_not_found", "Goal not found");
    }

    if (goal.userId !== req.userId) {
      throw new AppError(403, "not_owner", "Not authorized");
    }

    await prisma.goal.delete({ where: { id } });

    res.status(204).send();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, "internal_error", "Failed to delete goal");
  }
});
