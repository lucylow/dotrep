/**
 * SPARQL DESCRIBE Query Helper
 * 
 * This module provides utilities for querying Knowledge Assets
 * using SPARQL DESCRIBE queries. This is essential for proving
 * KA discoverability and provenance in hackathon demos.
 * 
 * Based on OriginTrail DKG integration guidance:
 * - DESCRIBE queries for KA verification
 * - Provenance tracing
 * - UAL resolution
 */

import { DKGClientV8 } from './dkg-client-v8';

export interface DescribeResult {
  ual: string;
  data: any;
  provenance?: {
    createdBy?: string;
    createdAt?: string;
    previousVersion?: string;
    sourceAssets?: string[];
  };
  metadata?: {
    blockHash?: string;
    blockNumber?: number;
    transactionHash?: string;
  };
}

export interface SPARQLDescribeOptions {
  includeProvenance?: boolean;
  includeMetadata?: boolean;
  timeout?: number;
}

/**
 * SPARQL DESCRIBE Helper
 * 
 * Provides easy-to-use methods for querying Knowledge Assets
 * and proving their discoverability on the DKG.
 */
export class SPARQLDescribeHelper {
  private dkgClient: DKGClientV8;
  private sparqlEndpoint?: string;

  constructor(dkgClient?: DKGClientV8, sparqlEndpoint?: string) {
    this.dkgClient = dkgClient || new DKGClientV8();
    
    const getEnvVar = (name: string): string | undefined => {
      try {
        const proc = (globalThis as any).process || (globalThis as any).global?.process;
        return proc?.env?.[name];
      } catch {
        return undefined;
      }
    };

    this.sparqlEndpoint = sparqlEndpoint || 
                          getEnvVar('DKG_SPARQL_ENDPOINT') || 
                          'https://euphoria.origin-trail.network/dkg-sparql-query';
  }

  /**
   * Execute a DESCRIBE query for a Knowledge Asset
   * 
   * This is the core method for proving KA discoverability.
   * It queries the DKG for all information about a specific UAL.
   * 
   * @param ual - Uniform Asset Locator of the KA
   * @param options - Query options
   * @returns DescribeResult with KA data and provenance
   * 
   * @example
   * ```typescript
   * const result = await helper.describeUAL('ual:dkg:network:hash');
   * console.log(`KA found: ${result.ual}`);
   * console.log(`Provenance: ${result.provenance?.createdAt}`);
   * ```
   */
  async describeUAL(
    ual: string,
    options: SPARQLDescribeOptions = {}
  ): Promise<DescribeResult> {
    const { includeProvenance = true, includeMetadata = true } = options;

    console.log(`🔍 Executing DESCRIBE query for UAL: ${ual}`);

    // Construct SPARQL DESCRIBE query
    const query = this.buildDescribeQuery(ual, includeProvenance);

    try {
      // Execute query using DKG client
      const results = await this.dkgClient.executeSafeQuery(query, 'DESCRIBE', {
        allowUpdates: false,
      });

      // Parse results
      const data = this.parseDescribeResults(results, ual);

      // Extract provenance if requested
      const provenance = includeProvenance 
        ? this.extractProvenance(data)
        : undefined;

      // Extract metadata if requested
      const metadata = includeMetadata
        ? await this.extractMetadata(ual)
        : undefined;

      console.log(`✅ DESCRIBE query completed for ${ual}`);

      return {
        ual,
        data,
        provenance,
        metadata,
      };
    } catch (error: any) {
      console.error(`❌ DESCRIBE query failed:`, error.message);
      throw new Error(`Failed to describe UAL ${ual}: ${error.message}`);
    }
  }

  /**
   * Build SPARQL DESCRIBE query
   */
  private buildDescribeQuery(ual: string, includeProvenance: boolean): string {
    // Escape UAL for SPARQL
    const escapedUAL = ual.replace(/"/g, '\\"');

    let query = `
      PREFIX schema: <https://schema.org/>
      PREFIX dotrep: <https://dotrep.io/ontology/>
      PREFIX prov: <http://www.w3.org/ns/prov#>
      PREFIX polkadot: <https://polkadot.network/ontology/>
      
      DESCRIBE <${escapedUAL}>
    `;

    if (includeProvenance) {
      query += `
        WHERE {
          <${escapedUAL}> ?p ?o .
          OPTIONAL {
            <${escapedUAL}> prov:wasGeneratedBy ?generator .
            ?generator prov:wasAssociatedWith ?agent .
            ?generator prov:atTime ?createdAt .
          }
          OPTIONAL {
            <${escapedUAL}> prov:wasRevisionOf ?previousVersion .
          }
          OPTIONAL {
            <${escapedUAL}> prov:wasDerivedFrom ?sourceAsset .
          }
        }
      `;
    }

    return query;
  }

  /**
   * Parse DESCRIBE query results
   */
  private parseDescribeResults(results: any, ual: string): any {
    // DESCRIBE queries return a graph structure
    // The exact format depends on the DKG implementation
    
    if (results && typeof results === 'object') {
      // If results are already parsed
      if (results[ual]) {
        return results[ual];
      }
      
      // If results are in a different format
      if (results.data) {
        return results.data;
      }
      
      // Return results as-is
      return results;
    }

    // Fallback: return empty structure
    return {
      '@id': ual,
      '@type': 'KnowledgeAsset',
    };
  }

  /**
   * Extract provenance information from KA data
   */
  private extractProvenance(data: any): DescribeResult['provenance'] {
    const provenance: DescribeResult['provenance'] = {};

    // Extract createdBy (prov:wasGeneratedBy)
    if (data['prov:wasGeneratedBy'] || data['wasGeneratedBy']) {
      const generator = data['prov:wasGeneratedBy'] || data['wasGeneratedBy'];
      if (typeof generator === 'object' && generator['prov:wasAssociatedWith']) {
        provenance.createdBy = generator['prov:wasAssociatedWith'];
      } else if (typeof generator === 'string') {
        provenance.createdBy = generator;
      }
    }

    // Extract createdAt
    if (data['prov:atTime'] || data['atTime'] || data['schema:dateCreated'] || data['dateCreated']) {
      provenance.createdAt = data['prov:atTime'] || data['atTime'] || 
                             data['schema:dateCreated'] || data['dateCreated'];
    }

    // Extract previous version
    if (data['prov:wasRevisionOf'] || data['wasRevisionOf'] || data['previousVersionUAL']) {
      provenance.previousVersion = data['prov:wasRevisionOf'] || 
                                   data['wasRevisionOf'] || 
                                   data['previousVersionUAL'];
    }

    // Extract source assets
    if (data['prov:wasDerivedFrom'] || data['wasDerivedFrom'] || data['sourceAssets']) {
      const sources = data['prov:wasDerivedFrom'] || data['wasDerivedFrom'] || data['sourceAssets'];
      provenance.sourceAssets = Array.isArray(sources) ? sources : [sources];
    }

    return Object.keys(provenance).length > 0 ? provenance : undefined;
  }

  /**
   * Extract metadata (block info, transaction hash) from UAL or DKG
   */
  private async extractMetadata(ual: string): Promise<DescribeResult['metadata']> {
    // In production, this would query the NeuroWeb parachain
    // to get block anchor information for the UAL
    
    // For now, return placeholder metadata
    // In a real implementation, you would:
    // 1. Query NeuroWeb for the anchor transaction
    // 2. Extract block hash, block number, transaction hash
    // 3. Return structured metadata

    return {
      // Placeholder - in production, query NeuroWeb
      blockHash: undefined,
      blockNumber: undefined,
      transactionHash: undefined,
    };
  }

  /**
   * Query multiple UALs in batch
   */
  async describeMultipleUALs(
    uals: string[],
    options: SPARQLDescribeOptions = {}
  ): Promise<DescribeResult[]> {
    console.log(`📦 Describing ${uals.length} Knowledge Assets...`);

    const results: DescribeResult[] = [];

    for (const ual of uals) {
      try {
        const result = await this.describeUAL(ual, options);
        results.push(result);
      } catch (error: any) {
        console.error(`❌ Failed to describe ${ual}:`, error.message);
        // Continue with other UALs
      }
    }

    console.log(`✅ Described ${results.length}/${uals.length} Knowledge Assets`);
    return results;
  }

  /**
   * Verify that a KA is discoverable on the DKG
   * 
   * This is useful for demo verification - proving that
   * a published KA can be queried and retrieved.
   */
  async verifyDiscoverability(ual: string): Promise<{
    discoverable: boolean;
    result?: DescribeResult;
    error?: string;
  }> {
    try {
      const result = await this.describeUAL(ual, {
        includeProvenance: true,
        includeMetadata: true,
      });

      return {
        discoverable: true,
        result,
      };
    } catch (error: any) {
      return {
        discoverable: false,
        error: error.message,
      };
    }
  }

  /**
   * Get provenance chain for a KA
   * 
   * Traces back through previous versions to show the full
   * provenance history of a Knowledge Asset.
   */
  async getProvenanceChain(ual: string, maxDepth: number = 10): Promise<string[]> {
    const chain: string[] = [ual];
    let currentUAL = ual;
    let depth = 0;

    while (depth < maxDepth) {
      try {
        const result = await this.describeUAL(currentUAL, {
          includeProvenance: true,
        });

        if (result.provenance?.previousVersion) {
          const previousUAL = result.provenance.previousVersion;
          chain.push(previousUAL);
          currentUAL = previousUAL;
          depth++;
        } else {
          break; // No more previous versions
        }
      } catch (error) {
        console.warn(`⚠️  Could not trace provenance for ${currentUAL}`);
        break;
      }
    }

    return chain;
  }
}

/**
 * Factory function to create SPARQL DESCRIBE helper
 */
export function createSPARQLDescribeHelper(
  dkgClient?: DKGClientV8,
  sparqlEndpoint?: string
): SPARQLDescribeHelper {
  return new SPARQLDescribeHelper(dkgClient, sparqlEndpoint);
}

export default SPARQLDescribeHelper;

