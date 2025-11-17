# DotRep Wallet Connection Features

This document describes the comprehensive wallet connection system with reputation integration for the DotRep platform.

## Overview

The DotRep wallet connection system provides enhanced authentication and identity features that leverage Polkadot's unique capabilities while showcasing the reputation system's value. It transforms the standard wallet connection from a simple authentication step into a rich, context-aware experience.

## Features

### 1. Reputation-Gated dApp Access

Certain dApp features require minimum reputation scores to access. After wallet connection, the system checks the user's reputation and unlocks features accordingly.

**Example:**
```typescript
const result = await walletConnection.connectWithReputation();
if (result.reputation.score < 100) {
  showBasicFeatures();
} else {
  unlockAdvancedTools(); // Governance, proposal creation, etc.
}
```

### 2. Multi-Chain Identity Aggregation

Shows unified reputation across all Polkadot parachains where the user has activity. Wallet connection triggers XCM queries to multiple parachains to aggregate the user's complete reputation profile.

**Supported Chains:**
- Asset Hub
- Moonbeam
- Acala
- Astar
- And more...

### 3. Soulbound NFT Badge Display

Automatically displays achievement NFTs in the wallet connection UI. The system queries the Assets Chain for SBTs owned by the connected account with DotRep metadata.

**Badge Types:**
- First Contribution
- Governance Pro
- Documentation Hero
- Code Reviewer
- Mentor
- And more...

### 4. Live Reputation Preview During Connection

Shows reputation data *before* finalizing wallet connection, allowing users to immediately see value and increasing connection completion rates.

### 5. Connection-Level Permissions

Granular permissions beyond basic account access:
- Read reputation data
- Read contribution history
- Read skill tags
- Write permissions for reputation actions (endorsements, etc.)

### 6. Context-Aware Features

When connecting to a specific dApp, the system highlights relevant reputation aspects:

- **DeFi Platform**: Shows "DeFi Expertise: 850 | Smart Contract Audits: 3"
- **Governance dApp**: Shows "Governance Participation: 92% | Successful Proposals: 2"

### 7. Cross-Chain Reputation Portability

Uses XCM to verify reputation across ecosystems during wallet connection. Users can connect with an address from another parachain but get privileges based on their DotRep reputation.

### 8. Reputation-Based Transaction Sponsorship

High-reputation users can get gas fees sponsored or reduced. The system checks reputation score after connection and applies fee logic accordingly.

### 9. Trust Score for Wallet Interactions

Displays trust indicators for wallet addresses during connection, helping prevent phishing by showing reputation context for addresses.

## Usage

### Basic Usage

```typescript
import { DotRepWalletConnect } from "@/components/wallet";

function MyComponent() {
  const handleConnect = (result) => {
    console.log("Connected:", result.account.address);
    console.log("Reputation:", result.reputation);
  };

  return (
    <DotRepWalletConnect
      onSuccess={handleConnect}
      options={{
        dappName: "My dApp",
        showReputationPreview: true
      }}
    />
  );
}
```

### Using the Hook

```typescript
import { useDotRepWallet } from "@/client/src/_core/hooks/useDotRepWallet";

function MyComponent() {
  const { connect, isConnecting, isConnected, connectionResult } = useDotRepWallet({
    onConnect: (result) => {
      console.log("Connected with reputation:", result.reputation);
    }
  });

  const handleConnect = async () => {
    await connect({
      contextAware: {
        dappType: "defi",
        highlightSkills: ["Smart Contracts", "DeFi"]
      }
    });
  };

  return (
    <button onClick={handleConnect} disabled={isConnecting}>
      {isConnecting ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}
```

### Context-Aware Connection

```typescript
// For a DeFi platform
await connect({
  contextAware: {
    dappType: "defi",
    highlightSkills: ["Smart Contracts", "Auditing", "DeFi"]
  }
});

// For a Governance dApp
await connect({
  contextAware: {
    dappType: "governance",
    highlightSkills: ["Governance", "Proposals", "Community"]
  }
});
```

### Reputation-Gated Access

```typescript
const result = await connect();

// Check reputation threshold
if (result.reputation.score >= 100) {
  // Unlock advanced features
  enableGovernanceFeatures();
  enableProposalCreation();
} else {
  // Show basic features only
  showBasicFeatures();
}
```

## Components

### DotRepWalletConnect

Main wallet connection component with reputation integration.

**Props:**
- `onSuccess?: (result: WalletConnectionResult) => void` - Callback when connection succeeds
- `onError?: (error: Error) => void` - Callback when connection fails
- `options?: ConnectionOptions` - Connection options
- `open?: boolean` - Controlled open state
- `onOpenChange?: (open: boolean) => void` - Callback for open state changes

### ReputationPreview

Displays reputation preview during connection flow.

**Props:**
- `reputation: ReputationData` - Reputation data to display
- `address: string` - Wallet address

### NftBadgeDisplay

Shows achievement NFT badges.

**Props:**
- `badges: NftBadge[]` - Array of NFT badges
- `maxDisplay?: number` - Maximum badges to display (default: 6)

### TrustScoreDisplay

Displays trust score and verification status.

**Props:**
- `reputation: ReputationData` - Reputation data
- `address: string` - Wallet address

## API Endpoints

### Backend Endpoints

All endpoints are available via tRPC:

- `polkadot.reputation.preview` - Preview reputation before connection
- `polkadot.reputation.getMultiChain` - Get multi-chain reputation
- `polkadot.reputation.getContextAware` - Get context-aware reputation
- `polkadot.xcm.verifyCrossChain` - Verify cross-chain reputation
- `polkadot.nft.getByAccount` - Get NFT badges for account

## Reputation Tiers

- **Novice**: 0-99 points
- **Contributor**: 100-499 points
- **Expert**: 500-999 points
- **Legend**: 1000+ points

## Supported Wallets

1. **Polkadot.js Extension** (Primary)
2. **Talisman** (Enhanced with custom reputation display)
3. **SubWallet** (Integration via standard extension interface)
4. **Nova Wallet** (Mobile-first experience)

## Security Features

- Cryptographic verification of wallet ownership
- Reputation data fetched directly from blockchain
- Permission-based access control
- Trust score indicators to prevent phishing
- Cross-chain verification via XCM

## Future Enhancements

- Real-time reputation updates during session
- Reputation-based fee discounts
- Advanced XCM integration for multi-chain queries
- Mobile wallet optimizations
- Reputation analytics dashboard
- Social proof integration

## Troubleshooting

### No Polkadot Extension Found

Make sure the Polkadot.js extension is installed and enabled in your browser.

### Reputation Not Loading

Check that:
1. The Polkadot node is running and accessible
2. The WebSocket endpoint is correct
3. The account has on-chain reputation data

### Cross-Chain Queries Failing

XCM queries require:
1. Proper XCM configuration on the parachain
2. Sufficient balance for XCM fees
3. Valid target chain configuration

## Examples

See the `examples/` directory for complete usage examples:
- Basic connection
- Context-aware connection
- Reputation-gated features
- Multi-chain aggregation
- NFT badge display


