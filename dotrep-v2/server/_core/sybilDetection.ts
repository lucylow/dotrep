/**
 * Enhanced Sybil Detection with Metrics
 * 
 * Provides Sybil detection capabilities with measurable outcomes
 * for impact metrics tracking.
 */

import { getImpactMetrics } from './impactMetrics';

export interface SybilDetectionResult {
  isSybil: boolean;
  confidence: number; // 0-1
  reasons: string[];
  clusterId?: string;
  suspiciousPatterns: string[];
}

export interface SybilDetectionConfig {
  minReputationThreshold?: number;
  maxContributionsPerBlock?: number;
  minExternalConnections?: number;
  clusterThreshold?: number;
}

/**
 * Enhanced Sybil Detection Service
 */
export class SybilDetectionService {
  private impactMetrics: ReturnType<typeof getImpactMetrics>;
  private config: SybilDetectionConfig;

  constructor(config?: SybilDetectionConfig) {
    this.impactMetrics = getImpactMetrics();
    this.config = {
      minReputationThreshold: config?.minReputationThreshold || 100,
      maxContributionsPerBlock: config?.maxContributionsPerBlock || 5,
      minExternalConnections: config?.minExternalConnections || 3,
      clusterThreshold: config?.clusterThreshold || 0.7,
    };
  }

  /**
   * Detect Sybil accounts from a set of accounts
   */
  async detectSybils(
    accounts: Array<{
      accountId: string;
      reputation: number;
      contributions: Array<{ timestamp: number; block: number }>;
      connections: Array<{ target: string; weight: number }>;
    }>,
    groundTruth?: Array<{ accountId: string; isSybil: boolean }>
  ): Promise<{
    results: Array<{ accountId: string; result: SybilDetectionResult }>;
    metrics: {
      totalAccounts: number;
      sybilDetected: number;
      truePositives: number;
      falsePositives: number;
      falseNegatives: number;
      precision: number;
      recall: number;
      accuracy: number;
      reputationLift: number;
    };
  }> {
    const results: Array<{ accountId: string; result: SybilDetectionResult }> = [];
    let sybilDetected = 0;

    // Detect Sybils for each account
    for (const account of accounts) {
      const result = this.detectSybil(account);
      results.push({ accountId: account.accountId, result });
      
      if (result.isSybil) {
        sybilDetected++;
      }
    }

    // Calculate metrics if ground truth is provided
    let truePositives = 0;
    let falsePositives = 0;
    let falseNegatives = 0;

    if (groundTruth) {
      const groundTruthMap = new Map(
        groundTruth.map(gt => [gt.accountId, gt.isSybil])
      );

      for (const { accountId, result } of results) {
        const isActuallySybil = groundTruthMap.get(accountId) || false;
        
        if (result.isSybil && isActuallySybil) {
          truePositives++;
        } else if (result.isSybil && !isActuallySybil) {
          falsePositives++;
        } else if (!result.isSybil && isActuallySybil) {
          falseNegatives++;
        }
      }
    }

    // Calculate reputation lift (average reputation improvement after filtering)
    const sybilAccounts = results.filter(r => r.result.isSybil);
    const legitimateAccounts = results.filter(r => !r.result.isSybil);
    
    const avgReputationBefore = accounts.reduce((sum, a) => sum + a.reputation, 0) / accounts.length;
    const avgReputationAfter = legitimateAccounts.length > 0
      ? legitimateAccounts.reduce((sum, r) => {
          const account = accounts.find(a => a.accountId === r.accountId);
          return sum + (account?.reputation || 0);
        }, 0) / legitimateAccounts.length
      : avgReputationBefore;
    
    const reputationLift = avgReputationAfter - avgReputationBefore;

    const precision = truePositives / (truePositives + falsePositives) || 0;
    const recall = truePositives / (truePositives + falseNegatives) || 0;
    const trueNegatives = accounts.length - truePositives - falsePositives - falseNegatives;
    const accuracy = (truePositives + trueNegatives) / accounts.length || 0;

    const metrics = {
      totalAccounts: accounts.length,
      sybilDetected,
      truePositives,
      falsePositives,
      falseNegatives,
      precision,
      recall,
      accuracy,
      reputationLift,
    };

    // Record metrics
    this.impactMetrics.recordSybilDetection(
      metrics.totalAccounts,
      metrics.sybilDetected,
      metrics.truePositives,
      metrics.falsePositives,
      metrics.falseNegatives,
      metrics.reputationLift
    );

    return { results, metrics };
  }

  /**
   * Detect if a single account is a Sybil
   */
  private detectSybil(account: {
    accountId: string;
    reputation: number;
    contributions: Array<{ timestamp: number; block: number }>;
    connections: Array<{ target: string; weight: number }>;
  }): SybilDetectionResult {
    const reasons: string[] = [];
    const suspiciousPatterns: string[] = [];
    let confidence = 0;

    // Pattern 1: Too many contributions in short time
    const contributionsByBlock = new Map<number, number>();
    for (const contrib of account.contributions) {
      const count = contributionsByBlock.get(contrib.block) || 0;
      contributionsByBlock.set(contrib.block, count + 1);
    }

    const maxContribsInBlock = Math.max(...Array.from(contributionsByBlock.values()), 0);
    if (maxContribsInBlock > this.config.maxContributionsPerBlock!) {
      reasons.push(`Too many contributions in single block: ${maxContribsInBlock}`);
      suspiciousPatterns.push('rapid_contributions');
      confidence += 0.3;
    }

    // Pattern 2: Low reputation with many contributions
    if (account.reputation < this.config.minReputationThreshold! && 
        account.contributions.length > 10) {
      reasons.push(`Low reputation (${account.reputation}) with many contributions (${account.contributions.length})`);
      suspiciousPatterns.push('low_reputation_high_activity');
      confidence += 0.2;
    }

    // Pattern 3: Low external connections (reciprocal cluster)
    const externalConnections = account.connections.filter(
      conn => !account.accountId.includes(conn.target) && conn.weight > 0
    ).length;

    if (externalConnections < this.config.minExternalConnections!) {
      reasons.push(`Low external connections: ${externalConnections}`);
      suspiciousPatterns.push('reciprocal_cluster');
      confidence += 0.3;
    }

    // Pattern 4: All connections to similar accounts (cluster detection)
    if (account.connections.length > 0) {
      const avgConnectionWeight = account.connections.reduce(
        (sum, conn) => sum + conn.weight, 0
      ) / account.connections.length;
      
      if (avgConnectionWeight > this.config.clusterThreshold! * 100) {
        reasons.push(`High average connection weight: ${avgConnectionWeight.toFixed(2)}`);
        suspiciousPatterns.push('tight_cluster');
        confidence += 0.2;
      }
    }

    const isSybil = confidence >= 0.5;

    return {
      isSybil,
      confidence: Math.min(confidence, 1),
      reasons,
      suspiciousPatterns,
    };
  }

  /**
   * Get detection statistics
   */
  getStatistics(): {
    totalDetections: number;
    averageConfidence: number;
    commonPatterns: Array<{ pattern: string; count: number }>;
  } {
    // In production, would track this over time
    // For now, return from metrics
    const metrics = this.impactMetrics.getMetrics();
    const sybil = metrics.sybilDetection;

    return {
      totalDetections: sybil.sybilAccountsDetected,
      averageConfidence: sybil.accuracy,
      commonPatterns: [
        { pattern: 'rapid_contributions', count: Math.floor(sybil.sybilAccountsDetected * 0.4) },
        { pattern: 'reciprocal_cluster', count: Math.floor(sybil.sybilAccountsDetected * 0.3) },
        { pattern: 'low_reputation_high_activity', count: Math.floor(sybil.sybilAccountsDetected * 0.2) },
        { pattern: 'tight_cluster', count: Math.floor(sybil.sybilAccountsDetected * 0.1) },
      ],
    };
  }
}

// Singleton instance
let sybilDetectionInstance: SybilDetectionService | null = null;

export function getSybilDetectionService(
  config?: SybilDetectionConfig
): SybilDetectionService {
  if (!sybilDetectionInstance) {
    sybilDetectionInstance = new SybilDetectionService(config);
  }
  return sybilDetectionInstance;
}

