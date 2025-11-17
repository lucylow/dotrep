import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerGitHubOAuthRoutes, configureSession } from "../githubOAuth";
import { registerGitHubWebhookRoutes } from "../githubWebhook";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { startBatchAnchoring } from "../services/batchAnchorService";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

let serverInstance: ReturnType<typeof createServer> | null = null;
let isShuttingDown = false;

async function startServer() {
  const app = express();
  const server = createServer(app);
  serverInstance = server;

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Configure session middleware for GitHub OAuth
  configureSession(app);

  // Health check endpoints for Kubernetes
  app.get("/health", (req, res) => {
    if (isShuttingDown) {
      return res.status(503).json({ status: "shutting down" });
    }
    res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  app.get("/ready", async (req, res) => {
    if (isShuttingDown) {
      return res.status(503).json({ status: "not ready" });
    }
    // Check database connection if available
    try {
      const { getDb } = await import("../db");
      await getDb();
      res.status(200).json({ status: "ready", timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(503).json({ status: "not ready", error: "database unavailable" });
    }
  });

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // GitHub OAuth routes under /auth/github/*
  registerGitHubOAuthRoutes(app);
  // GitHub webhook routes under /api/integrations/github/webhook
  registerGitHubWebhookRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}/`);
    console.log(`Health check available at http://localhost:${port}/health`);
    console.log(`Readiness check available at http://localhost:${port}/ready`);
    
    // Start batch anchoring service (runs every 60 seconds)
    if (process.env.NODE_ENV === "production" || process.env.ENABLE_BATCH_ANCHORING === "true") {
      startBatchAnchoring(60000);
      console.log("🔄 Batch anchoring service started");
    }
  });

  // Graceful shutdown handling
  const gracefulShutdown = async (signal: string) => {
    console.log(`Received ${signal}, starting graceful shutdown...`);
    isShuttingDown = true;

    if (serverInstance) {
      serverInstance.close(async () => {
        console.log("HTTP server closed");
        
        // Close database connections
        try {
          const { closeDb } = await import("../db");
          await closeDb();
          console.log("Database connections closed");
        } catch (error) {
          console.error("Error closing database connections:", error);
        }
        
        process.exit(0);
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        console.error("Forced shutdown after timeout");
        process.exit(1);
      }, 30000);
    } else {
      // Close database connections even if server wasn't started
      try {
        const { closeDb } = await import("../db");
        await closeDb();
      } catch (error) {
        console.error("Error closing database connections:", error);
      }
      process.exit(0);
    }
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
}

startServer().catch(console.error);
