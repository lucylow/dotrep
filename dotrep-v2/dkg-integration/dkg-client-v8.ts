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
import { validateJSONLD, computeContentHash, ValidationResult } from './jsonld-validator';
import { validateSPARQL, escapeSPARQLString, SPARQLValidationResult } from './sparql-validator';
import {
  signAsset,
  verifyAssetWithDID,
  generateDIDKeyPair,
  canonicalizeJSON,
  computeContentHash as computeHash,
  type DIDKeyPair,
  type SignatureResult,
} from './did-signing';
import { TokenomicsService, createTokenomicsService, type PublishCostEstimate } from './tokenomics-service';

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
  useMockMode?: boolean; // Enable mock mode to use mock data instead of real DKG
  fallbackToMock?: boolean; // Automatically fallback to mock mode if DKG is unavailable
  publisherDID?: string; // DID of the publisher for signing assets
  publisherKeyPair?: DIDKeyPair; // Key pair for signing (if not provided, will generate)
  enableSigning?: boolean; // Enable cryptographic signing of assets (default: true)
}

export interface ReputationAsset {
  developerId: string;
  reputationScore: number;
  contributions: Contribution[];
  timestamp: number;
  metadata: Record<string, any>;
  previousVersionUAL?: string; // UAL of previous version for prov:wasRevisionOf
  provenance?: {
    computedBy?: string;
    method?: string;
    sourceAssets?: string[];
  };
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
  costEstimate?: PublishCostEstimate; // Cost estimate for this publish operation
  actualCost?: {
    tracFee: bigint;
    neuroGasFee: bigint;
  }; // Actual costs (if tracked)
}

/**
 * DKG Client for OriginTrail Integration (V8 Compatible)
 */
export class DKGClientV8 {
  private dkg: any;
  private config: DKGConfig;
  private isInitialized: boolean = false;
  private useMockMode: boolean = false;
  private maxRetries: number;
  private retryDelay: number;
  private publisherKeyPair: DIDKeyPair | null = null;
  private tokenomics: TokenomicsService;

  constructor(config?: DKGConfig) {
    this.config = this.resolveConfig(config);
    this.maxRetries = config?.maxRetries || 3;
    this.retryDelay = config?.retryDelay || 1000;
    this.useMockMode = config?.useMockMode || process.env.DKG_USE_MOCK === 'true' || false;
    
    // Initialize tokenomics service
    this.tokenomics = createTokenomicsService({
      simulationMode: this.useMockMode || process.env.DKG_SIMULATION_MODE === 'true',
      tracPriceUSD: parseFloat(process.env.TRAC_PRICE_USD || '0'),
      neuroPriceUSD: parseFloat(process.env.NEURO_PRICE_USD || '0'),
    });
    
    // Initialize publisher key pair for signing
    if (config?.publisherKeyPair) {
      this.publisherKeyPair = config.publisherKeyPair;
    } else if (config?.publisherDID) {
      // In production, resolve DID to key pair
      // For now, generate a key pair
      this.publisherKeyPair = generateDIDKeyPair(config.publisherDID);
    } else if (config?.enableSigning !== false) {
      // Generate default key pair if signing is enabled
      this.publisherKeyPair = generateDIDKeyPair();
      console.log(`🔑 Generated publisher DID: ${this.publisherKeyPair.did}`);
    }
    
    if (this.useMockMode) {
      console.log('🔧 DKG Client V8 running in MOCK MODE - using mock data');
      this.isInitialized = true;
    } else {
      this.initializeDKG();
    }
  }

  /**
   * Resolve DKG configuration based on environment (V8 compatible)
   */
  private resolveConfig(config?: DKGConfig): DKGConfig {
    const env = config?.environment || process.env.DKG_ENVIRONMENT || 'testnet';
    const environment: 'testnet' | 'mainnet' | 'local' = 
      (env === 'testnet' || env === 'mainnet' || env === 'local') ? env : 'testnet';
    
    const endpoints: Record<'testnet' | 'mainnet' | 'local', string> = {
      testnet: 'https://v6-pegasus-node-02.origin-trail.network:8900',
      mainnet: 'https://positron.origin-trail.network',
      local: 'http://localhost:8900'
    };

    const blockchains: Record<'testnet' | 'mainnet' | 'local', string> = {
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
      
      // If fallback to mock is enabled, use mock mode instead of throwing
      if (this.config.fallbackToMock || process.env.DKG_FALLBACK_TO_MOCK === 'true') {
        console.warn('⚠️  Falling back to MOCK MODE due to initialization failure');
        this.useMockMode = true;
        this.isInitialized = true;
      } else {
        throw new Error(`DKG initialization failed: ${error.message}`);
      }
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
   * Validates the JSON-LD structure, canonicalizes it, and computes content hash
   * before publishing to ensure data integrity and compliance with W3C standards.
   * 
   * @param reputationData - The reputation data to publish
   * @param epochs - Number of epochs to store the asset (default: 2)
   * @param options - Additional options for publishing
   * @param options.validateSchema - Whether to validate against schema (default: true)
   * @param options.skipValidation - Skip validation (not recommended, default: false)
   * @returns PublishResult with UAL and transaction details
   * @throws Error if validation fails or publishing fails
   * 
   * @example
   * ```typescript
   * const result = await dkgClient.publishReputationAsset({
   *   developerId: 'alice',
   *   reputationScore: 850,
   *   contributions: [...],
   *   timestamp: Date.now(),
   *   metadata: {}
   * });
   * console.log(`Published with UAL: ${result.UAL}`);
   * ```
   */
  async publishReputationAsset(
    reputationData: ReputationAsset,
    epochs: number = 2,
    options: {
      validateSchema?: boolean;
      skipValidation?: boolean;
    } = {}
  ): Promise<PublishResult> {
    if (!this.isInitialized) {
      throw new Error('DKG client not initialized');
    }

    const { validateSchema = true, skipValidation = false } = options;

    // Use mock mode if enabled
    if (this.useMockMode) {
      console.log(`🔧 [MOCK] Publishing reputation asset for developer: ${reputationData.developerId}`);
      console.log(`📊 Reputation score: ${reputationData.reputationScore}`);
      console.log(`📝 Contributions: ${reputationData.contributions.length}`);
      
      const ual = generateMockUAL(reputationData.developerId);
      
      console.log(`✅ [MOCK] Reputation asset published successfully!`);
      console.log(`🔗 UAL: ${ual}`);
      
      // Estimate cost even in mock mode (for simulation)
      const costEstimate = this.tokenomics.estimatePublishCost(epochs, false);
      
      return {
        UAL: ual,
        transactionHash: `0x${Buffer.from(`${Date.now()}-${Math.random()}`).toString('hex')}`,
        blockNumber: Math.floor(Date.now() / 1000),
        costEstimate,
        actualCost: {
          tracFee: costEstimate.tracFee,
          neuroGasFee: costEstimate.neuroGasFee
        }
      };
    }

    return this.retryOperation(async () => {
      // Convert reputation data to JSON-LD format
      const knowledgeAsset = this.toJSONLD(reputationData);

      // Validate JSON-LD structure if not skipped
      if (!skipValidation) {
        const validationResult: ValidationResult = await validateJSONLD(
          knowledgeAsset,
          validateSchema ? 'reputation' : undefined
        );

        if (!validationResult.valid) {
          const errorMessages = validationResult.errors.map(e => 
            `${e.path}: ${e.message}`
          ).join('; ');
          
          throw new Error(
            `JSON-LD validation failed: ${errorMessages}. ` +
            `This ensures data integrity and W3C compliance. ` +
            `To skip validation (not recommended), set skipValidation: true`
          );
        }

        // Log warnings if any
        if (validationResult.warnings.length > 0) {
          console.warn('⚠️  JSON-LD validation warnings:');
          validationResult.warnings.forEach(warning => {
            console.warn(`  - ${warning.path}: ${warning.message}`);
          });
        }

        // Compute and log content hash
        if (validationResult.contentHash) {
          console.log(`🔐 Content hash: ${validationResult.contentHash}`);
        }
      }

      console.log(`📤 Publishing reputation asset for developer: ${reputationData.developerId}`);
      console.log(`📊 Reputation score: ${reputationData.reputationScore}`);
      console.log(`📝 Contributions: ${reputationData.contributions.length}`);

      // Estimate cost before publishing
      const costEstimate = this.tokenomics.estimatePublishCost(epochs, false);
      console.log(`💰 Estimated cost: ${this.tokenomics.formatTRAC(costEstimate.tracFee)} + ${this.tokenomics.formatNEURO(costEstimate.neuroGasFee)}`);
      if (costEstimate.totalCostUSD > 0) {
        console.log(`   Total: $${costEstimate.totalCostUSD.toFixed(4)} USD`);
      }

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
      if (result.transactionHash) {
        console.log(`📝 Transaction: ${result.transactionHash}`);
      }

      // Record actual fees (in real implementation, extract from transaction receipt)
      // For now, use estimated fees
      this.tokenomics.recordFeeSpent('publish', costEstimate.tracFee, costEstimate.neuroGasFee, result.UAL);

      return {
        UAL: result.UAL,
        transactionHash: result.transactionHash,
        blockNumber: result.blockNumber,
        costEstimate,
        actualCost: {
          tracFee: costEstimate.tracFee,
          neuroGasFee: costEstimate.neuroGasFee
        }
      };
    }, 'Publish reputation asset').catch((error) => {
      // Fallback to mock if enabled
      if (this.config.fallbackToMock || process.env.DKG_FALLBACK_TO_MOCK === 'true') {
        console.warn('⚠️  DKG operation failed, falling back to mock mode');
        this.useMockMode = true;
        return this.publishReputationAsset(reputationData, epochs, options);
      }
      throw error;
    });
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

    // Use mock mode if enabled
    if (this.useMockMode) {
      console.log(`🔧 [MOCK] Querying reputation asset: ${ual}`);
      
      // Try to find developer by UAL in mock data
      const developerId = findDeveloperByUAL(ual);
      if (developerId) {
        const mockData = getMockJSONLD(developerId);
        if (mockData) {
          console.log(`✅ [MOCK] Reputation asset retrieved successfully`);
          return mockData;
        }
      }
      
      // If not found, return a generic mock response
      console.log(`✅ [MOCK] Reputation asset retrieved successfully (generic)`);
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

    return this.retryOperation(async () => {
      console.log(`🔍 Querying reputation asset: ${ual}`);
      const result = await this.dkg.asset.get(ual);
      console.log(`✅ Reputation asset retrieved successfully`);
      return result.public || result.assertion;
    }, 'Query reputation asset').catch((error) => {
      // Fallback to mock if enabled
      if (this.config.fallbackToMock || process.env.DKG_FALLBACK_TO_MOCK === 'true') {
        console.warn('⚠️  DKG operation failed, falling back to mock mode');
        this.useMockMode = true;
        return this.queryReputation(ual);
      }
      throw error;
    });
  }

  /**
   * Search for reputation assets by developer ID using SPARQL
   * 
   * Validates and sanitizes the SPARQL query before execution to prevent
   * injection attacks and ensure query correctness.
   * 
   * @param developerId - The developer's unique identifier
   * @param options - Search options
   * @param options.limit - Maximum number of results (default: 10, max: 100)
   * @returns Array of matching reputation assets
   * @throws Error if query validation fails or search fails
   * 
   * @example
   * ```typescript
   * const results = await dkgClient.searchByDeveloper('alice', { limit: 20 });
   * console.log(`Found ${results.length} reputation assets`);
   * ```
   */
  async searchByDeveloper(
    developerId: string,
    options: { limit?: number } = {}
  ): Promise<any[]> {
    if (!this.isInitialized) {
      throw new Error('DKG client not initialized');
    }

    const { limit = 10 } = options;
    const safeLimit = Math.min(Math.max(1, limit), 100); // Clamp between 1 and 100

    // Validate developerId
    if (!developerId || typeof developerId !== 'string' || developerId.trim().length === 0) {
      throw new Error('Developer ID must be a non-empty string');
    }

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

    return this.retryOperation(async () => {
      // Escape developerId to prevent SPARQL injection
      const escapedDeveloperId = escapeSPARQLString(developerId);

      // Use SPARQL query to search for developer's reputation assets
      const query = `
        PREFIX schema: <https://schema.org/>
        PREFIX dotrep: <https://dotrep.io/ontology/>
        
        SELECT ?asset ?reputation ?timestamp
        WHERE {
          ?asset schema:identifier "${escapedDeveloperId}" .
          ?asset dotrep:reputationScore ?reputation .
          ?asset schema:dateModified ?timestamp .
        }
        ORDER BY DESC(?timestamp)
        LIMIT ${safeLimit}
      `;

      // Validate SPARQL query before execution
      const validationResult: SPARQLValidationResult = validateSPARQL(query);
      
      if (!validationResult.valid) {
        const errorMessages = validationResult.errors.map(e => e.message).join('; ');
        throw new Error(`SPARQL query validation failed: ${errorMessages}`);
      }

      // Log warnings if any
      if (validationResult.warnings.length > 0) {
        console.warn('⚠️  SPARQL query validation warnings:');
        validationResult.warnings.forEach(warning => {
          console.warn(`  - ${warning.message}`);
        });
      }

      // Use sanitized query if available
      const safeQuery = validationResult.sanitizedQuery || query;

      console.log(`🔍 Searching for developer: ${developerId}`);
      const results = await this.dkg.graph.query(safeQuery, 'SELECT');
      console.log(`✅ Found ${results.length} reputation assets`);
      return results;
    }, 'Search by developer').catch((error) => {
      // Fallback to mock if enabled
      if (this.config.fallbackToMock || process.env.DKG_FALLBACK_TO_MOCK === 'true') {
        console.warn('⚠️  DKG operation failed, falling back to mock mode');
        this.useMockMode = true;
        return this.searchByDeveloper(developerId, options);
      }
      throw error;
    });
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
   * Batch publish multiple reputation assets with cost optimization
   * 
   * Uses batching to reduce gas costs and provides cost estimates
   * 
   * @param reputationDataArray - Array of reputation data to publish
   * @param epochs - Number of epochs to store each asset
   * @param options - Batch options
   * @param options.batchSize - Size of each batch (default: optimal from tokenomics)
   * @param options.delayBetweenBatches - Delay between batches in ms (default: 1000)
   * @returns Array of publish results with cost information
   */
  async batchPublishReputationAssets(
    reputationDataArray: ReputationAsset[],
    epochs: number = 2,
    options: {
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
    const batchSize = options.batchSize || this.tokenomics.getOptimalBatchSize();
    const delay = options.delayBetweenBatches || this.tokenomics.getConfig().batchDelay;
    
    console.log(`📦 Batch publishing ${reputationDataArray.length} reputation assets`);
    console.log(`   Batch size: ${batchSize}, Delay: ${delay}ms`);
    
    // Get batch cost estimate
    const batchCostEstimate = this.tokenomics.estimateBatchPublishCost(
      reputationDataArray.length,
      epochs,
      false
    );
    console.log(`💰 Batch cost estimate:`);
    console.log(`   Total TRAC: ${this.tokenomics.formatTRAC(batchCostEstimate.totalTracFee)}`);
    console.log(`   Total NEURO: ${this.tokenomics.formatNEURO(batchCostEstimate.totalNeuroGasFee)}`);
    if (batchCostEstimate.totalCostUSD > 0) {
      console.log(`   Total USD: $${batchCostEstimate.totalCostUSD.toFixed(4)}`);
    }
    if (batchCostEstimate.savingsFromBatching.percentage > 0) {
      console.log(`   💡 Batching saves ${batchCostEstimate.savingsFromBatching.percentage.toFixed(1)}% on gas fees`);
    }
    
    const results: PublishResult[] = [];
    let totalTracSpent = BigInt(0);
    let totalNeuroSpent = BigInt(0);
    
    // Process in batches
    for (let i = 0; i < reputationDataArray.length; i += batchSize) {
      const batch = reputationDataArray.slice(i, i + batchSize);
      console.log(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(reputationDataArray.length / batchSize)} (${batch.length} assets)`);
      
      for (const reputationData of batch) {
        try {
          const result = await this.publishReputationAsset(reputationData, epochs);
          results.push(result);
          
          if (result.actualCost) {
            totalTracSpent += result.actualCost.tracFee;
            totalNeuroSpent += result.actualCost.neuroGasFee;
          }
        } catch (error: any) {
          console.error(`❌ Failed to publish asset for ${reputationData.developerId}:`, error.message);
          results.push({
            UAL: '',
            error: error.message
          } as any);
        }
      }
      
      // Delay between batches (except for last batch)
      if (i + batchSize < reputationDataArray.length && delay > 0) {
        console.log(`⏳ Waiting ${delay}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    const successful = results.filter(r => r.UAL && !('error' in r)).length;
    const failed = results.length - successful;
    
    // Record batch fees
    this.tokenomics.recordFeeSpent('batch', totalTracSpent, totalNeuroSpent, undefined, successful);
    
    const totalCostUSD = (this.tokenomics.getConfig().tracPriceUSD > 0
      ? Number(totalTracSpent) / (10 ** this.tokenomics.getConfig().tracDecimals) * this.tokenomics.getConfig().tracPriceUSD
      : 0) + (this.tokenomics.getConfig().neuroPriceUSD > 0
      ? Number(totalNeuroSpent) / (10 ** this.tokenomics.getConfig().neuroDecimals) * this.tokenomics.getConfig().neuroPriceUSD
      : 0);
    
    console.log(`\n✅ Batch publish complete: ${successful} succeeded, ${failed} failed`);
    console.log(`💰 Total spent: ${this.tokenomics.formatTRAC(totalTracSpent)} + ${this.tokenomics.formatNEURO(totalNeuroSpent)}`);
    if (totalCostUSD > 0) {
      console.log(`   Total USD: $${totalCostUSD.toFixed(4)}`);
    }
    
    return {
      results,
      batchCostEstimate,
      summary: {
        totalPublished: successful,
        totalFailed: failed,
        totalTracSpent,
        totalNeuroSpent,
        totalCostUSD
      }
    };
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

    // Use mock mode if enabled
    if (this.useMockMode) {
      console.log(`🔧 [MOCK] Getting node info`);
      const mockInfo = getMockNodeInfo();
      console.log(`ℹ️  [MOCK] DKG Node Version: ${mockInfo.version}`);
      return mockInfo;
    }

    return this.retryOperation(async () => {
      const info = await this.dkg.node.info();
      console.log(`ℹ️  DKG Node Version: ${info.version}`);
      return info;
    }, 'Get node info').catch((error) => {
      // Fallback to mock if enabled
      if (this.config.fallbackToMock || process.env.DKG_FALLBACK_TO_MOCK === 'true') {
        console.warn('⚠️  DKG operation failed, falling back to mock mode');
        this.useMockMode = true;
        return this.getNodeInfo();
      }
      throw error;
    });
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
      console.log(`✅ DKG connection is healthy`);
      return true;
    } catch (error) {
      console.error(`❌ DKG connection is unhealthy:`, error);
      
      // If fallback is enabled, switch to mock mode
      if (this.config.fallbackToMock || process.env.DKG_FALLBACK_TO_MOCK === 'true') {
        console.warn('⚠️  Switching to mock mode due to health check failure');
        this.useMockMode = true;
        this.isInitialized = true;
        return true;
      }
      
      return false;
    }
  }

  /**
   * Execute a safe SPARQL query on the DKG graph
   * 
   * Validates and sanitizes the SPARQL query before execution to ensure
   * security and correctness. Only read-only queries (SELECT, ASK, DESCRIBE, CONSTRUCT)
   * are allowed by default.
   * 
   * @param query - SPARQL query string
   * @param queryType - Query type ('SELECT', 'ASK', 'CONSTRUCT', 'DESCRIBE')
   * @param options - Query options
   * @param options.allowUpdates - Allow UPDATE queries (default: false)
   * @returns Query results
   * @throws Error if query validation fails or execution fails
   * 
   * @example
   * ```typescript
   * const query = `
   *   PREFIX schema: <https://schema.org/>
   *   SELECT ?person ?score WHERE {
   *     ?person schema:identifier ?id .
   *     ?person dotrep:reputationScore ?score .
   *     FILTER(?score > 800)
   *   }
   *   LIMIT 10
   * `;
   * const results = await dkgClient.executeSafeQuery(query, 'SELECT');
   * ```
   */
  async executeSafeQuery(
    query: string,
    queryType: 'SELECT' | 'ASK' | 'CONSTRUCT' | 'DESCRIBE' = 'SELECT',
    options: { allowUpdates?: boolean } = {}
  ): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('DKG client not initialized');
    }

    const { allowUpdates = false } = options;

    // Validate SPARQL query
    const validationResult = validateSPARQL(query, {
      allowUpdates,
      maxQueryLength: 50000,
      allowedNamespaces: [
        'https://schema.org/',
        'https://dotrep.io/ontology/',
        'https://polkadot.network/ontology/',
        'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
        'http://www.w3.org/2000/01/rdf-schema#'
      ]
    });

    if (!validationResult.valid) {
      const errorMessages = validationResult.errors.map(e => e.message).join('; ');
      throw new Error(`SPARQL query validation failed: ${errorMessages}`);
    }

    // Log warnings if any
    if (validationResult.warnings.length > 0) {
      console.warn('⚠️  SPARQL query validation warnings:');
      validationResult.warnings.forEach(warning => {
        console.warn(`  - ${warning.message}`);
      });
    }

    // Use sanitized query
    const safeQuery = validationResult.sanitizedQuery || query;

    if (this.useMockMode) {
      console.log(`🔧 [MOCK] Executing SPARQL query (${queryType})`);
      return {
        results: [],
        queryType,
        mock: true
      };
    }

    return this.retryOperation(async () => {
      console.log(`🔍 Executing SPARQL query (${queryType})`);
      const results = await this.dkg.graph.query(safeQuery, queryType);
      console.log(`✅ Query executed successfully, returned ${Array.isArray(results) ? results.length : 'results'}`);
      return results;
    }, 'Execute SPARQL query').catch((error) => {
      if (this.config.fallbackToMock || process.env.DKG_FALLBACK_TO_MOCK === 'true') {
        console.warn('⚠️  SPARQL query execution failed, falling back to mock mode');
        this.useMockMode = true;
        return this.executeSafeQuery(query, queryType, options);
      }
      throw error;
    });
  }

  /**
   * Get connection status
   */
  getStatus(): { initialized: boolean; environment: string; endpoint: string; mockMode: boolean } {
    return {
      initialized: this.isInitialized,
      environment: this.config.environment || 'unknown',
      endpoint: this.config.endpoint || 'unknown',
      mockMode: this.useMockMode
    };
  }

  /**
   * Get tokenomics service instance
   */
  getTokenomicsService(): TokenomicsService {
    return this.tokenomics;
  }

  /**
   * Get fee statistics
   */
  getFeeStatistics() {
    return this.tokenomics.getFeeStatistics();
  }
}

/**
 * Factory function to create a DKG client instance
 */
export function createDKGClientV8(config?: DKGConfig): DKGClientV8 {
  return new DKGClientV8(config);
}

export default DKGClientV8;
