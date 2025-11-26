/**
 * OriginTrail DKG Client for DotRep Integration
 * 
 * This module provides a client for interacting with the OriginTrail Decentralized Knowledge Graph (DKG).
 * It enables publishing reputation data as Knowledge Assets and querying verifiable reputation information.
 * 
 * Key Features:
 * - Publish reputation scores as JSON-LD Knowledge Assets
 * - Query reputation data using Uniform Asset Locators (UALs)
 * - Support for both testnet and mainnet deployments
 * - Integration with NeuroWeb (Polkadot parachain)
 */

import DKG from 'dkg.js';
import {
  MOCK_REPUTATION_ASSETS,
  getMockJSONLD,
  getMockUAL,
  generateMockUAL,
  searchMockReputations,
  getMockNodeInfo,
  hasMockData,
  findDeveloperByUAL,
} from './mock-data';

export interface DKGConfig {
  endpoint?: string;
  blockchain?: string;
  wallet?: string;
  environment?: 'testnet' | 'mainnet' | 'local';
  useMockMode?: boolean; // Enable mock mode to use mock data instead of real DKG
  fallbackToMock?: boolean; // Automatically fallback to mock mode if DKG is unavailable
}

export interface ReputationAsset {
  developerId: string;
  reputationScore: number;
  contributions: Contribution[];
  timestamp: number;
  metadata: Record<string, any>;
}

export interface Contribution {
  id: string;
  type: 'github_pr' | 'github_commit' | 'gitlab_mr' | 'other';
  url: string;
  title: string;
  date: string;
  impact: number;
}

export interface PublishResult {
  UAL: string;
  transactionHash?: string;
  blockNumber?: number;
}

/**
 * DKG Client for OriginTrail Integration
 */
export class DKGClient {
  private dkg: any;
  private config: DKGConfig;
  private useMockMode: boolean = false;

  constructor(config?: DKGConfig) {
    this.config = this.resolveConfig(config);
    this.useMockMode = config?.useMockMode || process.env.DKG_USE_MOCK === 'true' || false;
    
    if (this.useMockMode) {
      console.log('🔧 DKG Client running in MOCK MODE - using mock data');
    } else {
      this.initializeDKG();
    }
  }

  /**
   * Resolve DKG configuration based on environment
   */
  private resolveConfig(config?: DKGConfig): DKGConfig {
    const environment = config?.environment || process.env.DKG_ENVIRONMENT || 'testnet';
    
    const endpoints = {
      testnet: 'https://v6-pegasus-node-02.origin-trail.network:8900',
      mainnet: 'https://positron.origin-trail.network',
      local: 'http://localhost:8900'
    };

    const blockchains = {
      testnet: 'otp:20430',
      mainnet: 'otp:2043',
      local: 'hardhat1:31337'
    };

    return {
      endpoint: config?.endpoint || process.env.DKG_OTNODE_URL || endpoints[environment],
      blockchain: config?.blockchain || process.env.DKG_BLOCKCHAIN || blockchains[environment],
      wallet: config?.wallet || process.env.DKG_PUBLISH_WALLET,
      environment
    };
  }

  /**
   * Initialize DKG SDK connection
   */
  private initializeDKG() {
    try {
      this.dkg = new DKG({
        endpoint: this.config.endpoint,
        blockchain: this.config.blockchain,
        ...(this.config.wallet && { wallet: this.config.wallet })
      });
      console.log(`DKG Client initialized for ${this.config.environment} environment`);
    } catch (error: any) {
      console.error('Failed to initialize DKG client:', error);
      
      // If fallback to mock is enabled, use mock mode instead of throwing
      if (this.config.fallbackToMock || process.env.DKG_FALLBACK_TO_MOCK === 'true') {
        console.warn('⚠️  Falling back to MOCK MODE due to initialization failure');
        this.useMockMode = true;
      } else {
        throw new Error(`DKG initialization failed: ${error.message}`);
      }
    }
  }

  /**
   * Publish reputation data as a Knowledge Asset on the DKG
   * 
   * @param reputationData - The reputation data to publish
   * @param epochs - Number of epochs to store the asset (default: 2)
   * @returns PublishResult with UAL and transaction details
   */
  async publishReputationAsset(
    reputationData: ReputationAsset,
    epochs: number = 2
  ): Promise<PublishResult> {
    // Use mock mode if enabled
    if (this.useMockMode) {
      console.log(`🔧 [MOCK] Publishing reputation asset for developer: ${reputationData.developerId}`);
      const ual = generateMockUAL(reputationData.developerId);
      console.log(`✅ [MOCK] Reputation asset published: ${ual}`);
      return {
        UAL: ual,
        transactionHash: `0x${Buffer.from(`${Date.now()}-${Math.random()}`).toString('hex')}`,
        blockNumber: Math.floor(Date.now() / 1000),
      };
    }

    try {
      // Convert reputation data to JSON-LD format
      const knowledgeAsset = this.toJSONLD(reputationData);

      // Publish to DKG
      const result = await this.dkg.asset.create({
        public: knowledgeAsset,
        epochs
      });

      console.log(`Reputation asset published: ${result.UAL}`);

      return {
        UAL: result.UAL,
        transactionHash: result.transactionHash,
        blockNumber: result.blockNumber
      };
    } catch (error: any) {
      console.error('Failed to publish reputation asset:', error);
      
      // Fallback to mock if enabled
      if (this.config.fallbackToMock || process.env.DKG_FALLBACK_TO_MOCK === 'true') {
        console.warn('⚠️  DKG operation failed, falling back to mock mode');
        this.useMockMode = true;
        return this.publishReputationAsset(reputationData, epochs);
      }
      
      throw new Error(`Asset publishing failed: ${error.message}`);
    }
  }

  /**
   * Query reputation data from the DKG using a UAL
   * 
   * @param ual - Uniform Asset Locator for the reputation asset
   * @returns Reputation data from the DKG
   */
  async queryReputation(ual: string): Promise<any> {
    // Use mock mode if enabled
    if (this.useMockMode) {
      console.log(`🔧 [MOCK] Querying reputation asset: ${ual}`);
      const developerId = findDeveloperByUAL(ual);
      if (developerId) {
        const mockData = getMockJSONLD(developerId);
        if (mockData) {
          console.log(`✅ [MOCK] Reputation asset retrieved`);
          return mockData;
        }
      }
      
      // Return generic mock response
      return {
        '@context': {
          '@vocab': 'https://schema.org/',
          'dotrep': 'https://dotrep.io/ontology/',
        },
        '@type': 'Person',
        '@id': ual,
        'identifier': 'mock-developer',
        'dateModified': new Date().toISOString(),
        'dotrep:reputationScore': 750,
        'aggregateRating': {
          '@type': 'AggregateRating',
          'ratingValue': 750,
          'bestRating': 1000,
          'worstRating': 0,
        },
        'dotrep:contributions': [],
        'mock': true,
      };
    }

    try {
      const asset = await this.dkg.asset.get(ual);
      return asset.public;
    } catch (error: any) {
      console.error(`Failed to query reputation asset ${ual}:`, error);
      
      // Fallback to mock if enabled
      if (this.config.fallbackToMock || process.env.DKG_FALLBACK_TO_MOCK === 'true') {
        console.warn('⚠️  DKG operation failed, falling back to mock mode');
        this.useMockMode = true;
        return this.queryReputation(ual);
      }
      
      throw new Error(`Asset query failed: ${error.message}`);
    }
  }

  /**
   * Search for reputation assets by developer ID
   * 
   * @param developerId - The developer's unique identifier
   * @returns Array of matching reputation assets
   */
  async searchByDeveloper(developerId: string): Promise<any[]> {
    // Use mock mode if enabled
    if (this.useMockMode) {
      console.log(`🔧 [MOCK] Searching for developer: ${developerId}`);
      if (hasMockData(developerId)) {
        const mockUAL = getMockUAL(developerId) || generateMockUAL(developerId);
        const asset = MOCK_REPUTATION_ASSETS.get(developerId);
        if (asset) {
          console.log(`✅ [MOCK] Found 1 reputation asset`);
          return [{
            asset: mockUAL,
            reputation: asset.reputationScore,
            timestamp: asset.timestamp,
          }];
        }
      }
      console.log(`✅ [MOCK] Found 0 reputation assets`);
      return [];
    }

    try {
      // Use SPARQL query to search for developer's reputation assets
      const query = `
        PREFIX schema: <https://schema.org/>
        PREFIX dotrep: <https://dotrep.io/ontology/>
        
        SELECT ?asset ?reputation ?timestamp
        WHERE {
          ?asset schema:identifier "${developerId}" .
          ?asset dotrep:reputationScore ?reputation .
          ?asset schema:dateModified ?timestamp .
        }
        ORDER BY DESC(?timestamp)
        LIMIT 10
      `;

      const results = await this.dkg.graph.query(query, 'SELECT');
      return results;
    } catch (error: any) {
      console.error(`Failed to search for developer ${developerId}:`, error);
      
      // Fallback to mock if enabled
      if (this.config.fallbackToMock || process.env.DKG_FALLBACK_TO_MOCK === 'true') {
        console.warn('⚠️  DKG operation failed, falling back to mock mode');
        this.useMockMode = true;
        return this.searchByDeveloper(developerId);
      }
      
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  /**
   * Update an existing reputation asset
   * 
   * @param ual - UAL of the asset to update
   * @param updatedData - New reputation data
   * @returns Updated asset UAL
   */
  async updateReputationAsset(
    ual: string,
    updatedData: Partial<ReputationAsset>
  ): Promise<PublishResult> {
    try {
      // Retrieve existing asset
      const existingAsset = await this.queryReputation(ual);

      // Merge with updated data
      const mergedData = {
        ...existingAsset,
        ...updatedData,
        timestamp: Date.now()
      };

      // Publish updated asset
      return await this.publishReputationAsset(mergedData as ReputationAsset);
    } catch (error) {
      console.error(`Failed to update reputation asset ${ual}:`, error);
      throw new Error(`Asset update failed: ${error.message}`);
    }
  }

  /**
   * Convert reputation data to JSON-LD format (W3C standard)
   * 
   * @param data - Reputation data to convert
   * @returns JSON-LD formatted knowledge asset
   */
  private toJSONLD(data: ReputationAsset): any {
    return {
      '@context': {
        '@vocab': 'https://schema.org/',
        'dotrep': 'https://dotrep.io/ontology/',
        'polkadot': 'https://polkadot.network/ontology/'
      },
      '@type': 'Person',
      '@id': `did:polkadot:${data.developerId}`,
      'identifier': data.developerId,
      'dateModified': new Date(data.timestamp).toISOString(),
      'dotrep:reputationScore': data.reputationScore,
      'aggregateRating': {
        '@type': 'AggregateRating',
        'ratingValue': data.reputationScore,
        'bestRating': 1000,
        'worstRating': 0,
        'ratingCount': data.contributions.length,
        'reviewAspect': 'Open Source Contributions'
      },
      'dotrep:contributions': data.contributions.map(contrib => ({
        '@type': 'CreativeWork',
        '@id': contrib.id,
        'name': contrib.title,
        'url': contrib.url,
        'datePublished': contrib.date,
        'dotrep:contributionType': contrib.type,
        'dotrep:impactScore': contrib.impact,
        'author': {
          '@id': `did:polkadot:${data.developerId}`
        }
      })),
      'dotrep:metadata': data.metadata,
      'verifiableCredential': {
        '@type': 'VerifiableCredential',
        'credentialSubject': {
          '@id': `did:polkadot:${data.developerId}`,
          'reputation': data.reputationScore
        },
        'proof': {
          '@type': 'Ed25519Signature2020',
          'created': new Date(data.timestamp).toISOString(),
          'proofPurpose': 'assertionMethod',
          'verificationMethod': `did:polkadot:${data.developerId}#keys-1`
        }
      }
    };
  }

  /**
   * Get DKG node information
   */
  async getNodeInfo(): Promise<any> {
    // Use mock mode if enabled
    if (this.useMockMode) {
      console.log(`🔧 [MOCK] Getting node info`);
      return getMockNodeInfo();
    }

    try {
      return await this.dkg.node.info();
    } catch (error: any) {
      console.error('Failed to get node info:', error);
      
      // Fallback to mock if enabled
      if (this.config.fallbackToMock || process.env.DKG_FALLBACK_TO_MOCK === 'true') {
        console.warn('⚠️  DKG operation failed, falling back to mock mode');
        this.useMockMode = true;
        return this.getNodeInfo();
      }
      
      throw new Error(`Node info query failed: ${error.message}`);
    }
  }

  /**
   * Check if DKG connection is healthy
   */
  async healthCheck(): Promise<boolean> {
    // In mock mode, always return true
    if (this.useMockMode) {
      console.log(`✅ [MOCK] DKG connection is healthy (mock mode)`);
      return true;
    }

    try {
      await this.getNodeInfo();
      return true;
    } catch (error) {
      // If fallback is enabled, switch to mock mode
      if (this.config.fallbackToMock || process.env.DKG_FALLBACK_TO_MOCK === 'true') {
        console.warn('⚠️  Switching to mock mode due to health check failure');
        this.useMockMode = true;
        return true;
      }
      return false;
    }
  }

  /**
   * Get connection status
   */
  getStatus(): { mockMode: boolean; environment: string; endpoint: string } {
    return {
      mockMode: this.useMockMode,
      environment: this.config.environment || 'unknown',
      endpoint: this.config.endpoint || 'unknown',
    };
  }

  /**
   * Execute a SPARQL query on the DKG graph
   * 
   * @param query - SPARQL query string
   * @param queryType - Query type ('SELECT', 'ASK', 'CONSTRUCT', 'DESCRIBE')
   * @returns Query results
   */
  async graphQuery(query: string, queryType: string = 'SELECT'): Promise<any[]> {
    try {
      const results = await this.dkg.graph.query(query, queryType);
      return results;
    } catch (error) {
      console.error('Failed to execute graph query:', error);
      throw new Error(`Graph query failed: ${error.message}`);
    }
  }
}

/**
 * Factory function to create a DKG client instance
 */
export function createDKGClient(config?: DKGConfig): DKGClient {
  return new DKGClient(config);
}

export default DKGClient;
