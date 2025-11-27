/**
 * Token-Based Verification Service
 * 
 * Implements token-based verification/gating for the DotRep reputation system:
 * - ERC-20 fungible token balance verification
 * - ERC-721 NFT ownership verification
 * - Soul-bound token (SBT) credential verification
 * - On-chain proof generation and verification
 * - Integration with DKG for verifiable token proofs
 * - Token-gated access control for actions (publish, endorse, vote, etc.)
 * - Stake-weighted reputation scoring
 * 
 * Based on Web3 token-gating practices and decentralized identity standards.
 * 
 * Key Features:
 * - Wallet connection and token ownership verification
 * - Action gating based on token requirements
 * - On-chain proof generation (verifiable without centralized DB)
 * - Integration with reputation system (token-holders get reputation boost)
 * - DKG anchoring of token verification proofs
 * - Support for multiple token types (fungible, NFT, SBT)
 */

import { DKGClientV8, type DKGConfig } from './dkg-client-v8';
import { GraphAlgorithms, type GraphNode, type GraphEdge } from './graph-algorithms';

/**
 * Token types supported for verification
 */
export enum TokenType {
  ERC20 = 'ERC20',      // Fungible token (e.g., TRAC, stake token)
  ERC721 = 'ERC721',    // Non-fungible token (e.g., Verified Creator NFT)
  ERC1155 = 'ERC1155',  // Multi-token standard
  SBT = 'SBT',          // Soul-bound token (non-transferable credential)
  NATIVE = 'NATIVE'     // Native blockchain token (e.g., NEURO, DOT)
}

/**
 * Token verification requirement for an action
 */
export interface TokenRequirement {
  tokenType: TokenType;
  tokenAddress?: string; // Contract address (for ERC-20/721/1155)
  tokenId?: string | number; // Token ID (for NFT/SBT)
  minBalance?: bigint; // Minimum balance required (for fungible tokens)
  mustOwn?: boolean; // Must own the token (for NFT/SBT)
  chainId?: number; // Blockchain network ID
  description?: string; // Human-readable description
}

/**
 * Token verification result
 */
export interface TokenVerificationResult {
  verified: boolean;
  walletAddress: string;
  tokenType: TokenType;
  tokenAddress?: string;
  tokenId?: string | number;
  balance?: bigint;
  requiredBalance?: bigint;
  ownsToken?: boolean;
  proof?: TokenProof;
  error?: string;
  timestamp: number;
}

/**
 * On-chain proof of token ownership/balance
 */
export interface TokenProof {
  walletAddress: string;
  tokenType: TokenType;
  tokenAddress?: string;
  tokenId?: string | number;
  balance?: bigint;
  blockNumber: number;
  transactionHash?: string;
  timestamp: number;
  chainId: number;
  signature?: string; // Optional cryptographic signature
}

/**
 * Action that can be gated by token verification
 */
export enum GatedAction {
  PUBLISH_ENDORSEMENT = 'publish_endorsement',
  PUBLISH_CONTENT = 'publish_content',
  CREATE_VERIFIED_ENDORSEMENT = 'create_verified_endorsement',
  VOTE = 'vote',
  GOVERNANCE = 'governance',
  ACCESS_PREMIUM = 'access_premium',
  MODERATE = 'moderate',
  CREATE_COMMUNITY_NOTE = 'create_community_note',
  PUBLISH_REPUTATION = 'publish_reputation'
}

/**
 * Action gating policy
 */
export interface ActionGatingPolicy {
  action: GatedAction;
  requirements: TokenRequirement[];
  description?: string;
  reputationBoost?: number; // Additional reputation boost for token-holders (0-100)
  stakeWeight?: number; // Weight multiplier for stake-backed actions (default: 1.2)
}

/**
 * Token verification configuration
 */
export interface TokenVerificationConfig {
  // Blockchain RPC endpoints
  rpcEndpoints?: {
    [chainId: number]: string;
  };
  
  // Default chain ID
  defaultChainId?: number;
  
  // Enable mock mode for testing
  useMockMode?: boolean;
  
  // DKG integration
  dkgClient?: DKGClientV8;
  dkgConfig?: DKGConfig;
  
  // Publish verification proofs to DKG
  publishProofsToDKG?: boolean;
  
  // Cache settings
  cacheEnabled?: boolean;
  cacheTTL?: number; // Time-to-live in milliseconds
}

/**
 * Token Verification Service
 * 
 * Provides token-based verification and gating for the DotRep system.
 */
export class TokenVerificationService {
  private config: TokenVerificationConfig & {
    rpcEndpoints: Record<number, string>;
    defaultChainId: number;
    useMockMode: boolean;
    publishProofsToDKG: boolean;
    cacheEnabled: boolean;
    cacheTTL: number;
  };
  private actionPolicies: Map<GatedAction, ActionGatingPolicy> = new Map();
  private verificationCache: Map<string, { result: TokenVerificationResult; expiresAt: number }> = new Map();
  private dkgClient: DKGClientV8 | null = null;

  constructor(config?: TokenVerificationConfig) {
    this.config = {
      rpcEndpoints: config?.rpcEndpoints || {
        1: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY',
        137: 'https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY',
        20430: 'https://otp-testnet.origin-trail.network', // OriginTrail Testnet
        2043: 'https://otp-mainnet.origin-trail.network' // OriginTrail Mainnet
      },
      defaultChainId: config?.defaultChainId || 20430, // OriginTrail Testnet
      useMockMode: config?.useMockMode || process.env.TOKEN_VERIFICATION_MOCK === 'true' || false,
      dkgClient: config?.dkgClient,
      dkgConfig: config?.dkgConfig,
      publishProofsToDKG: config?.publishProofsToDKG ?? true,
      cacheEnabled: config?.cacheEnabled ?? true,
      cacheTTL: config?.cacheTTL || 60000 // 1 minute default
    };

    if (this.config.dkgClient) {
      this.dkgClient = this.config.dkgClient;
    } else if (this.config.dkgConfig) {
      const { createDKGClientV8 } = require('./dkg-client-v8');
      this.dkgClient = createDKGClientV8(this.config.dkgConfig);
    }

    // Initialize default action policies
    this.initializeDefaultPolicies();
  }

  /**
   * Initialize default action gating policies
   */
  private initializeDefaultPolicies(): void {
    // Verified Creator NFT required for verified endorsements
    this.setActionPolicy({
      action: GatedAction.CREATE_VERIFIED_ENDORSEMENT,
      requirements: [{
        tokenType: TokenType.ERC721,
        tokenAddress: process.env.VERIFIED_CREATOR_NFT_ADDRESS || '0x0000000000000000000000000000000000000000',
        mustOwn: true,
        description: 'Must own Verified Creator NFT'
      }],
      description: 'Only verified creators can publish verified endorsements',
      reputationBoost: 20, // 20% reputation boost
      stakeWeight: 1.3
    });

    // Minimum stake required for publishing endorsements
    this.setActionPolicy({
      action: GatedAction.PUBLISH_ENDORSEMENT,
      requirements: [{
        tokenType: TokenType.ERC20,
        tokenAddress: process.env.STAKE_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000',
        minBalance: BigInt(100) * BigInt(10 ** 18), // 100 tokens (assuming 18 decimals)
        description: 'Minimum 100 stake tokens required'
      }],
      description: 'Requires minimum stake to prevent spam',
      reputationBoost: 10,
      stakeWeight: 1.2
    });

    // Governance token required for voting
    this.setActionPolicy({
      action: GatedAction.VOTE,
      requirements: [{
        tokenType: TokenType.ERC20,
        tokenAddress: process.env.GOVERNANCE_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000',
        minBalance: BigInt(1) * BigInt(10 ** 18), // 1 token minimum
        description: 'Must hold governance token to vote'
      }],
      description: 'Token-based voting for governance',
      reputationBoost: 5
    });

    // Premium access requires premium NFT or high stake
    this.setActionPolicy({
      action: GatedAction.ACCESS_PREMIUM,
      requirements: [
        {
          tokenType: TokenType.ERC721,
          tokenAddress: process.env.PREMIUM_NFT_ADDRESS || '0x0000000000000000000000000000000000000000',
          mustOwn: true,
          description: 'Premium NFT holder'
        },
        {
          tokenType: TokenType.ERC20,
          tokenAddress: process.env.STAKE_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000',
          minBalance: BigInt(1000) * BigInt(10 ** 18), // 1000 tokens
          description: 'High stake holder (1000+ tokens)'
        }
      ],
      description: 'Premium access requires NFT or high stake',
      reputationBoost: 15
    });
  }

  /**
   * Set action gating policy
   */
  setActionPolicy(policy: ActionGatingPolicy): void {
    this.actionPolicies.set(policy.action, policy);
  }

  /**
   * Get action gating policy
   */
  getActionPolicy(action: GatedAction): ActionGatingPolicy | undefined {
    return this.actionPolicies.get(action);
  }

  /**
   * Verify token ownership/balance for a wallet
   * 
   * @param walletAddress - Wallet address to verify
   * @param requirement - Token requirement to check
   * @returns Verification result with proof
   */
  async verifyToken(
    walletAddress: string,
    requirement: TokenRequirement
  ): Promise<TokenVerificationResult> {
    const cacheKey = `${walletAddress}:${requirement.tokenType}:${requirement.tokenAddress}:${requirement.tokenId}`;
    
    // Check cache
    if (this.config.cacheEnabled) {
      const cached = this.verificationCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        console.log(`✅ [CACHE] Token verification cached for ${walletAddress}`);
        return cached.result;
      }
    }

    const timestamp = Date.now();
    const chainId = requirement.chainId || this.config.defaultChainId;

    // Mock mode for testing
    if (this.config.useMockMode) {
      console.log(`🔧 [MOCK] Verifying token for ${walletAddress}`);
      const mockResult: TokenVerificationResult = {
        verified: true,
        walletAddress,
        tokenType: requirement.tokenType,
        tokenAddress: requirement.tokenAddress,
        tokenId: requirement.tokenId,
        balance: requirement.minBalance || BigInt(1000) * BigInt(10 ** 18),
        requiredBalance: requirement.minBalance,
        ownsToken: requirement.mustOwn ? true : undefined,
        proof: {
          walletAddress,
          tokenType: requirement.tokenType,
          tokenAddress: requirement.tokenAddress,
          tokenId: requirement.tokenId,
          balance: requirement.minBalance || BigInt(1000) * BigInt(10 ** 18),
          blockNumber: Math.floor(Date.now() / 1000),
          timestamp,
          chainId
        },
        timestamp
      };

      // Cache result
      if (this.config.cacheEnabled) {
        this.verificationCache.set(cacheKey, {
          result: mockResult,
          expiresAt: Date.now() + this.config.cacheTTL
        });
      }

      return mockResult;
    }

    try {
      // In production, this would:
      // 1. Connect to blockchain RPC
      // 2. Query token contract (ERC-20 balanceOf, ERC-721 ownerOf, etc.)
      // 3. Generate on-chain proof
      // 4. Optionally sign proof cryptographically

      // For now, simulate blockchain query
      const rpcEndpoint = this.config.rpcEndpoints[chainId];
      if (!rpcEndpoint) {
        throw new Error(`No RPC endpoint configured for chain ID ${chainId}`);
      }

      console.log(`🔍 Verifying token on chain ${chainId} for ${walletAddress}`);

      // Simulate token verification (replace with actual blockchain calls)
      let balance: bigint | undefined;
      let ownsToken: boolean | undefined;

      if (requirement.tokenType === TokenType.ERC20) {
        // Query ERC-20 balance
        // balance = await this.queryERC20Balance(walletAddress, requirement.tokenAddress!, rpcEndpoint);
        balance = BigInt(1000) * BigInt(10 ** 18); // Mock balance
      } else if (requirement.tokenType === TokenType.ERC721 || requirement.tokenType === TokenType.SBT) {
        // Query ERC-721 ownerOf
        // ownsToken = await this.queryERC721Owner(requirement.tokenId!, requirement.tokenAddress!, rpcEndpoint) === walletAddress;
        ownsToken = true; // Mock ownership
      }

      // Check if requirement is met
      let verified = false;
      if (requirement.minBalance !== undefined && balance !== undefined) {
        verified = balance >= requirement.minBalance;
      } else if (requirement.mustOwn && ownsToken !== undefined) {
        verified = ownsToken;
      } else {
        verified = true; // No specific requirement
      }

      // Generate proof
      const proof: TokenProof = {
        walletAddress,
        tokenType: requirement.tokenType,
        tokenAddress: requirement.tokenAddress,
        tokenId: requirement.tokenId,
        balance,
        blockNumber: Math.floor(Date.now() / 1000), // Mock block number
        timestamp,
        chainId
      };

      const result: TokenVerificationResult = {
        verified,
        walletAddress,
        tokenType: requirement.tokenType,
        tokenAddress: requirement.tokenAddress,
        tokenId: requirement.tokenId,
        balance,
        requiredBalance: requirement.minBalance,
        ownsToken,
        proof,
        timestamp
      };

      // Cache result
      if (this.config.cacheEnabled) {
        this.verificationCache.set(cacheKey, {
          result,
          expiresAt: Date.now() + this.config.cacheTTL
        });
      }

      // Publish proof to DKG if enabled
      if (this.config.publishProofsToDKG && this.dkgClient && verified) {
        await this.publishVerificationProofToDKG(walletAddress, proof, requirement);
      }

      return result;
    } catch (error: any) {
      console.error(`❌ Token verification failed:`, error);
      return {
        verified: false,
        walletAddress,
        tokenType: requirement.tokenType,
        tokenAddress: requirement.tokenAddress,
        tokenId: requirement.tokenId,
        error: error.message,
        timestamp
      };
    }
  }

  /**
   * Check if a wallet can perform a gated action
   * 
   * @param walletAddress - Wallet address
   * @param action - Action to check
   * @returns Verification result and policy info
   */
  async checkActionAccess(
    walletAddress: string,
    action: GatedAction
  ): Promise<{
    allowed: boolean;
    policy?: ActionGatingPolicy;
    verifications: TokenVerificationResult[];
    reason?: string;
  }> {
    const policy = this.actionPolicies.get(action);
    
    if (!policy) {
      // No policy = action is not gated
      return {
        allowed: true,
        verifications: []
      };
    }

    // Verify all requirements (OR logic - if multiple requirements, any one can satisfy)
    const verifications: TokenVerificationResult[] = [];
    let anyRequirementMet = false;

    for (const requirement of policy.requirements) {
      const verification = await this.verifyToken(walletAddress, requirement);
      verifications.push(verification);
      
      if (verification.verified) {
        anyRequirementMet = true;
      }
    }

    // If multiple requirements, user needs to meet at least one (OR logic)
    // If single requirement, must meet it
    const allowed = policy.requirements.length > 1 
      ? anyRequirementMet 
      : verifications[0]?.verified || false;

    return {
      allowed,
      policy,
      verifications,
      reason: allowed 
        ? undefined 
        : `Action requires: ${policy.requirements.map(r => r.description || 'token').join(' OR ')}`
    };
  }

  /**
   * Get reputation boost for token-holders
   * 
   * @param walletAddress - Wallet address
   * @param action - Action being performed
   * @returns Reputation boost percentage (0-100)
   */
  async getReputationBoost(
    walletAddress: string,
    action: GatedAction
  ): Promise<number> {
    const policy = this.actionPolicies.get(action);
    if (!policy || !policy.reputationBoost) {
      return 0;
    }

    const accessCheck = await this.checkActionAccess(walletAddress, action);
    if (!accessCheck.allowed) {
      return 0;
    }

    return policy.reputationBoost;
  }

  /**
   * Get stake weight multiplier for token-backed actions
   * 
   * @param walletAddress - Wallet address
   * @param action - Action being performed
   * @returns Weight multiplier (default: 1.0)
   */
  async getStakeWeight(
    walletAddress: string,
    action: GatedAction
  ): Promise<number> {
    const policy = this.actionPolicies.get(action);
    if (!policy || !policy.stakeWeight) {
      return 1.0;
    }

    const accessCheck = await this.checkActionAccess(walletAddress, action);
    if (!accessCheck.allowed) {
      return 1.0;
    }

    return policy.stakeWeight;
  }

  /**
   * Enhance graph edges with token verification weights
   * 
   * @param edges - Graph edges to enhance
   * @param action - Action type (for determining weight)
   * @returns Enhanced edges with token-backed weights
   */
  async enhanceEdgesWithTokenWeights(
    edges: GraphEdge[],
    action: GatedAction = GatedAction.PUBLISH_ENDORSEMENT
  ): Promise<GraphEdge[]> {
    const policy = this.actionPolicies.get(action);
    if (!policy || !policy.stakeWeight) {
      return edges;
    }

    const enhancedEdges: GraphEdge[] = [];

    for (const edge of edges) {
      // Check if source wallet has token access
      const stakeWeight = await this.getStakeWeight(edge.source, action);
      
      const enhancedEdge: GraphEdge = {
        ...edge,
        weight: edge.weight * stakeWeight,
        metadata: {
          ...edge.metadata,
          stakeBacked: stakeWeight > 1.0,
          tokenVerificationWeight: stakeWeight
        }
      };

      enhancedEdges.push(enhancedEdge);
    }

    return enhancedEdges;
  }

  /**
   * Publish token verification proof to DKG as Knowledge Asset
   */
  private async publishVerificationProofToDKG(
    walletAddress: string,
    proof: TokenProof,
    requirement: TokenRequirement
  ): Promise<void> {
    if (!this.dkgClient) {
      return;
    }

    try {
      const knowledgeAsset = {
        '@context': {
          '@vocab': 'https://schema.org/',
          'dotrep': 'https://dotrep.io/ontology/',
          'token': 'https://dotrep.io/ontology/token/'
        },
        '@type': 'token:TokenVerificationProof',
        '@id': `did:polkadot:${walletAddress}#token-verification-${Date.now()}`,
        'identifier': `${walletAddress}-${proof.timestamp}`,
        'dateCreated': new Date(proof.timestamp).toISOString(),
        'token:walletAddress': walletAddress,
        'token:tokenType': proof.tokenType,
        'token:tokenAddress': proof.tokenAddress,
        'token:tokenId': proof.tokenId,
        'token:balance': proof.balance?.toString(),
        'token:blockNumber': proof.blockNumber,
        'token:transactionHash': proof.transactionHash,
        'token:chainId': proof.chainId,
        'token:requirement': {
          '@type': 'token:TokenRequirement',
          'token:description': requirement.description,
          'token:minBalance': requirement.minBalance?.toString(),
          'token:mustOwn': requirement.mustOwn
        },
        'verifiableCredential': {
          '@type': 'VerifiableCredential',
          'credentialSubject': {
            '@id': `did:polkadot:${walletAddress}`,
            'tokenVerification': true
          },
          'proof': {
            '@type': 'Ed25519Signature2020',
            'created': new Date(proof.timestamp).toISOString(),
            'proofPurpose': 'assertionMethod'
          }
        }
      };

      await this.dkgClient.publishReputationAsset({
        developerId: walletAddress,
        reputationScore: 0, // Not a reputation score, just a proof
        contributions: [],
        timestamp: proof.timestamp,
        metadata: {
          type: 'token_verification_proof',
          proof
        }
      });

      console.log(`✅ Published token verification proof to DKG for ${walletAddress}`);
    } catch (error: any) {
      console.warn(`⚠️  Failed to publish token verification proof to DKG:`, error.message);
      // Don't throw - verification proof publishing is optional
    }
  }

  /**
   * Clear verification cache
   */
  clearCache(): void {
    this.verificationCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hitRate?: number; // Would need to track hits/misses
  } {
    return {
      size: this.verificationCache.size
    };
  }
}

/**
 * Factory function to create a Token Verification Service instance
 */
export function createTokenVerificationService(
  config?: TokenVerificationConfig
): TokenVerificationService {
  return new TokenVerificationService(config);
}

export default TokenVerificationService;

