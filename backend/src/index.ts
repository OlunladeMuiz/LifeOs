// ==== CRITICAL: Error handlers FIRST (before any import can crash) ====
process.on("uncaughtException", (err) => {
  console.error("[FATAL] Uncaught Exception:", err);
  // Don't exit - try to keep server alive
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[FATAL] Unhandled Rejection at:", promise, "reason:", reason);
  // Don't exit - try to keep server alive
});

// ==== Now safe to import ====
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
import { logger } from "./utils/logger";

dotenv.config();
console.log("[BOOT] Environment loaded");

const app = express();
const PORT = Number(process.env.PORT) || 3001;

const isProduction = process.env.NODE_ENV === 'production';
const corsOrigins = (process.env.CORS_ORIGIN ?? process.env.FRONTEND_ORIGIN ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Middleware
app.use(
  cors({
    origin: corsOrigins.length ? corsOrigins : isProduction ? false : true,
    credentials: true,
  })
);
app.use(express.json());

// Health check with timestamp for diagnostics (support both /health and /api/health)
app.get(["/health", "/api/health"], (req, res) => {
  res.json({ ok: true, status: "ok", timestamp: new Date().toISOString() });
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

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`[BOOT] LifeOS Backend listening on port ${PORT}`);
  console.log(`[BOOT] Server is listening: ${server.listening}`);
  logger.info('LifeOS backend started', { port: PORT, env: process.env.NODE_ENV || 'development' });
});

// Keep the event loop active (prevents premature exit in some environments)
const keepAlive = setInterval(() => {
  // This keeps the Node.js event loop active
}, 1000 * 60 * 60); // Every hour (minimal overhead)

// Keep process alive and handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  clearInterval(keepAlive);
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  clearInterval(keepAlive);
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});
