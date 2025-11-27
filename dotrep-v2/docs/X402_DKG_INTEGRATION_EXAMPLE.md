# x402 + DKG Integration Example

This document demonstrates how to use the improved DotRep system with x402 payments and DKG integration.

## Example 1: AI Agent Querying Premium Reputation

```typescript
/**
 * Example: AI agent automatically handling x402 payment to query reputation
 * 
 * This demonstrates the Agent Layer integration where AI agents can
 * autonomously pay for premium reputation data.
 */

async function queryReputationWithX402(userId: string) {
  // Step 1: Initial request (will receive HTTP 402)
  const response = await fetch(`http://localhost:3000/api/premium/reputation-score/${userId}`);
  
  if (response.status === 402) {
    // Step 2: Parse payment request from 402 response
    const paymentRequest = await response.json();
    
    // Step 3: Agent signs and submits payment via x402 facilitator
    const paymentProof = await signAndSubmitPayment(paymentRequest);
    
    // Step 4: Retry request with payment proof
    const paidResponse = await fetch(
      `http://localhost:3000/api/premium/reputation-score/${userId}`,
      {
        headers: {
          'X-PAYMENT': JSON.stringify(paymentProof)
        }
      }
    );
    
    const data = await paidResponse.json();
    
    // Step 5: Use verifiable DKG-backed reputation data
    console.log('Reputation Score:', data.data.reputation.overall);
    console.log('DKG UAL (verifiable):', data.data.dkgUAL);
    console.log('MCP Metadata:', data.data.mcp);
    
    return data;
  }
}

async function signAndSubmitPayment(paymentRequest: any) {
  // In production, this would:
  // 1. Sign payment with agent's wallet
  // 2. Submit to x402 facilitator
  // 3. Wait for confirmation
  // 4. Return payment proof
  
  return {
    txHash: '0x...',
    chain: paymentRequest.paymentRequest.chains[0],
    amount: paymentRequest.paymentRequest.amount,
    currency: paymentRequest.paymentRequest.currency,
    challenge: paymentRequest.paymentRequest.challenge
  };
}
```

## Example 2: Publishing Reputation to DKG

```typescript
/**
 * Example: Calculate reputation and automatically publish to DKG
 * 
 * This demonstrates the Knowledge Layer integration where reputation
 * data is stored as verifiable Knowledge Assets on OriginTrail DKG.
 */

import { ReputationCalculator } from './server/_core/reputationCalculator';
import { createDKGClientV8 } from './dkg-integration/dkg-client-v8';

async function calculateAndPublishReputation(userId: string) {
  // Initialize DKG client
  const dkgClient = createDKGClientV8({
    useMockMode: process.env.DKG_USE_MOCK === 'true',
    fallbackToMock: true
  });
  
  // Initialize reputation calculator
  const calculator = new ReputationCalculator();
  
  // Get user contributions (from database)
  const contributions = await getUserContributions(userId);
  
  // Calculate reputation with auto-publish to DKG
  const reputationScore = await calculator.calculateReputation({
    contributions,
    algorithmWeights: {
      github_pr: 1.0,
      github_commit: 0.5,
      gitlab_mr: 1.0,
      other: 0.3
    },
    timeDecayFactor: 0.01,
    userId,
    includeSafetyScore: true, // Guardian dataset integration
    includeHighlyTrustedDetermination: true,
    publishToDKG: true, // Auto-publish to DKG
    dkgClient
  });
  
  console.log('Reputation Score:', reputationScore.overall);
  console.log('Safety Score:', reputationScore.safetyScore);
  console.log('Sybil Risk:', reputationScore.sybilRisk);
  
  // Reputation is now stored on DKG as a Knowledge Asset
  // Query it using SPARQL:
  const sparqlQuery = `
    PREFIX schema: <https://schema.org/>
    SELECT ?score ?safetyScore ?sybilRisk
    WHERE {
      ?reputation schema:identifier "${userId}" .
      ?reputation schema:value ?score .
      ?reputation schema:safetyScore ?safetyScore .
      ?reputation schema:sybilRisk ?sybilRisk .
    }
  `;
  
  const dkgResults = await dkgClient.executeSafeQuery(sparqlQuery, 'SELECT');
  console.log('DKG Query Results:', dkgResults);
  
  return reputationScore;
}
```

## Example 3: Sybil Analysis with Guardian Dataset

```typescript
/**
 * Example: Comprehensive Sybil analysis using Guardian dataset
 * 
 * This demonstrates the Trust Layer integration with Guardian dataset
 * for enhanced Sybil resistance.
 */

import { getGuardianVerificationService } from './dkg-integration/guardian-verification';
import { BotClusterDetector } from './server/_core/botClusterDetector';

async function analyzeSybilRisk(userId: string) {
  // Get Guardian safety score
  const guardianService = getGuardianVerificationService();
  const safetyData = await guardianService.calculateCreatorSafetyScore(userId);
  
  console.log('Guardian Safety Score:', safetyData.safetyScore);
  console.log('Risk Factors:', safetyData.riskFactors);
  
  // Detect bot clusters
  const detector = new BotClusterDetector();
  const botDetection = await detector.detectBotClusters([userId]);
  
  console.log('Confirmed Bot Clusters:', botDetection.confirmedBotClusters.length);
  console.log('Suspicious Clusters:', botDetection.suspiciousClusters.length);
  console.log('Individual Bots:', botDetection.individualBots.length);
  
  // Combine analysis
  const sybilRisk = calculateCombinedSybilRisk(safetyData, botDetection);
  
  console.log('Combined Sybil Risk:', sybilRisk);
  
  return {
    guardianSafetyScore: safetyData.safetyScore,
    botDetection,
    combinedSybilRisk: sybilRisk
  };
}

function calculateCombinedSybilRisk(
  guardianData: any,
  botDetection: any
): number {
  // Weighted combination of Guardian and bot detection
  const guardianWeight = 0.6;
  const botDetectionWeight = 0.4;
  
  const guardianRisk = 1 - guardianData.safetyScore;
  const botRisk = botDetection.confirmedBotClusters.length > 0 ? 0.8 :
                  botDetection.suspiciousClusters.length > 0 ? 0.5 : 0.2;
  
  return (guardianRisk * guardianWeight) + (botRisk * botDetectionWeight);
}
```

## Example 4: Complete Three-Layer Workflow

```typescript
/**
 * Example: Complete workflow demonstrating all three layers
 * 
 * Agent Layer: AI agent queries reputation
 * Knowledge Layer: Reputation stored on DKG
 * Trust Layer: x402 payment + Guardian verification
 */

async function completeReputationWorkflow(userId: string) {
  // ============================================================
  // TRUST LAYER: x402 Payment + Guardian Verification
  // ============================================================
  
  // 1. Get Guardian safety score
  const guardianService = getGuardianVerificationService();
  const safetyData = await guardianService.calculateCreatorSafetyScore(userId);
  
  // 2. Handle x402 payment (if needed)
  const paymentProof = await handleX402Payment('reputation-score', '0.10');
  
  // ============================================================
  // KNOWLEDGE LAYER: DKG Publishing
  // ============================================================
  
  // 3. Calculate reputation with DKG publishing
  const dkgClient = createDKGClientV8({ useMockMode: false });
  const calculator = new ReputationCalculator();
  
  const reputationScore = await calculator.calculateReputation({
    contributions: await getUserContributions(userId),
    algorithmWeights: { github_pr: 1.0 },
    timeDecayFactor: 0.01,
    userId,
    includeSafetyScore: true,
    includeHighlyTrustedDetermination: true,
    publishToDKG: true,
    dkgClient
  });
  
  // ============================================================
  // AGENT LAYER: MCP-Compatible Response
  // ============================================================
  
  // 4. Return MCP-compatible response for AI agents
  return {
    success: true,
    data: {
      userId,
      reputation: reputationScore,
      guardianSafetyScore: safetyData.safetyScore,
      dkgUAL: reputationScore.dkgUAL, // From DKG publishing
      paymentProof: paymentProof.txHash,
      mcp: {
        tool: 'get_reputation_score',
        version: '1.0.0',
        verifiable: true,
        source: 'dotrep_premium_api'
      }
    }
  };
}
```

## Example 5: SPARQL Query for Reputation Insights

```typescript
/**
 * Example: Query reputation data from DKG using SPARQL
 * 
 * This demonstrates how to query Knowledge Assets published to DKG.
 */

async function queryReputationFromDKG(userId: string) {
  const dkgClient = createDKGClientV8({ useMockMode: false });
  
  // Query for reputation score and related data
  const sparqlQuery = `
    PREFIX schema: <https://schema.org/>
    PREFIX prov: <https://www.w3.org/ns/prov#>
    
    SELECT ?reputation ?score ?safetyScore ?sybilRisk ?timestamp
    WHERE {
      ?reputation schema:identifier "${userId}" .
      ?reputation schema:value ?score .
      ?reputation schema:safetyScore ?safetyScore .
      ?reputation schema:sybilRisk ?sybilRisk .
      ?reputation schema:dateCreated ?timestamp .
      
      # Optional: Get previous versions
      OPTIONAL {
        ?reputation prov:wasRevisionOf ?previousVersion .
      }
    }
    ORDER BY DESC(?timestamp)
    LIMIT 10
  `;
  
  const results = await dkgClient.executeSafeQuery(sparqlQuery, 'SELECT');
  
  console.log('Reputation History from DKG:');
  results.forEach((result: any) => {
    console.log(`Score: ${result.score}, Safety: ${result.safetyScore}, Risk: ${result.sybilRisk}`);
  });
  
  return results;
}
```

## Environment Setup

```bash
# .env file
X402_WALLET_ADDRESS=0x...
X402_FACILITATOR_URL=https://x402.org/facilitator
DKG_USE_MOCK=false
DKG_ENABLE_TOKEN_GATING=true
GUARDIAN_API_URL=https://guardian.umanitek.com
GUARDIAN_API_KEY=...
```

## Testing

```bash
# Test premium reputation endpoint
curl "http://localhost:3000/api/premium/reputation-score/alice" \
  -H "X-PAYMENT: {\"txHash\":\"0x123\",\"chain\":\"base-sepolia\",\"amount\":\"0.10\",\"currency\":\"USDC\"}"

# Test Sybil analysis
curl "http://localhost:3000/api/premium/sybil-analysis-report?userId=alice" \
  -H "X-PAYMENT: {\"txHash\":\"0x456\",\"chain\":\"base-sepolia\",\"amount\":\"0.25\",\"currency\":\"USDC\"}"
```

