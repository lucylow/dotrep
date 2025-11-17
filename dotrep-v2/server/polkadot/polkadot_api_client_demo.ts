// server/polkadot/polkadot_api_client_demo.ts
/**
 * Demo runner for polkadot_api_client.submitProof
 * Usage: tsx server/polkadot/polkadot_api_client_demo.ts
 *
 * This script will try to submit a demo proof hash to the configured chain.
 * Make sure POLKADOT_WS (or POLKADOT_WS_ENDPOINT) and SERVICE_SEED are set in your .env if you want the on-chain flow.
 */

import crypto from "crypto";
import { submitProof, disconnect } from "./polkadot_api_client";

async function runDemo() {
  try {
    const demoCid = process.env.DEMO_PROOF_CID || "bafybeigdyrztqdemoexamplecid";
    // proof hash we will submit (sha256 of cid is common)
    const proofHash =
      process.env.DEMO_PROOF_HASH ||
      crypto.createHash("sha256").update(demoCid).digest("hex");

    console.log("🔍 Demo proofHash:", proofHash);

    // metadata to attach (small)
    const metadata = {
      demo: true,
      cid: demoCid,
      note: "POC submit from polkadot_api_client_demo",
      ts: new Date().toISOString(),
    };

    const tx = await submitProof(proofHash, metadata);
    console.log("✅ submitProof returned:", tx);
    await disconnect();
    process.exit(0);
  } catch (err: any) {
    console.error("❌ Demo submit failed:", err.message);
    await disconnect().catch(() => {});
    process.exit(1);
  }
}

runDemo();


