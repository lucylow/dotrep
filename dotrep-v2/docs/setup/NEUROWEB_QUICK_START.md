# NeuroWeb Integration - Quick Start Guide

This guide helps you quickly get started with NeuroWeb Parachain integration.

## Prerequisites

1. Install dependencies:
```bash
npm install ethers@^6.0.0
# or
pnpm add ethers@^6.0.0
```

2. Set up environment variables in `.env`:
```bash
NEUROWEB_NETWORK=testnet
NEUROWEB_RPC_URL=wss://lofar-testnet.origin-trail.network
NEUROWEB_EVM_RPC_URL=https://lofar-testnet.origin-trail.network
NEUROWEB_USE_MOCK=false
```

## Quick Examples

### 1. Basic Connection

```typescript
import { createNeuroWebService } from './dkg-integration/neuroweb-service';

const neuroweb = createNeuroWebService({ network: 'testnet' });

// Initialize connections
await neuroweb.initializeSubstrate();
await neuroweb.initializeEVM();

// Get chain info
const info = await neuroweb.getChainInfo();
console.log(`Connected to ${info.chainName}`);
```

### 2. Check NEURO Balance

```typescript
const balance = await neuroweb.getNEUROBalance('0xYourAddress');
console.log(`Balance: ${balance.formatted} NEURO`);
```

### 3. Bridge TRAC from Ethereum

```typescript
import { createTRACBridgeService } from './dkg-integration/trac-bridge-service';
import { ethers } from 'ethers';

const bridge = createTRACBridgeService();
const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

const status = await bridge.initiateBridge(
  ethers.parseEther('100'), // 100 TRAC
  '0xNeuroWebAddress',
  signer
);
```

### 4. Send XCM to NeuroWeb

```typescript
import { getPolkadotApi } from './server/_core/polkadotApi';

const polkadotApi = getPolkadotApi();
const result = await polkadotApi.sendXCMToNeuroWeb(xcmMessage);
```

## Network Information

**Testnet (Rococo):**
- Chain ID: `20430`
- ParaID: `20430`
- RPC: `wss://lofar-testnet.origin-trail.network`
- Explorer: `https://lofar-testnet.subscan.io`

**Mainnet (Polkadot):**
- Chain ID: `2043`
- ParaID: `2043`
- RPC: `wss://astrosat-parachain-rpc.origin-trail.network`
- Explorer: `https://neuroweb.subscan.io`

## Mock Mode

For development/testing without network access:

```typescript
const service = createNeuroWebService({
  network: 'testnet',
  useMockMode: true, // Enables mock responses
});
```

## Next Steps

- Read [NEUROWEB_INTEGRATION_IMPROVEMENTS.md](./NEUROWEB_INTEGRATION_IMPROVEMENTS.md) for detailed documentation
- Check examples in `dkg-integration/examples/`
- Review [POLKADOT_NEUROWEB_IMPROVEMENTS.md](./POLKADOT_NEUROWEB_IMPROVEMENTS.md) for Polkadot-specific features

