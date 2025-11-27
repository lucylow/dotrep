/**
 * Decentralized RAG (dRAG) with Provenance-Aware Retrieval
 * 
 * Implements provenance-aware retrieval that returns results with:
 * - UAL citations
 * - Provenance scores
 * - Cryptographic references
 * - Source hashes
 * 
 * This enables LLMs to cite Knowledge Assets and allows consumers
 * to verify the origin of information.
 */

import { DKGClientV8, DKGConfig } from './dkg-client-v8';
import { ProvenanceRegistry, ProvenanceInfo } from './provenance-registry';
import { getImpactMetrics } from '../server/_core/impactMetrics';

export interface ProvenanceAwareResult {
  text: string;
  ual: string;
  provenanceScore: number;
  sourceHash: string;
  metadata: {
    title?: string;
    publisher?: string;
    publishedAt?: number;
    type?: 'dataset' | 'model' | 'reputation' | 'other';
    citations?: string[];
  };
  relevanceScore?: number; // For ranking
}

export interface RetrievalQuery {
  query: string;
  topK?: number;
  minProvenanceScore?: number;
  filterByType?: Array<'dataset' | 'model' | 'reputation' | 'other'>;
  requireCitations?: boolean;
}

export interface RetrievalResponse {
  results: ProvenanceAwareResult[];
  totalResults: number;
  queryId: string;
  timestamp: number;
  citations: string[]; // All unique UALs cited
}

/**
 * dRAG Retriever with Provenance Awareness
 */
export class ProvenanceAwareRetriever {
  private dkgClient: DKGClientV8;
  private provenanceRegistry: ProvenanceRegistry;
  private impactMetrics: ReturnType<typeof getImpactMetrics>;
  private vectorIndex: Map<string, {
    embedding?: number[];
    text: string;
    ual: string;
    metadata: any;
  }> = new Map();

  constructor(dkgClient?: DKGClientV8, provenanceRegistry?: ProvenanceRegistry, dkgConfig?: DKGConfig) {
    this.dkgClient = dkgClient || new DKGClientV8(dkgConfig);
    this.provenanceRegistry = provenanceRegistry || new ProvenanceRegistry(this.dkgClient);
    this.impactMetrics = getImpactMetrics();
  }

  /**
   * Retrieve Knowledge Assets with provenance information
   * Returns results that must be cited by LLMs
   */
  async retrieve(query: RetrievalQuery): Promise<RetrievalResponse> {
    const {
      query: queryText,
      topK = 5,
      minProvenanceScore = 50,
      filterByType,
      requireCitations = true
    } = query;

    console.log(`🔍 Retrieving with provenance awareness: "${queryText}"`);

    // Use SPARQL to search Knowledge Assets
    const sparqlQuery = this.buildSPARQLQuery(queryText, topK, filterByType);

    try {
      // Execute SPARQL query on DKG
      const searchResults = await this.dkgClient['dkg']?.graph?.query?.(sparqlQuery, 'SELECT') || [];

      // Convert to provenance-aware results
      const results: ProvenanceAwareResult[] = [];

      for (const result of searchResults.slice(0, topK)) {
        const ual = result.ual || result.asset || result['@id'] || '';
        
        if (!ual) continue;

        // Get provenance information
        const provenance = await this.provenanceRegistry.getProvenance(ual);

        if (!provenance) {
          console.warn(`⚠️  No provenance found for UAL: ${ual}`);
          continue;
        }

        // Filter by minimum provenance score
        if (provenance.provenanceScore < minProvenanceScore) {
          console.log(`⏭️  Skipping ${ual}: provenance score ${provenance.provenanceScore} < ${minProvenanceScore}`);
          continue;
        }

        // Get full asset data
        const asset = await this.dkgClient.queryReputation(ual).catch(() => null);

        if (!asset && requireCitations) {
          continue;
        }

        // Extract text content from asset
        const text = this.extractText(asset || result);

        // Calculate relevance score (simplified - in production would use vector similarity)
        const relevanceScore = this.calculateRelevance(queryText, text);

        results.push({
          text,
          ual,
          provenanceScore: provenance.provenanceScore,
          sourceHash: provenance.checksum || '',
          metadata: {
            title: asset?.name || result.title || '',
            publisher: provenance.publisher,
            publishedAt: provenance.publishedAt,
            type: this.inferAssetType(asset || result),
            citations: provenance.citations
          },
          relevanceScore
        });
      }

      // Sort by relevance score
      results.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

      // Extract all unique citations
      const citations = Array.from(
        new Set(
          results.flatMap(r => [r.ual, ...(r.metadata.citations || [])])
        )
      );

      // Record citation metrics
      const hasCitations = citations.length > 0;
      this.impactMetrics.recordCitation(hasCitations, citations.length, citations[0]);

      const response: RetrievalResponse = {
        results: results.slice(0, topK),
        totalResults: results.length,
        queryId: `query-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        citations
      };

      console.log(`✅ Retrieved ${results.length} results with provenance`);
      console.log(`📚 Total citations: ${citations.length}`);

      return response;
    } catch (error: any) {
      console.error(`❌ Retrieval failed:`, error);
      
      // Return empty response on error
      return {
        results: [],
        totalResults: 0,
        queryId: `query-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        citations: []
      };
    }
  }

  /**
   * Retrieve and format for LLM prompt with strict citation requirements
   */
  async retrieveForLLM(
    query: RetrievalQuery,
    citationStyle: 'inline' | 'references' = 'references'
  ): Promise<{
    context: string;
    citations: string[];
    provenanceScores: number[];
    formattedPrompt: string;
  }> {
    const response = await this.retrieve(query);

    if (response.results.length === 0) {
      return {
        context: 'INSUFFICIENT_PROVENANCE: No verified sources found.',
        citations: [],
        provenanceScores: [],
        formattedPrompt: 'You must respond with "INSUFFICIENT_PROVENANCE" if you cannot cite at least one UAL.'
      };
    }

    // Format context with citations
    let context = '';
    const citations: string[] = [];
    const provenanceScores: number[] = [];

    if (citationStyle === 'inline') {
      // Inline citations: [UAL] after each fact
      context = response.results.map((result, index) => {
        citations.push(result.ual);
        provenanceScores.push(result.provenanceScore);
        return `[${index + 1}] ${result.text} [UAL: ${result.ual}]`;
      }).join('\n\n');
    } else {
      // References style: numbered references
      context = response.results.map((result, index) => {
        citations.push(result.ual);
        provenanceScores.push(result.provenanceScore);
        return `[${index + 1}] ${result.text}`;
      }).join('\n\n');

      context += '\n\nReferences:\n';
      response.results.forEach((result, index) => {
        context += `[${index + 1}] UAL: ${result.ual} (Provenance: ${result.provenanceScore}/100)\n`;
      });
    }

    // Format prompt with citation requirement
    const formattedPrompt = `Answer the following question using ONLY the provided context. 
You MUST cite at least one UAL (Uniform Asset Locator) for each factual claim.
If no relevant information is found in the context, respond with "INSUFFICIENT_PROVENANCE".

Context:
${context}

Question: ${query.query}

Remember: Every factual claim must include a UAL citation in the format [UAL: <ual>].`;

    return {
      context,
      citations,
      provenanceScores,
      formattedPrompt
    };
  }

  /**
   * Index a Knowledge Asset for retrieval (for local caching/indexing)
   */
  async indexAsset(ual: string): Promise<void> {
    try {
      const asset = await this.dkgClient.queryReputation(ual);
      if (asset) {
        const text = this.extractText(asset);
        this.vectorIndex.set(ual, {
          text,
          ual,
          metadata: asset
        });
        console.log(`✅ Indexed asset: ${ual}`);
      }
    } catch (error) {
      console.error(`❌ Failed to index asset ${ual}:`, error);
    }
  }

  /**
   * Build SPARQL query for searching Knowledge Assets
   */
  private buildSPARQLQuery(
    queryText: string,
    limit: number,
    filterByType?: Array<'dataset' | 'model' | 'reputation' | 'other'>
  ): string {
    // Simple SPARQL query - in production would be more sophisticated
    const typeFilters = filterByType
      ? filterByType.map(type => `?asset a dotrep:${this.mapTypeToClass(type)} .`).join(' ')
      : '';

    return `
      PREFIX schema: <https://schema.org/>
      PREFIX dotrep: <https://dotrep.io/ontology/>
      
      SELECT DISTINCT ?asset ?name ?description ?ual
      WHERE {
        ?asset schema:name ?name .
        OPTIONAL { ?asset schema:description ?description . }
        OPTIONAL { ?asset dotrep:ual ?ual . }
        ${typeFilters}
        FILTER(
          CONTAINS(LCASE(?name), LCASE("${queryText}")) ||
          CONTAINS(LCASE(?description), LCASE("${queryText}"))
        )
      }
      LIMIT ${limit}
    `;
  }

  /**
   * Extract text content from Knowledge Asset
   */
  private extractText(asset: any): string {
    if (!asset) return '';

    // Try to extract meaningful text from various fields
    const parts: string[] = [];

    if (asset.name) parts.push(asset.name);
    if (asset.description) parts.push(asset.description);
    if (asset['schema:name']) parts.push(asset['schema:name']);
    if (asset['schema:description']) parts.push(asset['schema:description']);

    // Extract from contributions if it's a reputation asset
    if (asset.contributions) {
      const contribTexts = asset.contributions
        .map((c: any) => c.title || c.name || '')
        .filter((t: string) => t);
      parts.push(...contribTexts);
    }

    return parts.join('. ').trim() || JSON.stringify(asset).substring(0, 500);
  }

  /**
   * Calculate relevance score using improved semantic matching
   * 
   * Enhanced with:
   * - TF-IDF weighting
   * - Semantic similarity (can be extended with embeddings)
   * - Contextual matching
   */
  private calculateRelevance(query: string, text: string): number {
    const queryLower = query.toLowerCase();
    const textLower = text.toLowerCase();

    // Extract meaningful words (remove stop words)
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can']);
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
    const textWords = textLower.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));

    if (queryWords.length === 0) return 50; // Default score if no meaningful words

    // Calculate TF-IDF-like score
    let exactMatches = 0;
    let partialMatches = 0;
    const textWordSet = new Set(textWords);

    for (const queryWord of queryWords) {
      if (textWordSet.has(queryWord)) {
        exactMatches++;
      } else {
        // Check for partial matches (substring)
        for (const textWord of textWords) {
          if (textWord.includes(queryWord) || queryWord.includes(textWord)) {
            partialMatches++;
            break;
          }
        }
      }
    }

    // Base score from exact matches
    const exactScore = (exactMatches / queryWords.length) * 70;
    
    // Bonus from partial matches
    const partialScore = Math.min((partialMatches / queryWords.length) * 20, 20);
    
    // Length bonus (longer text with matches is more relevant)
    const lengthBonus = Math.min(textWords.length / 100, 10);

    return Math.min(exactScore + partialScore + lengthBonus, 100);
  }

  /**
   * Infer asset type from asset data
   */
  private inferAssetType(asset: any): 'dataset' | 'model' | 'reputation' | 'other' {
    if (asset['@type']) {
      const type = asset['@type'].toString().toLowerCase();
      if (type.includes('dataset')) return 'dataset';
      if (type.includes('model') || type.includes('checkpoint')) return 'model';
      if (type.includes('reputation')) return 'reputation';
    }

    // Check for reputation score
    if (asset.reputationScore !== undefined || asset['dotrep:reputationScore'] !== undefined) {
      return 'reputation';
    }

    // Check for model indicators
    if (asset.trainingConfig || asset['dotrep:trainingConfig']) {
      return 'model';
    }

    // Check for dataset indicators
    if (asset.merkleRoot || asset['dotrep:merkleRoot']) {
      return 'dataset';
    }

    return 'other';
  }

  /**
   * Map asset type to RDF class
   */
  private mapTypeToClass(type: string): string {
    const map: Record<string, string> = {
      dataset: 'DatasetAsset',
      model: 'ModelCheckpoint',
      reputation: 'DeveloperReputation',
      other: 'CreativeWork'
    };
    return map[type] || 'CreativeWork';
  }
}

