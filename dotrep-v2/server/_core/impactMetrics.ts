/**
 * Impact Metrics Service
 * 
 * Tracks measurable outcomes for "Impact & Relevance" scoring:
 * - Accuracy improvements (before/after DKG)
 * - Citation rates (UALs per answer)
 * - Provenance scores
 * - Sybil detection accuracy
 * - x402 payment success rates
 * - Community Notes published
 * - Ecosystem usability improvements
 * 
 * These metrics demonstrate real-world value and measurable outcomes
 * for misinformation defense, decentralized governance, identity verification,
 * and transparent data economy.
 */

export interface AccuracyMetrics {
  baselineAccuracy: number; // Accuracy without DKG (0-1)
  dkgAccuracy: number; // Accuracy with DKG (0-1)
  improvement: number; // Percentage improvement
  testCases: number;
  hallucinationsReduced: number; // Count of hallucinations prevented
  timestamp: number;
}

export interface CitationMetrics {
  totalAnswers: number;
  answersWithCitations: number;
  citationRate: number; // Percentage (0-100)
  averageCitationsPerAnswer: number;
  uniqueUALsCited: number;
  timestamp: number;
}

export interface ProvenanceMetrics {
  totalAssets: number;
  averageProvenanceScore: number;
  highProvenanceAssets: number; // Score >= 80
  verifiedAssets: number;
  timestamp: number;
}

export interface SybilDetectionMetrics {
  totalAccounts: number;
  sybilAccountsDetected: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number; // True positives / (True positives + False positives)
  recall: number; // True positives / (True positives + False negatives)
  accuracy: number; // (True positives + True negatives) / Total
  reputationLift: number; // Average reputation improvement after filtering
  timestamp: number;
}

export interface X402PaymentMetrics {
  totalRequests: number;
  successfulPayments: number;
  failedPayments: number;
  successRate: number; // Percentage (0-100)
  averageLatency: number; // Milliseconds
  receiptsPublished: number;
  totalRevenue: number; // In smallest unit
  timestamp: number;
}

export interface CommunityNotesMetrics {
  notesPublished: number;
  notesByType: {
    misinformation: number;
    correction: number;
    verification: number;
    other: number;
  };
  averageReputationOfAuthors: number;
  notesWithEvidence: number;
  timestamp: number;
}

export interface GovernanceMetrics {
  proposalsCreated: number;
  proposalsPassed: number;
  participationRate: number; // Percentage
  averageReputationOfVoters: number;
  crossChainProposals: number;
  timestamp: number;
}

export interface IdentityVerificationMetrics {
  credentialsIssued: number;
  verificationPassRate: number; // Percentage
  sybilResistanceImprovement: number; // Percentage reduction in suspicious nodes
  averageVerificationTime: number; // Milliseconds
  timestamp: number;
}

export interface EcosystemUsabilityMetrics {
  setupTimeReduction: number; // Percentage reduction
  onboardingSuccessRate: number; // Percentage
  developerSatisfaction: number; // 0-100 score
  apiLatency: number; // Milliseconds
  timestamp: number;
}

export interface ImpactMetrics {
  accuracy: AccuracyMetrics;
  citations: CitationMetrics;
  provenance: ProvenanceMetrics;
  sybilDetection: SybilDetectionMetrics;
  x402Payments: X402PaymentMetrics;
  communityNotes: CommunityNotesMetrics;
  governance: GovernanceMetrics;
  identityVerification: IdentityVerificationMetrics;
  ecosystemUsability: EcosystemUsabilityMetrics;
  lastUpdated: number;
}

/**
 * Impact Metrics Service
 */
export class ImpactMetricsService {
  private metrics: ImpactMetrics;
  private metricsHistory: ImpactMetrics[] = [];
  private maxHistorySize: number = 1000;

  constructor() {
    this.metrics = this.initializeMetrics();
  }

  /**
   * Initialize empty metrics
   */
  private initializeMetrics(): ImpactMetrics {
    const now = Date.now();
    return {
      accuracy: {
        baselineAccuracy: 0,
        dkgAccuracy: 0,
        improvement: 0,
        testCases: 0,
        hallucinationsReduced: 0,
        timestamp: now,
      },
      citations: {
        totalAnswers: 0,
        answersWithCitations: 0,
        citationRate: 0,
        averageCitationsPerAnswer: 0,
        uniqueUALsCited: 0,
        timestamp: now,
      },
      provenance: {
        totalAssets: 0,
        averageProvenanceScore: 0,
        highProvenanceAssets: 0,
        verifiedAssets: 0,
        timestamp: now,
      },
      sybilDetection: {
        totalAccounts: 0,
        sybilAccountsDetected: 0,
        truePositives: 0,
        falsePositives: 0,
        falseNegatives: 0,
        precision: 0,
        recall: 0,
        accuracy: 0,
        reputationLift: 0,
        timestamp: now,
      },
      x402Payments: {
        totalRequests: 0,
        successfulPayments: 0,
        failedPayments: 0,
        successRate: 0,
        averageLatency: 0,
        receiptsPublished: 0,
        totalRevenue: 0,
        timestamp: now,
      },
      communityNotes: {
        notesPublished: 0,
        notesByType: {
          misinformation: 0,
          correction: 0,
          verification: 0,
          other: 0,
        },
        averageReputationOfAuthors: 0,
        notesWithEvidence: 0,
        timestamp: now,
      },
      governance: {
        proposalsCreated: 0,
        proposalsPassed: 0,
        participationRate: 0,
        averageReputationOfVoters: 0,
        crossChainProposals: 0,
        timestamp: now,
      },
      identityVerification: {
        credentialsIssued: 0,
        verificationPassRate: 0,
        sybilResistanceImprovement: 0,
        averageVerificationTime: 0,
        timestamp: now,
      },
      ecosystemUsability: {
        setupTimeReduction: 0,
        onboardingSuccessRate: 0,
        developerSatisfaction: 0,
        apiLatency: 0,
        timestamp: now,
      },
      lastUpdated: now,
    };
  }

  /**
   * Record accuracy metrics (before/after DKG)
   */
  recordAccuracy(
    baselineAccuracy: number,
    dkgAccuracy: number,
    testCases: number,
    hallucinationsReduced: number
  ): void {
    const improvement = ((dkgAccuracy - baselineAccuracy) / baselineAccuracy) * 100;
    
    this.metrics.accuracy = {
      baselineAccuracy,
      dkgAccuracy,
      improvement,
      testCases,
      hallucinationsReduced,
      timestamp: Date.now(),
    };
    
    this.saveSnapshot();
  }

  /**
   * Record citation metrics
   */
  recordCitation(
    hasCitation: boolean,
    citationCount: number,
    ual?: string
  ): void {
    this.metrics.citations.totalAnswers++;
    
    if (hasCitation) {
      this.metrics.citations.answersWithCitations++;
    }
    
    // Update average citations
    const currentTotal = this.metrics.citations.averageCitationsPerAnswer * 
                        (this.metrics.citations.totalAnswers - 1);
    this.metrics.citations.averageCitationsPerAnswer = 
      (currentTotal + citationCount) / this.metrics.citations.totalAnswers;
    
    // Track unique UALs
    if (ual) {
      // In production, would use a Set to track unique UALs
      this.metrics.citations.uniqueUALsCited++;
    }
    
    // Update citation rate
    this.metrics.citations.citationRate = 
      (this.metrics.citations.answersWithCitations / 
       this.metrics.citations.totalAnswers) * 100;
    
    this.metrics.citations.timestamp = Date.now();
    this.saveSnapshot();
  }

  /**
   * Record provenance metrics
   */
  recordProvenance(
    totalAssets: number,
    averageScore: number,
    highProvenanceCount: number,
    verifiedCount: number
  ): void {
    this.metrics.provenance = {
      totalAssets,
      averageProvenanceScore: averageScore,
      highProvenanceAssets: highProvenanceCount,
      verifiedAssets: verifiedCount,
      timestamp: Date.now(),
    };
    
    this.saveSnapshot();
  }

  /**
   * Record Sybil detection metrics
   */
  recordSybilDetection(
    totalAccounts: number,
    sybilDetected: number,
    truePositives: number,
    falsePositives: number,
    falseNegatives: number,
    reputationLift: number
  ): void {
    const precision = truePositives / (truePositives + falsePositives) || 0;
    const recall = truePositives / (truePositives + falseNegatives) || 0;
    const trueNegatives = totalAccounts - truePositives - falsePositives - falseNegatives;
    const accuracy = (truePositives + trueNegatives) / totalAccounts || 0;
    
    this.metrics.sybilDetection = {
      totalAccounts,
      sybilAccountsDetected: sybilDetected,
      truePositives,
      falsePositives,
      falseNegatives,
      precision,
      recall,
      accuracy,
      reputationLift,
      timestamp: Date.now(),
    };
    
    this.saveSnapshot();
  }

  /**
   * Record x402 payment metrics
   */
  recordX402Payment(
    success: boolean,
    latency: number,
    receiptPublished: boolean,
    amount?: number
  ): void {
    this.metrics.x402Payments.totalRequests++;
    
    if (success) {
      this.metrics.x402Payments.successfulPayments++;
    } else {
      this.metrics.x402Payments.failedPayments++;
    }
    
    // Update average latency
    const currentTotal = this.metrics.x402Payments.averageLatency * 
                        (this.metrics.x402Payments.totalRequests - 1);
    this.metrics.x402Payments.averageLatency = 
      (currentTotal + latency) / this.metrics.x402Payments.totalRequests;
    
    if (receiptPublished) {
      this.metrics.x402Payments.receiptsPublished++;
    }
    
    if (amount) {
      this.metrics.x402Payments.totalRevenue += amount;
    }
    
    // Update success rate
    this.metrics.x402Payments.successRate = 
      (this.metrics.x402Payments.successfulPayments / 
       this.metrics.x402Payments.totalRequests) * 100;
    
    this.metrics.x402Payments.timestamp = Date.now();
    this.saveSnapshot();
  }

  /**
   * Record Community Note publication
   */
  recordCommunityNote(
    type: 'misinformation' | 'correction' | 'verification' | 'other',
    authorReputation: number,
    hasEvidence: boolean
  ): void {
    this.metrics.communityNotes.notesPublished++;
    this.metrics.communityNotes.notesByType[type]++;
    
    // Update average reputation
    const currentTotal = this.metrics.communityNotes.averageReputationOfAuthors * 
                        (this.metrics.communityNotes.notesPublished - 1);
    this.metrics.communityNotes.averageReputationOfAuthors = 
      (currentTotal + authorReputation) / this.metrics.communityNotes.notesPublished;
    
    if (hasEvidence) {
      this.metrics.communityNotes.notesWithEvidence++;
    }
    
    this.metrics.communityNotes.timestamp = Date.now();
    this.saveSnapshot();
  }

  /**
   * Record governance metrics
   */
  recordGovernance(
    proposalCreated: boolean,
    proposalPassed?: boolean,
    voterReputation?: number,
    isCrossChain?: boolean
  ): void {
    if (proposalCreated) {
      this.metrics.governance.proposalsCreated++;
      
      if (isCrossChain) {
        this.metrics.governance.crossChainProposals++;
      }
    }
    
    if (proposalPassed) {
      this.metrics.governance.proposalsPassed++;
    }
    
    if (voterReputation !== undefined) {
      // Update average reputation of voters
      const currentTotal = this.metrics.governance.averageReputationOfVoters * 
                          (this.metrics.governance.proposalsCreated - 1);
      this.metrics.governance.averageReputationOfVoters = 
        (currentTotal + voterReputation) / this.metrics.governance.proposalsCreated;
    }
    
    this.metrics.governance.timestamp = Date.now();
    this.saveSnapshot();
  }

  /**
   * Record identity verification metrics
   */
  recordIdentityVerification(
    credentialIssued: boolean,
    verificationPassed: boolean,
    verificationTime: number,
    sybilResistanceImprovement?: number
  ): void {
    if (credentialIssued) {
      this.metrics.identityVerification.credentialsIssued++;
    }
    
    if (verificationPassed) {
      const currentTotal = this.metrics.identityVerification.verificationPassRate * 
                          (this.metrics.identityVerification.credentialsIssued - 1);
      this.metrics.identityVerification.verificationPassRate = 
        (currentTotal + 100) / this.metrics.identityVerification.credentialsIssued;
    }
    
    // Update average verification time
    if (verificationTime > 0) {
      const currentTotal = this.metrics.identityVerification.averageVerificationTime * 
                          (this.metrics.identityVerification.credentialsIssued - 1);
      this.metrics.identityVerification.averageVerificationTime = 
        (currentTotal + verificationTime) / this.metrics.identityVerification.credentialsIssued;
    }
    
    if (sybilResistanceImprovement !== undefined) {
      this.metrics.identityVerification.sybilResistanceImprovement = 
        sybilResistanceImprovement;
    }
    
    this.metrics.identityVerification.timestamp = Date.now();
    this.saveSnapshot();
  }

  /**
   * Record ecosystem usability metrics
   */
  recordEcosystemUsability(
    setupTimeReduction?: number,
    onboardingSuccess?: boolean,
    satisfactionScore?: number,
    apiLatency?: number
  ): void {
    if (setupTimeReduction !== undefined) {
      this.metrics.ecosystemUsability.setupTimeReduction = setupTimeReduction;
    }
    
    if (onboardingSuccess !== undefined) {
      // Track onboarding success rate
      const currentTotal = this.metrics.ecosystemUsability.onboardingSuccessRate * 100;
      this.metrics.ecosystemUsability.onboardingSuccessRate = 
        onboardingSuccess ? currentTotal + 1 : currentTotal;
    }
    
    if (satisfactionScore !== undefined) {
      this.metrics.ecosystemUsability.developerSatisfaction = satisfactionScore;
    }
    
    if (apiLatency !== undefined) {
      this.metrics.ecosystemUsability.apiLatency = apiLatency;
    }
    
    this.metrics.ecosystemUsability.timestamp = Date.now();
    this.saveSnapshot();
  }

  /**
   * Get current metrics
   */
  getMetrics(): ImpactMetrics {
    return { ...this.metrics };
  }

  /**
   * Get metrics summary for judges/demo
   */
  getMetricsSummary(): {
    accuracyImprovement: string;
    citationRate: string;
    sybilDetectionAccuracy: string;
    x402SuccessRate: string;
    communityNotesPublished: number;
    provenanceScore: string;
    keyMetrics: Array<{ label: string; value: string; improvement?: string }>;
  } {
    const acc = this.metrics.accuracy;
    const cit = this.metrics.citations;
    const sybil = this.metrics.sybilDetection;
    const x402 = this.metrics.x402Payments;
    const notes = this.metrics.communityNotes;
    const prov = this.metrics.provenance;

    return {
      accuracyImprovement: `${acc.improvement.toFixed(1)}%`,
      citationRate: `${cit.citationRate.toFixed(1)}%`,
      sybilDetectionAccuracy: `${(sybil.accuracy * 100).toFixed(1)}%`,
      x402SuccessRate: `${x402.successRate.toFixed(1)}%`,
      communityNotesPublished: notes.notesPublished,
      provenanceScore: `${prov.averageProvenanceScore.toFixed(1)}/100`,
      keyMetrics: [
        {
          label: 'Accuracy Improvement',
          value: `${acc.improvement.toFixed(1)}%`,
          improvement: `Hallucinations reduced: ${acc.hallucinationsReduced}`
        },
        {
          label: 'Citation Rate',
          value: `${cit.citationRate.toFixed(1)}%`,
          improvement: `Avg ${cit.averageCitationsPerAnswer.toFixed(1)} citations per answer`
        },
        {
          label: 'Sybil Detection',
          value: `${(sybil.accuracy * 100).toFixed(1)}%`,
          improvement: `Precision: ${(sybil.precision * 100).toFixed(1)}%, Recall: ${(sybil.recall * 100).toFixed(1)}%`
        },
        {
          label: 'x402 Payments',
          value: `${x402.successRate.toFixed(1)}% success`,
          improvement: `Avg latency: ${x402.averageLatency.toFixed(0)}ms`
        },
        {
          label: 'Provenance Score',
          value: `${prov.averageProvenanceScore.toFixed(1)}/100`,
          improvement: `${prov.highProvenanceAssets} high-quality assets`
        },
      ],
    };
  }

  /**
   * Save snapshot to history
   */
  private saveSnapshot(): void {
    this.metrics.lastUpdated = Date.now();
    this.metricsHistory.push({ ...this.metrics });
    
    // Limit history size
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift();
    }
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(limit?: number): ImpactMetrics[] {
    if (limit) {
      return this.metricsHistory.slice(-limit);
    }
    return [...this.metricsHistory];
  }

  /**
   * Reset metrics (for testing)
   */
  reset(): void {
    this.metrics = this.initializeMetrics();
    this.metricsHistory = [];
  }
}

// Singleton instance
let impactMetricsInstance: ImpactMetricsService | null = null;

export function getImpactMetrics(): ImpactMetricsService {
  if (!impactMetricsInstance) {
    impactMetricsInstance = new ImpactMetricsService();
  }
  return impactMetricsInstance;
}

