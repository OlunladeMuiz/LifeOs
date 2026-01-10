import { Router, Request, Response } from "express";
import { prisma } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { z } from "zod";

export const tasksRouter = Router();

const CreateTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  effort: z.number().min(1).default(50),
  impact: z.number().min(1).default(50),
  goalId: z.string().optional(),
});

const UpdateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  effort: z.number().min(1).optional(),
  impact: z.number().min(1).optional(),
  status: z.enum(["PENDING", "DONE", "SNOOZED"]).optional(),
  goalId: z.string().optional(),
});

// Valid status transitions
const validTransitions: Record<string, string[]> = {
  PENDING: ["DONE", "SNOOZED"],
  DONE: [],
  SNOOZED: ["PENDING"],
};

// Get tasks for user with optional filtering
tasksRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { status, goalId } = req.query;

    const where: any = { userId: req.userId };
    if (status) where.status = status;
    if (goalId) where.goalId = goalId;

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { effort: "desc" },
    });

    res.json({ ok: true, data: { tasks } });
  } catch (error) {
    throw new AppError(500, "internal_error", "Failed to fetch tasks");
  }
});

// Create task
tasksRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { title, description, effort, impact, goalId } =
      CreateTaskSchema.parse(req.body);

    const task = await prisma.task.create({
      data: {
        userId: req.userId!,
        title,
        description,
        effort,
        impact,
        goalId,
      },
    });

    res.status(201).json({ ok: true, data: task });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(400, "validation_error", "Invalid request");
  }
});

// Update task
tasksRouter.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = UpdateTaskSchema.parse(req.body);

    const task = await prisma.task.findUnique({ where: { id } });

    if (!task) {
      throw new AppError(404, "task_not_found", "Task not found");
    }

    if (task.userId !== req.userId) {
      throw new AppError(403, "not_owner", "Not authorized");
    }

    // Validate status transition
    if (updates.status && !validTransitions[task.status]?.includes(updates.status)) {
      throw new AppError(
        409,
        "invalid_status_transition",
        `Cannot transition from ${task.status} to ${updates.status}`
      );
    }

    const updated = await prisma.task.update({
      where: { id },
      data: {
        ...updates,
        completedAt: updates.status === "DONE" ? new Date() : null,
      },
    });

    res.json({ ok: true, data: updated });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(400, "validation_error", "Invalid request");
  }
});

// Delete task
tasksRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const task = await prisma.task.findUnique({ where: { id } });

    if (!task) {
      throw new AppError(404, "task_not_found", "Task not found");
    }

    if (task.userId !== req.userId) {
      throw new AppError(403, "not_owner", "Not authorized");
    }

    await prisma.task.delete({ where: { id } });

    res.status(204).send();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, "internal_error", "Failed to delete task");
  }
});
