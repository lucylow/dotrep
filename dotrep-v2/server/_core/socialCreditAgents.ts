/**
 * Social Credit Marketplace AI Agent Layer
 * 
 * Implements 5 specialized AI agents for the Sybil-Resistant Social Credit Marketplace:
 * 1. Trust Navigator Agent - Real-time reputation discovery and matching
 * 2. Sybil Detective Agent - Automated fake account detection
 * 3. Smart Contract Negotiator Agent - Autonomous endorsement deal-making
 * 4. Campaign Performance Optimizer Agent - Endorsement ROI maximization
 * 5. Trust Auditor Agent - Continuous reputation verification
 * 
 * These agents leverage MCP tools, DKG queries, x402 payments, and Sybil detection
 * to create an autonomous marketplace for social credit endorsements.
 */

import { DKGClient } from '../../dkg-integration/dkg-client';
import { getPolkadotApi, type PolkadotApiService } from './polkadotApi';
import { getSybilDetectionService, type SybilDetectionResult } from './sybilDetection';
import { AccountClusteringService, type Account } from '../../dkg-integration/account-clustering';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface InfluencerCandidate {
  did: string;
  reputation: number;
  socialRank: number;
  economicStake: number;
  sybilRisk: number;
  platforms: string[];
  followerCount?: number;
  engagementRate?: number;
  specialties: string[];
}

export interface CampaignRequirements {
  targetAudience: string;
  minReputation?: number;
  maxSybilRisk?: number;
  platforms?: string[];
  specialties?: string[];
  budget?: number;
  campaignType: 'product_launch' | 'brand_awareness' | 'event_promotion' | 'content_creation';
}

export interface CampaignMatch {
  influencer: InfluencerCandidate;
  matchScore: number;
  estimatedROI: number;
  recommendedPayment: number;
  reasoning: string;
}

export interface EndorsementDeal {
  dealId: string;
  influencerDid: string;
  brandDid: string;
  terms: {
    paymentAmount: number;
    paymentToken: string;
    performanceBonus?: {
      threshold: number;
      amount: number;
    };
    deliverables: string[];
    timeline: {
      start: number;
      end: number;
    };
  };
  status: 'pending' | 'negotiating' | 'accepted' | 'active' | 'completed' | 'disputed';
  x402PaymentId?: string;
  receiptUAL?: string;
}

export interface SybilCluster {
  clusterId: string;
  accounts: Array<{
    did: string;
    reputation: number;
    riskScore: number;
  }>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  patterns: string[];
  confidence: number;
}

export interface CampaignPerformance {
  campaignId: string;
  totalEngagement: number;
  reach: number;
  conversionRate: number;
  roi: number;
  influencerPerformance: Array<{
    influencerDid: string;
    engagement: number;
    conversions: number;
    paymentReceived: number;
  }>;
}

// ============================================================================
// 1. Trust Navigator Agent
// ============================================================================

export class TrustNavigatorAgent {
  private dkgClient: DKGClient;
  private polkadotApi: PolkadotApiService;

  constructor(dkgClient: DKGClient, polkadotApi: PolkadotApiService) {
    this.dkgClient = dkgClient;
    this.polkadotApi = polkadotApi;
  }

  /**
   * Find influencers matching campaign requirements using natural language
   */
  async findInfluencers(
    query: string | CampaignRequirements,
    limit: number = 10
  ): Promise<CampaignMatch[]> {
    const requirements = typeof query === 'string' 
      ? this.parseNaturalLanguageQuery(query)
      : query;

    // Query DKG for reputation data
    const candidates = await this.queryReputationGraph(requirements);
    
    // Score and rank candidates
    const matches = candidates.map(candidate => ({
      influencer: candidate,
      matchScore: this.calculateMatchScore(candidate, requirements),
      estimatedROI: this.estimateROI(candidate, requirements),
      recommendedPayment: this.calculateRecommendedPayment(candidate, requirements),
      reasoning: this.generateMatchReasoning(candidate, requirements),
    }));

    // Sort by match score and return top results
    return matches
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
  }

  /**
   * Parse natural language query into structured requirements
   */
  private parseNaturalLanguageQuery(query: string): CampaignRequirements {
    const lowerQuery = query.toLowerCase();
    
    // Extract reputation threshold
    const reputationMatch = lowerQuery.match(/reputation[:\s]+(?:>|above|over)[:\s]+([\d.]+)/);
    const minReputation = reputationMatch ? parseFloat(reputationMatch[1]) : undefined;

    // Extract platforms
    const platforms: string[] = [];
    if (lowerQuery.includes('twitter') || lowerQuery.includes('x.com')) platforms.push('twitter');
    if (lowerQuery.includes('reddit')) platforms.push('reddit');
    if (lowerQuery.includes('tiktok')) platforms.push('tiktok');
    if (lowerQuery.includes('youtube')) platforms.push('youtube');

    // Extract specialties
    const specialties: string[] = [];
    if (lowerQuery.includes('tech') || lowerQuery.includes('gaming')) specialties.push('technology');
    if (lowerQuery.includes('gaming') || lowerQuery.includes('game')) specialties.push('gaming');
    if (lowerQuery.includes('gadget')) specialties.push('gadgets');

    // Extract campaign type
    let campaignType: CampaignRequirements['campaignType'] = 'brand_awareness';
    if (lowerQuery.includes('launch') || lowerQuery.includes('product')) campaignType = 'product_launch';
    if (lowerQuery.includes('event')) campaignType = 'event_promotion';

    return {
      targetAudience: query,
      minReputation,
      platforms: platforms.length > 0 ? platforms : undefined,
      specialties: specialties.length > 0 ? specialties : undefined,
      campaignType,
    };
  }

  /**
   * Query DKG reputation graph for candidates
   */
  private async queryReputationGraph(requirements: CampaignRequirements): Promise<InfluencerCandidate[]> {
    const query = `
      PREFIX schema: <https://schema.org/>
      PREFIX dotrep: <https://dotrep.io/ontology/>
      
      SELECT ?did ?reputation ?socialRank ?economicStake ?platforms ?specialties
      WHERE {
        ?did a schema:Person .
        ?did dotrep:reputationScore ?reputation .
        ?did dotrep:socialRank ?socialRank .
        ?did dotrep:economicStake ?economicStake .
        OPTIONAL { ?did dotrep:platforms ?platforms . }
        OPTIONAL { ?did dotrep:specialties ?specialties . }
        ${requirements.minReputation ? `FILTER(?reputation >= ${requirements.minReputation})` : ''}
      }
      ORDER BY DESC(?reputation)
      LIMIT 50
    `;

    try {
      const results = await this.dkgClient.graphQuery(query, 'SELECT');
      
      return results.map((result: any) => ({
        did: result.did,
        reputation: parseFloat(result.reputation) || 0,
        socialRank: parseFloat(result.socialRank) || 0,
        economicStake: parseFloat(result.economicStake) || 0,
        sybilRisk: 0.5, // Will be calculated by Sybil Detective
        platforms: result.platforms ? result.platforms.split(',') : [],
        specialties: result.specialties ? result.specialties.split(',') : [],
      }));
    } catch (error) {
      console.error('[TrustNavigator] Error querying DKG:', error);
      return [];
    }
  }

  private calculateMatchScore(
    candidate: InfluencerCandidate,
    requirements: CampaignRequirements
  ): number {
    let score = 0;

    // Reputation weight (40%)
    const reputationScore = Math.min(candidate.reputation / 1000, 1);
    score += reputationScore * 0.4;

    // Social rank weight (30%)
    const socialScore = Math.min(candidate.socialRank / 1000, 1);
    score += socialScore * 0.3;

    // Platform match (20%)
    if (requirements.platforms && requirements.platforms.length > 0) {
      const platformMatch = requirements.platforms.some(p => 
        candidate.platforms.includes(p)
      );
      score += (platformMatch ? 1 : 0.3) * 0.2;
    } else {
      score += 0.2;
    }

    // Specialty match (10%)
    if (requirements.specialties && requirements.specialties.length > 0) {
      const specialtyMatch = requirements.specialties.some(s =>
        candidate.specialties.includes(s)
      );
      score += (specialtyMatch ? 1 : 0.5) * 0.1;
    } else {
      score += 0.1;
    }

    // Sybil risk penalty
    score *= (1 - candidate.sybilRisk * 0.3);

    return Math.min(score, 1);
  }

  private estimateROI(
    candidate: InfluencerCandidate,
    requirements: CampaignRequirements
  ): number {
    const baseROI = candidate.reputation * 0.1 + candidate.socialRank * 0.15;
    const engagementBonus = (candidate.engagementRate || 0.05) * 100;
    return baseROI + engagementBonus;
  }

  private calculateRecommendedPayment(
    candidate: InfluencerCandidate,
    requirements: CampaignRequirements
  ): number {
    const basePayment = candidate.reputation * 0.01;
    const budget = requirements.budget || 1000;
    return Math.min(basePayment, budget * 0.2);
  }

  private generateMatchReasoning(
    candidate: InfluencerCandidate,
    requirements: CampaignRequirements
  ): string {
    return `Reputation: ${candidate.reputation.toFixed(0)}, ` +
           `Social Rank: ${candidate.socialRank.toFixed(0)}, ` +
           `Sybil Risk: ${(candidate.sybilRisk * 100).toFixed(1)}%, ` +
           `Platforms: ${candidate.platforms.join(', ') || 'N/A'}`;
  }
}

// ============================================================================
// 2. Sybil Detective Agent
// ============================================================================

export class SybilDetectiveAgent {
  private sybilService: ReturnType<typeof getSybilDetectionService>;
  private dkgClient: DKGClient;
  private clusteringService: AccountClusteringService;

  constructor(dkgClient: DKGClient) {
    this.sybilService = getSybilDetectionService();
    this.dkgClient = dkgClient;
    // Use connectivity-based clustering with optimized settings for Sybil detection
    this.clusteringService = new AccountClusteringService({
      method: 'connectivity',
      minSimilarity: 0.3,
      minClusterSize: 2,
      maxClusterSize: 1000,
      featureWeights: {
        sharedConnections: 0.35,
        connectionOverlap: 0.3,
        temporalSimilarity: 0.2,
        metadataSimilarity: 0.1,
        graphDistance: 0.05,
      },
    });
  }

  /**
   * Detect Sybil clusters in the social graph
   */
  async detectSybilClusters(
    graphData: Array<{
      accountId: string;
      reputation: number;
      contributions: Array<{ timestamp: number; block: number }>;
      connections: Array<{ target: string; weight: number }>;
    }>
  ): Promise<SybilCluster[]> {
    const detectionResults = await this.sybilService.detectSybils(graphData);

    // Group detected Sybils into clusters
    const clusters = this.identifyClusters(
      detectionResults.results,
      graphData
    );

    return clusters;
  }

  /**
   * Analyze a single account for Sybil patterns
   */
  async analyzeAccount(accountId: string): Promise<SybilDetectionResult & {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    recommendations: string[];
  }> {
    // Query account data from DKG
    const accountData = await this.queryAccountData(accountId);

    const result = this.sybilService['detectSybil'](accountData);

    const riskLevel = result.confidence < 0.3 ? 'low' :
                     result.confidence < 0.5 ? 'medium' :
                     result.confidence < 0.7 ? 'high' : 'critical';

    const recommendations = this.generateRecommendations(result, riskLevel);

    return {
      ...result,
      riskLevel,
      recommendations,
    };
  }

  /**
   * Real-time monitoring of suspicious activity
   */
  async monitorSuspiciousActivity(
    timeWindow: number = 3600000 // 1 hour
  ): Promise<Array<{
    accountId: string;
    activity: string;
    riskScore: number;
    timestamp: number;
  }>> {
    // Query recent activity from DKG
    const query = `
      PREFIX schema: <https://schema.org/>
      PREFIX dotrep: <https://dotrep.io/ontology/>
      
      SELECT ?account ?timestamp ?activity
      WHERE {
        ?activity schema:actor ?account .
        ?activity schema:startTime ?timestamp .
        FILTER(?timestamp >= ${Date.now() - timeWindow})
      }
      ORDER BY DESC(?timestamp)
      LIMIT 100
    `;

    try {
      const results = await this.dkgClient.graphQuery(query, 'SELECT');
      
      return results.map((result: any) => ({
        accountId: result.account,
        activity: result.activity,
        riskScore: 0.5, // Would calculate based on patterns
        timestamp: parseInt(result.timestamp),
      }));
    } catch (error) {
      console.error('[SybilDetective] Error monitoring activity:', error);
      return [];
    }
  }

  private identifyClusters(
    detectionResults: Array<{ accountId: string; result: SybilDetectionResult }>,
    graphData: Array<{ accountId: string; connections: Array<{ target: string }> }>
  ): SybilCluster[] {
    // Filter to only Sybil accounts for clustering
    const sybilAccountIds = detectionResults
      .filter(r => r.result.isSybil)
      .map(r => r.accountId);

    if (sybilAccountIds.length === 0) return [];

    // Convert to Account format for clustering service
    const accounts: Account[] = graphData
      .filter(a => sybilAccountIds.includes(a.accountId))
      .map(a => ({
        accountId: a.accountId,
        reputation: 0, // Will be updated from detection results
        contributions: [], // Can be enhanced with actual contribution data
        connections: a.connections.map(c => ({
          target: c.target,
          weight: 'weight' in c ? c.weight : 1,
        })),
        metadata: {},
      }));

    // Use advanced clustering service
    const clusters = this.clusteringService.findClusters(accounts);

    // Convert to SybilCluster format
    return clusters.map(cluster => {
      const accounts = cluster.accounts.map(id => {
        const result = detectionResults.find(r => r.accountId === id);
        const account = graphData.find(a => a.accountId === id);
        return {
          did: id,
          reputation: account ? 0 : 0,
          riskScore: result?.result.confidence || 0,
        };
      });

      // Calculate risk level based on cluster metrics
      const avgRisk = accounts.reduce((sum, a) => sum + a.riskScore, 0) / accounts.length;
      const combinedRisk = Math.max(avgRisk, cluster.riskScore);
      
      const riskLevel = combinedRisk < 0.3 ? 'low' :
                       combinedRisk < 0.5 ? 'medium' :
                       combinedRisk < 0.7 ? 'high' : 'critical';

      // Combine patterns from detection results and cluster analysis
      const detectionPatterns = this.extractPatterns(accounts, detectionResults);
      const allPatterns = [...new Set([...detectionPatterns, ...cluster.patterns])];

      return {
        clusterId: cluster.clusterId,
        accounts,
        riskLevel,
        patterns: allPatterns,
        confidence: combinedRisk,
      };
    });
  }

  private extractPatterns(
    accounts: Array<{ did: string; riskScore: number }>,
    detectionResults: Array<{ accountId: string; result: SybilDetectionResult }>
  ): string[] {
    const patterns = new Set<string>();
    accounts.forEach(account => {
      const result = detectionResults.find(r => r.accountId === account.did);
      if (result) {
        result.result.suspiciousPatterns.forEach(p => patterns.add(p));
      }
    });
    return Array.from(patterns);
  }

  private async queryAccountData(accountId: string): Promise<{
    accountId: string;
    reputation: number;
    contributions: Array<{ timestamp: number; block: number }>;
    connections: Array<{ target: string; weight: number }>;
  }> {
    // Query from DKG - simplified for now
    return {
      accountId,
      reputation: 0,
      contributions: [],
      connections: [],
    };
  }

  private generateRecommendations(
    result: SybilDetectionResult,
    riskLevel: string
  ): string[] {
    const recommendations: string[] = [];

    if (result.suspiciousPatterns.includes('rapid_contributions')) {
      recommendations.push('Review contribution timing patterns');
    }
    if (result.suspiciousPatterns.includes('reciprocal_cluster')) {
      recommendations.push('Investigate connection network for circular patterns');
    }
    if (result.suspiciousPatterns.includes('low_reputation_high_activity')) {
      recommendations.push('Verify account authenticity through external sources');
    }
    if (riskLevel === 'critical') {
      recommendations.push('Flag account for manual review');
      recommendations.push('Consider blocking account from marketplace');
    }

    return recommendations;
  }
}

// ============================================================================
// 3. Smart Contract Negotiator Agent
// ============================================================================

export class SmartContractNegotiatorAgent {
  private polkadotApi: PolkadotApiService;
  private dkgClient: DKGClient;

  constructor(polkadotApi: PolkadotApiService, dkgClient: DKGClient) {
    this.polkadotApi = polkadotApi;
    this.dkgClient = dkgClient;
  }

  /**
   * Negotiate endorsement deal terms
   */
  async negotiateDeal(
    influencerDid: string,
    brandDid: string,
    initialTerms: Partial<EndorsementDeal['terms']>,
    campaignRequirements: CampaignRequirements
  ): Promise<EndorsementDeal> {
    // Get influencer reputation for pricing
    const influencerRep = await this.getReputation(influencerDid);
    
    // Optimize payment amount based on reputation
    const optimizedPayment = this.optimizePayment(
      influencerRep,
      initialTerms.paymentAmount || 0,
      campaignRequirements
    );

    // Calculate performance bonus structure
    const performanceBonus = this.calculatePerformanceBonus(
      influencerRep,
      optimizedPayment
    );

    // Generate smart contract terms
    const terms: EndorsementDeal['terms'] = {
      paymentAmount: optimizedPayment,
      paymentToken: initialTerms.paymentToken || 'DOT',
      performanceBonus,
      deliverables: this.generateDeliverables(campaignRequirements),
      timeline: this.calculateTimeline(campaignRequirements),
    };

    const deal: EndorsementDeal = {
      dealId: `deal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      influencerDid,
      brandDid,
      terms,
      status: 'pending',
    };

    return deal;
  }

  /**
   * Setup x402 payment flow for deal
   */
  async setupX402Payment(deal: EndorsementDeal): Promise<{
    paymentId: string;
    paymentRequest: {
      amount: number;
      token: string;
      recipient: string;
      resource: string;
    };
  }> {
    const paymentId = `x402-${deal.dealId}`;
    
    return {
      paymentId,
      paymentRequest: {
        amount: deal.terms.paymentAmount,
        token: deal.terms.paymentToken,
        recipient: deal.influencerDid,
        resource: `urn:deal:${deal.dealId}`,
      },
    };
  }

  /**
   * Execute deal with x402 payment
   */
  async executeDeal(deal: EndorsementDeal, paymentProof: string): Promise<{
    deal: EndorsementDeal;
    receiptUAL?: string;
  }> {
    // Validate payment proof
    const isValid = await this.validatePaymentProof(paymentProof, deal);
    if (!isValid) {
      throw new Error('Invalid payment proof');
    }

    // Initiate x402 payment flow
    const x402Setup = await this.setupX402Payment(deal);
    
    // In production, would call x402 gateway API
    // For now, simulate receipt generation
    const receiptUAL = `ual:receipt:${x402Setup.paymentId}`;

    const updatedDeal: EndorsementDeal = {
      ...deal,
      status: 'active',
      x402PaymentId: x402Setup.paymentId,
      receiptUAL,
    };

    return {
      deal: updatedDeal,
      receiptUAL,
    };
  }

  private async getReputation(did: string): Promise<number> {
    try {
      const rep = await this.polkadotApi.getReputation(did);
      return rep.overall;
    } catch {
      return 500; // Default
    }
  }

  private optimizePayment(
    reputation: number,
    baseAmount: number,
    requirements: CampaignRequirements
  ): number {
    // Reputation-based pricing: higher reputation = higher payment
    const reputationMultiplier = Math.max(0.5, reputation / 1000);
    const optimized = baseAmount * (1 + reputationMultiplier * 0.5);
    
    // Budget constraint
    if (requirements.budget) {
      return Math.min(optimized, requirements.budget);
    }
    
    return optimized;
  }

  private calculatePerformanceBonus(
    reputation: number,
    basePayment: number
  ): EndorsementDeal['terms']['performanceBonus'] {
    if (reputation < 600) return undefined;

    return {
      threshold: 1000, // engagement threshold
      amount: basePayment * 0.2, // 20% bonus
    };
  }

  private generateDeliverables(requirements: CampaignRequirements): string[] {
    const deliverables: string[] = [];
    
    if (requirements.campaignType === 'product_launch') {
      deliverables.push('Product review post');
      deliverables.push('Unboxing video');
      deliverables.push('Social media mentions');
    } else if (requirements.campaignType === 'brand_awareness') {
      deliverables.push('Brand mention posts');
      deliverables.push('Story highlights');
    } else {
      deliverables.push('Content creation');
      deliverables.push('Social media promotion');
    }

    return deliverables;
  }

  private calculateTimeline(requirements: CampaignRequirements): {
    start: number;
    end: number;
  } {
    const now = Date.now();
    const duration = requirements.campaignType === 'product_launch' ? 30 : 14; // days
    
    return {
      start: now,
      end: now + duration * 24 * 60 * 60 * 1000,
    };
  }

  private async validatePaymentProof(
    proof: string,
    deal: EndorsementDeal
  ): Promise<boolean> {
    // In production, would validate against blockchain
    return proof.length > 0;
  }
}

// ============================================================================
// 4. Campaign Performance Optimizer Agent
// ============================================================================

export class CampaignPerformanceOptimizerAgent {
  private dkgClient: DKGClient;

  constructor(dkgClient: DKGClient) {
    this.dkgClient = dkgClient;
  }

  /**
   * Optimize campaign performance in real-time
   */
  async optimizeCampaign(
    campaignId: string,
    deals: EndorsementDeal[]
  ): Promise<{
    recommendations: string[];
    optimizations: Array<{
      dealId: string;
      action: string;
      expectedImpact: number;
    }>;
    performance: CampaignPerformance;
  }> {
    // Get current performance
    const performance = await this.getCampaignPerformance(campaignId, deals);

    // Generate optimization recommendations
    const recommendations = this.generateRecommendations(performance);
    
    // Calculate optimizations
    const optimizations = deals.map(deal => ({
      dealId: deal.dealId,
      action: this.suggestAction(deal, performance),
      expectedImpact: this.estimateImpact(deal, performance),
    }));

    return {
      recommendations,
      optimizations,
      performance,
    };
  }

  /**
   * Predict campaign ROI
   */
  async predictROI(
    deals: EndorsementDeal[],
    campaignRequirements: CampaignRequirements
  ): Promise<{
    estimatedROI: number;
    confidence: number;
    factors: Array<{ factor: string; impact: number }>;
  }> {
    const totalPayment = deals.reduce((sum, d) => sum + d.terms.paymentAmount, 0);
    
    // Estimate engagement based on influencer reputation
    const estimatedEngagement = await Promise.all(
      deals.map(async (deal) => {
        const rep = await this.getInfluencerReputation(deal.influencerDid);
        return rep * 10; // Simplified: reputation * 10 = estimated engagement
      })
    );

    const totalEngagement = estimatedEngagement.reduce((sum, e) => sum + e, 0);
    const estimatedROI = (totalEngagement / totalPayment) * 100;

    return {
      estimatedROI,
      confidence: 0.7, // Would be calculated based on historical data
      factors: [
        { factor: 'Total Budget', impact: -totalPayment },
        { factor: 'Estimated Engagement', impact: totalEngagement },
        { factor: 'Influencer Count', impact: deals.length * 50 },
      ],
    };
  }

  private async getCampaignPerformance(
    campaignId: string,
    deals: EndorsementDeal[]
  ): Promise<CampaignPerformance> {
    // Query performance data from DKG
    // Simplified for now
    return {
      campaignId,
      totalEngagement: 0,
      reach: 0,
      conversionRate: 0,
      roi: 0,
      influencerPerformance: deals.map(deal => ({
        influencerDid: deal.influencerDid,
        engagement: 0,
        conversions: 0,
        paymentReceived: deal.terms.paymentAmount,
      })),
    };
  }

  private generateRecommendations(performance: CampaignPerformance): string[] {
    const recommendations: string[] = [];

    if (performance.roi < 100) {
      recommendations.push('Consider reallocating budget to higher-performing influencers');
    }
    if (performance.conversionRate < 0.02) {
      recommendations.push('Optimize call-to-action messaging');
    }
    if (performance.influencerPerformance.some(p => p.engagement === 0)) {
      recommendations.push('Review inactive influencer partnerships');
    }

    return recommendations;
  }

  private suggestAction(
    deal: EndorsementDeal,
    performance: CampaignPerformance
  ): string {
    const dealPerf = performance.influencerPerformance.find(
      p => p.influencerDid === deal.influencerDid
    );

    if (!dealPerf || dealPerf.engagement === 0) {
      return 'Review partnership';
    }

    if (dealPerf.engagement / dealPerf.paymentReceived < 10) {
      return 'Reduce budget allocation';
    }

    if (dealPerf.engagement / dealPerf.paymentReceived > 50) {
      return 'Increase budget allocation';
    }

    return 'Maintain current strategy';
  }

  private estimateImpact(
    deal: EndorsementDeal,
    performance: CampaignPerformance
  ): number {
    // Simplified impact estimation
    return 0.5;
  }

  private async getInfluencerReputation(did: string): Promise<number> {
    // Query from DKG
    return 500; // Default
  }
}

// ============================================================================
// 5. Trust Auditor Agent
// ============================================================================

export class TrustAuditorAgent {
  private dkgClient: DKGClient;
  private polkadotApi: PolkadotApiService;

  constructor(dkgClient: DKGClient, polkadotApi: PolkadotApiService) {
    this.dkgClient = dkgClient;
    this.polkadotApi = polkadotApi;
  }

  /**
   * Continuous reputation verification
   */
  async verifyReputation(
    did: string,
    includeHistory: boolean = false
  ): Promise<{
    currentReputation: number;
    verified: boolean;
    lastUpdated: number;
    history?: Array<{ timestamp: number; reputation: number; source: string }>;
    auditTrail: Array<{ action: string; timestamp: number; verified: boolean }>;
  }> {
    // Get current reputation from multiple sources
    const [dkgRep, chainRep] = await Promise.all([
      this.getDKGReputation(did),
      this.getChainReputation(did),
    ]);

    // Verify consistency
    const verified = Math.abs(dkgRep - chainRep) < 50; // Allow small variance

    const auditTrail = [
      {
        action: 'DKG reputation query',
        timestamp: Date.now(),
        verified: dkgRep > 0,
      },
      {
        action: 'Chain reputation query',
        timestamp: Date.now(),
        verified: chainRep > 0,
      },
      {
        action: 'Cross-source verification',
        timestamp: Date.now(),
        verified,
      },
    ];

    return {
      currentReputation: (dkgRep + chainRep) / 2,
      verified,
      lastUpdated: Date.now(),
      auditTrail,
    };
  }

  /**
   * Detect fraud patterns
   */
  async detectFraudPatterns(
    did: string,
    timeWindow: number = 7 * 24 * 60 * 60 * 1000 // 7 days
  ): Promise<{
    suspicious: boolean;
    patterns: string[];
    confidence: number;
    recommendations: string[];
  }> {
    // Query recent activity
    const activity = await this.queryRecentActivity(did, timeWindow);

    const patterns: string[] = [];
    let suspicious = false;

    // Pattern: Rapid reputation increase
    if (activity.reputationChange > 200) {
      patterns.push('Rapid reputation increase');
      suspicious = true;
    }

    // Pattern: Unusual contribution patterns
    if (activity.contributionsPerDay > 10) {
      patterns.push('Unusually high contribution rate');
      suspicious = true;
    }

    // Pattern: Circular endorsements
    if (activity.circularEndorsements > 0) {
      patterns.push('Circular endorsement patterns detected');
      suspicious = true;
    }

    const confidence = patterns.length > 0 ? 0.7 : 0.2;

    const recommendations = suspicious
      ? ['Flag for manual review', 'Temporarily suspend marketplace access']
      : ['Continue monitoring'];

    return {
      suspicious,
      patterns,
      confidence,
      recommendations,
    };
  }

  /**
   * Generate transparency report for brands
   */
  async generateTransparencyReport(
    campaignId: string,
    deals: EndorsementDeal[]
  ): Promise<{
    campaignId: string;
    totalInfluencers: number;
    averageReputation: number;
    sybilRisk: number;
    verifiedInfluencers: number;
    paymentTransparency: Array<{
      dealId: string;
      paymentAmount: number;
      receiptUAL?: string;
      verified: boolean;
    }>;
    auditTimestamp: number;
  }> {
    const reputations = await Promise.all(
      deals.map(deal => this.getDKGReputation(deal.influencerDid))
    );

    const avgReputation = reputations.reduce((sum, r) => sum + r, 0) / reputations.length;
    const verifiedCount = reputations.filter(r => r > 600).length;

    const paymentTransparency = deals.map(deal => ({
      dealId: deal.dealId,
      paymentAmount: deal.terms.paymentAmount,
      receiptUAL: deal.receiptUAL,
      verified: !!deal.receiptUAL,
    }));

    return {
      campaignId,
      totalInfluencers: deals.length,
      averageReputation: avgReputation,
      sybilRisk: 0.1, // Would calculate from Sybil Detective
      verifiedInfluencers: verifiedCount,
      paymentTransparency,
      auditTimestamp: Date.now(),
    };
  }

  private async getDKGReputation(did: string): Promise<number> {
    try {
      const query = `
        PREFIX dotrep: <https://dotrep.io/ontology/>
        SELECT ?reputation WHERE {
          <${did}> dotrep:reputationScore ?reputation .
        }
      `;
      const results = await this.dkgClient.graphQuery(query, 'SELECT');
      return results.length > 0 ? parseFloat(results[0].reputation) : 0;
    } catch {
      return 0;
    }
  }

  private async getChainReputation(did: string): Promise<number> {
    try {
      const rep = await this.polkadotApi.getReputation(did);
      return rep.overall;
    } catch {
      return 0;
    }
  }

  private async queryRecentActivity(
    did: string,
    timeWindow: number
  ): Promise<{
    reputationChange: number;
    contributionsPerDay: number;
    circularEndorsements: number;
  }> {
    // Simplified - would query from DKG
    return {
      reputationChange: 0,
      contributionsPerDay: 0,
      circularEndorsements: 0,
    };
  }
}

// ============================================================================
// Agent Factory
// ============================================================================

export function createSocialCreditAgents(
  dkgClient: DKGClient,
  polkadotApi: PolkadotApiService
) {
  return {
    trustNavigator: new TrustNavigatorAgent(dkgClient, polkadotApi),
    sybilDetective: new SybilDetectiveAgent(dkgClient),
    contractNegotiator: new SmartContractNegotiatorAgent(polkadotApi, dkgClient),
    campaignOptimizer: new CampaignPerformanceOptimizerAgent(dkgClient),
    trustAuditor: new TrustAuditorAgent(dkgClient, polkadotApi),
  };
}

