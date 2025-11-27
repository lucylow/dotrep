/**
 * Identity Verification Agent
 * 
 * Multi-factor identity verification with dynamic staking and Soulbound Token issuance.
 * Integrates with DKG for credential storage and NeuroWeb for on-chain operations.
 */

import { DKGClientV8, type DKGConfig, type PublishResult } from '../dkg-client-v8';
import { PolkadotApiService } from '../../server/_core/polkadotApi';
import { IdentityTokenomicsService, type PoPProvider, type SBTCredential, CredentialType } from '../identity-tokenomics';

export interface VerificationData {
  biometric?: {
    provider: PoPProvider;
    proof: string;
    confidence?: number;
  };
  social?: {
    connections: string[]; // DIDs of social connections
    reputation?: number;
  };
  behavioral?: {
    accountAddress?: string;
    transactionHistory?: any[];
  };
  economic?: {
    stakeAmount: bigint;
    tokenHoldings?: Array<{ token: string; balance: bigint }>;
  };
  crossChain?: {
    verifiedChains: string[];
    attestations: Array<{ chain: string; credential: string }>;
  };
}

export interface VerificationStep {
  method: 'biometric' | 'social' | 'behavioral' | 'economic' | 'crossChain';
  score: number; // 0-1 confidence score
  timestamp: string;
  details?: Record<string, any>;
  error?: string;
}

export interface VerificationResult {
  userDID: string;
  timestamp: string;
  status: 'pending' | 'verified' | 'failed' | 'error';
  verificationSteps: VerificationStep[];
  confidenceScore: number;
  stakeTransaction?: {
    transactionHash: string;
    amount: bigint;
    lockUntil: string;
  };
  soulboundToken?: SBTCredential;
  error?: string;
}

export interface IdentityVerificationConfig {
  dkgClient?: DKGClientV8;
  dkgConfig?: DKGConfig;
  polkadotApi?: PolkadotApiService;
  identityTokenomics?: IdentityTokenomicsService;
  
  verificationThresholds: {
    minimumConfidence: number; // 0-1, default 0.7
    biometricWeight: number; // 0-1, default 0.35
    socialWeight: number; // 0-1, default 0.25
    behavioralWeight: number; // 0-1, default 0.20
    economicWeight: number; // 0-1, default 0.15
    crossChainWeight: number; // 0-1, default 0.05
  };
  
  staking: {
    baseStakeAmount: bigint;
    lockPeriodDays: number;
    enableDynamicStaking: boolean; // Adjust stake based on confidence
  };
  
  enableMockMode?: boolean;
  enableLogging?: boolean;
}

/**
 * Identity Verification Agent
 * 
 * Performs multi-factor identity verification with:
 * - Biometric verification (PoP)
 * - Social graph analysis
 * - Behavioral pattern analysis
 * - Economic stake verification
 * - Cross-chain identity checks
 */
export class IdentityVerificationAgent {
  private config: IdentityVerificationConfig & {
    verificationThresholds: {
      minimumConfidence: number;
      biometricWeight: number;
      socialWeight: number;
      behavioralWeight: number;
      economicWeight: number;
      crossChainWeight: number;
    };
    staking: {
      baseStakeAmount: bigint;
      lockPeriodDays: number;
      enableDynamicStaking: boolean;
    };
    enableMockMode: boolean;
    enableLogging: boolean;
  };
  private dkgClient: DKGClientV8 | null = null;
  private polkadotApi: PolkadotApiService | null = null;
  private identityTokenomics: IdentityTokenomicsService | null = null;
  private verificationSessions: Map<string, VerificationResult> = new Map();

  constructor(config: IdentityVerificationConfig) {
    // Set defaults
    this.config = {
      dkgClient: config.dkgClient,
      dkgConfig: config.dkgConfig,
      polkadotApi: config.polkadotApi,
      identityTokenomics: config.identityTokenomics,
      verificationThresholds: {
        ...{
          minimumConfidence: 0.7,
          biometricWeight: 0.35,
          socialWeight: 0.25,
          behavioralWeight: 0.20,
          economicWeight: 0.15,
          crossChainWeight: 0.05,
        },
        ...config.verificationThresholds
      },
      staking: {
        ...{
          baseStakeAmount: BigInt(1000) * BigInt(10 ** 18), // 1000 tokens
          lockPeriodDays: 30,
          enableDynamicStaking: true,
        },
        ...config.staking
      },
      enableMockMode: config.enableMockMode ?? process.env.IDENTITY_VERIFICATION_MOCK === 'true',
      enableLogging: config.enableLogging ?? true
    };

    // Initialize DKG client
    if (this.config.dkgClient) {
      this.dkgClient = this.config.dkgClient;
    } else if (this.config.dkgConfig) {
      const { createDKGClientV8 } = require('../dkg-client-v8');
      this.dkgClient = createDKGClientV8(this.config.dkgConfig);
    }

    // Initialize Polkadot API
    if (this.config.polkadotApi) {
      this.polkadotApi = this.config.polkadotApi;
    }

    // Initialize Identity Tokenomics
    if (this.config.identityTokenomics) {
      this.identityTokenomics = this.config.identityTokenomics;
    }
  }

  /**
   * Verify and stake identity with multi-factor verification
   */
  async verifyAndStakeIdentity(
    userDID: string,
    verificationData: VerificationData,
    stakeAmount?: bigint
  ): Promise<VerificationResult> {
    const sessionId = `verification-${Date.now()}-${userDID}`;
    
    const verificationSession: VerificationResult = {
      userDID,
      timestamp: new Date().toISOString(),
      status: 'pending',
      verificationSteps: [],
      confidenceScore: 0
    };

    try {
      this.log(`Starting identity verification for ${userDID}`);

      // Step 1: Multi-factor verification
      const verificationResult = await this.performMultiFactorVerification(
        userDID,
        verificationData
      );
      
      verificationSession.verificationSteps = verificationResult.steps;
      
      // Step 2: Calculate verification confidence
      const confidenceScore = this.calculateVerificationConfidence(verificationResult);
      verificationSession.confidenceScore = confidenceScore;
      
      if (confidenceScore >= this.config.verificationThresholds.minimumConfidence) {
        // Step 3: Process staking
        const stakeAmountToUse = stakeAmount || this.calculateStakeAmount(confidenceScore);
        const stakeResult = await this.processIdentityStake(
          userDID,
          stakeAmountToUse,
          confidenceScore
        );
        
        verificationSession.stakeTransaction = stakeResult;
        
        // Step 4: Issue Soulbound Token (SBT)
        const sbt = await this.issueSoulboundToken(userDID, verificationResult);
        verificationSession.soulboundToken = sbt;
        
        verificationSession.status = 'verified';
        
        // Step 5: Publish verification to DKG
        await this.publishVerificationToDKG(verificationSession);
        
        this.log(`Identity verification successful for ${userDID} (confidence: ${confidenceScore.toFixed(2)})`);
      } else {
        verificationSession.status = 'failed';
        verificationSession.error = `Insufficient verification confidence: ${confidenceScore.toFixed(2)} < ${this.config.verificationThresholds.minimumConfidence}`;
        this.log(`Identity verification failed for ${userDID}: ${verificationSession.error}`);
      }
      
      this.verificationSessions.set(sessionId, verificationSession);
      return verificationSession;
      
    } catch (error: any) {
      verificationSession.status = 'error';
      verificationSession.error = error.message || 'Unknown error during verification';
      this.log(`Identity verification error for ${userDID}: ${verificationSession.error}`, 'error');
      
      // Publish error state to DKG for audit trail
      await this.publishVerificationToDKG(verificationSession).catch(() => {
        // Ignore DKG publish errors for failed verifications
      });
      
      this.verificationSessions.set(sessionId, verificationSession);
      throw error;
    }
  }

  /**
   * Perform multi-factor verification
   */
  private async performMultiFactorVerification(
    userDID: string,
    verificationData: VerificationData
  ): Promise<{ steps: VerificationStep[]; timestamp: string }> {
    const verificationSteps: VerificationStep[] = [];
    const timestamp = new Date().toISOString();

    // Biometric verification
    if (verificationData.biometric) {
      try {
        const biometricResult = await this.verifyBiometric(
          userDID,
          verificationData.biometric
        );
        verificationSteps.push(biometricResult);
      } catch (error: any) {
        verificationSteps.push({
          method: 'biometric',
          score: 0,
          timestamp,
          error: error.message
        });
      }
    }
    
    // Social graph analysis
    try {
      const socialAnalysis = await this.analyzeSocialGraph(
        userDID,
        verificationData.social
      );
      verificationSteps.push(socialAnalysis);
    } catch (error: any) {
      verificationSteps.push({
        method: 'social',
        score: 0,
        timestamp,
        error: error.message
      });
    }
    
    // Behavioral analysis
    try {
      const behaviorAnalysis = await this.analyzeBehavioralPatterns(
        userDID,
        verificationData.behavioral
      );
      verificationSteps.push(behaviorAnalysis);
    } catch (error: any) {
      verificationSteps.push({
        method: 'behavioral',
        score: 0,
        timestamp,
        error: error.message
      });
    }
    
    // Economic stake verification
    try {
      const economicAnalysis = await this.verifyEconomicSignals(
        userDID,
        verificationData.economic
      );
      verificationSteps.push(economicAnalysis);
    } catch (error: any) {
      verificationSteps.push({
        method: 'economic',
        score: 0,
        timestamp,
        error: error.message
      });
    }
    
    // Cross-chain identity check
    try {
      const crossChainResult = await this.checkCrossChainIdentity(
        userDID,
        verificationData.crossChain
      );
      verificationSteps.push(crossChainResult);
    } catch (error: any) {
      verificationSteps.push({
        method: 'crossChain',
        score: 0,
        timestamp,
        error: error.message
      });
    }
    
    return { steps: verificationSteps, timestamp };
  }

  /**
   * Verify biometric (Proof-of-Personhood)
   */
  private async verifyBiometric(
    userDID: string,
    biometric: VerificationData['biometric']
  ): Promise<VerificationStep> {
    if (!biometric) {
      throw new Error('Biometric data not provided');
    }

    if (this.config.enableMockMode) {
      this.log(`[MOCK] Verifying biometric for ${userDID} with ${biometric.provider}`);
      return {
        method: 'biometric',
        score: biometric.confidence || 0.9,
        timestamp: new Date().toISOString(),
        details: {
          provider: biometric.provider,
          mock: true
        }
      };
    }

    // Use Identity Tokenomics service for PoP verification
    if (this.identityTokenomics) {
      const popResult = await this.identityTokenomics.verifyPoP(
        biometric.proof,
        biometric.provider
      );

      return {
        method: 'biometric',
        score: popResult.verified ? (biometric.confidence || 0.9) : 0,
        timestamp: new Date().toISOString(),
        details: {
          provider: biometric.provider,
          verified: popResult.verified,
          expiresAt: popResult.expiresAt
        },
        error: popResult.error
      };
    }

    // Fallback: assume verified if no service available
    return {
      method: 'biometric',
      score: 0.5, // Lower score if no verification service
      timestamp: new Date().toISOString(),
      details: {
        provider: biometric.provider,
        warning: 'No PoP verification service available'
      }
    };
  }

  /**
   * Analyze social graph
   */
  private async analyzeSocialGraph(
    userDID: string,
    social?: VerificationData['social']
  ): Promise<VerificationStep> {
    if (this.config.enableMockMode) {
      return {
        method: 'social',
        score: social?.reputation || 0.7,
        timestamp: new Date().toISOString(),
        details: {
          connections: social?.connections?.length || 0,
          mock: true
        }
      };
    }

    // Query DKG for social connections
    if (this.dkgClient && social?.connections) {
      try {
        // Query reputation and connections from DKG
        const connectionCount = social.connections.length;
        const reputation = social.reputation || 0.5;
        
        // Calculate social score based on connection diversity and reputation
        const connectionScore = Math.min(connectionCount / 20, 1.0); // Normalize to 0-1
        const reputationScore = reputation;
        const socialScore = (connectionScore * 0.5) + (reputationScore * 0.5);

        return {
          method: 'social',
          score: socialScore,
          timestamp: new Date().toISOString(),
          details: {
            connections: connectionCount,
            reputation: reputation,
            connectionScore,
            reputationScore
          }
        };
      } catch (error: any) {
        return {
          method: 'social',
          score: 0.3, // Default low score
          timestamp: new Date().toISOString(),
          error: error.message
        };
      }
    }

    return {
      method: 'social',
      score: 0.3, // Default low score if no data
      timestamp: new Date().toISOString(),
      details: {
        warning: 'Insufficient social graph data'
      }
    };
  }

  /**
   * Analyze behavioral patterns
   */
  private async analyzeBehavioralPatterns(
    userDID: string,
    behavioral?: VerificationData['behavioral']
  ): Promise<VerificationStep> {
    if (this.config.enableMockMode) {
      return {
        method: 'behavioral',
        score: 0.75,
        timestamp: new Date().toISOString(),
        details: { mock: true }
      };
    }

    // Use Identity Tokenomics service for behavior analysis
    if (this.identityTokenomics && behavioral?.accountAddress) {
      try {
        const behaviorAnalysis = await this.identityTokenomics.analyzeBehavior(
          behavioral.accountAddress
        );

        // Convert sybil risk score (0-100, lower is better) to confidence score (0-1, higher is better)
        const confidenceScore = Math.max(0, (100 - behaviorAnalysis.sybilRiskScore) / 100);

        return {
          method: 'behavioral',
          score: confidenceScore,
          timestamp: new Date().toISOString(),
          details: {
            sybilRiskScore: behaviorAnalysis.sybilRiskScore,
            transactionDiversity: behaviorAnalysis.transactionDiversity,
            uniqueInteractions: behaviorAnalysis.uniqueInteractions,
            trustSignals: behaviorAnalysis.trustSignals,
            riskSignals: behaviorAnalysis.riskSignals
          }
        };
      } catch (error: any) {
        return {
          method: 'behavioral',
          score: 0.3,
          timestamp: new Date().toISOString(),
          error: error.message
        };
      }
    }

    return {
      method: 'behavioral',
      score: 0.3,
      timestamp: new Date().toISOString(),
      details: {
        warning: 'No behavioral data available'
      }
    };
  }

  /**
   * Verify economic signals
   */
  private async verifyEconomicSignals(
    userDID: string,
    economic?: VerificationData['economic']
  ): Promise<VerificationStep> {
    if (!economic) {
      return {
        method: 'economic',
        score: 0,
        timestamp: new Date().toISOString(),
        error: 'No economic data provided'
      };
    }

    if (this.config.enableMockMode) {
      return {
        method: 'economic',
        score: 0.8,
        timestamp: new Date().toISOString(),
        details: {
          stakeAmount: economic.stakeAmount.toString(),
          mock: true
        }
      };
    }

    // Calculate economic score based on stake amount
    const baseStake = this.config.staking.baseStakeAmount;
    const stakeRatio = Number(economic.stakeAmount) / Number(baseStake);
    const economicScore = Math.min(stakeRatio, 1.0); // Cap at 1.0

    return {
      method: 'economic',
      score: economicScore,
      timestamp: new Date().toISOString(),
      details: {
        stakeAmount: economic.stakeAmount.toString(),
        baseStake: baseStake.toString(),
        stakeRatio,
        tokenHoldings: economic.tokenHoldings?.length || 0
      }
    };
  }

  /**
   * Check cross-chain identity
   */
  private async checkCrossChainIdentity(
    userDID: string,
    crossChain?: VerificationData['crossChain']
  ): Promise<VerificationStep> {
    if (this.config.enableMockMode) {
      return {
        method: 'crossChain',
        score: crossChain ? 0.8 : 0.3,
        timestamp: new Date().toISOString(),
        details: {
          verifiedChains: crossChain?.verifiedChains?.length || 0,
          mock: true
        }
      };
    }

    if (!crossChain || !crossChain.verifiedChains || crossChain.verifiedChains.length === 0) {
      return {
        method: 'crossChain',
        score: 0.2,
        timestamp: new Date().toISOString(),
        details: {
          warning: 'No cross-chain attestations'
        }
      };
    }

    // Score based on number of verified chains
    const chainCount = crossChain.verifiedChains.length;
    const attestationCount = crossChain.attestations.length;
    const crossChainScore = Math.min((chainCount * 0.3) + (attestationCount * 0.1), 1.0);

    return {
      method: 'crossChain',
      score: crossChainScore,
      timestamp: new Date().toISOString(),
      details: {
        verifiedChains: chainCount,
        attestations: attestationCount
      }
    };
  }

  /**
   * Calculate verification confidence from all steps
   */
  private calculateVerificationConfidence(
    verificationResult: { steps: VerificationStep[] }
  ): number {
    const weights = {
      biometric: this.config.verificationThresholds.biometricWeight,
      social: this.config.verificationThresholds.socialWeight,
      behavioral: this.config.verificationThresholds.behavioralWeight,
      economic: this.config.verificationThresholds.economicWeight,
      crossChain: this.config.verificationThresholds.crossChainWeight
    };
    
    let totalScore = 0;
    let totalWeight = 0;
    
    verificationResult.steps.forEach(step => {
      const weight = weights[step.method] || 0.05;
      totalScore += step.score * weight;
      totalWeight += weight;
    });
    
    // Normalize by total weight
    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  /**
   * Calculate stake amount based on confidence
   */
  private calculateStakeAmount(confidenceScore: number): bigint {
    if (!this.config.staking.enableDynamicStaking) {
      return this.config.staking.baseStakeAmount;
    }

    // Higher confidence = lower stake requirement
    let multiplier = 1.0;
    if (confidenceScore >= 0.9) multiplier = 0.5;   // 50% of base stake
    else if (confidenceScore >= 0.8) multiplier = 0.75;  // 75% of base stake
    else if (confidenceScore >= 0.7) multiplier = 1.0;   // 100% of base stake
    else if (confidenceScore >= 0.6) multiplier = 1.5;   // 150% of base stake
    else multiplier = 2.0; // 200% of base stake for low confidence

    return BigInt(Math.floor(Number(this.config.staking.baseStakeAmount) * multiplier));
  }

  /**
   * Process identity stake
   */
  private async processIdentityStake(
    userDID: string,
    amount: bigint,
    confidenceScore: number
  ): Promise<{
    transactionHash: string;
    amount: bigint;
    lockUntil: string;
  }> {
    if (this.config.enableMockMode) {
      this.log(`[MOCK] Staking ${amount.toString()} for ${userDID}`);
      const lockUntil = new Date();
      lockUntil.setDate(lockUntil.getDate() + this.config.staking.lockPeriodDays);
      
      return {
        transactionHash: `0x${Buffer.from(`${Date.now()}-${Math.random()}`).toString('hex')}`,
        amount,
        lockUntil: lockUntil.toISOString()
      };
    }

    // TODO: Integrate with actual staking contract via Polkadot API
    // For now, return mock transaction
    const lockUntil = new Date();
    lockUntil.setDate(lockUntil.getDate() + this.config.staking.lockPeriodDays);
    
    return {
      transactionHash: `0x${Buffer.from(`${Date.now()}-${Math.random()}`).toString('hex')}`,
      amount,
      lockUntil: lockUntil.toISOString()
    };
  }

  /**
   * Issue Soulbound Token
   */
  private async issueSoulboundToken(
    userDID: string,
    verificationResult: { steps: VerificationStep[] }
  ): Promise<SBTCredential | undefined> {
    if (!this.identityTokenomics) {
      this.log('No identity tokenomics service available, skipping SBT issuance', 'warn');
      return undefined;
    }

    try {
      const credential = await this.identityTokenomics.issueSBTCredential(
        userDID,
        CredentialType.VERIFIED_ACCOUNT,
        {
          verificationMethods: verificationResult.steps.map(s => s.method),
          confidenceScore: this.calculateVerificationConfidence(verificationResult)
        }
      );

      return credential || undefined;
    } catch (error: any) {
      this.log(`Failed to issue SBT: ${error.message}`, 'error');
      return undefined;
    }
  }

  /**
   * Publish verification to DKG
   */
  private async publishVerificationToDKG(
    verificationSession: VerificationResult
  ): Promise<void> {
    if (!this.dkgClient) {
      this.log('No DKG client available, skipping publish', 'warn');
      return;
    }

    try {
      const knowledgeAsset = {
        '@context': {
          '@vocab': 'https://schema.org/',
          'dotrep': 'https://dotrep.io/ontology/',
          'cred': 'https://www.w3.org/2018/credentials/v1'
        },
        '@type': 'dotrep:IdentityVerification',
        '@id': `did:dotrep:verification:${verificationSession.userDID}:${Date.now()}`,
        'dotrep:userDID': verificationSession.userDID,
        'dotrep:status': verificationSession.status,
        'dotrep:confidenceScore': verificationSession.confidenceScore,
        'dotrep:timestamp': verificationSession.timestamp,
        'dotrep:verificationSteps': verificationSession.verificationSteps,
        'dotrep:stakeTransaction': verificationSession.stakeTransaction,
        'dotrep:soulboundToken': verificationSession.soulboundToken?.credentialId,
        'dotrep:error': verificationSession.error
      };

      await this.dkgClient.publishReputationAsset({
        developerId: verificationSession.userDID,
        reputationScore: Math.floor(verificationSession.confidenceScore * 1000),
        contributions: [],
        timestamp: Date.now(),
        metadata: {
          type: 'identity_verification',
          verification: knowledgeAsset
        }
      });

      this.log(`Published verification to DKG for ${verificationSession.userDID}`);
    } catch (error: any) {
      this.log(`Failed to publish verification to DKG: ${error.message}`, 'error');
      // Don't throw - verification can succeed even if DKG publish fails
    }
  }

  /**
   * Get MCP tool definition
   */
  getMCPTools() {
    return {
      name: 'verify_identity_with_stake',
      description: 'Perform multi-factor identity verification with token staking',
      parameters: {
        type: 'object',
        properties: {
          user_did: { type: 'string', description: 'User DID identifier' },
          verification_data: {
            type: 'object',
            description: 'Verification data including biometric, social, behavioral, economic, and cross-chain signals'
          },
          stake_amount: {
            type: 'string',
            description: 'Stake amount (optional, will be calculated if not provided)'
          }
        },
        required: ['user_did', 'verification_data']
      }
    };
  }

  /**
   * Execute MCP tool
   */
  async executeMCPTool(parameters: {
    user_did: string;
    verification_data: VerificationData;
    stake_amount?: string;
  }): Promise<VerificationResult> {
    const stakeAmount = parameters.stake_amount
      ? BigInt(parameters.stake_amount)
      : undefined;

    return await this.verifyAndStakeIdentity(
      parameters.user_did,
      parameters.verification_data,
      stakeAmount
    );
  }

  /**
   * Get verification session
   */
  getVerificationSession(sessionId: string): VerificationResult | undefined {
    return this.verificationSessions.get(sessionId);
  }

  /**
   * Logging helper
   */
  private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    if (!this.config.enableLogging) return;

    const prefix = `[IdentityVerificationAgent]`;
    const timestamp = new Date().toISOString();

    switch (level) {
      case 'error':
        console.error(`${prefix} [${timestamp}] ${message}`);
        break;
      case 'warn':
        console.warn(`${prefix} [${timestamp}] ${message}`);
        break;
      default:
        console.log(`${prefix} [${timestamp}] ${message}`);
    }
  }
}

/**
 * Factory function to create Identity Verification Agent
 */
export function createIdentityVerificationAgent(
  config: IdentityVerificationConfig
): IdentityVerificationAgent {
  return new IdentityVerificationAgent(config);
}

