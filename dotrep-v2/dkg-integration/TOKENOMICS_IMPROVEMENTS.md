# Tokenomics Integration Improvements

## Summary

This document outlines the comprehensive tokenomics integration improvements made to the DotRep DKG integration, based on OriginTrail's TRAC and NEURO tokenomics.

## What Was Added

### 1. Tokenomics Service (`tokenomics-service.ts`)

A comprehensive service that handles:
- **TRAC fee calculation** for publishing Knowledge Assets
- **NEURO gas fee estimation** for NeuroWeb transactions
- **Cost estimation** before operations
- **Batching optimization** to reduce gas costs
- **Fee tracking** and statistics
- **Simulation mode** for hack/prototype development

### 2. Enhanced DKG Client (`dkg-client-v8.ts`)

Improvements:
- Integrated tokenomics service for automatic cost tracking
- Cost estimation before publishing
- Enhanced batch publishing with cost optimization
- Fee statistics and reporting
- Automatic fee recording after operations

### 3. Enhanced Knowledge Asset Publisher (`knowledge-asset-publisher-v8.ts`)

Improvements:
- Cost estimation methods
- Optimized batch publishing
- Fee statistics access
- Cost-aware publishing workflow

## Key Features

### Cost Estimation

```typescript
// Estimate cost before publishing
const costEstimate = publisher.estimatePublishCost(epochs: 2);
console.log(`Cost: ${costEstimate.tracFee} TRAC + ${costEstimate.neuroGasFee} NEURO`);
```

### Batching Optimization

```typescript
// Batch publish with automatic cost optimization
const result = await publisher.batchPublish(reputationDataList, {
  batchSize: 10, // Optimal batch size
  delayBetweenBatches: 1000
});

// Get savings information
console.log(`Gas savings: ${result.batchCostEstimate.savingsFromBatching.percentage}%`);
```

### Fee Tracking

```typescript
// Get comprehensive fee statistics
const stats = publisher.getFeeStatistics();
console.log(`Total TRAC spent: ${stats.totalTracSpent}`);
console.log(`Total operations: ${stats.operationCounts.publish}`);
```

### Simulation Mode

```typescript
// Use 10% of real fees for development
const dkgClient = new DKGClientV8({
  simulationMode: true
});
```

## Tokenomics Model

### TRAC (Knowledge Layer)
- **Fixed Supply**: 500M TRAC (no inflation)
- **Base Publish Fee**: ~0.1 TRAC per Knowledge Asset
- **Storage Fee**: ~0.05 TRAC per epoch
- **Update Fee**: 50% of publish fee
- **Node Staking**: 50,000 TRAC minimum

### NEURO (Blockchain Layer)
- **Gas Fees**: ~0.001 NEURO per transaction
- **Batching Benefit**: First tx pays full, subsequent pay ~30%
- **Network Congestion**: Multiplier applied during high usage

## Cost Optimization Strategies

1. **Batch Publishing**: Reduces gas costs by ~70% for multiple assets
2. **Reduce Update Frequency**: Updates cost 50% of publish, batch them
3. **Optimize Epochs**: Use minimum epochs needed (default: 2)
4. **Simulation Mode**: Use 10% fees for development/testing

## Benefits

1. **Cost Transparency**: Know costs before publishing
2. **Cost Optimization**: Automatic batching reduces gas fees
3. **Fee Tracking**: Monitor spending across operations
4. **Development Friendly**: Simulation mode for testing
5. **Production Ready**: Real fee tracking for production use

## Usage Examples

See `TOKENOMICS_GUIDE.md` for detailed usage examples and best practices.

## Configuration

### Environment Variables

```bash
# Token prices (for USD cost estimation)
TRAC_PRICE_USD=0.15
NEURO_PRICE_USD=0.01

# Enable simulation mode (10% of real fees)
DKG_SIMULATION_MODE=true
```

### Programmatic Configuration

```typescript
const tokenomics = createTokenomicsService({
  tracPriceUSD: 0.15,
  neuroPriceUSD: 0.01,
  simulationMode: true,
  enableBatching: true,
  batchSize: 10
});
```

## Integration Points

The tokenomics service is integrated at:
1. **DKG Client**: Automatic cost tracking on publish operations
2. **Knowledge Asset Publisher**: Cost estimation and batch optimization
3. **Trust Layer**: Staking requirements (50,000 TRAC minimum for nodes)

## Future Enhancements

Potential improvements:
1. Real-time fee extraction from transaction receipts
2. Dynamic gas price adjustment based on network congestion
3. Cost alerts when spending exceeds thresholds
4. Historical cost analysis and trends
5. Integration with price oracles for accurate USD estimates

## References

- [OriginTrail Documentation](https://docs.origintrail.io)
- [TRAC Tokenomics](https://origintrail.io)
- [NeuroWeb Documentation](https://docs.origintrail.io)

