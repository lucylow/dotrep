/**
 * Enhanced Content-Sharing Network Service
 * 
 * Implements advanced reputation models for content-sharing networks:
 * - DeciTrustNET Framework: Double-supervised personalized feedback, global vs pairwise trust
 * - Comprehensive Reputation (CR) Model: Behavioral activity + social relationship reputation
 * - Enhanced Graph Metrics: Clustering coefficient, improved centrality measures
 * - Deception Filtering: Bad-mouthing detection and personalized distrust metrics
 * 
 * Based on research from:
 * - DeciTrustNET: Graph-based trust and reputation framework
 * - CR Model: Comprehensive Reputation for social commerce
 * - NetworkX and graph analysis best practices
 */

import { DKGClientV8 } from './dkg-client-v8';
import { GraphNode, GraphEdge, EdgeType } from './graph-algorithms';

export interface ContentSharingInteraction {
  interactionId: string;
  fromUser: string; // DID or user ID
  toUser: string; // DID or user ID
  contentUAL: string; // UAL of shared content
  interactionType: 'share' | 'like' | 'comment' | 'endorse' | 'repost';
  timestamp: number;
  weight?: number; // Interaction strength (0-1)
  metadata?: {
    commentText?: string;
    sentiment?: 'positive' | 'neutral' | 'negative';
    engagementDepth?: number; // Time spent, read depth, etc.
  };
}

export interface PersonalizedFeedback {
  raterId: string; // User providing feedback
  rateeId: string; // User receiving feedback
  rating: number; // 0-1 scale
  feedbackType: 'content_quality' | 'trustworthiness' | 'relevance' | 'overall';
  timestamp: number;
  contentUAL?: string; // Optional: feedback on specific content
  metadata?: Record<string, any>;
}

export interface GlobalReputation {
  userId: string;
  globalReputation: number; // 0-1, based on all interactions
  behavioralActivityReputation: number; // 0-1, based on activity patterns
  socialRelationshipReputation: number; // 0-1, based on social connections
  comprehensiveReputation: number; // 0-1, combined CR model score
  trustFactors: {
    consistency: number;
    longevity: number;
    diversity: number;
    reciprocity: number;
  };
  timestamp: number;
}

export interface PairwiseTrust {
  fromUser: string;
  toUser: string;
  trustLevel: number; // 0-1, specific trust between these two users
  interactionHistory: {
    totalInteractions: number;
    positiveInteractions: number;
    negativeInteractions: number;
    averageRating: number;
    lastInteraction: number;
  };
  trustFactors: {
    directExperience: number;
    mutualConnections: number;
    temporalConsistency: number;
    contentAlignment: number;
  };
  timestamp: number;
}

export interface NetworkMetrics {
  userId: string;
  degreeCentrality: number;
  betweennessCentrality: number;
  closenessCentrality: number;
  eigenvectorCentrality: number;
  clusteringCoefficient: number; // Local clustering coefficient
  globalClusteringCoefficient?: number; // Network-wide clustering
  pagerank: number;
  communityEmbeddedness: number;
  informationFlowEfficiency: number; // Custom metric based on content reach
  timestamp: number;
}

export interface DeceptionAnalysis {
  userId: string;
  badMouthingScore: number; // 0-1, likelihood of bad-mouthing behavior
  selfPromotionScore: number; // 0-1, likelihood of excessive self-promotion
  suspiciousPatterns: string[];
  personalizedDistrust: Map<string, number>; // Distrust level for each user
  filteredRatings: number; // Number of ratings filtered out
  timestamp: number;
}

export interface ContentSharingNetworkConfig {
  enableDoubleSupervisedFeedback?: boolean; // DeciTrustNET feature
  enablePairwiseTrust?: boolean; // DeciTrustNET feature
  enableDeceptionFiltering?: boolean; // CR Model feature
  enableComprehensiveReputation?: boolean; // CR Model feature
  enableEnhancedMetrics?: boolean; // Enhanced graph metrics
  trustDecayFactor?: number; // How quickly trust decays over time (default: 0.1)
  minInteractionsForTrust?: number; // Minimum interactions needed for trust calculation (default: 3)
  deceptionThreshold?: number; // Threshold for filtering deceptive ratings (default: 0.7)
}

/**
 * Enhanced Content-Sharing Network Service
 * 
 * Implements advanced reputation models for analyzing and scoring users
 * in content-sharing networks.
 */
export class ContentSharingNetworkService {
  private dkgClient: DKGClientV8;
  private config: Required<ContentSharingNetworkConfig>;
  private interactions: Map<string, ContentSharingInteraction[]> = new Map();
  private feedbacks: Map<string, PersonalizedFeedback[]> = new Map();
  private globalReputations: Map<string, GlobalReputation> = new Map();
  private pairwiseTrusts: Map<string, Map<string, PairwiseTrust>> = new Map();
  private networkMetrics: Map<string, NetworkMetrics> = new Map();
  private deceptionAnalyses: Map<string, DeceptionAnalysis> = new Map();

  constructor(
    dkgClient: DKGClientV8,
    config: ContentSharingNetworkConfig = {}
  ) {
    this.dkgClient = dkgClient;
    this.config = {
      enableDoubleSupervisedFeedback: config.enableDoubleSupervisedFeedback ?? true,
      enablePairwiseTrust: config.enablePairwiseTrust ?? true,
      enableDeceptionFiltering: config.enableDeceptionFiltering ?? true,
      enableComprehensiveReputation: config.enableComprehensiveReputation ?? true,
      enableEnhancedMetrics: config.enableEnhancedMetrics ?? true,
      trustDecayFactor: config.trustDecayFactor ?? 0.1,
      minInteractionsForTrust: config.minInteractionsForTrust ?? 3,
      deceptionThreshold: config.deceptionThreshold ?? 0.7,
    };
  }

  /**
   * Record a content-sharing interaction
   * 
   * Tracks interactions between users in the content-sharing network.
   * If double-supervised feedback is enabled, this also updates both
   * the rater's and ratee's reputation.
   */
  async recordInteraction(interaction: ContentSharingInteraction): Promise<void> {
    // Store interaction
    if (!this.interactions.has(interaction.fromUser)) {
      this.interactions.set(interaction.fromUser, []);
    }
    this.interactions.get(interaction.fromUser)!.push(interaction);

    // If double-supervised feedback is enabled, update both users' reputations
    if (this.config.enableDoubleSupervisedFeedback) {
      await this.updateDoubleSupervisedReputation(interaction);
    }

    // Update pairwise trust if enabled
    if (this.config.enablePairwiseTrust) {
      await this.updatePairwiseTrust(interaction.fromUser, interaction.toUser, interaction);
    }

    // Invalidate cached metrics for both users
    this.networkMetrics.delete(interaction.fromUser);
    this.networkMetrics.delete(interaction.toUser);
  }

  /**
   * Record personalized feedback (rating)
   * 
   * Implements double-supervised feedback where ratings affect both
   * the user being rated and the user providing the rating.
   */
  async recordFeedback(feedback: PersonalizedFeedback): Promise<void> {
    // Store feedback
    if (!this.feedbacks.has(feedback.raterId)) {
      this.feedbacks.set(feedback.raterId, []);
    }
    this.feedbacks.get(feedback.raterId)!.push(feedback);

    // Apply deception filtering if enabled
    if (this.config.enableDeceptionFiltering) {
      const isDeceptive = await this.detectDeception(feedback);
      if (isDeceptive) {
        console.warn(`⚠️  Deceptive feedback detected from ${feedback.raterId} to ${feedback.rateeId}, filtering out`);
        return; // Don't process deceptive feedback
      }
    }

    // Double-supervised feedback: Update both rater and ratee reputation
    if (this.config.enableDoubleSupervisedFeedback) {
      // Update ratee's reputation based on rating
      await this.updateUserReputationFromRating(feedback.rateeId, feedback);

      // Update rater's reputation based on rating quality (counter-incentive for malicious behavior)
      await this.updateRaterReputation(feedback);
    }

    // Update pairwise trust
    if (this.config.enablePairwiseTrust) {
      await this.updatePairwiseTrustFromFeedback(feedback);
    }
  }

  /**
   * Get global reputation for a user
   * 
   * Returns reputation based on all interactions and feedback across the network.
   */
  async getGlobalReputation(userId: string): Promise<GlobalReputation> {
    // Check cache
    const cached = this.globalReputations.get(userId);
    if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hour cache
      return cached;
    }

    // Compute global reputation
    const reputation = await this.computeGlobalReputation(userId);
    this.globalReputations.set(userId, reputation);
    return reputation;
  }

  /**
   * Get pairwise trust between two users
   * 
   * Returns trust level based on their specific interaction history.
   */
  async getPairwiseTrust(fromUser: string, toUser: string): Promise<PairwiseTrust> {
    const userTrusts = this.pairwiseTrusts.get(fromUser);
    if (userTrusts) {
      const cached = userTrusts.get(toUser);
      if (cached && Date.now() - cached.timestamp < 3600000) {
        return cached;
      }
    }

    // Compute pairwise trust
    const trust = await this.computePairwiseTrust(fromUser, toUser);
    
    if (!this.pairwiseTrusts.has(fromUser)) {
      this.pairwiseTrusts.set(fromUser, new Map());
    }
    this.pairwiseTrusts.get(fromUser)!.set(toUser, trust);
    
    return trust;
  }

  /**
   * Get network metrics for a user
   * 
   * Returns comprehensive graph metrics including centrality measures
   * and clustering coefficient.
   */
  async getNetworkMetrics(userId: string): Promise<NetworkMetrics> {
    // Check cache
    const cached = this.networkMetrics.get(userId);
    if (cached && Date.now() - cached.timestamp < 3600000) {
      return cached;
    }

    // Compute metrics
    const metrics = await this.computeNetworkMetrics(userId);
    this.networkMetrics.set(userId, metrics);
    return metrics;
  }

  /**
   * Get deception analysis for a user
   * 
   * Analyzes user behavior for bad-mouthing, self-promotion, and other
   * deceptive patterns.
   */
  async getDeceptionAnalysis(userId: string): Promise<DeceptionAnalysis> {
    // Check cache
    const cached = this.deceptionAnalyses.get(userId);
    if (cached && Date.now() - cached.timestamp < 3600000) {
      return cached;
    }

    // Compute deception analysis
    const analysis = await this.computeDeceptionAnalysis(userId);
    this.deceptionAnalyses.set(userId, analysis);
    return analysis;
  }

  // ========== Private Implementation Methods ==========

  /**
   * Update double-supervised reputation from interaction
   */
  private async updateDoubleSupervisedReputation(
    interaction: ContentSharingInteraction
  ): Promise<void> {
    // Interaction affects both users:
    // 1. User sharing content gets reputation boost for engagement
    // 2. User receiving share gets reputation boost for content quality

    const now = Date.now();
    const timeDecay = Math.exp(-this.config.trustDecayFactor * (now - interaction.timestamp) / (1000 * 60 * 60 * 24));

    // Update fromUser (sharer) - positive signal for active engagement
    const fromUserRep = await this.getGlobalReputation(interaction.fromUser);
    const engagementBoost = (interaction.weight || 0.5) * timeDecay * 0.1; // Small boost
    fromUserRep.behavioralActivityReputation = Math.min(1.0, 
      fromUserRep.behavioralActivityReputation + engagementBoost
    );
    fromUserRep.timestamp = now;
    this.globalReputations.set(interaction.fromUser, fromUserRep);

    // Update toUser (content creator) - positive signal for content quality
    const toUserRep = await this.getGlobalReputation(interaction.toUser);
    const qualityBoost = (interaction.weight || 0.5) * timeDecay * 0.15; // Slightly larger boost
    toUserRep.behavioralActivityReputation = Math.min(1.0,
      toUserRep.behavioralActivityReputation + qualityBoost
    );
    toUserRep.timestamp = now;
    this.globalReputations.set(interaction.toUser, toUserRep);
  }

  /**
   * Update user reputation from rating (affects ratee)
   */
  private async updateUserReputationFromRating(
    rateeId: string,
    feedback: PersonalizedFeedback
  ): Promise<void> {
    const rateeRep = await this.getGlobalReputation(rateeId);
    
    // Get rater's reputation to weight the feedback
    const raterRep = await this.getGlobalReputation(feedback.raterId);
    const raterWeight = raterRep.comprehensiveReputation; // Higher reputation raters have more weight

    // Time decay
    const now = Date.now();
    const timeDecay = Math.exp(-this.config.trustDecayFactor * (now - feedback.timestamp) / (1000 * 60 * 60 * 24));

    // Update behavioral activity reputation
    const activityUpdate = feedback.rating * raterWeight * timeDecay * 0.2;
    rateeRep.behavioralActivityReputation = Math.min(1.0,
      rateeRep.behavioralActivityReputation * 0.8 + activityUpdate * 0.2
    );

    // Update comprehensive reputation
    rateeRep.comprehensiveReputation = this.computeComprehensiveReputation(rateeRep);
    rateeRep.timestamp = now;
    
    this.globalReputations.set(rateeId, rateeRep);
  }

  /**
   * Update rater reputation (counter-incentive for malicious behavior)
   * 
   * If a user consistently gives ratings that differ from the consensus,
   * their reputation as a rater decreases. This creates a counter-incentive
   * for bad-mouthing or self-promotion.
   */
  private async updateRaterReputation(feedback: PersonalizedFeedback): Promise<void> {
    const raterRep = await this.getGlobalReputation(feedback.raterId);
    const rateeRep = await this.getGlobalReputation(feedback.rateeId);

    // Compare rater's rating to ratee's current reputation
    const ratingDeviation = Math.abs(feedback.rating - rateeRep.comprehensiveReputation);
    
    // If deviation is large, penalize rater (unless ratee's reputation is uncertain)
    const confidence = this.computeReputationConfidence(rateeRep);
    if (ratingDeviation > 0.3 && confidence > 0.7) {
      // Rater is giving inconsistent ratings - reduce their rater reputation
      const penalty = ratingDeviation * 0.1;
      raterRep.behavioralActivityReputation = Math.max(0.0,
        raterRep.behavioralActivityReputation - penalty
      );
    } else if (ratingDeviation < 0.1 && confidence > 0.7) {
      // Rater is giving consistent ratings - reward them
      const reward = (1 - ratingDeviation) * 0.05;
      raterRep.behavioralActivityReputation = Math.min(1.0,
        raterRep.behavioralActivityReputation + reward
      );
    }

    raterRep.comprehensiveReputation = this.computeComprehensiveReputation(raterRep);
    raterRep.timestamp = Date.now();
    this.globalReputations.set(feedback.raterId, raterRep);
  }

  /**
   * Compute global reputation using Comprehensive Reputation (CR) Model
   */
  private async computeGlobalReputation(userId: string): Promise<GlobalReputation> {
    // Get all interactions involving this user
    const userInteractions = this.interactions.get(userId) || [];
    const allInteractions: ContentSharingInteraction[] = [];
    
    // Also get interactions where user is the target
    for (const [fromUser, interactions] of this.interactions.entries()) {
      for (const interaction of interactions) {
        if (interaction.toUser === userId) {
          allInteractions.push(interaction);
        }
      }
    }
    allInteractions.push(...userInteractions);

    // Get all feedback for this user
    const userFeedbacks: PersonalizedFeedback[] = [];
    for (const [raterId, feedbacks] of this.feedbacks.entries()) {
      for (const feedback of feedbacks) {
        if (feedback.rateeId === userId) {
          userFeedbacks.push(feedback);
        }
      }
    }

    // Compute behavioral activity reputation
    const behavioralActivityReputation = this.computeBehavioralActivityReputation(
      userId,
      allInteractions,
      userFeedbacks
    );

    // Compute social relationship reputation
    const socialRelationshipReputation = await this.computeSocialRelationshipReputation(userId);

    // Compute trust factors
    const trustFactors = this.computeTrustFactors(userId, allInteractions, userFeedbacks);

    // Compute comprehensive reputation (CR Model)
    const comprehensiveReputation = this.computeComprehensiveReputation({
      userId,
      globalReputation: 0, // Will be computed
      behavioralActivityReputation,
      socialRelationshipReputation,
      comprehensiveReputation: 0, // Will be computed
      trustFactors,
      timestamp: Date.now()
    });

    // Global reputation is the average of behavioral and social
    const globalReputation = (behavioralActivityReputation + socialRelationshipReputation) / 2;

    return {
      userId,
      globalReputation,
      behavioralActivityReputation,
      socialRelationshipReputation,
      comprehensiveReputation,
      trustFactors,
      timestamp: Date.now()
    };
  }

  /**
   * Compute behavioral activity reputation
   * 
   * Based on user's activity patterns, consistency, and engagement quality.
   */
  private computeBehavioralActivityReputation(
    userId: string,
    interactions: ContentSharingInteraction[],
    feedbacks: PersonalizedFeedback[]
  ): number {
    if (interactions.length === 0 && feedbacks.length === 0) {
      return 0.5; // Neutral default
    }

    // Activity volume (normalized)
    const activityVolume = Math.min(1.0, Math.log10(1 + interactions.length) / 3);

    // Activity consistency (temporal patterns)
    const consistency = this.computeActivityConsistency(interactions);

    // Engagement quality (average interaction weights)
    const avgWeight = interactions.length > 0
      ? interactions.reduce((sum, i) => sum + (i.weight || 0.5), 0) / interactions.length
      : 0.5;

    // Feedback quality (average ratings received)
    const avgRating = feedbacks.length > 0
      ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length
      : 0.5;

    // Combined behavioral activity reputation
    return (
      activityVolume * 0.3 +
      consistency * 0.25 +
      avgWeight * 0.25 +
      avgRating * 0.2
    );
  }

  /**
   * Compute social relationship reputation
   * 
   * Based on user's position in the social graph and quality of connections.
   */
  private async computeSocialRelationshipReputation(userId: string): Promise<number> {
    const metrics = await this.computeNetworkMetrics(userId);
    
    // Weighted combination of graph metrics
    return (
      metrics.pagerank * 0.3 +
      metrics.eigenvectorCentrality * 0.25 +
      metrics.clusteringCoefficient * 0.2 +
      metrics.betweennessCentrality * 0.15 +
      metrics.communityEmbeddedness * 0.1
    );
  }

  /**
   * Compute trust factors
   */
  private computeTrustFactors(
    userId: string,
    interactions: ContentSharingInteraction[],
    feedbacks: PersonalizedFeedback[]
  ): GlobalReputation['trustFactors'] {
    // Consistency: How consistent are interactions over time
    const consistency = this.computeActivityConsistency(interactions);

    // Longevity: How long has the user been active
    const longevity = this.computeActivityLongevity(interactions);

    // Diversity: How diverse are the user's interactions
    const diversity = this.computeInteractionDiversity(interactions);

    // Reciprocity: How reciprocal are interactions
    const reciprocity = this.computeReciprocity(userId);

    return { consistency, longevity, diversity, reciprocity };
  }

  /**
   * Compute comprehensive reputation (CR Model formula)
   */
  private computeComprehensiveReputation(reputation: Partial<GlobalReputation>): number {
    const behavioral = reputation.behavioralActivityReputation || 0;
    const social = reputation.socialRelationshipReputation || 0;
    const factors = reputation.trustFactors || {
      consistency: 0.5,
      longevity: 0.5,
      diversity: 0.5,
      reciprocity: 0.5
    };

    // CR Model: Weighted combination with trust factors
    const trustFactorWeight = (
      factors.consistency * 0.3 +
      factors.longevity * 0.25 +
      factors.diversity * 0.25 +
      factors.reciprocity * 0.2
    );

    return (
      behavioral * 0.5 * (1 + trustFactorWeight * 0.2) +
      social * 0.5 * (1 + trustFactorWeight * 0.2)
    );
  }

  /**
   * Compute pairwise trust between two users
   */
  private async computePairwiseTrust(
    fromUser: string,
    toUser: string
  ): Promise<PairwiseTrust> {
    // Get direct interactions
    const directInteractions = (this.interactions.get(fromUser) || [])
      .filter(i => i.toUser === toUser);

    // Get feedback from fromUser to toUser
    const directFeedbacks = (this.feedbacks.get(fromUser) || [])
      .filter(f => f.rateeId === toUser);

    // Compute interaction history
    const totalInteractions = directInteractions.length + directFeedbacks.length;
    const positiveInteractions = directInteractions.filter(i => 
      (i.weight || 0.5) > 0.6 || 
      (i.metadata?.sentiment === 'positive')
    ).length + directFeedbacks.filter(f => f.rating > 0.6).length;
    
    const negativeInteractions = directInteractions.filter(i => 
      (i.weight || 0.5) < 0.4 || 
      (i.metadata?.sentiment === 'negative')
    ).length + directFeedbacks.filter(f => f.rating < 0.4).length;

    const averageRating = directFeedbacks.length > 0
      ? directFeedbacks.reduce((sum, f) => sum + f.rating, 0) / directFeedbacks.length
      : 0.5;

    const lastInteraction = Math.max(
      ...directInteractions.map(i => i.timestamp),
      ...directFeedbacks.map(f => f.timestamp),
      0
    );

    // Compute trust factors
    const directExperience = totalInteractions >= this.config.minInteractionsForTrust
      ? (positiveInteractions - negativeInteractions) / Math.max(totalInteractions, 1)
      : 0.5;

    const mutualConnections = await this.computeMutualConnections(fromUser, toUser);
    const temporalConsistency = this.computeTemporalConsistency(directInteractions, directFeedbacks);
    const contentAlignment = this.computeContentAlignment(fromUser, toUser);

    // Compute trust level
    const trustLevel = (
      directExperience * 0.4 +
      mutualConnections * 0.25 +
      temporalConsistency * 0.2 +
      contentAlignment * 0.15
    );

    return {
      fromUser,
      toUser,
      trustLevel: Math.max(0, Math.min(1, trustLevel)),
      interactionHistory: {
        totalInteractions,
        positiveInteractions,
        negativeInteractions,
        averageRating,
        lastInteraction
      },
      trustFactors: {
        directExperience: Math.max(0, Math.min(1, directExperience)),
        mutualConnections: Math.max(0, Math.min(1, mutualConnections)),
        temporalConsistency: Math.max(0, Math.min(1, temporalConsistency)),
        contentAlignment: Math.max(0, Math.min(1, contentAlignment))
      },
      timestamp: Date.now()
    };
  }

  /**
   * Compute network metrics with enhanced centrality and clustering
   */
  private async computeNetworkMetrics(userId: string): Promise<NetworkMetrics> {
    // Build graph from interactions
    const { nodes, edges } = this.buildGraphFromInteractions();

    // Find user node
    const userNode = nodes.find(n => n.id === userId);
    if (!userNode) {
      // Return default metrics if user not in graph
      return this.getDefaultMetrics(userId);
    }

    // Compute centrality measures
    const degreeCentrality = this.computeDegreeCentrality(userId, nodes, edges);
    const betweennessCentrality = this.computeBetweennessCentrality(userId, nodes, edges);
    const closenessCentrality = this.computeClosenessCentrality(userId, nodes, edges);
    const eigenvectorCentrality = this.computeEigenvectorCentrality(userId, nodes, edges);
    
    // Compute clustering coefficient
    const clusteringCoefficient = this.computeClusteringCoefficient(userId, nodes, edges);
    
    // Compute PageRank
    const pagerank = await this.computePageRank(userId, nodes, edges);
    
    // Compute community embeddedness
    const communityEmbeddedness = this.computeCommunityEmbeddedness(userId, nodes, edges);
    
    // Compute information flow efficiency (custom metric)
    const informationFlowEfficiency = this.computeInformationFlowEfficiency(userId, nodes, edges);

    return {
      userId,
      degreeCentrality,
      betweennessCentrality,
      closenessCentrality,
      eigenvectorCentrality,
      clusteringCoefficient,
      pagerank,
      communityEmbeddedness,
      informationFlowEfficiency,
      timestamp: Date.now()
    };
  }

  /**
   * Compute deception analysis
   */
  private async computeDeceptionAnalysis(userId: string): Promise<DeceptionAnalysis> {
    const userFeedbacks = this.feedbacks.get(userId) || [];
    const userInteractions = this.interactions.get(userId) || [];

    // Bad-mouthing detection: Check for consistently negative ratings
    const badMouthingScore = this.detectBadMouthing(userId, userFeedbacks);

    // Self-promotion detection: Check for excessive self-references
    const selfPromotionScore = this.detectSelfPromotion(userId, userInteractions, userFeedbacks);

    // Suspicious patterns
    const suspiciousPatterns: string[] = [];
    if (badMouthingScore > this.config.deceptionThreshold) {
      suspiciousPatterns.push('bad_mouthing');
    }
    if (selfPromotionScore > this.config.deceptionThreshold) {
      suspiciousPatterns.push('self_promotion');
    }

    // Personalized distrust: Compute distrust level for each user this user has rated
    const personalizedDistrust = new Map<string, number>();
    for (const feedback of userFeedbacks) {
      const rateeRep = await this.getGlobalReputation(feedback.rateeId);
      const deviation = Math.abs(feedback.rating - rateeRep.comprehensiveReputation);
      if (deviation > 0.4) {
        // High deviation suggests distrust
        personalizedDistrust.set(feedback.rateeId, deviation);
      }
    }

    // Count filtered ratings
    const filteredRatings = userFeedbacks.filter(f => {
      const rateeRep = this.globalReputations.get(f.rateeId);
      if (!rateeRep) return false;
      const deviation = Math.abs(f.rating - rateeRep.comprehensiveReputation);
      return deviation > 0.4 && rateeRep.comprehensiveReputation > 0.7;
    }).length;

    return {
      userId,
      badMouthingScore,
      selfPromotionScore,
      suspiciousPatterns,
      personalizedDistrust,
      filteredRatings,
      timestamp: Date.now()
    };
  }

  /**
   * Detect deception in feedback
   */
  private async detectDeception(feedback: PersonalizedFeedback): Promise<boolean> {
    if (!this.config.enableDeceptionFiltering) {
      return false;
    }

    const rateeRep = await this.getGlobalReputation(feedback.rateeId);
    const deviation = Math.abs(feedback.rating - rateeRep.comprehensiveReputation);

    // If rating deviates significantly from consensus and ratee has high reputation, it's suspicious
    if (deviation > 0.4 && rateeRep.comprehensiveReputation > 0.7) {
      // Check if rater has history of bad-mouthing
      const raterAnalysis = await this.getDeceptionAnalysis(feedback.raterId);
      if (raterAnalysis.badMouthingScore > this.config.deceptionThreshold) {
        return true;
      }
    }

    return false;
  }

  // ========== Helper Methods ==========

  private buildGraphFromInteractions(): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const nodeSet = new Set<string>();
    const edges: GraphEdge[] = [];

    // Collect all nodes and edges
    for (const [fromUser, interactions] of this.interactions.entries()) {
      nodeSet.add(fromUser);
      for (const interaction of interactions) {
        nodeSet.add(interaction.toUser);
        edges.push({
          source: fromUser,
          target: interaction.toUser,
          weight: interaction.weight || 0.5,
          edgeType: this.mapInteractionTypeToEdgeType(interaction.interactionType),
          metadata: {
            timestamp: interaction.timestamp,
            contentUAL: interaction.contentUAL
          }
        });
      }
    }

    const nodes: GraphNode[] = Array.from(nodeSet).map(id => ({
      id,
      metadata: {}
    }));

    return { nodes, edges };
  }

  private mapInteractionTypeToEdgeType(type: ContentSharingInteraction['interactionType']): EdgeType {
    switch (type) {
      case 'share': return 'shares';
      case 'like': return 'likes';
      case 'comment': return 'comments';
      case 'endorse': return 'endorses';
      case 'repost': return 'reposts';
      default: return 'interacts';
    }
  }

  private computeActivityConsistency(interactions: ContentSharingInteraction[]): number {
    if (interactions.length < 2) return 0.5;

    // Group by time periods and check consistency
    const timeWindows: number[][] = [];
    const windowSize = 7 * 24 * 60 * 60 * 1000; // 1 week
    const sortedInteractions = [...interactions].sort((a, b) => a.timestamp - b.timestamp);
    
    let currentWindow: number[] = [];
    let windowStart = sortedInteractions[0].timestamp;

    for (const interaction of sortedInteractions) {
      if (interaction.timestamp - windowStart > windowSize) {
        if (currentWindow.length > 0) {
          timeWindows.push(currentWindow);
        }
        currentWindow = [];
        windowStart = interaction.timestamp;
      }
      currentWindow.push(interaction.weight || 0.5);
    }
    if (currentWindow.length > 0) {
      timeWindows.push(currentWindow);
    }

    if (timeWindows.length < 2) return 0.5;

    // Compute variance across windows
    const windowAverages = timeWindows.map(w => w.reduce((a, b) => a + b, 0) / w.length);
    const overallAverage = windowAverages.reduce((a, b) => a + b, 0) / windowAverages.length;
    const variance = windowAverages.reduce((sum, avg) => sum + Math.pow(avg - overallAverage, 2), 0) / windowAverages.length;

    // Lower variance = higher consistency
    return Math.max(0, 1 - variance);
  }

  private computeActivityLongevity(interactions: ContentSharingInteraction[]): number {
    if (interactions.length === 0) return 0;

    const timestamps = interactions.map(i => i.timestamp);
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    const duration = maxTime - minTime;

    // Normalize to 2 years (assume 2 years = full score)
    const twoYears = 2 * 365 * 24 * 60 * 60 * 1000;
    return Math.min(1.0, duration / twoYears);
  }

  private computeInteractionDiversity(interactions: ContentSharingInteraction[]): number {
    if (interactions.length === 0) return 0;

    const uniqueTargets = new Set(interactions.map(i => i.toUser));
    const uniqueTypes = new Set(interactions.map(i => i.interactionType));

    // Diversity based on number of unique connections and interaction types
    const connectionDiversity = Math.min(1.0, uniqueTargets.size / Math.max(interactions.length, 1));
    const typeDiversity = uniqueTypes.size / 5; // 5 possible types

    return (connectionDiversity * 0.7 + typeDiversity * 0.3);
  }

  private computeReciprocity(userId: string): number {
    const outInteractions = this.interactions.get(userId) || [];
    const outTargets = new Set(outInteractions.map(i => i.toUser));

    let reciprocalCount = 0;
    for (const target of outTargets) {
      const targetInteractions = this.interactions.get(target) || [];
      if (targetInteractions.some(i => i.toUser === userId)) {
        reciprocalCount++;
      }
    }

    return outTargets.size > 0 ? reciprocalCount / outTargets.size : 0;
  }

  private computeReputationConfidence(reputation: GlobalReputation): number {
    // Confidence based on number of interactions and consistency
    const interactionCount = (this.interactions.get(reputation.userId) || []).length;
    const feedbackCount = (this.feedbacks.get(reputation.userId) || []).length;
    const totalSignals = interactionCount + feedbackCount;

    const volumeConfidence = Math.min(1.0, Math.log10(1 + totalSignals) / 3);
    const consistencyConfidence = reputation.trustFactors.consistency;

    return (volumeConfidence * 0.6 + consistencyConfidence * 0.4);
  }

  private async updatePairwiseTrust(
    fromUser: string,
    toUser: string,
    interaction: ContentSharingInteraction
  ): Promise<void> {
    // Invalidate cache
    const userTrusts = this.pairwiseTrusts.get(fromUser);
    if (userTrusts) {
      userTrusts.delete(toUser);
    }
  }

  private async updatePairwiseTrustFromFeedback(feedback: PersonalizedFeedback): Promise<void> {
    // Invalidate cache
    const userTrusts = this.pairwiseTrusts.get(feedback.raterId);
    if (userTrusts) {
      userTrusts.delete(feedback.rateeId);
    }
  }

  private async computeMutualConnections(user1: string, user2: string): Promise<number> {
    const user1Targets = new Set((this.interactions.get(user1) || []).map(i => i.toUser));
    const user2Targets = new Set((this.interactions.get(user2) || []).map(i => i.toUser));

    const mutual = [...user1Targets].filter(t => user2Targets.has(t)).length;
    const total = new Set([...user1Targets, ...user2Targets]).size;

    return total > 0 ? mutual / total : 0;
  }

  private computeTemporalConsistency(
    interactions: ContentSharingInteraction[],
    feedbacks: PersonalizedFeedback[]
  ): number {
    const allEvents = [
      ...interactions.map(i => ({ time: i.timestamp, weight: i.weight || 0.5 })),
      ...feedbacks.map(f => ({ time: f.timestamp, weight: f.rating }))
    ].sort((a, b) => a.time - b.time);

    if (allEvents.length < 2) return 0.5;

    // Check if weights are consistent over time
    const weights = allEvents.map(e => e.weight);
    const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;
    const variance = weights.reduce((sum, w) => sum + Math.pow(w - avgWeight, 2), 0) / weights.length;

    return Math.max(0, 1 - variance);
  }

  private computeContentAlignment(user1: string, user2: string): number {
    // Get content UALs shared by both users
    const user1Content = new Set(
      (this.interactions.get(user1) || []).map(i => i.contentUAL)
    );
    const user2Content = new Set(
      (this.interactions.get(user2) || []).map(i => i.contentUAL)
    );

    const sharedContent = [...user1Content].filter(c => user2Content.has(c)).length;
    const totalContent = new Set([...user1Content, ...user2Content]).size;

    return totalContent > 0 ? sharedContent / totalContent : 0;
  }

  private detectBadMouthing(userId: string, feedbacks: PersonalizedFeedback[]): number {
    if (feedbacks.length < 3) return 0;

    const negativeRatings = feedbacks.filter(f => f.rating < 0.4).length;
    const negativeRatio = negativeRatings / feedbacks.length;

    // Also check if ratings are consistently lower than consensus
    let deviationSum = 0;
    for (const feedback of feedbacks) {
      const rateeRep = this.globalReputations.get(feedback.rateeId);
      if (rateeRep) {
        const deviation = rateeRep.comprehensiveReputation - feedback.rating;
        if (deviation > 0) {
          deviationSum += deviation;
        }
      }
    }
    const avgPositiveDeviation = deviationSum / feedbacks.length;

    return Math.min(1.0, negativeRatio * 0.6 + avgPositiveDeviation * 0.4);
  }

  private detectSelfPromotion(
    userId: string,
    interactions: ContentSharingInteraction[],
    feedbacks: PersonalizedFeedback[]
  ): number {
    // Check for self-references in interactions
    const selfReferences = interactions.filter(i => 
      i.toUser === userId || i.contentUAL?.includes(userId)
    ).length;

    const selfReferenceRatio = interactions.length > 0
      ? selfReferences / interactions.length
      : 0;

    // Check for self-ratings (shouldn't happen, but check anyway)
    const selfRatings = feedbacks.filter(f => f.rateeId === userId).length;

    return Math.min(1.0, selfReferenceRatio * 0.7 + (selfRatings > 0 ? 0.3 : 0));
  }

  // Graph metric computation methods
  private computeDegreeCentrality(userId: string, nodes: GraphNode[], edges: GraphEdge[]): number {
    const outDegree = edges.filter(e => e.source === userId).length;
    const inDegree = edges.filter(e => e.target === userId).length;
    const maxPossible = nodes.length - 1;
    return maxPossible > 0 ? (outDegree + inDegree) / maxPossible : 0;
  }

  private computeBetweennessCentrality(userId: string, nodes: GraphNode[], edges: GraphEdge[]): number {
    // Simplified betweenness: count shortest paths through this node
    // For full implementation, would use Floyd-Warshall or BFS
    let pathsThrough = 0;
    let totalPaths = 0;

    // Sample pairs for performance (full computation can be expensive)
    const sampleSize = Math.min(100, nodes.length);
    const sampleNodes = nodes.slice(0, sampleSize);

    for (let i = 0; i < sampleNodes.length; i++) {
      for (let j = i + 1; j < sampleNodes.length; j++) {
        if (sampleNodes[i].id === userId || sampleNodes[j].id === userId) continue;
        
        const path = this.findShortestPath(sampleNodes[i].id, sampleNodes[j].id, edges);
        if (path.length > 0) {
          totalPaths++;
          if (path.includes(userId)) {
            pathsThrough++;
          }
        }
      }
    }

    return totalPaths > 0 ? pathsThrough / totalPaths : 0;
  }

  private computeClosenessCentrality(userId: string, nodes: GraphNode[], edges: GraphEdge[]): number {
    // Average distance to all other nodes
    const distances = new Map<string, number>();
    const queue: Array<{ node: string; distance: number }> = [{ node: userId, distance: 0 }];
    distances.set(userId, 0);

    while (queue.length > 0) {
      const { node, distance } = queue.shift()!;
      const neighbors = edges.filter(e => e.source === node).map(e => e.target);
      
      for (const neighbor of neighbors) {
        if (!distances.has(neighbor)) {
          distances.set(neighbor, distance + 1);
          queue.push({ node: neighbor, distance: distance + 1 });
        }
      }
    }

    const reachableNodes = distances.size - 1; // Exclude self
    if (reachableNodes === 0) return 0;

    const sumDistances = Array.from(distances.values()).reduce((a, b) => a + b, 0) - distances.get(userId)!;
    return reachableNodes / sumDistances;
  }

  private computeEigenvectorCentrality(userId: string, nodes: GraphNode[], edges: GraphEdge[]): number {
    // Simplified eigenvector centrality using power iteration
    const adjacency: Map<string, number[]> = new Map();
    for (const node of nodes) {
      adjacency.set(node.id, []);
    }
    for (const edge of edges) {
      const neighbors = adjacency.get(edge.source) || [];
      neighbors.push(nodes.findIndex(n => n.id === edge.target));
      adjacency.set(edge.source, neighbors);
    }

    const userIndex = nodes.findIndex(n => n.id === userId);
    if (userIndex === -1) return 0;

    // Power iteration (simplified, 10 iterations)
    let scores = new Array(nodes.length).fill(1.0);
    for (let iter = 0; iter < 10; iter++) {
      const newScores = new Array(nodes.length).fill(0);
      for (let i = 0; i < nodes.length; i++) {
        const neighbors = adjacency.get(nodes[i].id) || [];
        for (const neighborIdx of neighbors) {
          newScores[neighborIdx] += scores[i];
        }
      }
      // Normalize
      const sum = newScores.reduce((a, b) => a + b, 0);
      if (sum > 0) {
        scores = newScores.map(s => s / sum);
      }
    }

    return scores[userIndex];
  }

  private computeClusteringCoefficient(userId: string, nodes: GraphNode[], edges: GraphEdge[]): number {
    // Local clustering coefficient: ratio of actual triangles to possible triangles
    const neighbors = edges.filter(e => e.source === userId).map(e => e.target);
    if (neighbors.length < 2) return 0;

    // Count edges between neighbors
    let edgesBetweenNeighbors = 0;
    for (let i = 0; i < neighbors.length; i++) {
      for (let j = i + 1; j < neighbors.length; j++) {
        if (edges.some(e => 
          (e.source === neighbors[i] && e.target === neighbors[j]) ||
          (e.source === neighbors[j] && e.target === neighbors[i])
        )) {
          edgesBetweenNeighbors++;
        }
      }
    }

    const possibleEdges = neighbors.length * (neighbors.length - 1) / 2;
    return possibleEdges > 0 ? edgesBetweenNeighbors / possibleEdges : 0;
  }

  private async computePageRank(userId: string, nodes: GraphNode[], edges: GraphEdge[]): Promise<number> {
    // Simplified PageRank (for full implementation, use graph-algorithms.ts)
    const dampingFactor = 0.85;
    const iterations = 20;
    
    let scores = new Map<string, number>();
    for (const node of nodes) {
      scores.set(node.id, 1.0 / nodes.length);
    }

    const outDegree = new Map<string, number>();
    for (const edge of edges) {
      outDegree.set(edge.source, (outDegree.get(edge.source) || 0) + 1);
    }

    for (let iter = 0; iter < iterations; iter++) {
      const newScores = new Map<string, number>();
      for (const node of nodes) {
        newScores.set(node.id, (1 - dampingFactor) / nodes.length);
      }

      for (const edge of edges) {
        const sourceScore = scores.get(edge.source) || 0;
        const degree = outDegree.get(edge.source) || 1;
        const contribution = (sourceScore * dampingFactor) / degree;
        newScores.set(edge.target, (newScores.get(edge.target) || 0) + contribution);
      }

      scores = newScores;
    }

    return scores.get(userId) || 0;
  }

  private computeCommunityEmbeddedness(userId: string, nodes: GraphNode[], edges: GraphEdge[]): number {
    // Simplified: ratio of connections within community vs outside
    // For full implementation, would use community detection algorithm
    const neighbors = edges.filter(e => e.source === userId).map(e => e.target);
    if (neighbors.length === 0) return 0;

    // Assume community is defined by clustering coefficient
    const clustering = this.computeClusteringCoefficient(userId, nodes, edges);
    return clustering;
  }

  private computeInformationFlowEfficiency(userId: string, nodes: GraphNode[], edges: GraphEdge[]): number {
    // Custom metric: how efficiently can this user spread information
    const reach = this.computeReach(userId, nodes, edges);
    const avgPathLength = this.computeAveragePathLength(userId, nodes, edges);
    
    // Higher reach and lower path length = better efficiency
    return reach * (1 / (1 + avgPathLength));
  }

  private computeReach(userId: string, nodes: GraphNode[], edges: GraphEdge[]): number {
    const visited = new Set<string>();
    const queue: string[] = [userId];
    visited.add(userId);

    while (queue.length > 0) {
      const node = queue.shift()!;
      const neighbors = edges.filter(e => e.source === node).map(e => e.target);
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    return (visited.size - 1) / (nodes.length - 1); // Exclude self
  }

  private computeAveragePathLength(userId: string, nodes: GraphNode[], edges: GraphEdge[]): number {
    const distances = new Map<string, number>();
    const queue: Array<{ node: string; distance: number }> = [{ node: userId, distance: 0 }];
    distances.set(userId, 0);

    while (queue.length > 0) {
      const { node, distance } = queue.shift()!;
      const neighbors = edges.filter(e => e.source === node).map(e => e.target);
      
      for (const neighbor of neighbors) {
        if (!distances.has(neighbor)) {
          distances.set(neighbor, distance + 1);
          queue.push({ node: neighbor, distance: distance + 1 });
        }
      }
    }

    const reachableNodes = Array.from(distances.values()).filter(d => d > 0);
    return reachableNodes.length > 0
      ? reachableNodes.reduce((a, b) => a + b, 0) / reachableNodes.length
      : 0;
  }

  private findShortestPath(from: string, to: string, edges: GraphEdge[]): string[] {
    const queue: Array<{ node: string; path: string[] }> = [{ node: from, path: [from] }];
    const visited = new Set<string>([from]);

    while (queue.length > 0) {
      const { node, path } = queue.shift()!;
      if (node === to) {
        return path;
      }

      const neighbors = edges.filter(e => e.source === node).map(e => e.target);
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push({ node: neighbor, path: [...path, neighbor] });
        }
      }
    }

    return [];
  }

  private getDefaultMetrics(userId: string): NetworkMetrics {
    return {
      userId,
      degreeCentrality: 0,
      betweennessCentrality: 0,
      closenessCentrality: 0,
      eigenvectorCentrality: 0,
      clusteringCoefficient: 0,
      pagerank: 0,
      communityEmbeddedness: 0,
      informationFlowEfficiency: 0,
      timestamp: Date.now()
    };
  }
}

/**
 * Factory function to create a Content-Sharing Network Service
 */
export function createContentSharingNetworkService(
  dkgClient: DKGClientV8,
  config?: ContentSharingNetworkConfig
): ContentSharingNetworkService {
  return new ContentSharingNetworkService(dkgClient, config);
}

