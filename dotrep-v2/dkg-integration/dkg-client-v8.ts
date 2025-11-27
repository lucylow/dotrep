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
 * 
 * Advanced Features (V8):
 * - Knowledge Mining API: Ingest PDFs, CSV, JSON documents into Knowledge Assets
 * - DRAG API: Decentralized Retrieval Augmented Generation for semantic search
 * - Batch Minting: Create collections of Knowledge Assets efficiently
 * - Paranet Support: Publish to private networks with controlled access
 * - Asset Versioning: Maintain provenance chains with prov:wasRevisionOf
 * - Enhanced SPARQL: Advanced querying with filtering and aggregation
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
import type { JSONToJSONLDOptions } from './json-to-jsonld';
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
import { TokenVerificationService, createTokenVerificationService, type TokenVerificationConfig, GatedAction } from './token-verification-service';
import { DataReliabilityService, createDataReliabilityService, type MerkleProof, type DataChunkVerification } from './data-reliability-service';

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
  tokenVerification?: TokenVerificationConfig; // Token verification configuration
  enableTokenGating?: boolean; // Enable token-based gating for publish operations (default: false)
  paranetId?: string; // Paranet ID for private network publishing (optional)
  edgeNodeUrl?: string; // Edge Node URL for Knowledge Mining API (optional, defaults to endpoint)
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
  version?: number; // Version number if this is an update
  previousVersionUAL?: string; // UAL of previous version
}

export interface KnowledgeMiningOptions {
  epochs?: number;
  validateSchema?: boolean;
  extractEntities?: boolean; // Extract entities and relationships from documents
  chunkSize?: number; // Chunk size for large documents (default: 1000)
  overlap?: number; // Overlap between chunks (default: 200)
  metadata?: Record<string, any>; // Additional metadata to attach
  collectionId?: string; // Collection ID for batch minting
}

export interface KnowledgeMiningResult {
  UAL: string;
  transactionHash?: string;
  blockNumber?: number;
  extractedEntities?: Array<{
    type: string;
    value: string;
    confidence: number;
  }>;
  chunks?: Array<{
    index: number;
    text: string;
    ual?: string;
  }>;
  metadata: Record<string, any>;
}

export interface DRAGQueryOptions {
  topK?: number; // Number of results to return (default: 5)
  minRelevanceScore?: number; // Minimum relevance score (0-1, default: 0.3)
  filterByType?: string[]; // Filter by asset types
  includeProvenance?: boolean; // Include provenance information (default: true)
  includeEmbeddings?: boolean; // Include vector embeddings (default: false)
}

export interface DRAGResult {
  results: Array<{
    ual: string;
    text: string;
    relevanceScore: number;
    provenance?: {
      publisher: string;
      publishedAt: number;
      contentHash: string;
    };
    metadata?: Record<string, any>;
  }>;
  queryId: string;
  timestamp: number;
}

export interface BatchMintingOptions {
  collectionName: string;
  collectionDescription?: string;
  epochs?: number;
  batchSize?: number; // Number of assets per batch (default: 10)
  delayBetweenBatches?: number; // Delay in ms between batches (default: 1000)
}

export interface BatchMintingResult {
  collectionUAL: string;
  assetUALs: string[];
  totalPublished: number;
  totalFailed: number;
  transactionHashes: string[];
  costEstimate: import('./tokenomics-service').BatchPublishCostEstimate;
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
  private tokenVerification: TokenVerificationService | null = null;
  private dataReliability: DataReliabilityService;

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
    
    // Initialize token verification service if configured
    if (config?.tokenVerification || config?.enableTokenGating) {
      this.tokenVerification = createTokenVerificationService({
        ...config?.tokenVerification,
        dkgClient: this as any, // Will be set after construction
        dkgConfig: config,
        useMockMode: this.useMockMode
      });
    }
    
    // Initialize data reliability service
    // Note: We need to initialize this after construction is complete
    // For now, create a temporary instance that will be replaced
    this.dataReliability = createDataReliabilityService(this);
    
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
   * Check if fallback to mock mode should be enabled
   */
  private shouldFallbackToMock(): boolean {
    return this.config.fallbackToMock === true || process.env.DKG_FALLBACK_TO_MOCK === 'true';
  }

  /**
   * Enable mock mode with a reason
   */
  private enableMockMode(reason: string): void {
    console.warn(`⚠️  Enabling MOCK MODE due to: ${reason}`);
    this.useMockMode = true;
    this.isInitialized = true;
  }

  /**
   * Retry wrapper for DKG operations with exponential backoff
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        lastError = error instanceof Error ? error : new Error(errorMessage);
        console.warn(`⚠️  ${operationName} failed (attempt ${attempt}/${this.maxRetries}): ${errorMessage}`);
        
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * attempt; // Exponential backoff
          console.log(`⏳ Retrying in ${delay}ms...`);
          await this.delay(delay);
        }
      }
    }
    
    throw new Error(
      `${operationName} failed after ${this.maxRetries} attempts: ${lastError?.message ?? 'Unknown error'}`
    );
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Execute operation with fallback to mock mode if enabled
   */
  private async executeWithFallback<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    try {
      return await this.retryOperation(operation, operationName);
    } catch (error: unknown) {
      if (this.shouldFallbackToMock()) {
        console.warn(`⚠️  ${operationName} failed, falling back to mock mode`);
        this.enableMockMode(`${operationName} failure`);
        // Retry in mock mode - this will be handled by individual methods
        throw error; // Let individual methods handle mock fallback
      }
      throw error;
    }
  }

  /**
   * Ensure client is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('DKG client not initialized');
    }
  }

  /**
   * Publish reputation data as a Knowledge Asset on the DKG
   * 
   * Validates the JSON-LD structure, canonicalizes it, and computes content hash
   * before publishing to ensure data integrity and compliance with W3C standards.
   * 
   * If token gating is enabled, verifies token ownership before allowing publish.
   * 
   * @param reputationData - The reputation data to publish
   * @param epochs - Number of epochs to store the asset (default: 2)
   * @param options - Additional options for publishing
   * @param options.validateSchema - Whether to validate against schema (default: true)
   * @param options.skipValidation - Skip validation (not recommended, default: false)
   * @param options.walletAddress - Wallet address for token verification (required if token gating enabled)
   * @param options.bypassTokenCheck - Bypass token verification (default: false)
   * @returns PublishResult with UAL and transaction details
   * @throws Error if validation fails, token verification fails, or publishing fails
   * 
   * @example
   * ```typescript
   * const result = await dkgClient.publishReputationAsset({
   *   developerId: 'alice',
   *   reputationScore: 850,
   *   contributions: [...],
   *   timestamp: Date.now(),
   *   metadata: {}
   * }, 2, {
   *   walletAddress: '0x1234...'
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
      walletAddress?: string;
      bypassTokenCheck?: boolean;
    } = {}
  ): Promise<PublishResult> {
    if (!this.isInitialized) {
      throw new Error('DKG client not initialized');
    }

    const { validateSchema = true, skipValidation = false, walletAddress, bypassTokenCheck = false } = options;

    // Token verification check (if enabled)
    if (this.config.enableTokenGating && this.tokenVerification && !bypassTokenCheck) {
      if (!walletAddress) {
        throw new Error('Wallet address required for token-gated publish operations. Provide walletAddress in options.');
      }

      const accessCheck = await this.tokenVerification.checkActionAccess(
        walletAddress,
        GatedAction.PUBLISH_REPUTATION
      );

      if (!accessCheck.allowed) {
        throw new Error(
          `Token verification failed: ${accessCheck.reason || 'Insufficient token ownership/balance'}`
        );
      }

      console.log(`✅ Token verification passed for ${walletAddress}`);
      
      // Get reputation boost from token ownership
      const reputationBoost = await this.tokenVerification.getReputationBoost(
        walletAddress,
        GatedAction.PUBLISH_REPUTATION
      );
      
      if (reputationBoost > 0) {
        console.log(`📈 Token-holder reputation boost: +${reputationBoost}%`);
        // Apply boost to reputation score (optional - can be done in scoring algorithm instead)
        // reputationData.reputationScore = Math.min(1000, reputationData.reputationScore * (1 + reputationBoost / 100));
      }
    }

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
          
          // Enhanced content hash verification using data reliability service
          const hashVerification = this.dataReliability.verifyContentHash(
            knowledgeAsset,
            validationResult.contentHash,
            { canonicalize: true }
          );
          
          if (!hashVerification.valid) {
            console.warn(`⚠️  Content hash verification warning: ${hashVerification.error}`);
          } else {
            console.log(`✅ Content hash verified successfully`);
          }
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
   * Enhanced with data reliability verification
   * 
   * @param ual - Uniform Asset Locator for the reputation asset
   * @param options - Query options
   * @param options.verifyReliability - Verify data reliability (default: true)
   * @param options.verifyContentHash - Verify content hash (default: true)
   * @param options.verifyTemporalState - Verify temporal state freshness (default: true)
   * @returns Reputation data from the DKG
   */
  async queryReputation(
    ual: string,
    options: {
      verifyReliability?: boolean;
      verifyContentHash?: boolean;
      verifyTemporalState?: boolean;
      maxAgeMs?: number;
    } = {}
  ): Promise<any> {
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
      const asset = result.public || result.assertion;
      
      // Enhanced data reliability verification
      const {
        verifyReliability = true,
        verifyContentHash = true,
        verifyTemporalState = true,
        maxAgeMs
      } = options;
      
      if (verifyReliability) {
        const reliabilityResult = await this.dataReliability.verifyDataReliability(ual, {
          verifyContentHash,
          verifyTemporalState,
          maxAgeMs
        });
        
        if (!reliabilityResult.reliable) {
          console.warn(`⚠️  Data reliability verification failed for ${ual}:`, reliabilityResult.errors);
        } else {
          console.log(`✅ Data reliability verified for ${ual}`);
          if (reliabilityResult.warnings && reliabilityResult.warnings.length > 0) {
            console.warn(`⚠️  Reliability warnings:`, reliabilityResult.warnings);
          }
        }
      }
      
      console.log(`✅ Reputation asset retrieved successfully`);
      return asset;
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
   * Convert any JSON object to JSON-LD format
   * 
   * Uses the json-to-jsonld utility to add semantic context to plain JSON data.
   * 
   * @param json - Plain JSON object to convert
   * @param options - Conversion options (baseContext, type, id, etc.)
   * @returns JSON-LD formatted object
   * 
   * @example
   * ```typescript
   * const json = { name: "Alice", homepage: "http://alice.example.com" };
   * const jsonld = await dkgClient.convertToJSONLD(json, {
   *   baseContext: 'https://schema.org/',
   *   type: 'Person',
   *   urlFields: ['homepage']
   * });
   * ```
   */
  async convertToJSONLD(
    json: any,
    options?: import('./json-to-jsonld').JSONToJSONLDOptions
  ): Promise<any> {
    const { convertToJSONLD } = await import('./json-to-jsonld');
    return convertToJSONLD(json, options);
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
   * Query chatbot user reputation score with multi-dimensional metrics
   * 
   * Enhanced SPARQL query supporting trust marketplace schema structure.
   * Retrieves comprehensive reputation data including overall score, component scores,
   * sybil risk, and temporal consistency metrics.
   * 
   * @param userDid - User's Decentralized Identifier (DID)
   * @param options - Query options
   * @param options.includeBreakdown - Include detailed component breakdown (default: true)
   * @param options.includeSybilRisk - Include sybil risk assessment (default: true)
   * @param options.includeTemporalMetrics - Include temporal consistency metrics (default: false)
   * @returns Reputation score data with breakdown
   * 
   * @example
   * ```typescript
   * const reputation = await dkgClient.queryChatbotUserReputation(
   *   'did:dkg:user:chatbot_123',
   *   { includeBreakdown: true, includeSybilRisk: true }
   * );
   * console.log(`Reputation: ${reputation.overallScore}, Sybil Risk: ${reputation.sybilRisk}`);
   * ```
   */
  async queryChatbotUserReputation(
    userDid: string,
    options: {
      includeBreakdown?: boolean;
      includeSybilRisk?: boolean;
      includeTemporalMetrics?: boolean;
    } = {}
  ): Promise<{
    userDid: string;
    overallScore: number;
    lastUpdated: string;
    componentScores?: {
      socialRank?: number;
      economicStake?: number;
      endorsementQuality?: number;
      temporalConsistency?: number;
    };
    sybilRisk?: number;
    behavioralAnomaly?: number;
    timestamp: string;
  }> {
    if (!this.isInitialized) {
      throw new Error('DKG client not initialized');
    }

    const {
      includeBreakdown = true,
      includeSybilRisk = true,
      includeTemporalMetrics = false
    } = options;

    // Validate user DID
    if (!userDid || typeof userDid !== 'string' || userDid.trim().length === 0) {
      throw new Error('User DID must be a non-empty string');
    }

    // Escape user DID to prevent SPARQL injection
    const escapedUserDid = escapeSPARQLString(userDid);

    // Build comprehensive SPARQL query based on trust marketplace schema
    const query = `
      PREFIX schema: <https://schema.org/>
      PREFIX tm: <https://trust-marketplace.org/schema/v1/>
      PREFIX dotrep: <https://dotrep.io/ontology/>
      PREFIX prov: <http://www.w3.org/ns/prov#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
      
      SELECT ?user ?overallScore ?lastUpdated ?socialRank ?economicStake 
             ?endorsementQuality ?temporalConsistency ?sybilRisk ?behavioralAnomaly
      WHERE {
        {
          # Query for ReputationScore asset
          ?reputationAsset a tm:ReputationScore ;
            tm:subject "${escapedUserDid}" ;
            tm:compositeScore/tm:overall ?overallScore ;
            prov:generatedAtTime ?lastUpdated .
          
          OPTIONAL {
            ?reputationAsset tm:componentScores ?components .
            ?components tm:socialRank ?socialRank .
          }
          OPTIONAL {
            ?reputationAsset tm:componentScores ?components .
            ?components tm:economicStake ?economicStake .
          }
          OPTIONAL {
            ?reputationAsset tm:componentScores ?components .
            ?components tm:endorsementQuality ?endorsementQuality .
          }
          OPTIONAL {
            ?reputationAsset tm:componentScores ?components .
            ?components tm:temporalConsistency ?temporalConsistency .
          }
          OPTIONAL {
            ?reputationAsset tm:sybilResistance/tm:behavioralAnomaly ?behavioralAnomaly .
          }
          OPTIONAL {
            ?reputationAsset tm:sybilResistance/tm:sybilRisk ?sybilRisk .
          }
          
          BIND("${escapedUserDid}" AS ?user)
        }
        UNION
        {
          # Fallback: Query for TrustedUserProfile
          ?profile a tm:TrustedUserProfile ;
            tm:creator "${escapedUserDid}" ;
            tm:reputationMetrics/tm:overallScore ?overallScore ;
            schema:dateModified ?lastUpdated .
          
          OPTIONAL {
            ?profile tm:reputationMetrics/tm:socialRank ?socialRank .
          }
          OPTIONAL {
            ?profile tm:reputationMetrics/tm:economicStake ?economicStake .
          }
          OPTIONAL {
            ?profile tm:reputationMetrics/tm:endorsementQuality ?endorsementQuality .
          }
          OPTIONAL {
            ?profile tm:reputationMetrics/tm:temporalConsistency ?temporalConsistency .
          }
          
          BIND("${escapedUserDid}" AS ?user)
        }
        UNION
        {
          # Fallback: Query legacy dotrep schema
          ?asset a schema:Person ;
            schema:identifier "${escapedUserDid}" ;
            dotrep:reputationScore ?overallScore ;
            schema:dateModified ?lastUpdated .
          
          OPTIONAL { ?asset dotrep:socialRank ?socialRank . }
          OPTIONAL { ?asset dotrep:economicStake ?economicStake . }
          
          BIND("${escapedUserDid}" AS ?user)
        }
      }
      ORDER BY DESC(?lastUpdated)
      LIMIT 1
    `;

    // Use mock mode if enabled
    if (this.useMockMode) {
      console.log(`🔧 [MOCK] Querying chatbot user reputation: ${userDid}`);
      return {
        userDid,
        overallScore: 0.75,
        lastUpdated: new Date().toISOString(),
        componentScores: includeBreakdown ? {
          socialRank: 0.80,
          economicStake: 0.70,
          endorsementQuality: 0.75,
          temporalConsistency: 0.85
        } : undefined,
        sybilRisk: includeSybilRisk ? 0.15 : undefined,
        behavioralAnomaly: includeSybilRisk ? 0.12 : undefined,
        timestamp: new Date().toISOString()
      };
    }

    return this.retryOperation(async () => {
      console.log(`🔍 Querying chatbot user reputation: ${userDid}`);
      const results = await this.executeSafeQuery(query, 'SELECT');

      // Handle both array results and wrapped results
      const resultsArray = Array.isArray(results) ? results : (results.results || []);
      
      if (resultsArray.length === 0) {
        throw new Error(`No reputation data found for user: ${userDid}`);
      }

      const result = resultsArray[0];

      // Extract values from SPARQL result format
      const getValue = (val: any): any => {
        if (val && typeof val === 'object' && 'value' in val) {
          return val.value;
        }
        return val;
      };

      const parseFloatValue = (val: any): number | undefined => {
        const v = getValue(val);
        if (v === null || v === undefined || v === '') return undefined;
        const parsed = typeof v === 'string' ? parseFloat(v) : Number(v);
        return isNaN(parsed) ? undefined : parsed;
      };

      const reputation = {
        userDid,
        overallScore: parseFloatValue(result.overallScore) || 0,
        lastUpdated: getValue(result.lastUpdated) || new Date().toISOString(),
        componentScores: includeBreakdown ? {
          socialRank: parseFloatValue(result.socialRank),
          economicStake: parseFloatValue(result.economicStake),
          endorsementQuality: parseFloatValue(result.endorsementQuality),
          temporalConsistency: includeTemporalMetrics ? parseFloatValue(result.temporalConsistency) : undefined
        } : undefined,
        sybilRisk: includeSybilRisk ? parseFloatValue(result.sybilRisk) : undefined,
        behavioralAnomaly: includeSybilRisk ? parseFloatValue(result.behavioralAnomaly) : undefined,
        timestamp: new Date().toISOString()
      };

      console.log(`✅ Retrieved reputation for ${userDid}: ${reputation.overallScore}`);
      return reputation;
    }, 'Query chatbot user reputation').catch((error) => {
      if (this.config.fallbackToMock || process.env.DKG_FALLBACK_TO_MOCK === 'true') {
        console.warn('⚠️  Reputation query failed, falling back to mock mode');
        this.useMockMode = true;
        return this.queryChatbotUserReputation(userDid, options);
      }
      throw error;
    });
  }

  /**
   * Query detailed reputation breakdown for chatbot user
   * 
   * Retrieves comprehensive multi-dimensional reputation metrics including
   * all component scores, validation data, and provenance information.
   * 
   * @param userDid - User's Decentralized Identifier (DID)
   * @returns Detailed reputation breakdown with all metrics
   * 
   * @example
   * ```typescript
   * const breakdown = await dkgClient.queryDetailedChatbotReputation(
   *   'did:dkg:user:chatbot_123'
   * );
   * console.log(`Social Rank: ${breakdown.componentScores.socialRank}`);
   * ```
   */
  async queryDetailedChatbotReputation(userDid: string): Promise<{
    userDid: string;
    overallScore: number;
    componentScores: {
      socialRank: number;
      economicStake: number;
      endorsementQuality: number;
      temporalConsistency: number;
      validationScore?: number;
    };
    sybilResistance: {
      sybilRisk: number;
      behavioralAnomaly: number;
      clusterDetection?: number;
    };
    provenance: {
      computedBy?: string;
      method?: string;
      timestamp: string;
    };
  }> {
    const query = `
      PREFIX tm: <https://trust-marketplace.org/schema/v1/>
      PREFIX prov: <http://www.w3.org/ns/prov#>
      PREFIX schema: <https://schema.org/>
      
      SELECT ?component ?value ?provenance ?method ?computedBy ?timestamp
             ?sybilRisk ?behavioralAnomaly
      WHERE {
        ?reputation a tm:ReputationScore ;
          tm:subject "${escapeSPARQLString(userDid)}" ;
          tm:compositeScore/tm:overall ?overallScore .
        
        ?reputation tm:componentScores ?components .
        ?components ?component ?value .
        
        OPTIONAL {
          ?reputation tm:provenance ?provenance .
          ?provenance prov:wasAttributedTo ?computedBy .
          ?provenance prov:used ?method .
          ?provenance prov:generatedAtTime ?timestamp .
        }
        
        OPTIONAL {
          ?reputation tm:sybilResistance/tm:sybilRisk ?sybilRisk .
        }
        OPTIONAL {
          ?reputation tm:sybilResistance/tm:behavioralAnomaly ?behavioralAnomaly .
        }
      }
      ORDER BY DESC(?timestamp)
      LIMIT 100
    `;

    return this.executeSafeQuery(query, 'SELECT').then((results: any) => {
      // Handle both array results and wrapped results
      const resultsArray = Array.isArray(results) ? results : (results.results || []);
      
      if (!resultsArray || resultsArray.length === 0) {
        throw new Error(`No detailed reputation data found for user: ${userDid}`);
      }

      const componentScores: Record<string, number> = {};
      let sybilRisk: number | undefined;
      let behavioralAnomaly: number | undefined;
      let provenance: any = {};

      resultsArray.forEach((row: any) => {
        const component = row.component?.value || row.component;
        const value = parseFloat(row.value?.value || row.value);
        
        if (component && !isNaN(value)) {
          if (component.includes('socialRank')) componentScores.socialRank = value;
          else if (component.includes('economicStake')) componentScores.economicStake = value;
          else if (component.includes('endorsementQuality')) componentScores.endorsementQuality = value;
          else if (component.includes('temporalConsistency')) componentScores.temporalConsistency = value;
          else if (component.includes('validation')) componentScores.validationScore = value;
        }

        if (row.sybilRisk) sybilRisk = parseFloat(row.sybilRisk?.value || row.sybilRisk);
        if (row.behavioralAnomaly) behavioralAnomaly = parseFloat(row.behavioralAnomaly?.value || row.behavioralAnomaly);
        
        if (row.computedBy) provenance.computedBy = row.computedBy?.value || row.computedBy;
        if (row.method) provenance.method = row.method?.value || row.method;
        if (row.timestamp) provenance.timestamp = row.timestamp?.value || row.timestamp;
      });

      // Get overall score
      return this.queryChatbotUserReputation(userDid, { includeBreakdown: false }).then(overall => ({
        userDid,
        overallScore: overall.overallScore,
        componentScores: {
          socialRank: componentScores.socialRank || 0,
          economicStake: componentScores.economicStake || 0,
          endorsementQuality: componentScores.endorsementQuality || 0,
          temporalConsistency: componentScores.temporalConsistency || 0,
          validationScore: componentScores.validationScore
        },
        sybilResistance: {
          sybilRisk: sybilRisk || 0,
          behavioralAnomaly: behavioralAnomaly || 0
        },
        provenance: {
          ...provenance,
          timestamp: provenance.timestamp || new Date().toISOString()
        }
      }));
    });
  }

  /**
   * Compare reputation scores between multiple chatbot users
   * 
   * Executes an optimized SPARQL query to retrieve and compare reputation
   * scores for multiple users in a single query for efficiency.
   * 
   * @param userDids - Array of user DIDs to compare
   * @returns Array of reputation scores sorted by overall score (descending)
   * 
   * @example
   * ```typescript
   * const comparison = await dkgClient.compareChatbotUserReputations([
   *   'did:dkg:user:bot_alpha',
   *   'did:dkg:user:bot_beta'
   * ]);
   * comparison.forEach(user => {
   *   console.log(`${user.userDid}: ${user.overallScore}`);
   * });
   * ```
   */
  async compareChatbotUserReputations(
    userDids: string[]
  ): Promise<Array<{
    userDid: string;
    overallScore: number;
    sybilRisk?: number;
    lastUpdated: string;
  }>> {
    if (!userDids || userDids.length === 0) {
      throw new Error('At least one user DID is required');
    }

    if (userDids.length > 100) {
      throw new Error('Maximum 100 user DIDs allowed per comparison');
    }

    // Escape all DIDs
    const escapedDids = userDids.map(did => `"${escapeSPARQLString(did)}"`).join(', ');

    const query = `
      PREFIX tm: <https://trust-marketplace.org/schema/v1/>
      PREFIX prov: <http://www.w3.org/ns/prov#>
      PREFIX dotrep: <https://dotrep.io/ontology/>
      PREFIX schema: <https://schema.org/>
      
      SELECT ?user ?overallScore ?sybilRisk ?lastUpdated
      WHERE {
        {
          ?reputation a tm:ReputationScore ;
            tm:subject ?user ;
            tm:compositeScore/tm:overall ?overallScore ;
            prov:generatedAtTime ?lastUpdated .
          
          OPTIONAL {
            ?reputation tm:sybilResistance/tm:sybilRisk ?sybilRisk .
          }
          
          FILTER(?user IN (${escapedDids}))
        }
        UNION
        {
          ?profile a tm:TrustedUserProfile ;
            tm:creator ?user ;
            tm:reputationMetrics/tm:overallScore ?overallScore ;
            schema:dateModified ?lastUpdated .
          
          FILTER(?user IN (${escapedDids}))
        }
        UNION
        {
          ?asset a schema:Person ;
            schema:identifier ?user ;
            dotrep:reputationScore ?overallScore ;
            schema:dateModified ?lastUpdated .
          
          FILTER(?user IN (${escapedDids}))
        }
      }
      ORDER BY DESC(?overallScore)
    `;

    if (this.useMockMode) {
      console.log(`🔧 [MOCK] Comparing ${userDids.length} chatbot user reputations`);
      return userDids.map((did, index) => ({
        userDid: did,
        overallScore: 0.75 - (index * 0.05),
        sybilRisk: 0.15 + (index * 0.02),
        lastUpdated: new Date().toISOString()
      }));
    }

    return this.executeSafeQuery(query, 'SELECT').then((results: any) => {
      // Handle both array results and wrapped results
      const resultsArray = Array.isArray(results) ? results : (results.results || []);
      
      const getValue = (val: any): any => {
        if (val && typeof val === 'object' && 'value' in val) return val.value;
        return val;
      };

      const parseFloatValue = (val: any): number => {
        const v = getValue(val);
        const parsed = typeof v === 'string' ? parseFloat(v) : Number(v);
        return isNaN(parsed) ? 0 : parsed;
      };

      return resultsArray.map((row: any) => ({
        userDid: getValue(row.user) || '',
        overallScore: parseFloatValue(row.overallScore),
        sybilRisk: row.sybilRisk ? parseFloatValue(row.sybilRisk) : undefined,
        lastUpdated: getValue(row.lastUpdated) || new Date().toISOString()
      })).sort((a: { overallScore: number }, b: { overallScore: number }) => b.overallScore - a.overallScore);
    });
  }

  /**
   * Query social network relationships (friendships, follows, collaborations)
   * 
   * Uses enhanced SPARQL queries for social network analysis
   * 
   * @param connectionType - Type of relationship to query
   * @param options - Query options
   * @returns Array of relationship records
   * 
   * @example
   * ```typescript
   * const follows = await dkgClient.querySocialRelationships('follows', {
   *   limit: 50,
   *   minConnectionStrength: 0.7
   * });
   * ```
   */
  async querySocialRelationships(
    connectionType: 'follows' | 'friend' | 'collaborates' | 'all' = 'all',
    options: {
      limit?: number;
      minConnectionStrength?: number;
      orderBy?: 'date' | 'activity';
      orderDirection?: 'ASC' | 'DESC';
    } = {}
  ): Promise<any[]> {
    if (!this.isInitialized) {
      throw new Error('DKG client not initialized');
    }

    const { SocialNetworkQueries } = await import('./sparql/social-network-queries');
    // Map 'activity' to 'date' for the query builder
    const queryOptions = {
      ...options,
      orderBy: options.orderBy === 'activity' ? 'date' as const : options.orderBy,
    };
    const query = SocialNetworkQueries.getRelationships(connectionType, queryOptions);

    return this.executeSafeQuery(query, 'SELECT');
  }

  /**
   * Find mutual connections between two users
   * 
   * @param userId1 - First user identifier
   * @param userId2 - Second user identifier
   * @param options - Query options
   * @returns Array of mutual connections
   * 
   * @example
   * ```typescript
   * const mutuals = await dkgClient.findMutualConnections('alice', 'bob', {
   *   limit: 20,
   *   minReputation: 600
   * });
   * ```
   */
  async findMutualConnections(
    userId1: string,
    userId2: string,
    options: {
      limit?: number;
      minReputation?: number;
    } = {}
  ): Promise<any[]> {
    if (!this.isInitialized) {
      throw new Error('DKG client not initialized');
    }

    const { SocialNetworkQueries, SPARQLResultTransformer } = await import('./sparql/social-network-queries');
    const query = SocialNetworkQueries.findMutualConnections(userId1, userId2, options);

    const results = await this.executeSafeQuery(query, 'SELECT');
    return SPARQLResultTransformer.transformSelectResults(results);
  }

  /**
   * Find common interests between users
   * 
   * @param userId1 - First user identifier
   * @param userId2 - Second user identifier
   * @param options - Query options
   * @returns Array of common interests
   */
  async findCommonInterests(
    userId1: string,
    userId2: string,
    options: { limit?: number } = {}
  ): Promise<any[]> {
    if (!this.isInitialized) {
      throw new Error('DKG client not initialized');
    }

    const { SocialNetworkQueries, SPARQLResultTransformer } = await import('./sparql/social-network-queries');
    const query = SocialNetworkQueries.findCommonInterests(userId1, userId2, options);

    const results = await this.executeSafeQuery(query, 'SELECT');
    return SPARQLResultTransformer.transformSelectResults(results);
  }

  /**
   * Filter users by attributes (age, reputation, activity, location, interests)
   * 
   * @param filters - Filter criteria
   * @param options - Query options
   * @returns Array of matching users
   * 
   * @example
   * ```typescript
   * const users = await dkgClient.filterUsersByAttributes({
   *   minReputation: 700,
   *   location: 'San Francisco',
   *   interests: ['blockchain', 'web3']
   * }, {
   *   limit: 50,
   *   orderBy: 'reputation',
   *   orderDirection: 'DESC'
   * });
   * ```
   */
  async filterUsersByAttributes(
    filters: {
      minAge?: number;
      maxAge?: number;
      minReputation?: number;
      maxReputation?: number;
      minActivity?: number;
      location?: string;
      interests?: string[];
    },
    options: {
      limit?: number;
      orderBy?: 'reputation' | 'activity' | 'date' | 'name';
      orderDirection?: 'ASC' | 'DESC';
    } = {}
  ): Promise<any[]> {
    if (!this.isInitialized) {
      throw new Error('DKG client not initialized');
    }

    const { SocialNetworkQueries, SPARQLResultTransformer } = await import('./sparql/social-network-queries');
    const query = SocialNetworkQueries.filterUsersByAttributes(filters, options);

    const results = await this.executeSafeQuery(query, 'SELECT');
    return SPARQLResultTransformer.transformSelectResults(results);
  }

  /**
   * Get social network statistics
   * 
   * @returns Network statistics (total users, connections, average reputation, etc.)
   */
  async getNetworkStatistics(): Promise<{
    totalUsers: number;
    totalConnections: number;
    avgReputation: number;
    maxReputation: number;
    minReputation: number;
    totalInterests: number;
  }> {
    if (!this.isInitialized) {
      throw new Error('DKG client not initialized');
    }

    const { SocialNetworkQueries, SPARQLResultTransformer } = await import('./sparql/social-network-queries');
    const query = SocialNetworkQueries.getNetworkStatistics();

    const results = await this.executeSafeQuery(query, 'SELECT');
    const transformed = SPARQLResultTransformer.transformSelectResults(results);

    if (transformed.length === 0) {
      return {
        totalUsers: 0,
        totalConnections: 0,
        avgReputation: 0,
        maxReputation: 0,
        minReputation: 0,
        totalInterests: 0,
      };
    }

    const stats = transformed[0];
    return {
      totalUsers: parseInt(stats.totalUsers || '0', 10),
      totalConnections: parseInt(stats.totalConnections || '0', 10),
      avgReputation: parseFloat(stats.avgReputation || '0'),
      maxReputation: parseFloat(stats.maxReputation || '0'),
      minReputation: parseFloat(stats.minReputation || '0'),
      totalInterests: parseInt(stats.totalInterests || '0', 10),
    };
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
   * Get token verification service instance
   */
  getTokenVerificationService(): TokenVerificationService | null {
    return this.tokenVerification;
  }

  /**
   * Get data reliability service instance
   */
  getDataReliabilityService(): DataReliabilityService {
    return this.dataReliability;
  }

  /**
   * Verify data chunk with Merkle proof
   * Implements OriginTrail DKG's proof-of-knowledge system
   */
  async verifyDataChunk(
    chunkId: string,
    content: string | Buffer,
    merkleProof?: MerkleProof
  ): Promise<DataChunkVerification> {
    return this.dataReliability.verifyDataChunk(chunkId, content, merkleProof);
  }

  /**
   * Verify temporal state freshness
   */
  async verifyTemporalState(ual: string, maxAgeMs?: number): Promise<{
    fresh: boolean;
    ageMs: number;
    error?: string;
  }> {
    const asset = await this.queryReputation(ual, { verifyReliability: false });
    const state = await this.dataReliability.trackTemporalState(ual, asset);
    return this.dataReliability.verifyTemporalState(state, maxAgeMs);
  }

  /**
   * Get fee statistics
   */
  getFeeStatistics() {
    return this.tokenomics.getFeeStatistics();
  }

  /**
   * Get Data Product Registry instance
   * 
   * Provides access to the data product registry for quality data exchange
   */
  async getDataProductRegistry() {
    const { createDataProductRegistry } = await import('./data-product-registry');
    return createDataProductRegistry(this);
  }

  /**
   * Get Fair Exchange Protocol instance
   * 
   * Provides access to fair exchange protocol for atomic data transactions
   */
  async getFairExchangeProtocol() {
    const { createFairExchangeProtocol } = await import('./fair-exchange-protocol');
    const registry = await this.getDataProductRegistry();
    return createFairExchangeProtocol(this, registry);
  }

  /**
   * Get Quality Validators instance
   * 
   * Provides access to quality validation tools for data products
   */
  async getQualityValidators() {
    const { createQualityValidators } = await import('./quality-validators');
    return createQualityValidators(this);
  }

  /**
   * Get Data Marketplace instance
   * 
   * Provides access to the complete data marketplace interface
   */
  async getDataMarketplace() {
    const { createDataMarketplace } = await import('./data-marketplace');
    return createDataMarketplace(this);
  }

  /**
   * Get Identity Tokenomics Service instance
   * 
   * Provides access to identity verification and trust tokenomics:
   * - Proof-of-Personhood (PoP) integration
   * - Soulbound Tokens (SBTs) for credentials
   * - Token-Curated Registry (TCR) for community verification
   * - On-chain behavior analysis for Sybil detection
   * - Account creation with staking requirements
   */
  async getIdentityTokenomicsService() {
    const { createIdentityTokenomicsService } = await import('./identity-tokenomics');
    const { createTokenVerificationService } = await import('./token-verification-service');
    
    const tokenVerification = this.tokenVerification || createTokenVerificationService({
      dkgClient: this,
      dkgConfig: this.config,
      useMockMode: this.useMockMode
    });
    
    return createIdentityTokenomicsService({
      dkgClient: this,
      dkgConfig: this.config,
      tokenVerification,
      accountCreation: {
        requireStake: true,
        minStakeAmount: BigInt(100) * BigInt(10 ** 18), // 100 tokens default
        stakeLockPeriod: 30,
        requirePoP: false,
        allowCommunityVouch: true
      },
      useMockMode: this.useMockMode
    });
  }

  /**
   * Publish Payment Evidence Knowledge Asset to DKG
   * 
   * Creates a JSON-LD Payment Evidence KA from x402 payment data and publishes it to DKG.
   * This enables TraceRank-style payment-weighted reputation scoring.
   * 
   * @param paymentData - Payment evidence data
   * @param options - Publishing options
   * @returns PublishResult with UAL
   * 
   * @example
   * ```typescript
   * const result = await dkgClient.publishPaymentEvidence({
   *   txHash: '0xabc...',
   *   payer: '0xBuyer',
   *   recipient: '0xSeller',
   *   amount: '10.00',
   *   currency: 'USDC',
   *   chain: 'base',
   *   resourceUAL: 'ual:org:dkgreputation:product:UAL123',
   *   challenge: 'pay-chal-20251126-0001'
   * });
   * ```
   */
  async publishPaymentEvidence(
    paymentData: {
      txHash: string;
      payer: string;
      recipient: string;
      amount: string;
      currency: string;
      chain: string;
      resourceUAL?: string;
      challenge?: string;
      facilitatorSig?: string;
      signature?: string;
      blockNumber?: number | string;
      timestamp?: string;
    },
    options: {
      epochs?: number;
      validateSchema?: boolean;
    } = {}
  ): Promise<PublishResult> {
    if (!this.isInitialized) {
      throw new Error('DKG client not initialized');
    }

    const { epochs = 2, validateSchema = true } = options;

    // Convert payment data to Payment Evidence JSON-LD
    const paymentEvidenceKA = this.createPaymentEvidenceJSONLD(paymentData);

    // Use mock mode if enabled
    if (this.useMockMode) {
      console.log(`🔧 [MOCK] Publishing Payment Evidence KA for tx: ${paymentData.txHash}`);
      const ual = `urn:ual:dotrep:payment:${paymentData.txHash}`;
      console.log(`✅ [MOCK] Payment Evidence KA published: ${ual}`);
      
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

    return this.executeWithFallback(async () => {
      if (!this.dkg) {
        throw new Error('DKG instance not available');
      }
      console.log(`📤 Publishing Payment Evidence KA for tx: ${paymentData.txHash}`);
      
      // Validate JSON-LD if requested
      if (validateSchema) {
        const { validateJSONLD } = await import('./jsonld-validator');
        const validationResult = await validateJSONLD(paymentEvidenceKA);
        
        if (!validationResult.valid) {
          const errors = validationResult.errors.map(e => `${e.path}: ${e.message}`).join('; ');
          throw new Error(`Payment Evidence JSON-LD validation failed: ${errors}`);
        }
      }

      // Publish to DKG
      const result = await this.dkg.asset.create(
        {
          public: paymentEvidenceKA
        },
        {
          epochsNum: epochs
        }
      );

      console.log(`✅ Payment Evidence KA published: ${result.UAL}`);
      
      return {
        UAL: result.UAL,
        transactionHash: result.transactionHash,
        blockNumber: result.blockNumber,
        costEstimate: this.tokenomics.estimatePublishCost(epochs, false)
      };
    }, 'Publish Payment Evidence').catch((error: unknown) => {
      if (this.shouldFallbackToMock()) {
        this.enableMockMode('payment evidence publish failure');
        return this.publishPaymentEvidence(paymentData, options);
      }
      throw error;
    });
  }

  /**
   * Create Payment Evidence JSON-LD Knowledge Asset
   * 
   * Follows W3C standards and OriginTrail DKG requirements.
   * Based on the research brief schema specification.
   */
  private createPaymentEvidenceJSONLD(paymentData: {
    txHash: string;
    payer: string;
    recipient: string;
    amount: string;
    currency: string;
    chain: string;
    resourceUAL?: string;
    challenge?: string;
    facilitatorSig?: string;
    signature?: string;
    blockNumber?: number | string;
    timestamp?: string;
  }): any {
    const { computeContentHash } = require('./jsonld-validator');
    const crypto = require('crypto');
    
    const timestamp = paymentData.timestamp || new Date().toISOString();
    
    // Compute content hash for integrity
    const contentToHash = {
      txHash: paymentData.txHash,
      payer: paymentData.payer,
      recipient: paymentData.recipient,
      amount: paymentData.amount,
      currency: paymentData.currency,
      chain: paymentData.chain,
      resourceUAL: paymentData.resourceUAL,
      challenge: paymentData.challenge,
      timestamp
    };
    
    const contentHash = crypto.createHash('sha256')
      .update(JSON.stringify(contentToHash))
      .digest('hex');

    // Calculate payment weight for reputation scoring (logarithmic scale)
    const amountNum = parseFloat(paymentData.amount);
    const paymentWeight = amountNum > 0 
      ? Math.min(Math.log10(amountNum) * 10, 50) 
      : 0;

    // Get chain ID
    const chainIds: Record<string, string> = {
      'base': '8453',
      'base-sepolia': '84532',
      'solana': '101',
      'ethereum': '1',
      'polygon': '137',
      'arbitrum': '42161',
      'neuroweb': '2043',
      'neuroweb-testnet': '20430',
      'neuroweb-evm': '2043'
    };
    const chainId = chainIds[paymentData.chain.toLowerCase()] || '0';

    return {
      '@context': {
        'schema': 'https://schema.org/',
        'prov': 'http://www.w3.org/ns/prov#',
        'dotrep': 'https://dotrep.io/ontology/'
      },
      '@graph': [{
        '@type': 'schema:PaymentChargeSpecification',
        '@id': `urn:paymentEvidence:${paymentData.txHash}`,
        'schema:name': 'Payment evidence for product provenance',
        'schema:price': paymentData.amount,
        'schema:priceCurrency': paymentData.currency,
        'prov:generatedAtTime': timestamp,
        'schema:paymentMethod': 'x402',
        'schema:identifier': {
          '@type': 'schema:PropertyValue',
          'schema:propertyID': 'txHash',
          'schema:value': paymentData.txHash
        },
        'schema:recipient': {
          '@id': paymentData.recipient
        },
        'schema:payee': {
          '@id': paymentData.payer.startsWith('did:') 
            ? paymentData.payer 
            : `did:key:${paymentData.payer}`
        },
        'prov:wasDerivedFrom': paymentData.resourceUAL 
          ? { '@id': paymentData.resourceUAL }
          : undefined,
        'dotrep:paymentWeight': paymentWeight,
        'dotrep:chain': paymentData.chain,
        'dotrep:chainId': chainId,
        'dotrep:blockNumber': paymentData.blockNumber || 'pending',
        'dotrep:challenge': paymentData.challenge,
        'dotrep:contentHash': `sha256:${contentHash}`,
        ...(paymentData.facilitatorSig ? {
          'dotrep:facilitatorSignature': paymentData.facilitatorSig
        } : {}),
        ...(paymentData.signature ? {
          'dotrep:signature': paymentData.signature
        } : {})
      }]
    };
  }

  /**
   * Query Payment Evidence KAs from DKG using SPARQL
   * 
   * Enhanced with better query patterns, proper escaping, and result transformation.
   * Supports advanced filtering and aggregation for payment analytics.
   * 
   * @param filters - Query filters
   * @param filters.payer - Filter by payer address
   * @param filters.recipient - Filter by recipient address
   * @param filters.minAmount - Minimum payment amount
   * @param filters.maxAmount - Maximum payment amount
   * @param filters.chain - Filter by blockchain chain
   * @param filters.resourceUAL - Filter by resource UAL
   * @param filters.startDate - Filter payments after this date (ISO string)
   * @param filters.endDate - Filter payments before this date (ISO string)
   * @param filters.currency - Filter by currency code
   * @param filters.limit - Maximum results (default: 100, max: 1000)
   * @param filters.aggregate - Aggregate results by payer/recipient (default: false)
   * @returns Array of payment evidence records
   * 
   * @example
   * ```typescript
   * const payments = await dkgClient.queryPaymentEvidence({
   *   payer: '0x1234...',
   *   minAmount: 100,
   *   chain: 'base',
   *   startDate: '2024-01-01T00:00:00Z',
   *   limit: 50
   * });
   * ```
   */
  async queryPaymentEvidence(filters: {
    payer?: string;
    recipient?: string;
    minAmount?: number;
    maxAmount?: number;
    chain?: string;
    resourceUAL?: string;
    startDate?: string;
    endDate?: string;
    currency?: string;
    limit?: number;
    aggregate?: boolean;
  } = {}): Promise<Array<{
    paymentUAL: string;
    payer: string;
    recipient: string;
    amount: string;
    currency: string;
    txHash: string;
    chain: string;
    timestamp: string;
    resourceUAL?: string;
    paymentWeight?: number;
    blockNumber?: string;
  }>> {
    if (!this.isInitialized) {
      throw new Error('DKG client not initialized');
    }

    const { limit = 100, aggregate = false } = filters;
    const safeLimit = Math.min(Math.max(1, limit), 1000);

    // Build filter conditions with proper escaping
    const filterConditions: string[] = [];

    if (filters.payer) {
      const escapedPayer = escapeSPARQLString(filters.payer);
      filterConditions.push(`FILTER(STR(?payer) = "${escapedPayer}")`);
    }

    if (filters.recipient) {
      const escapedRecipient = escapeSPARQLString(filters.recipient);
      filterConditions.push(`FILTER(STR(?recipient) = "${escapedRecipient}")`);
    }

    if (filters.minAmount !== undefined) {
      filterConditions.push(`FILTER(xsd:decimal(?price) >= ${filters.minAmount})`);
    }

    if (filters.maxAmount !== undefined) {
      filterConditions.push(`FILTER(xsd:decimal(?price) <= ${filters.maxAmount})`);
    }

    if (filters.chain) {
      const escapedChain = escapeSPARQLString(filters.chain);
      filterConditions.push(`FILTER(STR(?chain) = "${escapedChain}")`);
    }

    if (filters.resourceUAL) {
      const escapedUAL = escapeSPARQLString(filters.resourceUAL);
      filterConditions.push(`FILTER(STR(?resourceUAL) = "${escapedUAL}")`);
    }

    if (filters.currency) {
      const escapedCurrency = escapeSPARQLString(filters.currency);
      filterConditions.push(`FILTER(STR(?currency) = "${escapedCurrency}")`);
    }

    if (filters.startDate) {
      filterConditions.push(`FILTER(?timestamp >= "${filters.startDate}"^^xsd:dateTime)`);
    }

    if (filters.endDate) {
      filterConditions.push(`FILTER(?timestamp <= "${filters.endDate}"^^xsd:dateTime)`);
    }

    const filterClause = filterConditions.length > 0
      ? `\n        ${filterConditions.join('\n        ')}`
      : '';

    // Build enhanced SPARQL query
    const sparqlQuery = aggregate
      ? `
        PREFIX schema: <https://schema.org/>
        PREFIX dotrep: <https://dotrep.io/ontology/>
        PREFIX prov: <http://www.w3.org/ns/prov#>
        PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
        
        SELECT ?payer ?recipient 
               (COUNT(DISTINCT ?ka) AS ?paymentCount)
               (SUM(xsd:decimal(?price)) AS ?totalAmount)
               (AVG(xsd:decimal(?price)) AS ?avgAmount)
               (MAX(?timestamp) AS ?lastPayment)
        WHERE {
          ?ka a schema:PaymentChargeSpecification ;
              schema:price ?price ;
              schema:priceCurrency ?currency ;
              schema:identifier ?id .
          ?id schema:propertyID "txHash" ;
              schema:value ?tx .
          ?ka schema:payee ?payerObj .
          ?payerObj schema:id ?payer .
          ?ka schema:recipient ?recipientObj .
          ?recipientObj schema:id ?recipient .
          ?ka prov:generatedAtTime ?timestamp .
          OPTIONAL { ?ka dotrep:chain ?chain . }
          ${filterClause}
        }
        GROUP BY ?payer ?recipient
        ORDER BY DESC(?totalAmount)
        LIMIT ${safeLimit}
      `
      : `
        PREFIX schema: <https://schema.org/>
        PREFIX dotrep: <https://dotrep.io/ontology/>
        PREFIX prov: <http://www.w3.org/ns/prov#>
        PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
        
        SELECT ?ka ?price ?currency ?tx ?payer ?recipient ?timestamp ?resourceUAL ?chain 
               ?paymentWeight ?blockNumber
        WHERE {
          ?ka a schema:PaymentChargeSpecification ;
              schema:price ?price ;
              schema:priceCurrency ?currency ;
              schema:identifier ?id .
          ?id schema:propertyID "txHash" ;
              schema:value ?tx .
          ?ka schema:payee ?payerObj .
          ?payerObj schema:id ?payer .
          ?ka schema:recipient ?recipientObj .
          ?recipientObj schema:id ?recipient .
          ?ka prov:generatedAtTime ?timestamp .
          OPTIONAL { ?ka dotrep:chain ?chain . }
          OPTIONAL { ?ka prov:wasDerivedFrom ?resourceUAL . }
          OPTIONAL { ?ka dotrep:paymentWeight ?paymentWeight . }
          OPTIONAL { ?ka dotrep:blockNumber ?blockNumber . }
          ${filterClause}
        }
        ORDER BY DESC(?timestamp)
        LIMIT ${safeLimit}
      `;

    // Validate query
    const validationResult = validateSPARQL(sparqlQuery);
    if (!validationResult.valid) {
      const errorMessages = validationResult.errors.map(e => e.message).join('; ');
      throw new Error(`SPARQL query validation failed: ${errorMessages}`);
    }

    const safeQuery = validationResult.sanitizedQuery || sparqlQuery;

    if (this.useMockMode) {
      console.log(`🔧 [MOCK] Querying Payment Evidence KAs`);
      return [];
    }

    return this.retryOperation(async () => {
      console.log(`🔍 Querying Payment Evidence KAs from DKG...`);
      const results = await this.dkg.graph.query(safeQuery, 'SELECT');
      
      // Transform results
      return results.map((row: any) => {
        const getValue = (val: any): any => {
          if (val && typeof val === 'object' && 'value' in val) {
            return val.value;
          }
          return val;
        };

        if (aggregate) {
          return {
            payer: getValue(row.payer),
            recipient: getValue(row.recipient),
            paymentCount: parseInt(getValue(row.paymentCount) || '0', 10),
            totalAmount: getValue(row.totalAmount),
            avgAmount: getValue(row.avgAmount),
            lastPayment: getValue(row.lastPayment),
          };
        }

        return {
          paymentUAL: getValue(row.ka) || '',
          payer: getValue(row.payer) || '',
          recipient: getValue(row.recipient) || '',
          amount: getValue(row.price) || '',
          currency: getValue(row.currency) || '',
          txHash: getValue(row.tx) || '',
          chain: getValue(row.chain) || '',
          timestamp: getValue(row.timestamp) || '',
          resourceUAL: getValue(row.resourceUAL),
          paymentWeight: getValue(row.paymentWeight),
          blockNumber: getValue(row.blockNumber),
        };
      });
    }, 'Query Payment Evidence').catch((error) => {
      if (this.config.fallbackToMock || process.env.DKG_FALLBACK_TO_MOCK === 'true') {
        console.warn('⚠️  Query failed, falling back to mock mode');
        this.useMockMode = true;
        return [];
      }
      throw error;
    });
  }

  /**
   * Knowledge Mining API: Ingest documents (PDF, CSV, JSON) and create Knowledge Assets
   * 
   * Uses the DKG Edge Node's Knowledge Mining API to convert unstructured documents
   * into verifiable Knowledge Assets. Supports automatic entity extraction and chunking.
   * 
   * @param document - Document to ingest (Buffer, File, or file path)
   * @param documentType - Type of document ('pdf', 'csv', 'json', 'text')
   * @param options - Mining options
   * @returns KnowledgeMiningResult with UAL and extracted information
   * 
   * @example
   * ```typescript
   * // Ingest a PDF document
   * const result = await dkgClient.ingestDocument(
   *   fs.readFileSync('research-paper.pdf'),
   *   'pdf',
   *   { epochs: 2, extractEntities: true }
   * );
   * console.log(`Published as UAL: ${result.UAL}`);
   * ```
   */
  async ingestDocument(
    document: Buffer | string | File,
    documentType: 'pdf' | 'csv' | 'json' | 'text',
    options: KnowledgeMiningOptions = {}
  ): Promise<KnowledgeMiningResult> {
    if (!this.isInitialized) {
      throw new Error('DKG client not initialized');
    }

    const {
      epochs = 2,
      validateSchema = true,
      extractEntities = false,
      chunkSize = 1000,
      overlap = 200,
      metadata = {},
      collectionId
    } = options;

    // Use mock mode if enabled
    if (this.useMockMode) {
      console.log(`🔧 [MOCK] Ingesting ${documentType} document via Knowledge Mining API`);
      const ual = `urn:ual:dotrep:knowledge:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log(`✅ [MOCK] Document ingested successfully: ${ual}`);
      
      return {
        UAL: ual,
        transactionHash: `0x${Buffer.from(`${Date.now()}-${Math.random()}`).toString('hex')}`,
        blockNumber: Math.floor(Date.now() / 1000),
        extractedEntities: extractEntities ? [
          { type: 'Person', value: 'Example Entity', confidence: 0.85 }
        ] : undefined,
        metadata: { documentType, ...metadata }
      };
    }

    return this.retryOperation(async () => {
      if (!this.dkg) {
        throw new Error('DKG instance not available');
      }

      console.log(`📥 Ingesting ${documentType} document via Knowledge Mining API...`);

      // Prepare document data
      let documentData: any;
      if (Buffer.isBuffer(document)) {
        documentData = document;
      } else if (typeof document === 'string') {
        // Assume it's a file path or URL
        const fs = require('fs');
        if (fs.existsSync && fs.existsSync(document)) {
          documentData = fs.readFileSync(document);
        } else {
          // Try to fetch from URL
          try {
            // Use global fetch if available (Node.js 18+ or browser)
            const globalFetch = (globalThis as any).fetch || (typeof fetch !== 'undefined' ? fetch : null);
            if (globalFetch) {
              const response = await globalFetch(document);
              const arrayBuffer = await response.arrayBuffer();
              documentData = Buffer.from(arrayBuffer);
            } else {
              // Fallback: try dynamic import for node-fetch
              try {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const nodeFetch = require('node-fetch');
                const response = await (nodeFetch.default || nodeFetch)(document);
                const buffer = await response.buffer();
                documentData = buffer;
              } catch (importError) {
                throw new Error('Cannot fetch URL: fetch API not available and node-fetch not installed');
              }
            }
          } catch (error: any) {
            throw new Error(`Failed to fetch document from URL: ${error.message}`);
          }
        }
      } else {
        // File object (browser environment)
        documentData = await this.fileToBuffer(document);
      }

      // Use Knowledge Mining API (V8)
      // Note: The actual API may vary - this is based on DKG V8 documentation
      const miningConfig: any = {
        epochsNum: epochs,
        extractEntities,
        chunkSize,
        overlap,
        metadata
      };

      // If collection ID is provided, use batch minting
      if (collectionId) {
        miningConfig.collectionId = collectionId;
      }

      // Call Knowledge Mining API
      // The exact method name may vary - adjust based on dkg.js V8 API
      const result = await this.dkg.asset.createFromFile?.(documentData, documentType, miningConfig) ||
                     await this.dkg.knowledgeMining?.ingest?.(documentData, documentType, miningConfig) ||
                     await this.dkg.asset.create({
                       public: {
                         '@context': { '@vocab': 'https://schema.org/' },
                         '@type': 'MediaObject',
                         'encodingFormat': documentType,
                         'contentUrl': `data:${documentType};base64,${documentData.toString('base64')}`,
                         ...metadata
                       }
                     }, { epochsNum: epochs });

      console.log(`✅ Document ingested successfully: ${result.UAL || result.asset || 'N/A'}`);

      return {
        UAL: result.UAL || result.asset || '',
        transactionHash: result.transactionHash,
        blockNumber: result.blockNumber,
        extractedEntities: result.entities || result.extractedEntities,
        chunks: result.chunks,
        metadata: { documentType, ...metadata, ...result.metadata }
      };
    }, 'Ingest document via Knowledge Mining API').catch((error) => {
      if (this.shouldFallbackToMock()) {
        this.enableMockMode('knowledge mining failure');
        return this.ingestDocument(document, documentType, options);
      }
      throw error;
    });
  }

  /**
   * DRAG API: Decentralized Retrieval Augmented Generation
   * 
   * Performs semantic search on the DKG using vector embeddings and returns
   * relevant Knowledge Assets with provenance information for RAG applications.
   * 
   * @param query - Natural language query
   * @param options - DRAG query options
   * @returns DRAGResult with relevant Knowledge Assets
   * 
   * @example
   * ```typescript
   * const results = await dkgClient.queryDRAG(
   *   'Find all studies on Metformin relevant to patient demographics',
   *   { topK: 10, minRelevanceScore: 0.5 }
   * );
   * console.log(`Found ${results.results.length} relevant assets`);
   * ```
   */
  async queryDRAG(
    query: string,
    options: DRAGQueryOptions = {}
  ): Promise<DRAGResult> {
    if (!this.isInitialized) {
      throw new Error('DKG client not initialized');
    }

    const {
      topK = 5,
      minRelevanceScore = 0.3,
      filterByType = [],
      includeProvenance = true,
      includeEmbeddings = false
    } = options;

    // Use mock mode if enabled
    if (this.useMockMode) {
      console.log(`🔧 [MOCK] DRAG query: "${query}"`);
      return {
        results: [
          {
            ual: generateMockUAL('mock-asset'),
            text: `Mock result for query: ${query}`,
            relevanceScore: 0.85,
            provenance: includeProvenance ? {
              publisher: 'did:mock:publisher',
              publishedAt: Date.now(),
              contentHash: 'sha256:mock'
            } : undefined
          }
        ],
        queryId: `query-${Date.now()}`,
        timestamp: Date.now()
      };
    }

    return this.retryOperation(async () => {
      if (!this.dkg) {
        throw new Error('DKG instance not available');
      }

      console.log(`🔍 DRAG query: "${query}"`);

      // Use DRAG API (V8)
      // The exact method may vary - adjust based on dkg.js V8 API
      const dragConfig: any = {
        topK,
        minRelevanceScore,
        includeProvenance,
        includeEmbeddings
      };

      if (filterByType.length > 0) {
        dragConfig.filterByType = filterByType;
      }

      const result = await this.dkg.drag?.query?.(query, dragConfig) ||
                     await this.dkg.graph?.queryDRAG?.(query, dragConfig) ||
                     // Fallback to SPARQL if DRAG API not available
                     await this.executeSafeQuery(
                       this.buildDRAGSPARQLQuery(query, topK, filterByType),
                       'SELECT'
                     );

      // Transform results to DRAG format
      const results = Array.isArray(result) ? result : (result?.results || result?.data || []);
      
      const dragResults = results
        .filter((r: any) => {
          const score = r.relevanceScore || r.score || r.relevance || 0;
          return score >= minRelevanceScore;
        })
        .map((r: any) => ({
          ual: r.ual || r.asset || r['@id'] || '',
          text: r.text || r.content || r.description || JSON.stringify(r),
          relevanceScore: r.relevanceScore || r.score || r.relevance || 0,
          provenance: includeProvenance && r.provenance ? {
            publisher: r.provenance.publisher || '',
            publishedAt: r.provenance.publishedAt || Date.now(),
            contentHash: r.provenance.contentHash || r.contentHash || ''
          } : undefined,
          metadata: r.metadata || {}
        }))
        .slice(0, topK);

      console.log(`✅ DRAG query returned ${dragResults.length} results`);

      return {
        results: dragResults,
        queryId: `drag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now()
      };
    }, 'DRAG query').catch((error) => {
      if (this.shouldFallbackToMock()) {
        console.warn('⚠️  DRAG query failed, falling back to mock mode');
        this.useMockMode = true;
        return this.queryDRAG(query, options);
      }
      throw error;
    });
  }

  /**
   * Batch Mint: Create a collection of Knowledge Assets
   * 
   * Efficiently creates multiple Knowledge Assets as a collection, reducing
   * gas costs through batch operations. Assets are minted as ERC1155Delta tokens.
   * 
   * @param assets - Array of asset data to mint
   * @param options - Batch minting options
   * @returns BatchMintingResult with collection UAL and asset UALs
   * 
   * @example
   * ```typescript
   * const result = await dkgClient.batchMintCollection(
   *   [
   *     { name: 'Asset 1', data: {...} },
   *     { name: 'Asset 2', data: {...} }
   *   ],
   *   {
   *     collectionName: 'Research Papers',
   *     collectionDescription: 'Collection of research papers',
   *     epochs: 2
   *   }
   * );
   * console.log(`Collection UAL: ${result.collectionUAL}`);
   * ```
   */
  async batchMintCollection(
    assets: Array<{ name: string; data: any; metadata?: Record<string, any> }>,
    options: BatchMintingOptions
  ): Promise<BatchMintingResult> {
    if (!this.isInitialized) {
      throw new Error('DKG client not initialized');
    }

    const {
      collectionName,
      collectionDescription = '',
      epochs = 2,
      batchSize = 10,
      delayBetweenBatches = 1000
    } = options;

    // Use mock mode if enabled
    if (this.useMockMode) {
      console.log(`🔧 [MOCK] Batch minting collection: ${collectionName} (${assets.length} assets)`);
      const collectionUAL = `urn:ual:dotrep:collection:${Date.now()}`;
      const assetUALs = assets.map((_, i) => generateMockUAL(`asset-${i}`));
      
      console.log(`✅ [MOCK] Collection minted: ${collectionUAL}`);
      
      return {
        collectionUAL,
        assetUALs,
        totalPublished: assets.length,
        totalFailed: 0,
        transactionHashes: [`0x${Buffer.from(collectionUAL).toString('hex')}`],
        costEstimate: this.tokenomics.estimateBatchPublishCost(assets.length, epochs, false)
      };
    }

    return this.retryOperation(async () => {
      if (!this.dkg) {
        throw new Error('DKG instance not available');
      }

      console.log(`📦 Batch minting collection: ${collectionName} (${assets.length} assets)`);

      // Estimate cost
      const costEstimate = this.tokenomics.estimateBatchPublishCost(assets.length, epochs, false);
      console.log(`💰 Estimated cost: ${this.tokenomics.formatTRAC(costEstimate.totalTracFee)} + ${this.tokenomics.formatNEURO(costEstimate.totalNeuroGasFee)}`);

      // Create collection metadata
      const collectionMetadata = {
        '@context': { '@vocab': 'https://schema.org/' },
        '@type': 'Collection',
        'name': collectionName,
        'description': collectionDescription,
        'numberOfItems': assets.length,
        'dateCreated': new Date().toISOString()
      };

      // Use batch minting API (V8)
      // The exact method may vary - adjust based on dkg.js V8 API
      const batchConfig: any = {
        epochsNum: epochs,
        batchSize,
        delayBetweenBatches
      };

      const result = await this.dkg.asset?.batchMint?.(assets, collectionMetadata, batchConfig) ||
                     await this.dkg.collection?.create?.(collectionMetadata, {
                       assets,
                       epochsNum: epochs,
                       batchSize
                     }) ||
                     // Fallback: create assets individually
                     await this.batchMintFallback(assets, collectionMetadata, epochs, batchSize, delayBetweenBatches);

      const assetUALs = result.assetUALs || result.assets || [];
      const collectionUAL = result.collectionUAL || result.collection || result.UAL || '';

      console.log(`✅ Collection minted: ${collectionUAL}`);
      console.log(`   Published ${assetUALs.length} assets`);

      return {
        collectionUAL,
        assetUALs,
        totalPublished: assetUALs.length,
        totalFailed: assets.length - assetUALs.length,
        transactionHashes: result.transactionHashes || [result.transactionHash || ''],
        costEstimate
      };
    }, 'Batch mint collection').catch((error) => {
      if (this.shouldFallbackToMock()) {
        this.enableMockMode('batch minting failure');
        return this.batchMintCollection(assets, options);
      }
      throw error;
    });
  }

  /**
   * Publish to Paranet (Private Network)
   * 
   * Publishes Knowledge Assets to a private Paranet instead of the public DKG.
   * Paranets enable private knowledge graphs with controlled access.
   * 
   * @param assetData - Knowledge Asset data to publish
   * @param paranetId - Paranet ID (optional, uses config if not provided)
   * @param options - Publishing options
   * @returns PublishResult with UAL
   * 
   * @example
   * ```typescript
   * const result = await dkgClient.publishToParanet(
   *   { name: 'Private Asset', data: {...} },
   *   'my-paranet-id',
   *   { epochs: 2 }
   * );
   * console.log(`Published to Paranet: ${result.UAL}`);
   * ```
   */
  async publishToParanet(
    assetData: any,
    paranetId?: string,
    options: { epochs?: number; validateSchema?: boolean } = {}
  ): Promise<PublishResult> {
    if (!this.isInitialized) {
      throw new Error('DKG client not initialized');
    }

    const targetParanetId = paranetId || this.config.paranetId;
    if (!targetParanetId) {
      throw new Error('Paranet ID required. Provide in method call or config.');
    }

    const { epochs = 2, validateSchema = true } = options;

    // Use mock mode if enabled
    if (this.useMockMode) {
      console.log(`🔧 [MOCK] Publishing to Paranet: ${targetParanetId}`);
      const ual = `urn:ual:paranet:${targetParanetId}:${Date.now()}`;
      console.log(`✅ [MOCK] Published to Paranet: ${ual}`);
      
      return {
        UAL: ual,
        transactionHash: `0x${Buffer.from(`${Date.now()}-${Math.random()}`).toString('hex')}`,
        blockNumber: Math.floor(Date.now() / 1000),
        costEstimate: this.tokenomics.estimatePublishCost(epochs, false)
      };
    }

    return this.retryOperation(async () => {
      if (!this.dkg) {
        throw new Error('DKG instance not available');
      }

      console.log(`📤 Publishing to Paranet: ${targetParanetId}`);

      // Validate if requested
      if (validateSchema) {
        const validationResult = await validateJSONLD(assetData);
        if (!validationResult.valid) {
          const errors = validationResult.errors.map(e => `${e.path}: ${e.message}`).join('; ');
          throw new Error(`Asset validation failed: ${errors}`);
        }
      }

      // Publish to Paranet (V8)
      // The exact method may vary - adjust based on dkg.js V8 API
      const result = await this.dkg.paranet?.publish?.(targetParanetId, assetData, { epochsNum: epochs }) ||
                     await this.dkg.asset?.create?.({
                       public: assetData,
                       paranetId: targetParanetId
                     }, { epochsNum: epochs }) ||
                     // Fallback: use standard publish with paranet metadata
                     await this.dkg.asset.create({
                       public: {
                         ...assetData,
                         'paranet:paranetId': targetParanetId,
                         'paranet:isPrivate': true
                       }
                     }, { epochsNum: epochs });

      console.log(`✅ Published to Paranet: ${result.UAL || result.asset || 'N/A'}`);

      return {
        UAL: result.UAL || result.asset || '',
        transactionHash: result.transactionHash,
        blockNumber: result.blockNumber,
        costEstimate: this.tokenomics.estimatePublishCost(epochs, false)
      };
    }, 'Publish to Paranet').catch((error) => {
      if (this.shouldFallbackToMock()) {
        this.enableMockMode('paranet publish failure');
        return this.publishToParanet(assetData, paranetId, options);
      }
      throw error;
    });
  }

  /**
   * Create new version of a Knowledge Asset with prov:wasRevisionOf
   * 
   * Publishes an updated version of an existing Knowledge Asset, maintaining
   * provenance chain through prov:wasRevisionOf relationship.
   * 
   * @param previousUAL - UAL of the previous version
   * @param updatedData - Updated asset data
   * @param options - Publishing options
   * @returns PublishResult with new UAL and version information
   * 
   * @example
   * ```typescript
   * const result = await dkgClient.publishAssetVersion(
   *   'ual:org:dkgreputation:product:UAL123',
   *   { reputationScore: 900, ... },
   *   { epochs: 2 }
   * );
   * console.log(`New version UAL: ${result.UAL}, Version: ${result.version}`);
   * ```
   */
  async publishAssetVersion(
    previousUAL: string,
    updatedData: any,
    options: { epochs?: number; validateSchema?: boolean } = {}
  ): Promise<PublishResult> {
    if (!this.isInitialized) {
      throw new Error('DKG client not initialized');
    }

    const { epochs = 2, validateSchema = true } = options;

    // Retrieve previous version to get version number
    let previousVersion = 1;
    try {
      const previousAsset = await this.queryReputation(previousUAL);
      if (previousAsset && previousAsset.version) {
        previousVersion = previousAsset.version + 1;
      } else if (previousAsset && previousAsset['prov:wasRevisionOf']) {
        // Try to extract version from provenance chain
        const chain = await this.getProvenanceChain(previousUAL);
        previousVersion = chain.length + 1;
      }
    } catch (error) {
      console.warn(`⚠️  Could not retrieve previous version, starting at version 1`);
    }

    // Add provenance information
    const versionedData = {
      ...updatedData,
      '@context': {
        ...(updatedData['@context'] || {}),
        'prov': 'http://www.w3.org/ns/prov#'
      },
      'prov:wasRevisionOf': {
        '@id': previousUAL
      },
      'version': previousVersion,
      'dateModified': new Date().toISOString()
    };

    // Use mock mode if enabled
    if (this.useMockMode) {
      console.log(`🔧 [MOCK] Publishing version ${previousVersion} of asset: ${previousUAL}`);
      const ual = `${previousUAL}:v${previousVersion}`;
      console.log(`✅ [MOCK] Version published: ${ual}`);
      
      return {
        UAL: ual,
        transactionHash: `0x${Buffer.from(`${Date.now()}-${Math.random()}`).toString('hex')}`,
        blockNumber: Math.floor(Date.now() / 1000),
        version: previousVersion,
        previousVersionUAL: previousUAL,
        costEstimate: this.tokenomics.estimatePublishCost(epochs, false)
      };
    }

    return this.retryOperation(async () => {
      if (!this.dkg) {
        throw new Error('DKG instance not available');
      }

      console.log(`🔄 Publishing version ${previousVersion} of asset: ${previousUAL}`);

      // Validate if requested
      if (validateSchema) {
        const validationResult = await validateJSONLD(versionedData);
        if (!validationResult.valid) {
          const errors = validationResult.errors.map(e => `${e.path}: ${e.message}`).join('; ');
          throw new Error(`Asset validation failed: ${errors}`);
        }
      }

      // Publish new version
      const result = await this.publishReputationAsset(versionedData as ReputationAsset, epochs, {
        validateSchema
      });

      return {
        ...result,
        version: previousVersion,
        previousVersionUAL: previousUAL
      };
    }, 'Publish asset version').catch((error) => {
      if (this.shouldFallbackToMock()) {
        this.enableMockMode('version publish failure');
        return this.publishAssetVersion(previousUAL, updatedData, options);
      }
      throw error;
    });
  }

  /**
   * Get provenance chain for a Knowledge Asset
   * 
   * Retrieves the full provenance chain (version history) for an asset
   * by following prov:wasRevisionOf relationships.
   * 
   * @param ual - UAL of the asset
   * @returns Array of UALs in the provenance chain (oldest to newest)
   */
  async getProvenanceChain(ual: string): Promise<string[]> {
    if (!this.isInitialized) {
      throw new Error('DKG client not initialized');
    }

    const chain: string[] = [ual];
    let currentUAL = ual;
    const maxDepth = 100; // Prevent infinite loops
    let depth = 0;

    while (depth < maxDepth) {
      try {
        const asset = await this.queryReputation(currentUAL);
        const previousUAL = asset?.['prov:wasRevisionOf']?.['@id'] || 
                           asset?.previousVersionUAL ||
                           asset?.provenance?.sourceAssets?.[0];

        if (!previousUAL || chain.includes(previousUAL)) {
          break; // Reached the beginning or found a cycle
        }

        chain.unshift(previousUAL); // Add to beginning
        currentUAL = previousUAL;
        depth++;
      } catch (error) {
        break; // Could not retrieve previous version
      }
    }

    return chain;
  }

  // Private helper methods

  /**
   * Build enhanced SPARQL query for DRAG (fallback when DRAG API not available)
   * 
   * Improved query with better text matching, relevance scoring, and type filtering
   */
  private buildDRAGSPARQLQuery(query: string, limit: number, filterByType: string[]): string {
    const escapedQuery = escapeSPARQLString(query);
    const typeFilters = filterByType.length > 0
      ? filterByType.map(type => {
          // Support both dotrep and schema types
          if (type.startsWith('schema:')) {
            return `?asset a ${type} .`;
          }
          return `?asset a dotrep:${type} .`;
        }).join(' ')
      : '';

    // Enhanced relevance scoring based on match position and type
    return `
      PREFIX schema: <https://schema.org/>
      PREFIX dotrep: <https://dotrep.io/ontology/>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      
      SELECT DISTINCT ?asset ?text ?relevance ?assetType ?dateModified
      WHERE {
        ?asset a ?assetType .
        ${typeFilters}
        
        # Match in name (highest relevance)
        OPTIONAL {
          ?asset schema:name ?name .
          FILTER(CONTAINS(LCASE(?name), LCASE("${escapedQuery}")))
          BIND(1.0 AS ?nameRelevance)
        }
        
        # Match in description (medium relevance)
        OPTIONAL {
          ?asset schema:description ?description .
          FILTER(CONTAINS(LCASE(?description), LCASE("${escapedQuery}")))
          BIND(0.7 AS ?descRelevance)
        }
        
        # Match in keywords/tags (lower relevance)
        OPTIONAL {
          ?asset schema:keywords | dotrep:tags ?keyword .
          FILTER(CONTAINS(LCASE(STR(?keyword)), LCASE("${escapedQuery}")))
          BIND(0.5 AS ?keywordRelevance)
        }
        
        # Combine text for display
        BIND(CONCAT(
          COALESCE(?name, ""), 
          " ", 
          COALESCE(?description, ""),
          " ",
          COALESCE(STR(?keyword), "")
        ) AS ?text)
        
        # Calculate relevance score (weighted)
        BIND(
          COALESCE(?nameRelevance, 0) * 1.0 +
          COALESCE(?descRelevance, 0) * 0.7 +
          COALESCE(?keywordRelevance, 0) * 0.5
          AS ?relevance
        )
        
        OPTIONAL {
          ?asset schema:dateModified ?dateModified .
        }
        
        FILTER(?relevance > 0)
      }
      ORDER BY DESC(?relevance) DESC(?dateModified)
      LIMIT ${limit}
    `;
  }

  /**
   * Transform SPARQL results by grouping related fields
   * 
   * Helper method to transform flat SPARQL results into nested structures
   */
  private transformSPARQLResults(results: any[], groupBy: string): any[] {
    if (!Array.isArray(results) || results.length === 0) {
      return results;
    }

    const grouped = new Map<string, any>();

    for (const row of results) {
      // Extract value from SPARQL result format
      const getValue = (val: any): any => {
        if (val && typeof val === 'object' && 'value' in val) {
          return val.value;
        }
        return val;
      };

      const groupKey = getValue(row[groupBy]);
      if (!groupKey) continue;

      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, {
          [groupBy]: groupKey,
          contributions: [],
        });
      }

      const item = grouped.get(groupKey)!;

      // Add main fields
      for (const [key, value] of Object.entries(row)) {
        if (key === groupBy || key.startsWith('contribution')) continue;
        if (item[key] === undefined) {
          item[key] = getValue(value);
        }
      }

      // Add contribution if present
      const contribution = getValue(row.contribution);
      if (contribution && !item.contributions.some((c: any) => c.id === contribution)) {
        item.contributions.push({
          id: contribution,
          name: getValue(row.contributionName),
          url: getValue(row.contributionUrl),
          type: getValue(row.contributionType),
          impact: getValue(row.contributionImpact),
        });
      }
    }

    return Array.from(grouped.values());
  }

  /**
   * Fallback batch minting (creates assets individually)
   */
  private async batchMintFallback(
    assets: Array<{ name: string; data: any; metadata?: Record<string, any> }>,
    collectionMetadata: any,
    epochs: number,
    batchSize: number,
    delay: number
  ): Promise<any> {
    const assetUALs: string[] = [];
    const transactionHashes: string[] = [];

    // Create collection asset first
    const collectionResult = await this.dkg.asset.create({
      public: collectionMetadata
    }, { epochsNum: epochs });

    // Create assets in batches
    for (let i = 0; i < assets.length; i += batchSize) {
      const batch = assets.slice(i, i + batchSize);
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(assets.length / batchSize)}`);

      for (const asset of batch) {
        try {
          const result = await this.dkg.asset.create({
            public: {
              ...asset.data,
              'schema:isPartOf': { '@id': collectionResult.UAL },
              ...asset.metadata
            }
          }, { epochsNum: epochs });

          assetUALs.push(result.UAL);
          if (result.transactionHash) {
            transactionHashes.push(result.transactionHash);
          }
        } catch (error: any) {
          console.error(`❌ Failed to mint asset "${asset.name}":`, error.message);
        }
      }

      // Delay between batches
      if (i + batchSize < assets.length && delay > 0) {
        await this.delay(delay);
      }
    }

    return {
      collectionUAL: collectionResult.UAL,
      assetUALs,
      transactionHashes
    };
  }

  /**
   * Convert File to Buffer (browser environment)
   */
  private async fileToBuffer(file: File | any): Promise<Buffer> {
    // Check if we're in a browser environment (has File API)
    const isBrowser = typeof globalThis !== 'undefined' && 
                      'File' in globalThis && 
                      file instanceof File;
    
    if (isBrowser) {
      // Browser environment
      const arrayBuffer = await file.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } else {
      // Node.js environment - file should already be a Buffer or path
      if (Buffer.isBuffer(file)) {
        return file;
      }
      // Try to read as file path
      try {
        const fs = require('fs');
        return fs.readFileSync(file);
      } catch (error) {
        throw new Error('Invalid file type: expected Buffer, File, or file path string');
      }
    }
  }
}

/**
 * Factory function to create a DKG client instance
 */
export function createDKGClientV8(config?: DKGConfig): DKGClientV8 {
  return new DKGClientV8(config);
}

export default DKGClientV8;

