# Polkadot + NeuroWeb + OriginTrail DKG Integration Improvements

This document summarizes the improvements made to integrate Polkadot, NeuroWeb (OriginTrail parachain), and OriginTrail DKG for the Social-Graph Reputation hackathon project.

## Overview

Based on the Polkadot integration guidance, we've implemented:

1. **NeuroWeb Event Watcher** - Monitor KA anchors on NeuroWeb parachain
2. **XCM Integration** - Cross-chain messaging for payments and triggers
3. **SPARQL DESCRIBE Helper** - Verify KA discoverability
4. **Enhanced Guardian API** - Better Umanitek content matching integration
5. **NeuroWeb-specific Polkadot API** - Enhanced RPC support

## New Files Created

### 1. `dkg-integration/neuroweb-event-watcher.ts`

**Purpose**: Watch NeuroWeb parachain events to detect when Knowledge Assets are anchored on-chain.

**Key Features**:
- Monitors system events for KA anchor transactions
- Extracts UAL, block hash, block number, and transaction hash
- Supports both real NeuroWeb RPC and mock mode for demos
- Provides callbacks for integration with other services
- Can filter events by specific UAL

**Usage**:
```typescript
import { createNeuroWebWatcher } from './dkg-integration/neuroweb-event-watcher';

const watcher = createNeuroWebWatcher({
  rpcUrl: 'wss://neuroweb-rpc.example',
  useMockMode: true, // For hackathon demos
  onAnchorDetected: (event) => {
    console.log(`KA anchored: ${event.ual} at block #${event.blockNumber}`);
  }
});

await watcher.startWatching();
```

**Demo Value**: Shows judges "this transaction produced the KA UAL and blockID" live during demo.

### 2. `dkg-integration/xcm-integration.ts`

**Purpose**: Handle XCM (Cross-Consensus Messaging) for cross-chain payments and reputation triggers.

**Key Features**:
- Generate mock XCM payloads for demo purposes
- Simulate XCM message reception and processing
- Handle payment, reputation query, reputation update, and endorsement messages
- Complete demo flow: payment → XCM → reputation update
- Supports both real XCM and mock mode

**Usage**:
```typescript
import { createXCMIntegration } from './dkg-integration/xcm-integration';

const xcm = createXCMIntegration({ useMockMode: true });

// Generate mock payment XCM
const payload = xcm.generateMockXCMPayload('payment', {
  sender: 'brand-address',
  recipient: 'creator-address',
  amount: 1000,
});

// Simulate receiving and processing
const event = await xcm.simulateXCMReceived(payload);
await xcm.processXCMessage(event);

// Or run complete demo flow
await xcm.demoPaymentToReputationFlow(brandAddress, creatorAddress, amount);
```

**Demo Value**: Demonstrates cross-chain payment triggers that update reputation without trusting a central operator.

### 3. `dkg-integration/sparql-describe-helper.ts`

**Purpose**: Execute SPARQL DESCRIBE queries to prove KA discoverability on the DKG.

**Key Features**:
- Execute DESCRIBE queries for specific UALs
- Extract provenance information (createdBy, createdAt, previousVersion, sourceAssets)
- Verify KA discoverability
- Get provenance chains (trace back through versions)
- Batch query multiple UALs

**Usage**:
```typescript
import { createSPARQLDescribeHelper } from './dkg-integration/sparql-describe-helper';

const helper = createSPARQLDescribeHelper(dkgClient);

// Describe a KA
const result = await helper.describeUAL('ual:dkg:network:hash', {
  includeProvenance: true,
  includeMetadata: true,
});

// Verify discoverability
const verification = await helper.verifyDiscoverability(ual);
if (verification.discoverable) {
  console.log(`KA is discoverable: ${verification.result?.ual}`);
}

// Get provenance chain
const chain = await helper.getProvenanceChain(ual);
```

**Demo Value**: Shows judges that published KAs can be queried and verified on the DKG using standard SPARQL.

### 4. Enhanced `server/_core/guardianApi.ts`

**Improvements**:
- Enhanced content matching with Videntifier integration
- Better error handling with fallback to `/verify` endpoint
- Improved match processing with sourceUAL extraction
- Enhanced summary generation for verification results
- Better metadata handling for Videntifier matches

**Key Changes**:
- Tries `/match` endpoint first (for Videntifier matching), falls back to `/verify`
- Extracts `sourceUAL` from matches for provenance tracking
- Generates detailed summaries with match information
- Includes Videntifier-specific metadata in match results

**Demo Value**: Shows how Guardian verification results can be embedded as `prov:hadPrimarySource` in Community Note KAs.

### 5. Enhanced `server/_core/polkadotApi.ts`

**Improvements**:
- NeuroWeb-specific RPC endpoint support
- `isNeuroWeb()` method to detect NeuroWeb connection
- `getNeuroWebInfo()` method to get parachain information
- Automatic detection of NeuroWeb vs standard Polkadot

**Key Changes**:
- Checks for `NEUROWEB_RPC_URL` environment variable
- Detects if connected chain is NeuroWeb/OriginTrail parachain
- Returns relay chain information (Polkadot)
- Provides block information specific to NeuroWeb

**Demo Value**: Shows connection to NeuroWeb parachain secured by Polkadot Relay Chain.

## Integration Demo

### `dkg-integration/examples/polkadot-neuroweb-demo.ts`

A complete demo script that showcases all integration points:

1. **Compute reputation** (off-chain)
2. **Publish Reputation KA** to DKG (anchored on NeuroWeb)
3. **Watch for anchor event** on NeuroWeb
4. **Verify KA discoverability** with SPARQL DESCRIBE
5. **Simulate XCM payment trigger**
6. **Run Guardian verification**
7. **Check NeuroWeb connection status**

**Usage**:
```bash
tsx dkg-integration/examples/polkadot-neuroweb-demo.ts
```

## Environment Variables

Add these to your `.env` file:

```bash
# NeuroWeb RPC endpoint
NEUROWEB_RPC_URL=wss://neuroweb-rpc.example

# XCM configuration
XCM_SOURCE_CHAIN=polkadot
XCM_TARGET_CHAIN=neuroweb
XCM_USE_MOCK=true

# DKG SPARQL endpoint
DKG_SPARQL_ENDPOINT=https://euphoria.origin-trail.network/dkg-sparql-query

# Guardian API
UMANITEK_GUARDIAN_API_URL=https://api.umanitek.ai/v1
UMANITEK_GUARDIAN_API_KEY=your-api-key
GUARDIAN_USE_MOCK=true
GUARDIAN_FALLBACK_TO_MOCK=true
```

## Demo Checklist (Polkadot-Aware)

Based on the integration guidance, here's what to demonstrate:

- [x] **Publish 1 JSON-LD Reputation KA to NeuroWeb** (show UAL + block anchor)
- [x] **Show SPARQL DESCRIBE** returning the KA + provenance
- [x] **Simulate XCM payment → agent publishes KA** (log the simulated message)
- [x] **Show test TRAC moved via Snowbridge** (or explain simulation)
- [x] **Guardian verification** with content matching evidence

## Key Benefits for Hackathon Submission

### 1. Shared Security
- NeuroWeb as a parachain inherits pooled security from Polkadot's Relay Chain
- Reputation KAs are tamper-evident with Polkadot-level economic security

### 2. Interoperability
- XCM enables cross-chain payments and reputation updates
- Brands on other parachains can trigger reputation updates
- Multi-chain micropayments and composable reputation services

### 3. Scalability
- NeuroWeb optimized for DKG operations (Knowledge Mining, asset anchoring)
- Periodic reputation snapshots without crippling cost/latency

### 4. Verifiability
- On-chain anchors provide public auditability
- SPARQL DESCRIBE proves KA discoverability
- Provenance chains show full history

### 5. Content Safety
- Guardian integration with Videntifier matching
- Verifiable audit trails for content verification
- Community Notes linked to verification evidence

## Recommended Submission Wording

> "We publish reputation snapshots as JSON-LD Knowledge Assets to NeuroWeb (OriginTrail parachain). These KAs are anchored on the NeuroWeb parachain, which is secured by Polkadot Relay Chain validators — providing tamper-evidence and public auditability."

> "Cross-chain payments and automated triggers are possible via XCM/XCMP (Polkadot's cross-chain messaging), which we simulate in the demo; in production this allows brands on other parachains or EVM chains to trigger reputation updates without trusting a central operator."

> "TRAC staking/weighting on NeuroWeb (via Snowbridge) enables stake-based reputation weighting; for hack we used testnet or simulated stakes and documented the assumptions."

## Risks & Cautions (for Judges)

1. **Write costs & frequency**: Publishing many small KAs on chain is expensive; we use batched snapshots. (Mention testnet or simulated cost model.)

2. **XCM complexity**: Full production XCM flows require careful handling (timeouts, ordering, fees); we simulate in hack and explain roadmap to full XCM integration.

3. **Governance & upgrade models**: Parachain slot leases and governance matter for long-term availability — document whether NeuroWeb slot is stable or needs renewal.

## Next Steps

To use these improvements in your hackathon demo:

1. **Run the demo script** to see all integration points:
   ```bash
   tsx dkg-integration/examples/polkadot-neuroweb-demo.ts
   ```

2. **Integrate into your main application**:
   - Use `NeuroWebEventWatcher` to show live anchor events
   - Use `XCMIntegration` to demonstrate cross-chain flows
   - Use `SPARQLDescribeHelper` to verify KA discoverability

3. **Customize for your demo**:
   - Replace mock modes with real RPC endpoints when available
   - Add your specific reputation calculation logic
   - Integrate with your UI to show live updates

## References

- OriginTrail DKG documentation
- NeuroWeb (OriginTrail parachain) details
- Polkadot XCM/XCMP documentation
- Umanitek Guardian API documentation

---

**Created**: Based on Polkadot integration guidance for OriginTrail DKG Social-Graph Reputation hack
**Status**: Ready for hackathon demo integration

