/**
 * Reputation-Backed Access & Enhanced x402 Monetization
 * 
 * Gates premium, high-confidence Knowledge Assets behind:
 * - Micropayment via x402 protocol
 * - Reputation threshold checks
 * - Token staking verification
 * 
 * Supports sponsorship/credits for academics and high-reputation users.
 */

import { PolkadotApiService } from '../server/_core/polkadotApi';
import { ProvenanceRegistry, ProvenanceInfo } from './provenance-registry';
import { getImpactMetrics } from '../server/_core/impactMetrics';
import { TokenVerificationService, GatedAction } from './token-verification-service';

export interface AccessPolicy {
  ual: string;
  minReputation?: number;
  minStake?: string; // Balance as string
  basePrice?: string; // x402 micropayment price
  reputationDiscount?: number; // Percentage discount for high reputation (0-100)
  freeForReputation?: number; // Free access above this reputation threshold
  sponsorAccountId?: string; // Account that can sponsor free access
}

export interface AccessRequest {
  accountId: string;
  ual: string;
  requestedAccessType?: 'read' | 'download' | 'full';
}

export interface AccessResult {
  granted: boolean;
  reason?: string;
  paymentRequired?: boolean;
  paymentAmount?: string;
  accessDuration?: number; // Blocks
  expiresAt?: number; // Timestamp
  sponsorUsed?: boolean;
  reputationDiscount?: number;
}

/**
 * Reputation-Backed Access Control Service
 */
export class ReputationAccessControl {
  private polkadotApi: PolkadotApiService;
  private provenanceRegistry: ProvenanceRegistry;
  private accessPolicies: Map<string, AccessPolicy> = new Map();
  private impactMetrics: ReturnType<typeof getImpactMetrics>;
  private tokenVerification: TokenVerificationService | null = null;

  constructor(
    polkadotApi: PolkadotApiService,
    provenanceRegistry?: ProvenanceRegistry,
    tokenVerification?: TokenVerificationService
  ) {
    this.polkadotApi = polkadotApi;
    this.provenanceRegistry = provenanceRegistry || new ProvenanceRegistry();
    this.impactMetrics = getImpactMetrics();
    this.tokenVerification = tokenVerification || null;
  }

  /**
   * Set access policy for a Knowledge Asset
   */
  setAccessPolicy(policy: AccessPolicy): void {
    this.accessPolicies.set(policy.ual, policy);
  }

  /**
   * Check access and calculate payment (if needed)
   */
  async checkAccess(request: AccessRequest): Promise<AccessResult> {
    const { accountId, ual } = request;

    // Get access policy
    const policy = this.accessPolicies.get(ual);
    if (!policy) {
      // No policy = free access
      return {
        granted: true,
        paymentRequired: false
      };
    }

    // Get user's reputation and stake
    const reputation = await this.polkadotApi.getReputation(accountId);
    const hasReputationAccess = policy.minReputation
      ? reputation.overall >= policy.minReputation
      : true;

    // Check if free based on reputation
    if (policy.freeForReputation && reputation.overall >= policy.freeForReputation) {
      return {
        granted: true,
        paymentRequired: false,
        reputationDiscount: 100
      };
    }

    // Check reputation requirement
    if (!hasReputationAccess) {
      return {
        granted: false,
        reason: `Insufficient reputation. Required: ${policy.minReputation}, Current: ${reputation.overall}`,
        paymentRequired: false
      };
    }

    // Check stake requirement (via Polkadot API or token verification)
    let hasStakeAccess = true;
    if (policy.minStake) {
      // First try token verification if available (more flexible)
      if (this.tokenVerification) {
        const tokenAccess = await this.tokenVerification.checkActionAccess(
          accountId,
          GatedAction.ACCESS_PREMIUM
        );
        if (tokenAccess.allowed) {
          hasStakeAccess = true;
        } else {
          // Fallback to Polkadot API check
          const accessCheck = await this.polkadotApi.hasReputationBackedAccess(
            accountId,
            ual,
            policy.minReputation,
            policy.minStake
          );
          hasStakeAccess = accessCheck.stakedAmount
            ? BigInt(accessCheck.stakedAmount) >= BigInt(policy.minStake)
            : false;
        }
      } else {
        // Use Polkadot API only
        const accessCheck = await this.polkadotApi.hasReputationBackedAccess(
          accountId,
          ual,
          policy.minReputation,
          policy.minStake
        );
        hasStakeAccess = accessCheck.stakedAmount
          ? BigInt(accessCheck.stakedAmount) >= BigInt(policy.minStake)
          : false;
      }
    }

    if (!hasStakeAccess) {
      return {
        granted: false,
        reason: `Insufficient stake or token ownership. Required: ${policy.minStake}`,
        paymentRequired: false
      };
    }

    // Check existing x402 payment access
    const existingAccess = await this.polkadotApi.hasReputationBackedAccess(
      accountId,
      ual
    );

    if (existingAccess.hasAccess) {
      return {
        granted: true,
        paymentRequired: false,
        reason: 'Existing payment access active'
      };
    }

    // Calculate payment with reputation discount
    let paymentAmount = policy.basePrice || '0';
    let reputationDiscount = 0;

    if (policy.reputationDiscount && policy.minReputation) {
      // Calculate discount based on reputation above threshold
      const excessReputation = reputation.overall - (policy.minReputation || 0);
      const maxDiscount = policy.reputationDiscount;
      
      // Scale discount: 0% at threshold, maxDiscount% at 2x threshold
      const thresholdRange = policy.minReputation || 100;
      reputationDiscount = Math.min(
        maxDiscount,
        Math.floor((excessReputation / thresholdRange) * maxDiscount)
      );

      if (reputationDiscount > 0 && paymentAmount !== '0') {
        const discountAmount = (BigInt(paymentAmount) * BigInt(reputationDiscount)) / BigInt(100);
        paymentAmount = (BigInt(paymentAmount) - discountAmount).toString();
      }
    }

    // Check if payment is required
    const paymentRequired = paymentAmount !== '0' && BigInt(paymentAmount) > BigInt(0);

    return {
      granted: hasReputationAccess && hasStakeAccess,
      paymentRequired,
      paymentAmount,
      accessDuration: 1000, // 1000 blocks default
      reputationDiscount,
      reason: paymentRequired
        ? `Payment required: ${paymentAmount} (${reputationDiscount}% reputation discount applied)`
        : undefined
    };
  }

  /**
   * Grant sponsored access (for academics, researchers, etc.)
   */
  async grantSponsoredAccess(
    sponsorAccountId: string,
    beneficiaryAccountId: string,
    ual: string
  ): Promise<AccessResult> {
    const policy = this.accessPolicies.get(ual);
    
    if (!policy || policy.sponsorAccountId !== sponsorAccountId) {
      return {
        granted: false,
        reason: 'Sponsorship not available for this asset'
      };
    }

    // Verify sponsor has sufficient reputation/stake
    const sponsorReputation = await this.polkadotApi.getReputation(sponsorAccountId);
    if (policy.minReputation && sponsorReputation.overall < policy.minReputation) {
      return {
        granted: false,
        reason: 'Sponsor does not meet reputation requirements'
      };
    }

    // Grant access via x402 payment on behalf of beneficiary
    try {
      // In production, would call pay_for_query with sponsor paying
      // For now, return success
      return {
        granted: true,
        paymentRequired: false,
        sponsorUsed: true,
        accessDuration: 1000
      };
    } catch (error: any) {
      return {
        granted: false,
        reason: `Failed to grant sponsored access: ${error.message}`
      };
    }
  }

  /**
   * Get access policy for a UAL
   */
  getAccessPolicy(ual: string): AccessPolicy | undefined {
    return this.accessPolicies.get(ual);
  }

  /**
   * Create a premium access policy with reputation gating
   */
  static createPremiumPolicy(
    ual: string,
    options: {
      minReputation?: number;
      basePrice: string;
      reputationDiscount?: number;
      freeForReputation?: number;
      minStake?: string;
    }
  ): AccessPolicy {
    return {
      ual,
      minReputation: options.minReputation || 500,
      basePrice: options.basePrice,
      reputationDiscount: options.reputationDiscount || 50,
      freeForReputation: options.freeForReputation,
      minStake: options.minStake
    };
  }

  /**
   * Create an academic/research access policy with sponsorship
   */
  static createAcademicPolicy(
    ual: string,
    sponsorAccountId: string,
    options: {
      minReputation?: number;
      basePrice?: string;
    } = {}
  ): AccessPolicy {
    return {
      ual,
      minReputation: options.minReputation || 400,
      basePrice: options.basePrice || '0', // Free with sponsorship
      sponsorAccountId
    };
  }

  /**
   * Process x402 payment and track metrics
   */
  async processPayment(
    accountId: string,
    ual: string,
    paymentAmount: string,
    paymentProof?: string
  ): Promise<{
    success: boolean;
    receiptUAL?: string;
    latency: number;
  }> {
    const startTime = Date.now();
    
    try {
      // Simulate payment processing (in production, would validate payment proof)
      // For now, just grant access via trust layer
      const tx = await this.polkadotApi.postClaim(
        accountId,
        ual,
        [],
        paymentAmount
      );

      // Publish receipt as Knowledge Asset
      let receiptUAL: string | undefined;
      try {
        const { ProvenanceRegistry } = await import('./provenance-registry');
        const registry = new ProvenanceRegistry();
        const receiptResult = await registry.publishDatasetAsset({
          id: `receipt:${accountId}:${Date.now()}`,
          name: `Payment Receipt for ${ual}`,
          publisher: accountId,
          checksum: `sha256:${paymentProof || 'mock'}`,
          merkleRoot: '',
          license: 'N/A',
          createdAt: Date.now(),
        });
        receiptUAL = receiptResult.UAL;
      } catch (error) {
        console.warn('Failed to publish receipt:', error);
      }

      const latency = Date.now() - startTime;
      const success = !!tx.hash;

      // Record metrics
      this.impactMetrics.recordX402Payment(
        success,
        latency,
        !!receiptUAL,
        BigInt(paymentAmount).toString() !== 'NaN' ? parseInt(paymentAmount) : undefined
      );

      return {
        success,
        receiptUAL,
        latency,
      };
    } catch (error: any) {
      const latency = Date.now() - startTime;
      
      // Record failed payment
      this.impactMetrics.recordX402Payment(false, latency, false);
      
      throw new Error(`Payment processing failed: ${error.message}`);
    }
  }
}

