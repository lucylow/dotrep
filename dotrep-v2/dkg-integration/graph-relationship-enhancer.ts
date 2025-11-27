/**
 * Graph Relationship Enhancer
 * 
 * Enhances knowledge graph with rich relationships, social connections,
 * reputation networks, and cross-chain links based on Polkadot features
 */

import { DKGClient } from './dkg-client';
import { DKGClientV8 } from './dkg-client-v8';
import { AdvancedGraphQueries } from './sparql/advanced-graph-queries';

export interface RelationshipEnhancement {
  from: string;
  to: string;
  relationshipType: RelationshipType;
  strength: number;
  evidenceUALs: string[];
  metadata: Record<string, any>;
  verified: boolean;
}

export enum RelationshipType {
  COLLABORATES_WITH = 'collaborates_with',
  MENTORS = 'mentors',
  REVIEWED_BY = 'reviewed_by',
  ENDORSES = 'endorses',
  FOLLOWS = 'follows',
  CONTRIBUTED_WITH = 'contributed_with',
  TRUSTS = 'trusts',
  PART_OF_NETWORK = 'part_of_network',
  CROSS_CHAIN_SYNC = 'cross_chain_sync'
}

export interface GraphEnhancementConfig {
  minRelationshipStrength?: number;
  includeSocialGraph?: boolean;
  includeCrossChain?: boolean;
  includeReputationNetworks?: boolean;
  enableAutoDiscovery?: boolean;
}

/**
 * Graph Relationship Enhancer
 * Discovers and enhances relationships in the knowledge graph
 */
export class GraphRelationshipEnhancer {
  private dkgClient: DKGClient | DKGClientV8;
  private config: GraphEnhancementConfig;
  private discoveredRelationships: Map<string, RelationshipEnhancement> = new Map();

  constructor(
    dkgClient: DKGClient | DKGClientV8,
    config: GraphEnhancementConfig = {}
  ) {
    this.dkgClient = dkgClient;
    this.config = {
      minRelationshipStrength: 0.5,
      includeSocialGraph: true,
      includeCrossChain: true,
      includeReputationNetworks: true,
      enableAutoDiscovery: true,
      ...config
    };
  }

  /**
   * Discover relationships from contributions
   * Finds collaborations based on shared contributions
   */
  async discoverCollaborationRelationships(
    developerId: string
  ): Promise<RelationshipEnhancement[]> {
    const relationships: RelationshipEnhancement[] = [];

    try {
      // Query developer's contributions
      const developerProfile = await this.queryDeveloperProfile(developerId);
      const contributions = developerProfile?.contributions || [];

      // For each contribution, find related contributions and their authors
      for (const contribution of contributions) {
        if (contribution.relatedContributions) {
          for (const relatedUAL of contribution.relatedContributions) {
            const relatedContrib = await this.dkgClient.queryReputation(relatedUAL).catch(() => null);
            
            if (relatedContrib?.author) {
              const collaboratorId = this.extractDeveloperId(relatedContrib.author);
              
              if (collaboratorId && collaboratorId !== developerId) {
                const existingRel = relationships.find(
                  r => r.to === collaboratorId && r.relationshipType === RelationshipType.CONTRIBUTED_WITH
                );

                if (existingRel) {
                  existingRel.strength = Math.min(1.0, existingRel.strength + 0.2);
                  existingRel.evidenceUALs.push(contribution.ual || contribution['@id']);
                } else {
                  relationships.push({
                    from: developerId,
                    to: collaboratorId,
                    relationshipType: RelationshipType.CONTRIBUTED_WITH,
                    strength: 0.7,
                    evidenceUALs: [contribution.ual || contribution['@id']],
                    metadata: {
                      sharedContributions: 1,
                      contributionTypes: [contribution.type || 'other']
                    },
                    verified: false
                  });
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(`Failed to discover collaboration relationships for ${developerId}:`, error);
    }

    return relationships.filter(r => r.strength >= (this.config.minRelationshipStrength || 0.5));
  }

  /**
   * Discover social graph relationships
   * Based on GitHub/GitLab interactions, follows, reviews
   */
  async discoverSocialGraphRelationships(
    developerId: string,
    socialData?: {
      githubFollows?: string[];
      gitlabFollows?: string[];
      reviewedBy?: string[];
      reviewed?: string[];
    }
  ): Promise<RelationshipEnhancement[]> {
    const relationships: RelationshipEnhancement[] = [];

    if (!this.config.includeSocialGraph) {
      return relationships;
    }

    try {
      // Discover follows relationships
      const follows = [
        ...(socialData?.githubFollows || []),
        ...(socialData?.gitlabFollows || [])
      ];

      for (const followedId of follows) {
        relationships.push({
          from: developerId,
          to: followedId,
          relationshipType: RelationshipType.FOLLOWS,
          strength: 0.3,
          evidenceUALs: [],
          metadata: {
            source: 'social_platform',
            timestamp: Date.now()
          },
          verified: false
        });
      }

      // Discover review relationships
      if (socialData?.reviewedBy) {
        for (const reviewerId of socialData.reviewedBy) {
          relationships.push({
            from: reviewerId,
            to: developerId,
            relationshipType: RelationshipType.REVIEWED_BY,
            strength: 0.6,
            evidenceUALs: [],
            metadata: {
              reviewType: 'code_review',
              timestamp: Date.now()
            },
            verified: false
          });
        }
      }

      if (socialData?.reviewed) {
        for (const reviewedId of socialData.reviewed) {
          relationships.push({
            from: developerId,
            to: reviewedId,
            relationshipType: RelationshipType.REVIEWED_BY,
            strength: 0.6,
            evidenceUALs: [],
            metadata: {
              reviewType: 'code_review',
              timestamp: Date.now()
            },
            verified: false
          });
        }
      }
    } catch (error) {
      console.error(`Failed to discover social graph relationships for ${developerId}:`, error);
    }

    return relationships;
  }

  /**
   * Discover cross-chain relationships
   * Find developers who share reputation across chains
   */
  async discoverCrossChainRelationships(
    developerId: string
  ): Promise<RelationshipEnhancement[]> {
    const relationships: RelationshipEnhancement[] = [];

    if (!this.config.includeCrossChain) {
      return relationships;
    }

    try {
      // Query cross-chain reputation
      const crossChainRep = await this.queryCrossChainReputation(developerId);
      
      if (crossChainRep && crossChainRep.chains) {
        // Find other developers with similar cross-chain patterns
        // This would use a SPARQL query to find developers with overlapping chain presence
        const query = `
          PREFIX dotrep: <https://dotrep.io/ontology/>
          
          SELECT DISTINCT ?otherDeveloper ?sharedChains
          WHERE {
            ?developer dotrep:identifier "${developerId}" .
            ?developer dotrep:crossChainReputation ?crossChain .
            ?crossChain dotrep:chains ?chain .
            ?chain dotrep:chainId ?chainId .
            
            ?otherDeveloper dotrep:identifier ?otherId .
            ?otherDeveloper dotrep:crossChainReputation ?otherCrossChain .
            ?otherCrossChain dotrep:chains ?otherChain .
            ?otherChain dotrep:chainId ?chainId .
            
            FILTER(?otherDeveloper != ?developer)
            
            BIND(COUNT(DISTINCT ?chainId) AS ?sharedChains)
          }
          GROUP BY ?otherDeveloper
          HAVING(?sharedChains >= 2)
        `;

        // Execute query (would need to be implemented in DKG client)
        // For now, return empty array
      }
    } catch (error) {
      console.error(`Failed to discover cross-chain relationships for ${developerId}:`, error);
    }

    return relationships;
  }

  /**
   * Discover reputation network relationships
   * Find developers in the same networks
   */
  async discoverReputationNetworkRelationships(
    developerId: string
  ): Promise<RelationshipEnhancement[]> {
    const relationships: RelationshipEnhancement[] = [];

    if (!this.config.includeReputationNetworks) {
      return relationships;
    }

    try {
      // Query networks the developer is part of
      const profile = await this.queryDeveloperProfile(developerId);
      
      if (profile?.networks) {
        // Find other developers in the same networks
        for (const networkId of profile.networks) {
          // This would query for other participants in the network
          // and create PART_OF_NETWORK relationships
        }
      }
    } catch (error) {
      console.error(`Failed to discover reputation network relationships for ${developerId}:`, error);
    }

    return relationships;
  }

  /**
   * Enhance relationship strength based on multiple factors
   */
  enhanceRelationshipStrength(
    relationship: RelationshipEnhancement,
    factors: {
      sharedContributions?: number;
      reputationDifference?: number;
      timeDecay?: number;
      crossChainConsistency?: number;
    }
  ): number {
    let strength = relationship.strength;

    // Boost based on shared contributions
    if (factors.sharedContributions) {
      strength += Math.min(0.2, factors.sharedContributions * 0.05);
    }

    // Adjust based on reputation similarity (similar reputation = stronger bond)
    if (factors.reputationDifference !== undefined) {
      const similarity = 1.0 - Math.min(1.0, factors.reputationDifference / 1000);
      strength *= (0.8 + similarity * 0.2);
    }

    // Apply time decay for older relationships
    if (factors.timeDecay) {
      strength *= factors.timeDecay;
    }

    // Boost for cross-chain consistency
    if (factors.crossChainConsistency) {
      strength += factors.crossChainConsistency * 0.1;
    }

    return Math.min(1.0, Math.max(0.0, strength));
  }

  /**
   * Publish enhanced relationships to DKG
   */
  async publishRelationships(
    relationships: RelationshipEnhancement[]
  ): Promise<Array<{ relationship: RelationshipEnhancement; ual?: string }>> {
    const results: Array<{ relationship: RelationshipEnhancement; ual?: string }> = [];

    for (const relationship of relationships) {
      try {
        const knowledgeAsset = this.relationshipToJSONLD(relationship);
        
        // Publish to DKG
        const result = await this.dkgClient.publishReputationAsset({
          developerId: relationship.from,
          reputationScore: 0, // Not a reputation asset, but reuse the interface
          contributions: [],
          timestamp: Date.now(),
          metadata: {
            relationshipType: 'SocialConnection',
            relationshipData: relationship
          }
        } as any);

        results.push({
          relationship,
          ual: result.UAL
        });

        console.log(`✅ Published relationship: ${relationship.from} -> ${relationship.to} (${relationship.relationshipType})`);
      } catch (error) {
        console.error(`❌ Failed to publish relationship:`, error);
        results.push({ relationship });
      }
    }

    return results;
  }

  /**
   * Convert relationship to JSON-LD format
   */
  private relationshipToJSONLD(relationship: RelationshipEnhancement): any {
    return {
      '@context': {
        '@vocab': 'https://schema.org/',
        'dotrep': 'https://dotrep.io/ontology/'
      },
      '@type': 'dotrep:SocialConnection',
      '@id': `relationship:${relationship.from}:${relationship.to}:${relationship.relationshipType}`,
      'dotrep:from': {
        '@id': `did:polkadot:${relationship.from}`,
        '@type': 'Person'
      },
      'dotrep:to': {
        '@id': `did:polkadot:${relationship.to}`,
        '@type': 'Person'
      },
      'dotrep:connectionType': relationship.relationshipType,
      'dotrep:connectionStrength': relationship.strength,
      'dotrep:evidenceUALs': relationship.evidenceUALs,
      'dotrep:verified': relationship.verified,
      'dotrep:metadata': relationship.metadata,
      'createdAt': new Date().toISOString()
    };
  }

  /**
   * Comprehensive enhancement: discover all relationship types
   */
  async enhanceDeveloperGraph(
    developerId: string,
    socialData?: any
  ): Promise<RelationshipEnhancement[]> {
    console.log(`🔍 Enhancing knowledge graph for developer: ${developerId}`);

    const allRelationships: RelationshipEnhancement[] = [];

    // Discover different types of relationships
    const [
      collaborations,
      social,
      crossChain,
      networks
    ] = await Promise.all([
      this.discoverCollaborationRelationships(developerId),
      this.discoverSocialGraphRelationships(developerId, socialData),
      this.discoverCrossChainRelationships(developerId),
      this.discoverReputationNetworkRelationships(developerId)
    ]);

    allRelationships.push(...collaborations, ...social, ...crossChain, ...networks);

    // Deduplicate and merge relationships
    const mergedRelationships = this.mergeRelationships(allRelationships);

    // Enhance relationship strengths
    const enhancedRelationships = await Promise.all(
      mergedRelationships.map(async rel => {
        const factors = await this.calculateEnhancementFactors(rel);
        rel.strength = this.enhanceRelationshipStrength(rel, factors);
        return rel;
      })
    );

    // Filter by minimum strength
    const filteredRelationships = enhancedRelationships.filter(
      r => r.strength >= (this.config.minRelationshipStrength || 0.5)
    );

    console.log(`✅ Discovered ${filteredRelationships.length} relationships for ${developerId}`);

    return filteredRelationships;
  }

  /**
   * Merge duplicate relationships
   */
  private mergeRelationships(relationships: RelationshipEnhancement[]): RelationshipEnhancement[] {
    const merged = new Map<string, RelationshipEnhancement>();

    for (const rel of relationships) {
      const key = `${rel.from}:${rel.to}:${rel.relationshipType}`;
      
      if (merged.has(key)) {
        const existing = merged.get(key)!;
        existing.strength = Math.max(existing.strength, rel.strength);
        existing.evidenceUALs.push(...rel.evidenceUALs);
        existing.metadata = { ...existing.metadata, ...rel.metadata };
      } else {
        merged.set(key, { ...rel });
      }
    }

    return Array.from(merged.values());
  }

  /**
   * Calculate factors for relationship enhancement
   */
  private async calculateEnhancementFactors(
    relationship: RelationshipEnhancement
  ): Promise<{
    sharedContributions?: number;
    reputationDifference?: number;
    timeDecay?: number;
    crossChainConsistency?: number;
  }> {
    // Placeholder implementation
    // Would query actual data to calculate these factors
    return {
      sharedContributions: relationship.metadata.sharedContributions || 0,
      reputationDifference: 0,
      timeDecay: 1.0,
      crossChainConsistency: 0
    };
  }

  // Helper methods
  private async queryDeveloperProfile(developerId: string): Promise<any> {
    try {
      return await this.dkgClient.queryReputation(developerId);
    } catch {
      return null;
    }
  }

  private async queryCrossChainReputation(developerId: string): Promise<any> {
    // Placeholder - would query cross-chain reputation
    return null;
  }

  private extractDeveloperId(author: any): string | null {
    if (typeof author === 'string') {
      return author;
    }
    if (author?.['@id']) {
      const match = author['@id'].match(/did:polkadot:(.+)/);
      return match ? match[1] : null;
    }
    if (author?.identifier) {
      return author.identifier;
    }
    return null;
  }
}

export default GraphRelationshipEnhancer;

