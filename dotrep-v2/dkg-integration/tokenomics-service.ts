/**
 * OriginTrail Tokenomics Service
 * 
 * Handles TRAC and NEURO token economics for DKG operations:
 * - TRAC fees for publishing Knowledge Assets
 * - NEURO gas fees for NeuroWeb transactions
 * - Cost estimation and simulation
 * - Batching optimization to reduce costs
 * - Fee tracking and reporting
 * 
 * Based on OriginTrail tokenomics:
 * - TRAC: Fixed supply 500M, used for DKG operations (publishing, storage, staking)
 * - NEURO: Native token of NeuroWeb parachain, used for gas/transaction fees
 * - Two-token model: TRAC (knowledge layer) + NEURO (blockchain layer)
 */

export interface TokenomicsConfig {
  // TRAC token configuration
  tracDecimals?: number; // Default: 18
  tracPriceUSD?: number; // Current TRAC price in USD (for cost estimation)
  
  // NEURO token configuration
  neuroDecimals?: number; // Default: 18
  neuroPriceUSD?: number; // Current NEURO price in USD (for cost estimation)
  
  // Publishing fees (in TRAC, with 18 decimals)
  basePublishFee?: bigint; // Base fee per Knowledge Asset publish
  storageFeePerEpoch?: bigint; // Additional fee per epoch of storage
  updateFeeMultiplier?: number; // Multiplier for updates (e.g., 0.5 = 50% of publish fee)
  
  // Gas fees (in NEURO, with 18 decimals)
  baseGasFee?: bigint; // Base gas fee per transaction
  gasPriceMultiplier?: number; // Network congestion multiplier (1.0 = normal)
  
  // Node staking requirements
  minNodeStake?: bigint; // Minimum stake to run a DKG node (50,000 TRAC)
  
  // Cost optimization
  enableBatching?: boolean; // Enable batching to reduce costs
  batchSize?: number; // Optimal batch size for cost efficiency
  batchDelay?: number; // Delay between batches (ms)
  
  // Simulation mode (for hack/prototype)
  simulationMode?: boolean; // Use simulated fees instead of real on-chain fees
  simulationFeeMultiplier?: number; // Multiplier for simulation (e.g., 0.1 = 10% of real fees)
}

export interface PublishCostEstimate {
  tracFee: bigint; // TRAC fee for publishing
  neuroGasFee: bigint; // NEURO gas fee
  totalCostUSD: number; // Total cost in USD (if prices provided)
  breakdown: {
    basePublishFee: bigint;
    storageFee: bigint;
    gasFee: bigint;
  };
}

export interface BatchPublishCostEstimate {
  totalTracFee: bigint;
  totalNeuroGasFee: bigint;
  perAssetCost: PublishCostEstimate;
  totalCostUSD: number;
  savingsFromBatching: {
    tracSaved: bigint;
    neuroSaved: bigint;
    usdSaved: number;
    percentage: number;
  };
}

export interface FeeHistory {
  timestamp: number;
  operation: 'publish' | 'update' | 'query' | 'batch';
  tracFee: bigint;
  neuroGasFee: bigint;
  ual?: string;
  assetCount?: number;
}

/**
 * Tokenomics Service for OriginTrail DKG
 */
export class TokenomicsService {
  private config: Required<TokenomicsConfig>;
  private feeHistory: FeeHistory[] = [];
  private totalFeesSpent: { trac: bigint; neuro: bigint } = {
    trac: BigInt(0),
    neuro: BigInt(0)
  };

  constructor(config?: TokenomicsConfig) {
    // Default configuration based on OriginTrail tokenomics
    this.config = {
      tracDecimals: config?.tracDecimals ?? 18,
      tracPriceUSD: config?.tracPriceUSD ?? 0, // Will be fetched or set manually
      neuroDecimals: config?.neuroDecimals ?? 18,
      neuroPriceUSD: config?.neuroPriceUSD ?? 0,
      
      // Default fees (these should be updated based on actual network conditions)
      // Typical publish fee: 0.1-1 TRAC depending on asset size and epochs
      basePublishFee: config?.basePublishFee ?? BigInt(100) * BigInt(10 ** 15), // 0.1 TRAC
      storageFeePerEpoch: config?.storageFeePerEpoch ?? BigInt(50) * BigInt(10 ** 15), // 0.05 TRAC per epoch
      updateFeeMultiplier: config?.updateFeeMultiplier ?? 0.5, // Updates cost 50% of publish
      
      // Gas fees (NEURO) - typically much smaller than TRAC fees
      baseGasFee: config?.baseGasFee ?? BigInt(1) * BigInt(10 ** 15), // 0.001 NEURO
      gasPriceMultiplier: config?.gasPriceMultiplier ?? 1.0,
      
      // Node staking: 50,000 TRAC minimum (docs.origintrail.io)
      minNodeStake: config?.minNodeStake ?? BigInt(50000) * BigInt(10 ** 18),
      
      // Batching optimization
      enableBatching: config?.enableBatching ?? true,
      batchSize: config?.batchSize ?? 10, // Optimal batch size
      batchDelay: config?.batchDelay ?? 1000, // 1 second between batches
      
      // Simulation mode for hack/prototype
      simulationMode: config?.simulationMode ?? process.env.DKG_SIMULATION_MODE === 'true',
      simulationFeeMultiplier: config?.simulationFeeMultiplier ?? 0.1, // 10% of real fees
    };
  }

  /**
   * Estimate cost for publishing a single Knowledge Asset
   */
  estimatePublishCost(
    epochs: number = 2,
    isUpdate: boolean = false,
    assetSizeKB?: number
  ): PublishCostEstimate {
    // Base publish fee
    let basePublishFee = this.config.basePublishFee;
    
    // Apply update multiplier if updating
    if (isUpdate) {
      basePublishFee = BigInt(Math.floor(Number(basePublishFee) * this.config.updateFeeMultiplier));
    }
    
    // Storage fee based on epochs
    const storageFee = this.config.storageFeePerEpoch * BigInt(epochs);
    
    // TRAC fee = base + storage
    const tracFee = basePublishFee + storageFee;
    
    // NEURO gas fee (typically small, scales with network congestion)
    const neuroGasFee = BigInt(Math.floor(
      Number(this.config.baseGasFee) * this.config.gasPriceMultiplier
    ));
    
    // Apply simulation multiplier if in simulation mode
    const finalTracFee = this.config.simulationMode
      ? BigInt(Math.floor(Number(tracFee) * this.config.simulationFeeMultiplier))
      : tracFee;
    
    const finalNeuroGasFee = this.config.simulationMode
      ? BigInt(Math.floor(Number(neuroGasFee) * this.config.simulationFeeMultiplier))
      : neuroGasFee;
    
    // Calculate USD cost if prices are available
    const tracCostUSD = this.config.tracPriceUSD > 0
      ? Number(finalTracFee) / (10 ** this.config.tracDecimals) * this.config.tracPriceUSD
      : 0;
    
    const neuroCostUSD = this.config.neuroPriceUSD > 0
      ? Number(finalNeuroGasFee) / (10 ** this.config.neuroDecimals) * this.config.neuroPriceUSD
      : 0;
    
    const totalCostUSD = tracCostUSD + neuroCostUSD;
    
    return {
      tracFee: finalTracFee,
      neuroGasFee: finalNeuroGasFee,
      totalCostUSD,
      breakdown: {
        basePublishFee: basePublishFee,
        storageFee: storageFee,
        gasFee: finalNeuroGasFee
      }
    };
  }

  /**
   * Estimate cost for batch publishing multiple Knowledge Assets
   * Batching can reduce costs by amortizing gas fees
   */
  estimateBatchPublishCost(
    assetCount: number,
    epochs: number = 2,
    isUpdate: boolean = false
  ): BatchPublishCostEstimate {
    // Cost per asset
    const perAssetCost = this.estimatePublishCost(epochs, isUpdate);
    
    // Total TRAC fees (no batching benefit for TRAC fees)
    const totalTracFee = perAssetCost.tracFee * BigInt(assetCount);
    
    // NEURO gas fees benefit from batching
    // First transaction pays full gas, subsequent ones pay less
    const firstTxGas = perAssetCost.neuroGasFee;
    const subsequentTxGas = BigInt(Math.floor(Number(firstTxGas) * 0.3)); // 30% of first tx
    
    const totalNeuroGasFee = assetCount === 1
      ? firstTxGas
      : firstTxGas + (subsequentTxGas * BigInt(assetCount - 1));
    
    // Calculate savings from batching
    const nonBatchedGasFee = perAssetCost.neuroGasFee * BigInt(assetCount);
    const gasSaved = nonBatchedGasFee - totalNeuroGasFee;
    
    const gasSavedUSD = this.config.neuroPriceUSD > 0
      ? Number(gasSaved) / (10 ** this.config.neuroDecimals) * this.config.neuroPriceUSD
      : 0;
    
    const totalCostUSD = (this.config.tracPriceUSD > 0
      ? Number(totalTracFee) / (10 ** this.config.tracDecimals) * this.config.tracPriceUSD
      : 0) + (this.config.neuroPriceUSD > 0
      ? Number(totalNeuroGasFee) / (10 ** this.config.neuroDecimals) * this.config.neuroPriceUSD
      : 0);
    
    const savingsPercentage = assetCount > 1
      ? (Number(gasSaved) / Number(nonBatchedGasFee)) * 100
      : 0;
    
    return {
      totalTracFee,
      totalNeuroGasFee,
      perAssetCost,
      totalCostUSD,
      savingsFromBatching: {
        tracSaved: BigInt(0), // No TRAC savings from batching
        neuroSaved: gasSaved,
        usdSaved: gasSavedUSD,
        percentage: savingsPercentage
      }
    };
  }

  /**
   * Record actual fees spent (call after successful publish)
   */
  recordFeeSpent(
    operation: 'publish' | 'update' | 'query' | 'batch',
    tracFee: bigint,
    neuroGasFee: bigint,
    ual?: string,
    assetCount?: number
  ): void {
    const feeRecord: FeeHistory = {
      timestamp: Date.now(),
      operation,
      tracFee,
      neuroGasFee,
      ual,
      assetCount
    };
    
    this.feeHistory.push(feeRecord);
    this.totalFeesSpent.trac += tracFee;
    this.totalFeesSpent.neuro += neuroGasFee;
  }

  /**
   * Get fee statistics
   */
  getFeeStatistics(): {
    totalTracSpent: bigint;
    totalNeuroSpent: bigint;
    totalCostUSD: number;
    operationCounts: Record<string, number>;
    averageCostPerOperation: {
      publish: PublishCostEstimate;
      update: PublishCostEstimate;
    };
  } {
    const operationCounts: Record<string, number> = {};
    
    this.feeHistory.forEach(record => {
      operationCounts[record.operation] = (operationCounts[record.operation] || 0) + 1;
    });
    
    // Calculate average costs
    const publishOps = this.feeHistory.filter(r => r.operation === 'publish');
    const updateOps = this.feeHistory.filter(r => r.operation === 'update');
    
    const avgPublishTrac = publishOps.length > 0
      ? this.totalFeesSpent.trac / BigInt(publishOps.length)
      : BigInt(0);
    
    const avgPublishNeuro = publishOps.length > 0
      ? this.totalFeesSpent.neuro / BigInt(publishOps.length)
      : BigInt(0);
    
    const avgUpdateTrac = updateOps.length > 0
      ? this.totalFeesSpent.trac / BigInt(updateOps.length)
      : BigInt(0);
    
    const avgUpdateNeuro = updateOps.length > 0
      ? this.totalFeesSpent.neuro / BigInt(updateOps.length)
      : BigInt(0);
    
    const totalCostUSD = (this.config.tracPriceUSD > 0
      ? Number(this.totalFeesSpent.trac) / (10 ** this.config.tracDecimals) * this.config.tracPriceUSD
      : 0) + (this.config.neuroPriceUSD > 0
      ? Number(this.totalFeesSpent.neuro) / (10 ** this.config.neuroDecimals) * this.config.neuroPriceUSD
      : 0);
    
    return {
      totalTracSpent: this.totalFeesSpent.trac,
      totalNeuroSpent: this.totalFeesSpent.neuro,
      totalCostUSD,
      operationCounts,
      averageCostPerOperation: {
        publish: {
          tracFee: avgPublishTrac,
          neuroGasFee: avgPublishNeuro,
          totalCostUSD: (this.config.tracPriceUSD > 0
            ? Number(avgPublishTrac) / (10 ** this.config.tracDecimals) * this.config.tracPriceUSD
            : 0) + (this.config.neuroPriceUSD > 0
            ? Number(avgPublishNeuro) / (10 ** this.config.neuroDecimals) * this.config.neuroPriceUSD
            : 0),
          breakdown: {
            basePublishFee: avgPublishTrac,
            storageFee: BigInt(0),
            gasFee: avgPublishNeuro
          }
        },
        update: {
          tracFee: avgUpdateTrac,
          neuroGasFee: avgUpdateNeuro,
          totalCostUSD: (this.config.tracPriceUSD > 0
            ? Number(avgUpdateTrac) / (10 ** this.config.tracDecimals) * this.config.tracPriceUSD
            : 0) + (this.config.neuroPriceUSD > 0
            ? Number(avgUpdateNeuro) / (10 ** this.config.neuroDecimals) * this.config.neuroPriceUSD
            : 0),
          breakdown: {
            basePublishFee: avgUpdateTrac,
            storageFee: BigInt(0),
            gasFee: avgUpdateNeuro
          }
        }
      }
    };
  }

  /**
   * Format token amount for display
   */
  formatTokenAmount(amount: bigint, decimals: number, symbol: string): string {
    const divisor = BigInt(10 ** decimals);
    const whole = amount / divisor;
    const fraction = amount % divisor;
    const fractionStr = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
    
    if (fractionStr) {
      return `${whole}.${fractionStr} ${symbol}`;
    }
    return `${whole} ${symbol}`;
  }

  /**
   * Format TRAC amount
   */
  formatTRAC(amount: bigint): string {
    return this.formatTokenAmount(amount, this.config.tracDecimals, 'TRAC');
  }

  /**
   * Format NEURO amount
   */
  formatNEURO(amount: bigint): string {
    return this.formatTokenAmount(amount, this.config.neuroDecimals, 'NEURO');
  }

  /**
   * Update token prices (for cost estimation)
   */
  updateTokenPrices(tracPriceUSD: number, neuroPriceUSD: number): void {
    this.config.tracPriceUSD = tracPriceUSD;
    this.config.neuroPriceUSD = neuroPriceUSD;
  }

  /**
   * Update gas price multiplier (for network congestion)
   */
  updateGasPriceMultiplier(multiplier: number): void {
    this.config.gasPriceMultiplier = multiplier;
  }

  /**
   * Get optimal batch size for cost efficiency
   */
  getOptimalBatchSize(): number {
    return this.config.batchSize;
  }

  /**
   * Check if batching is enabled
   */
  isBatchingEnabled(): boolean {
    return this.config.enableBatching;
  }

  /**
   * Get minimum node stake requirement
   */
  getMinNodeStake(): bigint {
    return this.config.minNodeStake;
  }

  /**
   * Check if in simulation mode
   */
  isSimulationMode(): boolean {
    return this.config.simulationMode;
  }

  /**
   * Get configuration
   */
  getConfig(): Readonly<Required<TokenomicsConfig>> {
    return { ...this.config };
  }

  /**
   * Reset fee history (useful for testing)
   */
  resetFeeHistory(): void {
    this.feeHistory = [];
    this.totalFeesSpent = { trac: BigInt(0), neuro: BigInt(0) };
  }
}

/**
 * Factory function to create a Tokenomics Service instance
 */
export function createTokenomicsService(config?: TokenomicsConfig): TokenomicsService {
  return new TokenomicsService(config);
}

export default TokenomicsService;

