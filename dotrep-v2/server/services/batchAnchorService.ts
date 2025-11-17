import { Queue } from "bullmq";
import IORedis from "ioredis";
import crypto from "crypto";
import { create as ipfsHttpClient } from "ipfs-http-client";
import * as db from "../db";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const IPFS_API_URL = process.env.IPFS_API_URL || "http://127.0.0.1:5001";
const ANCHOR_SERVICE_URL = process.env.ANCHOR_SERVICE_URL;
const ANCHOR_SERVICE_API_KEY = process.env.ANCHOR_SERVICE_API_KEY;

const connection = new IORedis(REDIS_URL);
const proofsQueueName = "github-proofs";

// QueueScheduler is no longer needed in bullmq v5+
const proofsQueue = new Queue(proofsQueueName, { connection });

// IPFS client
let ipfsClient: ReturnType<typeof ipfsHttpClient> | null = null;

function getIpfsClient() {
  if (!ipfsClient) {
    try {
      ipfsClient = ipfsHttpClient({ url: IPFS_API_URL });
    } catch (error) {
      console.error("Failed to create IPFS client:", error);
      return null;
    }
  }
  return ipfsClient;
}

/**
 * Batches proofs and anchors them to IPFS and on-chain
 */
export async function batchAndAnchor(batchSize: number = 50): Promise<void> {
  const ipfs = getIpfsClient();
  if (!ipfs) {
    console.warn("⚠️  IPFS client not available, skipping batch anchor");
    return;
  }

  try {
    // Get pending proofs from queue
    const jobs = await proofsQueue.getJobs(["waiting", "active"], 0, batchSize - 1);
    
    if (jobs.length === 0) {
      console.log("📭 No proofs to batch");
      return;
    }

    console.log(`📦 Batching ${jobs.length} proofs...`);

    // Extract proofs from jobs
    const proofs = jobs.map((job) => job.data.proof).filter(Boolean);

    if (proofs.length === 0) {
      console.warn("⚠️  No valid proofs in batch");
      return;
    }

    // Create batch payload
    const batchId = crypto
      .createHash("sha256")
      .update(JSON.stringify(proofs) + Date.now())
      .digest("hex");

    const payload = {
      batch_id: batchId,
      batch_ts: new Date().toISOString(),
      proofs,
      service: "dotrep-github-ingest",
    };

    const payloadStr = JSON.stringify(payload);

    // Pin to IPFS
    console.log("📌 Pinning batch to IPFS...");
    const result = await ipfs.add(payloadStr);
    const cid = result.cid.toString();
    console.log(`✅ Pinned to IPFS: ${cid}`);

    // Compute proof hash for on-chain anchor
    const proofHash = crypto.createHash("sha256").update(payloadStr).digest("hex");

    // Store anchor record in database
    const dbInstance = await db.getDb();
    if (dbInstance) {
      try {
        const { anchors } = await import("../../drizzle/schema");
        await dbInstance.insert(anchors).values({
          merkleRoot: proofHash,
          daCid: cid,
          contributionCount: proofs.length,
        });
        console.log(`✅ Anchor record stored in database`);
      } catch (dbError) {
        console.error("Failed to store anchor in database:", dbError);
      }
    }

    // Call anchor service (if configured)
    if (ANCHOR_SERVICE_URL && ANCHOR_SERVICE_API_KEY) {
      try {
        const response = await fetch(ANCHOR_SERVICE_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ANCHOR_SERVICE_API_KEY}`,
          },
          body: JSON.stringify({
            cid,
            batch_id: batchId,
            proof_hash: proofHash,
            proof_count: proofs.length,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`✅ Anchor service response:`, result);

          // Update anchor record with tx hash if provided
          if (result.tx_hash && dbInstance) {
            try {
              const { anchors } = await import("../../drizzle/schema");
              const { eq } = await import("drizzle-orm");
              await dbInstance
                .update(anchors)
                .set({ txHash: result.tx_hash })
                .where(eq(anchors.merkleRoot, proofHash));
            } catch (updateError) {
              console.error("Failed to update anchor with tx hash:", updateError);
            }
          }
        } else {
          console.warn(`⚠️  Anchor service returned ${response.status}`);
        }
      } catch (anchorError: any) {
        console.error("Failed to call anchor service:", anchorError.message);
      }
    } else {
      console.log("ℹ️  Anchor service not configured, skipping on-chain anchor");
    }

    // Mark jobs as completed
    for (const job of jobs) {
      await job.remove();
    }

    console.log(`✅ Batch anchored successfully: ${batchId}`);
  } catch (error: any) {
    console.error("❌ Batch anchor error:", error);
    throw error;
  }
}

/**
 * Starts a periodic batch anchoring process
 */
export function startBatchAnchoring(intervalMs: number = 60000): NodeJS.Timeout {
  console.log(`🔄 Starting batch anchoring (interval: ${intervalMs}ms)`);

  const interval = setInterval(async () => {
    try {
      await batchAndAnchor();
    } catch (error) {
      console.error("Batch anchoring error:", error);
    }
  }, intervalMs);

  // Run immediately
  batchAndAnchor().catch(console.error);

  return interval;
}


