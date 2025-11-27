/**
 * E-Commerce Service for DotRep
 * 
 * Implements e-commerce flows integrated with OriginTrail DKG, x402 payments,
 * NeuroWeb anchoring, and Umanitek verification.
 * 
 * Features:
 * - Pay-to-unlock provenance data
 * - Escrowed purchases with delivery verification
 * - Payment-weighted reputation (TraceRank)
 * - Product authenticity verification (Umanitek)
 * - Dispute resolution with audit trail
 * 
 * Based on research brief: e-commerce transactions fit into OriginTrail DKG +
 * NeuroWeb + Umanitek + x402 reputation hack.
 */

import { DKGClientV8, PublishResult } from './dkg-client-v8';
import { FairExchangeProtocol, ExchangeRequest, ExchangeRecord, ExchangeStatus } from './fair-exchange-protocol';

export interface ProvenanceUnlockRequest {
  productUAL: string;
  buyer: string; // Account ID or DID
  amount: string;
  currency: string; // e.g., 'USDC'
  chain?: string; // Default: 'base'
}

export interface ProvenanceUnlockResult {
  success: boolean;
  provenanceUAL?: string;
  paymentEvidenceUAL?: string;
  transactionHash?: string;
  provenance?: any; // JSON-LD provenance data
  error?: string;
}

export interface EscrowPurchaseRequest {
  productUAL: string;
  buyer: string;
  seller: string;
  price: {
    amount: string;
    currency: string;
  };
  deliveryVerification?: {
    requireImageMatch?: boolean; // Umanitek verification
    requireBuyerConfirmation?: boolean;
    deadline?: number; // Timestamp
  };
}

export interface EscrowPurchaseResult {
  exchangeId: string;
  escrowAddress?: string;
  status: ExchangeStatus;
  paymentEvidenceUAL?: string;
  deliveryEvidenceUAL?: string;
  releaseEvidenceUAL?: string;
  error?: string;
}

export interface DeliveryEvidence {
  exchangeId: string;
  trackingNumber?: string;
  images?: string[]; // URLs or IPFS hashes
  deliveredAt: number;
  buyerConfirmed?: boolean;
  umanitekVerification?: {
    passed: boolean;
    confidence: number;
    issues?: string[];
    verificationUAL?: string;
  };
}

/**
 * E-Commerce Service
 */
export class ECommerceService {
  private dkgClient: DKGClientV8;
  private exchangeProtocol: FairExchangeProtocol;

  constructor(dkgClient: DKGClientV8, exchangeProtocol?: FairExchangeProtocol) {
    this.dkgClient = dkgClient;
    this.exchangeProtocol = exchangeProtocol || new FairExchangeProtocol(dkgClient);
  }

  /**
   * Pay-to-unlock provenance data (fast demo flow)
   * 
   * Buyer pays via x402 → Payment Evidence KA published → Provenance returned
   */
  async unlockProvenance(
    request: ProvenanceUnlockRequest,
    paymentProof: {
      txHash: string;
      signature?: string;
      facilitatorSig?: string;
      blockNumber?: number;
    }
  ): Promise<ProvenanceUnlockResult> {
    console.log(`🔓 Unlocking provenance for product: ${request.productUAL}`);

    try {
      // Step 1: Verify payment proof
      if (!this.validatePaymentProof(paymentProof, request.amount, request.currency)) {
        return {
          success: false,
          error: 'Invalid payment proof'
        };
      }

      // Step 2: Publish Payment Evidence KA to DKG
      console.log('📤 Publishing Payment Evidence KA...');
      const paymentEvidenceResult = await this.dkgClient.publishPaymentEvidence({
        txHash: paymentProof.txHash,
        payer: request.buyer,
        recipient: this.getProductOwner(request.productUAL), // Would query DKG in production
        amount: request.amount,
        currency: request.currency,
        chain: request.chain || 'base',
        resourceUAL: request.productUAL,
        signature: paymentProof.signature,
        facilitatorSig: paymentProof.facilitatorSig,
        blockNumber: paymentProof.blockNumber
      });

      // Step 3: Query and return provenance data
      const provenance = await this.queryProductProvenance(request.productUAL);
      
      // Step 4: Anchor on NeuroWeb (would call polkadotApi in production)
      // For now, log the anchor event
      console.log(`🔗 Payment Evidence anchored: ${paymentEvidenceResult.UAL}`);

      return {
        success: true,
        provenanceUAL: request.productUAL,
        paymentEvidenceUAL: paymentEvidenceResult.UAL,
        transactionHash: paymentEvidenceResult.transactionHash,
        provenance
      };
    } catch (error: any) {
      console.error('Error unlocking provenance:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Initiate escrow purchase with delivery verification
   * 
   * Buyer creates escrow → Payment recorded → Seller uploads delivery evidence →
   * Umanitek verifies → Auto-release funds on verification
   */
  async initiateEscrowPurchase(
    request: EscrowPurchaseRequest
  ): Promise<EscrowPurchaseResult> {
    console.log(`💰 Initiating escrow purchase for product: ${request.productUAL}`);

    try {
      // Create exchange request
      const exchangeRequest: ExchangeRequest = {
        dataProductUAL: request.productUAL,
        buyer: request.buyer,
        price: {
          amount: parseFloat(request.price.amount),
          currency: request.price.currency
        },
        paymentMethod: 'escrow',
        deliveryVerification: {
          required: true,
          contentHash: undefined, // Would be set based on product metadata
          validationRequired: request.deliveryVerification?.requireImageMatch || false
        },
        terms: {
          deliveryDeadline: request.deliveryVerification?.deadline,
          refundPolicy: 'Automatic refund if delivery not verified within deadline',
          disputeWindow: 7 // days
        }
      };

      // Initiate exchange via Fair Exchange Protocol
      const exchangeResult = await this.exchangeProtocol.initiateExchange(exchangeRequest);

      // Get exchange record
      const exchangeRecord = await this.exchangeProtocol.getExchange(exchangeResult.exchangeId);
      if (!exchangeRecord) {
        throw new Error('Failed to retrieve exchange record');
      }

      // Publish Payment Evidence KA for escrow creation
      if (exchangeRecord.payment) {
        const paymentEvidenceResult = await this.dkgClient.publishPaymentEvidence({
          txHash: exchangeRecord.payment.transactionHash || `escrow:${exchangeResult.exchangeId}`,
          payer: request.buyer,
          recipient: request.seller,
          amount: request.price.amount,
          currency: request.price.currency,
          chain: 'base', // Would detect from escrow contract
          resourceUAL: request.productUAL,
          blockNumber: exchangeRecord.payment.blockNumber
        });

        return {
          exchangeId: exchangeResult.exchangeId,
          escrowAddress: exchangeRecord.payment.escrowAddress,
          status: exchangeRecord.status,
          paymentEvidenceUAL: paymentEvidenceResult.UAL
        };
      }

      return {
        exchangeId: exchangeResult.exchangeId,
        status: exchangeRecord.status
      };
    } catch (error: any) {
      console.error('Error initiating escrow purchase:', error);
      return {
        exchangeId: '',
        status: 'cancelled',
        error: error.message
      };
    }
  }

  /**
   * Submit delivery evidence and verify with Umanitek
   * 
   * Seller uploads delivery proof → Umanitek verifies images →
   * If verified, auto-release escrow funds
   */
  async submitDeliveryEvidence(
    exchangeId: string,
    evidence: DeliveryEvidence
  ): Promise<{
    success: boolean;
    verified: boolean;
    releaseEvidenceUAL?: string;
    umanitekUAL?: string;
    error?: string;
  }> {
    console.log(`📦 Processing delivery evidence for exchange: ${exchangeId}`);

    try {
      // Step 1: Get exchange record
      const exchange = await this.exchangeProtocol.getExchange(exchangeId);
      if (!exchange) {
        return {
          success: false,
          verified: false,
          error: 'Exchange not found'
        };
      }

      // Step 2: Verify delivery images with Umanitek (if images provided)
      let umanitekResult: any = null;
      if (evidence.images && evidence.images.length > 0) {
        console.log('🔍 Verifying delivery images with Umanitek...');
        umanitekResult = await this.verifyProductImages(
          evidence.images,
          exchange.request.dataProductUAL
        );
        
        evidence.umanitekVerification = {
          passed: umanitekResult.status === 'verified',
          confidence: umanitekResult.confidence || 0,
          issues: umanitekResult.matches || [],
          verificationUAL: umanitekResult.evidenceUAL
        };
      }

      // Step 3: Submit delivery evidence to exchange protocol
      const deliveryResult = await this.exchangeProtocol.deliverData(
        exchangeId,
        evidence.images?.[0] || '', // IPFS hash or URL
        this.computeContentHash(evidence),
        evidence.umanitekVerification?.verificationUAL
      );

      // Step 4: If buyer confirmed and verification passed, funds should auto-release
      // The FairExchangeProtocol automatically releases escrow on delivery verification
      if (evidence.buyerConfirmed && 
          (!evidence.umanitekVerification || evidence.umanitekVerification.passed)) {
        // Exchange should be auto-completed by deliverData if verification passed
        if (deliveryResult.status === 'completed') {
          const releaseEvidenceUAL = await this.publishReleaseEvidence({
            exchangeId,
            deliveryEvidence: evidence,
            releaseTransactionHash: deliveryResult.transactionHash
          });

          return {
            success: true,
            verified: true,
            releaseEvidenceUAL,
            umanitekUAL: evidence.umanitekVerification?.verificationUAL
          };
        }
      }

      // Step 5: Publish Delivery Evidence KA
      const deliveryEvidenceUAL = await this.publishDeliveryEvidence(exchangeId, evidence);

      return {
        success: true,
        verified: evidence.umanitekVerification?.passed || false,
        umanitekUAL: evidence.umanitekVerification?.verificationUAL
      };
    } catch (error: any) {
      console.error('Error processing delivery evidence:', error);
      return {
        success: false,
        verified: false,
        error: error.message
      };
    }
  }

  /**
   * Query product provenance from DKG
   */
  private async queryProductProvenance(productUAL: string): Promise<any> {
    // Query DKG for product provenance using SPARQL
    const query = `
      PREFIX schema: <https://schema.org/>
      PREFIX prov: <http://www.w3.org/ns/prov#>
      
      DESCRIBE <${productUAL}>
    `;

    try {
      const result = await this.dkgClient.executeSafeQuery(query, 'DESCRIBE');
      return result;
    } catch (error) {
      console.error('Error querying product provenance:', error);
      return null;
    }
  }

  /**
   * Verify product images with Umanitek for authenticity
   */
  private async verifyProductImages(
    imageUrls: string[],
    productUAL: string
  ): Promise<{
    status: 'verified' | 'flagged' | 'pending' | 'error';
    confidence: number;
    matches?: string[];
    evidenceUAL?: string;
  }> {
    try {
      // Import Guardian verification service
      const { GuardianVerificationService } = await import('./guardian-verification');
      const guardianService = new GuardianVerificationService(this.dkgClient);

      // Verify all images
      const verifications = await Promise.all(
        imageUrls.map(url => guardianService.verifyContent(url, 'image', 'all'))
      );

      // Check if any verification failed
      const anyFlagged = verifications.some(v => v.status === 'flagged');
      const avgConfidence = verifications.reduce((sum, v) => sum + (v.confidence || 0), 0) / verifications.length;
      const allMatches = verifications.flatMap(v => v.matches || []);

      if (anyFlagged) {
        return {
          status: 'flagged',
          confidence: avgConfidence,
          matches: allMatches
        };
      }

      // Create verification evidence KA
      const evidenceUAL = await guardianService.createVerificationCommunityNote(
        productUAL,
        {
          status: 'verified',
          confidence: avgConfidence,
          matches: [],
          recommendedAction: 'allow'
        },
        'did:dkg:umanitek-guardian'
      );

      return {
        status: 'verified',
        confidence: avgConfidence,
        evidenceUAL: evidenceUAL.ual
      };
    } catch (error: any) {
      console.error('Error verifying images with Umanitek:', error);
      return {
        status: 'error',
        confidence: 0,
        matches: [error.message]
      };
    }
  }

  /**
   * Publish Delivery Evidence KA to DKG
   */
  private async publishDeliveryEvidence(
    exchangeId: string,
    evidence: DeliveryEvidence
  ): Promise<string> {
    const deliveryEvidenceKA = {
      '@context': {
        'schema': 'https://schema.org/',
        'prov': 'http://www.w3.org/ns/prov#',
        'dotrep': 'https://dotrep.io/ontology/'
      },
      '@type': 'schema:DeliveryEvent',
      '@id': `urn:deliveryEvidence:${exchangeId}`,
      'schema:identifier': exchangeId,
      'prov:generatedAtTime': new Date(evidence.deliveredAt).toISOString(),
      'schema:deliveryStatus': evidence.buyerConfirmed ? 'confirmed' : 'pending',
      'dotrep:trackingNumber': evidence.trackingNumber,
      'dotrep:deliveryImages': evidence.images || [],
      'dotrep:buyerConfirmed': evidence.buyerConfirmed || false,
      ...(evidence.umanitekVerification ? {
        'dotrep:umanitekVerification': {
          '@type': 'dotrep:UmanitekVerification',
          'dotrep:passed': evidence.umanitekVerification.passed,
          'dotrep:confidence': evidence.umanitekVerification.confidence,
          'dotrep:verificationUAL': evidence.umanitekVerification.verificationUAL
        }
      } : {})
    };

    // Publish to DKG (simplified - would use proper publish method)
    console.log('📤 Publishing Delivery Evidence KA...');
    // In production, would call dkgClient.publish with deliveryEvidenceKA
    
    return `urn:ual:dotrep:delivery:${exchangeId}`;
  }

  /**
   * Publish Release Evidence KA for escrow release
   */
  private async publishReleaseEvidence(data: {
    exchangeId: string;
    deliveryEvidence: DeliveryEvidence;
    releaseTransactionHash?: string;
  }): Promise<string> {
    const releaseEvidenceKA = {
      '@context': {
        'schema': 'https://schema.org/',
        'prov': 'http://www.w3.org/ns/prov#',
        'dotrep': 'https://dotrep.io/ontology/'
      },
      '@type': 'dotrep:EscrowRelease',
      '@id': `urn:releaseEvidence:${data.exchangeId}`,
      'schema:identifier': data.exchangeId,
      'prov:generatedAtTime': new Date().toISOString(),
      'dotrep:releaseTransactionHash': data.releaseTransactionHash,
      'dotrep:deliveryEvidenceUAL': `urn:ual:dotrep:delivery:${data.exchangeId}`,
      'dotrep:autoReleased': true
    };

    console.log('📤 Publishing Release Evidence KA...');
    return `urn:ual:dotrep:release:${data.exchangeId}`;
  }

  /**
   * Validate payment proof from x402
   */
  private validatePaymentProof(
    proof: { txHash: string; signature?: string; facilitatorSig?: string; blockNumber?: number },
    expectedAmount: string,
    expectedCurrency: string
  ): boolean {
    // Basic validation - in production, would verify on-chain transaction
    return !!proof.txHash && proof.txHash.startsWith('0x');
  }

  /**
   * Get product owner from DKG (would query in production)
   */
  private getProductOwner(productUAL: string): string {
    // Would query DKG for product owner
    // For now, return a placeholder
    return '0x0000000000000000000000000000000000000000';
  }

  /**
   * Compute content hash for delivery evidence
   */
  private computeContentHash(evidence: DeliveryEvidence): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256')
      .update(JSON.stringify({
        exchangeId: evidence.exchangeId,
        trackingNumber: evidence.trackingNumber,
        deliveredAt: evidence.deliveredAt,
        buyerConfirmed: evidence.buyerConfirmed
      }))
      .digest('hex');
  }
}

/**
 * Factory function to create E-Commerce Service
 */
export function createECommerceService(dkgClient: DKGClientV8): ECommerceService {
  return new ECommerceService(dkgClient);
}

export default ECommerceService;
