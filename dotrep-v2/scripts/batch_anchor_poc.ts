// scripts/batch_anchor_poc.ts
/**
 * Batch Anchor POC
 * - Reads proof JSON files from data/proofs/*.json
 * - Batches them into one payload, pins to IPFS (configurable)
 * - Optionally POSTs {cid, batch_id} to ANCHOR_SERVICE_URL
 * - Optionally calls polkadot_api_client.submitProof(proofHash, metadata) if POLKADOT_WS + SERVICE_SEED are set
 *
 * Usage:
 *  tsx scripts/batch_anchor_poc.ts
 *
 * Env:
 *  IPFS_API_URL (optional, default http://127.0.0.1:5001)
 *  PROOFS_DIR (optional, default ./data/proofs)
 *  ANCHOR_SERVICE_URL (optional)
 *  ANCHOR_SERVICE_API_KEY (optional)
 *  POLKADOT_WS (optional)
 *  SERVICE_SEED (optional)  -- demo only; use KMS in production
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { create as ipfsHttpClient } from "ipfs-http-client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const PROOFS_DIR = process.env.PROOFS_DIR || path.join(projectRoot, "data", "proofs");
const IPFS_API_URL = process.env.IPFS_API_URL || "http://127.0.0.1:5001";
const ANCHOR_SERVICE_URL = process.env.ANCHOR_SERVICE_URL;
const ANCHOR_SERVICE_API_KEY = process.env.ANCHOR_SERVICE_API_KEY;

// optional polkadot client - will be loaded dynamically if needed
const USE_POLKADOT = !!(process.env.POLKADOT_WS && process.env.SERVICE_SEED);

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

async function findProofFiles(): Promise<string[]> {
  if (!fs.existsSync(PROOFS_DIR)) {
    return [];
  }
  const all = fs.readdirSync(PROOFS_DIR).filter((f) => f.endsWith(".json"));
  return all.map((f) => path.join(PROOFS_DIR, f));
}

async function readProofs(files: string[]): Promise<any[]> {
  return files
    .map((f) => {
      try {
        const raw = fs.readFileSync(f, "utf8");
        return JSON.parse(raw);
      } catch (e) {
        console.warn("invalid json file, skipping:", f);
        return null;
      }
    })
    .filter(Boolean);
}

async function pinToIpfs(payloadStr: string): Promise<string> {
  try {
    const ipfs = ipfsHttpClient({ url: IPFS_API_URL });
    console.log("📌 Pinning payload to IPFS at", IPFS_API_URL);
    const res = await ipfs.add(payloadStr);
    // res.cid supports .toString()
    const cid = res.cid.toString();
    return cid;
  } catch (error: any) {
    console.error("❌ IPFS pinning failed:", error.message);
    throw error;
  }
}

async function postAnchorService(cid: string, batchId: string): Promise<any> {
  if (!ANCHOR_SERVICE_URL) {
    console.log("ℹ️  ANCHOR_SERVICE_URL not set — skipping HTTP anchor POST.");
    return null;
  }
  const payload = { cid, batch_id: batchId };
  const headers: any = { "Content-Type": "application/json" };
  if (ANCHOR_SERVICE_API_KEY) {
    headers["Authorization"] = `Bearer ${ANCHOR_SERVICE_API_KEY}`;
  }

  console.log("📤 POSTing anchor to", ANCHOR_SERVICE_URL);
  try {
    const resp = await fetch(ANCHOR_SERVICE_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const text = await resp.text();
    console.log("✅ Anchor service response:", resp.status, text);
    return { status: resp.status, body: text };
  } catch (error: any) {
    console.error("❌ Anchor service POST failed:", error.message);
    return null;
  }
}

async function run() {
  try {
    console.log("=== batch_anchor_poc starting ===");
    const files = await findProofFiles();
    if (files.length === 0) {
      console.log("📭 No proof files found in", PROOFS_DIR);
      return;
    }
    console.log(`📦 Found ${files.length} proof files`);

    const proofs = await readProofs(files);
    if (proofs.length === 0) {
      console.log("⚠️  No valid proofs read.");
      return;
    }

    const batchId = sha256Hex(JSON.stringify(proofs) + Date.now().toString());
    const payload = {
      batch_id: batchId,
      batch_ts: new Date().toISOString(),
      proofs,
    };

    const payloadStr = JSON.stringify(payload);
    // Pin to IPFS (Polkadot Cloud DA endpoint might be IPFS-compatible)
    const cid = await pinToIpfs(payloadStr);
    console.log("✅ Pinned batch CID:", cid);

    // Optionally post to anchor service
    await postAnchorService(cid, batchId);

    // Optionally submit on-chain proof (use polkadot client)
    if (USE_POLKADOT) {
      try {
        // Dynamic import to avoid hard dependency if not needed
        let polkadotClient: any;
        try {
          polkadotClient = await import("../server/polkadot/polkadot_api_client.ts");
        } catch {
          polkadotClient = await import("../server/polkadot/polkadot_api_client.js");
        }

        if (polkadotClient && typeof polkadotClient.submitProof === "function") {
          const proofHash = sha256Hex(cid);
          console.log("🔗 Submitting on-chain proof (demo) with proofHash:", proofHash);
          const txHash = await polkadotClient.submitProof(proofHash, { cid, batchId });
          console.log("✅ On-chain submit result:", txHash);
        }
      } catch (e: any) {
        console.error("❌ On-chain submit failed:", e.message);
      }
    } else {
      console.log("ℹ️  POLKADOT_WS or SERVICE_SEED not set — skipping on-chain submit.");
    }

    // Move processed proofs to archive folder
    const archiveDir = path.join(PROOFS_DIR, "archived");
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }
    for (const f of files) {
      const base = path.basename(f);
      const archivePath = path.join(archiveDir, base);
      // Add timestamp to avoid conflicts
      const timestamp = Date.now();
      const ext = path.extname(base);
      const name = path.basename(base, ext);
      const newName = `${name}-${timestamp}${ext}`;
      fs.renameSync(f, path.join(archiveDir, newName));
    }
    console.log("📁 Moved processed proof files to archive.");
    console.log("=== batch_anchor_poc finished ===");
  } catch (err: any) {
    console.error("❌ Batch anchor error", err);
    process.exitCode = 1;
  }
}

run();


