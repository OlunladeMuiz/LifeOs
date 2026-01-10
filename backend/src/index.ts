import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { authRouter } from "./routes/auth";
import { goalsRouter } from "./routes/goals";
import { tasksRouter } from "./routes/tasks";
import { contextRouter } from "./routes/context";
import { decisionRouter } from "./routes/decision";
import { authMiddleware } from "./middleware/auth";
import { errorHandler } from "./middleware/errorHandler";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// Public routes
app.use("/api/auth", authRouter);

// Protected routes
app.use("/api/goals", authMiddleware, goalsRouter);
app.use("/api/tasks", authMiddleware, tasksRouter);
app.use("/api/context", authMiddleware, contextRouter);
app.use("/api/decision", authMiddleware, decisionRouter);

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`LifeOS backend running on port ${PORT}`);
});
