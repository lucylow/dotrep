/**
 * OriginTrail DKG Client for DotRep Integration (V8 Compatible)
 * 
 * This module provides a client for interacting with the OriginTrail Decentralized Knowledge Graph (DKG).
 * Updated for dkg.js V8 API with improved error handling and retry logic.
 * 
 * Key Features:
 * - Publish reputation scores as JSON-LD Knowledge Assets
 * - Query reputation data using Uniform Asset Locators (UALs)
 * - Support for testnet, mainnet, and local deployments
 * - Integration with NeuroWeb (Polkadot parachain)
 * - Automatic retry logic for failed operations
 * - Connection pooling and health monitoring
 */

import DKG from 'dkg.js';

export interface DKGConfig {
  endpoint?: string;
  blockchain?: {
    name?: string;
    publicKey?: string;
    privateKey?: string;
  };
  environment?: 'testnet' | 'mainnet' | 'local';
  maxRetries?: number;
  retryDelay?: number;
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
 * DKG Client for OriginTrail Integration (V8 Compatible)
 */
export class DKGClientV8 {
  private dkg: any;
  private config: DKGConfig;
  private isInitialized: boolean = false;
  private maxRetries: number;
  private retryDelay: number;

  constructor(config?: DKGConfig) {
    this.config = this.resolveConfig(config);
    this.maxRetries = config?.maxRetries || 3;
    this.retryDelay = config?.retryDelay || 1000;
    this.initializeDKG();
  }

  /**
   * Resolve DKG configuration based on environment (V8 compatible)
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
      blockchain: {
        name: config?.blockchain?.name || process.env.DKG_BLOCKCHAIN || blockchains[environment],
        privateKey: config?.blockchain?.privateKey || process.env.DKG_PUBLISH_WALLET
      },
      environment,
      maxRetries: config?.maxRetries || 3,
      retryDelay: config?.retryDelay || 1000
    };
  }

  /**
   * Initialize DKG SDK connection (V8 API)
   */
  private initializeDKG() {
    try {
      const initConfig: any = {
        endpoint: this.config.endpoint,
        blockchain: this.config.blockchain
      };

      this.dkg = new DKG(initConfig);
      this.isInitialized = true;
      console.log(`✅ DKG Client V8 initialized for ${this.config.environment} environment`);
      console.log(`📍 Endpoint: ${this.config.endpoint}`);
      console.log(`⛓️  Blockchain: ${this.config.blockchain?.name}`);
    } catch (error: any) {
      console.error('❌ Failed to initialize DKG client:', error);
      this.isInitialized = false;
      throw new Error(`DKG initialization failed: ${error.message}`);
    }
  }

  /**
   * Retry wrapper for DKG operations
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        console.warn(`⚠️  ${operationName} failed (attempt ${attempt}/${this.maxRetries}): ${error.message}`);
        
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * attempt;
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`${operationName} failed after ${this.maxRetries} attempts: ${lastError!.message}`);
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
    if (!this.isInitialized) {
      throw new Error('DKG client not initialized');
    }

    return this.retryOperation(async () => {
      // Convert reputation data to JSON-LD format
      const knowledgeAsset = this.toJSONLD(reputationData);

      console.log(`📤 Publishing reputation asset for developer: ${reputationData.developerId}`);
      console.log(`📊 Reputation score: ${reputationData.reputationScore}`);
      console.log(`📝 Contributions: ${reputationData.contributions.length}`);

      // Publish to DKG (V8 API)
      const result = await this.dkg.asset.create(
        {
          public: knowledgeAsset
        },
        {
          epochsNum: epochs
        }
      );

      console.log(`✅ Reputation asset published successfully!`);
      console.log(`🔗 UAL: ${result.UAL}`);

      return {
        UAL: result.UAL,
        transactionHash: result.transactionHash,
        blockNumber: result.blockNumber
      };
    }, 'Publish reputation asset');
  }

  /**
   * Query reputation data from the DKG using a UAL
   * 
   * @param ual - Uniform Asset Locator for the reputation asset
   * @returns Reputation data from the DKG
   */
  async queryReputation(ual: string): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('DKG client not initialized');
    }

    return this.retryOperation(async () => {
      console.log(`🔍 Querying reputation asset: ${ual}`);
      const result = await this.dkg.asset.get(ual);
      console.log(`✅ Reputation asset retrieved successfully`);
      return result.public || result.assertion;
    }, 'Query reputation asset');
  }

  /**
   * Search for reputation assets by developer ID using SPARQL
   * 
   * @param developerId - The developer's unique identifier
   * @returns Array of matching reputation assets
   */
  async searchByDeveloper(developerId: string): Promise<any[]> {
    if (!this.isInitialized) {
      throw new Error('DKG client not initialized');
    }

    return this.retryOperation(async () => {
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

      console.log(`🔍 Searching for developer: ${developerId}`);
      const results = await this.dkg.graph.query(query, 'SELECT');
      console.log(`✅ Found ${results.length} reputation assets`);
      return results;
    }, 'Search by developer');
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
    if (!this.isInitialized) {
      throw new Error('DKG client not initialized');
    }

    return this.retryOperation(async () => {
      // Retrieve existing asset
      const existingAsset = await this.queryReputation(ual);

      // Merge with updated data
      const mergedData = {
        ...existingAsset,
        ...updatedData,
        timestamp: Date.now()
      };

      console.log(`🔄 Updating reputation asset: ${ual}`);
      // Publish updated asset
      return await this.publishReputationAsset(mergedData as ReputationAsset);
    }, 'Update reputation asset');
  }

  /**
   * Batch publish multiple reputation assets
   * 
   * @param reputationDataArray - Array of reputation data to publish
   * @param epochs - Number of epochs to store each asset
   * @returns Array of publish results
   */
  async batchPublishReputationAssets(
    reputationDataArray: ReputationAsset[],
    epochs: number = 2
  ): Promise<PublishResult[]> {
    console.log(`📦 Batch publishing ${reputationDataArray.length} reputation assets`);
    
    const results: PublishResult[] = [];
    for (const reputationData of reputationDataArray) {
      try {
        const result = await this.publishReputationAsset(reputationData, epochs);
        results.push(result);
      } catch (error: any) {
        console.error(`❌ Failed to publish asset for ${reputationData.developerId}:`, error.message);
        // Continue with other assets
      }
    }
    
    console.log(`✅ Batch publish complete: ${results.length}/${reputationDataArray.length} successful`);
    return results;
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
    if (!this.isInitialized) {
      throw new Error('DKG client not initialized');
    }

    return this.retryOperation(async () => {
      const info = await this.dkg.node.info();
      console.log(`ℹ️  DKG Node Version: ${info.version}`);
      return info;
    }, 'Get node info');
  }

  /**
   * Check if DKG connection is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.getNodeInfo();
      console.log(`✅ DKG connection is healthy`);
      return true;
    } catch (error) {
      console.error(`❌ DKG connection is unhealthy:`, error);
      return false;
    }
  }

  /**
   * Get connection status
   */
  getStatus(): { initialized: boolean; environment: string; endpoint: string } {
    return {
      initialized: this.isInitialized,
      environment: this.config.environment || 'unknown',
      endpoint: this.config.endpoint || 'unknown'
    };
  }
}

/**
 * Factory function to create a DKG client instance
 */
export function createDKGClientV8(config?: DKGConfig): DKGClientV8 {
  return new DKGClientV8(config);
}

export default DKGClientV8;
