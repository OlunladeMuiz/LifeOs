import { Router, Request, Response } from "express";
import { prisma } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";

export const decisionRouter = Router();

/**
 * Decision Engine Algorithm:
 * 1. Get today's context (energy, available minutes)
 * 2. Get active goals ranked by priority
 * 3. For each goal, find ready/inbox tasks that fit time constraints
 * 4. Return highest priority task with explanation
 */

decisionRouter.get("/next", async (req: Request, res: Response) => {
  try {
    // Get today's date as YYYY-MM-DD string
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    // Get today's context
    const context = await prisma.dailyContext.findUnique({
      where: {
        userId_date: {
          userId: req.userId!,
          date: dateStr,
        },
      },
    });

    const availableMinutes = context?.availableMinutes || 480; // 8 hours default
    const energyLevel = context?.energyLevel || "MEDIUM";
    const stressLevel = context?.stressLevel || 5;

    // Get active goals ordered by importance
    const goals = await prisma.goal.findMany({
      where: { userId: req.userId, status: "ACTIVE" },
      orderBy: { importance: "desc" },
    });

    if (goals.length === 0) {
      return res.json({
        ok: true,
        data: {
          recommendation: null,
          message: "No active goals. Create a goal to get recommendations.",
        },
      });
    }

    let bestTask = null;
    let bestGoal = null;

    // Iterate through goals by importance
    for (const goal of goals) {
      const tasks = await prisma.task.findMany({
        where: {
          userId: req.userId,
          goalId: goal.id,
          status: { in: ["PENDING"] },
        },
        orderBy: { effort: "desc" },
      });

      for (const task of tasks) {
        // Check if task fits in available time (effort approximates minutes)
        const effortMinutes = task.effort || 30;

        if (effortMinutes <= availableMinutes) {
          bestTask = task as any;
          bestGoal = goal as any;
          break;
        }
      }

      if (bestTask) break;
    }

    // If no task found in goals, check inbox tasks
    if (!bestTask) {
      const inboxTask = await prisma.task.findFirst({
        where: {
          userId: req.userId,
          goalId: null,
          status: { in: ["PENDING"] },
        },
        orderBy: { effort: "desc" },
      });

      if (inboxTask) {
        bestTask = inboxTask as any;
      }
    }

    if (!bestTask) {
      return res.json({
        ok: true,
        data: {
          recommendation: null,
          message: "No tasks available. Add tasks to get recommendations.",
        },
      });
    }

    // Build explanation
    let explanation = "";
    if (bestGoal) {
      explanation = `You have ${availableMinutes} minutes available with ${energyLevel} energy. This task supports your goal "${bestGoal.title}" (importance: ${bestGoal.importance}/100).`;
    } else {
      explanation = `You have ${availableMinutes} minutes available. This inbox task fits your schedule.`;
    }

    if (stressLevel && stressLevel > 7) {
      explanation += ` Note: Stress is high, consider a lighter task.`;
    }

    res.json({
      ok: true,
      data: {
        recommendation: {
          taskId: bestTask.id,
          taskTitle: bestTask.title,
          taskDescription: bestTask.description,
          goalTitle: bestGoal?.title,
          effort: bestTask.effort,
          impact: bestTask.impact,
          reasoning: explanation,
        },
      },
    });
  } catch (error) {
    console.error(error);
    throw new AppError(500, "internal_error", "Failed to generate recommendation");
  }
});
