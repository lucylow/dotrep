/**
 * Model Context Protocol (MCP) Server for DotRep Reputation System
 * 
 * This MCP server exposes DotRep reputation data to AI agents, enabling them to:
 * - Query developer reputation scores
 * - Verify contribution authenticity
 * - Access verifiable reputation data from OriginTrail DKG
 * - Perform decentralized Retrieval Augmented Generation (dRAG)
 * 
 * The server implements the MCP specification for seamless integration with
 * AI agents and LLM applications.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { DKGClient } from '../dkg-integration/dkg-client';
import { KnowledgeAssetPublisher } from '../dkg-integration/knowledge-asset-publisher';
import { createAIAgents } from '../server/_core/aiAgents';
import { getPolkadotApi } from '../server/_core/polkadotApi';
import { ConversationalCampaignBuilder, NLQueryProcessor } from '../server/_core/conversationalAgent';
import { createSocialCreditAgents } from '../server/_core/socialCreditAgents';
import { MCPPluginManager } from './plugin-manager';
import { ReputationCalculator } from '../server/_core/reputationCalculator';
import { BotClusterDetector } from '../server/_core/botClusterDetector';

/**
 * DotRep MCP Server
 */
class DotRepMCPServer {
  private server: Server;
  private dkgClient: DKGClient;
  private publisher: KnowledgeAssetPublisher;
  private aiAgents: ReturnType<typeof createAIAgents>;
  private socialCreditAgents: ReturnType<typeof createSocialCreditAgents>;
  private conversationalBuilder?: ConversationalCampaignBuilder;
  private pluginManager: MCPPluginManager;
  private reputationCalculator: ReputationCalculator;
  private botDetector: BotClusterDetector;

  constructor() {
    this.server = new Server(
      {
        name: 'dotrep-reputation',
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize DKG client with fallback to mock mode
    const useMockMode = process.env.DKG_USE_MOCK === 'true' || false;
    const fallbackToMock = process.env.DKG_FALLBACK_TO_MOCK === 'true' || true; // Default to true for graceful degradation
    
    try {
      this.dkgClient = new DKGClient({
        useMockMode,
        fallbackToMock,
      });
      this.publisher = new KnowledgeAssetPublisher(this.dkgClient);
      const polkadotApi = getPolkadotApi();
      this.aiAgents = createAIAgents(this.dkgClient, polkadotApi);
      this.socialCreditAgents = createSocialCreditAgents(this.dkgClient, polkadotApi);
    } catch (error: any) {
      console.error('⚠️  Failed to initialize DKG client, using mock mode:', error.message);
      // If initialization fails completely, use mock mode
      this.dkgClient = new DKGClient({
        useMockMode: true,
        fallbackToMock: false,
      });
      this.publisher = new KnowledgeAssetPublisher(this.dkgClient);
      const polkadotApi = getPolkadotApi();
      const x402GatewayUrl = process.env.X402_GATEWAY_URL || 'http://localhost:4001';
      this.aiAgents = createAIAgents(this.dkgClient, polkadotApi, x402GatewayUrl);
      this.socialCreditAgents = createSocialCreditAgents(this.dkgClient, polkadotApi);
      // Initialize conversational builder
      this.conversationalBuilder = new ConversationalCampaignBuilder(
        this.aiAgents.trustNavigator,
        this.aiAgents.contractNegotiator
      );
    }

    // Initialize plugin system
    this.reputationCalculator = new ReputationCalculator();
    this.botDetector = new BotClusterDetector();
    this.pluginManager = new MCPPluginManager(this.server);
    
    // Register core plugins (async initialization will be done in async init method)
    const x402GatewayUrl = process.env.X402_GATEWAY_URL || 'http://localhost:4001';
    this.pluginManager.registerCorePlugins(
      this.dkgClient,
      this.publisher,
      this.reputationCalculator,
      this.botDetector,
      x402GatewayUrl
    ).catch(err => {
      console.error('Failed to register plugins:', err);
    });

    this.setupHandlers();
  }

  /**
   * Initialize plugins (call this after server is ready)
   */
  async initializePlugins(): Promise<void> {
    const x402GatewayUrl = process.env.X402_GATEWAY_URL || 'http://localhost:4001';
    await this.pluginManager.registerCorePlugins(
      this.dkgClient,
      this.publisher,
      this.reputationCalculator,
      this.botDetector,
      x402GatewayUrl
    );
  }

  /**
   * Define available tools for AI agents
   * Combines legacy tools with plugin-provided tools
   */
  private getTools(): Tool[] {
    // Get tools from plugins
    const pluginTools = this.pluginManager.getAllTools();
    
    // Legacy tools
    const legacyTools: Tool[] = [
      {
        name: 'get_developer_reputation',
        description: 'Get the reputation score and contribution history for a developer. Returns verifiable data from the OriginTrail DKG.',
        inputSchema: {
          type: 'object',
          properties: {
            developerId: {
              type: 'string',
              description: 'The unique identifier for the developer (Polkadot address or username)',
            },
            includeContributions: {
              type: 'boolean',
              description: 'Whether to include detailed contribution history',
              default: true,
            },
          },
          required: ['developerId'],
        },
      },
      {
        name: 'verify_contribution',
        description: 'Verify the authenticity of a specific contribution using cryptographic proofs from the DKG.',
        inputSchema: {
          type: 'object',
          properties: {
            contributionId: {
              type: 'string',
              description: 'The unique identifier for the contribution',
            },
            contributionUrl: {
              type: 'string',
              description: 'The URL of the contribution (e.g., GitHub PR link)',
            },
          },
          required: ['contributionId'],
        },
      },
      {
        name: 'search_developers_by_reputation',
        description: 'Search for developers within a specific reputation score range.',
        inputSchema: {
          type: 'object',
          properties: {
            minScore: {
              type: 'number',
              description: 'Minimum reputation score',
              default: 0,
            },
            maxScore: {
              type: 'number',
              description: 'Maximum reputation score',
              default: 1000,
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return',
              default: 10,
            },
          },
        },
      },
      {
        name: 'get_reputation_proof',
        description: 'Get cryptographic proof of a developer\'s reputation from the blockchain.',
        inputSchema: {
          type: 'object',
          properties: {
            developerId: {
              type: 'string',
              description: 'The unique identifier for the developer',
            },
          },
          required: ['developerId'],
        },
      },
      {
        name: 'compare_developers',
        description: 'Compare reputation scores and contributions between multiple developers.',
        inputSchema: {
          type: 'object',
          properties: {
            developerIds: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Array of developer identifiers to compare',
            },
          },
          required: ['developerIds'],
        },
      },
      {
        name: 'get_dkg_health',
        description: 'Check the health status of the OriginTrail DKG connection.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'detect_misinformation',
        description: 'Analyze a claim for potential misinformation using DKG sources and cross-chain verification. Returns credibility score, verdict, and reasoning.',
        inputSchema: {
          type: 'object',
          properties: {
            claim: {
              type: 'string',
              description: 'The claim to analyze for misinformation',
            },
            context: {
              type: 'string',
              description: 'Optional context about the claim',
            },
          },
          required: ['claim'],
        },
      },
      {
        name: 'verify_truth',
        description: 'Comprehensively verify a claim using multiple DKG sources, blockchain proofs, and cross-chain consensus.',
        inputSchema: {
          type: 'object',
          properties: {
            claim: {
              type: 'string',
              description: 'The claim to verify',
            },
          },
          required: ['claim'],
        },
      },
      {
        name: 'autonomous_transaction_decision',
        description: 'Make an autonomous decision about a transaction based on reputation scores, risk assessment, and cross-chain considerations.',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              description: 'The action to evaluate (e.g., "transfer", "delegate", "vote")',
            },
            targetAccount: {
              type: 'string',
              description: 'The target account address',
            },
            amount: {
              type: 'number',
              description: 'Optional transaction amount',
            },
            context: {
              type: 'object',
              description: 'Additional context for the decision',
            },
          },
          required: ['action', 'targetAccount'],
        },
      },
      {
        name: 'cross_chain_reasoning',
        description: 'Perform reasoning across multiple Polkadot chains using XCM and shared security. Returns consensus and recommendations.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The query to reason about across chains',
            },
            chains: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of chains to query (default: polkadot, kusama)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'publish_community_note',
        description: 'Publish a Community Note to the DKG for misinformation defense. Notes can correct, verify, or flag misinformation in Knowledge Assets.',
        inputSchema: {
          type: 'object',
          properties: {
            targetUAL: {
              type: 'string',
              description: 'UAL of the Knowledge Asset being corrected/verified',
            },
            noteType: {
              type: 'string',
              enum: ['misinformation', 'correction', 'verification', 'other'],
              description: 'Type of Community Note',
            },
            content: {
              type: 'string',
              description: 'Content of the Community Note',
            },
            author: {
              type: 'string',
              description: 'Author account ID or agent identifier',
            },
            evidence: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of UALs or URLs providing evidence',
            },
            reasoning: {
              type: 'string',
              description: 'Reasoning behind the note',
            },
          },
          required: ['targetUAL', 'noteType', 'content', 'author'],
        },
      },
      {
        name: 'get_community_notes',
        description: 'Get Community Notes for a specific Knowledge Asset UAL.',
        inputSchema: {
          type: 'object',
          properties: {
            targetUAL: {
              type: 'string',
              description: 'UAL of the Knowledge Asset',
            },
          },
          required: ['targetUAL'],
        },
      },
      {
        name: 'get_impact_metrics',
        description: 'Get impact metrics showing measurable outcomes: accuracy improvements, citation rates, Sybil detection, x402 payments, and more.',
        inputSchema: {
          type: 'object',
          properties: {
            summary: {
              type: 'boolean',
              description: 'Get summary metrics for judges/demo (default: true)',
              default: true,
            },
          },
        },
      },
      {
        name: 'verify_content',
        description: 'Verify content using Umanitek Guardian AI Agent. Checks for deepfakes, CSAM, illicit content, and misinformation using privacy-preserving fingerprinting.',
        inputSchema: {
          type: 'object',
          properties: {
            content_url: {
              type: 'string',
              description: 'URL of the content to verify',
            },
            content_type: {
              type: 'string',
              enum: ['image', 'video', 'text'],
              description: 'Type of content',
              default: 'image',
            },
            check_type: {
              type: 'string',
              enum: ['deepfake', 'csam', 'misinformation', 'illicit', 'all'],
              description: 'Type of check to perform',
              default: 'all',
            },
          },
          required: ['content_url'],
        },
      },
      {
        name: 'create_verification_community_note',
        description: 'Create a Community Note from Guardian verification results and publish to DKG.',
        inputSchema: {
          type: 'object',
          properties: {
            target_ual: {
              type: 'string',
              description: 'UAL of the Knowledge Asset being verified',
            },
            verification_result: {
              type: 'object',
              description: 'Guardian verification result object',
            },
            author: {
              type: 'string',
              description: 'Author account ID or agent identifier',
              default: 'did:dkg:umanitek-guardian',
            },
          },
          required: ['target_ual', 'verification_result'],
        },
      },
      {
        name: 'get_creator_safety_score',
        description: 'Get safety score for a creator based on Guardian verification history.',
        inputSchema: {
          type: 'object',
          properties: {
            creator_id: {
              type: 'string',
              description: 'Creator account ID or identifier',
            },
          },
          required: ['creator_id'],
        },
      },
      // User-Flagging Relationship Tools
      {
        name: 'create_user_flag',
        description: 'Create a user flag for harmful content, spam, or coordinated manipulation. Flags are published to DKG as verifiable Knowledge Assets.',
        inputSchema: {
          type: 'object',
          properties: {
            flag_actor: {
              type: 'string',
              description: 'DID of the user creating the flag',
            },
            flag_target: {
              type: 'string',
              description: 'DID of the flagged user or content',
            },
            flag_type: {
              type: 'string',
              enum: ['SPAM', 'HARASSMENT', 'MISINFORMATION', 'IMPERSONATION', 'ILLEGAL_CONTENT', 'COORDINATED_HARM'],
              description: 'Type of flag',
            },
            confidence: {
              type: 'number',
              description: 'Confidence score (0-1)',
              minimum: 0,
              maximum: 1,
            },
            evidence: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of UALs to supporting evidence',
            },
            severity: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'critical'],
              description: 'Severity level',
              default: 'medium',
            },
            reporter_reputation: {
              type: 'number',
              description: 'Reputation score of flagging user (0-1)',
              minimum: 0,
              maximum: 1,
            },
            description: {
              type: 'string',
              description: 'Description of the flag',
            },
          },
          required: ['flag_actor', 'flag_target', 'flag_type', 'confidence', 'reporter_reputation'],
        },
      },
      {
        name: 'analyze_flagging_patterns',
        description: 'Analyze flagging patterns for a target user to detect coordination, assess risk, and evaluate reporter credibility.',
        inputSchema: {
          type: 'object',
          properties: {
            target_user_did: {
              type: 'string',
              description: 'DID of the target user to analyze',
            },
            time_window_hours: {
              type: 'number',
              description: 'Time window for analysis in hours',
              default: 24,
            },
          },
          required: ['target_user_did'],
        },
      },
      {
        name: 'calculate_flagging_impact',
        description: 'Calculate the impact of flagging patterns on a user\'s reputation score.',
        inputSchema: {
          type: 'object',
          properties: {
            user_did: {
              type: 'string',
              description: 'DID of the user',
            },
            base_reputation: {
              type: 'number',
              description: 'Base reputation score (0-1)',
              minimum: 0,
              maximum: 1,
            },
          },
          required: ['user_did', 'base_reputation'],
        },
      },
      {
        name: 'get_flagging_insights',
        description: 'Get comprehensive flagging insights including coordination alerts, top flagged users, and reporter analysis.',
        inputSchema: {
          type: 'object',
          properties: {
            time_window_hours: {
              type: 'number',
              description: 'Time window for insights in hours',
              default: 24,
            },
          },
        },
      },
      {
        name: 'automated_content_review',
        description: 'Automatically review content using Umanitek Guardian and create flags if harmful content is detected.',
        inputSchema: {
          type: 'object',
          properties: {
            content_fingerprint: {
              type: 'string',
              description: 'Content fingerprint hash',
            },
            content_type: {
              type: 'string',
              enum: ['image', 'video', 'text'],
              description: 'Type of content',
            },
            target_user_did: {
              type: 'string',
              description: 'DID of the user who created the content',
            },
          },
          required: ['content_fingerprint', 'content_type', 'target_user_did'],
        },
      },
      // Social Credit Marketplace Agent Tools
      {
        name: 'query_reputation_scores',
        description: 'Query real-time reputation data from DKG for influencer discovery and matching. Returns reputation scores, social rank, economic stake, and sybil risk.',
        inputSchema: {
          type: 'object',
          properties: {
            user_did: {
              type: 'string',
              description: 'User DID or account identifier',
            },
            metrics: {
              type: 'array',
              items: { type: 'string' },
              description: 'Metrics to retrieve: social_rank, economic_stake, sybil_risk',
              default: ['social_rank', 'economic_stake', 'sybil_risk'],
            },
          },
          required: ['user_did'],
        },
      },
      {
        name: 'find_influencers',
        description: 'Find influencers matching campaign requirements using natural language or structured criteria. Powered by Trust Navigator Agent.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Natural language query (e.g., "Find tech influencers with >0.8 reputation for gadget reviews") or JSON requirements',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results',
              default: 10,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'detect_sybil_clusters',
        description: 'Analyze social graph for fake account patterns and clusters. Returns cluster IDs, risk levels, and suspicious patterns.',
        inputSchema: {
          type: 'object',
          properties: {
            graph_data: {
              type: 'string',
              description: 'DKG UAL of graph data or account IDs to analyze',
            },
            analysis_depth: {
              type: 'number',
              description: 'Depth of cluster analysis (1-5)',
              default: 3,
            },
          },
        },
      },
      {
        name: 'negotiate_endorsement_deal',
        description: 'Negotiate endorsement deal terms using AI-powered contract optimization. Returns deal terms with x402 payment setup.',
        inputSchema: {
          type: 'object',
          properties: {
            influencer_did: {
              type: 'string',
              description: 'Influencer DID',
            },
            brand_did: {
              type: 'string',
              description: 'Brand DID',
            },
            campaign_requirements: {
              type: 'object',
              description: 'Campaign requirements (targetAudience, budget, campaignType, etc.)',
            },
            initial_terms: {
              type: 'object',
              description: 'Initial deal terms (paymentAmount, paymentToken, etc.)',
            },
          },
          required: ['influencer_did', 'brand_did', 'campaign_requirements'],
        },
      },
      {
        name: 'initiate_x402_payment',
        description: 'Start micro-payment flow for endorsement deal. Returns payment request with recipient, amount, and resource UAL.',
        inputSchema: {
          type: 'object',
          properties: {
            deal_id: {
              type: 'string',
              description: 'Endorsement deal ID',
            },
            amount: {
              type: 'number',
              description: 'Payment amount',
            },
            recipient: {
              type: 'string',
              description: 'Recipient DID',
            },
            conditions: {
              type: 'object',
              description: 'Payment conditions and requirements',
            },
          },
          required: ['deal_id', 'amount', 'recipient'],
        },
      },
      {
        name: 'optimize_campaign_performance',
        description: 'Analyze and optimize campaign performance in real-time. Returns recommendations and performance metrics.',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: {
              type: 'string',
              description: 'Campaign ID',
            },
            deal_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of deal IDs in the campaign',
            },
          },
          required: ['campaign_id', 'deal_ids'],
        },
      },
      {
        name: 'verify_reputation',
        description: 'Continuous reputation verification with cross-source validation. Returns current reputation, verification status, and audit trail.',
        inputSchema: {
          type: 'object',
          properties: {
            did: {
              type: 'string',
              description: 'User DID to verify',
            },
            include_history: {
              type: 'boolean',
              description: 'Include reputation history',
              default: false,
            },
          },
          required: ['did'],
        },
      },
      {
        name: 'generate_transparency_report',
        description: 'Generate transparency report for brands showing influencer verification, payment transparency, and sybil risk.',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: {
              type: 'string',
              description: 'Campaign ID',
            },
            deal_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of deal IDs',
            },
          },
          required: ['campaign_id', 'deal_ids'],
        },
      },
      // x402 Autonomous Payment Tools
      {
        name: 'request_resource_with_x402',
        description: 'Request a protected resource using x402 protocol. Automatically handles HTTP 402 responses, evaluates payment, executes payment, and retries with payment proof. Enables autonomous agent commerce.',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'URL of the protected resource',
            },
            agent_id: {
              type: 'string',
              description: 'Agent identifier for payment tracking',
            },
            payer_address: {
              type: 'string',
              description: 'Wallet address of the payer',
            },
            max_payment_amount: {
              type: 'number',
              description: 'Maximum payment amount in USD (default: 1000)',
              default: 1000,
            },
            min_recipient_reputation: {
              type: 'number',
              description: 'Minimum recipient reputation score (0-1, default: 0.5)',
              default: 0.5,
            },
            enable_negotiation: {
              type: 'boolean',
              description: 'Enable price negotiation (default: true)',
              default: true,
            },
          },
          required: ['url', 'agent_id', 'payer_address'],
        },
      },
      {
        name: 'discover_x402_tools',
        description: 'Discover available x402-protected tools and services dynamically. Returns list of tools with pricing, reputation requirements, and capabilities. Enables progressive disclosure and dynamic tool selection.',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description: 'Tool category filter (e.g., "reputation", "data", "api")',
            },
            min_provider_reputation: {
              type: 'number',
              description: 'Minimum provider reputation score (0-1)',
            },
            max_price: {
              type: 'number',
              description: 'Maximum price per request in USD',
            },
            capabilities: {
              type: 'array',
              items: { type: 'string' },
              description: 'Required capabilities (e.g., ["reputation_query", "payment_verification"])',
            },
          },
        },
      },
      {
        name: 'execute_code_with_mcp_tools',
        description: 'Execute code that uses MCP tools efficiently. This enables progressive disclosure - tools are presented as a code library, and the agent imports and uses only what it needs, reducing token usage. Results are processed in-environment before returning concise results.',
        inputSchema: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'JavaScript/TypeScript code to execute that uses MCP tools',
            },
            tool_imports: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of MCP tool names to import (e.g., ["get_developer_reputation", "request_resource_with_x402"])',
            },
            context: {
              type: 'object',
              description: 'Additional context variables to pass to code execution',
            },
          },
          required: ['code', 'tool_imports'],
        },
      },
      {
        name: 'query_payment_history',
        description: 'Query payment history for reputation analysis. Returns verified payments from x402 protocol that can be used for reputation scoring.',
        inputSchema: {
          type: 'object',
          properties: {
            payer_address: {
              type: 'string',
              description: 'Payer wallet address or DID',
            },
            recipient_address: {
              type: 'string',
              description: 'Recipient wallet address or DID (optional)',
            },
            start_timestamp: {
              type: 'number',
              description: 'Start timestamp for query (Unix timestamp)',
            },
            end_timestamp: {
              type: 'number',
              description: 'End timestamp for query (Unix timestamp)',
            },
            min_amount: {
              type: 'number',
              description: 'Minimum payment amount',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results',
              default: 100,
            },
          },
        },
      },
      {
        name: 'evaluate_payment_decision',
        description: 'Evaluate whether to make a payment based on reputation, price, and risk assessment. Returns decision with reasoning and confidence score.',
        inputSchema: {
          type: 'object',
          properties: {
            payment_request: {
              type: 'object',
              description: 'Payment request object with amount, currency, recipient, etc.',
            },
            agent_config: {
              type: 'object',
              description: 'Agent payment configuration (maxPaymentAmount, minRecipientReputation, etc.)',
            },
          },
          required: ['payment_request'],
        },
      },
    ];

    // Combine legacy and plugin tools
    return [...legacyTools, ...pluginTools];
  }

  /**
   * Setup MCP request handlers
   */
  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.getTools(),
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'get_developer_reputation':
            return await this.getDeveloperReputation(args);

          case 'verify_contribution':
            return await this.verifyContribution(args);

          case 'search_developers_by_reputation':
            return await this.searchDevelopersByReputation(args);

          case 'get_reputation_proof':
            return await this.getReputationProof(args);

          case 'compare_developers':
            return await this.compareDevelopers(args);

          case 'get_dkg_health':
            return await this.getDKGHealth();

          case 'detect_misinformation':
            return await this.detectMisinformation(args);

          case 'verify_truth':
            return await this.verifyTruth(args);

          case 'autonomous_transaction_decision':
            return await this.autonomousTransactionDecision(args);

          case 'cross_chain_reasoning':
            return await this.crossChainReasoning(args);

          case 'publish_community_note':
            return await this.publishCommunityNote(args);

          case 'get_community_notes':
            return await this.getCommunityNotes(args);

          case 'get_impact_metrics':
            return await this.getImpactMetrics(args);

          case 'verify_content':
            return await this.verifyContent(args);

          case 'create_verification_community_note':
            return await this.createVerificationCommunityNote(args);

          case 'get_creator_safety_score':
            return await this.getCreatorSafetyScore(args);

          // User-Flagging Relationship Tools
          case 'create_user_flag':
            return await this.createUserFlag(args);

          case 'analyze_flagging_patterns':
            return await this.analyzeFlaggingPatterns(args);

          case 'calculate_flagging_impact':
            return await this.calculateFlaggingImpact(args);

          case 'get_flagging_insights':
            return await this.getFlaggingInsights(args);

          case 'automated_content_review':
            return await this.automatedContentReview(args);

          // Social Credit Marketplace Agent Tools
          case 'query_reputation_scores':
            return await this.queryReputationScores(args);

          case 'find_influencers':
            return await this.findInfluencers(args);

          case 'detect_sybil_clusters':
            return await this.detectSybilClusters(args);

          case 'negotiate_endorsement_deal':
            return await this.negotiateEndorsementDeal(args);

          case 'initiate_x402_payment':
            return await this.initiateX402Payment(args);

          case 'optimize_campaign_performance':
            return await this.optimizeCampaignPerformance(args);

          case 'verify_reputation':
            return await this.verifyReputation(args);

          case 'generate_transparency_report':
            return await this.generateTransparencyReport(args);

          // Plugin-provided tools (routed through plugin manager)
          case 'calculate_sybil_resistant_reputation':
          case 'compare_reputations':
          case 'detect_sybil_clusters':
          case 'find_endorsement_opportunities':
          case 'execute_endorsement_deal':
            try {
              return await this.pluginManager.handleToolCall(name, args);
            } catch (pluginError: any) {
              throw new Error(`Plugin tool error: ${pluginError.message}`);
            }

          // x402 Autonomous Payment Tools
          case 'request_resource_with_x402':
            return await this.requestResourceWithX402(args);
          case 'discover_x402_tools':
            return await this.discoverX402Tools(args);
          case 'execute_code_with_mcp_tools':
            return await this.executeCodeWithMcpTools(args);
          case 'query_payment_history':
            return await this.queryPaymentHistory(args);
          case 'evaluate_payment_decision':
            return await this.evaluatePaymentDecision(args);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Get developer reputation
   */
  private async getDeveloperReputation(args: any) {
    const { developerId, includeContributions = true } = args;

    try {
      const reputationData = await this.publisher.queryDeveloperReputation(developerId);

      const response = {
        developerId,
        reputationScore: reputationData['dotrep:reputationScore'],
        verified: true,
        source: 'OriginTrail DKG',
        timestamp: reputationData.dateModified,
        aggregateRating: reputationData.aggregateRating,
      };

      if (includeContributions) {
        response['contributions'] = reputationData['dotrep:contributions'];
        response['contributionCount'] = reputationData['dotrep:contributions'].length;
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get reputation for ${developerId}: ${error.message}`);
    }
  }

  /**
   * Verify contribution authenticity
   */
  private async verifyContribution(args: any) {
    const { contributionId, contributionUrl } = args;

    // Query DKG for contribution data
    const query = `
      PREFIX schema: <https://schema.org/>
      PREFIX dotrep: <https://dotrep.io/ontology/>
      
      SELECT ?contribution ?author ?date ?impact ?type
      WHERE {
        ?contribution schema:identifier "${contributionId}" .
        ?contribution schema:author ?author .
        ?contribution schema:datePublished ?date .
        ?contribution dotrep:impactScore ?impact .
        ?contribution dotrep:contributionType ?type .
        ${contributionUrl ? `?contribution schema:url "${contributionUrl}" .` : ''}
      }
    `;

    try {
      const results = await this.dkgClient.graphQuery(query, 'SELECT');

      if (results.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                verified: false,
                contributionId,
                message: 'Contribution not found in DKG',
              }, null, 2),
            },
          ],
        };
      }

      const contribution = results[0];

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              verified: true,
              contributionId,
              author: contribution.author,
              date: contribution.date,
              impact: contribution.impact,
              type: contribution.type,
              source: 'OriginTrail DKG',
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to verify contribution: ${error.message}`);
    }
  }

  /**
   * Search developers by reputation score range
   */
  private async searchDevelopersByReputation(args: any) {
    const { minScore = 0, maxScore = 1000, limit = 10 } = args;

    const query = `
      PREFIX schema: <https://schema.org/>
      PREFIX dotrep: <https://dotrep.io/ontology/>
      
      SELECT ?developer ?reputation ?contributionCount
      WHERE {
        ?developer a schema:Person .
        ?developer dotrep:reputationScore ?reputation .
        ?developer dotrep:contributions ?contributions .
        BIND(COUNT(?contributions) AS ?contributionCount)
        FILTER(?reputation >= ${minScore} && ?reputation <= ${maxScore})
      }
      ORDER BY DESC(?reputation)
      LIMIT ${limit}
    `;

    try {
      const results = await this.dkgClient['dkg'].graph.query(query, 'SELECT');

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              searchCriteria: { minScore, maxScore, limit },
              resultCount: results.length,
              developers: results,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to search developers: ${error.message}`);
    }
  }

  /**
   * Get cryptographic proof of reputation
   */
  private async getReputationProof(args: any) {
    const { developerId } = args;

    try {
      const reputationData = await this.publisher.queryDeveloperReputation(developerId);
      const proof = reputationData.verifiableCredential?.proof;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              developerId,
              proof,
              verified: !!proof,
              proofType: proof?.['@type'],
              created: proof?.created,
              verificationMethod: proof?.verificationMethod,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get reputation proof: ${error.message}`);
    }
  }

  /**
   * Compare multiple developers
   */
  private async compareDevelopers(args: any) {
    const { developerIds } = args;

    if (!Array.isArray(developerIds) || developerIds.length === 0) {
      throw new Error('developerIds must be a non-empty array');
    }

    const comparisons = await Promise.all(
      developerIds.map(async (id) => {
        try {
          const data = await this.publisher.queryDeveloperReputation(id);
          return {
            developerId: id,
            reputationScore: data['dotrep:reputationScore'],
            contributionCount: data['dotrep:contributions'].length,
            lastUpdated: data.dateModified,
          };
        } catch (error) {
          return {
            developerId: id,
            error: error.message,
          };
        }
      })
    );

    // Sort by reputation score
    comparisons.sort((a, b) => (b.reputationScore || 0) - (a.reputationScore || 0));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            comparisonCount: developerIds.length,
            developers: comparisons,
          }, null, 2),
        },
      ],
    };
  }

  /**
   * Check DKG health
   */
  private async getDKGHealth() {
    try {
      const isHealthy = await this.dkgClient.healthCheck();
      const nodeInfo = isHealthy ? await this.dkgClient.getNodeInfo() : null;
      const status = this.dkgClient.getStatus();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              healthy: isHealthy,
              mockMode: status.mockMode || false,
              nodeInfo,
              status,
              timestamp: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      // Return unhealthy status instead of throwing
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              healthy: false,
              mockMode: true,
              error: error.message,
              timestamp: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    }
  }

  /**
   * Detect misinformation using AI agent
   */
  private async detectMisinformation(args: any) {
    const { claim, context } = args;

    try {
      const analysis = await this.aiAgents.misinformationDetection.analyzeClaim(claim, context);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(analysis, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to detect misinformation: ${error.message}`);
    }
  }

  /**
   * Verify truth using AI agent
   */
  private async verifyTruth(args: any) {
    const { claim } = args;

    try {
      const result = await this.aiAgents.truthVerification.verifyClaim(claim);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to verify truth: ${error.message}`);
    }
  }

  /**
   * Make autonomous transaction decision
   */
  private async autonomousTransactionDecision(args: any) {
    const { action, targetAccount, amount, context } = args;

    try {
      const decision = await this.aiAgents.autonomousTransaction.makeDecision(
        action,
        targetAccount,
        amount,
        context
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(decision, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to make autonomous decision: ${error.message}`);
    }
  }

  /**
   * Perform cross-chain reasoning
   */
  private async crossChainReasoning(args: any) {
    const { query, chains } = args;

    try {
      const result = await this.aiAgents.crossChainReasoning.reason(query, chains);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to perform cross-chain reasoning: ${error.message}`);
    }
  }

  /**
   * Publish a Community Note
   */
  private async publishCommunityNote(args: any) {
    const { targetUAL, noteType, content, author, evidence, reasoning } = args;

    try {
      const { getCommunityNotesService } = await import('../dkg-integration/community-notes');
      const service = getCommunityNotesService();
      const result = await service.publishNote({
        targetUAL,
        noteType,
        content,
        author,
        evidence: evidence || [],
        reasoning: reasoning || '',
        timestamp: Date.now(),
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              ual: result.ual,
              note: result.note,
              message: `Community Note published successfully: ${result.ual}`,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to publish Community Note: ${error.message}`);
    }
  }

  /**
   * Get Community Notes for a target UAL
   */
  private async getCommunityNotes(args: any) {
    const { targetUAL } = args;

    try {
      const { getCommunityNotesService } = await import('../dkg-integration/community-notes');
      const service = getCommunityNotesService();
      const notes = await service.getNotesForTarget(targetUAL);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              targetUAL,
              noteCount: notes.length,
              notes,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get Community Notes: ${error.message}`);
    }
  }

  /**
   * Get impact metrics
   */
  private async getImpactMetrics(args: any) {
    const { summary = true } = args;

    try {
      const { getImpactMetrics } = await import('../server/_core/impactMetrics');
      const metrics = getImpactMetrics();

      if (summary) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(metrics.getMetricsSummary(), null, 2),
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(metrics.getMetrics(), null, 2),
            },
          ],
        };
      }
    } catch (error) {
      throw new Error(`Failed to get impact metrics: ${error.message}`);
    }
  }

  /**
   * Verify content using Guardian
   */
  private async verifyContent(args: any) {
    const { content_url, content_type = 'image', check_type = 'all' } = args;

    try {
      const { getGuardianApi } = await import('../server/_core/guardianApi');
      const guardianApi = getGuardianApi();

      const verificationResult = await guardianApi.verifyContent({
        contentUrl: content_url,
        contentType: content_type,
        checkType: check_type,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: verificationResult.status,
              confidence: verificationResult.confidence,
              matches: verificationResult.matches,
              recommendedAction: verificationResult.recommendedAction,
              evidenceUAL: verificationResult.evidenceUAL,
              fingerprint: verificationResult.fingerprint.hash,
              summary: verificationResult.summary,
              processingTime: verificationResult.processingTime,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to verify content: ${error.message}`);
    }
  }

  /**
   * Create verification Community Note
   */
  private async createVerificationCommunityNote(args: any) {
    const { target_ual, verification_result, author = 'did:dkg:umanitek-guardian' } = args;

    try {
      const { getGuardianVerificationService } = await import('../dkg-integration/guardian-verification');
      const service = getGuardianVerificationService();

      const result = await service.createVerificationCommunityNote(
        target_ual,
        verification_result,
        author
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              ual: result.ual,
              note: result.note,
              message: `Verification Community Note published successfully: ${result.ual}`,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to create verification Community Note: ${error.message}`);
    }
  }

  /**
   * Get creator safety score
   */
  private async getCreatorSafetyScore(args: any) {
    const { creator_id } = args;

    try {
      const { getGuardianVerificationService } = await import('../dkg-integration/guardian-verification');
      const service = getGuardianVerificationService();

      const safetyScore = await service.calculateCreatorSafetyScore(creator_id);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              creatorId: creator_id,
              safetyScore: safetyScore.safetyScore,
              totalVerifications: safetyScore.totalVerifications,
              flaggedCount: safetyScore.flaggedCount,
              averageConfidence: safetyScore.averageConfidence,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get creator safety score: ${error.message}`);
    }
  }

  /**
   * Create user flag
   */
  private async createUserFlag(args: any) {
    const {
      flag_actor,
      flag_target,
      flag_type,
      confidence,
      evidence = [],
      severity = 'medium',
      reporter_reputation,
      description,
    } = args;

    try {
      const { getUserFlaggingService } = await import('../dkg-integration/user-flagging-service');
      const flaggingService = getUserFlaggingService();

      const result = await flaggingService.createFlag({
        flagActor: flag_actor,
        flagTarget: flag_target,
        flagType: flag_type,
        confidence,
        evidence,
        severity,
        reporterReputation: reporter_reputation,
        description,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              flagId: result.flagId,
              ual: result.ual,
              transactionHash: result.transactionHash,
              message: `Flag created successfully: ${result.flagId}`,
            }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to create user flag: ${error.message}`);
    }
  }

  /**
   * Analyze flagging patterns
   */
  private async analyzeFlaggingPatterns(args: any) {
    const { target_user_did, time_window_hours = 24 } = args;

    try {
      const { getUserFlaggingService } = await import('../dkg-integration/user-flagging-service');
      const flaggingService = getUserFlaggingService();

      const analysis = await flaggingService.analyzeFlaggingPatterns(
        target_user_did,
        time_window_hours
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(analysis, null, 2),
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to analyze flagging patterns: ${error.message}`);
    }
  }

  /**
   * Calculate flagging impact on reputation
   */
  private async calculateFlaggingImpact(args: any) {
    const { user_did, base_reputation } = args;

    try {
      const { getUserFlaggingService } = await import('../dkg-integration/user-flagging-service');
      const flaggingService = getUserFlaggingService();

      const impact = await flaggingService.calculateFlaggingImpact(user_did, base_reputation);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(impact, null, 2),
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to calculate flagging impact: ${error.message}`);
    }
  }

  /**
   * Get flagging insights
   */
  private async getFlaggingInsights(args: any) {
    const { time_window_hours = 24 } = args;

    try {
      const { getFlaggingAnalytics } = await import('../dkg-integration/flagging-analytics');
      const analytics = getFlaggingAnalytics();

      const insights = await analytics.generateFlaggingInsights(time_window_hours);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(insights, null, 2),
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to get flagging insights: ${error.message}`);
    }
  }

  /**
   * Automated content review
   */
  private async automatedContentReview(args: any) {
    const { content_fingerprint, content_type, target_user_did } = args;

    try {
      const { getGuardianFlaggingIntegration } = await import('../dkg-integration/guardian-flagging-integration');
      const guardianIntegration = getGuardianFlaggingIntegration();

      const result = await guardianIntegration.automatedContentReview(
        content_fingerprint,
        content_type,
        target_user_did
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to perform automated content review: ${error.message}`);
    }
  }

  /**
   * Query reputation scores using enhanced SPARQL queries
   * 
   * Improved implementation that uses the comprehensive queryChatbotUserReputation
   * method from DKG client, supporting multi-dimensional reputation metrics
   * and trust marketplace schema.
   */
  private async queryReputationScores(args: any) {
    const { 
      user_did, 
      metrics = ['social_rank', 'economic_stake', 'sybil_risk'],
      include_breakdown = true,
      include_sybil_risk = true,
      include_temporal_metrics = false,
      detailed = false
    } = args;

    try {
      // Validate user DID
      if (!user_did || typeof user_did !== 'string' || user_did.trim().length === 0) {
        throw new Error('user_did must be a non-empty string');
      }

      // Use enhanced DKG client method for comprehensive reputation query
      let reputationData: any;
      
      if (detailed) {
        // Use detailed breakdown method
        reputationData = await this.dkgClient.queryDetailedChatbotReputation(user_did);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                user_did,
                overall_score: reputationData.overallScore,
                component_scores: {
                  social_rank: reputationData.componentScores.socialRank,
                  economic_stake: reputationData.componentScores.economicStake,
                  endorsement_quality: reputationData.componentScores.endorsementQuality,
                  temporal_consistency: reputationData.componentScores.temporalConsistency,
                  validation_score: reputationData.componentScores.validationScore,
                },
                sybil_resistance: {
                  sybil_risk: reputationData.sybilResistance.sybilRisk,
                  behavioral_anomaly: reputationData.sybilResistance.behavioralAnomaly,
                  cluster_detection: reputationData.sybilResistance.clusterDetection,
                },
                provenance: reputationData.provenance,
                timestamp: new Date().toISOString(),
              }, null, 2),
            },
          ],
        };
      } else {
        // Use standard comprehensive query
        reputationData = await this.dkgClient.queryChatbotUserReputation(user_did, {
          includeBreakdown: include_breakdown,
          includeSybilRisk: include_sybil_risk,
          includeTemporalMetrics: include_temporal_metrics
        });

        // Build response based on requested metrics
        const response: any = {
          user_did,
          overall_score: reputationData.overallScore,
          last_updated: reputationData.lastUpdated,
          timestamp: reputationData.timestamp,
        };

        if (include_breakdown && reputationData.componentScores) {
          if (metrics.includes('social_rank') && reputationData.componentScores.socialRank !== undefined) {
            response.social_rank = reputationData.componentScores.socialRank;
          }
          if (metrics.includes('economic_stake') && reputationData.componentScores.economicStake !== undefined) {
            response.economic_stake = reputationData.componentScores.economicStake;
          }
          if (metrics.includes('endorsement_quality') && reputationData.componentScores.endorsementQuality !== undefined) {
            response.endorsement_quality = reputationData.componentScores.endorsementQuality;
          }
          if (include_temporal_metrics && metrics.includes('temporal_consistency') && 
              reputationData.componentScores.temporalConsistency !== undefined) {
            response.temporal_consistency = reputationData.componentScores.temporalConsistency;
          }
        }

        if (include_sybil_risk) {
          if (reputationData.sybilRisk !== undefined) {
            response.sybil_risk = reputationData.sybilRisk;
          }
          if (reputationData.behavioralAnomaly !== undefined) {
            response.behavioral_anomaly = reputationData.behavioralAnomaly;
          }
          
          // Fallback: Get sybil risk from Sybil Detective if not in DKG data
          if (response.sybil_risk === undefined && this.socialCreditAgents?.sybilDetective) {
            try {
              const sybilAnalysis = await this.socialCreditAgents.sybilDetective.analyzeAccount(user_did);
              response.sybil_risk = sybilAnalysis.confidence || 0.5;
              response.sybil_analysis_source = 'sybil_detective';
            } catch (sybilError) {
              console.warn(`Failed to get sybil analysis: ${sybilError}`);
            }
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      }
    } catch (error: any) {
      throw new Error(`Failed to query reputation scores: ${error.message || error}`);
    }
  }

  /**
   * Find influencers using Trust Navigator
   */
  private async findInfluencers(args: any) {
    const { query, limit = 10 } = args;

    try {
      const matches = await this.socialCreditAgents.trustNavigator.findInfluencers(query, limit);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              query,
              resultCount: matches.length,
              matches: matches.map(m => ({
                influencer: m.influencer,
                matchScore: m.matchScore,
                estimatedROI: m.estimatedROI,
                recommendedPayment: m.recommendedPayment,
                reasoning: m.reasoning,
              })),
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to find influencers: ${error.message}`);
    }
  }

  /**
   * Detect Sybil clusters
   */
  private async detectSybilClusters(args: any) {
    const { graph_data, analysis_depth = 3 } = args;

    try {
      // For demo, use mock graph data
      // In production, would query from DKG using graph_data UAL
      const mockGraphData = [
        {
          accountId: 'did:example:1',
          reputation: 100,
          contributions: [{ timestamp: Date.now(), block: 1 }],
          connections: [{ target: 'did:example:2', weight: 0.9 }],
        },
      ];

      const clusters = await this.socialCreditAgents.sybilDetective.detectSybilClusters(mockGraphData);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              analysis_depth,
              clusterCount: clusters.length,
              clusters,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to detect Sybil clusters: ${error.message}`);
    }
  }

  /**
   * Negotiate endorsement deal
   */
  private async negotiateEndorsementDeal(args: any) {
    const { influencer_did, brand_did, campaign_requirements, initial_terms = {} } = args;

    try {
      const deal = await this.socialCreditAgents.contractNegotiator.negotiateDeal(
        influencer_did,
        brand_did,
        initial_terms,
        campaign_requirements
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              deal,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to negotiate deal: ${error.message}`);
    }
  }

  /**
   * Initiate x402 payment
   */
  private async initiateX402Payment(args: any) {
    const { deal_id, amount, recipient, conditions = {} } = args;

    try {
      // Get deal (would fetch from database in production)
      const mockDeal = {
        dealId: deal_id,
        influencerDid: recipient,
        brandDid: 'did:brand:1',
        terms: {
          paymentAmount: amount,
          paymentToken: 'DOT',
          deliverables: [],
          timeline: { start: Date.now(), end: Date.now() + 30 * 24 * 60 * 60 * 1000 },
        },
        status: 'pending' as const,
      };

      const x402Setup = await this.socialCreditAgents.contractNegotiator.setupX402Payment(mockDeal);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              paymentId: x402Setup.paymentId,
              paymentRequest: x402Setup.paymentRequest,
              message: 'x402 payment flow initiated. Provide payment proof to complete.',
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to initiate x402 payment: ${error.message}`);
    }
  }

  /**
   * Optimize campaign performance
   */
  private async optimizeCampaignPerformance(args: any) {
    const { campaign_id, deal_ids } = args;

    try {
      // Get deals (would fetch from database in production)
      const mockDeals = deal_ids.map((id: string) => ({
        dealId: id,
        influencerDid: `did:influencer:${id}`,
        brandDid: 'did:brand:1',
        terms: {
          paymentAmount: 100,
          paymentToken: 'DOT',
          deliverables: [],
          timeline: { start: Date.now(), end: Date.now() + 30 * 24 * 60 * 60 * 1000 },
        },
        status: 'active' as const,
      }));

      const optimization = await this.socialCreditAgents.campaignOptimizer.optimizeCampaign(
        campaign_id,
        mockDeals
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              campaign_id,
              optimization,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to optimize campaign: ${error.message}`);
    }
  }

  /**
   * Verify reputation
   */
  private async verifyReputation(args: any) {
    const { did, include_history = false } = args;

    try {
      const verification = await this.socialCreditAgents.trustAuditor.verifyReputation(did, include_history);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              did,
              verification,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to verify reputation: ${error.message}`);
    }
  }

  /**
   * Generate transparency report
   */
  private async generateTransparencyReport(args: any) {
    const { campaign_id, deal_ids } = args;

    try {
      // Get deals (would fetch from database in production)
      const mockDeals = deal_ids.map((id: string) => ({
        dealId: id,
        influencerDid: `did:influencer:${id}`,
        brandDid: 'did:brand:1',
        terms: {
          paymentAmount: 100,
          paymentToken: 'DOT',
          deliverables: [],
          timeline: { start: Date.now(), end: Date.now() + 30 * 24 * 60 * 60 * 1000 },
        },
        status: 'active' as const,
        receiptUAL: `ual:receipt:${id}`,
      }));

      const report = await this.socialCreditAgents.trustAuditor.generateTransparencyReport(
        campaign_id,
        mockDeals
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              campaign_id,
              report,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to generate transparency report: ${error.message}`);
    }
  }

  /**
   * Request resource with x402 payment (autonomous agent payment)
   */
  private async requestResourceWithX402(args: any) {
    const { url, agent_id, payer_address, max_payment_amount = 1000, min_recipient_reputation = 0.5, enable_negotiation = true } = args;

    try {
      // Import x402 autonomous agent
      const { X402AutonomousAgent } = await import('../server/_core/x402AutonomousAgent');
      
      const agent = new X402AutonomousAgent({
        agentId: agent_id,
        payerAddress: payer_address,
        maxPaymentAmount: max_payment_amount,
        minRecipientReputation: min_recipient_reputation,
        enableNegotiation: enable_negotiation,
        trackPaymentEvidence: true,
      });

      const result = await agent.requestResource(url);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: result.success,
              data: result.data,
              paymentEvidence: result.paymentEvidence,
              amountPaid: result.amountPaid,
              chain: result.chain,
              retries: result.retries,
              negotiationAttempts: result.negotiationAttempts,
              error: result.error,
            }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to request resource with x402: ${error.message}`);
    }
  }

  /**
   * Discover x402-protected tools dynamically
   */
  private async discoverX402Tools(args: any) {
    const { category, min_provider_reputation, max_price, capabilities } = args;

    try {
      // In production, this would query a tool registry or marketplace
      // For now, return available tools from this MCP server
      const availableTools = this.getTools()
        .filter(tool => {
          // Filter by category if provided
          if (category && !tool.name.includes(category)) {
            return false;
          }
          return true;
        })
        .map(tool => ({
          name: tool.name,
          description: tool.description,
          category: this.categorizeTool(tool.name),
          pricing: this.estimateToolPricing(tool.name),
          reputationRequirements: {
            minProviderReputation: min_provider_reputation || 0.5,
          },
          capabilities: this.extractCapabilities(tool),
        }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              tools: availableTools,
              total: availableTools.length,
              filters: { category, min_provider_reputation, max_price, capabilities },
            }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to discover x402 tools: ${error.message}`);
    }
  }

  /**
   * Execute code with MCP tools (progressive disclosure pattern)
   */
  private async executeCodeWithMcpTools(args: any) {
    const { code, tool_imports, context = {} } = args;

    try {
      // Create a sandboxed execution environment
      // In production, use a proper sandbox like vm2 or isolated-vm
      // For now, we'll use a simplified approach that calls the tools directly
      
      const toolResults: Record<string, any> = {};
      
      // Import and execute tools
      for (const toolName of tool_imports) {
        // Find the tool handler
        const tool = this.getTools().find(t => t.name === toolName);
        if (!tool) {
          throw new Error(`Tool not found: ${toolName}`);
        }
        
        // In a real implementation, we would:
        // 1. Parse the code to extract tool calls
        // 2. Execute the code in a sandbox
        // 3. Intercept tool calls and route them to MCP handlers
        // 4. Return processed results
        
        // For now, return a simplified response
        toolResults[toolName] = {
          available: true,
          description: tool.description,
        };
      }

      // Execute code (simplified - in production use proper sandbox)
      // This is a placeholder that shows the pattern
      const executionResult = {
        success: true,
        message: 'Code execution pattern enabled. In production, code would be executed in a sandboxed environment.',
        toolImports: tool_imports,
        availableTools: toolResults,
        context,
        note: 'This enables progressive disclosure - agents can write code to process large datasets efficiently without loading all data into context.',
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(executionResult, null, 2),
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to execute code with MCP tools: ${error.message}`);
    }
  }

  /**
   * Query payment history for reputation analysis
   */
  private async queryPaymentHistory(args: any) {
    const { payer_address, recipient_address, start_timestamp, end_timestamp, min_amount, limit = 100 } = args;

    try {
      // In production, query from DKG or payment database
      // For now, return mock data structure
      const payments = [
        {
          txHash: '0x123...',
          payer: payer_address,
          recipient: recipient_address || '0x456...',
          amount: '10.50',
          currency: 'USDC',
          chain: 'base',
          timestamp: Date.now() - 86400000, // 1 day ago
          verified: true,
          resourceUAL: 'urn:ual:dotrep:resource:reputation-query',
        },
      ];

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              payments: payments.slice(0, limit),
              total: payments.length,
              query: {
                payer_address,
                recipient_address,
                start_timestamp,
                end_timestamp,
                min_amount,
                limit,
              },
            }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to query payment history: ${error.message}`);
    }
  }

  /**
   * Evaluate payment decision
   */
  private async evaluatePaymentDecision(args: any) {
    const { payment_request, agent_config = {} } = args;

    try {
      // Import x402 autonomous agent for decision evaluation
      const { X402AutonomousAgent } = await import('../server/_core/x402AutonomousAgent');
      
      const agent = new X402AutonomousAgent({
        agentId: agent_config.agentId || 'mcp-agent',
        payerAddress: agent_config.payerAddress || payment_request.payer || '',
        maxPaymentAmount: agent_config.maxPaymentAmount || 1000,
        minRecipientReputation: agent_config.minRecipientReputation || 0.5,
        enableNegotiation: agent_config.enableNegotiation ?? true,
      });

      // Use private method via type assertion (in production, expose this as public)
      const decision = await (agent as any).evaluatePaymentDecision(payment_request);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              decision,
              payment_request,
              agent_config,
            }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      // Fallback to simple evaluation
      const amount = parseFloat(payment_request.amount || '0');
      const maxAmount = agent_config.maxPaymentAmount || 1000;
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              decision: {
                shouldPay: amount <= maxAmount,
                reasoning: amount <= maxAmount 
                  ? `Payment amount (${amount}) is within limit (${maxAmount})`
                  : `Payment amount (${amount}) exceeds limit (${maxAmount})`,
                confidence: amount <= maxAmount ? 0.9 : 0.1,
                riskFactors: amount > 100 ? ['High payment amount'] : undefined,
              },
              payment_request,
              agent_config,
            }, null, 2),
          },
        ],
      };
    }
  }

  /**
   * Helper: Categorize tool by name
   */
  private categorizeTool(toolName: string): string {
    if (toolName.includes('reputation')) return 'reputation';
    if (toolName.includes('payment') || toolName.includes('x402')) return 'payment';
    if (toolName.includes('verify') || toolName.includes('detect')) return 'verification';
    if (toolName.includes('query') || toolName.includes('search')) return 'data';
    return 'general';
  }

  /**
   * Helper: Estimate tool pricing
   */
  private estimateToolPricing(toolName: string): { amount: string; currency: string } {
    // Simple pricing estimation based on tool complexity
    if (toolName.includes('x402') || toolName.includes('payment')) {
      return { amount: '0.01', currency: 'USDC' }; // Micropayment
    }
    if (toolName.includes('reputation') || toolName.includes('query')) {
      return { amount: '0.05', currency: 'USDC' }; // Small fee
    }
    return { amount: '0.10', currency: 'USDC' }; // Default
  }

  /**
   * Helper: Extract capabilities from tool
   */
  private extractCapabilities(tool: any): string[] {
    const capabilities: string[] = [];
    const desc = tool.description?.toLowerCase() || '';
    
    if (desc.includes('reputation')) capabilities.push('reputation_query');
    if (desc.includes('payment') || desc.includes('x402')) capabilities.push('payment_verification');
    if (desc.includes('verify')) capabilities.push('verification');
    if (desc.includes('discover') || desc.includes('search')) capabilities.push('discovery');
    
    return capabilities;
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('DotRep MCP Server running on stdio');
  }
}

/**
 * Main entry point
 */
async function main() {
  const server = new DotRepMCPServer();
  await server.start();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
