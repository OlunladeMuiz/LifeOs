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
app.set("trust proxy", 1);
const PORT = Number(process.env.PORT) || 3001;

// Allowed origins for CORS

// Allow origins from .env (CORS_ORIGIN), fallback to hardcoded list
const envOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",").map(o => o.trim()).filter(Boolean) : [];
const allowedOrigins = [
  ...envOrigins,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  // Add your production Vercel domains
  "https://lifeos.vercel.app",
  "https://life-os.vercel.app",
  "https://life-os-six-beryl.vercel.app",
];

// Also allow Vercel preview deployments dynamically
const isAllowedOrigin = (origin: string | undefined): boolean => {
  if (!origin) return true; // Allow requests with no origin (like mobile apps or curl)
  if (allowedOrigins.includes(origin)) return true;
  // Allow all Vercel preview deployments for your project
  if (origin.includes('olunlade-muizs-projects.vercel.app')) return true;
  if (origin.includes('lifeos') && origin.includes('vercel.app')) return true;
  if (origin.includes('life-os') && origin.includes('vercel.app')) return true;
  return false;
};

// Middleware


app.use(
  cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(express.json());

app.options("*", cors());

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
