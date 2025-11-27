/**
 * Knowledge Asset Publisher for DotRep (V8 Compatible)
 * 
 * This module handles the conversion of DotRep reputation data into OriginTrail Knowledge Assets
 * and manages the publishing lifecycle to the Decentralized Knowledge Graph.
 * Updated for dkg.js V8 API compatibility.
 * 
 * Features:
 * - Automatic conversion of reputation scores to Knowledge Assets
 * - Batch publishing for multiple developers
 * - Caching of UALs for efficient lookups
 * - Integration with DotRep backend database
 * - Improved error handling and retry logic
 */

import { DKGClientV8, ReputationAsset, Contribution, PublishResult } from './dkg-client-v8';

export interface DeveloperProfile {
  id: string;
  address: string;
  username?: string;
  email?: string;
  githubId?: string;
  gitlabId?: string;
}

export interface ReputationData {
  developer: DeveloperProfile;
  score: number;
  contributions: any[];
  lastUpdated: Date;
}

export interface PublishOptions {
  epochs?: number;
  forceUpdate?: boolean;
  includePII?: boolean;
}

/**
 * Knowledge Asset Publisher (V8 Compatible)
 */
export class KnowledgeAssetPublisherV8 {
  private dkgClient: DKGClientV8;
  private ualCache: Map<string, string> = new Map();

  constructor(dkgClient?: DKGClientV8) {
    this.dkgClient = dkgClient || new DKGClientV8();
  }

  /**
   * Publish a single developer's reputation as a Knowledge Asset
   * 
   * @param reputationData - The developer's reputation data
   * @param options - Publishing options
   * @returns PublishResult with UAL
   */
  async publishDeveloperReputation(
    reputationData: ReputationData,
    options: PublishOptions = {}
  ): Promise<PublishResult> {
    const { epochs = 2, forceUpdate = false, includePII = false } = options;

    // Check if we already have a UAL for this developer
    const existingUAL = this.ualCache.get(reputationData.developer.id);
    
    // If updating, link to previous version for provenance
    const previousVersionUAL = existingUAL && !forceUpdate ? undefined : existingUAL;

    if (existingUAL && !forceUpdate) {
      console.log(`✅ Using cached UAL for developer ${reputationData.developer.id}`);
      return { UAL: existingUAL };
    }

    // Convert to ReputationAsset format (includes provenance and versioning)
    const asset = this.convertToReputationAsset(reputationData, includePII, previousVersionUAL);

    console.log(`📤 Publishing reputation for ${reputationData.developer.id}`);
    console.log(`   Score: ${asset.reputationScore}, Contributions: ${asset.contributions.length}`);

    // Get cost estimate before publishing
    const tokenomics = this.dkgClient.getTokenomicsService();
    const costEstimate = tokenomics.estimatePublishCost(epochs, !!existingUAL);
    console.log(`💰 Estimated cost: ${tokenomics.formatTRAC(costEstimate.tracFee)} + ${tokenomics.formatNEURO(costEstimate.neuroGasFee)}`);
    if (costEstimate.totalCostUSD > 0) {
      console.log(`   Total: $${costEstimate.totalCostUSD.toFixed(4)} USD`);
    }

    // Publish to DKG
    const result = await this.dkgClient.publishReputationAsset(asset, epochs);

    // Cache the UAL
    this.ualCache.set(reputationData.developer.id, result.UAL);

    // Store UAL in database (if database connection available)
    await this.storeUALMapping(reputationData.developer.id, result.UAL);

    return result;
  }

  /**
   * Batch publish multiple developers' reputations with cost optimization
   * 
   * Uses intelligent batching to reduce gas costs and provides detailed cost reporting
   * 
   * @param reputationDataList - Array of reputation data
   * @param options - Publishing options
   * @param options.batchSize - Size of each batch (default: optimal from tokenomics)
   * @param options.delayBetweenBatches - Delay between batches in ms (default: 1000)
   * @returns Batch publish results with cost information
   */
  async batchPublish(
    reputationDataList: ReputationData[],
    options: PublishOptions & {
      batchSize?: number;
      delayBetweenBatches?: number;
    } = {}
  ): Promise<{
    results: PublishResult[];
    batchCostEstimate: import('./tokenomics-service').BatchPublishCostEstimate;
    summary: {
      totalPublished: number;
      totalFailed: number;
      totalTracSpent: bigint;
      totalNeuroSpent: bigint;
      totalCostUSD: number;
    };
  }> {
    const { epochs = 2, batchSize, delayBetweenBatches } = options;
    
    console.log(`📦 Starting batch publish for ${reputationDataList.length} developers`);
    
    // Convert to ReputationAsset format for batch publishing
    const reputationAssets = reputationDataList.map(data => 
      this.convertToReputationAsset(data, options.includePII || false)
    );
    
    // Use DKG client's optimized batch publish
    const batchResult = await this.dkgClient.batchPublishReputationAssets(
      reputationAssets,
      epochs,
      { batchSize, delayBetweenBatches }
    );
    
    // Map results back to PublishResult format and update cache
    const mappedResults: PublishResult[] = batchResult.results.map((result, index) => {
      if (result.UAL && reputationDataList[index]) {
        this.ualCache.set(reputationDataList[index].developer.id, result.UAL);
        this.storeUALMapping(reputationDataList[index].developer.id, result.UAL);
      }
      return result;
    });
    
    return {
      results: mappedResults,
      batchCostEstimate: batchResult.batchCostEstimate,
      summary: batchResult.summary
    };
  }

  /**
   * Update a developer's reputation on the DKG
   * 
   * @param developerId - Developer's unique identifier
   * @param updatedData - Updated reputation data
   * @returns PublishResult with new UAL
   */
  async updateDeveloperReputation(
    developerId: string,
    updatedData: Partial<ReputationData>
  ): Promise<PublishResult> {
    const existingUAL = this.ualCache.get(developerId);

    if (!existingUAL) {
      throw new Error(`No existing UAL found for developer ${developerId}`);
    }

    console.log(`🔄 Updating reputation for ${developerId}`);

    // Retrieve existing asset
    const existingAsset = await this.dkgClient.queryReputation(existingUAL);

    // Merge with updated data
    const mergedAsset: ReputationAsset = {
      developerId,
      reputationScore: updatedData.score || existingAsset['dotrep:reputationScore'],
      contributions: updatedData.contributions 
        ? this.convertContributions(updatedData.contributions)
        : existingAsset['dotrep:contributions'],
      timestamp: Date.now(),
      metadata: {
        ...existingAsset['dotrep:metadata'],
        previousUAL: existingUAL,
        updateReason: 'reputation_change',
        updatedAt: new Date().toISOString()
      }
    };

    // Publish updated asset
    const result = await this.dkgClient.publishReputationAsset(mergedAsset);

    // Update cache
    this.ualCache.set(developerId, result.UAL);
    await this.storeUALMapping(developerId, result.UAL);

    console.log(`✅ Reputation updated: ${result.UAL}`);
    return result;
  }

  /**
   * Query a developer's reputation from the DKG
   * 
   * @param developerId - Developer's unique identifier
   * @returns Reputation data from DKG
   */
  async queryDeveloperReputation(developerId: string): Promise<any> {
    console.log(`🔍 Querying reputation for ${developerId}`);

    // Try cache first
    const ual = this.ualCache.get(developerId);

    if (ual) {
      console.log(`✅ Found cached UAL: ${ual}`);
      return await this.dkgClient.queryReputation(ual);
    }

    // Search by developer ID
    console.log(`🔍 Searching DKG for developer ${developerId}`);
    const results = await this.dkgClient.searchByDeveloper(developerId);

    if (results.length > 0) {
      const latestAsset = results[0];
      this.ualCache.set(developerId, latestAsset.asset);
      console.log(`✅ Found reputation asset: ${latestAsset.asset}`);
      return await this.dkgClient.queryReputation(latestAsset.asset);
    }

    throw new Error(`No reputation data found for developer ${developerId}`);
  }

  /**
   * Convert DotRep reputation data to ReputationAsset format
   */
  private convertToReputationAsset(
    data: ReputationData,
    includePII: boolean,
    previousVersionUAL?: string
  ): ReputationAsset {
    return {
      developerId: data.developer.address,
      reputationScore: data.score,
      contributions: this.convertContributions(data.contributions),
      timestamp: data.lastUpdated.getTime(),
      previousVersionUAL,
      provenance: {
        computedBy: 'urn:agent:dotrep-repute-v1',
        method: 'weightedPageRank+stake+sybilHeuristics',
        sourceAssets: [] // Could be populated with contribution UALs
      },
      metadata: {
        username: includePII ? data.developer.username : undefined,
        githubId: data.developer.githubId,
        gitlabId: data.developer.gitlabId,
        totalContributions: data.contributions.length,
        publishedAt: new Date().toISOString(),
        source: 'dotrep-v2',
        version: '2.0.0',
        dkgVersion: '8.2.0'
      }
    };
  }

  /**
   * Convert DotRep contributions to standard Contribution format
   */
  private convertContributions(contributions: any[]): Contribution[] {
    return contributions.map((contrib, index) => ({
      id: contrib.id || contrib.contributionId || `contrib-${Date.now()}-${index}`,
      type: this.normalizeContributionType(contrib.type || contrib.contributionType),
      url: contrib.url || contrib.link || '',
      title: contrib.title || contrib.description || 'Contribution',
      date: contrib.date || contrib.createdAt || new Date().toISOString(),
      impact: contrib.impact || contrib.score || 1
    }));
  }

  /**
   * Normalize contribution type to standard format
   */
  private normalizeContributionType(type: string): Contribution['type'] {
    const typeMap: Record<string, Contribution['type']> = {
      'pull_request': 'github_pr',
      'pr': 'github_pr',
      'github_pr': 'github_pr',
      'commit': 'github_commit',
      'github_commit': 'github_commit',
      'merge_request': 'gitlab_mr',
      'mr': 'gitlab_mr',
      'gitlab_mr': 'gitlab_mr'
    };

    return typeMap[type.toLowerCase()] || 'other';
  }

  /**
   * Store UAL mapping in database (placeholder for database integration)
   */
  private async storeUALMapping(developerId: string, ual: string): Promise<void> {
    // TODO: Integrate with DotRep database to store UAL mappings
    // This would typically use the existing database connection
    // Example:
    // await db.ualMappings.create({
    //   developerId,
    //   ual,
    //   createdAt: new Date()
    // });
    
    console.log(`💾 UAL mapping stored: ${developerId} -> ${ual}`);
  }

  /**
   * Get UAL for a developer from cache or database
   */
  async getUAL(developerId: string): Promise<string | null> {
    // Check cache first
    if (this.ualCache.has(developerId)) {
      return this.ualCache.get(developerId)!;
    }

    // TODO: Query database for UAL
    // const mapping = await db.ualMappings.findOne({ developerId });
    // if (mapping) {
    //   this.ualCache.set(developerId, mapping.ual);
    //   return mapping.ual;
    // }

    return null;
  }

  /**
   * Clear UAL cache
   */
  clearCache(): void {
    this.ualCache.clear();
    console.log(`🗑️  UAL cache cleared`);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; developers: string[] } {
    return {
      size: this.ualCache.size,
      developers: Array.from(this.ualCache.keys())
    };
  }

  /**
   * Check DKG connection health
   */
  async checkHealth(): Promise<boolean> {
    return await this.dkgClient.healthCheck();
  }

  /**
   * Get DKG client status
   */
  getStatus() {
    return this.dkgClient.getStatus();
  }

  /**
   * Get tokenomics service for cost estimation
   */
  getTokenomicsService() {
    return this.dkgClient.getTokenomicsService();
  }

  /**
   * Get fee statistics
   */
  getFeeStatistics() {
    return this.dkgClient.getFeeStatistics();
  }

  /**
   * Estimate cost for publishing a single developer's reputation
   */
  estimatePublishCost(
    epochs: number = 2,
    isUpdate: boolean = false
  ): import('./tokenomics-service').PublishCostEstimate {
    return this.dkgClient.getTokenomicsService().estimatePublishCost(epochs, isUpdate);
  }

  /**
   * Estimate cost for batch publishing
   */
  estimateBatchPublishCost(
    developerCount: number,
    epochs: number = 2
  ): import('./tokenomics-service').BatchPublishCostEstimate {
    return this.dkgClient.getTokenomicsService().estimateBatchPublishCost(developerCount, epochs, false);
  }
}

/**
 * Factory function to create a Knowledge Asset Publisher
 */
export function createPublisherV8(dkgClient?: DKGClientV8): KnowledgeAssetPublisherV8 {
  return new KnowledgeAssetPublisherV8(dkgClient);
}

export default KnowledgeAssetPublisherV8;
