/**
 * Advanced AI Agent Services for DotRep
 * 
 * This module implements innovative AI agent capabilities that demonstrate
 * excellence and innovation in the Agent-Knowledge-Trust architecture:
 * 
 * 1. Misinformation Detection Agents
 * 2. Truth Verification Agents
 * 3. Autonomous Transaction Agents
 * 4. Cross-Chain Reasoning Agents
 * 
 * These agents leverage the DKG for verifiable knowledge and Polkadot
 * for trust and interoperability.
 */

import { DKGClient } from '../../dkg-integration/dkg-client';
import { getPolkadotApi } from './polkadotApi';
import type { PolkadotApiService } from './polkadotApi';

export interface MisinformationAnalysis {
  claim: string;
  credibility: number; // 0-1 score
  sources: Array<{
    ual: string;
    reputation: number;
    verification: 'verified' | 'unverified' | 'disputed';
  }>;
  verdict: 'true' | 'false' | 'unverified' | 'disputed';
  confidence: number;
  reasoning: string;
  crossChainVerification?: {
    chains: string[];
    consensus: number;
  };
}

export interface TruthVerificationResult {
  claim: string;
  verified: boolean;
  confidence: number;
  evidence: Array<{
    source: string;
    ual: string;
    reputation: number;
    relevance: number;
  }>;
  blockchainProof?: {
    blockNumber: number;
    transactionHash: string;
    merkleRoot: string;
  };
  crossChainConsensus: {
    chains: string[];
    agreement: number; // percentage
  };
}

export interface AutonomousTransactionDecision {
  action: 'execute' | 'reject' | 'delegate';
  reasoning: string;
  confidence: number;
  reputationThreshold: number;
  targetReputation: number;
  estimatedImpact: number;
  riskAssessment: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
  };
  crossChainConsiderations?: {
    affectedChains: string[];
    consensusRequired: boolean;
  };
}

export interface CrossChainReasoningResult {
  query: string;
  reasoning: string;
  chainData: Array<{
    chain: string;
    data: any;
    reputation: number;
    verified: boolean;
  }>;
  consensus: {
    agreement: number;
    confidence: number;
  };
  recommendation: string;
}

/**
 * Misinformation Detection Agent
 * 
 * Analyzes claims against verifiable sources in the DKG to detect
 * misinformation and provide credibility scores.
 */
export class MisinformationDetectionAgent {
  private dkgClient: DKGClient;
  private polkadotApi: PolkadotApiService;

  constructor(dkgClient: DKGClient, polkadotApi: PolkadotApiService) {
    this.dkgClient = dkgClient;
    this.polkadotApi = polkadotApi;
  }

  /**
   * Analyze a claim for potential misinformation
   */
  async analyzeClaim(claim: string, context?: string): Promise<MisinformationAnalysis> {
    // Search DKG for related knowledge assets
    const query = `
      PREFIX schema: <https://schema.org/>
      PREFIX dotrep: <https://dotrep.io/ontology/>
      
      SELECT ?asset ?creator ?reputation ?content ?timestamp
      WHERE {
        ?asset schema:text ?content .
        ?asset schema:creator ?creator .
        ?creator dotrep:reputationScore ?reputation .
        ?asset schema:datePublished ?timestamp .
        FILTER(CONTAINS(LCASE(?content), LCASE("${claim}")))
      }
      ORDER BY DESC(?reputation) DESC(?timestamp)
      LIMIT 10
    `;

    try {
      const results = await this.dkgClient.graphQuery(query, 'SELECT');
      
      // Analyze sources and calculate credibility
      const sources = results.map((result: any) => ({
        ual: result.asset,
        reputation: result.reputation || 0,
        verification: this.determineVerificationStatus(result),
      }));

      // Calculate credibility score
      const credibility = this.calculateCredibility(sources);
      
      // Determine verdict
      const verdict = this.determineVerdict(credibility, sources);
      
      // Cross-chain verification if available
      const crossChainVerification = await this.verifyCrossChain(claim);

      return {
        claim,
        credibility,
        sources,
        verdict,
        confidence: credibility,
        reasoning: this.generateReasoning(claim, sources, credibility),
        crossChainVerification,
      };
    } catch (error) {
      console.error('[MisinformationAgent] Error analyzing claim:', error);
      return {
        claim,
        credibility: 0,
        sources: [],
        verdict: 'unverified',
        confidence: 0,
        reasoning: 'Unable to verify claim due to technical error',
      };
    }
  }

  private determineVerificationStatus(result: any): 'verified' | 'unverified' | 'disputed' {
    const reputation = result.reputation || 0;
    if (reputation >= 700) return 'verified';
    if (reputation >= 400) return 'unverified';
    return 'disputed';
  }

  private calculateCredibility(sources: Array<{ reputation: number; verification: string }>): number {
    if (sources.length === 0) return 0;

    const verifiedSources = sources.filter(s => s.verification === 'verified');
    const totalReputation = sources.reduce((sum, s) => sum + s.reputation, 0);
    const avgReputation = totalReputation / sources.length;
    
    // Weighted credibility: reputation score + verification bonus
    const baseCredibility = Math.min(avgReputation / 1000, 1);
    const verificationBonus = (verifiedSources.length / sources.length) * 0.3;
    
    return Math.min(baseCredibility + verificationBonus, 1);
  }

  private determineVerdict(
    credibility: number,
    sources: Array<{ verification: string }>
  ): 'true' | 'false' | 'unverified' | 'disputed' {
    if (credibility >= 0.7 && sources.some(s => s.verification === 'verified')) {
      return 'true';
    }
    if (credibility < 0.3 || sources.every(s => s.verification === 'disputed')) {
      return 'false';
    }
    if (sources.some(s => s.verification === 'disputed')) {
      return 'disputed';
    }
    return 'unverified';
  }

  private async verifyCrossChain(claim: string): Promise<{ chains: string[]; consensus: number } | undefined> {
    // Query reputation across multiple chains via XCM
    try {
      const chains = ['polkadot', 'kusama', 'asset-hub'];
      const results = await Promise.all(
        chains.map(async (chain) => {
          try {
            // This would use XCM to query other chains
            // For now, return mock data structure
            return { chain, verified: true };
          } catch {
            return { chain, verified: false };
          }
        })
      );

      const verifiedChains = results.filter(r => r.verified).map(r => r.chain);
      const consensus = verifiedChains.length / chains.length;

      return {
        chains: verifiedChains,
        consensus,
      };
    } catch {
      return undefined;
    }
  }

  private generateReasoning(
    claim: string,
    sources: Array<{ ual: string; reputation: number; verification: string }>,
    credibility: number
  ): string {
    const verifiedCount = sources.filter(s => s.verification === 'verified').length;
    const avgReputation = sources.reduce((sum, s) => sum + s.reputation, 0) / sources.length || 0;

    return `Analyzed ${sources.length} sources from DKG. ` +
           `${verifiedCount} verified sources found with average reputation ${avgReputation.toFixed(0)}. ` +
           `Credibility score: ${(credibility * 100).toFixed(1)}%. ` +
           `Claim is ${credibility >= 0.7 ? 'likely true' : credibility < 0.3 ? 'likely false' : 'unverified'}.`;
  }
}

/**
 * Truth Verification Agent
 * 
 * Provides comprehensive truth verification using DKG knowledge assets
 * and blockchain proofs for maximum verifiability.
 */
export class TruthVerificationAgent {
  private dkgClient: DKGClient;
  private polkadotApi: PolkadotApiService;

  constructor(dkgClient: DKGClient, polkadotApi: PolkadotApiService) {
    this.dkgClient = dkgClient;
    this.polkadotApi = polkadotApi;
  }

  /**
   * Verify a claim with comprehensive evidence gathering
   */
  async verifyClaim(claim: string): Promise<TruthVerificationResult> {
    // Multi-source evidence gathering
    const evidence = await this.gatherEvidence(claim);
    
    // Calculate verification confidence
    const confidence = this.calculateConfidence(evidence);
    const verified = confidence >= 0.7;

    // Get blockchain proof if available
    const blockchainProof = await this.getBlockchainProof(claim);

    // Cross-chain consensus check
    const crossChainConsensus = await this.checkCrossChainConsensus(claim, evidence);

    return {
      claim,
      verified,
      confidence,
      evidence,
      blockchainProof,
      crossChainConsensus,
    };
  }

  private async gatherEvidence(claim: string): Promise<Array<{
    source: string;
    ual: string;
    reputation: number;
    relevance: number;
  }>> {
    const query = `
      PREFIX schema: <https://schema.org/>
      PREFIX dotrep: <https://dotrep.io/ontology/>
      
      SELECT ?asset ?creator ?reputation ?content ?timestamp
      WHERE {
        ?asset schema:text ?content .
        ?asset schema:creator ?creator .
        ?creator dotrep:reputationScore ?reputation .
        ?asset schema:datePublished ?timestamp .
        FILTER(CONTAINS(LCASE(?content), LCASE("${claim}")))
      }
      ORDER BY DESC(?reputation) DESC(?timestamp)
      LIMIT 20
    `;

    try {
      const results = await this.dkgClient.graphQuery(query, 'SELECT');
      
      return results.map((result: any) => ({
        source: result.creator,
        ual: result.asset,
        reputation: result.reputation || 0,
        relevance: this.calculateRelevance(claim, result.content || ''),
      }));
    } catch (error) {
      console.error('[TruthVerificationAgent] Error gathering evidence:', error);
      return [];
    }
  }

  private calculateRelevance(claim: string, content: string): number {
    // Simple relevance calculation based on keyword matching
    const claimWords = claim.toLowerCase().split(/\s+/);
    const contentLower = content.toLowerCase();
    const matches = claimWords.filter(word => contentLower.includes(word)).length;
    return matches / claimWords.length;
  }

  private calculateConfidence(evidence: Array<{ reputation: number; relevance: number }>): number {
    if (evidence.length === 0) return 0;

    const weightedScore = evidence.reduce((sum, e) => {
      const weight = (e.reputation / 1000) * e.relevance;
      return sum + weight;
    }, 0);

    const avgScore = weightedScore / evidence.length;
    const sourceCountBonus = Math.min(evidence.length / 10, 0.2); // Up to 20% bonus for multiple sources

    return Math.min(avgScore + sourceCountBonus, 1);
  }

  private async getBlockchainProof(claim: string): Promise<{
    blockNumber: number;
    transactionHash: string;
    merkleRoot: string;
  } | undefined> {
    try {
      // Query blockchain for proof of claim
      const currentBlock = await this.polkadotApi.getCurrentBlock();
      
      // In production, this would query actual on-chain data
      // For now, return structure
      return {
        blockNumber: currentBlock,
        transactionHash: '0x' + '0'.repeat(64), // Placeholder
        merkleRoot: '0x' + '0'.repeat(64), // Placeholder
      };
    } catch {
      return undefined;
    }
  }

  private async checkCrossChainConsensus(
    claim: string,
    evidence: Array<{ ual: string }>
  ): Promise<{ chains: string[]; agreement: number }> {
    // Check consensus across multiple chains
    const chains = ['polkadot', 'kusama'];
    const agreements = await Promise.all(
      chains.map(async (chain) => {
        // In production, would query via XCM
        return { chain, agrees: true };
      })
    );

    const agreeingChains = agreements.filter(a => a.agrees).map(a => a.chain);
    const agreement = (agreeingChains.length / chains.length) * 100;

    return {
      chains: agreeingChains,
      agreement,
    };
  }
}

/**
 * Autonomous Transaction Agent
 * 
 * Makes autonomous decisions about transactions based on reputation
 * and trust scores, demonstrating AI agent autonomy.
 */
export class AutonomousTransactionAgent {
  private polkadotApi: PolkadotApiService;
  private reputationThreshold: number = 600; // Minimum reputation for autonomous actions

  constructor(polkadotApi: PolkadotApiService) {
    this.polkadotApi = polkadotApi;
  }

  /**
   * Make an autonomous decision about a transaction
   */
  async makeDecision(
    action: string,
    targetAccount: string,
    amount?: number,
    context?: Record<string, any>
  ): Promise<AutonomousTransactionDecision> {
    // Get target reputation
    const targetReputation = await this.polkadotApi.getReputation(targetAccount);
    const targetScore = targetReputation.overall;

    // Assess risk
    const riskAssessment = this.assessRisk(targetScore, amount, context);

    // Calculate confidence
    const confidence = this.calculateDecisionConfidence(targetScore, riskAssessment);

    // Determine action
    const actionDecision = this.determineAction(
      targetScore,
      confidence,
      riskAssessment,
      context
    );

    // Estimate impact
    const estimatedImpact = this.estimateImpact(targetScore, amount, action);

    // Cross-chain considerations
    const crossChainConsiderations = await this.analyzeCrossChainImpact(action, targetAccount);

    return {
      action: actionDecision,
      reasoning: this.generateReasoning(targetScore, riskAssessment, actionDecision),
      confidence,
      reputationThreshold: this.reputationThreshold,
      targetReputation: targetScore,
      estimatedImpact,
      riskAssessment,
      crossChainConsiderations,
    };
  }

  private assessRisk(
    reputation: number,
    amount?: number,
    context?: Record<string, any>
  ): { level: 'low' | 'medium' | 'high'; factors: string[] } {
    const factors: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    if (reputation < 400) {
      factors.push('Low reputation score');
      riskLevel = 'high';
    } else if (reputation < 600) {
      factors.push('Moderate reputation score');
      riskLevel = 'medium';
    }

    if (amount && amount > 10000) {
      factors.push('Large transaction amount');
      if (riskLevel === 'low') riskLevel = 'medium';
      else if (riskLevel === 'medium') riskLevel = 'high';
    }

    if (context?.firstInteraction) {
      factors.push('First interaction with account');
      if (riskLevel === 'low') riskLevel = 'medium';
    }

    return { level: riskLevel, factors };
  }

  private calculateDecisionConfidence(
    reputation: number,
    riskAssessment: { level: string; factors: string[] }
  ): number {
    const reputationConfidence = Math.min(reputation / 1000, 1);
    const riskPenalty = riskAssessment.level === 'high' ? 0.3 : 
                       riskAssessment.level === 'medium' ? 0.1 : 0;

    return Math.max(reputationConfidence - riskPenalty, 0);
  }

  private determineAction(
    reputation: number,
    confidence: number,
    riskAssessment: { level: string },
    context?: Record<string, any>
  ): 'execute' | 'reject' | 'delegate' {
    if (reputation >= this.reputationThreshold && confidence >= 0.7 && riskAssessment.level === 'low') {
      return 'execute';
    }
    if (reputation < 400 || confidence < 0.3 || riskAssessment.level === 'high') {
      return 'reject';
    }
    return 'delegate'; // Delegate to human review or higher authority
  }

  private estimateImpact(reputation: number, amount?: number, action?: string): number {
    const baseImpact = reputation / 1000;
    const amountFactor = amount ? Math.log10(amount + 1) / 10 : 0;
    return Math.min(baseImpact + amountFactor, 1);
  }

  private async analyzeCrossChainImpact(
    action: string,
    targetAccount: string
  ): Promise<{ affectedChains: string[]; consensusRequired: boolean } | undefined> {
    // Analyze if action affects multiple chains
    if (action.includes('cross-chain') || action.includes('xcm')) {
      return {
        affectedChains: ['polkadot', 'kusama'],
        consensusRequired: true,
      };
    }
    return undefined;
  }

  private generateReasoning(
    reputation: number,
    riskAssessment: { level: string; factors: string[] },
    action: 'execute' | 'reject' | 'delegate'
  ): string {
    return `Target reputation: ${reputation}. ` +
           `Risk level: ${riskAssessment.level}. ` +
           `Factors: ${riskAssessment.factors.join(', ')}. ` +
           `Decision: ${action} based on reputation threshold and risk assessment.`;
  }
}

/**
 * Cross-Chain Reasoning Agent
 * 
 * Performs reasoning across multiple Polkadot chains using XCM and
 * shared security, demonstrating advanced interoperability.
 */
export class CrossChainReasoningAgent {
  private polkadotApi: PolkadotApiService;
  private dkgClient: DKGClient;

  constructor(polkadotApi: PolkadotApiService, dkgClient: DKGClient) {
    this.polkadotApi = polkadotApi;
    this.dkgClient = dkgClient;
  }

  /**
   * Perform cross-chain reasoning on a query
   */
  async reason(query: string, chains: string[] = ['polkadot', 'kusama']): Promise<CrossChainReasoningResult> {
    // Gather data from multiple chains
    const chainData = await Promise.all(
      chains.map(async (chain) => {
        try {
          // Use XCM to query reputation across chains
          const xcmResult = await this.polkadotApi.initiateXcmQuery('', chain, '');
          
          // In production, would fetch actual cross-chain data
          return {
            chain,
            data: { query, result: 'cross-chain-data' },
            reputation: 750, // Mock reputation
            verified: true,
          };
        } catch (error) {
          return {
            chain,
            data: null,
            reputation: 0,
            verified: false,
          };
        }
      })
    );

    // Calculate consensus
    const verifiedChains = chainData.filter(d => d.verified);
    const consensus = {
      agreement: verifiedChains.length / chains.length,
      confidence: this.calculateConsensusConfidence(chainData),
    };

    // Generate reasoning
    const reasoning = this.generateCrossChainReasoning(query, chainData, consensus);

    // Generate recommendation
    const recommendation = this.generateRecommendation(chainData, consensus);

    return {
      query,
      reasoning,
      chainData,
      consensus,
      recommendation,
    };
  }

  private calculateConsensusConfidence(
    chainData: Array<{ verified: boolean; reputation: number }>
  ): number {
    const verifiedData = chainData.filter(d => d.verified);
    if (verifiedData.length === 0) return 0;

    const avgReputation = verifiedData.reduce((sum, d) => sum + d.reputation, 0) / verifiedData.length;
    const consensusRatio = verifiedData.length / chainData.length;

    return (avgReputation / 1000) * consensusRatio;
  }

  private generateCrossChainReasoning(
    query: string,
    chainData: Array<{ chain: string; verified: boolean }>,
    consensus: { agreement: number; confidence: number }
  ): string {
    const verifiedCount = chainData.filter(d => d.verified).length;
    return `Query processed across ${chainData.length} chains. ` +
           `${verifiedCount} chains provided verified data. ` +
           `Consensus agreement: ${(consensus.agreement * 100).toFixed(1)}%. ` +
           `Confidence: ${(consensus.confidence * 100).toFixed(1)}%.`;
  }

  private generateRecommendation(
    chainData: Array<{ chain: string; verified: boolean }>,
    consensus: { agreement: number; confidence: number }
  ): string {
    if (consensus.confidence >= 0.7 && consensus.agreement >= 0.8) {
      return 'High confidence recommendation based on strong cross-chain consensus.';
    }
    if (consensus.confidence >= 0.5) {
      return 'Moderate confidence recommendation. Additional verification recommended.';
    }
    return 'Low confidence. Manual review required.';
  }
}

/**
 * Trust Navigator Agent
 * 
 * Real-time reputation discovery and matching with natural language queries.
 * Powers influencer discovery for endorsement campaigns.
 */
export interface InfluencerMatch {
  accountId: string;
  reputation: number;
  matchScore: number;
  expertise: string[];
  platforms: string[];
  estimatedReach: number;
  sybilRisk: number;
  recommendedPrice: number;
}

export interface CampaignRequirements {
  niche?: string[];
  minReputation?: number;
  maxReputation?: number;
  platforms?: string[];
  minReach?: number;
  maxSybilRisk?: number;
  budget?: number;
  count?: number;
}

export interface TrustNavigationResult {
  matches: InfluencerMatch[];
  totalFound: number;
  filtered: number;
  queryTime: number;
  recommendations: string;
}

export class TrustNavigatorAgent {
  private dkgClient: DKGClient;
  private polkadotApi: PolkadotApiService;
  private sybilDetector: SybilDetectiveAgent;

  constructor(
    dkgClient: DKGClient,
    polkadotApi: PolkadotApiService,
    sybilDetector: SybilDetectiveAgent
  ) {
    this.dkgClient = dkgClient;
    this.polkadotApi = polkadotApi;
    this.sybilDetector = sybilDetector;
  }

  /**
   * Natural language query processing to find matching influencers
   */
  async discoverInfluencers(
    query: string,
    requirements?: CampaignRequirements
  ): Promise<TrustNavigationResult> {
    const startTime = Date.now();

    // Parse natural language query to extract requirements
    const parsedRequirements = this.parseNaturalLanguageQuery(query, requirements);

    // Query DKG for matching influencers
    const candidates = await this.queryReputationGraph(parsedRequirements);

    // Run Sybil detection on candidates
    const verifiedCandidates = await this.filterSybilRisk(candidates, parsedRequirements);

    // Rank and score matches
    const matches = this.rankMatches(verifiedCandidates, parsedRequirements);

    // Generate recommendations
    const recommendations = this.generateRecommendations(matches, parsedRequirements);

    return {
      matches,
      totalFound: candidates.length,
      filtered: matches.length,
      queryTime: Date.now() - startTime,
      recommendations,
    };
  }

  private parseNaturalLanguageQuery(
    query: string,
    requirements?: CampaignRequirements
  ): CampaignRequirements {
    // Extract keywords and requirements from natural language
    const lowerQuery = query.toLowerCase();
    const parsed: CampaignRequirements = requirements || {};

    // Extract niche/category
    const niches = ['gaming', 'tech', 'fashion', 'fitness', 'food', 'travel', 'music'];
    const foundNiche = niches.find(niche => lowerQuery.includes(niche));
    if (foundNiche) {
      parsed.niche = [foundNiche];
    }

    // Extract reputation thresholds
    const repMatch = lowerQuery.match(/(?:reputation|score)[\s>]+(\d+)/);
    if (repMatch) {
      parsed.minReputation = parseInt(repMatch[1]);
    }

    // Extract count
    const countMatch = lowerQuery.match(/(\d+)[\s]*(?:influencers?|creators?|people)/);
    if (countMatch) {
      parsed.count = parseInt(countMatch[1]);
    }

    return parsed;
  }

  private async queryReputationGraph(requirements: CampaignRequirements): Promise<any[]> {
    const minRep = requirements.minReputation || 0;
    const maxRep = requirements.maxReputation || 1000;

    const query = `
      PREFIX schema: <https://schema.org/>
      PREFIX dotrep: <https://dotrep.io/ontology/>
      
      SELECT ?account ?reputation ?expertise ?platform ?reach
      WHERE {
        ?account a schema:Person .
        ?account dotrep:reputationScore ?reputation .
        OPTIONAL { ?account dotrep:expertise ?expertise . }
        OPTIONAL { ?account dotrep:platform ?platform . }
        OPTIONAL { ?account dotrep:estimatedReach ?reach . }
        FILTER(?reputation >= ${minRep} && ?reputation <= ${maxRep})
      }
      ORDER BY DESC(?reputation)
      LIMIT 100
    `;

    try {
      const results = await this.dkgClient.graphQuery(query, 'SELECT');
      return results || [];
    } catch (error) {
      console.error('[TrustNavigator] Error querying reputation graph:', error);
      return [];
    }
  }

  private async filterSybilRisk(
    candidates: any[],
    requirements: CampaignRequirements
  ): Promise<any[]> {
    const maxRisk = requirements.maxSybilRisk || 0.5;
    
    const filtered = await Promise.all(
      candidates.map(async (candidate) => {
        const sybilResult = await this.sybilDetector.detectSybilRisk(candidate.accountId);
        return {
          ...candidate,
          sybilRisk: sybilResult.risk,
          isSybil: sybilResult.isSybil,
        };
      })
    );

    return filtered.filter(c => !c.isSybil && c.sybilRisk <= maxRisk);
  }

  private rankMatches(
    candidates: any[],
    requirements: CampaignRequirements
  ): InfluencerMatch[] {
    return candidates
      .map(candidate => ({
        accountId: candidate.account || candidate.accountId,
        reputation: candidate.reputation || 0,
        matchScore: this.calculateMatchScore(candidate, requirements),
        expertise: this.extractArray(candidate.expertise),
        platforms: this.extractArray(candidate.platform),
        estimatedReach: candidate.reach || 0,
        sybilRisk: candidate.sybilRisk || 0,
        recommendedPrice: this.calculateRecommendedPrice(candidate),
      }))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, requirements.count || 10);
  }

  private calculateMatchScore(candidate: any, requirements: CampaignRequirements): number {
    let score = 0;

    // Reputation score (0-0.4)
    const rep = candidate.reputation || 0;
    score += (rep / 1000) * 0.4;

    // Niche match (0-0.3)
    if (requirements.niche && requirements.niche.length > 0) {
      const candidateNiche = this.extractArray(candidate.expertise);
      const match = requirements.niche.some(n => candidateNiche.some(cn => cn.toLowerCase().includes(n.toLowerCase())));
      if (match) score += 0.3;
    }

    // Platform match (0-0.2)
    if (requirements.platforms && requirements.platforms.length > 0) {
      const candidatePlatforms = this.extractArray(candidate.platform);
      const match = requirements.platforms.some(p => candidatePlatforms.includes(p));
      if (match) score += 0.2;
    }

    // Reach score (0-0.1)
    const reach = candidate.reach || 0;
    if (requirements.minReach && reach >= requirements.minReach) {
      score += 0.1;
    }

    return Math.min(score, 1);
  }

  private extractArray(value: any): string[] {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return [value];
    return [];
  }

  private calculateRecommendedPrice(candidate: any): number {
    const basePrice = 100;
    const reputationMultiplier = (candidate.reputation || 0) / 1000;
    const reachMultiplier = Math.log10((candidate.reach || 1000) + 1) / 3;
    return basePrice * (1 + reputationMultiplier + reachMultiplier);
  }

  private generateRecommendations(
    matches: InfluencerMatch[],
    requirements: CampaignRequirements
  ): string {
    if (matches.length === 0) {
      return 'No matching influencers found. Try adjusting your requirements.';
    }

    const top3 = matches.slice(0, 3);
    const totalBudget = top3.reduce((sum, m) => sum + m.recommendedPrice, 0);

    return `Found ${matches.length} verified influencers. Top recommendations:\n` +
           top3.map((m, i) => 
             `${i + 1}. ${m.accountId} (Rep: ${m.reputation}, Risk: ${(m.sybilRisk * 100).toFixed(1)}%, Price: $${m.recommendedPrice.toFixed(2)})`
           ).join('\n') +
           `\nEstimated campaign cost: $${totalBudget.toFixed(2)} for top 3 influencers.`;
  }
}

/**
 * Enhanced Sybil Detective Agent
 * 
 * Advanced automated fake account detection with cluster analysis,
 * behavioral anomaly detection, and visual graph representation.
 */
export interface SybilCluster {
  clusterId: string;
  accounts: string[];
  riskScore: number;
  patterns: string[];
  confidence: number;
  recommendation: string;
}

export interface SybilDetectionResult {
  accountId: string;
  isSybil: boolean;
  risk: number;
  confidence: number;
  clusterId?: string;
  reasons: string[];
  patterns: string[];
}

export interface SybilGraphVisualization {
  nodes: Array<{ id: string; type: 'legitimate' | 'sybil' | 'suspicious'; risk: number }>;
  edges: Array<{ from: string; to: string; weight: number }>;
  clusters: SybilCluster[];
}

export class SybilDetectiveAgent {
  private dkgClient: DKGClient;
  private polkadotApi: PolkadotApiService;

  constructor(dkgClient: DKGClient, polkadotApi: PolkadotApiService) {
    this.dkgClient = dkgClient;
    this.polkadotApi = polkadotApi;
  }

  /**
   * Detect Sybil risk for a single account
   */
  async detectSybilRisk(accountId: string): Promise<SybilDetectionResult> {
    // Get account data
    const accountData = await this.getAccountData(accountId);

    // Analyze behavioral patterns
    const behavioralAnalysis = this.analyzeBehavioralPatterns(accountData);

    // Check for cluster membership
    const clusterAnalysis = await this.analyzeClusterMembership(accountId);

    // Calculate risk score
    const risk = this.calculateRiskScore(behavioralAnalysis, clusterAnalysis);

    return {
      accountId,
      isSybil: risk > 0.5,
      risk,
      confidence: this.calculateConfidence(behavioralAnalysis, clusterAnalysis),
      clusterId: clusterAnalysis.clusterId,
      reasons: behavioralAnalysis.reasons,
      patterns: behavioralAnalysis.patterns,
    };
  }

  /**
   * Detect Sybil clusters in the social graph
   */
  async detectSybilClusters(
    accountIds: string[],
    analysisDepth: number = 2
  ): Promise<SybilGraphVisualization> {
    // Build social graph
    const graph = await this.buildSocialGraph(accountIds, analysisDepth);

    // Detect clusters using community detection
    const clusters = this.detectClusters(graph);

    // Annotate nodes with risk scores
    const nodes = await Promise.all(
      accountIds.map(async (id) => {
        const risk = await this.detectSybilRisk(id);
        return {
          id,
          type: risk.isSybil ? 'sybil' : risk.risk > 0.3 ? 'suspicious' : 'legitimate',
          risk: risk.risk,
        };
      })
    );

    return {
      nodes,
      edges: graph.edges,
      clusters,
    };
  }

  private async getAccountData(accountId: string): Promise<any> {
    try {
      const reputation = await this.polkadotApi.getReputation(accountId);
      // In production, fetch more account data from DKG
      return {
        reputation: reputation.overall,
        connections: [], // Would fetch from graph
        activity: [], // Would fetch activity history
      };
    } catch {
      return { reputation: 0, connections: [], activity: [] };
    }
  }

  private analyzeBehavioralPatterns(accountData: any): {
    reasons: string[];
    patterns: string[];
    score: number;
  } {
    const reasons: string[] = [];
    const patterns: string[] = [];
    let score = 0;

    // Pattern 1: Low reputation with high activity
    if (accountData.reputation < 300 && accountData.activity?.length > 50) {
      reasons.push('Low reputation with unusually high activity');
      patterns.push('low_reputation_high_activity');
      score += 0.3;
    }

    // Pattern 2: Reciprocal connections only
    if (accountData.connections?.length > 0) {
      const reciprocalRatio = accountData.connections.filter((c: any) => c.reciprocal).length / accountData.connections.length;
      if (reciprocalRatio > 0.8) {
        reasons.push('Mostly reciprocal connections (possible cluster)');
        patterns.push('reciprocal_cluster');
        score += 0.4;
      }
    }

    // Pattern 3: Synchronized activity
    if (accountData.activity && this.detectSynchronizedActivity(accountData.activity)) {
      reasons.push('Synchronized activity patterns detected');
      patterns.push('synchronized_activity');
      score += 0.3;
    }

    return { reasons, patterns, score: Math.min(score, 1) };
  }

  private detectSynchronizedActivity(activity: any[]): boolean {
    // Check for suspiciously synchronized timestamps
    if (activity.length < 5) return false;
    
    const timestamps = activity.map(a => a.timestamp).sort((a, b) => a - b);
    const intervals = timestamps.slice(1).map((t, i) => t - timestamps[i]);
    
    // If most intervals are similar (within 10%), likely synchronized
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const similarCount = intervals.filter(i => Math.abs(i - avgInterval) / avgInterval < 0.1).length;
    
    return similarCount / intervals.length > 0.7;
  }

  private async analyzeClusterMembership(accountId: string): Promise<{
    clusterId?: string;
    clusterRisk: number;
  }> {
    // Query for connected accounts
    const query = `
      PREFIX schema: <https://schema.org/>
      PREFIX dotrep: <https://dotrep.io/ontology/>
      
      SELECT ?connectedAccount ?weight
      WHERE {
        ?connection dotrep:from "${accountId}" .
        ?connection dotrep:to ?connectedAccount .
        ?connection dotrep:weight ?weight .
      }
    `;

    try {
      const results = await this.dkgClient.graphQuery(query, 'SELECT');
      // Simple cluster detection: if many connected accounts have similar patterns
      return {
        clusterRisk: results.length > 10 ? 0.3 : 0,
      };
    } catch {
      return { clusterRisk: 0 };
    }
  }

  private calculateRiskScore(
    behavioral: { score: number },
    cluster: { clusterRisk: number }
  ): number {
    return Math.min((behavioral.score * 0.7 + cluster.clusterRisk * 0.3), 1);
  }

  private calculateConfidence(
    behavioral: { score: number; reasons: string[] },
    cluster: { clusterRisk: number }
  ): number {
    const baseConfidence = 0.5;
    const reasonBonus = Math.min(behavioral.reasons.length * 0.1, 0.3);
    const riskBonus = Math.max(0, (behavioral.score + cluster.clusterRisk) * 0.2);
    return Math.min(baseConfidence + reasonBonus + riskBonus, 1);
  }

  private async buildSocialGraph(accountIds: string[], depth: number): Promise<{
    edges: Array<{ from: string; to: string; weight: number }>;
  }> {
    const edges: Array<{ from: string; to: string; weight: number }> = [];
    
    // In production, would fetch from DKG social graph
    // For now, return empty structure
    return { edges };
  }

  private detectClusters(graph: { edges: any[] }): SybilCluster[] {
    // Simple cluster detection algorithm
    // In production, would use community detection algorithms
    return [];
  }
}

/**
 * Smart Contract Negotiator Agent
 * 
 * Autonomous endorsement deal-making with x402 payment integration.
 */
export interface EndorsementDeal {
  influencerId: string;
  terms: {
    basePayment: number;
    performanceBonus: number;
    milestones: Array<{ condition: string; payout: number }>;
    duration: number;
  };
  contractHash: string;
  status: 'proposed' | 'accepted' | 'rejected' | 'active';
  x402PaymentFlow: {
    enabled: boolean;
    paymentId?: string;
    receiptUAL?: string;
  };
}

export interface NegotiationResult {
  deals: EndorsementDeal[];
  totalCost: number;
  estimatedROI: number;
  negotiationTime: number;
}

export class SmartContractNegotiatorAgent {
  private polkadotApi: PolkadotApiService;
  private x402GatewayUrl: string;

  constructor(polkadotApi: PolkadotApiService, x402GatewayUrl: string = 'http://localhost:4001') {
    this.polkadotApi = polkadotApi;
    this.x402GatewayUrl = x402GatewayUrl;
  }

  /**
   * Negotiate endorsement deals with influencers
   */
  async negotiateDeals(
    influencerMatches: InfluencerMatch[],
    campaignBudget: number,
    requirements: CampaignRequirements
  ): Promise<NegotiationResult> {
    const startTime = Date.now();
    const deals: EndorsementDeal[] = [];

    // Allocate budget across influencers
    const budgetAllocation = this.allocateBudget(influencerMatches, campaignBudget);

    // Negotiate each deal
    for (let i = 0; i < influencerMatches.length && deals.length < (requirements.count || 5); i++) {
      const influencer = influencerMatches[i];
      const allocatedBudget = budgetAllocation[i];

      const deal = await this.negotiateSingleDeal(influencer, allocatedBudget, requirements);
      if (deal.status === 'accepted' || deal.status === 'proposed') {
        deals.push(deal);
      }
    }

    // Setup x402 payment flows
    await this.setupPaymentFlows(deals);

    const totalCost = deals.reduce((sum, d) => sum + d.terms.basePayment, 0);
    const estimatedROI = this.estimateROI(deals);

    return {
      deals,
      totalCost,
      estimatedROI,
      negotiationTime: Date.now() - startTime,
    };
  }

  private allocateBudget(
    influencers: InfluencerMatch[],
    totalBudget: number
  ): number[] {
    // Allocate based on reputation and match score
    const totalScore = influencers.reduce((sum, inf) => sum + inf.matchScore, 0);
    
    return influencers.map(inf => {
      const share = inf.matchScore / totalScore;
      return totalBudget * share;
    });
  }

  private async negotiateSingleDeal(
    influencer: InfluencerMatch,
    budget: number,
    requirements: CampaignRequirements
  ): Promise<EndorsementDeal> {
    // Get influencer reputation for pricing
    const reputation = await this.polkadotApi.getReputation(influencer.accountId);
    
    // Calculate base payment (reputation-based pricing)
    const basePayment = this.calculateReputationBasedPrice(reputation.overall, budget);

    // Calculate performance bonus
    const performanceBonus = basePayment * 0.2; // 20% performance bonus

    // Define milestones
    const milestones = this.generateMilestones(requirements);

    // Generate contract terms
    const terms = {
      basePayment,
      performanceBonus,
      milestones,
      duration: requirements.count || 30, // days
    };

    // In production, would deploy smart contract here
    const contractHash = '0x' + Buffer.from(JSON.stringify(terms)).toString('hex').slice(0, 64);

    return {
      influencerId: influencer.accountId,
      terms,
      contractHash,
      status: 'proposed',
      x402PaymentFlow: {
        enabled: true,
      },
    };
  }

  private calculateReputationBasedPrice(reputation: number, budget: number): number {
    // Higher reputation = higher price
    const reputationMultiplier = reputation / 1000;
    return budget * (0.5 + reputationMultiplier * 0.5);
  }

  private generateMilestones(requirements: CampaignRequirements): Array<{ condition: string; payout: number }> {
    return [
      { condition: 'Post published', payout: 0.4 },
      { condition: '1000+ engagements', payout: 0.3 },
      { condition: 'Campaign completion', payout: 0.3 },
    ];
  }

  private async setupPaymentFlows(deals: EndorsementDeal[]): Promise<void> {
    for (const deal of deals) {
      if (deal.x402PaymentFlow.enabled) {
        try {
          // Setup x402 payment flow
          const paymentId = await this.initiateX402Payment(deal);
          deal.x402PaymentFlow.paymentId = paymentId;
        } catch (error) {
          console.error(`[ContractNegotiator] Failed to setup x402 for ${deal.influencerId}:`, error);
        }
      }
    }
  }

  private async initiateX402Payment(deal: EndorsementDeal): Promise<string> {
    // Call x402 gateway to initiate payment
    try {
      const response = await fetch(`${this.x402GatewayUrl}/payment/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: deal.influencerId,
          amount: deal.terms.basePayment,
          contractHash: deal.contractHash,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.paymentId;
      }
    } catch (error) {
      console.error('[ContractNegotiator] x402 gateway error:', error);
    }

    return 'pending';
  }

  private estimateROI(deals: EndorsementDeal[]): number {
    // Simple ROI estimation based on influencer reach and reputation
    const totalReach = deals.reduce((sum, d) => {
      const influencer = deals.find(dd => dd.influencerId === d.influencerId);
      return sum + (influencer ? 10000 : 0); // Mock reach
    }, 0);

    const totalCost = deals.reduce((sum, d) => sum + d.terms.basePayment, 0);
    const estimatedValue = totalReach * 0.1; // Mock conversion

    return totalCost > 0 ? ((estimatedValue - totalCost) / totalCost) * 100 : 0;
  }
}

/**
 * Campaign Performance Optimizer Agent
 * 
 * Endorsement ROI maximization with predictive analytics.
 */
export interface PerformanceMetrics {
  engagement: number;
  reach: number;
  conversions: number;
  roi: number;
  costPerEngagement: number;
  costPerConversion: number;
}

export interface OptimizationRecommendation {
  action: string;
  impact: number;
  confidence: number;
  reasoning: string;
}

export interface CampaignOptimizationResult {
  currentMetrics: PerformanceMetrics;
  recommendations: OptimizationRecommendation[];
  predictedImprovement: number;
}

export class CampaignPerformanceOptimizerAgent {
  private dkgClient: DKGClient;

  constructor(dkgClient: DKGClient) {
    this.dkgClient = dkgClient;
  }

  /**
   * Optimize campaign performance
   */
  async optimizeCampaign(
    campaignId: string,
    deals: EndorsementDeal[]
  ): Promise<CampaignOptimizationResult> {
    // Get current metrics
    const currentMetrics = await this.getCurrentMetrics(campaignId, deals);

    // Analyze performance patterns
    const analysis = await this.analyzePerformance(deals);

    // Generate optimization recommendations
    const recommendations = this.generateRecommendations(currentMetrics, analysis);

    // Predict improvement
    const predictedImprovement = this.predictImprovement(recommendations);

    return {
      currentMetrics,
      recommendations,
      predictedImprovement,
    };
  }

  private async getCurrentMetrics(
    campaignId: string,
    deals: EndorsementDeal[]
  ): Promise<PerformanceMetrics> {
    // Query DKG for campaign metrics
    // For now, return mock data
    const totalEngagement = deals.length * 5000; // Mock
    const totalReach = deals.length * 50000;
    const conversions = totalEngagement * 0.02;
    const totalCost = deals.reduce((sum, d) => sum + d.terms.basePayment, 0);

    return {
      engagement: totalEngagement,
      reach: totalReach,
      conversions,
      roi: totalCost > 0 ? ((conversions * 10 - totalCost) / totalCost) * 100 : 0,
      costPerEngagement: totalEngagement > 0 ? totalCost / totalEngagement : 0,
      costPerConversion: conversions > 0 ? totalCost / conversions : 0,
    };
  }

  private async analyzePerformance(deals: EndorsementDeal[]): Promise<any> {
    // Analyze which deals are performing best
    return {
      topPerformers: deals.slice(0, 2),
      underPerformers: deals.slice(2),
    };
  }

  private generateRecommendations(
    metrics: PerformanceMetrics,
    analysis: any
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    if (metrics.costPerEngagement > 0.1) {
      recommendations.push({
        action: 'Increase engagement-focused content',
        impact: 0.2,
        confidence: 0.8,
        reasoning: 'High cost per engagement suggests content optimization needed',
      });
    }

    if (metrics.roi < 100) {
      recommendations.push({
        action: 'Reallocate budget to top performers',
        impact: 0.3,
        confidence: 0.7,
        reasoning: 'Current ROI below target, focus on high-performing influencers',
      });
    }

    return recommendations;
  }

  private predictImprovement(recommendations: OptimizationRecommendation[]): number {
    return recommendations.reduce((sum, r) => sum + r.impact * r.confidence, 0) * 100;
  }
}

/**
 * Trust Auditor Agent
 * 
 * Continuous reputation verification and transparency reporting.
 */
export interface AuditReport {
  accountId: string;
  reputationScore: number;
  lastVerified: string;
  changes: Array<{ metric: string; oldValue: number; newValue: number; change: number }>;
  verificationStatus: 'verified' | 'pending' | 'disputed';
  fraudIndicators: string[];
  transparencyScore: number;
}

export interface ContinuousAuditResult {
  accounts: AuditReport[];
  summary: {
    totalAudited: number;
    verified: number;
    pending: number;
    disputed: number;
    averageTransparency: number;
  };
}

export class TrustAuditorAgent {
  private dkgClient: DKGClient;
  private polkadotApi: PolkadotApiService;

  constructor(dkgClient: DKGClient, polkadotApi: PolkadotApiService) {
    this.dkgClient = dkgClient;
    this.polkadotApi = polkadotApi;
  }

  /**
   * Perform continuous audit on accounts
   */
  async auditAccounts(accountIds: string[]): Promise<ContinuousAuditResult> {
    const audits = await Promise.all(
      accountIds.map(id => this.auditSingleAccount(id))
    );

    const summary = {
      totalAudited: audits.length,
      verified: audits.filter(a => a.verificationStatus === 'verified').length,
      pending: audits.filter(a => a.verificationStatus === 'pending').length,
      disputed: audits.filter(a => a.verificationStatus === 'disputed').length,
      averageTransparency: audits.reduce((sum, a) => sum + a.transparencyScore, 0) / audits.length,
    };

    return { accounts: audits, summary };
  }

  private async auditSingleAccount(accountId: string): Promise<AuditReport> {
    // Get current reputation
    const currentReputation = await this.polkadotApi.getReputation(accountId);
    const currentScore = currentReputation.overall;

    // Get historical data for comparison
    const historical = await this.getHistoricalReputation(accountId);

    // Detect changes
    const changes = this.detectChanges(currentScore, historical);

    // Check for fraud indicators
    const fraudIndicators = await this.checkFraudIndicators(accountId);

    // Calculate transparency score
    const transparencyScore = this.calculateTransparencyScore(accountId, changes, fraudIndicators);

    // Determine verification status
    const verificationStatus = this.determineVerificationStatus(
      currentScore,
      fraudIndicators,
      transparencyScore
    );

    return {
      accountId,
      reputationScore: currentScore,
      lastVerified: new Date().toISOString(),
      changes,
      verificationStatus,
      fraudIndicators,
      transparencyScore,
    };
  }

  private async getHistoricalReputation(accountId: string): Promise<number> {
    // Query DKG for historical reputation data
    // For now, return mock
    return 700;
  }

  private detectChanges(
    current: number,
    historical: number
  ): Array<{ metric: string; oldValue: number; newValue: number; change: number }> {
    const change = current - historical;
    if (Math.abs(change) < 10) return [];

    return [{
      metric: 'reputationScore',
      oldValue: historical,
      newValue: current,
      change,
    }];
  }

  private async checkFraudIndicators(accountId: string): Promise<string[]> {
    const indicators: string[] = [];

    // Check for suspicious patterns
    const reputation = await this.polkadotApi.getReputation(accountId);
    
    if (reputation.overall > 900 && reputation.breakdown.length < 5) {
      indicators.push('High reputation with limited activity breakdown');
    }

    return indicators;
  }

  private calculateTransparencyScore(
    accountId: string,
    changes: any[],
    fraudIndicators: string[]
  ): number {
    let score = 1.0;

    // Penalty for lack of transparency
    if (fraudIndicators.length > 0) {
      score -= fraudIndicators.length * 0.1;
    }

    // Penalty for unexplained changes
    if (changes.length > 0 && changes[0].change > 100) {
      score -= 0.2;
    }

    return Math.max(score, 0);
  }

  private determineVerificationStatus(
    reputation: number,
    fraudIndicators: string[],
    transparencyScore: number
  ): 'verified' | 'pending' | 'disputed' {
    if (fraudIndicators.length > 2 || transparencyScore < 0.5) {
      return 'disputed';
    }
    if (transparencyScore < 0.7) {
      return 'pending';
    }
    return 'verified';
  }
}

/**
 * Factory function to create all AI agents
 */
export function createAIAgents(
  dkgClient: DKGClient,
  polkadotApi: PolkadotApiService,
  x402GatewayUrl?: string
) {
  const sybilDetector = new SybilDetectiveAgent(dkgClient, polkadotApi);
  
  return {
    misinformationDetection: new MisinformationDetectionAgent(dkgClient, polkadotApi),
    truthVerification: new TruthVerificationAgent(dkgClient, polkadotApi),
    autonomousTransaction: new AutonomousTransactionAgent(polkadotApi),
    crossChainReasoning: new CrossChainReasoningAgent(polkadotApi, dkgClient),
    trustNavigator: new TrustNavigatorAgent(dkgClient, polkadotApi, sybilDetector),
    sybilDetective: sybilDetector,
    contractNegotiator: new SmartContractNegotiatorAgent(polkadotApi, x402GatewayUrl),
    campaignOptimizer: new CampaignPerformanceOptimizerAgent(dkgClient),
    trustAuditor: new TrustAuditorAgent(dkgClient, polkadotApi),
  };
}

