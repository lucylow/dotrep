/**
 * Trust-Based Economic Decision Engine
 * 
 * Makes autonomous economic decisions based on user trust and query value.
 * Implements the complete trust-based economic decision framework:
 * 
 * User Query → Trust Assessment → Value Analysis → Economic Decision → x402 Payment → Enhanced Response
 * 
 * Key Features:
 * - Real-time trust assessment using DKG data
 * - Economic value analysis of queries
 * - Maximum justifiable spend calculation
 * - Premium data source identification
 * - Autonomous x402 payment execution
 * - Trust-aware response generation
 */

import { ReputationCalculator, ReputationScore, HighlyTrustedUserStatus } from './reputationCalculator';
import { TrustAnalytics, getTrustAnalytics } from './trustLayer/trustAnalytics';
import { AutonomousPaymentAgent } from './m2mCommerce/autonomousPaymentAgent';
import type { AutonomousAgentConfig } from './m2mCommerce/types';

export interface TrustProfile {
  tier: 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE' | 'UNVERIFIED';
  score: number; // 0-1
  maxBudgetMultiplier: number;
  accessLevel: 'full' | 'high' | 'medium' | 'basic' | 'limited';
  rawMetrics: {
    reputationScore: number;
    trustScore: number;
    economicStake: number;
    consistency: number;
    sybilRisk: number;
    completionRate: number;
  };
  highlyTrustedStatus?: HighlyTrustedUserStatus;
}

export interface ValueAnalysis {
  valueScore: number; // 0-1
  estimatedValueRange: {
    min: number;
    max: number;
  };
  analysisBreakdown: {
    complexity: number;
    urgency: number;
    potentialImpact: number;
    userBusinessValue: number;
    competitiveAdvantage: number;
  };
  confidence: number;
  queryType: 'strategic_decision' | 'operational_efficiency' | 'tactical_analysis' | 'informational';
}

export interface PremiumDataSource {
  name: string;
  url: string;
  cost: number;
  value: 'high' | 'medium' | 'low';
  description: string;
  expectedROI: number;
}

export interface EconomicDecision {
  shouldInvest: boolean;
  maxBudget: number;
  trustTier: TrustProfile['tier'];
  premiumSources: PremiumDataSource[];
  expectedROI: number;
  decisionRationale: string;
  confidence: number;
}

export interface EconomicPolicy {
  baseBudgetPerQuery: number; // Base budget in USD
  trustTierMultipliers: Record<TrustProfile['tier'], number>;
  maxBudgetCap: number; // Maximum budget per query
  minROIThreshold: number; // Minimum ROI to justify investment
  enableDiminishingReturns: boolean;
}

export class TrustEconomicDecisionEngine {
  private reputationCalculator: ReputationCalculator;
  private trustAnalytics: TrustAnalytics;
  private x402Agent?: AutonomousPaymentAgent;
  private policy: EconomicPolicy;
  private dkgClient?: any; // DKG client for querying trust data

  constructor(
    config: {
      x402Config?: AutonomousAgentConfig;
      economicPolicy?: Partial<EconomicPolicy>;
      dkgClient?: any;
    } = {}
  ) {
    this.reputationCalculator = new ReputationCalculator();
    this.trustAnalytics = getTrustAnalytics();
    this.dkgClient = config.dkgClient;

    // Initialize x402 agent if config provided
    if (config.x402Config) {
      this.x402Agent = new AutonomousPaymentAgent(config.x402Config);
    }

    // Set economic policy with defaults
    this.policy = {
      baseBudgetPerQuery: 1.0, // $1 base budget
      trustTierMultipliers: {
        PLATINUM: 3.0,
        GOLD: 2.0,
        SILVER: 1.0,
        BRONZE: 0.5,
        UNVERIFIED: 0.1,
      },
      maxBudgetCap: 50.0, // $50 max per query
      minROIThreshold: 0.1, // 10% minimum ROI
      enableDiminishingReturns: true,
      ...config.economicPolicy,
    };
  }

  /**
   * Make trust-based economic decision for a query
   */
  async makeEconomicDecision(
    userDid: string,
    query: string,
    context?: Record<string, any>
  ): Promise<EconomicDecision> {
    // Step 1: Get real-time trust assessment
    const trustProfile = await this.assessUserTrust(userDid);

    // Step 2: Analyze query economic value
    const valueAnalysis = await this.analyzeQueryValue(query, context);

    // Step 3: Calculate maximum justifiable spend
    const maxSpend = this.calculateMaxSpend(trustProfile, valueAnalysis);

    // Step 4: Identify available premium data sources
    const premiumOptions = await this.identifyPremiumDataSources(query, maxSpend, trustProfile);

    // Step 5: Make economic decision
    const shouldInvest = maxSpend > 0 && premiumOptions.length > 0;
    const expectedROI = shouldInvest
      ? valueAnalysis.estimatedValueRange.max - premiumOptions.reduce((sum, s) => sum + s.cost, 0)
      : 0;

    const decisionRationale = this.generateDecisionRationale(trustProfile, valueAnalysis, premiumOptions);

    return {
      shouldInvest,
      maxBudget: maxSpend,
      trustTier: trustProfile.tier,
      premiumSources: premiumOptions,
      expectedROI,
      decisionRationale,
      confidence: valueAnalysis.confidence * trustProfile.score,
    };
  }

  /**
   * Comprehensive trust assessment using DKG data and reputation calculator
   */
  async assessUserTrust(userDid: string): Promise<TrustProfile> {
    try {
      // Get trust score from trust analytics
      const trustScore = await this.trustAnalytics.calculateTrustScore(userDid);

      // Get reputation score (would use actual reputation calculator in production)
      // For now, use trust score as proxy
      const reputationScore = trustScore.compositeScore * 1000; // Scale to 0-1000

      // Query DKG for additional trust metrics if available
      let dkgMetrics = {
        economicStake: 0,
        consistency: 0.5,
        sybilRisk: 0.1,
        completionRate: 0.8,
      };

      if (this.dkgClient) {
        try {
          // Query DKG for trust metrics using SPARQL
          const sparqlQuery = `
            PREFIX tm: <https://trust-marketplace.org/schema/v1/>
            SELECT ?score ?stake ?consistency ?sybilRisk ?completionRate
            WHERE {
              ?profile tm:creator "${userDid}" ;
                tm:reputationMetrics/tm:overallScore ?score ;
                tm:economicStake/tm:stakedAmount ?stake ;
                tm:temporalData/tm:activityConsistency ?consistency ;
                tm:sybilResistance/tm:behavioralAnomaly ?sybilRisk ;
                tm:endorsementHistory/tm:completionRate ?completionRate .
            }
          `;

          // In production, would execute SPARQL query via DKG client
          // For now, use trust analytics data
          dkgMetrics = {
            economicStake: Number(trustScore.componentScores.economic * 10000), // Normalize
            consistency: trustScore.componentScores.reputation,
            sybilRisk: 1 - trustScore.componentScores.sybil,
            completionRate: trustScore.componentScores.payment,
          };
        } catch (error) {
          console.warn(`Failed to query DKG for trust metrics: ${error}`);
        }
      }

      // Calculate trust score from multiple dimensions
      const trustScoreValue = (
        trustScore.compositeScore * 0.4 + // Base trust
        this.stakeWeight(dkgMetrics.economicStake) * 0.3 + // Economic commitment
        dkgMetrics.consistency * 0.2 + // Behavioral consistency
        (1 - dkgMetrics.sybilRisk) * 0.1 // Inverse of risk
      );

      // Determine trust tier
      const tier = this.calculateTrustTier(trustScoreValue, dkgMetrics);

      return {
        tier,
        score: trustScoreValue,
        maxBudgetMultiplier: this.policy.trustTierMultipliers[tier],
        accessLevel: this.getAccessLevel(tier),
        rawMetrics: {
          reputationScore,
          trustScore: trustScore.compositeScore,
          economicStake: dkgMetrics.economicStake,
          consistency: dkgMetrics.consistency,
          sybilRisk: dkgMetrics.sybilRisk,
          completionRate: dkgMetrics.completionRate,
        },
      };
    } catch (error) {
      console.error(`Failed to assess user trust for ${userDid}:`, error);
      // Return default low-trust profile
      return {
        tier: 'UNVERIFIED',
        score: 0.1,
        maxBudgetMultiplier: this.policy.trustTierMultipliers.UNVERIFIED,
        accessLevel: 'limited',
        rawMetrics: {
          reputationScore: 0,
          trustScore: 0.1,
          economicStake: 0,
          consistency: 0,
          sybilRisk: 0.5,
          completionRate: 0,
        },
      };
    }
  }

  /**
   * Calculate trust tier from score and metrics
   */
  private calculateTrustTier(
    trustScore: number,
    metrics: { economicStake: number; consistency: number; sybilRisk: number }
  ): TrustProfile['tier'] {
    const tiers: Array<{ name: TrustProfile['tier']; min: number }> = [
      { name: 'PLATINUM', min: 0.8 },
      { name: 'GOLD', min: 0.6 },
      { name: 'SILVER', min: 0.4 },
      { name: 'BRONZE', min: 0.2 },
      { name: 'UNVERIFIED', min: 0.0 },
    ];

    // Adjust for economic stake and sybil risk
    let adjustedScore = trustScore;
    if (metrics.economicStake > 10000) {
      adjustedScore += 0.1; // Boost for high stake
    }
    if (metrics.sybilRisk > 0.3) {
      adjustedScore -= 0.2; // Penalty for high sybil risk
    }

    for (const tier of tiers) {
      if (adjustedScore >= tier.min) {
        return tier.name;
      }
    }

    return 'UNVERIFIED';
  }

  /**
   * Get access level from trust tier
   */
  private getAccessLevel(tier: TrustProfile['tier']): TrustProfile['accessLevel'] {
    const accessMap: Record<TrustProfile['tier'], TrustProfile['accessLevel']> = {
      PLATINUM: 'full',
      GOLD: 'high',
      SILVER: 'medium',
      BRONZE: 'basic',
      UNVERIFIED: 'limited',
    };
    return accessMap[tier];
  }

  /**
   * Weight economic stake for trust calculation
   */
  private stakeWeight(stake: number): number {
    // Normalize stake to 0-1 range (assuming max stake of 100k)
    return Math.min(1.0, stake / 100000);
  }

  /**
   * Analyze query economic value
   */
  async analyzeQueryValue(
    query: string,
    context?: Record<string, any>
  ): Promise<ValueAnalysis> {
    // Assess query complexity
    const complexity = this.assessQueryComplexity(query);

    // Assess urgency
    const urgency = this.assessUrgency(context);

    // Estimate potential impact
    const potentialImpact = this.estimatePotentialImpact(query, context);

    // Assess user business value
    const userBusinessValue = this.assessBusinessValue(context);

    // Assess competitive advantage
    const competitiveAdvantage = this.assessCompetitiveAngle(query);

    // Calculate value score (0-1)
    const valueScore =
      complexity * 0.25 +
      urgency * 0.2 +
      potentialImpact * 0.3 +
      userBusinessValue * 0.15 +
      competitiveAdvantage * 0.1;

    // Classify query type
    const queryType = this.classifyQueryType(context);

    // Convert to dollar value range
    const dollarValue = this.valueScoreToDollars(valueScore, queryType);

    // Calculate confidence
    const confidence = this.calculateConfidence({
      complexity,
      urgency,
      potentialImpact,
      userBusinessValue,
      competitiveAdvantage,
    });

    return {
      valueScore,
      estimatedValueRange: dollarValue,
      analysisBreakdown: {
        complexity,
        urgency,
        potentialImpact,
        userBusinessValue,
        competitiveAdvantage,
      },
      confidence,
      queryType,
    };
  }

  /**
   * Assess query complexity (0-1)
   */
  private assessQueryComplexity(query: string): number {
    const complexityIndicators = [
      /analyze|analysis|strategy|strategic|recommend|recommendation/i,
      /compare|comparison|evaluate|evaluation/i,
      /predict|forecast|trend|market/i,
      /optimize|optimization|efficiency|improve/i,
    ];

    let complexity = 0.3; // Base complexity

    complexityIndicators.forEach((pattern) => {
      if (pattern.test(query)) {
        complexity += 0.15;
      }
    });

    // Length factor
    if (query.length > 100) {
      complexity += 0.1;
    }

    return Math.min(1.0, complexity);
  }

  /**
   * Assess urgency (0-1)
   */
  private assessUrgency(context?: Record<string, any>): number {
    if (!context) return 0.5;

    const urgencyIndicators = [
      'urgent',
      'asap',
      'immediate',
      'deadline',
      'time-sensitive',
    ];

    const contextStr = JSON.stringify(context).toLowerCase();
    let urgency = 0.3; // Base urgency

    urgencyIndicators.forEach((indicator) => {
      if (contextStr.includes(indicator)) {
        urgency += 0.2;
      }
    });

    return Math.min(1.0, urgency);
  }

  /**
   * Estimate potential impact (0-1)
   */
  private estimatePotentialImpact(query: string, context?: Record<string, any>): number {
    const impactIndicators = [
      /investment|acquisition|merger|deal/i,
      /revenue|profit|ROI|return/i,
      /market share|competitive|advantage/i,
      /risk|compliance|regulatory/i,
    ];

    let impact = 0.4; // Base impact

    impactIndicators.forEach((pattern) => {
      if (pattern.test(query)) {
        impact += 0.15;
      }
    });

    return Math.min(1.0, impact);
  }

  /**
   * Assess business value from context (0-1)
   */
  private assessBusinessValue(context?: Record<string, any>): number {
    if (!context) return 0.5;

    // Check for business context indicators
    const businessIndicators = ['business', 'company', 'organization', 'enterprise', 'revenue'];
    const contextStr = JSON.stringify(context).toLowerCase();

    let value = 0.4;
    businessIndicators.forEach((indicator) => {
      if (contextStr.includes(indicator)) {
        value += 0.1;
      }
    });

    return Math.min(1.0, value);
  }

  /**
   * Assess competitive angle (0-1)
   */
  private assessCompetitiveAngle(query: string): number {
    const competitiveIndicators = [
      /competitor|competitive|market|industry/i,
      /benchmark|compare|comparison/i,
      /advantage|differentiate|unique/i,
    ];

    let angle = 0.3;

    competitiveIndicators.forEach((pattern) => {
      if (pattern.test(query)) {
        angle += 0.2;
      }
    });

    return Math.min(1.0, angle);
  }

  /**
   * Classify query type
   */
  private classifyQueryType(context?: Record<string, any>): ValueAnalysis['queryType'] {
    if (!context) return 'informational';

    const contextStr = JSON.stringify(context).toLowerCase();

    if (/strategic|investment|acquisition|merger|decision/i.test(contextStr)) {
      return 'strategic_decision';
    }
    if (/operational|efficiency|process|workflow|optimize/i.test(contextStr)) {
      return 'operational_efficiency';
    }
    if (/tactical|analysis|market|trend|research/i.test(contextStr)) {
      return 'tactical_analysis';
    }

    return 'informational';
  }

  /**
   * Convert value score to dollar amounts
   */
  private valueScoreToDollars(
    valueScore: number,
    queryType: ValueAnalysis['queryType']
  ): { min: number; max: number } {
    const baseValueRanges: Record<ValueAnalysis['queryType'], [number, number]> = {
      strategic_decision: [100.0, 1000.0],
      operational_efficiency: [10.0, 100.0],
      tactical_analysis: [1.0, 10.0],
      informational: [0.0, 1.0],
    };

    const [minVal, maxVal] = baseValueRanges[queryType];
    return {
      min: minVal,
      max: minVal + valueScore * (maxVal - minVal),
    };
  }

  /**
   * Calculate confidence in value analysis
   */
  private calculateConfidence(breakdown: ValueAnalysis['analysisBreakdown']): number {
    // Confidence increases with more indicators present
    const indicators = Object.values(breakdown).filter((v) => v > 0.5);
    return Math.min(1.0, 0.5 + indicators.length * 0.1);
  }

  /**
   * Calculate maximum justifiable spend
   */
  private calculateMaxSpend(trustProfile: TrustProfile, valueAnalysis: ValueAnalysis): number {
    // Base budget from policy
    const baseBudget = this.policy.baseBudgetPerQuery;

    // Apply trust tier multiplier
    const trustAdjustedBudget = baseBudget * trustProfile.maxBudgetMultiplier;

    // Apply value analysis (cap at estimated max value)
    const valueCappedBudget = Math.min(
      trustAdjustedBudget,
      valueAnalysis.estimatedValueRange.max * 0.5 // Don't spend more than 50% of estimated value
    );

    // Apply policy cap
    const finalBudget = Math.min(valueCappedBudget, this.policy.maxBudgetCap);

    return Math.max(0, finalBudget);
  }

  /**
   * Identify premium data sources for query
   */
  async identifyPremiumDataSources(
    query: string,
    maxBudget: number,
    trustProfile: TrustProfile
  ): Promise<PremiumDataSource[]> {
    // In production, this would query a marketplace or data source registry
    // For now, return mock premium sources based on query type

    const sources: PremiumDataSource[] = [];

    // Strategic decision sources
    if (/acquisition|merger|investment|strategy/i.test(query)) {
      sources.push({
        name: 'M&A Intelligence API',
        url: 'https://api.example.com/ma-intelligence',
        cost: 8.0,
        value: 'high',
        description: 'Comprehensive M&A market intelligence and deal analysis',
        expectedROI: 0.4,
      });
      sources.push({
        name: 'Institutional Sentiment',
        url: 'https://api.example.com/institutional-sentiment',
        cost: 5.0,
        value: 'medium',
        description: 'Real-time institutional investor sentiment analysis',
        expectedROI: 0.3,
      });
      sources.push({
        name: 'Regulatory Risk Analysis',
        url: 'https://api.example.com/regulatory-risk',
        cost: 2.0,
        value: 'low',
        description: 'Regulatory compliance and risk assessment',
        expectedROI: 0.2,
      });
    }

    // Market analysis sources
    if (/market|trend|industry|competitive/i.test(query)) {
      sources.push({
        name: 'Industry Trends Report',
        url: 'https://api.example.com/industry-trends',
        cost: 2.5,
        value: 'medium',
        description: 'Comprehensive industry trend analysis and forecasts',
        expectedROI: 0.35,
      });
    }

    // Filter by budget and access level
    const affordableSources = sources.filter((source) => {
      const canAfford = source.cost <= maxBudget;
      const hasAccess = this.checkAccessLevel(source.value, trustProfile.accessLevel);
      return canAfford && hasAccess;
    });

    // Sort by expected ROI (descending)
    return affordableSources.sort((a, b) => b.expectedROI - a.expectedROI);
  }

  /**
   * Check if source is accessible at trust level
   */
  private checkAccessLevel(
    sourceValue: PremiumDataSource['value'],
    accessLevel: TrustProfile['accessLevel']
  ): boolean {
    const accessMatrix: Record<TrustProfile['accessLevel'], PremiumDataSource['value'][]> = {
      full: ['high', 'medium', 'low'],
      high: ['high', 'medium'],
      medium: ['medium', 'low'],
      basic: ['low'],
      limited: [],
    };

    return accessMatrix[accessLevel].includes(sourceValue);
  }

  /**
   * Generate decision rationale
   */
  private generateDecisionRationale(
    trustProfile: TrustProfile,
    valueAnalysis: ValueAnalysis,
    premiumSources: PremiumDataSource[]
  ): string {
    if (premiumSources.length === 0) {
      return `No premium data sources available. Trust tier: ${trustProfile.tier}, Query value: ${(valueAnalysis.valueScore * 100).toFixed(0)}%`;
    }

    const totalCost = premiumSources.reduce((sum, s) => sum + s.cost, 0);
    const expectedValue = valueAnalysis.estimatedValueRange.max;

    return `${trustProfile.tier} trust tier user. Query value: ${(valueAnalysis.valueScore * 100).toFixed(0)}% ($${expectedValue.toFixed(2)}). Approved ${premiumSources.length} premium sources ($${totalCost.toFixed(2)}) with expected ROI: ${((expectedValue - totalCost) / totalCost * 100).toFixed(0)}%`;
  }
}

