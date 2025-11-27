/**
 * x402 Agent Integration
 * 
 * Integrates x402 autonomous payment capabilities into existing AI agents,
 * enabling them to autonomously purchase APIs, data, and services.
 * 
 * This module provides:
 * - Agent-to-agent marketplace transactions
 * - Autonomous API access with pay-per-request
 * - Reputation-aware service purchasing
 * - Multi-agent payment coordination
 */

import { X402AutonomousAgent, createX402AutonomousAgent, type AgentPaymentConfig, type AgentPaymentResult } from './x402AutonomousAgent';
import { ReputationCalculator } from './reputationCalculator';
import type { DKGClient } from '../../dkg-integration/dkg-client';

export interface AgentService {
  serviceId: string;
  name: string;
  description: string;
  endpoint: string;
  price: {
    amount: string;
    currency: string;
  };
  reputationRequired?: number;
  metadata?: Record<string, unknown>;
}

export interface AgentMarketplaceListing {
  listingId: string;
  sellerAgentId: string;
  service: AgentService;
  sellerReputation: number;
  totalSales: number;
  rating: number;
  available: boolean;
}

export interface AgentPurchaseRequest {
  serviceId: string;
  agentId: string;
  maxPrice?: string;
  minSellerReputation?: number;
  negotiationEnabled?: boolean;
}

export interface AgentPurchaseResult {
  success: boolean;
  service?: AgentService;
  paymentResult?: AgentPaymentResult;
  sellerReputation?: number;
  negotiationResult?: {
    originalPrice: string;
    finalPrice: string;
    discount?: number;
  };
  error?: string;
}

/**
 * Agent Marketplace Client
 * 
 * Enables agents to discover, evaluate, and purchase services from other agents
 * using x402 protocol payments.
 */
export class AgentMarketplaceClient {
  private x402Agent: X402AutonomousAgent;
  private reputationCalculator: ReputationCalculator;
  private dkgClient?: DKGClient;
  private marketplaceUrl: string;

  constructor(
    agentConfig: AgentPaymentConfig,
    reputationCalculator: ReputationCalculator,
    marketplaceUrl: string = process.env.AGENT_MARKETPLACE_URL || 'http://localhost:4000',
    dkgClient?: DKGClient
  ) {
    this.x402Agent = createX402AutonomousAgent(agentConfig);
    this.reputationCalculator = reputationCalculator;
    this.dkgClient = dkgClient;
    this.marketplaceUrl = marketplaceUrl;
  }

  /**
   * Discover available services in the agent marketplace
   */
  async discoverServices(filters?: {
    category?: string;
    maxPrice?: number;
    minSellerReputation?: number;
    limit?: number;
  }): Promise<AgentMarketplaceListing[]> {
    try {
      const result = await this.x402Agent.requestResource<{
        listings: AgentMarketplaceListing[];
      }>(`${this.marketplaceUrl}/api/agent-marketplace/discover`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!result.success || !result.data) {
        return [];
      }

      let listings = result.data.listings;

      // Apply filters
      if (filters) {
        if (filters.minSellerReputation) {
          listings = listings.filter(l => l.sellerReputation >= filters.minSellerReputation!);
        }

        if (filters.maxPrice) {
          listings = listings.filter(l => 
            parseFloat(l.service.price.amount) <= filters.maxPrice!
          );
        }

        if (filters.category) {
          listings = listings.filter(l => 
            (l.service.metadata?.category as string) === filters.category
          );
        }

        if (filters.limit) {
          listings = listings.slice(0, filters.limit);
        }
      }

      // Sort by reputation and rating
      listings.sort((a, b) => {
        const scoreA = a.sellerReputation * 0.7 + a.rating * 0.3;
        const scoreB = b.sellerReputation * 0.7 + b.rating * 0.3;
        return scoreB - scoreA;
      });

      return listings;
    } catch (error) {
      console.error('[AgentMarketplace] Error discovering services:', error);
      return [];
    }
  }

  /**
   * Purchase a service from another agent
   */
  async purchaseService(request: AgentPurchaseRequest): Promise<AgentPurchaseResult> {
    try {
      // Step 1: Get service details
      const serviceDetails = await this.getServiceDetails(request.serviceId);
      
      if (!serviceDetails) {
        return {
          success: false,
          error: `Service ${request.serviceId} not found`,
        };
      }

      // Step 2: Check seller reputation
      const sellerReputation = serviceDetails.sellerReputation;
      
      if (request.minSellerReputation && sellerReputation < request.minSellerReputation) {
        return {
          success: false,
          error: `Seller reputation (${sellerReputation}) below required minimum (${request.minSellerReputation})`,
          sellerReputation,
        };
      }

      // Step 3: Check price constraints
      const servicePrice = parseFloat(serviceDetails.service.price.amount);
      
      if (request.maxPrice && servicePrice > parseFloat(request.maxPrice)) {
        // Attempt negotiation if enabled
        if (request.negotiationEnabled) {
          const negotiationResult = await this.negotiatePrice(
            request.serviceId,
            serviceDetails.service.price.amount,
            request.maxPrice
          );

          if (!negotiationResult.accepted) {
            return {
              success: false,
              error: `Price (${servicePrice}) exceeds maximum (${request.maxPrice}) and negotiation failed`,
              sellerReputation,
            };
          }

          // Update service price with negotiated amount
          serviceDetails.service.price.amount = negotiationResult.finalAmount;
        } else {
          return {
            success: false,
            error: `Price (${servicePrice}) exceeds maximum (${request.maxPrice})`,
            sellerReputation,
          };
        }
      }

      // Step 4: Purchase service via x402
      const paymentResult = await this.x402Agent.requestResource(
        `${this.marketplaceUrl}/api/agent-marketplace/purchase`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            serviceId: request.serviceId,
            agentId: request.agentId,
            paymentMethod: 'x402',
          }),
        }
      );

      if (!paymentResult.success) {
        return {
          success: false,
          error: paymentResult.error || 'Payment failed',
          sellerReputation,
        };
      }

      return {
        success: true,
        service: serviceDetails.service,
        paymentResult,
        sellerReputation,
        negotiationResult: request.negotiationEnabled ? {
          originalPrice: serviceDetails.service.price.amount,
          finalPrice: paymentResult.amountPaid || serviceDetails.service.price.amount,
        } : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get service details
   */
  private async getServiceDetails(serviceId: string): Promise<AgentMarketplaceListing | null> {
    try {
      const result = await this.x402Agent.requestResource<AgentMarketplaceListing>(
        `${this.marketplaceUrl}/api/agent-marketplace/service/${serviceId}`,
        {
          method: 'GET',
        }
      );

      return result.success && result.data ? result.data : null;
    } catch (error) {
      console.error(`[AgentMarketplace] Error getting service details for ${serviceId}:`, error);
      return null;
    }
  }

  /**
   * Negotiate price with seller
   */
  private async negotiatePrice(
    serviceId: string,
    originalPrice: string,
    maxPrice: string
  ): Promise<{ accepted: boolean; finalAmount: string }> {
    try {
      // In production, this would call a negotiation endpoint
      // For now, simulate negotiation
      const original = parseFloat(originalPrice);
      const max = parseFloat(maxPrice);

      if (original <= max) {
        return {
          accepted: true,
          finalAmount: originalPrice,
        };
      }

      // Attempt to negotiate to max price
      const discount = (original - max) / original;
      
      // Accept if discount is reasonable (< 20%)
      if (discount < 0.2) {
        return {
          accepted: true,
          finalAmount: maxPrice,
        };
      }

      return {
        accepted: false,
        finalAmount: originalPrice,
      };
    } catch (error) {
      return {
        accepted: false,
        finalAmount: originalPrice,
      };
    }
  }

  /**
   * List a service for sale in the marketplace
   */
  async listService(service: AgentService, sellerAgentId: string): Promise<{
    success: boolean;
    listingId?: string;
    error?: string;
  }> {
    try {
      const result = await this.x402Agent.requestResource<{
        listingId: string;
      }>(`${this.marketplaceUrl}/api/agent-marketplace/list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service,
          sellerAgentId,
        }),
      });

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || 'Failed to list service',
        };
      }

      return {
        success: true,
        listingId: result.data.listingId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

/**
 * Enhanced AI Agent with x402 Payment Capabilities
 * 
 * Wraps existing AI agents with autonomous payment functionality.
 */
export class X402EnabledAgent {
  private x402Agent: X402AutonomousAgent;
  private agentId: string;

  constructor(agentConfig: AgentPaymentConfig) {
    this.x402Agent = createX402AutonomousAgent(agentConfig);
    this.agentId = agentConfig.agentId;
  }

  /**
   * Request premium API access with automatic payment
   */
  async requestPremiumAPI<T = unknown>(
    apiEndpoint: string,
    options: RequestInit = {}
  ): Promise<AgentPaymentResult<T>> {
    return await this.x402Agent.requestResource<T>(apiEndpoint, options);
  }

  /**
   * Purchase data or content with automatic payment
   */
  async purchaseContent(contentUAL: string, options?: {
    maxPrice?: string;
    minSourceReputation?: number;
  }): Promise<AgentPaymentResult> {
    const endpoint = `${process.env.X402_GATEWAY_URL || 'http://localhost:4000'}/api/marketplace/purchase`;
    
    return await this.x402Agent.requestResource(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productUAL: contentUAL,
        buyer: this.x402Agent['config'].payerAddress,
        maxPrice: options?.maxPrice,
        minSellerReputation: options?.minSourceReputation,
        paymentMethod: 'x402',
      }),
    });
  }

  /**
   * Query verified information with automatic payment
   */
  async queryVerifiedInfo(
    query: string,
    options?: {
      minSourceReputation?: number;
      maxPrice?: string;
    }
  ): Promise<AgentPaymentResult<{
    answer: string;
    sources: Array<{
      ual: string;
      reputation: number;
      verified: boolean;
    }>;
  }>> {
    const endpoint = `${process.env.X402_GATEWAY_URL || 'http://localhost:4000'}/api/verified-info`;
    
    return await this.x402Agent.requestResource(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        sourceReputation: options?.minSourceReputation || 0.8,
      }),
    });
  }

  /**
   * Get agent payment statistics
   */
  getPaymentStats(): {
    totalPayments: number;
    totalAmount: number;
    averageAmount: number;
    preferredChain: string;
  } {
    const history = this.x402Agent.getPaymentHistory();
    
    const totalPayments = history.length;
    const totalAmount = history.reduce((sum, evidence) => {
      // Extract amount from evidence (would need proper parsing in production)
      return sum + 0; // Placeholder
    }, 0);

    return {
      totalPayments,
      totalAmount,
      averageAmount: totalPayments > 0 ? totalAmount / totalPayments : 0,
      preferredChain: this.x402Agent['config'].preferredChain,
    };
  }
}

/**
 * Factory function to create an x402-enabled agent
 */
export function createX402EnabledAgent(config: AgentPaymentConfig): X402EnabledAgent {
  return new X402EnabledAgent(config);
}

