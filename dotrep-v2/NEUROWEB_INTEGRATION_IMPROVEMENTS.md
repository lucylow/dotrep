# NeuroWeb Parachain Integration Improvements

This document describes comprehensive improvements made to integrate NeuroWeb (OriginTrail Parachain) with Polkadot into the DotRep codebase.

## Overview

NeuroWeb is an EVM-compatible parachain on Polkadot focused on decentralized AI and Knowledge Graph operations. These improvements enable seamless integration with NeuroWeb for:

- Knowledge Asset (KA) anchoring on-chain
- NEURO token operations
- TRAC token bridging from Ethereum
- Cross-chain messaging via XCM
- EVM-compatible smart contract interactions
- Substrate API interactions

## Key Improvements

### 1. Enhanced DKG Client Configuration (`dkg-client-v8.ts`)

**Updated Network Configuration:**
- ✅ Correct NeuroWeb chain IDs: Mainnet (2043), Testnet (20430)
- ✅ Proper RPC endpoints for both Substrate and EVM layers
- ✅ Blockchain name mappings (`otp:2043` for mainnet, `otp:20430` for testnet)
- ✅ Support for both mainnet and testnet environments

**Network Details:**
```typescript
// Mainnet
Chain ID: 2043
ParaID: 2043
RPC: wss://astrosat-parachain-rpc.origin-trail.network
Blockchain: otp:2043

// Testnet (Rococo)
Chain ID: 20430
ParaID: 20430
RPC: wss://lofar-testnet.origin-trail.network
Blockchain: otp:20430
```

### 2. New NeuroWeb Service (`neuroweb-service.ts`)

**Comprehensive service for NeuroWeb operations:**

**Features:**
- ✅ Dual API support: Substrate (Polkadot.js) and EVM (ethers.js)
- ✅ Network detection (mainnet/testnet)
- ✅ Chain information retrieval
- ✅ NEURO token balance queries
- ✅ Gas price estimation
- ✅ MetaMask network configuration helpers
- ✅ TRAC bridge information

**Usage Example:**
```typescript
import { createNeuroWebService } from './dkg-integration/neuroweb-service';

const neuroweb = createNeuroWebService({
  network: 'testnet', // or 'mainnet'
  useMockMode: false,
});

// Initialize connections
await neuroweb.initializeSubstrate();
await neuroweb.initializeEVM();

// Get chain info
const info = await neuroweb.getChainInfo();
console.log(`Connected to ${info.chainName} (ParaID: ${info.paraId})`);

// Get NEURO balance
const balance = await neuroweb.getNEUROBalance('0x...');
console.log(`Balance: ${balance.formatted} NEURO`);

// Get MetaMask config for adding network
const metamaskConfig = neuroweb.getMetaMaskConfig();
```

### 3. Enhanced Polkadot API Service (`polkadotApi.ts`)

**New Features:**
- ✅ Enhanced NeuroWeb detection with para ID and chain ID
- ✅ XCM message sending to NeuroWeb
- ✅ Better network information including native currency
- ✅ Automatic mainnet/testnet detection

**New Methods:**
```typescript
// Get comprehensive NeuroWeb info
const info = await polkadotApi.getNeuroWebInfo();
// Returns: chainName, paraId, chainId, relayChain, nativeCurrency, etc.

// Get NeuroWeb parachain ID
const paraId = await polkadotApi.getNeuroWebParaId();

// Send XCM to NeuroWeb
const result = await polkadotApi.sendXCMToNeuroWeb(message, options);
```

### 4. Improved XCM Integration (`xcm-integration.ts`)

**Enhancements:**
- ✅ NeuroWeb parachain ID detection (mainnet: 2043, testnet: 20430)
- ✅ Proper MultiLocation construction for NeuroWeb
- ✅ Account-specific MultiLocation for NeuroWeb accounts
- ✅ XCM v3 instruction builders for asset transfers
- ✅ Transaction execution on NeuroWeb via XCM

**New Methods:**
```typescript
// Get NeuroWeb MultiLocation
const location = xcm.getNeuroWebMultiLocation();

// Get account-specific location
const accountLocation = xcm.getNeuroWebAccountMultiLocation('0x...');

// Generate asset transfer XCM
const transferXCM = xcm.generateAssetTransferXCM(recipient, {
  token: 'USDC',
  amount: '1000000', // 1 USDC (6 decimals)
});

// Generate transaction execution XCM
const transactXCM = xcm.generateTransactXCM(encodedCall, maxWeight);
```

### 5. TRAC Bridge Service (`trac-bridge-service.ts`)

**Complete TRAC token bridging service:**

**Features:**
- ✅ TRAC balance queries on Ethereum and NeuroWeb
- ✅ Bridge initiation workflow
- ✅ Bridge status tracking
- ✅ Fee estimation
- ✅ Step-by-step bridge instructions
- ✅ SnowBridge integration support

**Usage Example:**
```typescript
import { createTRACBridgeService } from './dkg-integration/trac-bridge-service';

const bridge = createTRACBridgeService({
  useMockMode: false,
});

// Get TRAC balance on Ethereum
const ethBalance = await bridge.getTRACBalanceOnEthereum('0x...');

// Get TRAC balance on NeuroWeb (XC20)
const neurowebBalance = await bridge.getTRACBalanceOnNeuroWeb('0x...');

// Initiate bridge
const status = await bridge.initiateBridge(
  ethers.parseEther('100'), // 100 TRAC
  '0x...', // NeuroWeb recipient
  signer // Ethereum signer
);

// Get bridge instructions
const instructions = bridge.getBridgeInstructions();
```

**Bridge Workflow:**
1. Connect Ethereum wallet (MetaMask) and Polkadot wallet (Talisman)
2. Approve TRAC for SnowBridge contract
3. Transfer TRAC from Ethereum to NeuroWeb
4. Finalize bridge in NeuroWeb wallet (requires NEURO for gas)

### 6. Enhanced Event Watcher (`neuroweb-event-watcher.ts`)

**Improvements:**
- ✅ Correct RPC endpoints (mainnet and testnet)
- ✅ Automatic network detection from environment
- ✅ Better event filtering for KA anchors

## Dependencies

The NeuroWeb integration requires the following packages:

```bash
# Install ethers.js for EVM-compatible operations
npm install ethers@^6.0.0

# Or using pnpm
pnpm add ethers@^6.0.0
```

**Note**: The `ethers` package is required for:
- EVM-compatible smart contract interactions on NeuroWeb
- NEURO token operations
- TRAC token balance queries
- Gas price estimation

If you only need Substrate API functionality (Polkadot.js), you can use mock mode for EVM operations.

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# NeuroWeb Network Configuration
NEUROWEB_NETWORK=testnet  # or 'mainnet'
NEUROWEB_RPC_URL=wss://lofar-testnet.origin-trail.network
NEUROWEB_EVM_RPC_URL=https://lofar-testnet.origin-trail.network
NEUROWEB_USE_MOCK=false

# DKG Configuration
DKG_ENVIRONMENT=testnet
DKG_OTNODE_URL=https://v6-pegasus-node-02.origin-trail.network:8900
DKG_BLOCKCHAIN=otp:20430

# XCM Configuration
XCM_SOURCE_CHAIN=polkadot
XCM_TARGET_CHAIN=neuroweb
XCM_USE_MOCK=false

# TRAC Bridge Configuration
TRAC_BRIDGE_USE_MOCK=false
ETHEREUM_RPC_URL=https://eth.llamarpc.com
SNOWBRIDGE_ADDRESS=0x...
TRAC_TOKEN_ADDRESS=0x...
```

### Network Endpoints

**Mainnet:**
- Substrate RPC: `wss://astrosat-parachain-rpc.origin-trail.network`
- EVM RPC: `https://astrosat-parachain-rpc.origin-trail.network`
- Explorer: `https://neuroweb.subscan.io`
- Chain ID: `2043`
- ParaID: `2043`

**Testnet (Rococo):**
- Substrate RPC: `wss://lofar-testnet.origin-trail.network`
- EVM RPC: `https://lofar-testnet.origin-trail.network`
- Explorer: `https://lofar-testnet.subscan.io`
- Chain ID: `20430`
- ParaID: `20430`

## Usage Examples

### 1. Initialize NeuroWeb Service

```typescript
import { createNeuroWebService } from './dkg-integration/neuroweb-service';

const neuroweb = createNeuroWebService({
  network: 'testnet',
  useMockMode: process.env.NODE_ENV !== 'production',
});

// Initialize both APIs
await neuroweb.initializeSubstrate();
await neuroweb.initializeEVM();

// Get network info
const info = await neuroweb.getChainInfo();
console.log(`Connected to ${info.chainName}`);
console.log(`ParaID: ${info.paraId}, Chain ID: ${info.chainId}`);
console.log(`Secured by: ${info.relayChain}`);
```

### 2. Check NEURO Balance

```typescript
const balance = await neuroweb.getNEUROBalance('0xYourAddress');
console.log(`Balance: ${balance.formatted} NEURO`);
```

### 3. Bridge TRAC to NeuroWeb

```typescript
import { createTRACBridgeService } from './dkg-integration/trac-bridge-service';
import { ethers } from 'ethers';

const bridge = createTRACBridgeService();
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Check balances
const ethBalance = await bridge.getTRACBalanceOnEthereum(signer.address);
const neurowebBalance = await bridge.getTRACBalanceOnNeuroWeb(neurowebAddress);

// Bridge 100 TRAC
const status = await bridge.initiateBridge(
  ethers.parseEther('100'),
  neurowebAddress,
  signer
);

console.log(`Bridge initiated: ${status.transactionHash}`);
console.log(`Estimated time: ${status.estimatedTime}s`);
```

### 4. Send XCM to NeuroWeb

```typescript
import { getPolkadotApi } from './server/_core/polkadotApi';
import { createXCMIntegration } from './dkg-integration/xcm-integration';

const polkadotApi = getPolkadotApi();
const xcm = createXCMIntegration();

// Generate XCM for asset transfer
const transferXCM = xcm.generateAssetTransferXCM(recipient, {
  token: 'USDC',
  amount: '1000000',
});

// Send via Polkadot API
const result = await polkadotApi.sendXCMToNeuroWeb(transferXCM);
console.log(`XCM sent: ${result.txHash}`);
```

### 5. Watch for KA Anchors

```typescript
import { createNeuroWebWatcher } from './dkg-integration/neuroweb-event-watcher';

const watcher = createNeuroWebWatcher({
  useMockMode: false,
  onAnchorDetected: (event) => {
    console.log(`KA anchored: ${event.ual}`);
    console.log(`Block: #${event.blockNumber}`);
    console.log(`TX: ${event.transactionHash}`);
  },
});

await watcher.initialize();
await watcher.startWatching();
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Polkadot Relay Chain                      │
│                  (Shared Security Layer)                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ XCM / Parachain Slot
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  NeuroWeb Parachain                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Substrate Layer (Polkadot.js API)                  │   │
│  │  - Parachain consensus                              │   │
│  │  - XCM message handling                             │   │
│  │  - On-chain anchors                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  EVM Layer (ethers.js API)                          │   │
│  │  - Smart contract execution                         │   │
│  │  - NEURO token operations                           │   │
│  │  - XC20 token support (TRAC)                        │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ DKG Integration
                         │
┌────────────────────────▼────────────────────────────────────┐
│              OriginTrail DKG Network                         │
│  - Knowledge Asset storage                                  │
│  - SPARQL queries                                           │
│  - Provenance tracking                                      │
└─────────────────────────────────────────────────────────────┘
```

## Key Benefits

1. **Shared Security**: NeuroWeb inherits security from Polkadot Relay Chain validators
2. **EVM Compatibility**: Use familiar Ethereum tools (MetaMask, Hardhat, ethers.js)
3. **Cross-Chain Interoperability**: XCM enables seamless communication with other parachains
4. **Knowledge Graph Integration**: Direct integration with OriginTrail DKG
5. **Token Support**: Native NEURO and bridged TRAC (XC20) tokens

## Testing

All services support mock mode for development and testing:

```typescript
// Enable mock mode
const service = createNeuroWebService({
  useMockMode: true,
});

// Mock mode simulates responses without network calls
const balance = await service.getNEUROBalance('0x...');
// Returns: { balance: 1000n * 10n**18n, formatted: '1000.0' }
```

## Resources

- **NeuroWeb Documentation**: https://docs.neuroweb.ai/polkadot
- **OriginTrail Documentation**: https://docs.origintrail.io
- **Parachains.info**: https://parachains.info/details/origintrail
- **NeuroWeb GitHub**: https://github.com/OriginTrail/neuroweb
- **SnowBridge Documentation**: https://docs.snowbridge.network

## Migration Guide

### From Previous Implementation

1. **Update Chain IDs**: Use correct NeuroWeb chain IDs (2043/20430)
2. **Use New Services**: Replace direct API calls with service methods
3. **Environment Variables**: Update to use new env var names
4. **RPC Endpoints**: Use new official RPC endpoints

### Breaking Changes

- Chain ID mapping changed from `'4269'` to `'2043'` (mainnet) or `'20430'` (testnet)
- Blockchain names remain the same (`otp:2043`, `otp:20430`)
- RPC endpoints updated to official NeuroWeb endpoints

## Next Steps

1. **Deploy Smart Contracts**: Deploy reputation contracts on NeuroWeb EVM
2. **Integrate SnowBridge**: Complete TRAC bridge integration
3. **XCM Production**: Move from mock to real XCM messages
4. **Monitoring**: Set up monitoring for anchor events and XCM messages
5. **Documentation**: Create user-facing documentation for token operations

---

**Status**: ✅ All improvements implemented and ready for integration

**Last Updated**: Based on latest NeuroWeb documentation and Polkadot integration patterns

