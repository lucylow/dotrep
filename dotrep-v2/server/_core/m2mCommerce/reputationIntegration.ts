/**
 * Reputation Calculator Integration with M2M Commerce
 * 
 * Enhances the reputation calculator with M2M commerce capabilities:
 * - Payment-weighted reputation boosts
 * - Trust-based pricing integration
 * - Autonomous agent payment tracking
 * - x402 protocol payment signals
 */

import { ReputationCalculator } from '../reputationCalculator';
import { TrustBasedPricingEngine } from './trustBasedPricing';
import type { VerifiedPayment } from '../reputationCalculator';

export interface M2MCommerceReputationOptions {
  includePaymentSignals?: boolean;
  includeTrustBasedPricing?: boolean;
  enableAutonomousAgentTracking?: boolean;
}

/**
 * Enhanced Reputation Calculator with M2M Commerce Integration
 * 
 * Extends the base reputation calculator with:
 * - x402 payment signal weighting
 * - Autonomous agent commerce tracking
 * - Trust-based pricing recommendations
 */
export class M2MCommerceReputationCalculator extends ReputationCalculator {
  private pricingEngine: TrustBasedPricingEngine;
  private commerceOptions: M2MCommerceReputationOptions;

  constructor(options: M2MCommerceReputationOptions = {}) {
    super();
    this.pricingEngine = new TrustBasedPricingEngine();
    this.commerceOptions = {
      includePaymentSignals: true,
      includeTrustBasedPricing: true,
      enableAutonomousAgentTracking: true,
      ...options
    };
  }

  /**
   * Calculate reputation with enhanced M2M commerce signals
   * 
   * Adds additional boost for:
   * - x402 protocol payments (autonomous agent commerce)
   * - Verified autonomous agent transactions
   * - High-value M2M transactions
   */
  async calculateReputationWithCommerce(request: any): Promise<any> {
    // Call base reputation calculation
    const baseScore = await this.calculateReputation(request);

    // Enhance with M2M commerce signals if enabled
    if (this.commerceOptions.includePaymentSignals && request.verifiedPayments) {
      const commerceBoost = this.calculateM2MCommerceBoost(request.verifiedPayments);
      
      // Apply commerce boost (up to 10% additional)
      baseScore.overall = Math.min(
        baseScore.overall * (1 + commerceBoost),
        baseScore.overall * 1.10
      );
      
      // Add commerce metadata
      baseScore.m2mCommerce = {
        commerceBoost,
        autonomousAgentPayments: this.countAutonomousAgentPayments(request.verifiedPayments),
        totalM2MValue: this.calculateTotalM2MValue(request.verifiedPayments)
      };
    }

    // Add trust-based pricing recommendations if enabled
    if (this.commerceOptions.includeTrustBasedPricing) {
      baseScore.pricingRecommendations = await this.generatePricingRecommendations(
        baseScore.overall,
        request.userId
      );
    }

    return baseScore;
  }

  /**
   * Calculate M2M commerce boost from payment signals
   * 
   * Rewards:
   * - x402 protocol payments (up to 5% boost)
   * - Autonomous agent transactions (up to 3% boost)
   * - High-value M2M transactions (up to 2% boost)
   */
  private calculateM2MCommerceBoost(payments: VerifiedPayment[]): number {
    if (!payments || payments.length === 0) return 0;

    const verifiedPayments = payments.filter(p => p.verified);
    if (verifiedPayments.length === 0) return 0;

    let boost = 0;
    let x402Count = 0;
    let autonomousAgentCount = 0;
    let totalM2MValue = 0;

    verifiedPayments.forEach(payment => {
      // Check for x402 protocol indicators
      const isX402Payment = 
        payment.currency === 'USDC' || 
        payment.chain !== undefined ||
        (payment as any).x402Protocol === true;

      if (isX402Payment) {
        x402Count++;
        // x402 payments are cryptographically secured and represent autonomous commerce
        boost += 0.001; // 0.1% per x402 payment, max 5%
      }

      // Check for autonomous agent indicators
      const isAutonomousAgent = (payment as any).autonomousAgent === true;
      if (isAutonomousAgent) {
        autonomousAgentCount++;
        boost += 0.0005; // 0.05% per autonomous agent payment, max 3%
      }

      // Track high-value M2M transactions
      if (payment.amount > 10) {
        totalM2MValue += payment.amount;
      }
    });

    // High-value transaction boost (up to 2%)
    if (totalM2MValue > 100) {
      boost += Math.min(0.02, (totalM2MValue / 1000) * 0.02);
    }

    // Cap total boost at 10%
    return Math.min(boost, 0.10);
  }

  /**
   * Count autonomous agent payments
   */
  private countAutonomousAgentPayments(payments: VerifiedPayment[]): number {
    return payments.filter(p => 
      p.verified && (p as any).autonomousAgent === true
    ).length;
  }

  /**
   * Calculate total value of M2M transactions
   */
  private calculateTotalM2MValue(payments: VerifiedPayment[]): number {
    return payments
      .filter(p => p.verified && ((p as any).x402Protocol || (p as any).autonomousAgent))
      .reduce((sum, p) => sum + p.amount, 0);
  }

  /**
   * Generate pricing recommendations based on reputation
   */
  private async generatePricingRecommendations(
    reputationScore: number,
    userId: string
  ): Promise<{
    suggestedBasePrice: string;
    buyerDiscount: number;
    sellerPremium: number;
    reasoning: string;
  }> {
    // Normalize reputation to 0-1 scale (assuming max score is 1000)
    const normalizedRep = Math.max(0, Math.min(1, reputationScore / 1000));

    // Determine pricing tier
    let suggestedBasePrice = '10.00';
    let buyerDiscount = 0;
    let sellerPremium = 0;
    let reasoning = '';

    if (normalizedRep >= 0.9) {
      // Excellent reputation
      suggestedBasePrice = '12.50'; // Can charge premium
      buyerDiscount = 0.20; // Gets discounts
      sellerPremium = 0.25; // Can charge premium
      reasoning = 'Excellent reputation: qualify for maximum discounts and can charge premium prices';
    } else if (normalizedRep >= 0.7) {
      // Good reputation
      suggestedBasePrice = '10.00';
      buyerDiscount = 0.10;
      sellerPremium = 0.10;
      reasoning = 'Good reputation: qualify for discounts and can charge moderate premiums';
    } else if (normalizedRep >= 0.5) {
      // Average reputation
      suggestedBasePrice = '10.00';
      buyerDiscount = 0.0;
      sellerPremium = 0.0;
      reasoning = 'Average reputation: standard pricing applies';
    } else {
      // Low reputation
      suggestedBasePrice = '8.00'; // Must offer discount
      buyerDiscount = 0.0;
      sellerPremium = -0.10; // Must discount
      reasoning = 'Low reputation: must offer discounted prices to compete';
    }

    return {
      suggestedBasePrice,
      buyerDiscount,
      sellerPremium,
      reasoning
    };
  }

  /**
   * Get optimal price for a user based on their reputation
   */
  async getOptimalPriceForUser(params: {
    userId: string;
    basePrice: string;
    userReputation: number;
    counterpartyReputation?: number;
    role: 'buyer' | 'seller';
  }): Promise<string> {
    const { basePrice, userReputation, counterpartyReputation, role } = params;

    if (this.commerceOptions.includeTrustBasedPricing && counterpartyReputation !== undefined) {
      const buyerRep = role === 'buyer' ? userReputation : counterpartyReputation;
      const sellerRep = role === 'seller' ? userReputation : counterpartyReputation;

      return await this.pricingEngine.calculateDynamicPrice({
        basePrice,
        buyerReputation: buyerRep / 1000, // Normalize to 0-1
        sellerReputation: sellerRep / 1000
      });
    }

    // Fallback to base price if trust-based pricing disabled
    return basePrice;
  }
}

/**
 * Factory function to create M2M commerce-enabled reputation calculator
 */
export function createM2MCommerceReputationCalculator(
  options?: M2MCommerceReputationOptions
): M2MCommerceReputationCalculator {
  return new M2MCommerceReputationCalculator(options);
}

