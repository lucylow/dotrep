/**
 * Economic Behavior Analysis Agent
 * 
 * Analyzes user economic behavior patterns for trust assessment and Sybil detection.
 * Integrates with blockchain RPCs and DKG for comprehensive analysis.
 */

import { DKGClientV8, type DKGConfig } from '../dkg-client-v8';
import { IdentityTokenomicsService, type BehaviorAnalysis } from '../identity-tokenomics';

export interface TransactionData {
  from: string;
  to: string;
  amount: string;
  timestamp: string;
  txHash: string;
  chainId?: number;
}

export interface StakingData {
  stakedAmount: bigint;
  lockUntil?: string;
  stakingHistory: Array<{ amount: bigint; timestamp: string }>;
}

export interface EconomicAnalysis {
  userDID: string;
  timestamp: string;
  timeRange: string;
  metrics: {
    transaction: {
      volume: number;
      velocity: number; // transactions per day
      diversity: number; // 0-1 counterparty diversity
      reciprocity: number; // 0-1 reciprocal relationships
      anomalyScore: number; // 0-1
    };
    staking: {
      totalStaked: bigint;
      stakingDuration: number; // days
      stakingConsistency: number; // 0-1
    };
    diversity: {
      diversity: number; // 0-1 economic diversity score
      uniqueCounterparties: number;
      tokenDiversity: number; // 0-1
    };
  };
  riskSignals: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    confidence: number; // 0-1
  }>;
  trustSignals: string[];
  trustScore: number; // 0-1
  riskLevel: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendations: Array<{
    action: string;
    reason: string;
    parameters?: Record<string, any>;
  }>;
}

export interface EconomicBehaviorConfig {
  dkgClient?: DKGClientV8;
  dkgConfig?: DKGConfig;
  identityTokenomics?: IdentityTokenomicsService;
  
  analysis: {
    defaultTimeRange: string; // '7d', '30d', '90d', '1y'
    minTransactions: number;
    minUniqueInteractions: number;
    velocityThreshold: number; // transactions per day
    diversityThreshold: number; // 0-1
    reciprocityThreshold: number; // 0-1
  };
  
  scoring: {
    volumeWeight: number; // 0-1
    diversityWeight: number; // 0-1
    reciprocityWeight: number; // 0-1
    velocityWeight: number; // 0-1
    anomalyWeight: number; // 0-1
  };
  
  rpcEndpoints?: { [chainId: number]: string };
  enableMockMode?: boolean;
  enableLogging?: boolean;
}

/**
 * Economic Behavior Analysis Agent
 * 
 * Analyzes economic behavior patterns to:
 * - Detect Sybil attack patterns
 * - Calculate economic trust scores
 * - Identify risk signals
 * - Generate recommendations
 */
export class EconomicBehaviorAgent {
  private config: EconomicBehaviorConfig & {
    analysis: {
      defaultTimeRange: string;
      minTransactions: number;
      minUniqueInteractions: number;
      velocityThreshold: number;
      diversityThreshold: number;
      reciprocityThreshold: number;
    };
    scoring: {
      volumeWeight: number;
      diversityWeight: number;
      reciprocityWeight: number;
      velocityWeight: number;
      anomalyWeight: number;
    };
    rpcEndpoints: { [chainId: number]: string };
    enableMockMode: boolean;
    enableLogging: boolean;
  };
  private dkgClient: DKGClientV8 | null = null;
  private identityTokenomics: IdentityTokenomicsService | null = null;
  private analysisCache: Map<string, EconomicAnalysis> = new Map();

  constructor(config: EconomicBehaviorConfig) {
    this.config = {
      dkgClient: config.dkgClient,
      dkgConfig: config.dkgConfig,
      identityTokenomics: config.identityTokenomics,
      analysis: {
        ...{
          defaultTimeRange: '30d',
          minTransactions: 5,
          minUniqueInteractions: 3,
          velocityThreshold: 10,
          diversityThreshold: 0.1,
          reciprocityThreshold: 0.1,
        },
        ...config.analysis
      },
      scoring: {
        ...{
          volumeWeight: 0.2,
          diversityWeight: 0.3,
          reciprocityWeight: 0.25,
          velocityWeight: 0.15,
          anomalyWeight: 0.1,
        },
        ...config.scoring
      },
      rpcEndpoints: config.rpcEndpoints || {} as { [chainId: number]: string },
      enableMockMode: config.enableMockMode ?? process.env.ECONOMIC_BEHAVIOR_MOCK === 'true',
      enableLogging: config.enableLogging ?? true
    };

    // Initialize DKG client
    if (this.config.dkgClient) {
      this.dkgClient = this.config.dkgClient;
    } else if (this.config.dkgConfig) {
      const { createDKGClientV8 } = require('../dkg-client-v8');
      this.dkgClient = createDKGClientV8(this.config.dkgConfig);
    }

    // Initialize Identity Tokenomics
    if (this.config.identityTokenomics) {
      this.identityTokenomics = this.config.identityTokenomics;
    }
  }

  /**
   * Analyze economic behavior
   */
  async analyzeEconomicBehavior(
    userDID: string,
    timeRange?: string
  ): Promise<EconomicAnalysis> {
    const range = timeRange || this.config.analysis.defaultTimeRange;
    const cacheKey = `${userDID}-${range}`;

    // Check cache
    const cached = this.analysisCache.get(cacheKey);
    if (cached) {
      // Check if cache is still valid (within 1 hour)
      const cacheAge = Date.now() - new Date(cached.timestamp).getTime();
      if (cacheAge < 60 * 60 * 1000) {
        return cached;
      }
    }

    this.log(`Analyzing economic behavior for ${userDID} (${range})`);

    const analysis: EconomicAnalysis = {
      userDID,
      timestamp: new Date().toISOString(),
      timeRange: range,
      metrics: {
        transaction: {
          volume: 0,
          velocity: 0,
          diversity: 0,
          reciprocity: 0,
          anomalyScore: 0
        },
        staking: {
          totalStaked: BigInt(0),
          stakingDuration: 0,
          stakingConsistency: 0
        },
        diversity: {
          diversity: 0,
          uniqueCounterparties: 0,
          tokenDiversity: 0
        }
      },
      riskSignals: [],
      trustSignals: [],
      trustScore: 0,
      riskLevel: 'MEDIUM',
      recommendations: []
    };

    try {
      // Collect economic data
      const [transactionData, stakingData] = await Promise.all([
        this.fetchTransactionHistory(userDID, range),
        this.fetchStakingBehavior(userDID)
      ]);

      // Analyze transaction patterns
      analysis.metrics.transaction = await this.analyzeTransactionPatterns(transactionData);

      // Analyze staking behavior
      analysis.metrics.staking = await this.analyzeStakingBehavior(stakingData);

      // Analyze economic diversity
      analysis.metrics.diversity = await this.analyzeEconomicDiversity(transactionData);

      // Detect Sybil patterns
      analysis.riskSignals = await this.detectSybilPatterns(analysis.metrics);

      // Calculate economic trust score
      analysis.trustScore = this.calculateEconomicTrustScore(analysis.metrics);
      analysis.riskLevel = this.determineRiskLevel(analysis.trustScore, analysis.riskSignals);

      // Generate recommendations
      analysis.recommendations = this.generateEconomicRecommendations(analysis);

      // Publish analysis to DKG
      await this.publishEconomicAnalysis(analysis);

      // Cache result
      this.analysisCache.set(cacheKey, analysis);

      this.log(`Economic analysis complete for ${userDID}: trustScore=${analysis.trustScore.toFixed(2)}, riskLevel=${analysis.riskLevel}`);

      return analysis;
    } catch (error: any) {
      this.log(`Economic analysis failed for ${userDID}: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Fetch transaction history
   */
  private async fetchTransactionHistory(
    userDID: string,
    timeRange: string
  ): Promise<TransactionData[]> {
    if (this.config.enableMockMode) {
      this.log(`[MOCK] Fetching transaction history for ${userDID}`);
      return this.generateMockTransactions(20);
    }

    // TODO: Query blockchain RPC or DKG for transaction history
    // For now, return empty array
    return [];
  }

  /**
   * Fetch staking behavior
   */
  private async fetchStakingBehavior(userDID: string): Promise<StakingData> {
    if (this.config.enableMockMode) {
      return {
        stakedAmount: BigInt(1000) * BigInt(10 ** 18),
        stakingHistory: []
      };
    }

    // TODO: Query staking data from DKG or blockchain
    return {
      stakedAmount: BigInt(0),
      stakingHistory: []
    };
  }

  /**
   * Analyze transaction patterns
   */
  private async analyzeTransactionPatterns(
    transactions: TransactionData[]
  ): Promise<EconomicAnalysis['metrics']['transaction']> {
    if (transactions.length === 0) {
      return {
        volume: 0,
        velocity: 0,
        diversity: 0,
        reciprocity: 0,
        anomalyScore: 0
      };
    }

    // Calculate volume
    const volume = transactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

    // Calculate velocity (transactions per day)
    const timeSpan = this.calculateTimeSpan(transactions);
    const velocity = transactions.length / Math.max(timeSpan, 1);

    // Calculate counterparty diversity
    const diversity = this.calculateCounterpartyDiversity(transactions);

    // Calculate reciprocity
    const reciprocity = this.calculateTransactionReciprocity(transactions);

    // Detect anomalies
    const anomalyScore = this.detectTransactionAnomalies(transactions);

    return {
      volume,
      velocity,
      diversity,
      reciprocity,
      anomalyScore
    };
  }

  /**
   * Calculate time span in days
   */
  private calculateTimeSpan(transactions: TransactionData[]): number {
    if (transactions.length < 2) return 1;

    const sorted = transactions.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const first = new Date(sorted[0].timestamp);
    const last = new Date(sorted[sorted.length - 1].timestamp);
    const days = (last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(days, 1);
  }

  /**
   * Calculate counterparty diversity
   */
  private calculateCounterpartyDiversity(transactions: TransactionData[]): number {
    const counterparties = new Set<string>();
    transactions.forEach(tx => {
      counterparties.add(tx.from);
      counterparties.add(tx.to);
    });

    // Remove the user themselves (assuming first transaction's from is the user)
    if (transactions.length > 0) {
      counterparties.delete(transactions[0].from);
    }

    const uniqueCounterparties = counterparties.size;
    const maxPossible = transactions.length * 2;
    return uniqueCounterparties / Math.max(maxPossible, 1);
  }

  /**
   * Calculate transaction reciprocity
   */
  private calculateTransactionReciprocity(transactions: TransactionData[]): number {
    if (transactions.length === 0) return 0;

    const user = transactions[0].from;
    const receivedFrom = new Set<string>();
    const sentTo = new Set<string>();

    transactions.forEach(tx => {
      if (tx.to === user) {
        receivedFrom.add(tx.from);
      } else if (tx.from === user) {
        sentTo.add(tx.to);
      }
    });

    // Calculate overlap (reciprocal relationships)
    const reciprocalRelationships = Array.from(receivedFrom).filter(
      counterparty => sentTo.has(counterparty)
    ).length;

    const totalRelationships = new Set([...receivedFrom, ...sentTo]).size;
    return totalRelationships > 0 ? reciprocalRelationships / totalRelationships : 0;
  }

  /**
   * Detect transaction anomalies
   */
  private detectTransactionAnomalies(transactions: TransactionData[]): number {
    let anomalyScore = 0;
    const amounts = transactions.map(tx => parseFloat(tx.amount));

    if (amounts.length === 0) return 0;

    // Calculate statistics
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return 0;

    // Check for amount anomalies (outliers)
    amounts.forEach(amount => {
      const zScore = Math.abs((amount - mean) / stdDev);
      if (zScore > 3) anomalyScore += 0.3; // Significant outlier
    });

    // Check for timing anomalies
    const timeIntervals = this.calculateTimeIntervals(transactions);
    if (timeIntervals.length > 0) {
      const intervalMean = timeIntervals.reduce((a, b) => a + b, 0) / timeIntervals.length;
      const intervalVariance = timeIntervals.reduce((sq, n) => sq + Math.pow(n - intervalMean, 2), 0) / timeIntervals.length;
      const intervalStdDev = Math.sqrt(intervalVariance);

      if (intervalStdDev > 0) {
        timeIntervals.forEach(interval => {
          const zScore = Math.abs((interval - intervalMean) / intervalStdDev);
          if (zScore > 2) anomalyScore += 0.2; // Unusual timing pattern
        });
      }
    }

    // Check for circular transactions
    const circularScore = this.detectCircularTransactions(transactions);
    anomalyScore += circularScore;

    return Math.min(anomalyScore, 1.0);
  }

  /**
   * Calculate time intervals between transactions
   */
  private calculateTimeIntervals(transactions: TransactionData[]): number[] {
    const intervals: number[] = [];
    const sorted = transactions.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    for (let i = 1; i < sorted.length; i++) {
      const prevTime = new Date(sorted[i - 1].timestamp).getTime();
      const currTime = new Date(sorted[i].timestamp).getTime();
      intervals.push((currTime - prevTime) / (1000 * 60 * 60)); // Hours
    }

    return intervals;
  }

  /**
   * Detect circular transactions
   */
  private detectCircularTransactions(transactions: TransactionData[]): number {
    // Build transaction graph
    const graph = new Map<string, Set<string>>();

    transactions.forEach(tx => {
      if (!graph.has(tx.from)) graph.set(tx.from, new Set());
      if (!graph.has(tx.to)) graph.set(tx.to, new Set());
      graph.get(tx.from)!.add(tx.to);
    });

    // Detect small, tightly-connected clusters
    const clusters = this.findTightClusters(graph);
    let circularScore = 0;

    clusters.forEach(cluster => {
      if (cluster.size <= 5) { // Small cluster
        const density = this.calculateClusterDensity(cluster, graph);
        if (density > 0.8) { // Very dense cluster
          circularScore += 0.5;
        }
      }
    });

    return Math.min(circularScore, 0.5);
  }

  /**
   * Find tight clusters in transaction graph
   */
  private findTightClusters(graph: Map<string, Set<string>>): Set<Set<string>> {
    const clusters = new Set<Set<string>>();
    const visited = new Set<string>();

    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        const cluster = this.bfs(node, graph);
        cluster.forEach(n => visited.add(n));
        if (cluster.size > 1) {
          clusters.add(cluster);
        }
      }
    }

    return clusters;
  }

  /**
   * BFS to find connected component
   */
  private bfs(startNode: string, graph: Map<string, Set<string>>): Set<string> {
    const queue = [startNode];
    const visited = new Set<string>([startNode]);

    while (queue.length > 0) {
      const node = queue.shift()!;
      const neighbors = graph.get(node) || new Set();

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    return visited;
  }

  /**
   * Calculate cluster density
   */
  private calculateClusterDensity(
    cluster: Set<string>,
    graph: Map<string, Set<string>>
  ): number {
    let internalEdges = 0;
    const clusterArray = Array.from(cluster);
    const possibleEdges = clusterArray.length * (clusterArray.length - 1);

    if (possibleEdges === 0) return 0;

    for (const node of clusterArray) {
      const neighbors = graph.get(node) || new Set();
      for (const neighbor of neighbors) {
        if (cluster.has(neighbor)) {
          internalEdges++;
        }
      }
    }

    return (internalEdges / 2) / possibleEdges;
  }

  /**
   * Analyze staking behavior
   */
  private async analyzeStakingBehavior(
    stakingData: StakingData
  ): Promise<EconomicAnalysis['metrics']['staking']> {
    const totalStaked = stakingData.stakedAmount;
    const stakingHistory = stakingData.stakingHistory;

    // Calculate staking duration
    let stakingDuration = 0;
    if (stakingData.lockUntil) {
      const lockDate = new Date(stakingData.lockUntil);
      const now = new Date();
      stakingDuration = Math.max(0, (lockDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Calculate staking consistency (based on history)
    let stakingConsistency = 0.5; // Default
    if (stakingHistory.length > 0) {
      // Simple consistency: more history = more consistent
      stakingConsistency = Math.min(stakingHistory.length / 10, 1.0);
    }

    return {
      totalStaked,
      stakingDuration,
      stakingConsistency
    };
  }

  /**
   * Analyze economic diversity
   */
  private async analyzeEconomicDiversity(
    transactions: TransactionData[]
  ): Promise<EconomicAnalysis['metrics']['diversity']> {
    const diversity = this.calculateCounterpartyDiversity(transactions);
    const uniqueCounterparties = new Set<string>();
    transactions.forEach(tx => {
      uniqueCounterparties.add(tx.from);
      uniqueCounterparties.add(tx.to);
    });

    // Token diversity (placeholder - would need token data)
    const tokenDiversity = 0.5; // Default

    return {
      diversity,
      uniqueCounterparties: uniqueCounterparties.size,
      tokenDiversity
    };
  }

  /**
   * Detect Sybil patterns
   */
  private async detectSybilPatterns(
    metrics: EconomicAnalysis['metrics']
  ): Promise<EconomicAnalysis['riskSignals']> {
    const riskSignals: EconomicAnalysis['riskSignals'] = [];

    // Low diversity risk
    if (metrics.diversity.diversity < this.config.analysis.diversityThreshold) {
      riskSignals.push({
        type: 'LOW_DIVERSITY',
        severity: 'medium',
        description: 'User interacts with very few counterparties',
        confidence: 0.7
      });
    }

    // High velocity with low volume (potential wash trading)
    if (metrics.transaction.velocity > this.config.analysis.velocityThreshold &&
        metrics.transaction.volume < 100) {
      riskSignals.push({
        type: 'SUSPICIOUS_VELOCITY',
        severity: 'high',
        description: 'High transaction frequency with low volume',
        confidence: 0.8
      });
    }

    // No reciprocity
    if (metrics.transaction.reciprocity < this.config.analysis.reciprocityThreshold) {
      riskSignals.push({
        type: 'NO_RECIPROCITY',
        severity: 'medium',
        description: 'Transactions lack reciprocal relationships',
        confidence: 0.6
      });
    }

    // High anomaly score
    if (metrics.transaction.anomalyScore > 0.7) {
      riskSignals.push({
        type: 'TRANSACTION_ANOMALIES',
        severity: 'high',
        description: 'Unusual transaction patterns detected',
        confidence: metrics.transaction.anomalyScore
      });
    }

    return riskSignals;
  }

  /**
   * Calculate economic trust score
   */
  private calculateEconomicTrustScore(
    metrics: EconomicAnalysis['metrics']
  ): number {
    const weights = this.config.scoring;

    // Normalize metrics to 0-1 scale
    const normalized = {
      volume: Math.min(metrics.transaction.volume / 10000, 1), // Cap at 10k
      diversity: metrics.diversity.diversity,
      reciprocity: metrics.transaction.reciprocity,
      velocity: Math.min(metrics.transaction.velocity / 5, 1), // Cap at 5 tx/day
      anomaly: 1 - metrics.transaction.anomalyScore // Invert anomaly score
    };

    let trustScore = 0;
    trustScore += normalized.volume * weights.volumeWeight;
    trustScore += normalized.diversity * weights.diversityWeight;
    trustScore += normalized.reciprocity * weights.reciprocityWeight;
    trustScore += normalized.velocity * weights.velocityWeight;
    trustScore += normalized.anomaly * weights.anomalyWeight;

    return Math.min(trustScore, 1.0);
  }

  /**
   * Determine risk level
   */
  private determineRiskLevel(
    trustScore: number,
    riskSignals: EconomicAnalysis['riskSignals']
  ): EconomicAnalysis['riskLevel'] {
    const highRiskSignals = riskSignals.filter(s => s.severity === 'high' || s.severity === 'critical').length;
    const mediumRiskSignals = riskSignals.filter(s => s.severity === 'medium').length;

    if (trustScore < 0.3 || highRiskSignals >= 2) return 'CRITICAL';
    if (trustScore < 0.5 || highRiskSignals >= 1 || mediumRiskSignals >= 3) return 'HIGH';
    if (trustScore < 0.7 || mediumRiskSignals >= 2) return 'MEDIUM';
    if (trustScore < 0.8) return 'LOW';
    return 'MINIMAL';
  }

  /**
   * Generate economic recommendations
   */
  private generateEconomicRecommendations(
    analysis: EconomicAnalysis
  ): EconomicAnalysis['recommendations'] {
    const recommendations: EconomicAnalysis['recommendations'] = [];

    if (analysis.trustScore < 0.5) {
      recommendations.push({
        action: 'INCREASE_STAKE',
        reason: 'Low economic trust score requires higher stake for verification',
        parameters: {
          multiplier: 2.0,
          minimumStake: 2000
        }
      });
    }

    if (analysis.metrics.diversity.diversity < 0.2) {
      recommendations.push({
        action: 'ENCOURAGE_DIVERSITY',
        reason: 'Low counterparty diversity detected',
        parameters: {
          targetDiversity: 0.5,
          suggestions: ['Participate in more diverse transactions', 'Engage with different communities']
        }
      });
    }

    if (analysis.riskSignals.some(s => s.type === 'SUSPICIOUS_VELOCITY')) {
      recommendations.push({
        action: 'MONITOR_VELOCITY',
        reason: 'Suspicious transaction velocity pattern',
        parameters: {
          monitoringPeriod: '30d',
          velocityThreshold: 5
        }
      });
    }

    return recommendations;
  }

  /**
   * Publish economic analysis to DKG
   */
  private async publishEconomicAnalysis(analysis: EconomicAnalysis): Promise<void> {
    if (!this.dkgClient) {
      this.log('No DKG client available, skipping publish', 'warn');
      return;
    }

    try {
      await this.dkgClient.publishReputationAsset({
        developerId: analysis.userDID,
        reputationScore: Math.floor(analysis.trustScore * 1000),
        contributions: [],
        timestamp: Date.now(),
        metadata: {
          type: 'economic_behavior_analysis',
          analysis: {
            trustScore: analysis.trustScore,
            riskLevel: analysis.riskLevel,
            metrics: {
              transaction: {
                ...analysis.metrics.transaction,
                volume: analysis.metrics.transaction.volume.toString()
              },
              staking: {
                totalStaked: analysis.metrics.staking.totalStaked.toString(),
                stakingDuration: analysis.metrics.staking.stakingDuration,
                stakingConsistency: analysis.metrics.staking.stakingConsistency
              },
              diversity: {
                ...analysis.metrics.diversity,
                uniqueCounterparties: analysis.metrics.diversity.uniqueCounterparties
              }
            },
            riskSignals: analysis.riskSignals,
            trustSignals: analysis.trustSignals,
            recommendations: analysis.recommendations
          }
        }
      });

      this.log(`Published economic analysis to DKG for ${analysis.userDID}`);
    } catch (error: any) {
      this.log(`Failed to publish economic analysis: ${error.message}`, 'error');
    }
  }

  /**
   * Generate mock transactions for testing
   */
  private generateMockTransactions(count: number): TransactionData[] {
    const transactions: TransactionData[] = [];
    const now = Date.now();
    const userAddress = '0x1234567890123456789012345678901234567890';

    for (let i = 0; i < count; i++) {
      transactions.push({
        from: i % 2 === 0 ? userAddress : `0x${Math.random().toString(16).slice(2, 42)}`,
        to: i % 2 === 0 ? `0x${Math.random().toString(16).slice(2, 42)}` : userAddress,
        amount: (Math.random() * 1000).toFixed(18),
        timestamp: new Date(now - (count - i) * 24 * 60 * 60 * 1000).toISOString(),
        txHash: `0x${Buffer.from(`${i}-${Math.random()}`).toString('hex')}`
      });
    }

    return transactions;
  }

  /**
   * Get MCP tools
   */
  getMCPTools() {
    return {
      name: 'analyze_economic_behavior',
      description: 'Analyze user\'s economic behavior patterns for trust assessment',
      parameters: {
        type: 'object',
        properties: {
          user_did: { type: 'string' },
          time_range: {
            type: 'string',
            enum: ['7d', '30d', '90d', '1y'],
            default: '30d'
          }
        },
        required: ['user_did']
      }
    };
  }

  /**
   * Execute MCP tool
   */
  async executeMCPTool(parameters: {
    user_did: string;
    time_range?: string;
  }): Promise<EconomicAnalysis> {
    return await this.analyzeEconomicBehavior(
      parameters.user_did,
      parameters.time_range
    );
  }

  /**
   * Logging helper
   */
  private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    if (!this.config.enableLogging) return;

    const prefix = '[EconomicBehaviorAgent]';
    const timestamp = new Date().toISOString();

    switch (level) {
      case 'error':
        console.error(`${prefix} [${timestamp}] ${message}`);
        break;
      case 'warn':
        console.warn(`${prefix} [${timestamp}] ${message}`);
        break;
      default:
        console.log(`${prefix} [${timestamp}] ${message}`);
    }
  }
}

/**
 * Factory function
 */
export function createEconomicBehaviorAgent(
  config: EconomicBehaviorConfig
): EconomicBehaviorAgent {
  return new EconomicBehaviorAgent(config);
}

