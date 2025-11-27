/**
 * Cross-chain Attestations & Light Clients
 * 
 * Implements standardized XCMP attestation messages so external parachains
 * or apps can verify NeuroWeb Knowledge Asset anchors without heavy sync.
 * Provides light client proofs for asset state.
 */

import { ApiPromise } from "@polkadot/api";
import { HexString } from "@polkadot/util/types";
import * as crypto from 'crypto';

export interface Attestation {
  ual: string;
  merkleProof: string; // Merkle proof path
  blockHeader: string; // Block header hash
  blockNumber: number;
  signer: string; // Account ID or DID
  signature: string;
  timestamp: number;
  parachainId: string;
}

export interface AttestationProof {
  attestation: Attestation;
  merkleRoot: string;
  proofPath: Array<{
    left?: string;
    right?: string;
  }>;
}

export interface VerificationResult {
  verified: boolean;
  errors: string[];
  attestation: Attestation;
}

/**
 * Cross-chain Attestation Generator
 */
export class CrossChainAttestationGenerator {
  /**
   * Generate an attestation for a Knowledge Asset UAL
   */
  static async generateAttestation(
    ual: string,
    blockNumber: number,
    blockHeader: string,
    signer: string,
    parachainId: string,
    merkleProof?: string
  ): Promise<Attestation> {
    const attestation: Attestation = {
      ual,
      merkleProof: merkleProof || '',
      blockHeader,
      blockNumber,
      signer,
      signature: '', // Will be signed externally
      timestamp: Date.now(),
      parachainId
    };

    // In production, would sign with signer's private key
    // For now, return unsigned attestation
    return attestation;
  }

  /**
   * Generate a Merkle proof for an asset in a block
   */
  static generateMerkleProof(
    assetHash: string,
    allAssetHashes: string[]
  ): AttestationProof['proofPath'] {
    // Sort hashes for consistent Merkle tree
    const sortedHashes = [...allAssetHashes].sort();
    const proofPath: AttestationProof['proofPath'] = [];

    // Find index of our hash
    const index = sortedHashes.indexOf(assetHash);
    if (index === -1) {
      throw new Error('Asset hash not found in list');
    }

    // Build proof path (simplified - in production would use proper Merkle tree)
    let currentLevel = sortedHashes.map(h => this.hash(h));
    let currentIndex = index;

    while (currentLevel.length > 1) {
      if (currentIndex % 2 === 0) {
        // Left node - need right sibling
        if (currentIndex + 1 < currentLevel.length) {
          proofPath.push({ right: currentLevel[currentIndex + 1] });
        }
      } else {
        // Right node - need left sibling
        proofPath.push({ left: currentLevel[currentIndex - 1] });
      }

      // Move to next level
      const nextLevel: string[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        if (i + 1 < currentLevel.length) {
          nextLevel.push(this.hash(currentLevel[i] + currentLevel[i + 1]));
        } else {
          nextLevel.push(currentLevel[i]);
        }
      }

      currentLevel = nextLevel;
      currentIndex = Math.floor(currentIndex / 2);
    }

    return proofPath;
  }

  /**
   * Compute Merkle root from proof path
   */
  static computeMerkleRoot(
    leafHash: string,
    proofPath: AttestationProof['proofPath']
  ): string {
    let currentHash = this.hash(leafHash);

    for (const step of proofPath) {
      if (step.left) {
        currentHash = this.hash(step.left + currentHash);
      } else if (step.right) {
        currentHash = this.hash(currentHash + step.right);
      }
    }

    return currentHash;
  }

  /**
   * Hash a string (SHA-256)
   */
  private static hash(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex');
  }
}

/**
 * Cross-chain Attestation Verifier
 */
export class CrossChainAttestationVerifier {
  private polkadotApi: ApiPromise;

  constructor(polkadotApi: ApiPromise) {
    this.polkadotApi = polkadotApi;
  }

  /**
   * Verify an attestation without full chain sync (light client)
   */
  async verifyAttestation(
    attestation: Attestation,
    expectedMerkleRoot?: string
  ): Promise<VerificationResult> {
    const errors: string[] = [];

    // 1. Verify signature (if provided)
    if (attestation.signature) {
      const signatureValid = await this.verifySignature(attestation);
      if (!signatureValid) {
        errors.push('Invalid signature');
      }
    }

    // 2. Verify block header (light client check)
    try {
      const blockNumber = typeof attestation.blockNumber === 'number' 
        ? attestation.blockNumber 
        : parseInt(String(attestation.blockNumber), 10);
      const header = await this.polkadotApi.rpc.chain.getHeader(
        blockNumber
      );

      const headerHash = header.hash.toString();
      if (headerHash !== attestation.blockHeader) {
        errors.push('Block header mismatch');
      }
    } catch (error: any) {
      errors.push(`Failed to verify block header: ${error.message}`);
    }

    // 3. Verify Merkle proof if provided
    if (attestation.merkleProof && expectedMerkleRoot) {
      try {
        // Parse and verify Merkle proof
        const proofPath = JSON.parse(attestation.merkleProof);
        const computedRoot = CrossChainAttestationGenerator.computeMerkleRoot(
          this.hashUAL(attestation.ual),
          proofPath
        );

        if (computedRoot !== expectedMerkleRoot) {
          errors.push('Merkle proof verification failed');
        }
      } catch (error: any) {
        errors.push(`Merkle proof error: ${error.message}`);
      }
    }

    // 4. Check timestamp is reasonable
    const age = Date.now() - attestation.timestamp;
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    if (age > maxAge) {
      errors.push('Attestation too old');
    }

    return {
      verified: errors.length === 0,
      errors,
      attestation
    };
  }

  /**
   * Batch verify multiple attestations
   */
  async verifyAttestations(
    attestations: Attestation[],
    expectedMerkleRoots?: Map<string, string>
  ): Promise<VerificationResult[]> {
    const results = await Promise.all(
      attestations.map(attestation =>
        this.verifyAttestation(
          attestation,
          expectedMerkleRoots?.get(attestation.ual)
        )
      )
    );

    return results;
  }

  /**
   * Verify signature (placeholder - would use actual cryptographic verification)
   */
  private async verifySignature(attestation: Attestation): Promise<boolean> {
    // In production, would verify Ed25519 or SR25519 signature
    // For now, just check signature exists
    return !!attestation.signature && attestation.signature.length > 0;
  }

  /**
   * Hash UAL for Merkle tree
   */
  private hashUAL(ual: string): string {
    return crypto.createHash('sha256').update(ual).digest('hex');
  }
}

/**
 * Format attestation for XCMP message
 */
export function formatAttestationForXCMP(attestation: Attestation): HexString {
  const payload = {
    ual: attestation.ual,
    blockHeader: attestation.blockHeader,
    blockNumber: attestation.blockNumber,
    signer: attestation.signer,
    signature: attestation.signature,
    timestamp: attestation.timestamp,
    parachainId: attestation.parachainId
  };

  // In production, would properly encode for XCMP
  return JSON.stringify(payload) as HexString;
}

/**
 * Parse XCMP message to attestation
 */
export function parseAttestationFromXCMP(message: HexString): Attestation | null {
  try {
    const payload = JSON.parse(message);
    return {
      ual: payload.ual,
      merkleProof: payload.merkleProof || '',
      blockHeader: payload.blockHeader,
      blockNumber: payload.blockNumber,
      signer: payload.signer,
      signature: payload.signature,
      timestamp: payload.timestamp,
      parachainId: payload.parachainId
    };
  } catch (error) {
    return null;
  }
}

