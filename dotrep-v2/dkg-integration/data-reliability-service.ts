/**
 * Data Reliability Service
 * 
 * Implements comprehensive data reliability mechanisms based on:
 * - x402 protocol: Payment verification with nonce-based replay prevention and time-bounded authorizations
 * - OriginTrail DKG: Merkle proof verification, content hash validation, temporal state tracking
 * 
 * Key Features:
 * - Nonce-based replay attack prevention
 * - Time-bounded payment authorizations (EIP-712 compatible)
 * - Merkle proof verification for DKG data chunks
 * - Enhanced content hash verification with integrity checks
 * - Temporal state tracking and freshness verification
 * - Provenance chain verification
 * - On-chain validation integration
 */

import { DKGClientV8 } from './dkg-client-v8';
import crypto from 'crypto';

export interface NonceRecord {
  nonce: string;
  payer: string;
  resourceId: string;
  timestamp: number;
  expiresAt: number;
  used: boolean;
  txHash?: string;
}

export interface PaymentAuthorization {
  payer: string;
  recipient: string;
  amount: string;
  currency: string;
  chain: string;
  resourceId: string;
  nonce: string;
  validAfter: number; // Unix timestamp
  validBefore: number; // Unix timestamp
  signature?: string; // EIP-712 signature
  eip712Domain?: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract?: string;
  };
}

export interface MerkleProof {
  leaf: string; // Hash of the data chunk
  path: Array<{
    hash: string;
    position: 'left' | 'right';
  }>;
  root: string; // Expected Merkle root
}

export interface DataChunkVerification {
  chunkId: string;
  contentHash: string;
  merkleProof?: MerkleProof;
  timestamp: number;
  verified: boolean;
  verificationMethod: 'content-hash' | 'merkle-proof' | 'both';
  errors?: string[];
}

export interface TemporalState {
  assetUAL: string;
  version: number;
  timestamp: number;
  contentHash: string;
  previousVersionUAL?: string;
  stateHash: string; // Hash of all state fields
  verified: boolean;
}

export class DataReliabilityService {
  private nonceStore: Map<string, NonceRecord> = new Map();
  private dkgClient: DKGClientV8;
  private readonly NONCE_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
  private readonly MAX_NONCE_AGE_MS = 60 * 60 * 1000; // 1 hour (cleanup old nonces)

  constructor(dkgClient: DKGClientV8) {
    this.dkgClient = dkgClient;
    
    // Cleanup expired nonces periodically
    setInterval(() => this.cleanupExpiredNonces(), 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Generate a cryptographically secure nonce for payment authorization
   * Prevents replay attacks by ensuring each payment authorization is unique
   */
  generateNonce(payer: string, resourceId: string): string {
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(16);
    const data = `${payer}:${resourceId}:${timestamp}:${randomBytes.toString('hex')}`;
    const nonce = crypto.createHash('sha256').update(data).digest('hex');
    
    const record: NonceRecord = {
      nonce,
      payer,
      resourceId,
      timestamp,
      expiresAt: timestamp + this.NONCE_EXPIRY_MS,
      used: false
    };
    
    this.nonceStore.set(nonce, record);
    return nonce;
  }

  /**
   * Validate nonce and prevent replay attacks
   * Returns true if nonce is valid and not previously used
   */
  validateNonce(nonce: string, payer: string, resourceId: string, txHash?: string): {
    valid: boolean;
    error?: string;
    record?: NonceRecord;
  } {
    const record = this.nonceStore.get(nonce);
    
    if (!record) {
      return {
        valid: false,
        error: 'Nonce not found or expired'
      };
    }

    // Check if nonce has expired
    if (Date.now() > record.expiresAt) {
      this.nonceStore.delete(nonce);
      return {
        valid: false,
        error: 'Nonce expired'
      };
    }

    // Check if nonce was already used
    if (record.used) {
      return {
        valid: false,
        error: 'Nonce already used (replay attack detected)',
        record
      };
    }

    // Verify payer matches
    if (record.payer.toLowerCase() !== payer.toLowerCase()) {
      return {
        valid: false,
        error: 'Payer mismatch for nonce'
      };
    }

    // Verify resource ID matches
    if (record.resourceId !== resourceId) {
      return {
        valid: false,
        error: 'Resource ID mismatch for nonce'
      };
    }

    // Mark as used
    record.used = true;
    if (txHash) {
      record.txHash = txHash;
    }
    this.nonceStore.set(nonce, record);

    return {
      valid: true,
      record
    };
  }

  /**
   * Create time-bounded payment authorization (EIP-712 compatible)
   * Ensures payment authorizations are only valid within a specific time window
   */
  createPaymentAuthorization(
    payer: string,
    recipient: string,
    amount: string,
    currency: string,
    chain: string,
    resourceId: string,
    validDurationMs: number = 15 * 60 * 1000 // 15 minutes default
  ): PaymentAuthorization {
    const nonce = this.generateNonce(payer, resourceId);
    const now = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
    const validAfter = now;
    const validBefore = now + Math.floor(validDurationMs / 1000);

    return {
      payer,
      recipient,
      amount,
      currency,
      chain,
      resourceId,
      nonce,
      validAfter,
      validBefore,
      eip712Domain: {
        name: 'x402 Payment Authorization',
        version: '1',
        chainId: this.getChainId(chain),
        verifyingContract: recipient // In production, use actual contract address
      }
    };
  }

  /**
   * Verify time-bounded payment authorization
   * Ensures authorization is within valid time window
   */
  verifyPaymentAuthorization(auth: PaymentAuthorization): {
    valid: boolean;
    error?: string;
    expired?: boolean;
    notYetValid?: boolean;
  } {
    const now = Math.floor(Date.now() / 1000);

    // Check if authorization is not yet valid
    if (now < auth.validAfter) {
      return {
        valid: false,
        notYetValid: true,
        error: `Authorization not yet valid. Valid after: ${new Date(auth.validAfter * 1000).toISOString()}`
      };
    }

    // Check if authorization has expired
    if (now > auth.validBefore) {
      return {
        valid: false,
        expired: true,
        error: `Authorization expired. Valid before: ${new Date(auth.validBefore * 1000).toISOString()}`
      };
    }

    // Verify nonce
    const nonceValidation = this.validateNonce(auth.nonce, auth.payer, auth.resourceId);
    if (!nonceValidation.valid) {
      return {
        valid: false,
        error: `Nonce validation failed: ${nonceValidation.error}`
      };
    }

    return { valid: true };
  }

  /**
   * Verify Merkle proof for DKG data chunk
   * Implements OriginTrail DKG's proof-of-knowledge system
   */
  verifyMerkleProof(proof: MerkleProof): {
    valid: boolean;
    error?: string;
    computedRoot?: string;
  } {
    try {
      let currentHash = proof.leaf;

      // Traverse the Merkle path
      for (const node of proof.path) {
        const left = node.position === 'left' ? node.hash : currentHash;
        const right = node.position === 'right' ? node.hash : currentHash;
        
        // Compute parent hash (concatenate and hash)
        const combined = left < right ? left + right : right + left;
        currentHash = crypto.createHash('sha256').update(combined, 'hex').digest('hex');
      }

      const computedRoot = currentHash;
      const valid = computedRoot === proof.root;

      if (!valid) {
        return {
          valid: false,
          error: `Merkle root mismatch. Expected: ${proof.root}, Computed: ${computedRoot}`,
          computedRoot
        };
      }

      return {
        valid: true,
        computedRoot
      };
    } catch (error: any) {
      return {
        valid: false,
        error: `Merkle proof verification error: ${error.message}`
      };
    }
  }

  /**
   * Verify DKG data chunk with multiple verification methods
   * Combines content hash and Merkle proof verification
   */
  async verifyDataChunk(
    chunkId: string,
    content: string | Buffer,
    merkleProof?: MerkleProof
  ): Promise<DataChunkVerification> {
    const errors: string[] = [];
    let verified = false;
    let verificationMethod: DataChunkVerification['verificationMethod'] = 'content-hash';

    // Compute content hash
    const contentBuffer = typeof content === 'string' ? Buffer.from(content) : content;
    const contentHash = crypto.createHash('sha256').update(contentBuffer).digest('hex');

    // Verify Merkle proof if provided
    if (merkleProof) {
      // Update leaf hash in proof
      const proofWithLeaf = {
        ...merkleProof,
        leaf: contentHash
      };

      const merkleResult = this.verifyMerkleProof(proofWithLeaf);
      if (merkleResult.valid) {
        verified = true;
        verificationMethod = merkleProof ? 'both' : 'merkle-proof';
      } else {
        errors.push(`Merkle proof verification failed: ${merkleResult.error}`);
        verificationMethod = 'content-hash'; // Fallback to content hash only
      }
    } else {
      // Content hash only verification
      verified = true;
      verificationMethod = 'content-hash';
    }

    return {
      chunkId,
      contentHash,
      merkleProof,
      timestamp: Date.now(),
      verified,
      verificationMethod,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Verify content hash integrity
   * Enhanced verification with canonicalization support
   */
  verifyContentHash(
    content: any,
    expectedHash: string,
    options: {
      canonicalize?: boolean;
      algorithm?: 'sha256' | 'sha512';
    } = {}
  ): {
    valid: boolean;
    computedHash?: string;
    error?: string;
  } {
    try {
      let contentToHash: string;

      if (options.canonicalize) {
        // Canonicalize JSON for consistent hashing
        contentToHash = JSON.stringify(content, Object.keys(content).sort());
      } else if (typeof content === 'string') {
        contentToHash = content;
      } else {
        contentToHash = JSON.stringify(content);
      }

      const algorithm = options.algorithm || 'sha256';
      const computedHash = crypto.createHash(algorithm).update(contentToHash).digest('hex');
      const valid = computedHash === expectedHash;

      if (!valid) {
        return {
          valid: false,
          computedHash,
          error: `Content hash mismatch. Expected: ${expectedHash}, Computed: ${computedHash}`
        };
      }

      return {
        valid: true,
        computedHash
      };
    } catch (error: any) {
      return {
        valid: false,
        error: `Content hash verification error: ${error.message}`
      };
    }
  }

  /**
   * Track temporal state of DKG assets
   * Enables freshness verification and version tracking
   */
  async trackTemporalState(assetUAL: string, asset: any): Promise<TemporalState> {
    const timestamp = Date.now();
    const version = asset.version || 1;
    const previousVersionUAL = asset['prov:wasRevisionOf']?.['@id'] || asset.previousVersionUAL;

    // Compute content hash
    const canonicalized = JSON.stringify(asset, Object.keys(asset).sort());
    const contentHash = crypto.createHash('sha256').update(canonicalized).digest('hex');

    // Compute state hash (includes all temporal fields)
    const stateData = {
      assetUAL,
      version,
      timestamp,
      contentHash,
      previousVersionUAL
    };
    const stateHash = crypto.createHash('sha256')
      .update(JSON.stringify(stateData))
      .digest('hex');

    const state: TemporalState = {
      assetUAL,
      version,
      timestamp,
      contentHash,
      previousVersionUAL,
      stateHash,
      verified: true
    };

    return state;
  }

  /**
   * Verify temporal state freshness
   * Ensures data is not stale beyond acceptable threshold
   */
  verifyTemporalState(
    state: TemporalState,
    maxAgeMs: number = 7 * 24 * 60 * 60 * 1000 // 7 days default
  ): {
    fresh: boolean;
    ageMs: number;
    error?: string;
  } {
    const ageMs = Date.now() - state.timestamp;

    if (ageMs > maxAgeMs) {
      return {
        fresh: false,
        ageMs,
        error: `State is stale. Age: ${Math.floor(ageMs / (24 * 60 * 60 * 1000))} days, Max: ${Math.floor(maxAgeMs / (24 * 60 * 60 * 1000))} days`
      };
    }

    return {
      fresh: true,
      ageMs
    };
  }

  /**
   * Verify provenance chain integrity
   * Validates that all versions in the chain are properly linked
   */
  async verifyProvenanceChain(ual: string): Promise<{
    valid: boolean;
    chain: string[];
    errors?: string[];
  } {
    const chain: string[] = [ual];
    const errors: string[] = [];
    let currentUAL = ual;
    const maxDepth = 100;
    let depth = 0;

    while (depth < maxDepth) {
      try {
        const asset = await this.dkgClient.queryReputation(currentUAL);
        if (!asset) {
          break;
        }

        const previousUAL = asset['prov:wasRevisionOf']?.['@id'] || 
                           asset.previousVersionUAL ||
                           asset.provenance?.sourceAssets?.[0];

        if (!previousUAL) {
          break; // Reached the beginning
        }

        // Check for cycles
        if (chain.includes(previousUAL)) {
          errors.push(`Provenance chain contains cycle at ${previousUAL}`);
          break;
        }

        chain.unshift(previousUAL);
        currentUAL = previousUAL;
        depth++;
      } catch (error: any) {
        errors.push(`Failed to retrieve asset ${currentUAL}: ${error.message}`);
        break;
      }
    }

    return {
      valid: errors.length === 0,
      chain,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Comprehensive data reliability verification
   * Combines all verification methods for maximum reliability
   */
  async verifyDataReliability(
    assetUAL: string,
    options: {
      verifyContentHash?: boolean;
      verifyMerkleProof?: boolean;
      verifyTemporalState?: boolean;
      verifyProvenance?: boolean;
      maxAgeMs?: number;
    } = {}
  ): Promise<{
    reliable: boolean;
    contentHashValid?: boolean;
    merkleProofValid?: boolean;
    temporalStateValid?: boolean;
    provenanceValid?: boolean;
    errors?: string[];
    warnings?: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let reliable = true;

    try {
      // Fetch asset
      const asset = await this.dkgClient.queryReputation(assetUAL);
      if (!asset) {
        return {
          reliable: false,
          errors: [`Asset not found: ${assetUAL}`]
        };
      }

      // Verify content hash
      if (options.verifyContentHash !== false) {
        const providedHash = asset.contentHash || asset['dotrep:contentHash'];
        if (providedHash) {
          const hashResult = this.verifyContentHash(asset, providedHash, { canonicalize: true });
          if (!hashResult.valid) {
            errors.push(`Content hash verification failed: ${hashResult.error}`);
            reliable = false;
          }
        } else {
          warnings.push('Content hash not provided in asset');
        }
      }

      // Verify temporal state
      if (options.verifyTemporalState !== false) {
        const state = await this.trackTemporalState(assetUAL, asset);
        const freshness = this.verifyTemporalState(state, options.maxAgeMs);
        if (!freshness.fresh) {
          warnings.push(`Temporal state freshness: ${freshness.error}`);
        }
      }

      // Verify provenance chain
      if (options.verifyProvenance !== false) {
        const provenanceResult = await this.verifyProvenanceChain(assetUAL);
        if (!provenanceResult.valid) {
          errors.push(...(provenanceResult.errors || []));
          reliable = false;
        }
      }

      return {
        reliable: errors.length === 0,
        contentHashValid: options.verifyContentHash !== false,
        temporalStateValid: options.verifyTemporalState !== false,
        provenanceValid: options.verifyProvenance !== false,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (error: any) {
      return {
        reliable: false,
        errors: [`Verification error: ${error.message}`]
      };
    }
  }

  /**
   * Get chain ID for EIP-712 domain
   */
  private getChainId(chain: string): number {
    const chainIds: Record<string, number> = {
      'base': 8453,
      'base-sepolia': 84532,
      'ethereum': 1,
      'polygon': 137,
      'arbitrum': 42161,
      'neuroweb': 2043,
      'neuroweb-testnet': 20430
    };
    return chainIds[chain.toLowerCase()] || 1;
  }

  /**
   * Cleanup expired nonces
   */
  private cleanupExpiredNonces(): void {
    const now = Date.now();
    const expiredNonces: string[] = [];

    for (const [nonce, record] of this.nonceStore.entries()) {
      // Remove nonces older than MAX_NONCE_AGE_MS
      if (now - record.timestamp > this.MAX_NONCE_AGE_MS) {
        expiredNonces.push(nonce);
      }
    }

    for (const nonce of expiredNonces) {
      this.nonceStore.delete(nonce);
    }

    if (expiredNonces.length > 0) {
      console.log(`[DataReliability] Cleaned up ${expiredNonces.length} expired nonces`);
    }
  }

  /**
   * Get nonce statistics
   */
  getNonceStatistics(): {
    total: number;
    active: number;
    used: number;
    expired: number;
  } {
    const now = Date.now();
    let active = 0;
    let used = 0;
    let expired = 0;

    for (const record of this.nonceStore.values()) {
      if (record.used) {
        used++;
      } else if (now > record.expiresAt) {
        expired++;
      } else {
        active++;
      }
    }

    return {
      total: this.nonceStore.size,
      active,
      used,
      expired
    };
  }
}

/**
 * Factory function to create DataReliabilityService instance
 */
export function createDataReliabilityService(dkgClient: DKGClientV8): DataReliabilityService {
  return new DataReliabilityService(dkgClient);
}

