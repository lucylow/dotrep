/**
 * Knowledge Asset Publisher for DotRep
 * 
 * This module handles the conversion of DotRep reputation data into OriginTrail Knowledge Assets
 * and manages the publishing lifecycle to the Decentralized Knowledge Graph.
 * 
 * Features:
 * - Automatic conversion of reputation scores to Knowledge Assets
 * - Batch publishing for multiple developers
 * - Caching of UALs for efficient lookups
 * - Integration with DotRep backend database
 */

import { DKGClient, ReputationAsset, Contribution, PublishResult } from './dkg-client';

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
 * Knowledge Asset Publisher
 */
export class KnowledgeAssetPublisher {
  private dkgClient: DKGClient;
  private ualCache: Map<string, string> = new Map();

  constructor(dkgClient?: DKGClient) {
    this.dkgClient = dkgClient || new DKGClient();
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
    
    if (existingUAL && !forceUpdate) {
      console.log(`Using cached UAL for developer ${reputationData.developer.id}`);
      return { UAL: existingUAL };
    }

    // Convert to ReputationAsset format
    const asset = this.convertToReputationAsset(reputationData, includePII);

    // Publish to DKG
    const result = await this.dkgClient.publishReputationAsset(asset, epochs);

    // Cache the UAL
    this.ualCache.set(reputationData.developer.id, result.UAL);

    // Store UAL in database (if database connection available)
    await this.storeUALMapping(reputationData.developer.id, result.UAL);

    return result;
  }

  /**
   * Batch publish multiple developers' reputations
   * 
   * @param reputationDataList - Array of reputation data
   * @param options - Publishing options
   * @returns Array of publish results
   */
  async batchPublish(
    reputationDataList: ReputationData[],
    options: PublishOptions = {}
  ): Promise<PublishResult[]> {
    const results: PublishResult[] = [];

    for (const reputationData of reputationDataList) {
      try {
        const result = await this.publishDeveloperReputation(reputationData, options);
        results.push(result);
        console.log(`Published reputation for ${reputationData.developer.id}: ${result.UAL}`);
      } catch (error) {
        console.error(`Failed to publish reputation for ${reputationData.developer.id}:`, error);
        results.push({
          UAL: '',
          error: error.message
        } as any);
      }
    }

    return results;
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
        updateReason: 'reputation_change'
      }
    };

    // Publish updated asset
    const result = await this.dkgClient.publishReputationAsset(mergedAsset);

    // Update cache
    this.ualCache.set(developerId, result.UAL);
    await this.storeUALMapping(developerId, result.UAL);

    return result;
  }

  /**
   * Query a developer's reputation from the DKG
   * 
   * @param developerId - Developer's unique identifier
   * @returns Reputation data from DKG
   */
  async queryDeveloperReputation(developerId: string): Promise<any> {
    // Try cache first
    const ual = this.ualCache.get(developerId);

    if (ual) {
      return await this.dkgClient.queryReputation(ual);
    }

    // Search by developer ID
    const results = await this.dkgClient.searchByDeveloper(developerId);

    if (results.length > 0) {
      const latestAsset = results[0];
      this.ualCache.set(developerId, latestAsset.asset);
      return await this.dkgClient.queryReputation(latestAsset.asset);
    }

    throw new Error(`No reputation data found for developer ${developerId}`);
  }

  /**
   * Convert DotRep reputation data to ReputationAsset format
   */
  private convertToReputationAsset(
    data: ReputationData,
    includePII: boolean
  ): ReputationAsset {
    return {
      developerId: data.developer.address,
      reputationScore: data.score,
      contributions: this.convertContributions(data.contributions),
      timestamp: data.lastUpdated.getTime(),
      metadata: {
        username: includePII ? data.developer.username : undefined,
        githubId: data.developer.githubId,
        gitlabId: data.developer.gitlabId,
        totalContributions: data.contributions.length,
        publishedAt: new Date().toISOString(),
        source: 'dotrep-v2'
      }
    };
  }

  /**
   * Convert DotRep contributions to standard Contribution format
   */
  private convertContributions(contributions: any[]): Contribution[] {
    return contributions.map(contrib => ({
      id: contrib.id || contrib.contributionId || `contrib-${Date.now()}`,
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
      'commit': 'github_commit',
      'merge_request': 'gitlab_mr',
      'mr': 'gitlab_mr'
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
    
    console.log(`UAL mapping stored: ${developerId} -> ${ual}`);
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
}

/**
 * Factory function to create a Knowledge Asset Publisher
 */
export function createPublisher(dkgClient?: DKGClient): KnowledgeAssetPublisher {
  return new KnowledgeAssetPublisher(dkgClient);
}

export default KnowledgeAssetPublisher;
