/**
 * Neuro-Symbolic Knowledge Graph
 * 
 * Combines symbolic (RDF/SPARQL) reasoning with neural (embeddings/LLMs)
 * for enhanced knowledge graph understanding and querying
 */

import { ProvenanceAwareRetriever, ProvenanceAwareResult } from './drag-retriever';
import { DKGClient, DKGClientV8 } from './dkg-client';
import { AdvancedGraphQueries } from './sparql/advanced-graph-queries';

export interface NeuroSymbolicQuery {
  query: string;
  useSymbolic?: boolean;
  useNeural?: boolean;
  hybrid?: boolean;
  minProvenanceScore?: number;
  topK?: number;
}

export interface SymbolicResult {
  results: any[];
  query: string;
  sparqlQuery: string;
  executionTime: number;
}

export interface NeuralResult {
  results: ProvenanceAwareResult[];
  embeddings?: number[][];
  similarityScores?: number[];
  executionTime: number;
}

export interface HybridResult {
  symbolic: SymbolicResult;
  neural: NeuralResult;
  merged: ProvenanceAwareResult[];
  reasoning: string;
  executionTime: number;
}

/**
 * Neuro-Symbolic Knowledge Graph Engine
 * 
 * Combines:
 * - Symbolic layer: SPARQL queries, RDF reasoning, logical inference
 * - Neural layer: Vector embeddings, semantic search, LLM understanding
 */
export class NeuroSymbolicKG {
  private dkgClient: DKGClient | DKGClientV8;
  private retriever: ProvenanceAwareRetriever;
  private embeddingCache: Map<string, number[]> = new Map();

  constructor(
    dkgClient: DKGClient | DKGClientV8,
    retriever?: ProvenanceAwareRetriever
  ) {
    this.dkgClient = dkgClient;
    this.retriever = retriever || new ProvenanceAwareRetriever(dkgClient as any);
  }

  /**
   * Execute hybrid query combining symbolic and neural reasoning
   */
  async executeHybridQuery(query: NeuroSymbolicQuery): Promise<HybridResult> {
    const startTime = Date.now();

    console.log(`🧠 Executing hybrid neuro-symbolic query: "${query.query}"`);

    // Execute both symbolic and neural queries in parallel
    const [symbolicResult, neuralResult] = await Promise.all([
      query.useSymbolic !== false ? this.executeSymbolicQuery(query) : Promise.resolve(null),
      query.useNeural !== false ? this.executeNeuralQuery(query) : Promise.resolve(null)
    ]);

    // Merge and reason over results
    const merged = await this.mergeSymbolicNeuralResults(
      symbolicResult,
      neuralResult,
      query
    );

    // Generate reasoning explanation
    const reasoning = await this.generateReasoning(symbolicResult, neuralResult, merged, query);

    const executionTime = Date.now() - startTime;

    console.log(`✅ Hybrid query completed in ${executionTime}ms`);

    return {
      symbolic: symbolicResult || {
        results: [],
        query: query.query,
        sparqlQuery: '',
        executionTime: 0
      },
      neural: neuralResult || {
        results: [],
        executionTime: 0
      },
      merged,
      reasoning,
      executionTime
    };
  }

  /**
   * Execute symbolic SPARQL query
   */
  async executeSymbolicQuery(query: NeuroSymbolicQuery): Promise<SymbolicResult> {
    const startTime = Date.now();

    try {
      // Convert natural language to SPARQL (simplified - in production would use NL-to-SPARQL)
      const sparqlQuery = this.naturalLanguageToSPARQL(query.query);

      // Execute SPARQL query on DKG
      const results = await this.dkgClient.graphQuery(sparqlQuery, 'SELECT').catch(() => []);

      const executionTime = Date.now() - startTime;

      console.log(`🔍 Symbolic query returned ${results.length} results in ${executionTime}ms`);

      return {
        results,
        query: query.query,
        sparqlQuery,
        executionTime
      };
    } catch (error) {
      console.error('Symbolic query execution failed:', error);
      return {
        results: [],
        query: query.query,
        sparqlQuery: '',
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Execute neural semantic search query
   */
  async executeNeuralQuery(query: NeuroSymbolicQuery): Promise<NeuralResult> {
    const startTime = Date.now();

    try {
      // Use provenance-aware retriever for neural search
      const retrievalResult = await this.retriever.retrieve({
        query: query.query,
        topK: query.topK || 10,
        minProvenanceScore: query.minProvenanceScore || 50,
        requireCitations: true
      });

      const executionTime = Date.now() - startTime;

      console.log(`🧠 Neural query returned ${retrievalResult.results.length} results in ${executionTime}ms`);

      return {
        results: retrievalResult.results,
        executionTime
      };
    } catch (error) {
      console.error('Neural query execution failed:', error);
      return {
        results: [],
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Merge symbolic and neural results with reasoning
   */
  private async mergeSymbolicNeuralResults(
    symbolic: SymbolicResult | null,
    neural: NeuralResult | null,
    query: NeuroSymbolicQuery
  ): Promise<ProvenanceAwareResult[]> {
    const merged: ProvenanceAwareResult[] = [];
    const seenUALs = new Set<string>();

    // Add symbolic results (convert to ProvenanceAwareResult format)
    if (symbolic) {
      for (const result of symbolic.results) {
        const ual = result.ual || result.asset || result['@id'];
        if (ual && !seenUALs.has(ual)) {
          merged.push({
            text: this.extractTextFromSymbolicResult(result),
            ual,
            provenanceScore: 90, // High provenance for symbolic queries
            sourceHash: result.blockHash || '',
            metadata: {
              title: result.name || result.title,
              type: this.inferTypeFromSymbolicResult(result),
              source: 'symbolic_query'
            },
            relevanceScore: 0.9
          });
          seenUALs.add(ual);
        }
      }
    }

    // Add neural results
    if (neural) {
      for (const result of neural.results) {
        if (!seenUALs.has(result.ual)) {
          merged.push({
            ...result,
            metadata: {
              ...result.metadata,
              source: 'neural_search'
            }
          });
          seenUALs.add(result.ual);
        } else {
          // Enhance existing result with neural information
          const existing = merged.find(r => r.ual === result.ual);
          if (existing) {
            existing.relevanceScore = (existing.relevanceScore || 0) * 0.5 + (result.relevanceScore || 0) * 0.5;
            existing.metadata = {
              ...existing.metadata,
              ...result.metadata,
              source: 'hybrid'
            };
          }
        }
      }
    }

    // Sort by combined relevance score
    merged.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

    // Apply topK limit
    return merged.slice(0, query.topK || 10);
  }

  /**
   * Generate reasoning explanation for hybrid query results
   */
  private async generateReasoning(
    symbolic: SymbolicResult | null,
    neural: NeuralResult | null,
    merged: ProvenanceAwareResult[],
    query: NeuroSymbolicQuery
  ): Promise<string> {
    const parts: string[] = [];

    parts.push(`Query: "${query.query}"`);
    parts.push(`\nHybrid Reasoning:`);

    if (symbolic) {
      parts.push(`\n🔍 Symbolic Layer (SPARQL):`);
      parts.push(`- Found ${symbolic.results.length} entities through structured graph traversal`);
      parts.push(`- Executed in ${symbolic.executionTime}ms`);
      parts.push(`- Query: ${symbolic.sparqlQuery.substring(0, 200)}...`);
    }

    if (neural) {
      parts.push(`\n🧠 Neural Layer (Semantic Search):`);
      parts.push(`- Found ${neural.results.length} semantically similar entities`);
      parts.push(`- Executed in ${neural.executionTime}ms`);
      parts.push(`- Average provenance score: ${neural.results.reduce((sum, r) => sum + r.provenanceScore, 0) / neural.results.length || 0}`);
    }

    parts.push(`\n🔗 Merged Results:`);
    parts.push(`- Total unique entities: ${merged.length}`);
    parts.push(`- Average provenance: ${merged.reduce((sum, r) => sum + r.provenanceScore, 0) / merged.length || 0}`);
    parts.push(`- Average relevance: ${merged.reduce((sum, r) => sum + (r.relevanceScore || 0), 0) / merged.length || 0}`);

    parts.push(`\n💡 Reasoning Strategy:`);
    if (symbolic && neural) {
      parts.push(`- Combined structured graph queries with semantic similarity search`);
      parts.push(`- Symbolic layer provides verifiable, structured facts`);
      parts.push(`- Neural layer captures semantic nuances and context`);
      parts.push(`- Merged results prioritize high-provenance, highly-relevant entities`);
    } else if (symbolic) {
      parts.push(`- Used only symbolic reasoning for precise, verifiable results`);
    } else if (neural) {
      parts.push(`- Used only neural search for semantic understanding`);
    }

    return parts.join('\n');
  }

  /**
   * Convert natural language to SPARQL (simplified)
   * In production, this would use a proper NL-to-SPARQL system
   */
  private naturalLanguageToSPARQL(query: string): string {
    const lowerQuery = query.toLowerCase();

    // Pattern matching for common query types
    if (lowerQuery.includes('find') && lowerQuery.includes('developer')) {
      if (lowerQuery.includes('reputation')) {
        // Extract developer ID if present
        const devMatch = query.match(/developer[:\s]+([a-zA-Z0-9]+)/i);
        if (devMatch) {
          return AdvancedGraphQueries.getDeveloperProfile(devMatch[1]);
        }
        return AdvancedGraphQueries.findInfluentialDevelopers(undefined, 700, 20);
      }
    }

    if (lowerQuery.includes('collaborat') || lowerQuery.includes('work with')) {
      const devMatch = query.match(/developer[:\s]+([a-zA-Z0-9]+)/i);
      if (devMatch) {
        return AdvancedGraphQueries.findTrustedCollaborators(devMatch[1]);
      }
    }

    if (lowerQuery.includes('cross-chain') || lowerQuery.includes('multiple chains')) {
      const devMatch = query.match(/developer[:\s]+([a-zA-Z0-9]+)/i);
      if (devMatch) {
        return AdvancedGraphQueries.aggregateCrossChainReputation(devMatch[1]);
      }
    }

    // Default: semantic search query
    return AdvancedGraphQueries.semanticSearch(query);
  }

  /**
   * Extract text from symbolic query result
   */
  private extractTextFromSymbolicResult(result: any): string {
    const parts: string[] = [];
    
    if (result.name) parts.push(result.name);
    if (result.description) parts.push(result.description);
    if (result.title) parts.push(result.title);
    if (result['schema:name']) parts.push(result['schema:name']);
    if (result['schema:description']) parts.push(result['schema:description']);

    return parts.join('. ') || JSON.stringify(result).substring(0, 200);
  }

  /**
   * Infer type from symbolic query result
   */
  private inferTypeFromSymbolicResult(result: any): 'dataset' | 'model' | 'reputation' | 'other' {
    if (result['@type']) {
      const type = result['@type'].toString().toLowerCase();
      if (type.includes('person')) return 'reputation';
      if (type.includes('dataset')) return 'dataset';
      if (type.includes('model')) return 'model';
    }
    return 'other';
  }

  /**
   * Generate embeddings for knowledge graph entities
   * (Placeholder - would use actual embedding model)
   */
  async generateEntityEmbedding(entity: any): Promise<number[]> {
    const cacheKey = entity.ual || entity['@id'] || JSON.stringify(entity);
    
    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey)!;
    }

    // Placeholder: would use actual embedding model (e.g., OpenAI, sentence-transformers)
    const text = this.extractTextFromSymbolicResult(entity);
    const embedding = this.simpleHashEmbedding(text); // Simplified embedding

    this.embeddingCache.set(cacheKey, embedding);
    return embedding;
  }

  /**
   * Simple hash-based embedding (placeholder)
   * In production, use proper embedding models
   */
  private simpleHashEmbedding(text: string): number[] {
    // Placeholder implementation - would use actual embedding model
    const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const embedding: number[] = [];
    for (let i = 0; i < 384; i++) {
      embedding.push(Math.sin(hash + i) * 0.5 + 0.5);
    }
    return embedding;
  }

  /**
   * Compute similarity between entities using embeddings
   */
  async computeEntitySimilarity(
    entity1: any,
    entity2: any
  ): Promise<number> {
    const [emb1, emb2] = await Promise.all([
      this.generateEntityEmbedding(entity1),
      this.generateEntityEmbedding(entity2)
    ]);

    return this.cosineSimilarity(emb1, emb2);
  }

  /**
   * Cosine similarity between two vectors
   */
  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) return 0;

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Explain query results using symbolic reasoning
   */
  async explainSymbolicResult(result: any, query: string): Promise<string> {
    const explanation: string[] = [];

    explanation.push(`Query: "${query}"`);
    explanation.push(`\nResult Explanation:`);

    if (result.reputationScore !== undefined) {
      explanation.push(`- Reputation Score: ${result.reputationScore}/1000`);
    }

    if (result.connections) {
      explanation.push(`- Connections: ${result.connections} relationships in the graph`);
    }

    if (result.contributions) {
      explanation.push(`- Contributions: ${result.contributions.length} documented contributions`);
    }

    explanation.push(`\nSymbolic Reasoning:`);
    explanation.push(`- This result was found through structured graph traversal`);
    explanation.push(`- Verified through SPARQL query on the knowledge graph`);
    explanation.push(`- All facts can be traced to their source UALs`);

    return explanation.join('\n');
  }

  /**
   * Format hybrid results for LLM consumption with citations
   */
  async formatForLLM(result: HybridResult): Promise<string> {
    const parts: string[] = [];

    parts.push(`# Neuro-Symbolic Query Results\n`);
    parts.push(`## Query\n${result.symbolic.query}\n`);
    parts.push(`## Reasoning\n${result.reasoning}\n`);
    parts.push(`## Results\n`);

    result.merged.forEach((item, index) => {
      parts.push(`### ${index + 1}. ${item.metadata.title || 'Entity'}\n`);
      parts.push(`${item.text}\n`);
      parts.push(`- **UAL**: \`${item.ual}\`\n`);
      parts.push(`- **Provenance Score**: ${item.provenanceScore}/100\n`);
      parts.push(`- **Relevance**: ${((item.relevanceScore || 0) * 100).toFixed(1)}%\n`);
      parts.push(`- **Source**: ${item.metadata.source}\n`);
      
      if (item.metadata.citations && item.metadata.citations.length > 0) {
        parts.push(`- **Citations**:`);
        item.metadata.citations.forEach((citation: string) => {
          parts.push(`  - \`${citation}\``);
        });
        parts.push('');
      }
    });

    parts.push(`\n---\n`);
    parts.push(`*Query executed in ${result.executionTime}ms*`);
    parts.push(`*Symbolic: ${result.symbolic.results.length} results in ${result.symbolic.executionTime}ms*`);
    parts.push(`*Neural: ${result.neural.results.length} results in ${result.neural.executionTime}ms*`);

    return parts.join('\n');
  }
}

export default NeuroSymbolicKG;

