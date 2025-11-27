/**
 * Standalone Mock Server
 * 
 * This server runs independently for Lovable development, providing mock data
 * without requiring database, blockchain, or DKG connections.
 */

import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { mockRouter } from "./mockRouter";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

let serverInstance: ReturnType<typeof createServer> | null = null;
let isShuttingDown = false;

async function startMockServer() {
  const app = express();
  const server = createServer(app);
  serverInstance = server;

  // Configure body parser
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Health check endpoints
  app.get("/health", (req, res) => {
    if (isShuttingDown) {
      return res.status(503).json({ status: "shutting down" });
    }
    res.status(200).json({ 
      status: "healthy", 
      mode: "mock",
      timestamp: new Date().toISOString() 
    });
  });

  app.get("/ready", (req, res) => {
    if (isShuttingDown) {
      return res.status(503).json({ status: "not ready" });
    }
    res.status(200).json({ 
      status: "ready", 
      mode: "mock",
      timestamp: new Date().toISOString() 
    });
  });

  // REST API endpoints (mock versions)
  app.get("/api/health", (req, res) => {
    res.json({
      status: "healthy",
      mode: "mock",
      timestamp: new Date().toISOString(),
      service: "dotrep-api-mock",
      version: "1.0.0",
    });
  });

  app.get("/api/v1/dkg/health", (req, res) => {
    res.json({
      success: true,
      healthy: true,
      status: {
        initialized: true,
        environment: "mock",
        endpoint: "mock://localhost",
        mockMode: true,
      },
    });
  });

  app.get("/api/v1/dkg/node/info", (req, res) => {
    res.json({
      success: true,
      nodeInfo: {
        version: "mock-1.0.0",
        environment: "mock",
        mockMode: true,
      },
    });
  });

  // tRPC API with mock router
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: mockRouter,
      createContext,
    })
  );

  // Development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3001");
  const port = preferredPort;

  server.listen(port, () => {
    console.log(`🎭 Mock Server running on http://localhost:${port}/`);
    console.log(`Health check available at http://localhost:${port}/health`);
    console.log(`⚡ tRPC API (mock) available at http://localhost:${port}/api/trpc/*`);
    console.log(`📝 Running in MOCK MODE - all data is simulated`);
  });

  // Graceful shutdown handling
  const gracefulShutdown = async (signal: string) => {
    console.log(`Received ${signal}, starting graceful shutdown...`);
    isShuttingDown = true;

    if (serverInstance) {
      serverInstance.close(() => {
        console.log("Mock server closed");
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error("Forced shutdown after timeout");
        process.exit(1);
      }, 10000);
    } else {
      process.exit(0);
    }
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
}

// Start the server if this file is run directly
// Check if this is the main module
const isMainModule = process.argv[1] && (
  process.argv[1].includes('mockServer') ||
  import.meta.url === `file://${process.argv[1]}`
);

if (isMainModule || !process.env.JEST_WORKER_ID) {
  startMockServer().catch(console.error);
}

export { startMockServer };

