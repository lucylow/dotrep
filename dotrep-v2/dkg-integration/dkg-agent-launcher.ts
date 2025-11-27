/**
 * DKG-Based AI Agent Launcher & Orchestrator
 * 
 * Comprehensive framework for launching and managing DKG-based AI agents with:
 * - Decentralized Retrieval-Augmented Generation (dRAG)
 * - Collective, persistent memory across agents
 * - Neuro-symbolic AI stack integration
 * - Agent lifecycle management
 * - Knowledge sharing and collaboration
 * 
 * Based on OriginTrail DKG v8 architecture and best practices for AI agent deployment.
 * 
 * Features:
 * - Agent orchestration and coordination
 * - Shared knowledge base via DKG Knowledge Assets
 * - Verifiable AI responses with UAL citations
 * - Collective intelligence through agent swarm
 * - Persistent memory that survives agent restarts
 * 
 * @module dkg-agent-launcher
 */

import { DKGClientV8, DKGConfig, createDKGClientV8 } from './dkg-client-v8';
import { ProvenanceAwareRetriever, RetrievalQuery, RetrievalResponse } from './drag-retriever';
import { NeuroSymbolicKG, NeuroSymbolicQuery } from './neuro-symbolic-kg';
import { ProvenanceRegistry } from './provenance-registry';
import { X402AutonomousAgent, createX402AutonomousAgent } from '../server/_core/x402AutonomousAgent';
import type { AgentPaymentConfig, AgentPaymentResult } from '../server/_core/x402AutonomousAgent';

export interface AgentConfig {
  agentId: string;
  agentName: string;
  purpose: string;
  capabilities: string[];
  dkgConfig?: DKGConfig;
  enableDRAG?: boolean;
  enableCollectiveMemory?: boolean;
  memoryRetentionDays?: number;
  maxMemorySize?: number;
  enableKnowledgeSharing?: boolean;
  agentSwarmId?: string; // ID for agent swarm/collective
  /** x402 Payment configuration for autonomous agent payments */
  x402Config?: {
    payerAddress: string;
    privateKey?: string;
    facilitatorUrl?: string;
    preferredChain?: 'base' | 'base-sepolia' | 'solana' | 'ethereum' | 'polygon' | 'arbitrum';
    maxPaymentAmount?: number;
    minRecipientReputation?: number;
    enableNegotiation?: boolean;
    trackPaymentEvidence?: boolean;
  };
}

export interface AgentMemory {
  agentId: string;
  memories: Array<{
    id: string;
    type: 'interaction' | 'knowledge' | 'decision' | 'learning';
    content: any;
    timestamp: number;
    ual?: string; // UAL of Knowledge Asset if published
    provenanceScore?: number;
  }>;
  lastUpdated: number;
  totalSize: number;
}

export interface AgentTask {
  taskId: string;
  agentId: string;
  taskType: 'query' | 'reasoning' | 'verification' | 'publish' | 'collaboration';
  input: any;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: any;
  error?: string;
  startedAt?: number;
  completedAt?: number;
  citations?: string[]; // UALs cited in response
}

export interface AgentResponse {
  agentId: string;
  response: string;
  confidence: number;
  citations: string[]; // UALs of Knowledge Assets used
  provenanceScore: number; // Average provenance of sources
  reasoning?: string;
  metadata?: Record<string, any>;
  /** Payment information if x402 was used */
  paymentInfo?: {
    amountPaid?: string;
    chain?: string;
    txHash?: string;
    paymentUAL?: string; // UAL of payment evidence Knowledge Asset
  };
}

export interface CollectiveMemoryQuery {
  query: string;
  agentIds?: string[]; // Query specific agents' memories, or all if undefined
  memoryTypes?: Array<'interaction' | 'knowledge' | 'decision' | 'learning'>;
  minProvenanceScore?: number;
  timeRange?: {
    start: number;
    end: number;
  };
}

/**
 * DKG-Based AI Agent
 * 
 * Individual agent instance with dRAG capabilities and collective memory
 */
export class DKGAIAgent {
  protected config: AgentConfig;
  protected dkgClient: DKGClientV8;
  protected retriever: ProvenanceAwareRetriever;
  protected neuroSymbolicKG: NeuroSymbolicKG;
  protected memory: AgentMemory;
  protected isActive: boolean = false;
  /** x402 payment client for autonomous payments (optional) */
  protected x402Agent?: X402AutonomousAgent;

  constructor(config: AgentConfig) {
    this.config = config;
    this.dkgClient = createDKGClientV8(config.dkgConfig);
    this.retriever = new ProvenanceAwareRetriever(this.dkgClient);
    this.neuroSymbolicKG = new NeuroSymbolicKG(this.dkgClient, this.retriever);
    
    // Initialize x402 payment client if configured
    if (config.x402Config) {
      const paymentConfig: AgentPaymentConfig = {
        agentId: config.agentId,
        payerAddress: config.x402Config.payerAddress,
        privateKey: config.x402Config.privateKey,
        facilitatorUrl: config.x402Config.facilitatorUrl,
        preferredChain: config.x402Config.preferredChain || 'base',
        maxPaymentAmount: config.x402Config.maxPaymentAmount || 1000.0,
        minRecipientReputation: config.x402Config.minRecipientReputation || 0.5,
        enableNegotiation: config.x402Config.enableNegotiation ?? true,
        trackPaymentEvidence: config.x402Config.trackPaymentEvidence ?? true,
      };
      this.x402Agent = createX402AutonomousAgent(paymentConfig);
      console.log(`💰 x402 payment client initialized for agent ${config.agentId}`);
    }
    
    this.memory = {
      agentId: config.agentId,
      memories: [],
      lastUpdated: Date.now(),
      totalSize: 0
    };
  }

  /**
   * Initialize and activate the agent
   */
  async initialize(): Promise<void> {
    console.log(`🤖 Initializing DKG AI Agent: ${this.config.agentName} (${this.config.agentId})`);
    console.log(`   Purpose: ${this.config.purpose}`);
    console.log(`   Capabilities: ${this.config.capabilities.join(', ')}`);

    // Load existing memory from DKG if collective memory is enabled
    if (this.config.enableCollectiveMemory) {
      await this.loadCollectiveMemory();
    }

    // Verify DKG connection
    const isHealthy = await this.dkgClient.healthCheck();
    if (!isHealthy) {
      throw new Error(`DKG connection unhealthy for agent ${this.config.agentId}`);
    }

    // x402 payment client is already initialized in constructor if configured
    if (this.x402Agent) {
      console.log(`💰 x402 payment integration enabled for agent ${this.config.agentName}`);
    }

    this.isActive = true;
    console.log(`✅ Agent ${this.config.agentName} initialized and active`);
  }

  /**
   * Process a query using dRAG (Decentralized RAG) with optional x402 payment support
   * 
   * Uses the neuro-symbolic AI stack:
   * - Knowledge Base Layer: Queries DKG Knowledge Assets
   * - Trust Layer: Verifies provenance via blockchain
   * - Verifiable AI Layer: Performs dRAG with citations
   * - Payment Layer: Automatically handles x402 payments for premium data access
   */
  async processQuery(
    query: string,
    options: {
      useHybrid?: boolean;
      minProvenanceScore?: number;
      topK?: number;
      requireCitations?: boolean;
      /** Enable x402 payment for premium DKG queries */
      enablePayment?: boolean;
      /** Maximum payment amount for this query (overrides config) */
      maxPaymentAmount?: number;
      /** Premium DKG endpoint URL (if different from default) */
      premiumEndpoint?: string;
    } = {}
  ): Promise<AgentResponse> {
    if (!this.isActive) {
      throw new Error(`Agent ${this.config.agentId} is not active`);
    }

    console.log(`\n🔍 Agent ${this.config.agentName} processing query: "${query}"`);

    const {
      useHybrid = true,
      minProvenanceScore = 50,
      topK = 5,
      requireCitations = true,
      enablePayment = this.x402Agent !== undefined,
      premiumEndpoint
    } = options;

    let paymentInfo: AgentResponse['paymentInfo'] | undefined;
    let paymentEvidenceUAL: string | undefined;

    try {
      // If premium endpoint is specified and payment is enabled, try premium query first
      if (enablePayment && premiumEndpoint && this.x402Agent) {
        try {
          console.log(`💰 Attempting premium query via x402 payment...`);
          const paymentResult = await this.queryWithPayment(premiumEndpoint, query, options);
          
          if (paymentResult.success && paymentResult.data) {
            paymentInfo = {
              amountPaid: paymentResult.amountPaid,
              chain: paymentResult.chain,
              txHash: paymentResult.paymentProof?.txHash,
            };

            // Track payment evidence to DKG if enabled
            if (paymentResult.paymentEvidence && this.config.x402Config?.trackPaymentEvidence) {
              paymentEvidenceUAL = await this.publishPaymentEvidence(paymentResult.paymentEvidence);
              if (paymentEvidenceUAL) {
                paymentInfo.paymentUAL = paymentEvidenceUAL;
                console.log(`✅ Payment evidence published to DKG: ${paymentEvidenceUAL}`);
              }
            }

            // Use premium data directly
            return this.formatPaymentResponse(query, paymentResult.data, paymentInfo);
          }
        } catch (paymentError) {
          console.warn(`⚠️  Premium query with payment failed, falling back to standard query:`, paymentError);
          // Fall through to standard query
        }
      }

      let retrievalResult: RetrievalResponse;
      let reasoning: string | undefined;

      if (useHybrid && this.config.enableDRAG !== false) {
        // Use neuro-symbolic hybrid query
        const hybridQuery: NeuroSymbolicQuery = {
          query,
          useSymbolic: true,
          useNeural: true,
          hybrid: true,
          minProvenanceScore,
          topK
        };

        const hybridResult = await this.neuroSymbolicKG.executeHybridQuery(hybridQuery);
        reasoning = hybridResult.reasoning;

        // Convert hybrid results to retrieval response format
        retrievalResult = {
          results: hybridResult.merged.map(r => ({
            text: r.text,
            ual: r.ual,
            provenanceScore: r.provenanceScore,
            sourceHash: r.sourceHash,
            metadata: r.metadata,
            relevanceScore: r.relevanceScore
          })),
          totalResults: hybridResult.merged.length,
          queryId: `query-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          citations: hybridResult.merged.map(r => r.ual)
        };
      } else {
        // Use standard dRAG retrieval (with potential x402 payment handling)
        const retrievalQuery: RetrievalQuery = {
          query,
          topK,
          minProvenanceScore,
          requireCitations
        };

        retrievalResult = await this.retriever.retrieve(retrievalQuery);
      }

      // Check if we have sufficient provenance
      if (requireCitations && retrievalResult.citations.length === 0) {
        return {
          agentId: this.config.agentId,
          response: 'INSUFFICIENT_PROVENANCE: No verifiable sources found in DKG for this query.',
          confidence: 0,
          citations: [],
          provenanceScore: 0,
          reasoning: 'No Knowledge Assets with sufficient provenance score found in DKG.'
        };
      }

      // Format response with citations
      const formattedResponse = await this.formatResponse(query, retrievalResult, reasoning);

      // Calculate confidence and provenance scores
      const avgProvenance = retrievalResult.results.length > 0
        ? retrievalResult.results.reduce((sum, r) => sum + r.provenanceScore, 0) / retrievalResult.results.length
        : 0;

      const confidence = this.calculateConfidence(retrievalResult, avgProvenance);

      // Store interaction in memory
      if (this.config.enableCollectiveMemory) {
        await this.storeMemory({
          type: 'interaction',
          content: {
            query,
            response: formattedResponse,
            citations: retrievalResult.citations,
            confidence
          },
          timestamp: Date.now(),
          ual: undefined, // Will be set if published
          provenanceScore: avgProvenance
        });
      }

      console.log(`✅ Query processed. Citations: ${retrievalResult.citations.length}, Confidence: ${(confidence * 100).toFixed(1)}%`);

      return {
        agentId: this.config.agentId,
        response: formattedResponse,
        confidence,
        citations: retrievalResult.citations,
        provenanceScore: avgProvenance,
        reasoning,
        paymentInfo,
        metadata: {
          totalResults: retrievalResult.totalResults,
          queryId: retrievalResult.queryId
        }
      };
    } catch (error: any) {
      console.error(`❌ Agent ${this.config.agentName} query processing failed:`, error);
      throw new Error(`Query processing failed: ${error.message}`);
    }
  }

  /**
   * Store knowledge in collective memory (publish to DKG)
   * 
   * Enables knowledge sharing across agent swarm
   */
  async storeKnowledge(
    knowledge: {
      title: string;
      content: any;
      type?: 'fact' | 'insight' | 'pattern' | 'decision';
      tags?: string[];
      relatedUALs?: string[];
    }
  ): Promise<string> {
    if (!this.config.enableKnowledgeSharing) {
      throw new Error('Knowledge sharing is not enabled for this agent');
    }

    console.log(`📚 Agent ${this.config.agentName} storing knowledge: "${knowledge.title}"`);

    try {
      // Convert knowledge to JSON-LD Knowledge Asset
      const knowledgeAsset = this.createKnowledgeAsset(knowledge);

      // Publish to DKG
      const result = await this.dkgClient.publishReputationAsset({
        developerId: `agent:${this.config.agentId}`,
        reputationScore: 0, // Not applicable for knowledge assets
        contributions: [],
        timestamp: Date.now(),
        metadata: {
          type: 'agent_knowledge',
          agentId: this.config.agentId,
          agentName: this.config.agentName,
          knowledgeType: knowledge.type || 'fact',
          title: knowledge.title,
          content: knowledge.content,
          tags: knowledge.tags || [],
          relatedUALs: knowledge.relatedUALs || []
        }
      }, 2); // Store for 2 epochs

      // Store in local memory
      if (this.config.enableCollectiveMemory) {
        await this.storeMemory({
          type: 'knowledge',
          content: knowledge,
          timestamp: Date.now(),
          ual: result.UAL,
          provenanceScore: 100 // Self-published, high provenance
        });
      }

      console.log(`✅ Knowledge stored with UAL: ${result.UAL}`);

      return result.UAL;
    } catch (error: any) {
      console.error(`❌ Failed to store knowledge:`, error);
      throw new Error(`Knowledge storage failed: ${error.message}`);
    }
  }

  /**
   * Query collective memory from agent swarm
   */
  async queryCollectiveMemory(query: CollectiveMemoryQuery): Promise<AgentMemory[]> {
    if (!this.config.enableCollectiveMemory) {
      throw new Error('Collective memory is not enabled');
    }

    console.log(`🔍 Querying collective memory: "${query.query}"`);

      // Use dRAG to search for relevant memories in DKG
      const retrievalResult = await this.retriever.retrieve({
        query: query.query,
        topK: 20,
        minProvenanceScore: query.minProvenanceScore || 50,
        filterByType: ['reputation'], // Knowledge assets are stored as reputation assets
        requireCitations: false
      });

      // Filter by agent IDs if specified
      const filteredResults = retrievalResult.results.filter(result => {
        if (query.agentIds && query.agentIds.length > 0) {
          const agentId = result.metadata?.agentId as string | undefined;
          return agentId && query.agentIds.includes(agentId);
        }
        return true;
      });

      // Convert to memory format
      const memories: AgentMemory[] = [];
      const agentMemoriesMap = new Map<string, AgentMemory>();

      for (const result of filteredResults) {
        const agentId = (result.metadata?.agentId as string) || 'unknown';
        const knowledgeType = result.metadata?.knowledgeType as string | undefined;
        const publishedAt = result.metadata?.publishedAt as number | undefined;
        const content = result.metadata?.content || result.text;
        
        if (!agentMemoriesMap.has(agentId)) {
          agentMemoriesMap.set(agentId, {
            agentId,
            memories: [],
            lastUpdated: Date.now(),
            totalSize: 0
          });
        }

        const memory = agentMemoriesMap.get(agentId)!;
        memory.memories.push({
          id: `memory-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: knowledgeType === 'decision' ? 'decision' :
                knowledgeType === 'pattern' ? 'learning' :
                knowledgeType === 'insight' ? 'knowledge' : 'knowledge',
          content: content,
          timestamp: publishedAt || Date.now(),
          ual: result.ual,
          provenanceScore: result.provenanceScore
        });
      }

    return Array.from(agentMemoriesMap.values());
  }

  /**
   * Format response with citations for LLM consumption
   */
  private async formatResponse(
    query: string,
    retrievalResult: RetrievalResponse,
    reasoning?: string
  ): Promise<string> {
    if (retrievalResult.results.length === 0) {
      return 'No relevant information found in the DKG knowledge base.';
    }

    const parts: string[] = [];

    // Add reasoning if available
    if (reasoning) {
      parts.push(`## Reasoning\n${reasoning}\n`);
    }

    // Add context with citations
    parts.push('## Context from DKG Knowledge Assets\n');
    retrievalResult.results.forEach((result, index) => {
      parts.push(`[${index + 1}] ${result.text}`);
      parts.push(`   UAL: ${result.ual}`);
      parts.push(`   Provenance: ${result.provenanceScore}/100\n`);
    });

    // Add references
    if (retrievalResult.citations.length > 0) {
      parts.push('\n## References\n');
      retrievalResult.citations.forEach((ual, index) => {
        parts.push(`[${index + 1}] ${ual}`);
      });
    }

    parts.push(`\n---\n*Response generated by ${this.config.agentName} using DKG dRAG*`);

    return parts.join('\n');
  }

  /**
   * Calculate confidence score based on retrieval results
   */
  private calculateConfidence(
    retrievalResult: RetrievalResponse,
    avgProvenance: number
  ): number {
    if (retrievalResult.results.length === 0) return 0;

    // Base confidence from number of sources
    const sourceConfidence = Math.min(retrievalResult.results.length / 5, 1) * 0.4;

    // Provenance confidence
    const provenanceConfidence = (avgProvenance / 100) * 0.4;

    // Relevance confidence (average relevance score)
    const avgRelevance = retrievalResult.results.reduce(
      (sum, r) => sum + (r.relevanceScore || 0),
      0
    ) / retrievalResult.results.length;
    const relevanceConfidence = avgRelevance * 0.2;

    return Math.min(sourceConfidence + provenanceConfidence + relevanceConfidence, 1);
  }

  /**
   * Create Knowledge Asset JSON-LD from knowledge object
   */
  private createKnowledgeAsset(knowledge: {
    title: string;
    content: any;
    type?: string;
    tags?: string[];
    relatedUALs?: string[];
  }): any {
    return {
      '@context': {
        '@vocab': 'https://schema.org/',
        'dotrep': 'https://dotrep.io/ontology/',
        'agent': 'https://dotrep.io/agent-ontology/'
      },
      '@type': 'CreativeWork',
      '@id': `did:agent:${this.config.agentId}:knowledge:${Date.now()}`,
      'name': knowledge.title,
      'description': typeof knowledge.content === 'string' 
        ? knowledge.content 
        : JSON.stringify(knowledge.content),
      'creator': {
        '@id': `did:agent:${this.config.agentId}`,
        'name': this.config.agentName
      },
      'datePublished': new Date().toISOString(),
      'agent:knowledgeType': knowledge.type || 'fact',
      'agent:agentId': this.config.agentId,
      'agent:agentName': this.config.agentName,
      'agent:agentSwarmId': this.config.agentSwarmId,
      'keywords': knowledge.tags || [],
      'agent:relatedUALs': knowledge.relatedUALs || []
    };
  }

  /**
   * Store memory entry
   */
  private async storeMemory(memory: {
    type: 'interaction' | 'knowledge' | 'decision' | 'learning';
    content: any;
    timestamp: number;
    ual?: string;
    provenanceScore?: number;
  }): Promise<void> {
    const memoryEntry = {
      id: `memory-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...memory
    };

    this.memory.memories.push(memoryEntry);
    this.memory.lastUpdated = Date.now();
    this.memory.totalSize += JSON.stringify(memoryEntry).length;

    // Enforce memory size limit
    if (this.config.maxMemorySize && this.memory.totalSize > this.config.maxMemorySize) {
      await this.cleanupOldMemories();
    }

    // Clean up old memories based on retention policy
    if (this.config.memoryRetentionDays) {
      const cutoff = Date.now() - (this.config.memoryRetentionDays * 24 * 60 * 60 * 1000);
      this.memory.memories = this.memory.memories.filter(m => m.timestamp >= cutoff);
    }
  }

  /**
   * Load collective memory from DKG
   */
  private async loadCollectiveMemory(): Promise<void> {
    try {
      // Query DKG for this agent's memories
      const query = `
        PREFIX agent: <https://dotrep.io/agent-ontology/>
        PREFIX schema: <https://schema.org/>
        
        SELECT ?ual ?content ?timestamp ?agentId
        WHERE {
          ?asset agent:agentId "${this.config.agentId}" .
          ?asset agent:knowledgeType ?type .
          ?asset schema:description ?content .
          ?asset schema:datePublished ?timestamp .
          BIND("${this.config.agentId}" AS ?agentId)
        }
        ORDER BY DESC(?timestamp)
        LIMIT 100
      `;

      const results = await this.dkgClient.executeSafeQuery(query, 'SELECT');
      
      // Load into memory
      for (const result of results) {
        this.memory.memories.push({
          id: `memory-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'knowledge',
          content: result.content,
          timestamp: new Date(result.timestamp).getTime(),
          ual: result.ual,
          provenanceScore: 100
        });
      }

      console.log(`📚 Loaded ${this.memory.memories.length} memories from collective memory`);
    } catch (error) {
      console.warn(`⚠️  Failed to load collective memory:`, error);
      // Continue without collective memory
    }
  }

  /**
   * Cleanup old memories to stay within size limit
   */
  private async cleanupOldMemories(): Promise<void> {
    // Sort by timestamp and remove oldest
    this.memory.memories.sort((a, b) => a.timestamp - b.timestamp);
    
    while (this.config.maxMemorySize && this.memory.totalSize > this.config.maxMemorySize) {
      const removed = this.memory.memories.shift();
      if (removed) {
        this.memory.totalSize -= JSON.stringify(removed).length;
      } else {
        break;
      }
    }
  }

  /**
   * Query premium DKG endpoint with x402 payment
   * 
   * Automatically handles HTTP 402 responses, executes payment,
   * and retries with payment proof.
   */
  protected async queryWithPayment(
    endpoint: string,
    query: string,
    options: {
      maxPaymentAmount?: number;
      topK?: number;
      minProvenanceScore?: number;
    }
  ): Promise<AgentPaymentResult<RetrievalResponse>> {
    if (!this.x402Agent) {
      throw new Error('x402 payment client not initialized');
    }

    // Update max payment amount if specified
    if (options.maxPaymentAmount) {
      // Temporarily update config (in production, create new instance)
      const originalMax = this.x402Agent['config'].maxPaymentAmount;
      this.x402Agent['config'].maxPaymentAmount = options.maxPaymentAmount;
      
      try {
        const result = await this.x402Agent.requestResource<RetrievalResponse>(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            query,
            topK: options.topK || 5,
            minProvenanceScore: options.minProvenanceScore || 50,
            agentId: this.config.agentId,
          }),
        });
        
        return result;
      } finally {
        // Restore original config
        this.x402Agent['config'].maxPaymentAmount = originalMax;
      }
    }

    return await this.x402Agent.requestResource<RetrievalResponse>(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query,
        topK: options.topK || 5,
        minProvenanceScore: options.minProvenanceScore || 50,
        agentId: this.config.agentId,
      }),
    });
  }

  /**
   * Publish payment evidence to DKG as a Knowledge Asset
   * 
   * Creates a verifiable record of the payment transaction for
   * reputation scoring and audit purposes.
   */
  protected async publishPaymentEvidence(
    paymentEvidence: any
  ): Promise<string | undefined> {
    if (!this.x402Agent) {
      return undefined;
    }

    try {
      // Extract payment data from evidence
      const paymentData = {
        txHash: paymentEvidence.txHash || paymentEvidence.transactionHash,
        payer: this.x402Agent['config'].payerAddress,
        recipient: paymentEvidence.recipient || paymentEvidence.payee,
        amount: paymentEvidence.amount || paymentEvidence.price,
        currency: paymentEvidence.currency || 'USDC',
        chain: paymentEvidence.chain || this.x402Agent['config'].preferredChain,
        resourceUAL: paymentEvidence.resourceUAL || paymentEvidence.productUAL,
        challenge: paymentEvidence.challenge,
        facilitatorSig: paymentEvidence.facilitatorSig || paymentEvidence.facilitatorSignature,
        signature: paymentEvidence.signature,
        blockNumber: paymentEvidence.blockNumber,
        timestamp: paymentEvidence.timestamp || new Date().toISOString(),
      };

      // Publish payment evidence to DKG
      const result = await this.dkgClient.publishPaymentEvidence(paymentData, {
        epochs: 2,
        validateSchema: true,
      });

      console.log(`📝 Payment evidence published to DKG: ${result.UAL}`);
      return result.UAL;
    } catch (error) {
      console.error(`❌ Failed to publish payment evidence:`, error);
      return undefined;
    }
  }

  /**
   * Format response from premium paid query
   */
  protected async formatPaymentResponse(
    query: string,
    data: RetrievalResponse,
    paymentInfo: AgentResponse['paymentInfo']
  ): Promise<AgentResponse> {
    const formattedResponse = await this.formatResponse(query, data);

    const avgProvenance = data.results.length > 0
      ? data.results.reduce((sum, r) => sum + r.provenanceScore, 0) / data.results.length
      : 0;

    const confidence = this.calculateConfidence(data, avgProvenance);

    return {
      agentId: this.config.agentId,
      response: formattedResponse,
      confidence,
      citations: data.citations,
      provenanceScore: avgProvenance,
      paymentInfo,
      metadata: {
        totalResults: data.totalResults,
        queryId: data.queryId,
        paidQuery: true,
      }
    };
  }

  /**
   * Query DKG with automatic payment retry for HTTP 402 responses
   * 
   * Enhanced query method that intercepts HTTP 402 Payment Required
   * responses and automatically pays for premium data access.
   */
  async queryDKGWithAutoPayment<T = any>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    // If x402 agent is available, use it for automatic payment handling
    if (this.x402Agent) {
      const result = await this.x402Agent.requestResource<T>(url, options);
      
      if (result.success && result.data) {
        // Track payment evidence if payment was made
        if (result.paymentEvidence && this.config.x402Config?.trackPaymentEvidence) {
          await this.publishPaymentEvidence(result.paymentEvidence);
        }
        
        return result.data;
      } else {
        throw new Error(result.error || 'Payment-enabled query failed');
      }
    }

    // Fallback to standard fetch (no payment handling)
    const response = await fetch(url, options);
    
    if (response.status === 402) {
      throw new Error(
        'HTTP 402 Payment Required. Configure x402 payment client to enable automatic payments.'
      );
    }
    
    if (!response.ok) {
      throw new Error(`Query failed with status ${response.status}`);
    }
    
    return await response.json() as T;
  }

  /**
   * Get agent status
   */
  getStatus(): {
    agentId: string;
    agentName: string;
    isActive: boolean;
    memorySize: number;
    memoryCount: number;
    dkgStatus: any;
    x402Enabled: boolean;
    paymentStats?: {
      totalPayments: number;
      totalAmount: number;
    };
  } {
    const status: any = {
      agentId: this.config.agentId,
      agentName: this.config.agentName,
      isActive: this.isActive,
      memorySize: this.memory.totalSize,
      memoryCount: this.memory.memories.length,
      dkgStatus: this.dkgClient.getStatus(),
      x402Enabled: this.x402Agent !== undefined,
    };

    if (this.x402Agent) {
      const paymentHistory = this.x402Agent.getPaymentHistory();
      status.paymentStats = {
        totalPayments: paymentHistory.length,
        totalAmount: paymentHistory.reduce((sum: number, evidence: any) => {
          // Extract amount from evidence (simplified - would need proper parsing in production)
          const amount = parseFloat(evidence.amount || evidence.price || '0');
          return sum + amount;
        }, 0),
      };
    }

    return status;
  }

  /**
   * Shutdown agent gracefully
   */
  async shutdown(): Promise<void> {
    console.log(`🛑 Shutting down agent ${this.config.agentName}`);
    this.isActive = false;
    
    // Optionally publish final memory state to DKG
    if (this.config.enableCollectiveMemory && this.memory.memories.length > 0) {
      // Could publish summary of memories
    }
  }
}

/**
 * Agent Orchestrator
 * 
 * Manages multiple agents, coordinates tasks, and enables agent swarm collaboration
 */
export class AgentOrchestrator {
  private agents: Map<string, DKGAIAgent> = new Map();
  private tasks: Map<string, AgentTask> = new Map();
  private swarmId: string;

  constructor(swarmId: string = `swarm-${Date.now()}`) {
    this.swarmId = swarmId;
  }

  /**
   * Launch a new agent
   */
  async launchAgent(config: AgentConfig): Promise<DKGAIAgent> {
    const agent = new DKGAIAgent({
      ...config,
      agentSwarmId: this.swarmId
    });

    await agent.initialize();
    this.agents.set(config.agentId, agent);

    console.log(`🚀 Agent ${config.agentName} launched in swarm ${this.swarmId}`);

    return agent;
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): DKGAIAgent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Route task to appropriate agent
   */
  async routeTask(
    task: Omit<AgentTask, 'taskId' | 'status' | 'startedAt' | 'completedAt'>
  ): Promise<AgentTask> {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const agentTask: AgentTask = {
      taskId,
      ...task,
      status: 'pending',
      startedAt: undefined,
      completedAt: undefined
    };

    this.tasks.set(taskId, agentTask);

    const agent = this.agents.get(task.agentId);
    if (!agent) {
      throw new Error(`Agent ${task.agentId} not found`);
    }

    try {
      agentTask.status = 'in_progress';
      agentTask.startedAt = Date.now();

      let result: any;
      switch (task.taskType) {
        case 'query':
          result = await agent.processQuery(task.input.query, task.input.options);
          break;
        case 'reasoning':
          result = await agent.processQuery(task.input.query, { useHybrid: true, ...task.input.options });
          break;
        case 'verification':
          // Use agent to verify claim
          result = await agent.processQuery(`Verify: ${task.input.claim}`, task.input.options);
          break;
        case 'publish':
          result = await agent.storeKnowledge(task.input.knowledge);
          break;
        default:
          throw new Error(`Unknown task type: ${task.taskType}`);
      }

      agentTask.status = 'completed';
      agentTask.result = result;
      agentTask.completedAt = Date.now();
      agentTask.citations = result.citations || [];

      return agentTask;
    } catch (error: any) {
      agentTask.status = 'failed';
      agentTask.error = error.message;
      agentTask.completedAt = Date.now();
      throw error;
    }
  }

  /**
   * Query collective memory across all agents in swarm
   */
  async querySwarmMemory(query: CollectiveMemoryQuery): Promise<AgentMemory[]> {
    const allMemories: AgentMemory[] = [];

    for (const agent of this.agents.values()) {
      try {
        const memories = await agent.queryCollectiveMemory(query);
        allMemories.push(...memories);
      } catch (error) {
        console.warn(`Failed to query memory from agent ${agent.getStatus().agentId}:`, error);
      }
    }

    return allMemories;
  }

  /**
   * Get orchestrator status
   */
  getStatus(): {
    swarmId: string;
    agentCount: number;
    activeAgents: number;
    totalTasks: number;
    completedTasks: number;
    agents: Array<{
      agentId: string;
      agentName: string;
      isActive: boolean;
      memoryCount: number;
    }>;
  } {
    const agents = Array.from(this.agents.values());
    const tasks = Array.from(this.tasks.values());

    return {
      swarmId: this.swarmId,
      agentCount: agents.length,
      activeAgents: agents.filter(a => a.getStatus().isActive).length,
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'completed').length,
      agents: agents.map(a => {
        const status = a.getStatus();
        return {
          agentId: status.agentId,
          agentName: status.agentName,
          isActive: status.isActive,
          memoryCount: status.memoryCount
        };
      })
    };
  }

  /**
   * Shutdown all agents
   */
  async shutdown(): Promise<void> {
    console.log(`🛑 Shutting down agent orchestrator (swarm: ${this.swarmId})`);
    
    for (const agent of this.agents.values()) {
      await agent.shutdown();
    }

    this.agents.clear();
    this.tasks.clear();
  }
}

/**
 * Factory function to create agent launcher
 */
export function createAgentLauncher(
  swarmId?: string
): AgentOrchestrator {
  return new AgentOrchestrator(swarmId);
}

/**
 * Factory function to create a single agent
 */
export function createDKGAIAgent(config: AgentConfig): DKGAIAgent {
  return new DKGAIAgent(config);
}

export default { AgentOrchestrator, DKGAIAgent, createAgentLauncher, createDKGAIAgent };

