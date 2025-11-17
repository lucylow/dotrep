// server/polkadot/polkadot_api_client.ts
/**
 * Minimal Polkadot API client for POC
 * - submitProof(proofHashHex, metadata) -> returns tx hash or throws
 *
 * DEMO NOTES:
 * - Uses POLKADOT_WS env var and SERVICE_SEED (dev seed).
 * - In production: replace signing with KMS/HSM integration.
 */

import { ApiPromise, WsProvider } from "@polkadot/api";
import { Keyring } from "@polkadot/keyring";

// Support both POLKADOT_WS and POLKADOT_WS_ENDPOINT for compatibility
const WS = process.env.POLKADOT_WS || process.env.POLKADOT_WS_ENDPOINT || "";
const SERVICE_SEED = process.env.SERVICE_SEED || "";
const PALLET_NAME = process.env.REPUTATION_PALLET_NAME || "reputation"; // change if your pallet name differs
const SUBMIT_METHOD = process.env.REPUTATION_SUBMIT_METHOD || "submitProof"; // example

if (!WS) {
  console.warn("POLKADOT_WS or POLKADOT_WS_ENDPOINT not set – polkadot_api_client will not connect until configured.");
}

let apiInstance: ApiPromise | null = null;

async function getApi(): Promise<ApiPromise> {
  if (apiInstance && apiInstance.isConnected) {
    return apiInstance;
  }

  if (!WS) {
    throw new Error("POLKADOT_WS or POLKADOT_WS_ENDPOINT not configured in env");
  }

  const provider = new WsProvider(WS);
  apiInstance = await ApiPromise.create({ provider });
  await apiInstance.isReady;
  return apiInstance;
}

export async function submitProof(
  proofHashHex: string,
  metadata: any = {}
): Promise<string> {
  if (!WS) {
    throw new Error("POLKADOT_WS or POLKADOT_WS_ENDPOINT not configured in env");
  }
  if (!SERVICE_SEED) {
    throw new Error("SERVICE_SEED not configured in env (demo only)");
  }

  const api = await getApi();

  // demo keyring signer (sr25519)
  const keyring = new Keyring({ type: "sr25519" });
  const signer = keyring.addFromUri(SERVICE_SEED);

  // For generality, try common pallet name combinations:
  const palletCandidates = [PALLET_NAME, `${PALLET_NAME}Module`, `${PALLET_NAME}_module`];

  // Prepare call: try to locate available call
  let call: any = null;
  for (const p of palletCandidates) {
    if (api.tx && (api.tx as any)[p] && (api.tx as any)[p][SUBMIT_METHOD]) {
      call = (api.tx as any)[p][SUBMIT_METHOD];
      console.log(`✅ Using pallet ${p}.${SUBMIT_METHOD}`);
      break;
    }
  }

  if (!call) {
    // Try alternative: submit_proof (snake_case)
    const snakeCaseMethod = SUBMIT_METHOD.replace(/([A-Z])/g, "_$1").toLowerCase();
    for (const p of palletCandidates) {
      if (api.tx && (api.tx as any)[p] && (api.tx as any)[p][snakeCaseMethod]) {
        call = (api.tx as any)[p][snakeCaseMethod];
        console.log(`✅ Using pallet ${p}.${snakeCaseMethod}`);
        break;
      }
    }
  }

  if (!call) {
    // fallback: try to call by exact method path (dangerous)
    throw new Error(
      `Could not locate pallet call for submitProof. Tried pallets: ${palletCandidates.join(
        ", "
      )} and methods: ${SUBMIT_METHOD}, ${SUBMIT_METHOD.replace(/([A-Z])/g, "_$1").toLowerCase()}. Adjust REPUTATION_PALLET_NAME / REPUTATION_SUBMIT_METHOD env vars.`
    );
  }

  // Example metadata: attach small JSON as bytes (avoid big payloads on-chain)
  const metadataStr = JSON.stringify(metadata || {});
  // sign & send
  return new Promise<string>(async (resolve, reject) => {
    try {
      const tx = call(proofHashHex, metadataStr);
      console.log("📤 Submitting extrinsic...");
      const unsub = await tx.signAndSend(signer, (result: any) => {
        if (result.status.isInBlock) {
          console.log(`✅ Included at blockHash ${result.status.asInBlock.toHex()}`);
        }
        if (result.status.isFinalized) {
          console.log(`✅ Finalized. BlockHash ${result.status.asFinalized.toHex()}`);
          // optionally parse events to find our pallet event
          unsub();
          resolve(result.status.asFinalized.toHex());
        }
        if (result.isError) {
          console.error("❌ Transaction error:", result);
          unsub();
          reject(new Error("Transaction failed"));
        }
      });
    } catch (err: any) {
      reject(err);
    }
  });
}

export async function disconnect(): Promise<void> {
  if (apiInstance) {
    await apiInstance.disconnect();
    apiInstance = null;
  }
}


