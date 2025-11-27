/**
 * Data Marketplace Interface
 * 
 * Complete marketplace interface for quality data exchange:
 * - Discovery (search by metadata, reputation, type)
 * - Payment flow (x402 or smart-contract)
 * - Delivery (download/access)
 * - Provenance viewer (UAL explorer)
 * - Dispute/feedback system
 * 
 * Integrates:
 * - Data Product Registry
 * - Fair Exchange Protocol
 * - Quality Validators
 * - Reputation System
 */

import { DKGClientV8, DKGConfig } from './dkg-client-v8';
import { 
  DataProductRegistry, 
  DataProductMetadata, 
  DataProductSearchFilters,
  DataProductRegistryEntry 
} from './data-product-registry';
import { 
  FairExchangeProtocol, 
  ExchangeRequest, 
  ExchangeRecord, 
  ExchangeResult 
} from './fair-exchange-protocol';
import { QualityValidators, ValidationReport } from './quality-validators';

/**
 * Marketplace Listing
 */
export interface MarketplaceListing {
  entry: DataProductRegistryEntry;
  providerReputation: number;
  endorsementCount: number;
  validationScore?: number;
  price?: {
    amount: number;
    currency: string;
  };
  accessControl: string;
  qualityScore?: number;
}

/**
 * Marketplace Statistics
 */
export interface MarketplaceStatistics {
  totalProducts: number;
  productsByType: Record<string, number>;
  productsByLicense: Record<string, number>;
  averageQualityScore: number;
  averageReputation: number;
  totalExchanges: number;
  successfulExchanges: number;
  disputeRate: number;
}

/**
 * Purchase Request
 */
export interface PurchaseRequest {
  dataProductUAL: string;
  buyer: string;
  buyerDID?: string;
  paymentMethod?: 'x402' | 'escrow' | 'direct' | 'smart_contract';
  deliveryVerification?: {
    required: boolean;
    contentHash?: string;
    fingerprint?: string;
    validationRequired?: boolean;
  };
}

/**
 * Purchase Result
 */
export interface PurchaseResult {
  exchangeId: string;
  exchangeUAL?: string;
  status: string;
  paymentTransactionHash?: string;
  deliveryLocation?: string;
  verificationPassed?: boolean;
  error?: string;
}

/**
 * Data Marketplace Service
 */
export class DataMarketplace {
  private dkgClient: DKGClientV8;
  private dataProductRegistry: DataProductRegistry;
  private fairExchange: FairExchangeProtocol;
  private qualityValidators: QualityValidators;

  constructor(
    dkgClient?: DKGClientV8,
    dkgConfig?: DKGConfig
  ) {
    this.dkgClient = dkgClient || new DKGClientV8(dkgConfig);
    this.dataProductRegistry = new DataProductRegistry(this.dkgClient);
    this.fairExchange = new FairExchangeProtocol(this.dkgClient, this.dataProductRegistry);
    this.qualityValidators = new QualityValidators(this.dkgClient);
  }

  /**
   * List data products (marketplace discovery)
   */
  async listProducts(filters: DataProductSearchFilters = {}): Promise<MarketplaceListing[]> {
    console.log(`🔍 Listing data products with filters:`, filters);

    // Search data products
    const entries = await this.dataProductRegistry.searchDataProducts(filters);

    // Convert to marketplace listings
    const listings: MarketplaceListing[] = [];
    for (const entry of entries) {
      const listing: MarketplaceListing = {
        entry,
        providerReputation: entry.metadata.providerReputation || 0,
        endorsementCount: entry.metadata.endorsementCount || 0,
        validationScore: entry.metadata.qualityMetrics?.validationScore,
        price: entry.metadata.price,
        accessControl: entry.metadata.accessControl,
        qualityScore: this.calculateQualityScore(entry.metadata)
      };

      listings.push(listing);
    }

    // Sort by quality/reputation if not specified
    if (!filters.sortBy) {
      listings.sort((a, b) => {
        const scoreA = (a.qualityScore || 0) * 0.6 + (a.providerReputation || 0) * 0.4;
        const scoreB = (b.qualityScore || 0) * 0.6 + (b.providerReputation || 0) * 0.4;
        return scoreB - scoreA;
      });
    }

    console.log(`✅ Found ${listings.length} data products`);

    return listings;
  }

  /**
   * Get product details
   */
  async getProductDetails(ual: string): Promise<MarketplaceListing | null> {
    const entry = await this.dataProductRegistry.getDataProduct(ual);
    if (!entry) {
      return null;
    }

    // Get validation report if available
    let validationScore = entry.metadata.qualityMetrics?.validationScore;
    try {
      const validationReport = await this.getValidationReport(ual);
      if (validationReport) {
        validationScore = validationReport.overallScore;
      }
    } catch (error) {
      // Validation report not available
    }

    return {
      entry,
      providerReputation: entry.metadata.providerReputation || 0,
      endorsementCount: entry.metadata.endorsementCount || 0,
      validationScore,
      price: entry.metadata.price,
      accessControl: entry.metadata.accessControl,
      qualityScore: this.calculateQualityScore(entry.metadata)
    };
  }

  /**
   * Purchase a data product
   */
  async purchaseProduct(request: PurchaseRequest): Promise<PurchaseResult> {
    console.log(`💰 Purchasing data product: ${request.dataProductUAL}`);

    // Get product details
    const product = await this.dataProductRegistry.getDataProduct(request.dataProductUAL);
    if (!product) {
      throw new Error(`Data product not found: ${request.dataProductUAL}`);
    }

    // Check if product is for sale
    if (!product.metadata.price) {
      throw new Error('Data product is not for sale');
    }

    // Create exchange request
    const exchangeRequest: ExchangeRequest = {
      dataProductUAL: request.dataProductUAL,
      buyer: request.buyer,
      buyerDID: request.buyerDID,
      price: product.metadata.price,
      paymentMethod: request.paymentMethod || 'escrow',
      deliveryVerification: request.deliveryVerification || {
        required: true,
        validationRequired: true
      },
      terms: {
        refundPolicy: 'Full refund if delivery verification fails',
        disputeWindow: 7, // 7 days
        deliveryDeadline: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
      }
    };

    // Initiate exchange
    const exchangeResult = await this.fairExchange.initiateExchange(exchangeRequest);

    // Wait for delivery (in production, this would be async)
    // For now, return the exchange result
    return {
      exchangeId: exchangeResult.exchangeId,
      exchangeUAL: exchangeResult.ual,
      status: exchangeResult.status,
      paymentTransactionHash: exchangeResult.transactionHash
    };
  }

  /**
   * Deliver purchased data product
   */
  async deliverProduct(
    exchangeId: string,
    dataLocation: string,
    contentHash?: string,
    fingerprint?: string
  ): Promise<PurchaseResult> {
    console.log(`📦 Delivering product for exchange: ${exchangeId}`);

    const result = await this.fairExchange.deliverData(
      exchangeId,
      dataLocation,
      contentHash,
      fingerprint
    );

    return {
      exchangeId: result.exchangeId,
      status: result.status,
      deliveryLocation: result.deliveryLocation,
      verificationPassed: result.verificationPassed
    };
  }

  /**
   * Validate a data product
   */
  async validateProduct(
    dataProductUAL: string,
    dataLocation?: string
  ): Promise<ValidationReport> {
    console.log(`🔍 Validating data product: ${dataProductUAL}`);

    return this.qualityValidators.validateDataProduct(dataProductUAL, dataLocation);
  }

  /**
   * Raise a dispute
   */
  async raiseDispute(
    exchangeId: string,
    reason: string,
    raisedBy?: string
  ): Promise<PurchaseResult> {
    console.log(`⚠️  Raising dispute for exchange: ${exchangeId}`);

    const result = await this.fairExchange.raiseDispute(exchangeId, reason, raisedBy);

    return {
      exchangeId: result.exchangeId,
      status: result.status
    };
  }

  /**
   * Resolve a dispute
   */
  async resolveDispute(
    exchangeId: string,
    resolution: string,
    refundBuyer: boolean = false,
    resolver?: string
  ): Promise<PurchaseResult> {
    console.log(`✅ Resolving dispute for exchange: ${exchangeId}`);

    const result = await this.fairExchange.resolveDispute(
      exchangeId,
      resolution,
      refundBuyer,
      resolver
    );

    return {
      exchangeId: result.exchangeId,
      status: result.status
    };
  }

  /**
   * Get marketplace statistics
   */
  async getStatistics(): Promise<MarketplaceStatistics> {
    console.log(`📊 Computing marketplace statistics`);

    // Get all products
    const allProducts = await this.dataProductRegistry.searchDataProducts({ limit: 1000 });

    const stats: MarketplaceStatistics = {
      totalProducts: allProducts.length,
      productsByType: {},
      productsByLicense: {},
      averageQualityScore: 0,
      averageReputation: 0,
      totalExchanges: 0,
      successfulExchanges: 0,
      disputeRate: 0
    };

    let totalQuality = 0;
    let totalReputation = 0;
    let qualityCount = 0;
    let reputationCount = 0;

    for (const entry of allProducts) {
      // Count by type
      const type = entry.metadata.type;
      stats.productsByType[type] = (stats.productsByType[type] || 0) + 1;

      // Count by license
      const license = entry.metadata.license;
      stats.productsByLicense[license] = (stats.productsByLicense[license] || 0) + 1;

      // Average quality score
      const quality = entry.metadata.qualityMetrics?.validationScore;
      if (quality !== undefined) {
        totalQuality += quality;
        qualityCount++;
      }

      // Average reputation
      const reputation = entry.metadata.providerReputation;
      if (reputation !== undefined) {
        totalReputation += reputation;
        reputationCount++;
      }
    }

    stats.averageQualityScore = qualityCount > 0 ? totalQuality / qualityCount : 0;
    stats.averageReputation = reputationCount > 0 ? totalReputation / reputationCount : 0;

    // Exchange statistics would come from exchange records
    // For now, use placeholder values
    stats.totalExchanges = 0;
    stats.successfulExchanges = 0;
    stats.disputeRate = 0;

    return stats;
  }

  /**
   * Get validation report for a product
   */
  private async getValidationReport(ual: string): Promise<ValidationReport | null> {
    try {
      const query = `
        PREFIX dotrep: <https://dotrep.io/ontology/>
        SELECT ?report ?data WHERE {
          ?report a dotrep:ValidationReport .
          ?report dotrep:dataProductUAL "${ual}" .
          ?report dotrep:reportData ?data .
        }
        ORDER BY DESC(?report/dotrep:validatedAt)
        LIMIT 1
      `;

      const results = await this.dkgClient.executeSafeQuery(query, 'SELECT');
      if (results.length > 0 && results[0].data) {
        return JSON.parse(results[0].data) as ValidationReport;
      }
    } catch (error) {
      // Report not found
    }

    return null;
  }

  /**
   * Calculate quality score from metadata
   */
  private calculateQualityScore(metadata: DataProductMetadata): number {
    let score = 0;
    let maxScore = 0;

    // Quality metrics (40%)
    if (metadata.qualityMetrics) {
      const metrics = metadata.qualityMetrics;
      const metricsScore = (
        (metrics.completeness || 0) * 0.2 +
        (metrics.accuracy || 0) * 0.2 +
        (metrics.validationScore || 0) * 0.3 +
        (metrics.schemaCompliance || 0) * 0.15 +
        (metadata.qualityMetrics.communityRating || 0) * 20 * 0.15
      );
      score += metricsScore * 0.4;
      maxScore += 40;
    }

    // Completeness (30%)
    const completeness = this.calculateCompleteness(metadata);
    score += completeness * 0.3;
    maxScore += 30;

    // Provider reputation (20%)
    const reputation = metadata.providerReputation || 0;
    score += (reputation / 1000) * 100 * 0.2;
    maxScore += 20;

    // Endorsements (10%)
    const endorsementScore = Math.min(100, (metadata.endorsementCount || 0) * 10);
    score += endorsementScore * 0.1;
    maxScore += 10;

    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  }

  /**
   * Calculate completeness score
   */
  private calculateCompleteness(metadata: DataProductMetadata): number {
    let score = 0;
    const maxScore = 100;

    // Required fields
    const requiredFields = ['id', 'name', 'creator', 'type', 'license'];
    score += (requiredFields.filter(f => (metadata as any)[f]).length / requiredFields.length) * 40;

    // Recommended fields
    const recommendedFields = ['description', 'version', 'format', 'tags', 'category', 'schema', 'sampleData'];
    score += (recommendedFields.filter(f => (metadata as any)[f]).length / recommendedFields.length) * 40;

    // Documentation
    if (metadata.documentationUrl || metadata.readme) {
      score += 20;
    }

    return Math.min(score, maxScore);
  }
}

/**
 * Factory function to create a Data Marketplace instance
 */
export function createDataMarketplace(
  dkgClient?: DKGClientV8,
  dkgConfig?: DKGConfig
): DataMarketplace {
  return new DataMarketplace(dkgClient, dkgConfig);
}

export default DataMarketplace;

