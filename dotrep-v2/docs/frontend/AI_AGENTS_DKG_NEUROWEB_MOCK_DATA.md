# AI Agents DKG & NeuroWeb Mock Data

## Overview

This document describes the comprehensive mock data created to showcase working AI agents leveraging OriginTrail DKG (Decentralized Knowledge Graph) with NeuroWeb parachain on Polkadot.

## Location

The mock data is located at:
- **Mock Data File**: `dotrep-v2/client/src/data/aiAgentsDKGNeuroWebMockData.ts`
- **Demo Page**: `dotrep-v2/client/src/pages/AIAgentsDKGDemoPage.tsx`
- **Route**: `/ai-agents-dkg-demo`

## Features

### 1. AI Agent Mock Data

The mock data includes 5 different AI agents:

- **DKG Navigator Agent**: Queries and navigates the OriginTrail DKG
- **DKG Publisher Agent**: Publishes reputation assets to DKG with NeuroWeb anchoring
- **DKG Verifier Agent**: Verifies DKG assets using NeuroWeb blockchain proofs
- **Reputation Detective Agent**: Analyzes reputation patterns using DKG queries
- **Workflow Orchestrator Agent**: Coordinates multi-agent workflows

Each agent includes:
- Agent capabilities and status
- DKG and NeuroWeb connection status
- Operation statistics (total operations, success rate)
- Last activity timestamp

### 2. DKG Knowledge Assets

Mock DKG knowledge assets with:
- **UAL (Uniform Asset Locator)**: Unique identifiers for each asset
- **Asset Types**: reputation, contribution, profile, campaign, verification
- **NeuroWeb Anchors**: Complete blockchain anchoring information including:
  - Block number
  - Transaction hash
  - Block hash
  - ParaID (2043 for mainnet, 20430 for testnet)
  - Chain ID
  - Anchor timestamp
- **Content Hash**: Cryptographic hash for verification
- **Verification Status**: verified, pending, or failed
- **Linked Assets**: Related DKG assets via UALs
- **Metadata**: JSON-LD schema information and provenance

### 3. NeuroWeb Transactions

Mock NeuroWeb parachain transactions showing:
- Transaction hashes
- Block numbers and hashes
- ParaID and Chain ID
- Transaction types: anchor, query, verification, payment
- Gas usage and pricing
- Related DKG UALs
- Agent IDs that initiated transactions

### 4. Agent Workflows

Multi-agent workflows demonstrating:
- **Workflow Steps**: Sequential operations across multiple agents
- **DKG Operations**: Publishing, querying, and verifying assets
- **NeuroWeb Transactions**: Blockchain anchoring and verification
- **Workflow Status**: running, completed, failed, paused
- **Timestamps**: Start and completion times
- **Results**: Created DKG assets and NeuroWeb transactions

### 5. Agent DKG Actions

Individual agent actions showing:
- Action types: dkg_query, dkg_publish, dkg_verify, neuroweb_anchor, neuroweb_verify
- Input and output data
- Status and duration
- Related UALs and transaction hashes

## Demo Page Features

The enhanced demo page (`AIAgentsDKGDemoPage.tsx`) includes 6 tabs:

### 1. AI Agents Tab
- Grid display of all AI agents
- Agent capabilities and status badges
- DKG and NeuroWeb connection indicators
- Agent statistics overview
- Recent agent actions with DKG operations

### 2. Workflows Tab
- Complete workflow visualization
- Step-by-step progress indicators
- DKG asset creation tracking
- NeuroWeb transaction details
- Workflow statistics

### 3. Query DKG Tab
- Available DKG Knowledge Assets with NeuroWeb anchors
- Asset details including blockchain proof
- Interactive query interface
- Query history
- Agent query process visualization

### 4. Verify Asset Tab
- Asset verification interface
- NeuroWeb blockchain proof display
- Verification sources and confidence scores
- Verification history

### 5. Publish Asset Tab
- Publish reputation data to DKG
- NeuroWeb anchoring simulation
- Publication history
- Publishing process visualization

### 6. Social Reputation Tab
- Social reputation profiles
- Profile search and filtering
- Social graph overview
- Integration with DKG assets

## Key Demonstrations

### 1. Three-Layer Architecture
- **Agent Layer**: AI agents with MCP capabilities
- **Knowledge Layer**: OriginTrail DKG with JSON-LD assets
- **Trust Layer**: NeuroWeb parachain on Polkadot for blockchain anchoring

### 2. DKG Integration
- UAL-based asset addressing
- SPARQL query capabilities
- JSON-LD structured data
- Provenance tracking

### 3. NeuroWeb Integration
- Blockchain anchoring of DKG content hashes
- ParaID 20430 (testnet) / 2043 (mainnet)
- Transaction verification
- Block number and hash references

### 4. Agent Orchestration
- Multi-agent workflows
- Coordinated DKG operations
- Automated NeuroWeb anchoring
- Error handling and status tracking

## Usage Examples

### Access the Demo Page
Navigate to: `/ai-agents-dkg-demo`

### Query a DKG Asset
1. Go to "Query DKG" tab
2. Select an asset from "Available DKG Knowledge Assets"
3. Click "Query" button or paste UAL
4. View results with reputation data

### View Agent Workflows
1. Go to "Workflows" tab
2. See complete workflow steps
3. View DKG assets created
4. Check NeuroWeb transactions

### Explore AI Agents
1. Go to "AI Agents" tab
2. View agent capabilities
3. Check DKG and NeuroWeb connections
4. See recent agent actions

## Helper Functions

The mock data file includes helper functions:

- `getAIAgent(agentId)`: Get agent by ID
- `getDKGAsset(ual)`: Get DKG asset by UAL
- `getNeuroWebTransaction(txHash)`: Get transaction by hash
- `getAgentActions(agentId)`: Get actions for an agent
- `getAgentWorkflow(workflowId)`: Get workflow by ID
- `getActiveAgentWorkflows()`: Get running workflows
- `getRecentDKGActions(limit)`: Get recent actions
- `getNeuroWebTransactionsForUAL(ual)`: Get transactions for UAL
- `getVerifiedDKGAssets()`: Get verified assets
- `getAgentStatistics()`: Get agent statistics
- `getDKGStatistics()`: Get DKG statistics
- `getWorkflowStatistics()`: Get workflow statistics

## Integration Points

### OriginTrail DKG
- Edge Node connectivity simulation
- UAL addressing system
- JSON-LD data format
- SPARQL query interface
- Asset versioning

### NeuroWeb Parachain
- Polkadot parachain (ParaID 20430 testnet / 2043 mainnet)
- EVM-compatible transactions
- Content hash anchoring
- Block and transaction verification
- Chain ID configuration

### Polkadot Ecosystem
- Parachain slot allocation
- Shared security model
- XCM cross-chain messaging
- Relay chain integration

## Mock Data Structure

### AI Agent
```typescript
{
  agentId: string;
  agentName: string;
  agentType: "navigator" | "detective" | "publisher" | ...
  dkgEnabled: boolean;
  neuroWebConnected: boolean;
  totalOperations: number;
  successRate: number;
}
```

### DKG Knowledge Asset
```typescript
{
  ual: string; // did:dkg:otp:20430:0x...
  neuroWebAnchor: {
    blockNumber: number;
    transactionHash: string;
    paraId: number; // 20430 or 2043
    chainId: number;
  };
  verificationStatus: "verified" | "pending" | "failed";
}
```

### Agent Workflow
```typescript
{
  workflowId: string;
  agentIds: string[];
  steps: WorkflowStep[];
  dkgAssetsCreated: string[]; // UALs
  neuroWebTransactions: string[]; // TX hashes
}
```

## Benefits

1. **Comprehensive Demo**: Shows complete AI agent ecosystem with DKG and NeuroWeb
2. **Realistic Data**: Mock data closely mirrors real-world scenarios
3. **Interactive UI**: Users can explore agents, workflows, and assets
4. **Blockchain Proof**: Demonstrates NeuroWeb anchoring and verification
5. **Multi-Agent Coordination**: Shows orchestrated workflows
6. **Verifiable Data**: All assets include blockchain proofs

## Future Enhancements

Potential additions:
- Real-time agent status updates
- Live DKG query integration
- Actual NeuroWeb transaction monitoring
- Agent performance metrics
- Workflow execution visualization
- Cross-chain reputation queries

## References

- OriginTrail DKG Documentation: https://docs.origintrail.io/
- NeuroWeb Documentation: https://docs.neuroweb.ai/
- Polkadot Documentation: https://docs.polkadot.network/

