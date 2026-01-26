import { Router, Request, Response } from "express";
import { prisma } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { logger } from "../utils/logger";

export const decisionRouter = Router();

/**
 * Decision Engine Algorithm:
 * 1. Get today's context (energy, available minutes, stress)
 * 2. Get active goals ranked by importance (max 3)
 * 3. For each goal, find PENDING tasks that fit available time
 * 4. Pick highest-priority task from most important goal
 * 5. Fall back to inbox tasks if no goal tasks fit
 * 6. Return task with detailed reasoning about selection
 */

interface DecisionContext {
  date: string;
  energyLevel: string;
  availableMinutes: number;
  stressLevel: number;
  contextSet: boolean;
}

interface DecisionInputs {
  context: DecisionContext;
  activeGoalCount: number;
  totalPendingTasks: number;
  goalTaskCounts: Record<string, number>;
}

decisionRouter.get("/next", async (req: Request, res: Response) => {
  try {
    // Get today's date as YYYY-MM-DD string
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    // Get today's context
    const contextRecord = await prisma.dailyContext.findUnique({
      where: {
        userId_date: {
          userId: req.userId!,
          date: dateStr,
        },
      },
    });

    const contextSet = !!contextRecord;
    const availableMinutes = contextRecord?.availableMinutes ?? 480; // 8 hours default
    const energyLevel = contextRecord?.energyLevel ?? "MEDIUM";
    const stressLevel = contextRecord?.stressLevel ?? 5;

    const decisionContext: DecisionContext = {
      date: dateStr,
      energyLevel,
      availableMinutes,
      stressLevel,
      contextSet,
    };

    // Get active goals ordered by importance
    const goals = await prisma.goal.findMany({
      where: { userId: req.userId, status: "ACTIVE" },
      orderBy: { importance: "desc" },
    });

    // Count pending tasks per goal
    const goalTaskCounts: Record<string, number> = {};
    let totalPendingTasks = 0;
    
    for (const goal of goals) {
      const count = await prisma.task.count({
        where: { userId: req.userId, goalId: goal.id, status: "PENDING" },
      });
      goalTaskCounts[goal.id] = count;
      totalPendingTasks += count;
    }

    // Count inbox tasks
    const inboxTaskCount = await prisma.task.count({
      where: { userId: req.userId, goalId: null, status: "PENDING" },
    });
    totalPendingTasks += inboxTaskCount;

    const inputs: DecisionInputs = {
      context: decisionContext,
      activeGoalCount: goals.length,
      totalPendingTasks,
      goalTaskCounts,
    };

    if (goals.length === 0) {
      return res.json({
        ok: true,
        data: {
          recommendation: null,
          message: "No active goals. Create a goal to get recommendations.",
          inputs,
        },
      });
    }

    if (totalPendingTasks === 0) {
      return res.json({
        ok: true,
        data: {
          recommendation: null,
          message: "All tasks complete! Add new tasks to continue.",
          inputs,
        },
      });
    }

    let bestTask = null;
    let bestGoal = null;
    let selectionReason = "";
    let skippedTasks = 0;

    // Iterate through goals by importance
    for (const goal of goals) {
      const tasks = await prisma.task.findMany({
        where: {
          userId: req.userId,
          goalId: goal.id,
          status: "PENDING",
        },
        orderBy: [
          { impact: "desc" },
          { effort: "asc" },
        ],
      });

      for (const task of tasks) {
        const effortMinutes = task.effort ?? 30;

        if (effortMinutes <= availableMinutes) {
          bestTask = task;
          bestGoal = goal;
          selectionReason = `Selected from goal "${goal.title}" (priority ${goal.importance}/100) because it has the highest impact and fits your ${availableMinutes} min window.`;
          break;
        } else {
          skippedTasks++;
        }
      }

      if (bestTask) break;
    }

    // Fall back to inbox tasks
    if (!bestTask) {
      const inboxTask = await prisma.task.findFirst({
        where: {
          userId: req.userId,
          goalId: null,
          status: "PENDING",
        },
        orderBy: [
          { impact: "desc" },
          { effort: "asc" },
        ],
      });

      if (inboxTask) {
        const effortMinutes = inboxTask.effort ?? 30;
        if (effortMinutes <= availableMinutes) {
          bestTask = inboxTask;
          selectionReason = `Pulled from inbox because goal tasks exceed your ${availableMinutes} min window (${skippedTasks} tasks too long).`;
        } else {
          selectionReason = `This inbox task slightly exceeds your time but is the shortest available option.`;
          bestTask = inboxTask;
        }
      }
    }

    if (!bestTask) {
      return res.json({
        ok: true,
        data: {
          recommendation: null,
          message: `No tasks fit your ${availableMinutes} min window. Consider extending time or breaking down large tasks.`,
          inputs,
        },
      });
    }

    // Build comprehensive reasoning
    const reasoningParts: string[] = [];

    // Context summary
    if (!contextSet) {
      reasoningParts.push(`⚠️ No context set today. Using defaults: ${availableMinutes} min, ${energyLevel} energy.`);
    } else {
      reasoningParts.push(`📊 Today's context: ${availableMinutes} min available, ${energyLevel} energy${stressLevel > 7 ? ', HIGH stress' : ''}.`);
    }

    // Selection reason
    reasoningParts.push(selectionReason);

    // Energy-based advice
    if (energyLevel === "LOW" && (bestTask.effort ?? 0) > 60) {
      reasoningParts.push(`💡 Tip: This is a longer task. Consider breaking it into smaller chunks given your low energy.`);
    }
    if (stressLevel > 7) {
      reasoningParts.push(`🧘 Stress is high. Focus on completing just this one task to build momentum.`);
    }

    res.json({
      ok: true,
      data: {
        recommendation: {
          taskId: bestTask.id,
          taskTitle: bestTask.title,
          taskDescription: bestTask.description,
          goalTitle: bestGoal?.title ?? null,
          goalImportance: bestGoal?.importance ?? null,
          effort: bestTask.effort,
          impact: bestTask.impact,
          reasoning: reasoningParts.join(" "),
        },
        inputs,
      },
    });
  } catch (error) {
    logger.error('Decision engine failed', error as Error, { userId: req.userId });
    throw new AppError(500, "internal_error", "Failed to generate recommendation");
  }
});
