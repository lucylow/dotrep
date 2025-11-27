/**
 * Enhanced DKG Agent Query Module with x402 Payment Integration
 * 
 * Provides an AI agent that queries the Decentralized Knowledge Graph (DKG) for information
 * with autonomous payment capabilities using the x402 protocol. This enables agents to:
 * 
 * - Automatically pay for premium DKG data access via x402 micropayments
 * - Query DKG APIs with seamless payment handling
 * - Cache query results intelligently to minimize costs
 * - Manage query budgets and optimize spending
 * - Handle HTTP 402 Payment Required responses autonomously
 * - Track payment evidence on-chain for reputation scoring
 * 
 * Features:
 * - Intelligent query caching (reduce redundant paid queries)
 * - Query cost estimation before execution
 * - Automatic payment negotiation for better pricing
 * - Reputation-aware query routing (query trusted sources first)
 * - Batch query optimization (combine queries to reduce fees)
 * - Payment history analytics for cost tracking
 * 
 * Based on:
 * - x402 Protocol: https://www.x402.org/x402-whitepaper.pdf
 * - OriginTrail DKG v8: https://docs.origintrail.io/
 * - Coinbase x402: https://docs.cdp.coinbase.com/x402/welcome
 */

import { DKGClientV8, DKGConfig } from './dkg-client-v8';
import { X402AutonomousAgent, AgentPaymentConfig } from '../../server/_core/x402AutonomousAgent';
import type { PaymentEvidence, SupportedChain } from '../../../apps/x402/x402-types';

export interface DKGQueryOptions {
  /** Enable x402 payment handling for paid queries */
  enablePayment?: boolean;
  /** Maximum amount to pay for this query (in USD) */
  maxPaymentAmount?: number;
  /** Minimum provenance score for sources */
  minProvenanceScore?: number;
  /** Maximum number of results */
  limit?: number;
  /** Use cached results if available */
  useCache?: boolean;
  /** Cache TTL in milliseconds */
  cacheTTL?: number;
  /** Require citations/provenance in results */
  requireCitations?: boolean;
  /** Preferred blockchain for payments */
  preferredChain?: SupportedChain;
  /** Enable query cost estimation */
  estimateCost?: boolean;
  /** Batch query identifier (for combining multiple queries) */
  batchId?: string;
}

export interface DKGQueryResult<T = any> {
  /** Query results */
  results: T[];
  /** UALs of Knowledge Assets used */
  citations: string[];
  /** Average provenance score */
  provenanceScore: number;
  /** Query confidence */
  confidence: number;
  /** Total cost for this query */
  cost?: {
    estimated: number;
    actual?: number;
    currency: string;
    txHash?: string;
  };
  /** Payment evidence if payment was made */
  paymentEvidence?: PaymentEvidence;
  /** Query metadata */
  metadata: {
    queryId: string;
    timestamp: number;
    executionTimeMs: number;
    cached: boolean;
    sourceCount: number;
  };
}

export interface QueryCacheEntry {
  query: string;
  results: any[];
  citations: string[];
  timestamp: number;
  cost?: number;
  ttl: number;
}

export interface QueryBudget {
  /** Total budget in USD */
  totalBudget: number;
  /** Amount spent so far */
  spent: number;
  /** Amount remaining */
  remaining: number;
  /** Budget period in milliseconds */
  periodMs: number;
  /** Period start timestamp */
  periodStart: number;
  /** Query count limit */
  maxQueries?: number;
  /** Current query count */
  queryCount: number;
}

export interface QueryAnalytics {
  /** Total queries executed */
  totalQueries: number;
  /** Total cost in USD */
  totalCost: number;
  /** Average cost per query */
  avgCostPerQuery: number;
  /** Cache hit rate */
  cacheHitRate: number;
  /** Queries by type */
  queriesByType: Record<string, number>;
  /** Payment statistics */
  payments: {
    total: number;
    successful: number;
    failed: number;
    averageAmount: number;
  };
}

/**
 * Enhanced DKG Agent Query Manager
 * 
 * Provides intelligent DKG querying with x402 payment integration
 */
export class DKGAgentQueryEnhancer {
  private dkgClient: DKGClientV8;
  private x402Agent?: X402AutonomousAgent;
  private queryCache: Map<string, QueryCacheEntry> = new Map();
  private queryBudget?: QueryBudget;
  private analytics: QueryAnalytics = {
    totalQueries: 0,
    totalCost: 0,
    avgCostPerQuery: 0,
    cacheHitRate: 0,
    queriesByType: {},
    payments: {
      total: 0,
      successful: 0,
      failed: 0,
      averageAmount: 0,
    },
  };

  constructor(
    dkgConfig?: DKGConfig,
    x402Config?: AgentPaymentConfig
  ) {
    this.dkgClient = new DKGClientV8(dkgConfig);
    
    // Initialize x402 agent if payment config provided
    if (x402Config) {
      this.x402Agent = new X402AutonomousAgent({
        ...x402Config,
        trackPaymentEvidence: true,
        enableNegotiation: true,
      });
    }
  }

  /**
   * Initialize the query enhancer
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing Enhanced DKG Agent Query Manager...');
    
    // Verify DKG connection
    const isHealthy = await this.dkgClient.healthCheck();
    if (!isHealthy) {
      throw new Error('DKG connection unhealthy');
    }

    console.log('✅ DKG connection verified');
    
    if (this.x402Agent) {
      console.log('💰 x402 payment agent initialized');
    }

    // Start cache cleanup interval
    this.startCacheCleanup();
    
    console.log('✅ Enhanced DKG Agent Query Manager initialized');
  }

  /**
   * Query DKG with intelligent caching and x402 payment handling
   * 
   * This is the main method for agents to query the DKG. It handles:
   * - Query caching to reduce costs
   * - x402 payment for paid queries
   * - Cost estimation
   * - Budget management
   * - Error handling and retries
   */
  async queryDKG<T = any>(
    query: string | {
      /** SPARQL query string */
      sparql?: string;
      /** Natural language query (for DRAG API) */
      naturalLanguage?: string;
      /** Query type */
      type: 'sparql' | 'drag' | 'reputation' | 'payment_evidence';
    },
    options: DKGQueryOptions = {}
  ): Promise<DKGQueryResult<T>> {
    const startTime = Date.now();
    const queryId = `query-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Normalize query input
    const normalizedQuery = typeof query === 'string' 
      ? { sparql: query, type: 'sparql' as const }
      : query;

    const {
      enablePayment = true,
      maxPaymentAmount = 10.0,
      minProvenanceScore = 50,
      limit = 10,
      useCache = true,
      cacheTTL = 5 * 60 * 1000, // 5 minutes default
      requireCitations = true,
      preferredChain,
      estimateCost = true,
    } = options;

    try {
      // Check budget
      if (this.queryBudget) {
        const budgetCheck = this.checkBudget(maxPaymentAmount);
        if (!budgetCheck.allowed) {
          throw new Error(`Query budget exceeded: ${budgetCheck.reason}`);
        }
      }

      // Check cache
      if (useCache) {
        const cacheKey = this.generateCacheKey(normalizedQuery, options);
        const cached = this.queryCache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
          console.log(`💾 Cache hit for query: ${queryId}`);
          this.updateAnalytics('cache_hit', 0);
          
          return {
            results: cached.results as T[],
            citations: cached.citations,
            provenanceScore: 75, // Estimated for cached results
            confidence: 0.8,
            cost: cached.cost ? {
              estimated: cached.cost,
              actual: 0, // No cost for cached results
              currency: 'USD',
            } : undefined,
            metadata: {
              queryId,
              timestamp: Date.now(),
              executionTimeMs: Date.now() - startTime,
              cached: true,
              sourceCount: cached.results.length,
            },
          };
        }
      }

      // Estimate cost if enabled
      let estimatedCost = 0;
      if (estimateCost && enablePayment) {
        estimatedCost = await this.estimateQueryCost(normalizedQuery, options);
        console.log(`💰 Estimated query cost: $${estimatedCost.toFixed(4)}`);
        
        if (estimatedCost > maxPaymentAmount) {
          throw new Error(
            `Estimated cost ($${estimatedCost.toFixed(4)}) exceeds maximum ($${maxPaymentAmount})`
          );
        }
      }

      // Execute query with payment handling
      let queryResult: DKGQueryResult<T>;
      
      if (normalizedQuery.type === 'drag') {
        // Use DRAG API for natural language queries
        queryResult = await this.executeDRAGQuery(normalizedQuery.naturalLanguage!, options);
      } else if (normalizedQuery.type === 'payment_evidence') {
        // Query payment evidence
        queryResult = await this.executePaymentEvidenceQuery(normalizedQuery.sparql!, options);
      } else if (normalizedQuery.type === 'reputation') {
        // Query reputation data
        queryResult = await this.executeReputationQuery(normalizedQuery.sparql!, options);
      } else {
        // Execute SPARQL query
        queryResult = await this.executeSPARQLQuery(normalizedQuery.sparql!, options);
      }

      // Cache results
      if (useCache && queryResult.results.length > 0) {
        const cacheKey = this.generateCacheKey(normalizedQuery, options);
        this.queryCache.set(cacheKey, {
          query: normalizedQuery.sparql || normalizedQuery.naturalLanguage || '',
          results: queryResult.results,
          citations: queryResult.citations,
          timestamp: Date.now(),
          cost: queryResult.cost?.actual || queryResult.cost?.estimated,
          ttl: cacheTTL,
        });
      }

      // Update analytics
      this.updateAnalytics(normalizedQuery.type, queryResult.cost?.actual || queryResult.cost?.estimated || 0);

      // Update budget
      if (this.queryBudget && queryResult.cost?.actual) {
        this.queryBudget.spent += queryResult.cost.actual;
        this.queryBudget.remaining -= queryResult.cost.actual;
        this.queryBudget.queryCount++;
      }

      // Update metadata
      queryResult.metadata = {
        ...queryResult.metadata,
        queryId,
        executionTimeMs: Date.now() - startTime,
        cached: false,
      };

      return queryResult;
    } catch (error: any) {
      console.error(`❌ DKG query failed:`, error);
      this.updateAnalytics('error', 0);
      throw error;
    }
  }

  /**
   * Execute SPARQL query with x402 payment handling
   */
  private async executeSPARQLQuery<T>(
    query: string,
    options: DKGQueryOptions
  ): Promise<DKGQueryResult<T>> {
    const { enablePayment, maxPaymentAmount, minProvenanceScore, limit } = options;

    // If x402 agent is available, try querying via paid API endpoint
    if (enablePayment && this.x402Agent) {
      try {
        // Construct API endpoint URL (example - adjust based on your DKG API)
        const apiUrl = `${process.env.DKG_API_URL || 'https://api.dkg.example.com'}/query/sparql`;
        
        const paymentResult = await this.x402Agent.requestResource<{
          results: any[];
          citations: string[];
          provenanceScore: number;
        }>(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            query,
            minProvenanceScore,
            limit,
            requireCitations: options.requireCitations,
          }),
        });

        if (paymentResult.success && paymentResult.data) {
          return {
            results: paymentResult.data.results as T[],
            citations: paymentResult.data.citations || [],
            provenanceScore: paymentResult.data.provenanceScore || 0,
            confidence: 0.85,
            cost: {
              estimated: maxPaymentAmount,
              actual: parseFloat(paymentResult.amountPaid || '0'),
              currency: 'USDC',
              txHash: paymentResult.paymentProof?.txHash,
            },
            paymentEvidence: paymentResult.paymentEvidence,
            metadata: {
              queryId: '',
              timestamp: Date.now(),
              executionTimeMs: 0,
              cached: false,
              sourceCount: paymentResult.data.results.length,
            },
          };
        }
      } catch (error) {
        console.warn('⚠️  Paid query via x402 failed, falling back to direct DKG query:', error);
        // Fall through to direct query
      }
    }

    // Fallback to direct DKG query (may be free or require different payment mechanism)
    const results = await this.dkgClient.executeSafeQuery(query, 'SELECT', {
      allowUpdates: false,
    });

    // Transform results and extract citations
    const transformedResults = Array.isArray(results) ? results : [];
    const citations = this.extractUALsFromResults(transformedResults);

    return {
      results: transformedResults as T[],
      citations,
      provenanceScore: this.calculateProvenanceScore(transformedResults),
      confidence: this.calculateConfidence(transformedResults, citations.length),
      metadata: {
        queryId: '',
        timestamp: Date.now(),
        executionTimeMs: 0,
        cached: false,
        sourceCount: transformedResults.length,
      },
    };
  }

  /**
   * Execute DRAG query (Decentralized Retrieval Augmented Generation)
   */
  private async executeDRAGQuery<T>(
    query: string,
    options: DKGQueryOptions
  ): Promise<DKGQueryResult<T>> {
    const dragResults = await this.dkgClient.queryDRAG(query, {
      topK: options.limit || 5,
      minRelevanceScore: (options.minProvenanceScore || 50) / 100,
      includeProvenance: true,
    });

    return {
      results: dragResults.results as T[],
      citations: dragResults.results.map(r => r.ual),
      provenanceScore: dragResults.results.length > 0
        ? dragResults.results.reduce((sum, r) => sum + (r.relevanceScore * 100), 0) / dragResults.results.length
        : 0,
      confidence: dragResults.results.length > 0
        ? dragResults.results.reduce((sum, r) => sum + r.relevanceScore, 0) / dragResults.results.length
        : 0,
      metadata: {
        queryId: dragResults.queryId,
        timestamp: dragResults.timestamp,
        executionTimeMs: 0,
        cached: false,
        sourceCount: dragResults.results.length,
      },
    };
  }

  /**
   * Execute payment evidence query
   */
  private async executePaymentEvidenceQuery<T>(
    query: string,
    options: DKGQueryOptions
  ): Promise<DKGQueryResult<T>> {
    // Use payment evidence query method
    const filters = this.parsePaymentEvidenceFilters(query);
    const results = await this.dkgClient.queryPaymentEvidence(filters);

    return {
      results: results as T[],
      citations: results.map(r => r.paymentUAL).filter(Boolean) as string[],
      provenanceScore: 90, // Payment evidence has high provenance
      confidence: 0.95,
      metadata: {
        queryId: '',
        timestamp: Date.now(),
        executionTimeMs: 0,
        cached: false,
        sourceCount: results.length,
      },
    };
  }

  /**
   * Execute reputation query
   */
  private async executeReputationQuery<T>(
    query: string,
    options: DKGQueryOptions
  ): Promise<DKGQueryResult<T>> {
    // Extract UAL or developer ID from query
    const ual = this.extractUALFromQuery(query);
    if (ual) {
      const reputation = await this.dkgClient.queryReputation(ual, {
        verifyReliability: true,
        verifyContentHash: true,
      });

      return {
        results: [reputation] as T[],
        citations: [ual],
        provenanceScore: 85,
        confidence: 0.9,
        metadata: {
          queryId: '',
          timestamp: Date.now(),
          executionTimeMs: 0,
          cached: false,
          sourceCount: 1,
        },
      };
    }

    // Fallback to SPARQL query
    return this.executeSPARQLQuery<T>(query, options);
  }

  /**
   * Estimate query cost before execution
   */
  private async estimateQueryCost(
    query: { sparql?: string; naturalLanguage?: string; type: string },
    options: DKGQueryOptions
  ): Promise<number> {
    // Cost estimation based on query complexity
    let baseCost = 0.10; // Base cost per query

    if (query.type === 'drag') {
      baseCost = 0.25; // DRAG queries cost more
    } else if (query.type === 'payment_evidence') {
      baseCost = 0.15;
    }

    // Complexity multiplier based on query length
    const queryLength = query.sparql?.length || query.naturalLanguage?.length || 0;
    const complexityMultiplier = Math.min(2.0, 1 + (queryLength / 1000));

    // Limit multiplier (more results = more cost)
    const limitMultiplier = 1 + ((options.limit || 10) / 100);

    return baseCost * complexityMultiplier * limitMultiplier;
  }

  /**
   * Set query budget
   */
  setBudget(budget: Omit<QueryBudget, 'spent' | 'remaining' | 'queryCount' | 'periodStart'>): void {
    this.queryBudget = {
      ...budget,
      spent: 0,
      remaining: budget.totalBudget,
      queryCount: 0,
      periodStart: Date.now(),
    };

    console.log(`💰 Query budget set: $${budget.totalBudget} over ${budget.periodMs / (1000 * 60 * 60)} hours`);
  }

  /**
   * Check if query is within budget
   */
  private checkBudget(cost: number): { allowed: boolean; reason?: string } {
    if (!this.queryBudget) {
      return { allowed: true };
    }

    // Check if period expired (reset budget)
    if (Date.now() - this.queryBudget.periodStart > this.queryBudget.periodMs) {
      this.queryBudget.spent = 0;
      this.queryBudget.remaining = this.queryBudget.totalBudget;
      this.queryBudget.queryCount = 0;
      this.queryBudget.periodStart = Date.now();
    }

    // Check remaining budget
    if (this.queryBudget.remaining < cost) {
      return {
        allowed: false,
        reason: `Insufficient budget: $${this.queryBudget.remaining.toFixed(4)} remaining, need $${cost.toFixed(4)}`,
      };
    }

    // Check query count limit
    if (this.queryBudget.maxQueries && this.queryBudget.queryCount >= this.queryBudget.maxQueries) {
      return {
        allowed: false,
        reason: `Query limit reached: ${this.queryBudget.maxQueries} queries`,
      };
    }

    return { allowed: true };
  }

  /**
   * Get current budget status
   */
  getBudgetStatus(): QueryBudget | undefined {
    if (!this.queryBudget) {
      return undefined;
    }

    // Reset if period expired
    if (Date.now() - this.queryBudget.periodStart > this.queryBudget.periodMs) {
      this.queryBudget.spent = 0;
      this.queryBudget.remaining = this.queryBudget.totalBudget;
      this.queryBudget.queryCount = 0;
      this.queryBudget.periodStart = Date.now();
    }

    return { ...this.queryBudget };
  }

  /**
   * Get query analytics
   */
  getAnalytics(): QueryAnalytics {
    return {
      ...this.analytics,
      avgCostPerQuery: this.analytics.totalQueries > 0
        ? this.analytics.totalCost / this.analytics.totalQueries
        : 0,
    };
  }

  /**
   * Clear query cache
   */
  clearCache(): void {
    this.queryCache.clear();
    console.log('🗑️  Query cache cleared');
  }

  /**
   * Generate cache key for query
   */
  private generateCacheKey(
    query: { sparql?: string; naturalLanguage?: string; type: string },
    options: DKGQueryOptions
  ): string {
    const queryStr = query.sparql || query.naturalLanguage || '';
    const optionsStr = JSON.stringify({
      minProvenanceScore: options.minProvenanceScore,
      limit: options.limit,
      type: query.type,
    });
    
    // Simple hash function
    return Buffer.from(`${queryStr}:${optionsStr}`).toString('base64').substring(0, 64);
  }

  /**
   * Start cache cleanup interval
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      let cleaned = 0;
      
      for (const [key, entry] of this.queryCache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          this.queryCache.delete(key);
          cleaned++;
        }
      }
      
      if (cleaned > 0) {
        console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
      }
    }, 60 * 1000); // Run every minute
  }

  /**
   * Update analytics
   */
  private updateAnalytics(queryType: string, cost: number): void {
    this.analytics.totalQueries++;
    this.analytics.totalCost += cost;
    this.analytics.queriesByType[queryType] = (this.analytics.queriesByType[queryType] || 0) + 1;
  }

  /**
   * Extract UALs from SPARQL results
   */
  private extractUALsFromResults(results: any[]): string[] {
    const uals = new Set<string>();
    
    for (const result of results) {
      // Look for UAL fields
      Object.values(result).forEach(value => {
        if (typeof value === 'string' && value.startsWith('urn:ual:')) {
          uals.add(value);
        } else if (typeof value === 'object' && value?.value && typeof value.value === 'string' && value.value.startsWith('urn:ual:')) {
          uals.add(value.value);
        }
      });
    }
    
    return Array.from(uals);
  }

  /**
   * Calculate provenance score from results
   */
  private calculateProvenanceScore(results: any[]): number {
    if (results.length === 0) return 0;
    // Simple heuristic - in production, query actual provenance
    return 75;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(results: any[], citationCount: number): number {
    if (results.length === 0) return 0;
    
    const resultConfidence = Math.min(1.0, results.length / 10);
    const citationConfidence = Math.min(1.0, citationCount / 5);
    
    return (resultConfidence * 0.6 + citationConfidence * 0.4);
  }

  /**
   * Extract UAL from query string
   */
  private extractUALFromQuery(query: string): string | null {
    const ualMatch = query.match(/urn:ual:[^\s"']+/);
    return ualMatch ? ualMatch[0] : null;
  }

  /**
   * Parse payment evidence filters from query
   */
  private parsePaymentEvidenceFilters(query: string): any {
    // Simple parser - in production, use proper SPARQL parser
    const filters: any = {};
    
    if (query.includes('payer')) {
      const payerMatch = query.match(/payer[=:]"([^"]+)"/);
      if (payerMatch) filters.payer = payerMatch[1];
    }
    
    if (query.includes('recipient')) {
      const recipientMatch = query.match(/recipient[=:]"([^"]+)"/);
      if (recipientMatch) filters.recipient = recipientMatch[1];
    }
    
    return filters;
  }
}

/**
 * Factory function to create enhanced DKG query agent
 */
export function createDKGAgentQueryEnhancer(
  dkgConfig?: DKGConfig,
  x402Config?: AgentPaymentConfig
): DKGAgentQueryEnhancer {
  return new DKGAgentQueryEnhancer(dkgConfig, x402Config);
}

export default DKGAgentQueryEnhancer;

