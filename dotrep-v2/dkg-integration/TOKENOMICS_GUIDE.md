# OriginTrail Tokenomics Integration Guide

This guide explains how to use the tokenomics service for managing TRAC and NEURO fees in the DotRep DKG integration.

## Overview

The OriginTrail ecosystem uses a two-token model:
- **TRAC**: Utility token for DKG operations (publishing, storage, staking)
- **NEURO**: Native token of NeuroWeb parachain (gas fees, collator staking)

## Key Features

1. **Cost Estimation**: Estimate TRAC and NEURO fees before publishing
2. **Batching Optimization**: Reduce gas costs by batching multiple publishes
3. **Fee Tracking**: Track all fees spent across operations
4. **Simulation Mode**: Use reduced fees for hack/prototype development
5. **Cost Reporting**: Get detailed statistics on token usage

## Basic Usage

### 1. Publishing with Cost Estimation

```typescript
import { DKGClientV8 } from './dkg-client-v8';
import { KnowledgeAssetPublisherV8 } from './knowledge-asset-publisher-v8';

const dkgClient = new DKGClientV8({
  environment: 'testnet',
  simulationMode: true // Use 10% of real fees for development
});

const publisher = new KnowledgeAssetPublisherV8(dkgClient);

// Estimate cost before publishing
const costEstimate = publisher.estimatePublishCost(epochs: 2);
console.log(`Estimated cost: ${costEstimate.tracFee} TRAC + ${costEstimate.neuroGasFee} NEURO`);

// Publish with automatic cost tracking
const result = await publisher.publishDeveloperReputation(reputationData, {
  epochs: 2
});

// Result includes cost information
console.log(`Published: ${result.UAL}`);
console.log(`Cost: ${result.costEstimate?.tracFee} TRAC`);
```

### 2. Batch Publishing with Cost Optimization

```typescript
// Batch publish multiple developers
const batchResult = await publisher.batchPublish(reputationDataList, {
  epochs: 2,
  batchSize: 10, // Optimal batch size
  delayBetweenBatches: 1000 // 1 second delay
});

console.log(`Published: ${batchResult.summary.totalPublished} developers`);
console.log(`Total cost: ${batchResult.summary.totalTracSpent} TRAC`);
console.log(`Gas savings: ${batchResult.batchCostEstimate.savingsFromBatching.percentage}%`);
```

### 3. Cost Estimation for Planning

```typescript
const tokenomics = publisher.getTokenomicsService();

// Estimate single publish
const singleCost = tokenomics.estimatePublishCost(epochs: 2);
console.log(`Single publish: ${tokenomics.formatTRAC(singleCost.tracFee)}`);

// Estimate batch publish
const batchCost = tokenomics.estimateBatchPublishCost(assetCount: 100, epochs: 2);
console.log(`Batch of 100: ${tokenomics.formatTRAC(batchCost.totalTracFee)}`);
console.log(`Savings: ${batchCost.savingsFromBatching.percentage.toFixed(1)}%`);
```

### 4. Fee Statistics and Reporting

```typescript
// Get fee statistics
const stats = publisher.getFeeStatistics();

console.log(`Total TRAC spent: ${tokenomics.formatTRAC(stats.totalTracSpent)}`);
console.log(`Total NEURO spent: ${tokenomics.formatNEURO(stats.totalNeuroSpent)}`);
console.log(`Total USD cost: $${stats.totalCostUSD.toFixed(2)}`);
console.log(`Operations:`, stats.operationCounts);
```

## Configuration

### Environment Variables

```bash
# Token prices (for USD cost estimation)
TRAC_PRICE_USD=0.15
NEURO_PRICE_USD=0.01

# Enable simulation mode (10% of real fees)
DKG_SIMULATION_MODE=true

# DKG configuration
DKG_ENVIRONMENT=testnet
DKG_USE_MOCK=false
```

### Custom Configuration

```typescript
import { createTokenomicsService } from './tokenomics-service';

const tokenomics = createTokenomicsService({
  // TRAC configuration
  tracPriceUSD: 0.15,
  basePublishFee: BigInt(100) * BigInt(10 ** 15), // 0.1 TRAC
  storageFeePerEpoch: BigInt(50) * BigInt(10 ** 15), // 0.05 TRAC per epoch
  
  // NEURO configuration
  neuroPriceUSD: 0.01,
  baseGasFee: BigInt(1) * BigInt(10 ** 15), // 0.001 NEURO
  
  // Batching
  enableBatching: true,
  batchSize: 10,
  batchDelay: 1000,
  
  // Simulation mode
  simulationMode: true,
  simulationFeeMultiplier: 0.1 // 10% of real fees
});
```

## Cost Optimization Strategies

### 1. Batch Publishing

Instead of publishing one-by-one:
```typescript
// ❌ Inefficient: 100 separate transactions
for (const data of reputationDataList) {
  await publisher.publishDeveloperReputation(data);
}

// ✅ Efficient: Batched transactions
await publisher.batchPublish(reputationDataList, { batchSize: 10 });
```

### 2. Reduce Update Frequency

Updates cost 50% of publish fees. Batch updates instead of frequent small updates:
```typescript
// ❌ Inefficient: Update after every change
await publisher.updateDeveloperReputation(developerId, { score: newScore });

// ✅ Efficient: Batch updates periodically
// Collect changes and update once per day/hour
```

### 3. Optimize Epochs

More epochs = higher storage fees. Use minimum epochs needed:
```typescript
// Use 2 epochs (default) unless longer storage is required
await publisher.publishDeveloperReputation(data, { epochs: 2 });
```

### 4. Use Simulation Mode for Development

```typescript
const dkgClient = new DKGClientV8({
  environment: 'testnet',
  simulationMode: true // 10% of real fees
});
```

## Tokenomics Details

### TRAC Fees

- **Base Publish Fee**: ~0.1 TRAC per Knowledge Asset
- **Storage Fee**: ~0.05 TRAC per epoch
- **Update Fee**: 50% of publish fee
- **Fixed Supply**: 500M TRAC (no inflation)

### NEURO Gas Fees

- **Base Gas Fee**: ~0.001 NEURO per transaction
- **Batching Benefit**: First tx pays full, subsequent pay ~30%
- **Network Congestion**: Multiplier applied during high usage

### Node Staking

- **Minimum Stake**: 50,000 TRAC to run a DKG node
- **Delegation**: Users can delegate TRAC to nodes
- **Rewards**: Node operators earn from publishing fees

## Example: Complete Workflow

```typescript
import { DKGClientV8 } from './dkg-client-v8';
import { KnowledgeAssetPublisherV8 } from './knowledge-asset-publisher-v8';

async function publishReputations() {
  // Initialize with simulation mode for development
  const dkgClient = new DKGClientV8({
    environment: 'testnet',
    simulationMode: true
  });
  
  const publisher = new KnowledgeAssetPublisherV8(dkgClient);
  
  // 1. Estimate costs before publishing
  const costEstimate = publisher.estimateBatchPublishCost(100, 2);
  console.log(`Estimated cost for 100 assets:`);
  console.log(`  TRAC: ${publisher.getTokenomicsService().formatTRAC(costEstimate.totalTracFee)}`);
  console.log(`  NEURO: ${publisher.getTokenomicsService().formatNEURO(costEstimate.totalNeuroGasFee)}`);
  console.log(`  USD: $${costEstimate.totalCostUSD.toFixed(2)}`);
  
  // 2. Batch publish with cost optimization
  const batchResult = await publisher.batchPublish(reputationDataList, {
    epochs: 2,
    batchSize: 10
  });
  
  // 3. Review results
  console.log(`Published: ${batchResult.summary.totalPublished}`);
  console.log(`Failed: ${batchResult.summary.totalFailed}`);
  console.log(`Total cost: ${publisher.getTokenomicsService().formatTRAC(batchResult.summary.totalTracSpent)}`);
  
  // 4. Get fee statistics
  const stats = publisher.getFeeStatistics();
  console.log(`Total operations: ${Object.values(stats.operationCounts).reduce((a, b) => a + b, 0)}`);
  console.log(`Average cost per publish: $${stats.averageCostPerOperation.publish.totalCostUSD.toFixed(4)}`);
}

publishReputations();
```

## Best Practices

1. **Always estimate costs first** before large batch operations
2. **Use batching** for multiple publishes to save on gas
3. **Enable simulation mode** during development/testing
4. **Track fees** to monitor spending and optimize
5. **Batch updates** instead of frequent small updates
6. **Use minimum epochs** needed for storage duration
7. **Monitor network congestion** and adjust gas price multiplier

## Troubleshooting

### High Costs

- Check if batching is enabled
- Reduce batch size if network is congested
- Use simulation mode for testing
- Consider reducing epochs

### Fee Tracking Issues

- Ensure `recordFeeSpent()` is called after each operation
- Check that tokenomics service is properly initialized
- Verify token prices are set for USD estimates

### Batching Not Working

- Check `enableBatching` configuration
- Verify batch size is > 1
- Ensure delay between batches is reasonable

## References

- [OriginTrail Documentation](https://docs.origintrail.io)
- [TRAC Tokenomics](https://origintrail.io)
- [NeuroWeb Documentation](https://docs.origintrail.io)

