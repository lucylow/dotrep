/**
 * Trust-Based Economic Integration
 * 
 * Integration layer for connecting trust-based economic decisions
 * with existing conversational agents and chatbots.
 */

import { TrustEconomicChatbot, createTrustEconomicChatbot } from './trustEconomicChatbot';
import { TrustEconomicDecisionEngine } from './trustEconomicDecisionEngine';
import { ConversationalCampaignBuilder } from './conversationalAgent';
import type { AutonomousAgentConfig } from './m2mCommerce/types';

/**
 * Enhanced Conversational Agent with Trust-Based Economic Decisions
 * 
 * Wraps the existing ConversationalCampaignBuilder with trust-based
 * economic decision making for premium responses.
 */
export class TrustEconomicConversationalAgent {
  private campaignBuilder: ConversationalCampaignBuilder;
  private economicChatbot: TrustEconomicChatbot;

  constructor(
    campaignBuilder: ConversationalCampaignBuilder,
    economicChatbot: TrustEconomicChatbot
  ) {
    this.campaignBuilder = campaignBuilder;
    this.economicChatbot = economicChatbot;
  }

  /**
   * Process campaign request with trust-based economic decisions
   */
  async processCampaignRequest(
    request: {
      userId: string;
      userDid?: string;
      query: string;
      context?: Record<string, any>;
    }
  ) {
    // First, check if we should use premium data sources
    if (request.userDid) {
      const economicResponse = await this.economicChatbot.processQuery(
        request.userDid,
        request.query,
        {
          ...request.context,
          type: 'campaign_request',
        }
      );

      // If premium data was acquired, enhance the campaign request
      if (economicResponse.purchasedData.length > 0) {
        // Add premium data to context
        const enhancedContext = {
          ...request.context,
          premiumData: economicResponse.purchasedData,
          trustTier: economicResponse.economicDecision.trustTier,
          qualityTier: economicResponse.qualityTier,
        };

        // Process with enhanced context
        return await this.campaignBuilder.processCampaignRequest({
          userId: request.userId,
          query: request.query,
          ...enhancedContext,
        });
      }
    }

    // Fallback to standard processing
    return await this.campaignBuilder.processCampaignRequest({
      userId: request.userId,
      query: request.query,
      ...request.context,
    });
  }
}

/**
 * Create integrated agent with trust-based economics
 */
export function createTrustEconomicConversationalAgent(
  campaignBuilder: ConversationalCampaignBuilder,
  config?: {
    x402Config?: AutonomousAgentConfig;
    dkgClient?: any;
  }
): TrustEconomicConversationalAgent {
  const economicChatbot = createTrustEconomicChatbot(config);
  return new TrustEconomicConversationalAgent(campaignBuilder, economicChatbot);
}

