/**
 * Identity & Trust Tokenomics Service
 * 
 * Comprehensive tokenomics system for identity verification and Sybil resistance:
 * - Proof-of-Personhood (PoP) integration (Worldcoin, Humanity Protocol)
 * - Soulbound Tokens (SBTs) for non-transferable credentials
 * - Economic staking for account creation and trust signals
 * - Token-Curated Registry (TCR) for community verification
 * - On-chain behavior analysis for Sybil detection
 * - DKG integration for storing verifiable credentials
 * 
 * Key Features:
 * - Require stake for account creation (raises cost of Sybil attacks)
 * - Issue SBTs to verified humans (stored on DKG)
 * - Community staking/voting to validate users
 * - On-chain behavior signals for trust scoring
 * - Integration with existing staking and token verification systems
 */

import { DKGClientV8, type DKGConfig, type PublishResult } from './dkg-client-v8';
import { TokenVerificationService, TokenType, type TokenRequirement } from './token-verification-service';

/**
 * Proof-of-Personhood provider types
 */
export enum PoPProvider {
  WORLDCOIN = 'worldcoin',      // World ID (hardware Orb verification)
  HUMANITY_PROTOCOL = 'humanity', // Palm recognition
  BRIGHTID = 'brightid',        // Social graph verification
  CIVIC = 'civic',              // Government ID verification
  CUSTOM = 'custom'             // Custom verification method
}

/**
 * Soulbound Token credential types
 */
export enum CredentialType {
  PROOF_OF_HUMANITY = 'proof_of_humanity',
  VERIFIED_ACCOUNT = 'verified_account',
  COMMUNITY_ENDORSED = 'community_endorsed',
  STAKE_VERIFIED = 'stake_verified',
  BEHAVIOR_VERIFIED = 'behavior_verified',
  PREMIUM_MEMBER = 'premium_member'
}

/**
 * Account creation requirement
 */
export interface AccountCreationRequirement {
  requireStake: boolean;
  minStakeAmount: bigint; // Minimum stake required (e.g., 100 TRAC)
  stakeTokenAddress?: string; // Token contract address
  stakeLockPeriod?: number; // Days stake must be locked
  requirePoP?: boolean; // Require Proof-of-Personhood
  popProvider?: PoPProvider;
  allowCommunityVouch?: boolean; // Allow existing users to vouch
}

/**
 * Proof-of-Personhood verification result
 */
export interface PoPVerificationResult {
  verified: boolean;
  provider: PoPProvider;
  proof: string; // ZK proof or verification token
  timestamp: number;
  expiresAt?: number;
  error?: string;
}

/**
 * Soulbound Token credential
 */
export interface SBTCredential {
  credentialId: string; // Unique credential ID
  credentialType: CredentialType;
  recipientDID: string; // DID of credential holder
  issuerDID: string; // DID of issuer
  issuedAt: number;
  expiresAt?: number;
  metadata: {
    popProvider?: PoPProvider;
    popProof?: string;
    stakeAmount?: bigint;
    endorsers?: string[]; // DIDs of endorsers
    behaviorScore?: number;
    [key: string]: any;
  };
  dkgUAL?: string; // UAL of credential stored on DKG
  nonTransferable: boolean; // Always true for SBTs
}

/**
 * Token-Curated Registry entry
 */
export interface TCREntry {
  applicantDID: string;
  status: 'pending' | 'approved' | 'rejected' | 'challenged';
  totalStake: bigint; // Total stake backing this entry
  endorsers: Array<{
    endorserDID: string;
    stakeAmount: bigint;
    timestamp: number;
  }>;
  challengers: Array<{
    challengerDID: string;
    stakeAmount: bigint;
    timestamp: number;
    reason?: string;
  }>;
  createdAt: number;
  resolvedAt?: number;
}

/**
 * On-chain behavior analysis result
 */
export interface BehaviorAnalysis {
  accountAddress: string;
  totalTransactions: number;
  uniqueInteractions: number; // Number of unique addresses interacted with
  transactionDiversity: number; // 0-1 score based on interaction diversity
  accountAge: number; // Days since first transaction
  tokenHoldings: Array<{
    tokenAddress: string;
    balance: bigint;
  }>;
  sybilRiskScore: number; // 0-100, lower is better
  trustSignals: string[]; // List of positive trust signals
  riskSignals: string[]; // List of risk signals
}

/**
 * Identity tokenomics configuration
 */
export interface IdentityTokenomicsConfig {
  // DKG integration
  dkgClient?: DKGClientV8;
  dkgConfig?: DKGConfig;
  
  // Account creation requirements
  accountCreation: AccountCreationRequirement;
  
  // SBT configuration
  sbtIssuerDID?: string; // DID of SBT issuer
  sbtContractAddress?: string; // SBT smart contract address
  
  // PoP configuration
  popProviders?: {
    [key in PoPProvider]?: {
      enabled: boolean;
      apiKey?: string;
      endpoint?: string;
      verificationThreshold?: number; // Confidence threshold (0-100)
    };
  };
  
  // TCR configuration
  tcrConfig?: {
    minStakeToEndorse: bigint;
    minStakeToChallenge: bigint;
    challengePeriod: number; // Days
    votingPeriod: number; // Days
    slashPercentage: number; // % of stake slashed for wrong endorsement
  };
  
  // Behavior analysis
  behaviorAnalysis?: {
    enabled: boolean;
    minTransactions: number; // Minimum transactions for analysis
    minUniqueInteractions: number; // Minimum unique interactions
    rpcEndpoints?: { [chainId: number]: string };
  };
  
  // Token verification integration
  tokenVerification?: TokenVerificationService;
  
  // Mock mode
  useMockMode?: boolean;
}

/**
 * Identity Tokenomics Service
 * 
 * Comprehensive service for identity verification and trust tokenomics
 */
export class IdentityTokenomicsService {
  private config: IdentityTokenomicsConfig & {
    accountCreation: AccountCreationRequirement;
    sbtIssuerDID: string;
    popProviders: Record<PoPProvider, PoPProviderConfig>;
    tcrConfig: TCRConfig;
    behaviorAnalysis: BehaviorAnalysisConfig;
    useMockMode: boolean;
  };
  private dkgClient: DKGClientV8 | null = null;
  private tokenVerification: TokenVerificationService | null = null;
  private credentials: Map<string, SBTCredential> = new Map(); // credentialId -> credential
  private tcrEntries: Map<string, TCREntry> = new Map(); // applicantDID -> entry
  private behaviorCache: Map<string, BehaviorAnalysis> = new Map();

  constructor(config: IdentityTokenomicsConfig) {
    // Set defaults
    this.config = {
      dkgClient: config.dkgClient,
      dkgConfig: config.dkgConfig,
      accountCreation: {
        requireStake: true,
        minStakeAmount: BigInt(100) * BigInt(10 ** 18), // 100 tokens (18 decimals)
        stakeLockPeriod: 30, // 30 days
        requirePoP: false,
        allowCommunityVouch: true,
        ...config.accountCreation
      },
      sbtIssuerDID: config.sbtIssuerDID || 'did:key:dotrep-issuer',
      sbtContractAddress: config.sbtContractAddress || '',
      popProviders: {
        [PoPProvider.WORLDCOIN]: {
          enabled: false,
          verificationThreshold: 80
        },
        [PoPProvider.HUMANITY_PROTOCOL]: {
          enabled: false,
          verificationThreshold: 75
        },
        ...config.popProviders
      },
      tcrConfig: {
        minStakeToEndorse: BigInt(1000) * BigInt(10 ** 18), // 1000 tokens
        minStakeToChallenge: BigInt(500) * BigInt(10 ** 18), // 500 tokens
        challengePeriod: 7, // 7 days
        votingPeriod: 3, // 3 days
        slashPercentage: 10, // 10% slash
        ...config.tcrConfig
      },
      behaviorAnalysis: {
        enabled: true,
        minTransactions: 5,
        minUniqueInteractions: 3,
        rpcEndpoints: {},
        ...config.behaviorAnalysis
      },
      tokenVerification: config.tokenVerification,
      useMockMode: config.useMockMode || process.env.IDENTITY_TOKENOMICS_MOCK === 'true' || false
    };

    // Initialize DKG client
    if (this.config.dkgClient) {
      this.dkgClient = this.config.dkgClient;
    } else if (this.config.dkgConfig) {
      const { createDKGClientV8 } = require('./dkg-client-v8');
      this.dkgClient = createDKGClientV8(this.config.dkgConfig);
    }

    // Initialize token verification
    if (this.config.tokenVerification) {
      this.tokenVerification = this.config.tokenVerification;
    }
  }

  /**
   * Create a new account with identity verification
   * 
   * Requires stake (if configured) and optionally PoP verification
   */
  async createAccount(
    userDID: string,
    walletAddress: string,
    options: {
      stakeAmount?: bigint;
      popProof?: string;
      popProvider?: PoPProvider;
      vouchedBy?: string[]; // DIDs of users vouching for this account
    } = {}
  ): Promise<{
    success: boolean;
    accountCreated: boolean;
    stakeRequired: boolean;
    stakeLocked: boolean;
    popVerified: boolean;
    sbtIssued: boolean;
    sbtCredential?: SBTCredential;
    error?: string;
  }> {
    const result = {
      success: false,
      accountCreated: false,
      stakeRequired: false,
      stakeLocked: false,
      popVerified: false,
      sbtIssued: false
    };

    try {
      // 1. Check stake requirement
      if (this.config.accountCreation.requireStake) {
        result.stakeRequired = true;
        const stakeAmount = options.stakeAmount || this.config.accountCreation.minStakeAmount;
        
        // Verify stake (via token verification service or direct check)
        if (this.tokenVerification && this.config.accountCreation.stakeTokenAddress) {
          const stakeCheck = await this.tokenVerification.verifyToken(walletAddress, {
            tokenType: TokenType.ERC20,
            tokenAddress: this.config.accountCreation.stakeTokenAddress,
            minBalance: stakeAmount,
            description: 'Account creation stake requirement'
          });

          if (!stakeCheck.verified) {
            return {
              ...result,
              error: `Insufficient stake. Required: ${stakeAmount.toString()}, but verification failed.`
            };
          }
        }

        result.stakeLocked = true;
      }

      // 2. Check PoP requirement
      if (this.config.accountCreation.requirePoP) {
        if (!options.popProof || !options.popProvider) {
          return {
            ...result,
            error: 'Proof-of-Personhood verification required but not provided'
          };
        }

        const popResult = await this.verifyPoP(options.popProof, options.popProvider);
        if (!popResult.verified) {
          return {
            ...result,
            error: `PoP verification failed: ${popResult.error || 'Unknown error'}`
          };
        }

        result.popVerified = true;
      }

      // 3. Check community vouching (if allowed and PoP not required)
      if (!this.config.accountCreation.requirePoP && this.config.accountCreation.allowCommunityVouch) {
        if (options.vouchedBy && options.vouchedBy.length > 0) {
          // Verify vouchers have sufficient stake
          // This would be implemented with TCR or direct stake checks
        }
      }

      // 4. Issue SBT credential
      const sbtCredential = await this.issueSBTCredential(
        userDID,
        CredentialType.VERIFIED_ACCOUNT,
        {
          popProvider: options.popProvider,
          popProof: options.popProof,
          stakeAmount: options.stakeAmount || this.config.accountCreation.minStakeAmount
        }
      );

      if (sbtCredential) {
        result.sbtIssued = true;
        result.sbtCredential = sbtCredential;
      }

      result.accountCreated = true;
      result.success = true;

      return result;
    } catch (error: any) {
      return {
        ...result,
        error: error.message || 'Account creation failed'
      };
    }
  }

  /**
   * Verify Proof-of-Personhood
   */
  async verifyPoP(
    proof: string,
    provider: PoPProvider
  ): Promise<PoPVerificationResult> {
    const providerConfig = this.config.popProviders?.[provider];
    
    if (!providerConfig || !providerConfig.enabled) {
      return {
        verified: false,
        provider,
        proof,
        timestamp: Date.now(),
        error: `PoP provider ${provider} is not enabled`
      };
    }

    // Mock mode
    if (this.config.useMockMode) {
      console.log(`🔧 [MOCK] Verifying PoP with ${provider}`);
      return {
        verified: true,
        provider,
        proof,
        timestamp: Date.now(),
        expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000) // 1 year
      };
    }

    // Real verification (integrate with actual PoP providers)
    try {
      switch (provider) {
        case PoPProvider.WORLDCOIN:
          // Integrate with World ID API
          // return await this.verifyWorldcoin(proof);
          return {
            verified: false,
            provider,
            proof,
            timestamp: Date.now(),
            error: 'Worldcoin integration not yet implemented'
          };

        case PoPProvider.HUMANITY_PROTOCOL:
          // Integrate with Humanity Protocol API
          // return await this.verifyHumanityProtocol(proof);
          return {
            verified: false,
            provider,
            proof,
            timestamp: Date.now(),
            error: 'Humanity Protocol integration not yet implemented'
          };

        default:
          return {
            verified: false,
            provider,
            proof,
            timestamp: Date.now(),
            error: `Unsupported PoP provider: ${provider}`
          };
      }
    } catch (error: any) {
      return {
        verified: false,
        provider,
        proof,
        timestamp: Date.now(),
        error: error.message
      };
    }
  }

  /**
   * Issue a Soulbound Token credential
   * 
   * Creates a non-transferable credential and stores it on DKG
   */
  async issueSBTCredential(
    recipientDID: string,
    credentialType: CredentialType,
    metadata: Record<string, any> = {}
  ): Promise<SBTCredential | null> {
    try {
      const credentialId = `sbt:${credentialType}:${recipientDID}:${Date.now()}`;
      
      const credential: SBTCredential = {
        credentialId,
        credentialType,
        recipientDID,
        issuerDID: this.config.sbtIssuerDID,
        issuedAt: Date.now(),
        metadata: {
          ...metadata,
          nonTransferable: true
        },
        nonTransferable: true
      };

      // Store credential locally
      this.credentials.set(credentialId, credential);

      // Publish to DKG as Verifiable Credential
      if (this.dkgClient) {
        const dkgResult = await this.publishCredentialToDKG(credential);
        if (dkgResult) {
          credential.dkgUAL = dkgResult.UAL;
        }
      }

      console.log(`✅ Issued SBT credential: ${credentialId} to ${recipientDID}`);
      return credential;
    } catch (error: any) {
      console.error(`❌ Failed to issue SBT credential:`, error);
      return null;
    }
  }

  /**
   * Publish credential to DKG as Verifiable Credential Knowledge Asset
   */
  private async publishCredentialToDKG(
    credential: SBTCredential
  ): Promise<PublishResult | null> {
    if (!this.dkgClient) {
      return null;
    }

    try {
      const knowledgeAsset = {
        '@context': {
          '@vocab': 'https://schema.org/',
          'dotrep': 'https://dotrep.io/ontology/',
          'cred': 'https://www.w3.org/2018/credentials/v1'
        },
        '@type': 'cred:VerifiableCredential',
        '@id': `did:dotrep:credential:${credential.credentialId}`,
        'cred:credentialSubject': {
          '@id': credential.recipientDID,
          'cred:type': credential.credentialType,
          'dotrep:credentialId': credential.credentialId
        },
        'cred:issuer': {
          '@id': credential.issuerDID,
          'name': 'DotRep Identity Issuer'
        },
        'cred:issuanceDate': new Date(credential.issuedAt).toISOString(),
        'cred:expirationDate': credential.expiresAt 
          ? new Date(credential.expiresAt).toISOString() 
          : undefined,
        'dotrep:credentialType': credential.credentialType,
        'dotrep:nonTransferable': true,
        'dotrep:metadata': credential.metadata,
        'cred:proof': {
          '@type': 'Ed25519Signature2020',
          'created': new Date(credential.issuedAt).toISOString(),
          'proofPurpose': 'assertionMethod',
          'verificationMethod': `${credential.issuerDID}#keys-1`
        }
      };

      const result = await this.dkgClient.publishReputationAsset({
        developerId: credential.recipientDID,
        reputationScore: 0, // Not a reputation score
        contributions: [],
        timestamp: credential.issuedAt,
        metadata: {
          type: 'sbt_credential',
          credential: knowledgeAsset
        }
      });

      return result;
    } catch (error: any) {
      console.error(`❌ Failed to publish credential to DKG:`, error);
      return null;
    }
  }

  /**
   * Verify if a user holds a specific credential
   */
  async verifyCredential(
    userDID: string,
    credentialType: CredentialType
  ): Promise<{
    verified: boolean;
    credential?: SBTCredential;
    error?: string;
  }> {
    // Check local cache
    for (const [id, cred] of this.credentials.entries()) {
      if (cred.recipientDID === userDID && cred.credentialType === credentialType) {
        // Check expiration
        if (cred.expiresAt && cred.expiresAt < Date.now()) {
          return {
            verified: false,
            error: 'Credential has expired'
          };
        }
        return {
          verified: true,
          credential: cred
        };
      }
    }

    // Query DKG if available
    if (this.dkgClient) {
      // TODO: Implement DKG query for credentials
    }

    return {
      verified: false,
      error: 'Credential not found'
    };
  }

  /**
   * Token-Curated Registry: Endorse a new applicant
   */
  async tcrEndorse(
    applicantDID: string,
    endorserDID: string,
    stakeAmount: bigint
  ): Promise<{
    success: boolean;
    entry?: TCREntry;
    error?: string;
  }> {
    if (stakeAmount < this.config.tcrConfig.minStakeToEndorse) {
      return {
        success: false,
        error: `Insufficient stake. Minimum: ${this.config.tcrConfig.minStakeToEndorse.toString()}`
      };
    }

    let entry = this.tcrEntries.get(applicantDID);
    
    if (!entry) {
      entry = {
        applicantDID,
        status: 'pending',
        totalStake: BigInt(0),
        endorsers: [],
        challengers: [],
        createdAt: Date.now()
      };
    }

    // Check if already endorsed by this endorser
    const existingEndorsement = entry.endorsers.find(e => e.endorserDID === endorserDID);
    if (existingEndorsement) {
      return {
        success: false,
        error: 'Already endorsed this applicant'
      };
    }

    // Add endorsement
    entry.endorsers.push({
      endorserDID,
      stakeAmount,
      timestamp: Date.now()
    });
    entry.totalStake += stakeAmount;

    // Auto-approve if stake threshold met (simplified - in production, use voting)
    const approvalThreshold = this.config.tcrConfig.minStakeToEndorse * BigInt(10); // 10x minimum
    if (entry.totalStake >= approvalThreshold && entry.status === 'pending') {
      entry.status = 'approved';
      entry.resolvedAt = Date.now();
      
      // Issue community-endorsed credential
      await this.issueSBTCredential(applicantDID, CredentialType.COMMUNITY_ENDORSED, {
        endorsers: entry.endorsers.map(e => e.endorserDID),
        totalStake: entry.totalStake.toString()
      });
    }

    this.tcrEntries.set(applicantDID, entry);

    return {
      success: true,
      entry
    };
  }

  /**
   * Token-Curated Registry: Challenge an entry
   */
  async tcrChallenge(
    applicantDID: string,
    challengerDID: string,
    stakeAmount: bigint,
    reason?: string
  ): Promise<{
    success: boolean;
    entry?: TCREntry;
    error?: string;
  }> {
    if (stakeAmount < this.config.tcrConfig.minStakeToChallenge) {
      return {
        success: false,
        error: `Insufficient stake to challenge. Minimum: ${this.config.tcrConfig.minStakeToChallenge.toString()}`
      };
    }

    const entry = this.tcrEntries.get(applicantDID);
    if (!entry) {
      return {
        success: false,
        error: 'Entry not found'
      };
    }

    if (entry.status !== 'pending' && entry.status !== 'approved') {
      return {
        success: false,
        error: 'Entry cannot be challenged in current state'
      };
    }

    // Add challenge
    entry.challengers.push({
      challengerDID,
      stakeAmount,
      timestamp: Date.now(),
      reason
    });

    entry.status = 'challenged';

    this.tcrEntries.set(applicantDID, entry);

    return {
      success: true,
      entry
    };
  }

  /**
   * Analyze on-chain behavior for Sybil detection
   */
  async analyzeBehavior(
    accountAddress: string,
    chainId?: number
  ): Promise<BehaviorAnalysis> {
    // Check cache
    const cached = this.behaviorCache.get(accountAddress);
    if (cached) {
      return cached;
    }

    if (this.config.useMockMode) {
      console.log(`🔧 [MOCK] Analyzing behavior for ${accountAddress}`);
      
      // Mock behavior analysis
      const mockAnalysis: BehaviorAnalysis = {
        accountAddress,
        totalTransactions: 25,
        uniqueInteractions: 15,
        transactionDiversity: 0.85,
        accountAge: 120, // 120 days
        tokenHoldings: [
          {
            tokenAddress: '0x1234...',
            balance: BigInt(1000) * BigInt(10 ** 18)
          }
        ],
        sybilRiskScore: 15, // Low risk
        trustSignals: [
          'High transaction diversity',
          'Long account age',
          'Multiple token holdings'
        ],
        riskSignals: []
      };

      this.behaviorCache.set(accountAddress, mockAnalysis);
      return mockAnalysis;
    }

    // Real behavior analysis (would query blockchain RPC)
    // This is a placeholder - in production, implement actual blockchain queries
    const analysis: BehaviorAnalysis = {
      accountAddress,
      totalTransactions: 0,
      uniqueInteractions: 0,
      transactionDiversity: 0,
      accountAge: 0,
      tokenHoldings: [],
      sybilRiskScore: 50, // Medium risk (unknown)
      trustSignals: [],
      riskSignals: ['Insufficient on-chain data']
    };

    this.behaviorCache.set(accountAddress, analysis);
    return analysis;
  }

  /**
   * Get comprehensive trust score for a user
   */
  async getTrustScore(
    userDID: string,
    walletAddress?: string
  ): Promise<{
    trustScore: number; // 0-1000
    components: {
      stakeScore: number;
      popScore: number;
      credentialScore: number;
      behaviorScore: number;
      communityScore: number;
    };
    credentials: SBTCredential[];
    tcrEntry?: TCREntry;
    behaviorAnalysis?: BehaviorAnalysis;
  }> {
    const components = {
      stakeScore: 0,
      popScore: 0,
      credentialScore: 0,
      behaviorScore: 0,
      communityScore: 0
    };

    const credentials: SBTCredential[] = [];

    // 1. Check credentials
    for (const [id, cred] of this.credentials.entries()) {
      if (cred.recipientDID === userDID) {
        credentials.push(cred);
        
        if (cred.credentialType === CredentialType.PROOF_OF_HUMANITY) {
          components.popScore = 200; // Max 200 points
        } else if (cred.credentialType === CredentialType.VERIFIED_ACCOUNT) {
          components.credentialScore = 150; // Max 150 points
        } else if (cred.credentialType === CredentialType.COMMUNITY_ENDORSED) {
          components.communityScore = 100; // Max 100 points
        }
      }
    }

    // 2. Check stake (if wallet address provided)
    if (walletAddress && this.tokenVerification) {
      // Check stake tier
      // This would integrate with the staking system
      components.stakeScore = 100; // Placeholder
    }

    // 3. Check behavior (if wallet address provided)
    if (walletAddress) {
      const behavior = await this.analyzeBehavior(walletAddress);
      components.behaviorScore = Math.max(0, 100 - behavior.sybilRiskScore); // Invert risk score
    }

    // 4. Check TCR entry
    const tcrEntry = this.tcrEntries.get(userDID);
    if (tcrEntry && tcrEntry.status === 'approved') {
      components.communityScore += 150; // Additional points for TCR approval
    }

    // Calculate total trust score (max 1000)
    const trustScore = Math.min(1000, 
      components.stakeScore +
      components.popScore +
      components.credentialScore +
      components.behaviorScore +
      components.communityScore
    );

    return {
      trustScore,
      components,
      credentials,
      tcrEntry,
      behaviorAnalysis: walletAddress ? await this.analyzeBehavior(walletAddress) : undefined
    };
  }

  /**
   * Get TCR entry for a user
   */
  getTCREntry(applicantDID: string): TCREntry | null {
    return this.tcrEntries.get(applicantDID) || null;
  }

  /**
   * Get all credentials for a user
   */
  getUserCredentials(userDID: string): SBTCredential[] {
    return Array.from(this.credentials.values())
      .filter(cred => cred.recipientDID === userDID);
  }
}

/**
 * Factory function to create Identity Tokenomics Service
 */
export function createIdentityTokenomicsService(
  config: IdentityTokenomicsConfig
): IdentityTokenomicsService {
  return new IdentityTokenomicsService(config);
}

export default IdentityTokenomicsService;

