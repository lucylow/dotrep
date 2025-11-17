import express, { type Express, type Request, type Response } from "express";
import crypto from "crypto";
import { Queue } from "bullmq";
import IORedis from "ioredis";

const {
  GITHUB_WEBHOOK_SECRET,
  REDIS_URL = "redis://127.0.0.1:6379",
} = process.env;

// Redis connection for queue
const connection = new IORedis(REDIS_URL);
const ingestQueue = new Queue("github-ingest", { connection });

/**
 * Verifies GitHub webhook signature using HMAC SHA-256
 */
function verifyGithubWebhookSignature(
  req: Request,
  secret: string
): boolean {
  const signature = req.headers["x-hub-signature-256"] as string | undefined;
  if (!signature) {
    return false;
  }

  // Get raw body (must be set by middleware)
  const rawBody = (req as any).rawBody || JSON.stringify(req.body);
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(rawBody);
  const expectedSignature = `sha256=${hmac.digest("hex")}`;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Normalizes GitHub webhook event to canonical ContributionEvent format
 */
function normalizeGitHubEvent(raw: any): any {
  const eventType = raw.action || raw.type || "unknown";
  const eventId = crypto
    .createHash("sha256")
    .update(JSON.stringify(raw))
    .digest("hex")
    .slice(0, 32);

  // Extract common fields based on event type
  let normalized: any = {
    event_id: eventId,
    provider: "github",
    event_type: eventType,
    timestamp: new Date().toISOString(),
    raw,
  };

  // Handle different event types
  if (raw.pull_request) {
    normalized = {
      ...normalized,
      event_type: "pull_request",
      provider_user: {
        login: raw.pull_request.user?.login || raw.sender?.login,
        id: raw.pull_request.user?.id || raw.sender?.id,
        profile_url: `https://github.com/${raw.pull_request.user?.login || raw.sender?.login}`,
      },
      repo: raw.repository?.full_name,
      metadata: {
        pr_number: raw.pull_request.number,
        title: raw.pull_request.title,
        state: raw.pull_request.state,
        merged: raw.pull_request.merged || false,
        additions: raw.pull_request.additions || 0,
        deletions: raw.pull_request.deletions || 0,
        url: raw.pull_request.html_url,
      },
    };
  } else if (raw.issue) {
    normalized = {
      ...normalized,
      event_type: "issue",
      provider_user: {
        login: raw.issue.user?.login || raw.sender?.login,
        id: raw.issue.user?.id || raw.sender?.id,
        profile_url: `https://github.com/${raw.issue.user?.login || raw.sender?.login}`,
      },
      repo: raw.repository?.full_name,
      metadata: {
        issue_number: raw.issue.number,
        title: raw.issue.title,
        state: raw.issue.state,
        url: raw.issue.html_url,
      },
    };
  } else if (raw.commits && raw.commits.length > 0) {
    // Push event with commits
    normalized = {
      ...normalized,
      event_type: "push",
      provider_user: {
        login: raw.pusher?.name || raw.sender?.login,
        id: raw.sender?.id,
        profile_url: `https://github.com/${raw.pusher?.name || raw.sender?.login}`,
      },
      repo: raw.repository?.full_name,
      ref: raw.ref,
      commit_hash: raw.commits[0]?.id,
      metadata: {
        commit_count: raw.commits.length,
        commits: raw.commits.map((c: any) => ({
          id: c.id,
          message: c.message,
          url: c.url,
        })),
      },
    };
  } else if (raw.comment) {
    normalized = {
      ...normalized,
      event_type: "comment",
      provider_user: {
        login: raw.comment.user?.login || raw.sender?.login,
        id: raw.comment.user?.id || raw.sender?.id,
        profile_url: `https://github.com/${raw.comment.user?.login || raw.sender?.login}`,
      },
      repo: raw.repository?.full_name,
      metadata: {
        comment_id: raw.comment.id,
        body: raw.comment.body,
        url: raw.comment.html_url,
      },
    };
  } else {
    // Generic event
    normalized = {
      ...normalized,
      provider_user: {
        login: raw.sender?.login,
        id: raw.sender?.id,
        profile_url: `https://github.com/${raw.sender?.login}`,
      },
      repo: raw.repository?.full_name,
      metadata: {
        raw_event: raw,
      },
    };
  }

  return normalized;
}

/**
 * Registers GitHub webhook routes
 */
export function registerGitHubWebhookRoutes(app: Express) {
  // Middleware to capture raw body for signature verification
  app.use(
    "/api/integrations/github/webhook",
    express.raw({ type: "application/json", limit: "10mb" }),
    (req: Request, res: Response, next) => {
      // Store raw body for signature verification
      (req as any).rawBody = req.body;
      // Parse JSON for processing
      try {
        req.body = JSON.parse(req.body.toString());
      } catch (e) {
        return res.status(400).json({ error: "Invalid JSON" });
      }
      next();
    }
  );

  // Webhook endpoint
  app.post("/api/integrations/github/webhook", async (req: Request, res: Response) => {
    try {
      // Verify webhook signature
      if (!GITHUB_WEBHOOK_SECRET) {
        console.warn("⚠️  GITHUB_WEBHOOK_SECRET not set, skipping signature verification");
      } else {
        const isValid = verifyGithubWebhookSignature(req, GITHUB_WEBHOOK_SECRET);
        if (!isValid) {
          console.warn("❌ Invalid webhook signature");
          return res.status(401).json({ error: "Invalid signature" });
        }
      }

      const eventType = req.headers["x-github-event"] as string;
      const deliveryId = req.headers["x-github-delivery"] as string;

      console.log(`📥 Received GitHub webhook: ${eventType} (${deliveryId})`);

      // Normalize event
      const normalized = normalizeGitHubEvent(req.body);

      // Queue for processing
      await ingestQueue.add(
        "github-event",
        {
          event_type: eventType,
          delivery_id: deliveryId,
          normalized,
          received_at: Date.now(),
        },
        {
          jobId: `${deliveryId}-${normalized.event_id}`, // Prevent duplicates
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
        }
      );

      res.status(200).json({ ok: true, queued: true });
    } catch (error: any) {
      console.error("❌ Webhook processing error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Health check for webhook endpoint
  app.get("/api/integrations/github/webhook/health", (req: Request, res: Response) => {
    res.json({
      ok: true,
      queue: {
        name: "github-ingest",
        connected: connection.status === "ready",
      },
    });
  });
}


