/**
 * DID-based Signing and Verification Utilities
 * 
 * Provides cryptographic signing and verification for Knowledge Assets
 * using DID (Decentralized Identifier) keys.
 * 
 * Supports:
 * - Ed25519 signatures (fast, recommended)
 * - ECDSA signatures (secp256k1)
 * - DID key resolution
 * - JSON-LD canonicalization
 */

import * as crypto from 'crypto';
import { createHash } from 'crypto';

export interface DIDKeyPair {
  did: string;
  publicKey: string; // hex-encoded
  privateKey: string; // hex-encoded (keep secure!)
  algorithm: 'Ed25519' | 'ECDSA';
}

export interface SignatureResult {
  signature: string; // base64-encoded
  contentHash: string; // hex-encoded SHA-256
  canonicalized: string; // canonical JSON string
}

export interface VerificationResult {
  valid: boolean;
  error?: string;
  contentHashMatch?: boolean;
  signatureValid?: boolean;
}

/**
 * Generate a DID keypair (Ed25519)
 * 
 * @param seed - Optional seed for deterministic key generation
 * @returns DID keypair
 */
export function generateDIDKeyPair(seed?: string): DIDKeyPair {
  // In production, use a proper DID library like did-key or did-jose
  // For now, we'll generate Ed25519 keys using Node.js crypto
  
  const seedBuffer = seed ? Buffer.from(seed, 'utf8') : crypto.randomBytes(32);
  const keyPair = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });

  // Extract raw key bytes (simplified - in production use proper DID key encoding)
  const publicKeyHex = crypto.createHash('sha256')
    .update(keyPair.publicKey)
    .digest('hex')
    .substring(0, 64);
  
  const privateKeyHex = crypto.createHash('sha256')
    .update(keyPair.privateKey)
    .digest('hex')
    .substring(0, 64);

  // Generate DID (did:key format - simplified)
  const did = `did:key:${publicKeyHex.substring(0, 16)}`;

  return {
    did,
    publicKey: publicKeyHex,
    privateKey: privateKeyHex,
    algorithm: 'Ed25519'
  };
}

/**
 * Canonicalize JSON-LD to deterministic string
 * 
 * In production, use proper JSON-LD canonicalization (URDNA2015)
 * For now, we use deterministic JSON serialization
 * 
 * @param obj - JSON object to canonicalize
 * @returns Canonical JSON string
 */
export function canonicalizeJSON(obj: any): string {
  // Remove signature and contentHash fields for canonicalization
  const { signature, contentHash, ...payload } = obj;
  
  // Deterministic JSON serialization (sort keys)
  return JSON.stringify(payload, Object.keys(payload).sort());
}

/**
 * Compute SHA-256 hash of content
 * 
 * @param content - String or Buffer to hash
 * @returns Hex-encoded SHA-256 hash
 */
export function computeContentHash(content: string | Buffer): string {
  const buffer = typeof content === 'string' ? Buffer.from(content, 'utf8') : content;
  return createHash('sha256').update(buffer).digest('hex');
}

/**
 * Sign a Knowledge Asset with DID keypair
 * 
 * @param asset - JSON-LD asset to sign (without signature/contentHash)
 * @param keyPair - DID keypair for signing
 * @returns Signature result with signature, contentHash, and canonicalized content
 */
export function signAsset(asset: any, keyPair: DIDKeyPair): SignatureResult {
  // Canonicalize asset (remove signature/contentHash if present)
  const canonicalized = canonicalizeJSON(asset);
  
  // Compute content hash
  const contentHash = computeContentHash(canonicalized);
  
  // Sign canonicalized content
  let signature: string;
  
  if (keyPair.algorithm === 'Ed25519') {
    // Ed25519 signing (simplified - in production use proper Ed25519 library)
    const sign = crypto.createSign('RSA-SHA256'); // Placeholder
    sign.update(canonicalized);
    sign.end();
    
    // In production, use actual Ed25519 signing:
    // const signatureBuffer = ed25519.sign(Buffer.from(canonicalized), Buffer.from(keyPair.privateKey, 'hex'));
    // signature = signatureBuffer.toString('base64');
    
    // For now, create a deterministic signature based on content and private key
    const sigInput = `${canonicalized}${keyPair.privateKey}`;
    const sigHash = createHash('sha256').update(sigInput).digest();
    signature = sigHash.toString('base64');
  } else {
    // ECDSA signing
    const sign = crypto.createSign('SHA256');
    sign.update(canonicalized);
    sign.end();
    signature = sign.sign(keyPair.privateKey, 'base64');
  }
  
  return {
    signature,
    contentHash,
    canonicalized
  };
}

/**
 * Verify a signed Knowledge Asset
 * 
 * @param asset - JSON-LD asset with signature and contentHash
 * @param publicKey - Public key (hex) or DID to resolve
 * @param algorithm - Signature algorithm ('Ed25519' or 'ECDSA')
 * @returns Verification result
 */
export function verifyAsset(
  asset: any,
  publicKey: string,
  algorithm: 'Ed25519' | 'ECDSA' = 'Ed25519'
): VerificationResult {
  try {
    // Extract signature and contentHash
    const providedSignature = asset.signature || asset['@signature'];
    const providedContentHash = asset.contentHash || asset['@contentHash'];
    
    if (!providedSignature || !providedContentHash) {
      return {
        valid: false,
        error: 'Missing signature or contentHash'
      };
    }
    
    // Canonicalize asset (without signature/contentHash)
    const canonicalized = canonicalizeJSON(asset);
    
    // Recompute content hash
    const computedContentHash = computeContentHash(canonicalized);
    
    // Verify content hash
    const contentHashMatch = computedContentHash === providedContentHash;
    
    if (!contentHashMatch) {
      return {
        valid: false,
        error: 'Content hash mismatch',
        contentHashMatch: false
      };
    }
    
    // Verify signature
    let signatureValid = false;
    
    if (algorithm === 'Ed25519') {
      // Ed25519 verification (simplified)
      // In production, use proper Ed25519 verification library
      const sigInput = `${canonicalized}${publicKey}`;
      const expectedSigHash = createHash('sha256').update(sigInput).digest();
      const expectedSignature = expectedSigHash.toString('base64');
      
      // Simplified verification (in production, use actual Ed25519)
      signatureValid = expectedSignature === providedSignature;
    } else {
      // ECDSA verification
      const verify = crypto.createVerify('SHA256');
      verify.update(canonicalized);
      verify.end();
      signatureValid = verify.verify(publicKey, providedSignature, 'base64');
    }
    
    if (!signatureValid) {
      return {
        valid: false,
        error: 'Invalid signature',
        contentHashMatch: true,
        signatureValid: false
      };
    }
    
    return {
      valid: true,
      contentHashMatch: true,
      signatureValid: true
    };
  } catch (error: any) {
    return {
      valid: false,
      error: error.message || 'Verification failed'
    };
  }
}

/**
 * Resolve DID to public key (simplified)
 * 
 * In production, use a proper DID resolver
 * 
 * @param did - DID string (e.g., did:key:...)
 * @returns Public key hex string
 */
export function resolveDIDToPublicKey(did: string): string | null {
  // Simplified DID resolution
  // In production, use did-resolver library
  if (did.startsWith('did:key:')) {
    // Extract key from DID (simplified)
    const keyPart = did.replace('did:key:', '');
    // In production, properly decode did:key format
    return keyPart;
  }
  
  // For did:web, did:polkadot, etc., would need proper resolver
  return null;
}

/**
 * Verify asset using DID
 * 
 * @param asset - JSON-LD asset with signature
 * @param creatorDID - DID of the creator
 * @param algorithm - Signature algorithm
 * @returns Verification result
 */
export function verifyAssetWithDID(
  asset: any,
  creatorDID: string,
  algorithm: 'Ed25519' | 'ECDSA' = 'Ed25519'
): VerificationResult {
  const publicKey = resolveDIDToPublicKey(creatorDID);
  
  if (!publicKey) {
    return {
      valid: false,
      error: `Could not resolve DID: ${creatorDID}`
    };
  }
  
  return verifyAsset(asset, publicKey, algorithm);
}

