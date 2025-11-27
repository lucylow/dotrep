/**
 * Identity & Trust Workflow Orchestrator
 * 
 * Orchestrates the complete identity verification and trust scoring workflow
 * by combining all agent systems: Identity Verification, Community Vetting,
 * Economic Behavior Analysis, and Token-Curated Registries.
 */

import { IdentityVerificationAgent, type VerificationResult } from './identity-verification-agent';
import { CommunityVettingAgent, type VettingSession } from './community-vetting-agent';
import { EconomicBehaviorAgent, type EconomicAnalysis } from './economic-behavior-agent';
import { TokenCuratedRegistryAgent, type Registry, type RegistryEntry } from './tcr-agent';
import { DKGClientV8, type DKGConfig } from '../dkg-client-v8';
import { IdentityTokenomicsService } from '../identity-tokenomics';

export interface UserData {
  userDID: string;
  walletAddress?: string;
  verification: {
    biometric?: {
      provider: string;
      proof: string;
      confidence?: number;
    };
    social?: {
      connections: string[];
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
  };
  initialStake?: bigint;
}

export interface OnboardingWorkflow {
  userDID: string;
  startTime: string;
  endTime?: string;
  steps: string[];
  finalStatus: 'pending' | 'completed' | 'failed';
  trustScore?: number;
  identityResult?: VerificationResult;
  vettingSession?: VettingSession;
  economicAnalysis?: EconomicAnalysis;
  tcrApplications?: RegistryEntry[];
  error?: string;
}

export interface WorkflowConfig {
  dkgClient?: DKGClientV8;
  dkgConfig?: DKGConfig;
  identityTokenomics?: IdentityTokenomicsService;
  
  identityAgent?: IdentityVerificationAgent;
  vettingAgent?: CommunityVettingAgent;
  economicAgent?: EconomicBehaviorAgent;
  tcrAgent?: TokenCuratedRegistryAgent;
  
  workflow: {
    requireVettingForLowConfidence: boolean;
    confidenceThresholdForVetting: number; // 0-1
    enableTCRApplications: boolean;
    enableEconomicAnalysis: boolean;
  };
  
  enableMockMode?: boolean;
  enableLogging?: boolean;
}

/**
 * Identity & Trust Workflow Orchestrator
 * 
 * Coordinates the complete onboarding and trust scoring process:
 * 1. Identity Verification with staking
 * 2. Community Vetting (if needed)
 * 3. Economic Behavior Analysis
 * 4. Token-Curated Registry Applications
 * 5. Composite Trust Score Calculation
 */
export class IdentityTrustWorkflow {
  private config: Required<WorkflowConfig>;
  private identityAgent: IdentityVerificationAgent;
  private vettingAgent: CommunityVettingAgent;
  private economicAgent: EconomicBehaviorAgent;
  private tcrAgent: TokenCuratedRegistryAgent;
  private workflows: Map<string, OnboardingWorkflow> = new Map();

  constructor(config: WorkflowConfig) {
    this.config = {
      dkgClient: config.dkgClient || null,
      dkgConfig: config.dkgConfig,
      identityTokenomics: config.identityTokenomics || null,
      identityAgent: config.identityAgent || null,
      vettingAgent: config.vettingAgent || null,
      economicAgent: config.economicAgent || null,
      tcrAgent: config.tcrAgent || null,
      workflow: {
        requireVettingForLowConfidence: true,
        confidenceThresholdForVetting: 0.7,
        enableTCRApplications: true,
        enableEconomicAnalysis: true,
        ...config.workflow
      },
      enableMockMode: config.enableMockMode ?? process.env.IDENTITY_WORKFLOW_MOCK === 'true',
      enableLogging: config.enableLogging ?? true
    };

    // Initialize agents if not provided
    if (!this.config.identityAgent) {
      const { createIdentityVerificationAgent } = require('./identity-verification-agent');
      this.identityAgent = createIdentityVerificationAgent({
        dkgClient: this.config.dkgClient,
        dkgConfig: this.config.dkgConfig,
        identityTokenomics: this.config.identityTokenomics,
        enableMockMode: this.config.enableMockMode
      });
    } else {
      this.identityAgent = this.config.identityAgent;
    }

    if (!this.config.vettingAgent) {
      const { createCommunityVettingAgent } = require('./community-vetting-agent');
      this.vettingAgent = createCommunityVettingAgent({
        dkgClient: this.config.dkgClient,
        dkgConfig: this.config.dkgConfig,
        identityTokenomics: this.config.identityTokenomics,
        enableMockMode: this.config.enableMockMode
      });
    } else {
      this.vettingAgent = this.config.vettingAgent;
    }

    if (!this.config.economicAgent) {
      const { createEconomicBehaviorAgent } = require('./economic-behavior-agent');
      this.economicAgent = createEconomicBehaviorAgent({
        dkgClient: this.config.dkgClient,
        dkgConfig: this.config.dkgConfig,
        identityTokenomics: this.config.identityTokenomics,
        enableMockMode: this.config.enableMockMode
      });
    } else {
      this.economicAgent = this.config.economicAgent;
    }

    if (!this.config.tcrAgent) {
      const { createTCRAgent } = require('./tcr-agent');
      this.tcrAgent = createTCRAgent({
        dkgClient: this.config.dkgClient,
        dkgConfig: this.config.dkgConfig,
        identityTokenomics: this.config.identityTokenomics,
        enableMockMode: this.config.enableMockMode
      });
    } else {
      this.tcrAgent = this.config.tcrAgent;
    }
  }

  /**
   * Onboard new user with complete identity and trust verification
   */
  async onboardNewUser(userData: UserData): Promise<OnboardingWorkflow> {
    const workflowId = `workflow-${Date.now()}-${userData.userDID}`;
    
    const workflow: OnboardingWorkflow = {
      userDID: userData.userDID,
      startTime: new Date().toISOString(),
      steps: [],
      finalStatus: 'pending'
    };

    try {
      this.log(`Starting onboarding workflow for ${userData.userDID}`);

      // Step 1: Initial identity verification with staking
      workflow.steps.push('identity_verification');
      this.log('Step 1: Identity Verification');
      
      const identityResult = await this.identityAgent.verifyAndStakeIdentity(
        userData.userDID,
        userData.verification,
        userData.initialStake
      );

      workflow.identityResult = identityResult;

      // Step 2: Community vetting for borderline cases
      if (this.config.workflow.requireVettingForLowConfidence &&
          identityResult.confidenceScore < this.config.workflow.confidenceThresholdForVetting) {
        workflow.steps.push('community_vetting');
        this.log('Step 2: Community Vetting (low confidence)');
        
        const vettingResult = await this.vettingAgent.initiateCommunityVetting(
          userData.userDID,
          5 // 5 vouchers
        );
        
        workflow.vettingSession = vettingResult;
      }

      // Step 3: Economic behavior analysis
      if (this.config.workflow.enableEconomicAnalysis) {
        workflow.steps.push('economic_analysis');
        this.log('Step 3: Economic Behavior Analysis');
        
        const economicAnalysis = await this.economicAgent.analyzeEconomicBehavior(
          userData.userDID,
          '30d'
        );
        
        workflow.economicAnalysis = economicAnalysis;
      }

      // Step 4: Apply to relevant TCRs based on analysis
      if (this.config.workflow.enableTCRApplications && workflow.economicAnalysis) {
        workflow.steps.push('tcr_application');
        this.log('Step 4: Token-Curated Registry Applications');
        
        const tcrApplications = await this.applyToRelevantTCRs(
          userData.userDID,
          workflow.economicAnalysis
        );
        
        workflow.tcrApplications = tcrApplications;
      }

      // Step 5: Calculate final trust score
      workflow.steps.push('trust_scoring');
      this.log('Step 5: Composite Trust Score Calculation');
      
      const trustScore = await this.calculateCompositeTrustScore(
        identityResult,
        workflow.economicAnalysis,
        workflow.tcrApplications || []
      );

      workflow.trustScore = trustScore;
      workflow.finalStatus = 'completed';
      workflow.endTime = new Date().toISOString();

      // Publish complete workflow to DKG
      await this.publishOnboardingWorkflow(workflow);

      this.log(`Onboarding workflow completed for ${userData.userDID}: trustScore=${trustScore.toFixed(2)}`);
      this.workflows.set(workflowId, workflow);

      return workflow;

    } catch (error: any) {
      workflow.finalStatus = 'failed';
      workflow.error = error.message;
      workflow.endTime = new Date().toISOString();
      
      this.log(`Onboarding workflow failed for ${userData.userDID}: ${error.message}`, 'error');
      
      await this.publishOnboardingWorkflow(workflow).catch(() => {
        // Ignore DKG publish errors for failed workflows
      });
      
      this.workflows.set(workflowId, workflow);
      throw error;
    }
  }

  /**
   * Calculate composite trust score from all components
   */
  private async calculateCompositeTrustScore(
    identityResult: VerificationResult,
    economicAnalysis?: EconomicAnalysis,
    tcrApplications: RegistryEntry[] = []
  ): Promise<number> {
    const weights = {
      identity: 0.4,
      economic: 0.3,
      community: 0.2,
      tcr: 0.1
    };

    let score = 0;

    // Identity verification score
    score += identityResult.confidenceScore * weights.identity;

    // Economic behavior score
    if (economicAnalysis) {
      score += economicAnalysis.trustScore * weights.economic;
    } else {
      score += 0.5 * weights.economic; // Default if no analysis
    }

    // Community vetting score (if applicable)
    if (identityResult.status === 'verified' && identityResult.confidenceScore >= 0.7) {
      score += weights.community; // Full points if no vetting needed
    } else {
      // Would need vetting session result here
      score += 0.5 * weights.community; // Partial points
    }

    // TCR membership score
    const tcrScore = this.calculateTCRScore(tcrApplications);
    score += tcrScore * weights.tcr;

    return Math.min(score, 1.0);
  }

  /**
   * Calculate TCR score from applications
   */
  private calculateTCRScore(tcrApplications: RegistryEntry[]): number {
    if (tcrApplications.length === 0) return 0;

    let totalScore = 0;
    tcrApplications.forEach(app => {
      if (app.status === 'approved') {
        totalScore += 0.8; // Approved application
      } else if (app.status === 'pending') {
        totalScore += 0.3; // Pending application
      }
      // Rejected applications don't contribute
    });

    return totalScore / tcrApplications.length;
  }

  /**
   * Apply to relevant TCRs based on economic analysis
   */
  private async applyToRelevantTCRs(
    userDID: string,
    economicAnalysis: EconomicAnalysis
  ): Promise<RegistryEntry[]> {
    const applications: RegistryEntry[] = [];

    try {
      // Find eligible TCRs
      const eligibleTCRs = await this.findEligibleTCRs(economicAnalysis);

      for (const tcr of eligibleTCRs) {
        try {
          const application = await this.tcrAgent.applyForRegistry(
            tcr.id,
            userDID,
            {
              economicTrustScore: economicAnalysis.trustScore,
              riskLevel: economicAnalysis.riskLevel,
              verificationMethods: ['multi_factor']
            },
            tcr.baseStake
          );

          applications.push(application);
        } catch (error: any) {
          this.log(`Failed to apply to TCR ${tcr.id}: ${error.message}`, 'warn');
        }
      }
    } catch (error: any) {
      this.log(`Failed to find eligible TCRs: ${error.message}`, 'warn');
    }

    return applications;
  }

  /**
   * Find eligible TCRs based on economic analysis
   */
  private async findEligibleTCRs(
    economicAnalysis: EconomicAnalysis
  ): Promise<Array<{ id: string; name: string; baseStake: bigint }>> {
    // TODO: Query DKG for TCRs matching user's economic profile
    // For now, return empty array
    return [];
  }

  /**
   * Publish onboarding workflow to DKG
   */
  private async publishOnboardingWorkflow(workflow: OnboardingWorkflow): Promise<void> {
    // Workflow is already published by individual agents
    // This is for overall workflow tracking
    this.log(`Workflow ${workflow.userDID} status: ${workflow.finalStatus}`);
  }

  /**
   * Get workflow by ID
   */
  getWorkflow(workflowId: string): OnboardingWorkflow | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * Get all workflows for a user
   */
  getUserWorkflows(userDID: string): OnboardingWorkflow[] {
    return Array.from(this.workflows.values())
      .filter(w => w.userDID === userDID);
  }

  /**
   * Logging helper
   */
  private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    if (!this.config.enableLogging) return;

    const prefix = '[IdentityTrustWorkflow]';
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
 * Factory function
 */
export function createIdentityTrustWorkflow(
  config: WorkflowConfig
): IdentityTrustWorkflow {
  return new IdentityTrustWorkflow(config);
}

