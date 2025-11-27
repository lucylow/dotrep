/**
 * Data Product Schema & Metadata Registry
 * 
 * Implements a comprehensive data product schema and metadata registry for quality data exchange.
 * Based on research-informed best practices for decentralized data marketplaces.
 * 
 * Features:
 * - JSON-LD / RDF schema for Data Products / Knowledge Assets
 * - Complete metadata registry with provenance, license, quality metrics
 * - Versioning and lineage tracking
 * - Payment metadata and usage rights
 * - Dispute history and reputation tracking
 * 
 * Schema includes:
 * - Provenance (creator, timestamp, source)
 * - Type (dataset / content / endorsement / media)
 * - License/usage terms
 * - Version
 * - Quality metrics (optional)
 * - Payment metadata (when sold)
 * - Reputation history
 * - Anchor UAL
 * - Dispute history
 */

import { DKGClientV8, DKGConfig, PublishResult } from './dkg-client-v8';
import { computeContentHash } from './jsonld-validator';
import * as crypto from 'crypto';

/**
 * Data Product Type
 */
export type DataProductType = 
  | 'dataset' 
  | 'content' 
  | 'endorsement' 
  | 'media' 
  | 'model' 
  | 'analytics' 
  | 'knowledge_asset'
  | 'other';

/**
 * License Type
 */
export type LicenseType = 
  | 'CC0' 
  | 'CC-BY' 
  | 'CC-BY-SA' 
  | 'MIT' 
  | 'Apache-2.0' 
  | 'GPL-3.0' 
  | 'Proprietary' 
  | 'Custom';

/**
 * Access Control Level
 */
export type AccessControlLevel = 
  | 'public' 
  | 'restricted' 
  | 'private' 
  | 'encrypted' 
  | 'gated';

/**
 * Data Product Metadata
 */
export interface DataProductMetadata {
  // Core identification
  id: string;
  name: string;
  description: string;
  type: DataProductType;
  
  // Provenance
  creator: string; // DID or account ID
  creatorDID?: string; // Full DID
  timestamp: number;
  source?: string; // Source URL or reference
  previousVersionUAL?: string; // UAL of previous version for prov:wasRevisionOf
  
  // Versioning
  version: string; // Semantic version (e.g., "1.0.0")
  versionHistory?: string[]; // Array of previous version UALs
  
  // License & Usage
  license: LicenseType;
  licenseUrl?: string;
  usageTerms?: string; // Custom usage terms
  attributionRequired?: boolean;
  
  // Quality Metrics
  qualityMetrics?: {
    completeness?: number; // 0-100
    accuracy?: number; // 0-100
    freshness?: number; // Days since last update
    validationScore?: number; // 0-100
    schemaCompliance?: number; // 0-100
    communityRating?: number; // 0-5 stars
  };
  
  // Data Characteristics
  format?: string; // e.g., "CSV", "JSON", "Parquet", "Image"
  size?: number; // Size in bytes
  recordCount?: number; // For structured data
  schema?: any; // JSON schema or structure definition
  sampleData?: any; // Sample/preview data (for discovery)
  
  // Storage & Access
  storageLocation?: string; // IPFS hash, URL, or storage reference
  accessControl: AccessControlLevel;
  encryptionKey?: string; // For encrypted data (encrypted itself)
  accessConditions?: string; // Conditions for access (e.g., payment, reputation threshold)
  
  // Payment Metadata
  price?: {
    amount: number;
    currency: string; // e.g., "TRAC", "DOT", "USD"
    paymentMethod?: 'x402' | 'escrow' | 'direct' | 'subscription';
  };
  paymentHistory?: Array<{
    buyer: string;
    amount: number;
    currency: string;
    timestamp: number;
    transactionHash?: string;
    ual?: string; // UAL of payment transaction
  }>;
  
  // Reputation & Endorsements
  providerReputation?: number; // Reputation score of provider
  endorsementCount?: number;
  endorsementUALs?: string[]; // UALs of endorsement assets
  
  // Validation & Verification
  validationResults?: Array<{
    validator: string; // DID of validator
    timestamp: number;
    passed: boolean;
    issues?: string[];
    validationUAL?: string; // UAL of validation result KA
  }>;
  
  // Dispute History
  disputes?: Array<{
    id: string;
    raisedBy: string; // DID of disputer
    timestamp: number;
    reason: string;
    status: 'open' | 'resolved' | 'dismissed';
    resolution?: string;
    resolutionUAL?: string; // UAL of resolution KA
  }>;
  
  // Tags & Categorization
  tags?: string[];
  category?: string;
  domain?: string; // e.g., "AI/ML", "Finance", "Healthcare"
  
  // Documentation
  documentationUrl?: string;
  readme?: string;
  changelog?: string;
  
  // Anchoring
  anchorUAL?: string; // UAL of this asset
  anchoredBlock?: number;
  anchoredParachain?: string;
  
  // Additional metadata
  customMetadata?: Record<string, any>;
}

/**
 * Data Product Registry Entry
 */
export interface DataProductRegistryEntry {
  metadata: DataProductMetadata;
  ual: string;
  publishedAt: number;
  contentHash: string;
  canonicalForm?: string;
}

/**
 * Data Product Search Filters
 */
export interface DataProductSearchFilters {
  type?: DataProductType | DataProductType[];
  license?: LicenseType | LicenseType[];
  minQuality?: number; // Minimum quality score
  minReputation?: number; // Minimum provider reputation
  priceRange?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  tags?: string[];
  category?: string;
  domain?: string;
  accessControl?: AccessControlLevel | AccessControlLevel[];
  createdAfter?: number;
  createdBefore?: number;
  limit?: number;
  offset?: number;
  sortBy?: 'reputation' | 'quality' | 'price' | 'date' | 'popularity';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Data Product Registry Service
 */
export class DataProductRegistry {
  private dkgClient: DKGClientV8;
  private registry: Map<string, DataProductRegistryEntry> = new Map();

  constructor(dkgClient?: DKGClientV8, dkgConfig?: DKGConfig) {
    this.dkgClient = dkgClient || new DKGClientV8(dkgConfig);
  }

  /**
   * Register a new data product
   */
  async registerDataProduct(
    metadata: DataProductMetadata,
    epochs: number = 2
  ): Promise<PublishResult & { contentHash: string; registryEntry: DataProductRegistryEntry }> {
    console.log(`📦 Registering data product: ${metadata.name} (${metadata.type})`);

    // Validate metadata
    this.validateMetadata(metadata);

    // Convert to JSON-LD
    const knowledgeAsset = this.metadataToJSONLD(metadata);

    // Compute content hash
    const canonicalForm = JSON.stringify(knowledgeAsset, null, 0);
    const contentHash = computeContentHash({ '@context': knowledgeAsset['@context'], ...knowledgeAsset });

    // Publish to DKG
    const result = await this.dkgClient.publishReputationAsset(
      {
        developerId: metadata.creator,
        reputationScore: metadata.providerReputation || 0,
        contributions: [],
        timestamp: metadata.timestamp,
        metadata: knowledgeAsset as any,
        previousVersionUAL: metadata.previousVersionUAL,
        provenance: {
          computedBy: 'DataProductRegistry',
          method: 'registerDataProduct',
          sourceAssets: metadata.previousVersionUAL ? [metadata.previousVersionUAL] : []
        }
      },
      epochs
    );

    // Create registry entry
    const registryEntry: DataProductRegistryEntry = {
      metadata: {
        ...metadata,
        anchorUAL: result.UAL,
        anchoredBlock: result.blockNumber
      },
      ual: result.UAL,
      publishedAt: Date.now(),
      contentHash,
      canonicalForm
    };

    // Store in local registry
    this.registry.set(result.UAL, registryEntry);

    console.log(`✅ Data product registered: ${result.UAL}`);
    console.log(`🔐 Content hash: ${contentHash}`);

    return {
      ...result,
      contentHash,
      registryEntry
    };
  }

  /**
   * Update an existing data product (creates new version)
   */
  async updateDataProduct(
    previousUAL: string,
    updatedMetadata: Partial<DataProductMetadata>,
    epochs: number = 2
  ): Promise<PublishResult & { contentHash: string; registryEntry: DataProductRegistryEntry }> {
    // Retrieve existing product
    const existing = await this.getDataProduct(previousUAL);
    if (!existing) {
      throw new Error(`Data product not found: ${previousUAL}`);
    }

    // Merge with updates
    const newMetadata: DataProductMetadata = {
      ...existing.metadata,
      ...updatedMetadata,
      previousVersionUAL: previousUAL,
      versionHistory: [
        ...(existing.metadata.versionHistory || []),
        previousUAL
      ],
      timestamp: Date.now()
    };

    // Increment version if not specified
    if (!updatedMetadata.version) {
      const [major, minor, patch] = existing.metadata.version.split('.').map(Number);
      newMetadata.version = `${major}.${minor + 1}.${patch}`;
    }

    // Register as new version
    return this.registerDataProduct(newMetadata, epochs);
  }

  /**
   * Get data product by UAL
   */
  async getDataProduct(ual: string): Promise<DataProductRegistryEntry | null> {
    // Check local registry first
    if (this.registry.has(ual)) {
      return this.registry.get(ual)!;
    }

    try {
      // Query from DKG
      const asset = await this.dkgClient.queryReputation(ual);
      if (!asset) {
        return null;
      }

      // Convert from JSON-LD to metadata
      const metadata = this.jsonldToMetadata(asset);
      const contentHash = computeContentHash(asset);

      const entry: DataProductRegistryEntry = {
        metadata: {
          ...metadata,
          anchorUAL: ual
        },
        ual,
        publishedAt: new Date(metadata.timestamp).getTime(),
        contentHash
      };

      // Cache in local registry
      this.registry.set(ual, entry);

      return entry;
    } catch (error: any) {
      console.error(`❌ Failed to get data product ${ual}:`, error);
      return null;
    }
  }

  /**
   * Search data products
   */
  async searchDataProducts(
    filters: DataProductSearchFilters = {}
  ): Promise<DataProductRegistryEntry[]> {
    const {
      type,
      license,
      minQuality,
      minReputation,
      priceRange,
      tags,
      category,
      domain,
      accessControl,
      createdAfter,
      createdBefore,
      limit = 50,
      offset = 0,
      sortBy = 'date',
      sortOrder = 'desc'
    } = filters;

    // Build SPARQL query
    const query = this.buildSearchQuery(filters);

    try {
      // Execute query
      const results = await this.dkgClient.executeSafeQuery(query, 'SELECT');

      // Convert results to registry entries
      const entries: DataProductRegistryEntry[] = [];
      for (const result of results.slice(offset, offset + limit)) {
        if (result.ual) {
          const entry = await this.getDataProduct(result.ual);
          if (entry) {
            entries.push(entry);
          }
        }
      }

      // Sort results
      this.sortEntries(entries, sortBy, sortOrder);

      return entries;
    } catch (error: any) {
      console.error('❌ Search failed:', error);
      return [];
    }
  }

  /**
   * Validate metadata
   */
  private validateMetadata(metadata: DataProductMetadata): void {
    if (!metadata.id || !metadata.name || !metadata.creator) {
      throw new Error('Missing required fields: id, name, creator');
    }

    if (!metadata.type) {
      throw new Error('Data product type is required');
    }

    if (!metadata.license) {
      throw new Error('License is required');
    }

    if (metadata.qualityMetrics) {
      const metrics = metadata.qualityMetrics;
      if (metrics.completeness !== undefined && (metrics.completeness < 0 || metrics.completeness > 100)) {
        throw new Error('Quality metric completeness must be between 0 and 100');
      }
      if (metrics.accuracy !== undefined && (metrics.accuracy < 0 || metrics.accuracy > 100)) {
        throw new Error('Quality metric accuracy must be between 0 and 100');
      }
    }
  }

  /**
   * Convert metadata to JSON-LD
   */
  private metadataToJSONLD(metadata: DataProductMetadata): any {
    return {
      '@context': {
        '@vocab': 'https://schema.org/',
        'dotrep': 'https://dotrep.io/ontology/',
        'dcterms': 'http://purl.org/dc/terms/',
        'prov': 'http://www.w3.org/ns/prov#'
      },
      '@type': 'dotrep:DataProduct',
      '@id': `dotrep:dataproduct:${metadata.id}`,
      'name': metadata.name,
      'description': metadata.description,
      'dotrep:dataProductType': metadata.type,
      'dcterms:creator': metadata.creatorDID || metadata.creator,
      'dcterms:created': new Date(metadata.timestamp).toISOString(),
      'dcterms:modified': new Date(metadata.timestamp).toISOString(),
      'dcterms:license': metadata.license,
      'dcterms:licenseUrl': metadata.licenseUrl || '',
      'dotrep:usageTerms': metadata.usageTerms || '',
      'dotrep:attributionRequired': metadata.attributionRequired || false,
      'softwareVersion': metadata.version,
      'dotrep:versionHistory': metadata.versionHistory || [],
      'prov:wasRevisionOf': metadata.previousVersionUAL ? {
        '@id': metadata.previousVersionUAL
      } : undefined,
      'dotrep:qualityMetrics': metadata.qualityMetrics ? {
        '@type': 'dotrep:QualityMetrics',
        'dotrep:completeness': metadata.qualityMetrics.completeness,
        'dotrep:accuracy': metadata.qualityMetrics.accuracy,
        'dotrep:freshness': metadata.qualityMetrics.freshness,
        'dotrep:validationScore': metadata.qualityMetrics.validationScore,
        'dotrep:schemaCompliance': metadata.qualityMetrics.schemaCompliance,
        'dotrep:communityRating': metadata.qualityMetrics.communityRating
      } : undefined,
      'dotrep:format': metadata.format || '',
      'dotrep:size': metadata.size || 0,
      'dotrep:recordCount': metadata.recordCount || 0,
      'dotrep:schema': metadata.schema ? JSON.stringify(metadata.schema) : '',
      'dotrep:sampleData': metadata.sampleData ? JSON.stringify(metadata.sampleData) : '',
      'dotrep:storageLocation': metadata.storageLocation || '',
      'dotrep:accessControl': metadata.accessControl,
      'dotrep:accessConditions': metadata.accessConditions || '',
      'dotrep:price': metadata.price ? {
        '@type': 'dotrep:Price',
        'dotrep:amount': metadata.price.amount,
        'dotrep:currency': metadata.price.currency,
        'dotrep:paymentMethod': metadata.price.paymentMethod || 'escrow'
      } : undefined,
      'dotrep:paymentHistory': metadata.paymentHistory || [],
      'dotrep:providerReputation': metadata.providerReputation || 0,
      'dotrep:endorsementCount': metadata.endorsementCount || 0,
      'dotrep:endorsementUALs': metadata.endorsementUALs || [],
      'dotrep:validationResults': metadata.validationResults || [],
      'dotrep:disputes': metadata.disputes || [],
      'keywords': metadata.tags || [],
      'dotrep:category': metadata.category || '',
      'dotrep:domain': metadata.domain || '',
      'url': metadata.documentationUrl || '',
      'dotrep:readme': metadata.readme || '',
      'dotrep:changelog': metadata.changelog || '',
      'dotrep:customMetadata': metadata.customMetadata || {}
    };
  }

  /**
   * Convert JSON-LD to metadata
   */
  private jsonldToMetadata(asset: any): DataProductMetadata {
    return {
      id: asset['@id']?.replace('dotrep:dataproduct:', '') || '',
      name: asset.name || '',
      description: asset.description || '',
      type: asset['dotrep:dataProductType'] || 'other',
      creator: asset['dcterms:creator'] || '',
      creatorDID: asset['dcterms:creator'] || '',
      timestamp: new Date(asset['dcterms:created'] || Date.now()).getTime(),
      source: asset['dotrep:source'] || '',
      previousVersionUAL: asset['prov:wasRevisionOf']?.['@id'] || asset['prov:wasRevisionOf'] || '',
      version: asset.softwareVersion || '1.0.0',
      versionHistory: asset['dotrep:versionHistory'] || [],
      license: asset['dcterms:license'] || 'CC0',
      licenseUrl: asset['dcterms:licenseUrl'] || '',
      usageTerms: asset['dotrep:usageTerms'] || '',
      attributionRequired: asset['dotrep:attributionRequired'] || false,
      qualityMetrics: asset['dotrep:qualityMetrics'] ? {
        completeness: asset['dotrep:qualityMetrics']['dotrep:completeness'],
        accuracy: asset['dotrep:qualityMetrics']['dotrep:accuracy'],
        freshness: asset['dotrep:qualityMetrics']['dotrep:freshness'],
        validationScore: asset['dotrep:qualityMetrics']['dotrep:validationScore'],
        schemaCompliance: asset['dotrep:qualityMetrics']['dotrep:schemaCompliance'],
        communityRating: asset['dotrep:qualityMetrics']['dotrep:communityRating']
      } : undefined,
      format: asset['dotrep:format'] || '',
      size: asset['dotrep:size'] || 0,
      recordCount: asset['dotrep:recordCount'] || 0,
      schema: asset['dotrep:schema'] ? JSON.parse(asset['dotrep:schema']) : undefined,
      sampleData: asset['dotrep:sampleData'] ? JSON.parse(asset['dotrep:sampleData']) : undefined,
      storageLocation: asset['dotrep:storageLocation'] || '',
      accessControl: asset['dotrep:accessControl'] || 'public',
      accessConditions: asset['dotrep:accessConditions'] || '',
      price: asset['dotrep:price'] ? {
        amount: asset['dotrep:price']['dotrep:amount'],
        currency: asset['dotrep:price']['dotrep:currency'],
        paymentMethod: asset['dotrep:price']['dotrep:paymentMethod'] || 'escrow'
      } : undefined,
      paymentHistory: asset['dotrep:paymentHistory'] || [],
      providerReputation: asset['dotrep:providerReputation'] || 0,
      endorsementCount: asset['dotrep:endorsementCount'] || 0,
      endorsementUALs: asset['dotrep:endorsementUALs'] || [],
      validationResults: asset['dotrep:validationResults'] || [],
      disputes: asset['dotrep:disputes'] || [],
      tags: asset.keywords || [],
      category: asset['dotrep:category'] || '',
      domain: asset['dotrep:domain'] || '',
      documentationUrl: asset.url || '',
      readme: asset['dotrep:readme'] || '',
      changelog: asset['dotrep:changelog'] || '',
      customMetadata: asset['dotrep:customMetadata'] || {}
    };
  }

  /**
   * Build SPARQL search query
   */
  private buildSearchQuery(filters: DataProductSearchFilters): string {
    const conditions: string[] = [];
    
    if (filters.type) {
      const types = Array.isArray(filters.type) ? filters.type : [filters.type];
      const typeFilter = types.map(t => `?product dotrep:dataProductType "${t}"`).join(' || ');
      conditions.push(`(${typeFilter})`);
    }

    if (filters.license) {
      const licenses = Array.isArray(filters.license) ? filters.license : [filters.license];
      const licenseFilter = licenses.map(l => `?product dcterms:license "${l}"`).join(' || ');
      conditions.push(`(${licenseFilter})`);
    }

    if (filters.minReputation) {
      conditions.push(`?product dotrep:providerReputation ?reputation . FILTER(?reputation >= ${filters.minReputation})`);
    }

    if (filters.tags && filters.tags.length > 0) {
      const tagFilter = filters.tags.map(t => `"${t}"`).join(' ');
      conditions.push(`?product schema:keywords ?tags . FILTER(CONTAINS(?tags, ${tagFilter}))`);
    }

    if (filters.category) {
      conditions.push(`?product dotrep:category "${filters.category}"`);
    }

    if (filters.domain) {
      conditions.push(`?product dotrep:domain "${filters.domain}"`);
    }

    if (filters.accessControl) {
      const levels = Array.isArray(filters.accessControl) ? filters.accessControl : [filters.accessControl];
      const accessFilter = levels.map(a => `?product dotrep:accessControl "${a}"`).join(' || ');
      conditions.push(`(${accessFilter})`);
    }

    if (filters.createdAfter) {
      conditions.push(`?product dcterms:created ?created . FILTER(?created >= "${new Date(filters.createdAfter).toISOString()}")`);
    }

    if (filters.createdBefore) {
      conditions.push(`?product dcterms:created ?created . FILTER(?created <= "${new Date(filters.createdBefore).toISOString()}")`);
    }

    const whereClause = conditions.length > 0 
      ? conditions.join(' . ')
      : '?product a dotrep:DataProduct';

    return `
      PREFIX schema: <https://schema.org/>
      PREFIX dotrep: <https://dotrep.io/ontology/>
      PREFIX dcterms: <http://purl.org/dc/terms/>
      
      SELECT ?product ?ual ?name ?type ?reputation ?quality
      WHERE {
        ?product a dotrep:DataProduct .
        ${whereClause}
        ?product schema:name ?name .
        ?product dotrep:dataProductType ?type .
        OPTIONAL { ?product dotrep:providerReputation ?reputation }
        OPTIONAL { ?product dotrep:qualityMetrics/dotrep:validationScore ?quality }
        BIND(STR(?product) AS ?ual)
      }
      ORDER BY DESC(?created)
      LIMIT ${filters.limit || 50}
    `;
  }

  /**
   * Sort entries
   */
  private sortEntries(
    entries: DataProductRegistryEntry[],
    sortBy: string,
    sortOrder: 'asc' | 'desc'
  ): void {
    entries.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'reputation':
          comparison = (a.metadata.providerReputation || 0) - (b.metadata.providerReputation || 0);
          break;
        case 'quality':
          const qualityA = a.metadata.qualityMetrics?.validationScore || 0;
          const qualityB = b.metadata.qualityMetrics?.validationScore || 0;
          comparison = qualityA - qualityB;
          break;
        case 'price':
          const priceA = a.metadata.price?.amount || 0;
          const priceB = b.metadata.price?.amount || 0;
          comparison = priceA - priceB;
          break;
        case 'date':
        default:
          comparison = a.publishedAt - b.publishedAt;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }
}

/**
 * Factory function to create a Data Product Registry instance
 */
export function createDataProductRegistry(
  dkgClient?: DKGClientV8,
  dkgConfig?: DKGConfig
): DataProductRegistry {
  return new DataProductRegistry(dkgClient, dkgConfig);
}

export default DataProductRegistry;

