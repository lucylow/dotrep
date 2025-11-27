/**
 * Trust-Based Payment Escrow System
 * Advanced escrow with performance-based releases and slashing
 */

export enum DealStatus {
  CREATED = 'CREATED',
  ACTIVE = 'ACTIVE',
  VERIFICATION_PENDING = 'VERIFICATION_PENDING',
  COMPLETED = 'COMPLETED',
  DISPUTED = 'DISPUTED',
  SLASHED = 'SLASHED'
}

export interface EscrowDeal {
  dealId: string;
  brand: string; // Brand DID/address
  influencer: string; // Influencer DID/address
  totalAmount: bigint; // Total amount in escrow
  releasedAmount: bigint; // Amount already released
  performanceThreshold: number; // Minimum performance score (0-1)
  verificationHash: string; // Hash of verification proof
  status: DealStatus;
  createdAt: number;
  completedAt: number | null;
  performanceProof?: string;
  metadata?: Record<string, unknown>;
}

export interface PerformanceProof {
  engagementRate: number;
  conversions: number;
  qualityRating: number;
  verifiedAt: number;
  verifier: string;
}

export class TrustEscrow {
  private escrowDeals: Map<string, EscrowDeal> = new Map();
  private slashedTokens: Map<string, bigint> = new Map(); // Track slashed amounts by reason

  /**
   * Create an escrow deal
   */
  async createEscrow(
    brand: string,
    influencer: string,
    totalAmount: bigint,
    performanceThreshold: number,
    verificationHash: string,
    metadata?: Record<string, unknown>
  ): Promise<EscrowDeal> {
    const dealId = this.generateDealId(brand, influencer, totalAmount);

    const deal: EscrowDeal = {
      dealId,
      brand,
      influencer,
      totalAmount,
      releasedAmount: BigInt(0),
      performanceThreshold,
      verificationHash,
      status: DealStatus.CREATED,
      createdAt: Date.now(),
      completedAt: null,
      metadata
    };

    this.escrowDeals.set(dealId, deal);
    return deal;
  }

  /**
   * Activate an escrow deal
   */
  async activateDeal(dealId: string): Promise<boolean> {
    const deal = this.escrowDeals.get(dealId);
    if (!deal) {
      throw new Error('Deal not found');
    }

    if (deal.status !== DealStatus.CREATED) {
      throw new Error(`Deal cannot be activated. Current status: ${deal.status}`);
    }

    deal.status = DealStatus.ACTIVE;
    this.escrowDeals.set(dealId, deal);
    return true;
  }

  /**
   * Release payment based on performance
   */
  async releasePayment(
    dealId: string,
    performanceProof: PerformanceProof,
    releaseAmount: bigint,
    isVerifier: boolean = false
  ): Promise<{
    success: boolean;
    releasedAmount: bigint;
    remainingAmount: bigint;
  }> {
    const deal = this.escrowDeals.get(dealId);
    if (!deal) {
      throw new Error('Deal not found');
    }

    if (deal.status !== DealStatus.ACTIVE) {
      throw new Error(`Deal is not active. Current status: ${deal.status}`);
    }

    // Verify performance proof hash
    const proofHash = this.hashPerformanceProof(performanceProof);
    if (proofHash !== deal.verificationHash) {
      throw new Error('Invalid performance proof');
    }

    // Calculate performance score
    const performanceScore = this.calculatePerformanceScore(performanceProof);
    
    // Check if performance meets threshold
    if (performanceScore < deal.performanceThreshold) {
      throw new Error(`Performance score ${performanceScore} below threshold ${deal.performanceThreshold}`);
    }

    // Calculate releasable amount based on performance
    const calculatedRelease = this.calculateReleasableAmount(
      deal,
      performanceProof,
      releaseAmount
    );

    // Ensure we don't release more than available
    const availableAmount = deal.totalAmount - deal.releasedAmount;
    const actualRelease = calculatedRelease > availableAmount ? availableAmount : calculatedRelease;

    deal.releasedAmount += actualRelease;
    deal.performanceProof = JSON.stringify(performanceProof);
    deal.metadata = {
      ...deal.metadata,
      lastRelease: {
        amount: actualRelease.toString(),
        timestamp: Date.now(),
        performanceScore
      }
    };

    // Check if deal is complete
    if (deal.releasedAmount >= deal.totalAmount) {
      deal.status = DealStatus.COMPLETED;
      deal.completedAt = Date.now();
    }

    this.escrowDeals.set(dealId, deal);

    return {
      success: true,
      releasedAmount: actualRelease,
      remainingAmount: deal.totalAmount - deal.releasedAmount
    };
  }

  /**
   * Slash escrow due to fraud or abuse
   */
  async slashEscrow(
    dealId: string,
    slashReason: string,
    slashPercentage: number, // 0-100
    isArbitrator: boolean = false
  ): Promise<{
    success: boolean;
    slashedAmount: bigint;
    refundAmount: bigint;
  }> {
    if (!isArbitrator) {
      throw new Error('Only arbitrators can slash escrow');
    }

    const deal = this.escrowDeals.get(dealId);
    if (!deal) {
      throw new Error('Deal not found');
    }

    if (deal.status === DealStatus.COMPLETED || deal.status === DealStatus.SLASHED) {
      throw new Error('Cannot slash completed or already slashed deal');
    }

    const slashAmount = (deal.totalAmount * BigInt(slashPercentage)) / BigInt(100);
    const refundAmount = deal.totalAmount - slashAmount;

    deal.status = DealStatus.SLASHED;
    deal.metadata = {
      ...deal.metadata,
      slashReason,
      slashPercentage,
      slashedAmount: slashAmount.toString(),
      refundAmount: refundAmount.toString(),
      slashedAt: Date.now()
    };

    this.escrowDeals.set(dealId, deal);

    // Track slashed tokens
    const currentSlashed = this.slashedTokens.get(slashReason) || BigInt(0);
    this.slashedTokens.set(slashReason, currentSlashed + slashAmount);

    return {
      success: true,
      slashedAmount: slashAmount,
      refundAmount
    };
  }

  /**
   * Dispute an escrow deal
   */
  async disputeDeal(dealId: string, disputeReason: string): Promise<boolean> {
    const deal = this.escrowDeals.get(dealId);
    if (!deal) {
      throw new Error('Deal not found');
    }

    if (deal.status === DealStatus.COMPLETED || deal.status === DealStatus.SLASHED) {
      throw new Error('Cannot dispute completed or slashed deal');
    }

    deal.status = DealStatus.DISPUTED;
    deal.metadata = {
      ...deal.metadata,
      disputeReason,
      disputedAt: Date.now()
    };

    this.escrowDeals.set(dealId, deal);
    return true;
  }

  /**
   * Get deal by ID
   */
  getDeal(dealId: string): EscrowDeal | null {
    return this.escrowDeals.get(dealId) || null;
  }

  /**
   * Get deals for a user
   */
  getUserDeals(userDID: string, status?: DealStatus): EscrowDeal[] {
    const deals: EscrowDeal[] = [];

    for (const deal of this.escrowDeals.values()) {
      if ((deal.brand === userDID || deal.influencer === userDID) &&
          (!status || deal.status === status)) {
        deals.push(deal);
      }
    }

    return deals.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Calculate performance score from proof
   */
  private calculatePerformanceScore(proof: PerformanceProof): number {
    // Weighted average of metrics
    const weights = {
      engagementRate: 0.4,
      conversions: 0.3,
      qualityRating: 0.3
    };

    // Normalize metrics to 0-1 scale
    const normalizedEngagement = Math.min(proof.engagementRate / 0.1, 1); // 10% = perfect
    const normalizedConversions = Math.min(proof.conversions / 1000, 1); // 1000 = perfect
    const normalizedQuality = proof.qualityRating / 5; // 5 = perfect

    return (
      normalizedEngagement * weights.engagementRate +
      normalizedConversions * weights.conversions +
      normalizedQuality * weights.qualityRating
    );
  }

  /**
   * Calculate releasable amount based on performance
   */
  private calculateReleasableAmount(
    deal: EscrowDeal,
    proof: PerformanceProof,
    requestedAmount: bigint
  ): bigint {
    const performanceScore = this.calculatePerformanceScore(proof);
    
    // Base release: percentage of total based on performance
    const performanceBasedRelease = (deal.totalAmount * BigInt(Math.floor(performanceScore * 100))) / BigInt(100);
    
    // Use the minimum of requested amount and performance-based amount
    return performanceBasedRelease < requestedAmount ? performanceBasedRelease : requestedAmount;
  }

  /**
   * Hash performance proof
   */
  private hashPerformanceProof(proof: PerformanceProof): string {
    const data = JSON.stringify({
      engagementRate: proof.engagementRate,
      conversions: proof.conversions,
      qualityRating: proof.qualityRating,
      verifiedAt: proof.verifiedAt
    });
    // In production, use proper hash function
    return Buffer.from(data).toString('base64').slice(0, 32);
  }

  /**
   * Generate unique deal ID
   */
  private generateDealId(brand: string, influencer: string, amount: bigint): string {
    const timestamp = Date.now();
    const data = `${brand}_${influencer}_${amount.toString()}_${timestamp}`;
    return `deal_${Buffer.from(data).toString('base64').slice(0, 32)}`;
  }

  /**
   * Get slashing statistics
   */
  getSlashingStatistics(): {
    totalSlashed: bigint;
    byReason: Record<string, bigint>;
    totalDeals: number;
    slashedDeals: number;
  } {
    const byReason: Record<string, bigint> = {};
    let totalSlashed = BigInt(0);
    let slashedDeals = 0;

    for (const [reason, amount] of this.slashedTokens.entries()) {
      byReason[reason] = amount;
      totalSlashed += amount;
    }

    for (const deal of this.escrowDeals.values()) {
      if (deal.status === DealStatus.SLASHED) {
        slashedDeals++;
      }
    }

    return {
      totalSlashed,
      byReason,
      totalDeals: this.escrowDeals.size,
      slashedDeals
    };
  }
}

// Singleton instance
let escrowInstance: TrustEscrow | null = null;

export function getTrustEscrow(): TrustEscrow {
  if (!escrowInstance) {
    escrowInstance = new TrustEscrow();
  }
  return escrowInstance;
}

