/**
 * User-Flagging Relationships Service
 * 
 * Comprehensive system for detecting harmful content, spam, and coordinated manipulation
 * through user-flagging relationships in social networks.
 * 
 * Features:
 * - Flag creation and management
 * - Coordination detection algorithms
 * - Reputation integration
 * - Guardian automated flagging
 * - DKG knowledge asset publishing
 * - Real-time analytics
 */

import { DKGClientV8, DKGConfig } from './dkg-client-v8';
import { GuardianVerificationResult } from '../server/_core/guardianApi';

export type FlagType = 
  | 'SPAM' 
  | 'HARASSMENT' 
  | 'MISINFORMATION' 
  | 'IMPERSONATION' 
  | 'ILLEGAL_CONTENT' 
  | 'COORDINATED_HARM';

export type FlagStatus = 'pending' | 'under_review' | 'resolved' | 'dismissed';
export type FlagSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface FlagTypeConfig {
  weight: number;
  requiresEvidence: boolean;
  autoEscalate?: boolean;
}

export const FLAG_TYPE_CONFIGS: Record<FlagType, FlagTypeConfig> = {
  SPAM: { weight: 0.3, requiresEvidence: false },
  HARASSMENT: { weight: 0.7, requiresEvidence: true },
  MISINFORMATION: { weight: 0.8, requiresEvidence: true },
  IMPERSONATION: { weight: 0.9, requiresEvidence: true },
  ILLEGAL_CONTENT: { weight: 1.0, requiresEvidence: true, autoEscalate: true },
  COORDINATED_HARM: { weight: 0.9, requiresEvidence: true },
};

export interface UserFlag {
  flagActor: string; // DID of flagging user
  flagTarget: string; // DID of flagged user/content
  flagType: FlagType;
  confidence: number; // Automated detection confidence (0-1)
  evidence: string[]; // UALs to supporting evidence
  timestamp: number;
  status: FlagStatus;
  severity: FlagSeverity;
  reporterReputation: number; // Reputation score of flagging user
  description?: string;
  automated?: boolean; // Whether this was created by automated system
  guardianMatchId?: string; // If created from Guardian verification
}

export interface FlaggingAnalysis {
  targetUser: string;
  timeWindow: number; // hours
  flaggingMetrics: {
    totalFlags: number;
    uniqueReporters: number;
    flagTypeDistribution: Record<FlagType, number>;
    averageConfidence: number;
    averageReporterReputation: number;
  };
  coordinationSignals: {
    temporalClustering?: {
      burstScore: number;
      regularityScore: number;
      totalFlags: number;
      timeSpanHours: number;
    };
    reporterConnections?: {
      reporterNetworkDensity: number;
      maxCliqueSize: number;
      cliqueCoordinationScore: number;
      uniqueReporters: number;
    };
    behavioralSimilarity?: {
      similarityScore: number;
      patternMatches: number;
    };
    contentPatterns?: {
      patternScore: number;
      commonPatterns: string[];
    };
    overallCoordinationScore: number;
  };
  reporterAnalysis: {
    credibleReporters: number;
    lowReputationReporters: number;
    averageReporterReputation: number;
    reporterDiversity: number;
  };
  riskAssessment: {
    legitimateFlagRisk: number;
    credibleReporterImpact: number;
    coordinationMitigation: number;
    overallRisk: number;
  };
}

export interface FlaggingImpact {
  baseReputation: number;
  flaggingImpact: number;
  adjustedReputation: number;
  flaggingPenalty: number;
  coordinationMitigation: number;
}

export interface FlaggingInsights {
  timeWindow: number;
  summaryMetrics: {
    totalFlags: number;
    uniqueTargets: number;
    uniqueReporters: number;
    averageConfidence: number;
    resolutionRate: number;
  };
  coordinationAlerts: Array<{
    targetUser: string;
    flagCount: number;
    coordinationScore: number;
    patternType: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    recommendedAction: string;
  }>;
  topFlaggedUsers: Array<{
    userDid: string;
    flagCount: number;
    averageConfidence: number;
    riskLevel: FlagSeverity;
  }>;
  reporterAnalysis: {
    topReporters: Array<{
      reporterDid: string;
      flagCount: number;
      averageConfidence: number;
      reputation: number;
    }>;
    suspiciousReporters: Array<{
      reporterDid: string;
      flagCount: number;
      coordinationScore: number;
      lowReputation: boolean;
    }>;
  };
}

/**
 * User-Flagging Service
 */
export class UserFlaggingService {
  private dkgClient: DKGClientV8;
  private flags: Map<string, UserFlag> = new Map(); // In-memory cache, should use DB in production

  constructor(dkgClient?: DKGClientV8, dkgConfig?: DKGConfig) {
    this.dkgClient = dkgClient || new DKGClientV8(dkgConfig);
  }

  /**
   * Create a new user flag
   */
  async createFlag(flag: Omit<UserFlag, 'timestamp' | 'status'>): Promise<{
    flagId: string;
    ual?: string;
    transactionHash?: string;
  }> {
    const fullFlag: UserFlag = {
      ...flag,
      timestamp: Date.now(),
      status: flag.status || 'pending',
    };

    const flagId = `flag_${fullFlag.flagActor}_${fullFlag.flagTarget}_${fullFlag.timestamp}`;
    this.flags.set(flagId, fullFlag);

    // Auto-escalate if configured
    if (FLAG_TYPE_CONFIGS[fullFlag.flagType].autoEscalate && fullFlag.confidence > 0.85) {
      fullFlag.status = 'under_review';
      fullFlag.severity = 'critical';
    }

    // Publish to DKG
    try {
      const flagAsset = this.flagToJSONLD(fullFlag);
      const result = await this.dkgClient.publishReputationAsset(
        {
          developerId: fullFlag.flagTarget,
          reputationScore: 0,
          contributions: [],
          timestamp: fullFlag.timestamp,
          metadata: flagAsset as any,
        },
        2
      );

      return {
        flagId,
        ual: result.UAL,
        transactionHash: result.transactionHash,
      };
    } catch (error: any) {
      console.error(`Failed to publish flag to DKG:`, error);
      // Return flag ID even if DKG publish fails
      return { flagId };
    }
  }

  /**
   * Get recent flags for a target user
   */
  async getRecentFlags(
    targetUserDid: string,
    timeWindowHours: number = 24
  ): Promise<UserFlag[]> {
    const cutoffTime = Date.now() - timeWindowHours * 60 * 60 * 1000;
    
    return Array.from(this.flags.values()).filter(
      flag => 
        flag.flagTarget === targetUserDid && 
        flag.timestamp >= cutoffTime
    );
  }

  /**
   * Analyze flagging patterns for a target user
   */
  async analyzeFlaggingPatterns(
    targetUserDid: string,
    timeWindowHours: number = 24
  ): Promise<FlaggingAnalysis> {
    const recentFlags = await this.getRecentFlags(targetUserDid, timeWindowHours);

    // Calculate basic metrics
    const flaggingMetrics = this.calculateFlaggingMetrics(recentFlags);

    // Detect coordination
    const coordinationSignals = await this.detectCoordinatedFlagging(recentFlags);

    // Analyze reporters
    const reporterAnalysis = this.analyzeReportersCredibility(recentFlags);

    // Risk assessment
    const riskAssessment = this.assessFlaggingRisk({
      flaggingMetrics,
      coordinationSignals,
      reporterAnalysis,
    });

    return {
      targetUser: targetUserDid,
      timeWindow: timeWindowHours,
      flaggingMetrics,
      coordinationSignals,
      reporterAnalysis,
      riskAssessment,
    };
  }

  /**
   * Calculate flagging metrics
   */
  private calculateFlaggingMetrics(flags: UserFlag[]): FlaggingAnalysis['flaggingMetrics'] {
    if (flags.length === 0) {
      return {
        totalFlags: 0,
        uniqueReporters: 0,
        flagTypeDistribution: {} as Record<FlagType, number>,
        averageConfidence: 0,
        averageReporterReputation: 0,
      };
    }

    const uniqueReporters = new Set(flags.map(f => f.flagActor));
    const flagTypeDistribution = flags.reduce((acc, flag) => {
      acc[flag.flagType] = (acc[flag.flagType] || 0) + 1;
      return acc;
    }, {} as Record<FlagType, number>);

    const averageConfidence = 
      flags.reduce((sum, f) => sum + f.confidence, 0) / flags.length;
    
    const averageReporterReputation = 
      flags.reduce((sum, f) => sum + f.reporterReputation, 0) / flags.length;

    return {
      totalFlags: flags.length,
      uniqueReporters: uniqueReporters.size,
      flagTypeDistribution,
      averageConfidence,
      averageReporterReputation,
    };
  }

  /**
   * Detect coordinated flagging patterns
   */
  private async detectCoordinatedFlagging(
    flags: UserFlag[]
  ): Promise<FlaggingAnalysis['coordinationSignals']> {
    if (flags.length < 2) {
      return {
        overallCoordinationScore: 0,
      };
    }

    // Temporal clustering analysis
    const temporalClustering = this.analyzeTemporalPatterns(flags);

    // Reporter relationship analysis (simplified - would use graph in production)
    const reporterConnections = this.analyzeReporterRelationships(flags);

    // Behavioral similarity (simplified)
    const behavioralSimilarity = this.analyzeBehavioralSimilarity(flags);

    // Content pattern analysis
    const contentPatterns = this.analyzeContentPatterns(flags);

    // Calculate overall coordination score
    const overallCoordinationScore = Math.min(1.0, (
      (temporalClustering.burstScore * 0.3) +
      (reporterConnections.cliqueCoordinationScore * 0.4) +
      (behavioralSimilarity.similarityScore * 0.2) +
      (contentPatterns.patternScore * 0.1)
    ));

    return {
      temporalClustering,
      reporterConnections,
      behavioralSimilarity,
      contentPatterns,
      overallCoordinationScore,
    };
  }

  /**
   * Analyze temporal patterns in flagging
   */
  private analyzeTemporalPatterns(flags: UserFlag[]): {
    burstScore: number;
    regularityScore: number;
    totalFlags: number;
    timeSpanHours: number;
  } {
    const timestamps = flags.map(f => f.timestamp).sort((a, b) => a - b);
    
    if (timestamps.length < 2) {
      return {
        burstScore: 0,
        regularityScore: 0,
        totalFlags: flags.length,
        timeSpanHours: 0,
      };
    }

    // Calculate time differences
    const timeDiffs: number[] = [];
    for (let i = 1; i < timestamps.length; i++) {
      timeDiffs.push((timestamps[i] - timestamps[i - 1]) / 1000); // seconds
    }

    // Burst detection: flags within 5 minutes
    const burstThreshold = 300; // 5 minutes
    const burstCount = timeDiffs.filter(diff => diff <= burstThreshold).length;
    const burstScore = timeDiffs.length > 0 ? burstCount / timeDiffs.length : 0;

    // Regularity detection: check for consistent intervals
    const avgDiff = timeDiffs.reduce((sum, d) => sum + d, 0) / timeDiffs.length;
    const variance = timeDiffs.reduce((sum, d) => sum + Math.pow(d - avgDiff, 2), 0) / timeDiffs.length;
    const stdDev = Math.sqrt(variance);
    const regularityScore = avgDiff > 0 ? Math.max(0, 1 - (stdDev / avgDiff)) : 0;

    const timeSpanHours = (timestamps[timestamps.length - 1] - timestamps[0]) / (1000 * 60 * 60);

    return {
      burstScore,
      regularityScore,
      totalFlags: flags.length,
      timeSpanHours,
    };
  }

  /**
   * Analyze relationships between reporters
   */
  private analyzeReporterRelationships(flags: UserFlag[]): {
    reporterNetworkDensity: number;
    maxCliqueSize: number;
    cliqueCoordinationScore: number;
    uniqueReporters: number;
  } {
    const reporterDids = Array.from(new Set(flags.map(f => f.flagActor)));
    
    if (reporterDids.length < 2) {
      return {
        reporterNetworkDensity: 0,
        maxCliqueSize: 1,
        cliqueCoordinationScore: 0,
        uniqueReporters: reporterDids.length,
      };
    }

    // Simplified: assume low density if many unique reporters
    // In production, would query actual graph relationships
    const reporterNetworkDensity = 0.1; // Placeholder
    const maxCliqueSize = Math.min(reporterDids.length, 3); // Placeholder
    const cliqueCoordinationScore = maxCliqueSize / reporterDids.length;

    return {
      reporterNetworkDensity,
      maxCliqueSize,
      cliqueCoordinationScore,
      uniqueReporters: reporterDids.length,
    };
  }

  /**
   * Analyze behavioral similarity between reporters
   */
  private analyzeBehavioralSimilarity(flags: UserFlag[]): {
    similarityScore: number;
    patternMatches: number;
  } {
    // Simplified: check if reporters have similar flag types and confidence levels
    const reporterGroups = new Map<string, UserFlag[]>();
    flags.forEach(flag => {
      const key = flag.flagActor;
      if (!reporterGroups.has(key)) {
        reporterGroups.set(key, []);
      }
      reporterGroups.get(key)!.push(flag);
    });

    let patternMatches = 0;
    const reporters = Array.from(reporterGroups.entries());
    
    for (let i = 0; i < reporters.length; i++) {
      for (let j = i + 1; j < reporters.length; j++) {
        const [_, flags1] = reporters[i];
        const [__, flags2] = reporters[j];
        
        // Check if they flag similar types
        const types1 = new Set(flags1.map(f => f.flagType));
        const types2 = new Set(flags2.map(f => f.flagType));
        const commonTypes = new Set([...types1].filter(t => types2.has(t)));
        
        if (commonTypes.size > 0) {
          patternMatches++;
        }
      }
    }

    const maxMatches = (reporters.length * (reporters.length - 1)) / 2;
    const similarityScore = maxMatches > 0 ? patternMatches / maxMatches : 0;

    return {
      similarityScore,
      patternMatches,
    };
  }

  /**
   * Analyze content patterns in flags
   */
  private analyzeContentPatterns(flags: UserFlag[]): {
    patternScore: number;
    commonPatterns: string[];
  } {
    // Check for similar descriptions or evidence patterns
    const descriptions = flags
      .map(f => f.description?.toLowerCase() || '')
      .filter(d => d.length > 0);
    
    // Simple pattern: check for common words
    const wordCounts = new Map<string, number>();
    descriptions.forEach(desc => {
      const words = desc.split(/\s+/);
      words.forEach(word => {
        if (word.length > 3) {
          wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
        }
      });
    });

    const commonPatterns = Array.from(wordCounts.entries())
      .filter(([_, count]) => count >= 2)
      .map(([word, _]) => word)
      .slice(0, 5);

    const patternScore = commonPatterns.length > 0 ? Math.min(1.0, commonPatterns.length / 5) : 0;

    return {
      patternScore,
      commonPatterns,
    };
  }

  /**
   * Analyze reporter credibility
   */
  private analyzeReportersCredibility(flags: UserFlag[]): FlaggingAnalysis['reporterAnalysis'] {
    if (flags.length === 0) {
      return {
        credibleReporters: 0,
        lowReputationReporters: 0,
        averageReporterReputation: 0,
        reporterDiversity: 0,
      };
    }

    const reporterReputations = flags.map(f => f.reporterReputation);
    const averageReporterReputation = 
      reporterReputations.reduce((sum, r) => sum + r, 0) / reporterReputations.length;

    const credibleReporters = reporterReputations.filter(r => r >= 0.7).length;
    const lowReputationReporters = reporterReputations.filter(r => r < 0.3).length;

    const uniqueReporters = new Set(flags.map(f => f.flagActor)).size;
    const reporterDiversity = uniqueReporters / flags.length;

    return {
      credibleReporters,
      lowReputationReporters,
      averageReporterReputation,
      reporterDiversity,
    };
  }

  /**
   * Assess flagging risk
   */
  private assessFlaggingRisk(analysis: {
    flaggingMetrics: FlaggingAnalysis['flaggingMetrics'];
    coordinationSignals: FlaggingAnalysis['coordinationSignals'];
    reporterAnalysis: FlaggingAnalysis['reporterAnalysis'];
  }): FlaggingAnalysis['riskAssessment'] {
    const { flaggingMetrics, coordinationSignals, reporterAnalysis } = analysis;

    // Coordination mitigation reduces impact
    const coordinationMitigation = 
      1.0 - coordinationSignals.overallCoordinationScore;

    // Legitimate flag risk based on credible reporters
    const credibleReporterRatio = 
      reporterAnalysis.credibleReporters / Math.max(1, flaggingMetrics.uniqueReporters);
    const legitimateFlagRisk = 
      flaggingMetrics.averageConfidence * credibleReporterRatio * 0.6;

    // Credible reporter impact
    const credibleReporterImpact = 
      flaggingMetrics.averageConfidence * 
      (reporterAnalysis.averageReporterReputation >= 0.7 ? 0.8 : 0.4) * 0.4;

    // Overall risk
    const overallRisk = 
      (legitimateFlagRisk + credibleReporterImpact) * coordinationMitigation;

    return {
      legitimateFlagRisk,
      credibleReporterImpact,
      coordinationMitigation,
      overallRisk: Math.min(1.0, overallRisk),
    };
  }

  /**
   * Calculate flagging impact on reputation
   */
  async calculateFlaggingImpact(
    userDid: string,
    baseReputation: number
  ): Promise<FlaggingImpact> {
    const analysis = await this.analyzeFlaggingPatterns(userDid, 24);

    const flaggingImpact = this.calculateFlaggingImpactScore(analysis);
    const coordinationMitigation = analysis.riskAssessment.coordinationMitigation;

    // Apply flagging adjustment
    const adjustedReputation = baseReputation * (1 - flaggingImpact * coordinationMitigation);
    const flaggingPenalty = baseReputation - adjustedReputation;

    return {
      baseReputation,
      flaggingImpact,
      adjustedReputation: Math.max(0, adjustedReputation),
      flaggingPenalty,
      coordinationMitigation,
    };
  }

  /**
   * Calculate flagging impact score
   */
  private calculateFlaggingImpactScore(analysis: FlaggingAnalysis): number {
    const { riskAssessment, coordinationSignals } = analysis;

    // Coordination mitigation reduces impact
    const coordinationMitigation = 
      1.0 - coordinationSignals.overallCoordinationScore;

    // Base impact from legitimate flags
    const legitimateFlagImpact = riskAssessment.legitimateFlagRisk;

    // Reporter credibility weighting
    const credibleReporterImpact = riskAssessment.credibleReporterImpact;

    // Combined impact
    const impactScore = (
      legitimateFlagImpact * 0.6 +
      credibleReporterImpact * 0.4
    ) * coordinationMitigation;

    return Math.min(1.0, impactScore);
  }

  /**
   * Create automated flag from Guardian verification
   */
  async createAutomatedFlagFromGuardian(
    verificationResult: GuardianVerificationResult,
    contentFingerprint: string,
    targetUserDid: string
  ): Promise<{
    flagId: string;
    ual?: string;
  }> {
    if (verificationResult.confidence < 0.8 || verificationResult.status !== 'flagged') {
      return { flagId: '' }; // Not high enough confidence or not flagged
    }

    // Map Guardian match type to flag type
    const matchType = verificationResult.matches[0]?.matchType || 'unknown';
    const flagType = this.mapGuardianMatchToFlagType(matchType);

    const flag: Omit<UserFlag, 'timestamp' | 'status'> = {
      flagActor: 'did:dkg:agent:umanitek_guardian',
      flagTarget: targetUserDid,
      flagType,
      confidence: verificationResult.confidence,
      evidence: verificationResult.evidenceUAL ? [verificationResult.evidenceUAL] : [],
      severity: this.determineSeverity(verificationResult),
      reporterReputation: 0.95, // Guardian has high reputation
      description: `Automated flag from Umanitek Guardian: ${matchType} detected`,
      automated: true,
      guardianMatchId: verificationResult.matches[0]?.matchId,
    };

    return await this.createFlag(flag);
  }

  /**
   * Map Guardian match type to flag type
   */
  private mapGuardianMatchToFlagType(matchType: string): FlagType {
    const mapping: Record<string, FlagType> = {
      'deepfake': 'MISINFORMATION',
      'csam': 'ILLEGAL_CONTENT',
      'illicit': 'ILLEGAL_CONTENT',
      'misinformation': 'MISINFORMATION',
      'harassment': 'HARASSMENT',
      'spam': 'SPAM',
    };

    return mapping[matchType.toLowerCase()] || 'MISINFORMATION';
  }

  /**
   * Determine severity from Guardian verification
   */
  private determineSeverity(verificationResult: GuardianVerificationResult): FlagSeverity {
    const matchType = verificationResult.matches[0]?.matchType || '';
    const confidence = verificationResult.confidence;

    if (matchType === 'csam' || matchType === 'illicit') {
      return 'critical';
    }

    if (confidence >= 0.9) {
      return 'high';
    }

    if (confidence >= 0.7) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Generate flagging insights
   */
  async generateFlaggingInsights(timeWindowHours: number = 24): Promise<FlaggingInsights> {
    const cutoffTime = Date.now() - timeWindowHours * 60 * 60 * 1000;
    const recentFlags = Array.from(this.flags.values()).filter(
      f => f.timestamp >= cutoffTime
    );

    // Summary metrics
    const uniqueTargets = new Set(recentFlags.map(f => f.flagTarget));
    const uniqueReporters = new Set(recentFlags.map(f => f.flagActor));
    const resolvedFlags = recentFlags.filter(f => f.status === 'resolved').length;
    const resolutionRate = recentFlags.length > 0 
      ? resolvedFlags / recentFlags.length 
      : 0;

    const summaryMetrics = {
      totalFlags: recentFlags.length,
      uniqueTargets: uniqueTargets.size,
      uniqueReporters: uniqueReporters.size,
      averageConfidence: recentFlags.length > 0
        ? recentFlags.reduce((sum, f) => sum + f.confidence, 0) / recentFlags.length
        : 0,
      resolutionRate,
    };

    // Coordination alerts
    const coordinationAlerts: FlaggingInsights['coordinationAlerts'] = [];
    const flagsByTarget = new Map<string, UserFlag[]>();
    recentFlags.forEach(flag => {
      const target = flag.flagTarget;
      if (!flagsByTarget.has(target)) {
        flagsByTarget.set(target, []);
      }
      flagsByTarget.get(target)!.push(flag);
    });

    for (const [target, targetFlags] of flagsByTarget.entries()) {
      if (targetFlags.length >= 3) {
        const analysis = await this.analyzeFlaggingPatterns(target, timeWindowHours);
        const coordinationScore = analysis.coordinationSignals.overallCoordinationScore;

        if (coordinationScore > 0.7) {
          coordinationAlerts.push({
            targetUser: target,
            flagCount: targetFlags.length,
            coordinationScore,
            patternType: this.identifyCoordinationPattern(analysis),
            riskLevel: coordinationScore > 0.9 ? 'critical' : 
                      coordinationScore > 0.8 ? 'high' : 'medium',
            recommendedAction: 'investigate_coordination',
          });
        }
      }
    }

    // Top flagged users
    const topFlaggedUsers: FlaggingInsights['topFlaggedUsers'] = [];
    for (const [target, targetFlags] of flagsByTarget.entries()) {
      const avgConfidence = targetFlags.reduce((sum, f) => sum + f.confidence, 0) / targetFlags.length;
      const severity = this.determineOverallSeverity(targetFlags);
      
      topFlaggedUsers.push({
        userDid: target,
        flagCount: targetFlags.length,
        averageConfidence: avgConfidence,
        riskLevel: severity,
      });
    }

    topFlaggedUsers.sort((a, b) => b.flagCount - a.flagCount);

    // Reporter analysis
    const reporterStats = new Map<string, { flags: UserFlag[]; reputation: number }>();
    recentFlags.forEach(flag => {
      if (!reporterStats.has(flag.flagActor)) {
        reporterStats.set(flag.flagActor, { flags: [], reputation: flag.reporterReputation });
      }
      reporterStats.get(flag.flagActor)!.flags.push(flag);
    });

    const topReporters = Array.from(reporterStats.entries())
      .map(([did, stats]) => ({
        reporterDid: did,
        flagCount: stats.flags.length,
        averageConfidence: stats.flags.reduce((sum, f) => sum + f.confidence, 0) / stats.flags.length,
        reputation: stats.reputation,
      }))
      .sort((a, b) => b.flagCount - a.flagCount)
      .slice(0, 10);

    const suspiciousReporters = Array.from(reporterStats.entries())
      .filter(([_, stats]) => stats.reputation < 0.3 || stats.flags.length > 10)
      .map(([did, stats]) => {
        const analysis = this.analyzeFlaggingPatterns(did, timeWindowHours);
        return {
          reporterDid: did,
          flagCount: stats.flags.length,
          coordinationScore: analysis.coordinationSignals.overallCoordinationScore,
          lowReputation: stats.reputation < 0.3,
        };
      })
      .sort((a, b) => b.coordinationScore - a.coordinationScore)
      .slice(0, 10);

    return {
      timeWindow: timeWindowHours,
      summaryMetrics,
      coordinationAlerts,
      topFlaggedUsers: topFlaggedUsers.slice(0, 20),
      reporterAnalysis: {
        topReporters,
        suspiciousReporters,
      },
    };
  }

  /**
   * Identify coordination pattern type
   */
  private identifyCoordinationPattern(analysis: FlaggingAnalysis): string {
    const signals = analysis.coordinationSignals;
    
    if (signals.temporalClustering && signals.temporalClustering.burstScore > 0.7) {
      return 'temporal_burst';
    }
    
    if (signals.reporterConnections && signals.reporterConnections.cliqueCoordinationScore > 0.7) {
      return 'reporter_clique';
    }
    
    if (signals.behavioralSimilarity && signals.behavioralSimilarity.similarityScore > 0.7) {
      return 'behavioral_similarity';
    }
    
    return 'mixed_pattern';
  }

  /**
   * Determine overall severity from multiple flags
   */
  private determineOverallSeverity(flags: UserFlag[]): FlagSeverity {
    const severities = flags.map(f => f.severity);
    const severityWeights = { critical: 4, high: 3, medium: 2, low: 1 };
    const totalWeight = severities.reduce((sum, s) => sum + severityWeights[s], 0);
    const avgWeight = totalWeight / severities.length;

    if (avgWeight >= 3.5) return 'critical';
    if (avgWeight >= 2.5) return 'high';
    if (avgWeight >= 1.5) return 'medium';
    return 'low';
  }

  /**
   * Convert flag to JSON-LD Knowledge Asset
   */
  private flagToJSONLD(flag: UserFlag): any {
    return {
      '@context': [
        'https://schema.org/',
        'https://trust-net.org/schemas/flagging/v1',
        {
          guardian: 'https://umanitek.ai/schemas/verification/v1',
        },
      ],
      '@type': flag.automated ? 'AutomatedUserFlag' : 'UserFlag',
      '@id': `ual:dkg:userflag:${flag.flagTarget}_${flag.timestamp}`,
      creator: flag.flagActor,
      about: flag.flagTarget,
      flagType: flag.flagType,
      description: flag.description || '',
      timestamp: new Date(flag.timestamp).toISOString(),
      confidence: flag.confidence,
      evidence: flag.evidence.map(ual => ({
        '@type': 'ForensicEvidence',
        ual,
        source: flag.guardianMatchId ? 'Umanitek Guardian AI Agent' : 'User Report',
      })),
      status: flag.status,
      severity: flag.severity,
      reporterReputation: flag.reporterReputation,
      ...(flag.guardianMatchId ? {
        provenance: {
          verifiedBy: 'Umanitek Guardian',
          verificationMethod: 'forensic_fingerprint_matching',
          automatedAction: true,
          matchId: flag.guardianMatchId,
        },
      } : {
        provenance: {
          createdBy: flag.flagActor,
          previousFlags: [], // Would link to related flags in production
        },
      }),
    };
  }
}

// Singleton instance
let userFlaggingInstance: UserFlaggingService | null = null;

export function getUserFlaggingService(
  dkgClient?: DKGClientV8,
  dkgConfig?: DKGConfig
): UserFlaggingService {
  if (!userFlaggingInstance) {
    userFlaggingInstance = new UserFlaggingService(dkgClient, dkgConfig);
  }
  return userFlaggingInstance;
}

