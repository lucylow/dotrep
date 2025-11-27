/**
 * Token-Curated Registry (TCR) Agent
 * 
 * Implements token-curated registries for community-driven curation of trustworthy accounts.
 * Features voting, staking, slashing, and reward distribution mechanisms.
 */

import { DKGClientV8, type DKGConfig } from '../dkg-client-v8';
import { IdentityTokenomicsService } from '../identity-tokenomics';

export interface RegistryConfig {
  name: string;
  description: string;
  token: string; // Token address or symbol
  baseStake: bigint;
  challengePeriod: string; // e.g., '7d'
  approvalThreshold: number; // 0-1, default 0.67
}

export interface Registry {
  id: string;
  name: string;
  description: string;
  token: string;
  baseStake: bigint;
  challengePeriod: string;
  approvalThreshold: number;
  entries: Map<string, RegistryEntry>;
  challenges: Map<string, RegistryChallenge>;
  contractAddress?: string;
  created: string;
  status: 'active' | 'paused' | 'archived';
}

export interface RegistryEntry {
  id: string;
  registryId: string;
  applicantDID: string;
  metadata: Record<string, any>;
  stakeAmount: bigint;
  status: 'pending' | 'approved' | 'rejected' | 'challenged';
  appliedAt: string;
  approvedAt?: string;
  votes: Map<string, VoteRecord>;
  totalStake: bigint;
  stakeTransaction?: {
    transactionHash: string;
    timestamp: string;
  };
}

export interface VoteRecord {
  voterDID: string;
  vote: 'approve' | 'reject';
  stakeAmount: bigint;
  timestamp: string;
  transactionHash?: string;
}

export interface RegistryChallenge {
  id: string;
  registryId: string;
  entryId: string;
  challengerDID: string;
  reason?: string;
  challengeStake: bigint;
  status: 'active' | 'resolved';
  createdAt: string;
  resolvedAt?: string;
  votes: Map<string, VoteRecord>;
}

export interface TCRConfig {
  dkgClient?: DKGClientV8;
  dkgConfig?: DKGConfig;
  identityTokenomics?: IdentityTokenomicsService;
  
  registry: {
    defaultChallengePeriod: string;
    defaultApprovalThreshold: number;
    defaultBaseStake: bigint;
  };
  
  voting: {
    votingPeriodDays: number;
    quorumPercentage: number;
    earlyFinalizationEnabled: boolean;
  };
  
  rewards: {
    rewardPercentage: number; // % of application stake
    distributionMethod: 'proportional' | 'equal';
  };
  
  enableMockMode?: boolean;
  enableLogging?: boolean;
}

/**
 * Token-Curated Registry Agent
 * 
 * Manages token-curated registries with:
 * - Registry creation and management
 * - Application and voting processes
 * - Challenge mechanisms
 * - Reward distribution
 * - Slashing for false approvals
 */
export class TokenCuratedRegistryAgent {
  private config: TCRConfig & {
    registry: {
      defaultChallengePeriod: string;
      defaultApprovalThreshold: number;
      defaultBaseStake: bigint;
    };
    voting: {
      votingPeriodDays: number;
      quorumPercentage: number;
      earlyFinalizationEnabled: boolean;
    };
    rewards: {
      rewardPercentage: number;
      distributionMethod: 'proportional' | 'equal';
    };
    enableMockMode: boolean;
    enableLogging: boolean;
  };
  private dkgClient: DKGClientV8 | null = null;
  private identityTokenomics: IdentityTokenomicsService | null = null;
  private registries: Map<string, Registry> = new Map();
  private challengePeriods: Map<string, {
    applicationId: string;
    startTime: string;
    endTime: string;
    votes: Map<string, VoteRecord>;
    totalStake: bigint;
  }> = new Map();

  constructor(config: TCRConfig) {
    this.config = {
      dkgClient: config.dkgClient,
      dkgConfig: config.dkgConfig,
      identityTokenomics: config.identityTokenomics,
      registry: {
        ...{
          defaultChallengePeriod: '7d',
          defaultApprovalThreshold: 0.67,
          defaultBaseStake: BigInt(1000) * BigInt(10 ** 18),
        },
        ...config.registry
      },
      voting: {
        ...{
          votingPeriodDays: 7,
          quorumPercentage: 0.6,
          earlyFinalizationEnabled: true,
        },
        ...config.voting
      },
      rewards: {
        ...{
          rewardPercentage: 0.1,
          distributionMethod: 'proportional',
        },
        ...config.rewards
      },
      enableMockMode: config.enableMockMode ?? process.env.TCR_MOCK === 'true',
      enableLogging: config.enableLogging ?? true
    };

    // Initialize DKG client
    if (this.config.dkgClient) {
      this.dkgClient = this.config.dkgClient;
    } else if (this.config.dkgConfig) {
      const { createDKGClientV8 } = require('../dkg-client-v8');
      this.dkgClient = createDKGClientV8(this.config.dkgConfig);
    }

    // Initialize Identity Tokenomics
    if (this.config.identityTokenomics) {
      this.identityTokenomics = this.config.identityTokenomics;
    }
  }

  /**
   * Create a new token-curated registry
   */
  async createRegistry(registryConfig: RegistryConfig): Promise<Registry> {
    const registry: Registry = {
      id: `tcr-${Date.now()}-${registryConfig.name.toLowerCase().replace(/\s+/g, '-')}`,
      name: registryConfig.name,
      description: registryConfig.description,
      token: registryConfig.token,
      baseStake: registryConfig.baseStake || this.config.registry.defaultBaseStake,
      challengePeriod: registryConfig.challengePeriod || this.config.registry.defaultChallengePeriod,
      approvalThreshold: registryConfig.approvalThreshold || this.config.registry.defaultApprovalThreshold,
      entries: new Map(),
      challenges: new Map(),
      created: new Date().toISOString(),
      status: 'active'
    };

    try {
      this.log(`Creating registry: ${registry.id}`);

      // Deploy TCR smart contract (mock for now)
      if (this.config.enableMockMode) {
        registry.contractAddress = `0x${Buffer.from(registry.id).toString('hex').slice(0, 40)}`;
      } else {
        // TODO: Deploy actual smart contract
        registry.contractAddress = `0x${Buffer.from(registry.id).toString('hex').slice(0, 40)}`;
      }

      this.registries.set(registry.id, registry);

      // Publish registry to DKG
      await this.publishRegistryToDKG(registry);

      this.log(`Registry created: ${registry.id}`);
      return registry;
    } catch (error: any) {
      this.log(`Failed to create registry: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Apply for registry membership
   */
  async applyForRegistry(
    registryId: string,
    applicantDID: string,
    metadata: Record<string, any>,
    stakeAmount?: bigint
  ): Promise<RegistryEntry> {
    const registry = this.registries.get(registryId);
    if (!registry) {
      throw new Error('Registry not found');
    }

    if (registry.status !== 'active') {
      throw new Error(`Registry is ${registry.status}, cannot accept applications`);
    }

    const application: RegistryEntry = {
      id: `application-${Date.now()}-${applicantDID}`,
      registryId,
      applicantDID,
      metadata,
      stakeAmount: stakeAmount || registry.baseStake,
      status: 'pending',
      appliedAt: new Date().toISOString(),
      votes: new Map(),
      totalStake: BigInt(0)
    };

    try {
      this.log(`Application received: ${application.id} for registry ${registryId}`);

      // Stake tokens for application
      const stakeResult = await this.stakeTokensForApplication(
        applicantDID,
        application.stakeAmount,
        registry.contractAddress || ''
      );
      application.stakeTransaction = stakeResult;

      // Start voting period
      await this.startApplicationVoting(registry, application);

      registry.entries.set(application.id, application);
      this.log(`Application ${application.id} added to registry ${registryId}`);

      return application;
    } catch (error: any) {
      this.log(`Failed to process application: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Start application voting period
   */
  private async startApplicationVoting(
    registry: Registry,
    application: RegistryEntry
  ): Promise<void> {
    const votingPeriod = {
      applicationId: application.id,
      startTime: new Date().toISOString(),
      endTime: new Date(
        Date.now() + this.config.voting.votingPeriodDays * 24 * 60 * 60 * 1000
      ).toISOString(),
      votes: new Map<string, VoteRecord>(),
      totalStake: BigInt(0)
    };

    this.challengePeriods.set(application.id, votingPeriod);
    this.log(`Voting period started for application ${application.id}`);
  }

  /**
   * Vote on registry application
   */
  async voteOnApplication(
    registryId: string,
    applicationId: string,
    voterDID: string,
    vote: 'approve' | 'reject',
    stakeAmount: bigint
  ): Promise<VoteRecord> {
    const registry = this.registries.get(registryId);
    const application = registry?.entries.get(applicationId);
    const votingPeriod = this.challengePeriods.get(applicationId);

    if (!registry || !application) {
      throw new Error('Registry or application not found');
    }

    if (!votingPeriod) {
      throw new Error('Voting period not found');
    }

    if (new Date() > new Date(votingPeriod.endTime)) {
      throw new Error('Voting period has ended');
    }

    if (application.status !== 'pending') {
      throw new Error(`Application is ${application.status}, cannot accept votes`);
    }

    // Verify voter has sufficient tokens (mock for now)
    if (this.config.enableMockMode) {
      this.log(`[MOCK] Verifying token balance for ${voterDID}`);
    } else {
      // TODO: Verify actual token balance
    }

    // Stake tokens for voting
    const stakeResult = await this.stakeTokensForVoting(
      voterDID,
      stakeAmount,
      registry.contractAddress || ''
    );

    // Record vote
    const voteRecord: VoteRecord = {
      voterDID,
      vote,
      stakeAmount,
      timestamp: new Date().toISOString(),
      transactionHash: stakeResult.transactionHash
    };

    votingPeriod.votes.set(voterDID, voteRecord);
    votingPeriod.totalStake += stakeAmount;
    application.votes.set(voterDID, voteRecord);
    application.totalStake += stakeAmount;

    this.log(`Vote recorded: ${voterDID} voted ${vote} on application ${applicationId}`);

    // Check if voting can be finalized early
    if (this.config.voting.earlyFinalizationEnabled && this.canFinalizeEarly(votingPeriod, registry)) {
      await this.finalizeApplication(registry, application, votingPeriod);
    }

    return voteRecord;
  }

  /**
   * Check if voting can be finalized early
   */
  private canFinalizeEarly(
    votingPeriod: { votes: Map<string, VoteRecord>; totalStake: bigint; endTime: string },
    registry: Registry
  ): boolean {
    const { votes, totalStake } = votingPeriod;

    // Calculate current approval rate
    let approveStake = BigInt(0);
    let rejectStake = BigInt(0);

    for (const vote of votes.values()) {
      if (vote.vote === 'approve') {
        approveStake += vote.stakeAmount;
      } else {
        rejectStake += vote.stakeAmount;
      }
    }

    const approvalRate = totalStake > 0 ? Number(approveStake) / Number(totalStake) : 0;

    // Check if outcome is mathematically certain
    const remainingTime = new Date(votingPeriod.endTime).getTime() - Date.now();
    const timeRatio = remainingTime / (this.config.voting.votingPeriodDays * 24 * 60 * 60 * 1000);
    const maxPossibleStake = totalStake * BigInt(Math.floor((1 + timeRatio) * 10000)) / BigInt(10000);

    if (approvalRate >= registry.approvalThreshold) {
      const minPossibleApproval = Number(approveStake) / Number(maxPossibleStake);
      return minPossibleApproval >= registry.approvalThreshold;
    } else {
      const maxPossibleApproval = Number(approveStake + (maxPossibleStake - totalStake)) / Number(maxPossibleStake);
      return maxPossibleApproval < registry.approvalThreshold;
    }
  }

  /**
   * Finalize application
   */
  private async finalizeApplication(
    registry: Registry,
    application: RegistryEntry,
    votingPeriod: { votes: Map<string, VoteRecord>; totalStake: bigint }
  ): Promise<void> {
    const result = this.calculateVotingResult(votingPeriod, registry.approvalThreshold);

    if (result.approved) {
      application.status = 'approved';
      application.approvedAt = new Date().toISOString();

      // Issue registry membership credential
      await this.issueRegistryMembership(registry, application);

      // Distribute rewards to approving voters
      await this.distributeVotingRewards(registry, application, votingPeriod, 'approve');
    } else {
      application.status = 'rejected';

      // Slash applicant's stake
      await this.slashApplicationStake(application);

      // Distribute rewards to rejecting voters
      await this.distributeVotingRewards(registry, application, votingPeriod, 'reject');
    }

    // Update registry on DKG
    await this.updateRegistryOnDKG(registry);

    // Remove from active challenges
    this.challengePeriods.delete(application.id);

    this.log(`Application ${application.id} finalized: ${result.approved ? 'APPROVED' : 'REJECTED'}`);
  }

  /**
   * Calculate voting result
   */
  private calculateVotingResult(
    votingPeriod: { votes: Map<string, VoteRecord>; totalStake: bigint },
    approvalThreshold: number
  ): { approved: boolean; approvalRate: number; approveStake: bigint; rejectStake: bigint; totalStake: bigint; voterCount: number } {
    let approveStake = BigInt(0);
    let rejectStake = BigInt(0);

    for (const vote of votingPeriod.votes.values()) {
      if (vote.vote === 'approve') {
        approveStake += vote.stakeAmount;
      } else {
        rejectStake += vote.stakeAmount;
      }
    }

    const totalStake = approveStake + rejectStake;
    const approvalRate = totalStake > 0 ? Number(approveStake) / Number(totalStake) : 0;

    return {
      approved: approvalRate >= approvalThreshold,
      approvalRate,
      approveStake,
      rejectStake,
      totalStake,
      voterCount: votingPeriod.votes.size
    };
  }

  /**
   * Issue registry membership credential
   */
  private async issueRegistryMembership(
    registry: Registry,
    application: RegistryEntry
  ): Promise<void> {
    if (!this.identityTokenomics) {
      this.log('No identity tokenomics service available, skipping credential issuance', 'warn');
      return;
    }

    try {
      await this.identityTokenomics.issueSBTCredential(
        application.applicantDID,
        require('../identity-tokenomics').CredentialType.COMMUNITY_ENDORSED,
        {
          registryId: registry.id,
          registryName: registry.name,
          stakeAmount: application.stakeAmount.toString(),
          metadata: application.metadata
        }
      );

      this.log(`Issued registry membership credential for ${application.applicantDID}`);
    } catch (error: any) {
      this.log(`Failed to issue registry membership credential: ${error.message}`, 'error');
    }
  }

  /**
   * Distribute voting rewards
   */
  private async distributeVotingRewards(
    registry: Registry,
    application: RegistryEntry,
    votingPeriod: { votes: Map<string, VoteRecord> },
    outcome: 'approve' | 'reject'
  ): Promise<void> {
    const rewardPool = application.stakeAmount *
      BigInt(Math.floor(this.config.rewards.rewardPercentage * 100)) / BigInt(100);

    const rewards = this.calculateVoterRewards(votingPeriod, outcome, rewardPool);

    this.log(`Distributing rewards: ${Object.keys(rewards).length} recipients, total ${rewardPool.toString()}`);

    // TODO: Implement actual token transfers
    for (const [voterDID, amount] of Object.entries(rewards)) {
      this.log(`Rewarding ${voterDID}: ${amount.toString()}`);
    }
  }

  /**
   * Calculate voter rewards
   */
  private calculateVoterRewards(
    votingPeriod: { votes: Map<string, VoteRecord> },
    outcome: 'approve' | 'reject',
    totalRewardPool: bigint
  ): Record<string, bigint> {
    const rewards: Record<string, number> = {};
    let totalCorrectStake = BigInt(0);

    // Calculate correct votes
    for (const [voterDID, vote] of votingPeriod.votes) {
      const isCorrect = (outcome === 'approve' && vote.vote === 'approve') ||
        (outcome === 'reject' && vote.vote === 'reject');

      if (isCorrect) {
        rewards[voterDID] = Number(vote.stakeAmount);
        totalCorrectStake += vote.stakeAmount;
      } else {
        rewards[voterDID] = 0;
      }
    }

    // Distribute rewards proportionally
    const finalRewards: Record<string, bigint> = {};
    if (totalCorrectStake > 0) {
      for (const voterDID in rewards) {
        if (rewards[voterDID] > 0) {
          const share = rewards[voterDID] / Number(totalCorrectStake);
          finalRewards[voterDID] = totalRewardPool * BigInt(Math.floor(share * 10000)) / BigInt(10000);
        } else {
          finalRewards[voterDID] = BigInt(0);
        }
      }
    }

    return finalRewards;
  }

  /**
   * Slash application stake
   */
  private async slashApplicationStake(application: RegistryEntry): Promise<void> {
    this.log(`Slashing stake for rejected application ${application.id}`);
    // TODO: Implement actual slashing
  }

  /**
   * Stake tokens for application
   */
  private async stakeTokensForApplication(
    applicantDID: string,
    amount: bigint,
    contractAddress: string
  ): Promise<{ transactionHash: string; timestamp: string }> {
    if (this.config.enableMockMode) {
      return {
        transactionHash: `0x${Buffer.from(`${Date.now()}-${Math.random()}`).toString('hex')}`,
        timestamp: new Date().toISOString()
      };
    }

    // TODO: Implement actual staking
    return {
      transactionHash: `0x${Buffer.from(`${Date.now()}-${Math.random()}`).toString('hex')}`,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Stake tokens for voting
   */
  private async stakeTokensForVoting(
    voterDID: string,
    amount: bigint,
    contractAddress: string
  ): Promise<{ transactionHash: string }> {
    if (this.config.enableMockMode) {
      return {
        transactionHash: `0x${Buffer.from(`${Date.now()}-${Math.random()}`).toString('hex')}`
      };
    }

    // TODO: Implement actual staking
    return {
      transactionHash: `0x${Buffer.from(`${Date.now()}-${Math.random()}`).toString('hex')}`
    };
  }

  /**
   * Publish registry to DKG
   */
  private async publishRegistryToDKG(registry: Registry): Promise<void> {
    if (!this.dkgClient) {
      this.log('No DKG client available, skipping publish', 'warn');
      return;
    }

    try {
      await this.dkgClient.publishReputationAsset({
        developerId: registry.id,
        reputationScore: 0,
        contributions: [],
        timestamp: Date.now(),
        metadata: {
          type: 'token_curated_registry',
          registry: {
            id: registry.id,
            name: registry.name,
            description: registry.description,
            token: registry.token,
            baseStake: registry.baseStake.toString(),
            approvalThreshold: registry.approvalThreshold,
            contractAddress: registry.contractAddress,
            created: registry.created,
            status: registry.status
          }
        }
      });

      this.log(`Published registry to DKG: ${registry.id}`);
    } catch (error: any) {
      this.log(`Failed to publish registry: ${error.message}`, 'error');
    }
  }

  /**
   * Update registry on DKG
   */
  private async updateRegistryOnDKG(registry: Registry): Promise<void> {
    // Similar to publishRegistryToDKG but for updates
    await this.publishRegistryToDKG(registry);
  }

  /**
   * Get registry
   */
  getRegistry(registryId: string): Registry | undefined {
    return this.registries.get(registryId);
  }

  /**
   * Get registry entry
   */
  getRegistryEntry(registryId: string, entryId: string): RegistryEntry | undefined {
    const registry = this.registries.get(registryId);
    return registry?.entries.get(entryId);
  }

  /**
   * Get MCP tools
   */
  getMCPTools() {
    return [
      {
        name: 'create_token_curated_registry',
        description: 'Create a new token-curated registry for trustworthy accounts',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            token: { type: 'string' },
            base_stake: { type: 'string' },
            challenge_period: { type: 'string', default: '7d' },
            approval_threshold: { type: 'number', default: 0.67 }
          },
          required: ['name', 'description', 'token']
        }
      },
      {
        name: 'apply_to_registry',
        description: 'Apply to join a token-curated registry',
        parameters: {
          type: 'object',
          properties: {
            registry_id: { type: 'string' },
            applicant_did: { type: 'string' },
            metadata: { type: 'object' },
            stake_amount: { type: 'string' }
          },
          required: ['registry_id', 'applicant_did', 'metadata']
        }
      },
      {
        name: 'vote_on_registry_application',
        description: 'Vote on a registry application with token stake',
        parameters: {
          type: 'object',
          properties: {
            registry_id: { type: 'string' },
            application_id: { type: 'string' },
            voter_did: { type: 'string' },
            vote: { type: 'string', enum: ['approve', 'reject'] },
            stake_amount: { type: 'string' }
          },
          required: ['registry_id', 'application_id', 'voter_did', 'vote']
        }
      }
    ];
  }

  /**
   * Execute MCP tool
   */
  async executeMCPTool(toolName: string, parameters: any): Promise<any> {
    switch (toolName) {
      case 'create_token_curated_registry':
        return await this.createRegistry({
          name: parameters.name,
          description: parameters.description,
          token: parameters.token,
          baseStake: parameters.base_stake ? BigInt(parameters.base_stake) : this.config.registry.defaultBaseStake,
          challengePeriod: parameters.challenge_period,
          approvalThreshold: parameters.approval_threshold
        });
      case 'apply_to_registry':
        return await this.applyForRegistry(
          parameters.registry_id,
          parameters.applicant_did,
          parameters.metadata,
          parameters.stake_amount ? BigInt(parameters.stake_amount) : undefined
        );
      case 'vote_on_registry_application':
        return await this.voteOnApplication(
          parameters.registry_id,
          parameters.application_id,
          parameters.voter_did,
          parameters.vote,
          BigInt(parameters.stake_amount)
        );
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  /**
   * Logging helper
   */
  private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    if (!this.config.enableLogging) return;

    const prefix = '[TokenCuratedRegistryAgent]';
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
export function createTCRAgent(config: TCRConfig): TokenCuratedRegistryAgent {
  return new TokenCuratedRegistryAgent(config);
}

