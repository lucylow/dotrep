# AI Agents & DKG Demo Page

## Overview

This page provides a comprehensive, interactive demonstration of AI agents interacting with the OriginTrail Decentralized Knowledge Graph (DKG). It showcases three core operations:

1. **Querying DKG** - AI agents retrieve reputation data from DKG
2. **Verifying Assets** - AI agents verify the authenticity and integrity of DKG assets
3. **Publishing to DKG** - AI agents publish reputation data as Knowledge Assets
4. **Social Reputation** - Interactive demonstration of social reputation profiles

## Features

### 1. Query DKG Tab
- Enter a UAL (Uniform Asset Locator) to query reputation data
- View detailed query results including reputation scores, social metrics, and sybil risk
- See query history with status indicators
- Step-by-step visualization of the AI agent query process

### 2. Verify Asset Tab
- Verify DKG assets for authenticity and integrity
- Check blockchain anchoring and data integrity
- View verification confidence scores and blockchain proofs
- See verification history
- Step-by-step visualization of the verification process

### 3. Publish Asset Tab
- Publish reputation data to DKG as Knowledge Assets
- Enter developer ID and reputation score
- Receive UAL (Uniform Asset Locator) for published assets
- View transaction hashes and publication status
- Step-by-step visualization of the publishing process

### 4. Social Reputation Tab
- Browse social reputation profiles with mock data
- Search profiles by name, username, or specialty
- View detailed profile information including:
  - Reputation metrics (overall score, social rank, economic stake)
  - Social metrics (followers, engagement rate, total posts)
  - Sybil resistance scores
  - Campaign participation
  - Total earnings
  - DKG UALs
- Quick actions to query or verify selected profiles
- Social graph overview with connection statistics

## How to Access

Navigate to: `/ai-agents-dkg-demo`

Or use the route in your navigation:
```typescript
<Link href="/ai-agents-dkg-demo">AI Agents & DKG Demo</Link>
```

## Mock Data

The demo uses mock data from:
- `src/data/socialReputationMockData.ts` - Social reputation profiles
- Mock DKG operations are simulated with realistic delays and results

## Key Demonstrations

### AI Agent Query Process
1. Agent receives query request
2. Connects to DKG Edge Node
3. Retrieves Knowledge Asset
4. Returns processed results

### AI Agent Verification Process
1. Retrieves asset from DKG
2. Checks blockchain anchoring
3. Validates data integrity
4. Returns verification result with proof

### AI Agent Publishing Process
1. Prepares Knowledge Asset (JSON-LD format)
2. Publishes to DKG Edge Node
3. Blockchain anchoring occurs
4. Receives UAL for the asset

### Social Reputation
- Real-time profile browsing
- Detailed metrics visualization
- Quick actions for DKG operations
- Network overview statistics

## Technical Details

- Built with React and TypeScript
- Uses shadcn/ui components for consistent UI
- Fully responsive design
- Mock operations simulate realistic DKG interactions
- Clear visual feedback for all operations
- History tracking for queries, verifications, and publications

## Integration Points

This demo page demonstrates the three-layer architecture:
- **Agent Layer**: AI agents performing operations
- **Knowledge Layer**: OriginTrail DKG storing verifiable data
- **Trust Layer**: Blockchain anchoring on Polkadot/NeuroWeb

## Future Enhancements

- Real DKG Edge Node integration
- Actual blockchain transaction submission
- Real-time query updates
- More detailed verification proofs
- Enhanced social graph visualization

