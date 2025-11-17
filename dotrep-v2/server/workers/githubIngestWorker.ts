import { Worker, Queue } from "bullmq";
import IORedis from "ioredis";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import * as db from "../db";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const connection = new IORedis(REDIS_URL);
const PROOFS_DIR = process.env.PROOFS_DIR || path.join(projectRoot, "data", "proofs");
const PERSIST_PROOFS_TO_DISK = process.env.PERSIST_PROOFS_TO_DISK === "true";

// Ensure proofs dir exists if we're persisting to disk
if (PERSIST_PROOFS_TO_DISK && !fs.existsSync(PROOFS_DIR)) {
  fs.mkdirSync(PROOFS_DIR, { recursive: true });
}

const ingestQueueName = "github-ingest";
const proofsQueueName = "github-proofs";

// QueueScheduler is no longer needed in bullmq v5+ - Queue handles scheduling internally
const proofsQueue = new Queue(proofsQueueName, { connection });

/**
 * Canonicalizes an object for stable JSON stringification
 */
function canonicalize(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(canonicalize);
  }
  if (obj && typeof obj === "object") {
    const keys = Object.keys(obj).sort();
    const out: any = {};
    keys.forEach((k) => {
      out[k] = canonicalize(obj[k]);
    });
    return out;
  }
  return obj;
}

/**
 * Computes SHA-256 hash of a string
 */
function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

/**
 * Verifies a GitHub event (checks commit existence, ownership, etc.)
 */
async function verifyEvent(ev: any): Promise<{ ok: boolean; reason?: string; details?: any }> {
  try {
    // Check if we have a linked contributor
    if (!ev.provider_user?.login) {
      return { ok: false, reason: "Missing provider user" };
    }

    // Check if contributor exists and is linked
    const contributor = await db.getContributorByGithubUsername(ev.provider_user.login);
    if (!contributor || !contributor.verified) {
      return { ok: false, reason: "Contributor not found or not verified" };
    }

    // For commits, verify they exist in the repo
    if (ev.event_type === "push" && ev.commit_hash) {
      try {
        // In production, verify commit exists via GitHub API
        // For now, just check format
        if (!/^[a-f0-9]{40}$/i.test(ev.commit_hash)) {
          return { ok: false, reason: "Invalid commit hash format" };
        }
      } catch (error) {
        return { ok: false, reason: "Failed to verify commit" };
      }
    }

    // Basic anti-abuse checks
    // TODO: Add more sophisticated checks (burst detection, bot detection, etc.)

    return { ok: true, details: "verified" };
  } catch (error: any) {
    return { ok: false, reason: error.message };
  }
}

/**
 * Builds a proof payload from a normalized event
 */
function buildProofPayload(ev: any, verification: any): any {
  const payload = {
    event_id: ev.event_id,
    provider: ev.provider,
    provider_user: ev.provider_user,
    event_type: ev.event_type,
    repo: ev.repo,
    commit_hash: ev.commit_hash,
    metadata: ev.metadata,
    timestamp: ev.timestamp,
    verification: {
      verified: verification.ok,
      verified_at: new Date().toISOString(),
      details: verification.details,
    },
  };

  // Compute proof hash
  const canonical = JSON.stringify(canonicalize(payload));
  const proof_hash = sha256Hex(canonical);

  return {
    ...payload,
    proof_hash,
  };
}

/**
 * Processes a GitHub event job
 */
async function processEvent(job: any) {
  const { normalized, event_type, delivery_id } = job.data;

  console.log(`🔄 Processing event: ${event_type} (${normalized.event_id})`);

  try {
    // Verify event
    const verification = await verifyEvent(normalized);
    if (!verification.ok) {
      console.warn(`⚠️  Event verification failed: ${verification.reason}`);
      return;
    }

    // Build proof
    const proof = buildProofPayload(normalized, verification);

    // Store contribution in database if applicable
    if (normalized.provider_user?.login) {
      const contributor = await db.getContributorByGithubUsername(
        normalized.provider_user.login
      );
      if (contributor) {
        // Map event type to contribution type
        let contributionType: "commit" | "pull_request" | "issue" | "review" = "commit";
        if (normalized.event_type === "pull_request") {
          contributionType = "pull_request";
        } else if (normalized.event_type === "issue") {
          contributionType = "issue";
        } else if (normalized.event_type === "comment" && normalized.metadata?.pr_number) {
          contributionType = "review";
        }

        // Extract repo owner and name
        const [repoOwner, repoName] = (normalized.repo || "").split("/");

        // Create contribution record
        try {

          // Create contribution
          await db.createContribution({
            contributorId: contributor.id,
            contributionType,
            repoName: repoName || normalized.repo || "unknown",
            repoOwner: repoOwner || "unknown",
            title: normalized.metadata?.title || normalized.metadata?.pr_number?.toString() || null,
            url: normalized.metadata?.url || null,
            proofCid: null, // Will be set after IPFS pinning
            verified: verification.ok,
            reputationPoints: 0, // Will be calculated later
          });
          
          console.log(`✅ Contribution created for contributor ${contributor.id}`);
        } catch (dbError) {
          console.error("Failed to create contribution:", dbError);
          // Continue processing even if DB write fails
        }
      }
    }

    // Persist proof to disk if enabled (for batch anchor POC)
    if (PERSIST_PROOFS_TO_DISK) {
      try {
        const filename = `${proof.proof_hash}.json`;
        const filepath = path.join(PROOFS_DIR, filename);
        fs.writeFileSync(filepath, JSON.stringify(proof, null, 2), "utf8");
        console.log(`💾 Persisted proof to disk: ${filepath}`);
      } catch (diskError: any) {
        console.warn(`⚠️  Failed to persist proof to disk: ${diskError.message}`);
      }
    }

    // Queue proof for batching
    await proofsQueue.add(
      "proof",
      {
        proof,
        received_at: Date.now(),
      },
      {
        jobId: `proof-${proof.proof_hash}`,
        attempts: 2,
      }
    );

    console.log(`✅ Event processed successfully: ${normalized.event_id}`);
  } catch (error: any) {
    console.error(`❌ Error processing event:`, error);
    throw error;
  }
}

/**
 * Creates and starts the GitHub ingest worker
 */
export function createGitHubIngestWorker(): Worker {
  const worker = new Worker(
    ingestQueueName,
    async (job) => {
      await processEvent(job);
    },
    {
      connection,
      concurrency: 5, // Process up to 5 events concurrently
      limiter: {
        max: 100,
        duration: 60000, // 100 jobs per minute
      },
    }
  );

  worker.on("completed", (job) => {
    console.log(`✅ Job completed: ${job.id}`);
  });

  worker.on("failed", (job, err) => {
    console.error(`❌ Job failed: ${job?.id}`, err);
  });

  worker.on("error", (err) => {
    console.error(`❌ Worker error:`, err);
  });

  console.log(`🚀 GitHub ingest worker started`);

  return worker;
}

// Auto-start worker if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createGitHubIngestWorker();
}

