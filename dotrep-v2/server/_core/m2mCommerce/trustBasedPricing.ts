/**
 * Trust-Based Dynamic Pricing Engine for M2M Commerce
 * 
 * Implements reputation-aware pricing where:
 * - Higher reputation buyers get discounts
 * - Higher reputation sellers can charge premiums
 * - Pricing adjusts dynamically based on trust signals
 * 
 * This creates economic incentives for good behavior and
 * makes the marketplace self-regulating.
 */

import type { TrustBasedPricingConfig } from './types';

export class TrustBasedPricingEngine {
  /**
   * Calculate dynamic price based on buyer and seller reputation
   * 
   * Pricing formula:
   * adjusted_price = base_price * (1 - buyer_discount) * (1 + seller_premium)
   * 
   * - Buyer discount: up to 20% for excellent reputation (0.9+)
   * - Seller premium: up to 25% for excellent reputation (0.9+)
   * - Low reputation sellers must offer discount (up to 10%)
   * 
   * @param config - Pricing configuration
   * @returns Adjusted price as string with 6 decimal precision
   */
  async calculateDynamicPrice(config: TrustBasedPricingConfig): Promise<string> {
    const {
      basePrice,
      buyerReputation,
      sellerReputation,
      minPriceMultiplier = 0.5,
      maxPriceMultiplier = 2.0
    } = config;

    // Calculate buyer discount
    const buyerDiscount = this.calculateBuyerDiscount(buyerReputation);
    
    // Calculate seller premium
    const sellerPremium = this.calculateSellerPremium(sellerReputation);
    
    // Apply adjustments
    const basePriceFloat = parseFloat(basePrice);
    let adjustedPrice = basePriceFloat * (1 - buyerDiscount) * (1 + sellerPremium);
    
    // Ensure price is within bounds
    const minPrice = basePriceFloat * minPriceMultiplier;
    const maxPrice = basePriceFloat * maxPriceMultiplier;
    adjustedPrice = Math.max(minPrice, Math.min(adjustedPrice, maxPrice));
    
    // Return with 6 decimal precision
    return adjustedPrice.toFixed(6);
  }

  /**
   * Calculate buyer discount based on reputation
   * 
   * Discount tiers:
   * - 0.9+ (excellent): 20% discount
   * - 0.7-0.9 (good): 10% discount
   * - 0.5-0.7 (average): 0% discount
   * - <0.5 (low): 0% discount (no penalty, but no benefit)
   */
  private calculateBuyerDiscount(reputation: number): number {
    // Clamp reputation to 0-1
    const clampedRep = Math.max(0, Math.min(1, reputation));

    // Excellent reputation (0.9+) gets 20% discount
    if (clampedRep >= 0.9) {
      return 0.20;
    }
    
    // Good reputation (0.7-0.9) gets 10% discount
    if (clampedRep >= 0.7) {
      return 0.10;
    }
    
    // Average reputation (0.5-0.7) gets no discount
    if (clampedRep >= 0.5) {
      return 0.0;
    }
    
    // Low reputation gets no discount
    return 0.0;
  }

  /**
   * Calculate seller premium based on reputation
   * 
   * Premium tiers:
   * - 0.9+ (excellent): 25% premium
   * - 0.7-0.9 (good): 10% premium
   * - 0.5-0.7 (average): 0% premium
   * - <0.5 (low): -10% discount (must offer lower price)
   */
  private calculateSellerPremium(reputation: number): number {
    // Clamp reputation to 0-1
    const clampedRep = Math.max(0, Math.min(1, reputation));

    // Excellent reputation sellers can charge 25% premium
    if (clampedRep >= 0.9) {
      return 0.25;
    }
    
    // Good reputation sellers can charge 10% premium
    if (clampedRep >= 0.7) {
      return 0.10;
    }
    
    // Average reputation charges base price
    if (clampedRep >= 0.5) {
      return 0.0;
    }
    
    // Low reputation sellers must offer discount
    return -0.10;
  }

  /**
   * Calculate optimal price for a product/service
   * 
   * Takes into account:
   * - Cost basis
   * - Demand elasticity
   * - Competitor prices
   * - Reputation factors
   */
  calculateOptimalPrice(params: {
    costBasis: number;
    demandElasticity: number;
    competitorPrices: number[];
    buyerReputation?: number;
    sellerReputation?: number;
  }): string {
    const { costBasis, demandElasticity, competitorPrices, buyerReputation, sellerReputation } = params;
    
    // Start with cost-plus pricing (20% margin)
    const basePrice = costBasis * 1.2;
    
    // Adjust based on demand elasticity
    // Higher elasticity = more price-sensitive = lower price
    const elasticityAdjustment = 1 + (1 - demandElasticity) * 0.5;
    
    // Consider competitor pricing
    const avgCompetitorPrice = competitorPrices.length > 0
      ? competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length
      : basePrice;
    const competitorAdjustment = avgCompetitorPrice > 0 
      ? basePrice / avgCompetitorPrice 
      : 1;
    // Cap competitor adjustment to 1.5x to avoid extreme prices
    const cappedCompetitorAdjustment = Math.min(competitorAdjustment, 1.5);
    
    // Calculate base optimal price
    let optimalPrice = basePrice * elasticityAdjustment * cappedCompetitorAdjustment;
    
    // Apply reputation-based adjustments
    if (buyerReputation !== undefined && sellerReputation !== undefined) {
      const buyerDiscount = this.calculateBuyerDiscount(buyerReputation);
      const sellerPremium = this.calculateSellerPremium(sellerReputation);
      optimalPrice = optimalPrice * (1 - buyerDiscount) * (1 + sellerPremium);
    }
    
    // Ensure price is viable for micro-payments (minimum $0.001)
    optimalPrice = Math.max(optimalPrice, 0.001);
    
    return optimalPrice.toFixed(6);
  }

  /**
   * Calculate network value based on Metcalfe's law variant
   * 
   * Estimates the value of the M2M network based on:
   * - Number of users/nodes
   * - Transaction volume
   * - Connectivity value
   */
  calculateNetworkValue(params: {
    users: number;
    avgTransactionsPerUser: number;
    avgTransactionValue: number;
  }): number {
    const { users, avgTransactionsPerUser, avgTransactionValue } = params;
    
    // Metcalfe's law variant: value grows with square of nodes
    // Using 1.5 exponent for M2M networks (less than perfect quadratic)
    const connectivityValue = Math.pow(users, 1.5);
    
    // Transaction volume
    const transactionVolume = users * avgTransactionsPerUser * avgTransactionValue;
    
    // Network value = connectivity * volume * scaling factor
    const scalingFactor = 0.01;
    
    return connectivityValue * transactionVolume * scalingFactor;
  }

  /**
   * Suggest price adjustment based on market conditions
   */
  suggestPriceAdjustment(params: {
    currentPrice: number;
    salesVolume: number;
    competitorPrices: number[];
    targetSalesVolume?: number;
  }): {
    suggestedPrice: string;
    adjustment: number; // Percentage adjustment
    reasoning: string;
  } {
    const { currentPrice, salesVolume, competitorPrices, targetSalesVolume } = params;
    
    const avgCompetitorPrice = competitorPrices.length > 0
      ? competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length
      : currentPrice;
    
    let suggestedPrice = currentPrice;
    let adjustment = 0;
    let reasoning = '';
    
    // If significantly above competitors and sales are low, suggest lowering
    if (currentPrice > avgCompetitorPrice * 1.1 && salesVolume < (targetSalesVolume || 10)) {
      suggestedPrice = avgCompetitorPrice * 0.95; // 5% below average
      adjustment = ((suggestedPrice - currentPrice) / currentPrice) * 100;
      reasoning = `Price is ${((currentPrice - avgCompetitorPrice) / avgCompetitorPrice * 100).toFixed(1)}% above competitors with low sales. Suggest lowering to be competitive.`;
    }
    // If below competitors and sales are high, could raise price
    else if (currentPrice < avgCompetitorPrice * 0.9 && salesVolume > (targetSalesVolume || 20)) {
      suggestedPrice = Math.min(avgCompetitorPrice * 1.05, currentPrice * 1.1); // Up to 5% above average or 10% increase
      adjustment = ((suggestedPrice - currentPrice) / currentPrice) * 100;
      reasoning = `Price is below competitors with strong sales. Could increase to maximize revenue.`;
    }
    // Otherwise, maintain current price
    else {
      reasoning = `Price is competitive. Current pricing strategy appears optimal.`;
    }
    
    return {
      suggestedPrice: suggestedPrice.toFixed(6),
      adjustment,
      reasoning
    };
  }
}

