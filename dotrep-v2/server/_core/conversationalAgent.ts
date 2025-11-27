/**
 * Conversational Agent Interface
 * 
 * Natural language campaign builder and query processing for the
 * Social Credit Marketplace AI Agent Layer.
 */

import { invokeLLM, type Message } from './llm';
import type { 
  TrustNavigatorAgent, 
  CampaignRequirements,
  InfluencerMatch,
} from './aiAgents';
import type {
  SmartContractNegotiatorAgent,
  EndorsementDeal,
} from './aiAgents';

export interface CampaignRequest {
  query: string;
  userId?: string;
  context?: Record<string, any>;
}

export interface CampaignResponse {
  influencers: InfluencerMatch[];
  deals?: EndorsementDeal[];
  message: string;
  nextSteps?: string[];
  requiresConfirmation?: boolean;
}

/**
 * Conversational Campaign Builder Agent
 * 
 * Handles natural language queries and orchestrates the agent layer
 * to build complete endorsement campaigns.
 */
export class ConversationalCampaignBuilder {
  private trustNavigator: TrustNavigatorAgent;
  private contractNegotiator: SmartContractNegotiatorAgent;
  private conversationHistory: Map<string, Message[]> = new Map();

  constructor(
    trustNavigator: TrustNavigatorAgent,
    contractNegotiator: SmartContractNegotiatorAgent
  ) {
    this.trustNavigator = trustNavigator;
    this.contractNegotiator = contractNegotiator;
  }

  /**
   * Process natural language campaign request
   */
  async processCampaignRequest(request: CampaignRequest): Promise<CampaignResponse> {
    const sessionId = request.userId || 'default';

    // Get conversation history
    const history = this.conversationHistory.get(sessionId) || [];

    // Use LLM to extract structured requirements
    const requirements = await this.extractRequirements(request.query, history);

    // Find matching influencers
    const navigationResult = await this.trustNavigator.discoverInfluencers(
      request.query,
      requirements
    );

    // If user wants to proceed with deals, negotiate
    let deals: EndorsementDeal[] | undefined;
    if (this.shouldNegotiateDeals(request.query)) {
      const negotiationResult = await this.contractNegotiator.negotiateDeals(
        navigationResult.matches,
        requirements.budget || 10000,
        requirements
      );
      deals = negotiationResult.deals;
    }

    // Generate conversational response
    const message = await this.generateResponse(
      request.query,
      navigationResult,
      deals,
      requirements
    );

    // Update conversation history
    history.push(
      { role: 'user', content: request.query },
      { role: 'assistant', content: message }
    );
    this.conversationHistory.set(sessionId, history.slice(-10)); // Keep last 10 messages

    return {
      influencers: navigationResult.matches,
      deals,
      message,
      nextSteps: this.generateNextSteps(navigationResult, deals),
      requiresConfirmation: !!deals && deals.length > 0,
    };
  }

  /**
   * Extract structured requirements from natural language
   */
  private async extractRequirements(
    query: string,
    history: Message[]
  ): Promise<CampaignRequirements> {
    const systemPrompt = `You are a campaign requirements extraction agent. 
Extract structured campaign requirements from natural language queries.

Return JSON with:
- niche: array of niches/categories
- minReputation: minimum reputation score (0-1000)
- maxReputation: maximum reputation score (0-1000)
- platforms: array of social platforms
- minReach: minimum estimated reach
- maxSybilRisk: maximum Sybil risk (0-1)
- budget: campaign budget in USD
- count: number of influencers needed

If a field is not mentioned, omit it.`;

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-5), // Last 5 messages for context
      { role: 'user', content: `Extract requirements from: "${query}"` },
    ];

    try {
      const response = await invokeLLM({
        messages,
        responseFormat: { type: 'json_object' },
        maxTokens: 500,
      });

      const content = response.choices[0]?.message?.content;
      if (typeof content === 'string') {
        const parsed = JSON.parse(content);
        return {
          niche: parsed.niche,
          minReputation: parsed.minReputation,
          maxReputation: parsed.maxReputation,
          platforms: parsed.platforms,
          minReach: parsed.minReach,
          maxSybilRisk: parsed.maxSybilRisk,
          budget: parsed.budget,
          count: parsed.count,
        };
      }
    } catch (error) {
      console.error('[ConversationalAgent] Error extracting requirements:', error);
    }

    return {};
  }

  /**
   * Generate natural language response
   */
  private async generateResponse(
    query: string,
    navigationResult: { matches: InfluencerMatch[]; recommendations: string },
    deals: EndorsementDeal[] | undefined,
    requirements: CampaignRequirements
  ): Promise<string> {
    if (deals && deals.length > 0) {
      return `✅ Campaign setup complete! I found ${navigationResult.matches.length} verified influencers and negotiated ${deals.length} endorsement deals.\n\n` +
             `${navigationResult.recommendations}\n\n` +
             `Total campaign cost: $${deals.reduce((sum, d) => sum + d.terms.basePayment, 0).toFixed(2)}\n` +
             `All deals include x402 payment automation. Would you like to review the contracts?`;
    }

    return `🔍 Found ${navigationResult.matches.length} verified influencers matching your criteria:\n\n` +
           `${navigationResult.recommendations}\n\n` +
           `Would you like me to:\n` +
           `1. Setup endorsement deals with automatic x402 payments?\n` +
           `2. Get more details on any specific influencers?\n` +
           `3. Adjust the search criteria?`;
  }

  private shouldNegotiateDeals(query: string): boolean {
    const lowerQuery = query.toLowerCase();
    return lowerQuery.includes('setup') ||
           lowerQuery.includes('deal') ||
           lowerQuery.includes('negotiate') ||
           lowerQuery.includes('activate') ||
           lowerQuery.includes('start campaign');
  }

  private generateNextSteps(
    navigationResult: { matches: InfluencerMatch[] },
    deals?: EndorsementDeal[]
  ): string[] {
    if (deals && deals.length > 0) {
      return [
        'Review contract terms',
        'Approve x402 payment flows',
        'Launch campaign',
        'Monitor performance metrics',
      ];
    }

    return [
      'Setup endorsement deals',
      'View detailed influencer profiles',
      'Adjust search criteria',
      'Get performance predictions',
    ];
  }

  /**
   * Clear conversation history for a session
   */
  clearHistory(sessionId: string): void {
    this.conversationHistory.delete(sessionId);
  }
}

/**
 * Natural Language Query Processor
 * 
 * Routes queries to appropriate agents based on intent.
 */
export class NLQueryProcessor {
  private trustNavigator: TrustNavigatorAgent;
  private campaignBuilder: ConversationalCampaignBuilder;

  constructor(
    trustNavigator: TrustNavigatorAgent,
    campaignBuilder: ConversationalCampaignBuilder
  ) {
    this.trustNavigator = trustNavigator;
    this.campaignBuilder = campaignBuilder;
  }

  /**
   * Process a natural language query
   */
  async processQuery(query: string, userId?: string): Promise<CampaignResponse> {
    const intent = await this.detectIntent(query);

    switch (intent) {
      case 'campaign_build':
        return this.campaignBuilder.processCampaignRequest({ query, userId });
      
      case 'influencer_search':
        const navResult = await this.trustNavigator.discoverInfluencers(query);
        return {
          influencers: navResult.matches,
          message: navResult.recommendations,
        };

      default:
        return {
          influencers: [],
          message: 'I can help you find influencers, build campaigns, or negotiate deals. What would you like to do?',
        };
    }
  }

  private async detectIntent(query: string): Promise<string> {
    const systemPrompt = `Classify the user's intent into one of:
- campaign_build: User wants to create/start a campaign
- influencer_search: User wants to find/search for influencers
- other: Anything else

Return only the intent name.`;

    try {
      const response = await invokeLLM({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query },
        ],
        maxTokens: 50,
      });

      const content = response.choices[0]?.message?.content;
      const intent = typeof content === 'string' ? content.toLowerCase().trim() : Array.isArray(content) ? content.map(c => typeof c === 'string' ? c : '').join(' ').toLowerCase().trim() : '';
      if (intent && (intent.includes('campaign') || intent.includes('build'))) {
        return 'campaign_build';
      }
      if (intent && (intent.includes('search') || intent.includes('find'))) {
        return 'influencer_search';
      }
    } catch (error) {
      console.error('[NLQueryProcessor] Error detecting intent:', error);
    }

    return 'other';
  }
}

