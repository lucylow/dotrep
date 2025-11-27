/**
 * Community Vetting Agent
 * 
 * Implements community-driven vetting with staking, voting, and slashing mechanisms.
 * Uses DKG for querying qualified vouchers and publishing vetting results.
 */

import { DKGClientV8, type DKGConfig } from '../dkg-client-v8';
import { IdentityTokenomicsService, type TCREntry } from '../identity-tokenomics';

export interface Voucher {
  voucherDID: string;
  reputation: number;
  stake: bigint;
  connectionDiversity: number;
  clusterRiskScore?: number;
  recentVouches?: number;
}

export interface VettingSession {
  candidateDID: string;
  sessionId: string;
  status: 'active' | 'completed' | 'cancelled';
  startTime: string;
  endTime?: string;
  requiredStake: bigint;
  vouchers: Voucher[];
  votes: Map<string, {
    vote: 'approve' | 'reject';
    evidence?: string;
    timestamp: string;
    voterReputation: number;
  }>;
  poolAddress?: string;
  result?: {
    approved: boolean;
    approvalRate: number;
    totalWeight: number;
    approveWeight: number;
    rejectWeight: number;
    requiredApproval: number;
  };
}

export interface CommunityVettingConfig {
  dkgClient?: DKGClientV8;
  dkgConfig?: DKGConfig;
  identityTokenomics?: IdentityTokenomicsService;
  
  vetting: {
    defaultPoolSize: number;
    minReputation: number;
    minStake: bigint;
    minConnectionDiversity: number;
    votingPeriodDays: number;
    quorumPercentage: number; // 0-1, default 0.6 (60%)
    approvalThreshold: number; // 0-1, default 0.67 (67%)
    rewardPercentage: number; // 0-1, default 0.1 (10% of total stake)
    slashPercentage: number; // 0-1, default 0.5 (50% slash)
  };
  
  antiCollusion: {
    maxRecentVouches: number; // Max vouches in last 7 days
    maxClusterRiskScore: number; // 0-1, max allowed cluster risk
    requireDiverseClusters: boolean;
  };
  
  enableMockMode?: boolean;
  enableLogging?: boolean;
}

/**
 * Community Vetting Agent
 * 
 * Manages community-driven vetting processes with:
 * - Qualified voucher selection
 * - Anti-collusion measures
 * - Weighted voting with reputation
 * - Stake slashing for false approvals
 * - Reward distribution
 */
export class CommunityVettingAgent {
  private config: CommunityVettingConfig & {
    vetting: {
      defaultPoolSize: number;
      minReputation: number;
      minStake: bigint;
      minConnectionDiversity: number;
      votingPeriodDays: number;
      quorumPercentage: number;
      approvalThreshold: number;
      rewardPercentage: number;
      slashPercentage: number;
    };
    antiCollusion: {
      maxRecentVouches: number;
      maxClusterRiskScore: number;
      requireDiverseClusters: boolean;
    };
    enableMockMode: boolean;
    enableLogging: boolean;
  };
  private dkgClient: DKGClientV8 | null = null;
  private identityTokenomics: IdentityTokenomicsService | null = null;
  private vettingPools: Map<string, VettingSession> = new Map();

  constructor(config: CommunityVettingConfig) {
    this.config = {
      dkgClient: config.dkgClient,
      dkgConfig: config.dkgConfig,
      identityTokenomics: config.identityTokenomics,
      vetting: {
        ...{
          defaultPoolSize: 5,
          minReputation: 0.8,
          minStake: BigInt(5000) * BigInt(10 ** 18), // 5000 tokens
          minConnectionDiversity: 10,
          votingPeriodDays: 7,
          quorumPercentage: 0.6,
          approvalThreshold: 0.67,
          rewardPercentage: 0.1,
          slashPercentage: 0.5,
        },
        ...config.vetting
      },
      antiCollusion: {
        ...{
          maxRecentVouches: 3,
          maxClusterRiskScore: 0.3,
          requireDiverseClusters: true,
        },
        ...config.antiCollusion
      },
      enableMockMode: config.enableMockMode ?? process.env.COMMUNITY_VETTING_MOCK === 'true',
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
   * Initiate community vetting process
   */
  async initiateCommunityVetting(
    candidateDID: string,
    vettingPoolSize?: number
  ): Promise<VettingSession> {
    const poolSize = vettingPoolSize || this.config.vetting.defaultPoolSize;
    const sessionId = `vetting-${Date.now()}-${candidateDID}`;

    const vettingSession: VettingSession = {
      candidateDID,
      sessionId,
      status: 'active',
      startTime: new Date().toISOString(),
      requiredStake: this.calculateRequiredStake(poolSize),
      vouchers: [],
      votes: new Map()
    };

    try {
      this.log(`Initiating community vetting for ${candidateDID} with pool size ${poolSize}`);

      // Step 1: Select qualified vouchers
      const vouchers = await this.selectQualifiedVouchers(candidateDID, poolSize);
      vettingSession.vouchers = vouchers;

      // Step 2: Create vetting pool with staking
      const poolCreation = await this.createVettingPool(vettingSession);
      vettingSession.poolAddress = poolCreation.poolAddress;

      // Step 3: Start voting period
      await this.startVotingPeriod(vettingSession);

      this.vettingPools.set(sessionId, vettingSession);
      this.log(`Vetting session created: ${sessionId}`);

      return vettingSession;
    } catch (error: any) {
      vettingSession.status = 'cancelled';
      this.log(`Failed to initiate vetting: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Select qualified vouchers from DKG
   */
  private async selectQualifiedVouchers(
    candidateDID: string,
    count: number
  ): Promise<Voucher[]> {
    if (this.config.enableMockMode) {
      this.log(`[MOCK] Selecting ${count} qualified vouchers`);
      return this.generateMockVouchers(count);
    }

    // Query DKG for qualified vouchers
    if (!this.dkgClient) {
      throw new Error('DKG client not available for voucher selection');
    }

    try {
      // Build SPARQL query to find qualified vouchers
      const query = `
        PREFIX tm: <https://trust-marketplace.org/schema/v1>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        
        SELECT ?voucher ?reputation ?stake ?connectionDiversity
        WHERE {
          ?profile a tm:TrustedUserProfile ;
                   tm:creator ?voucher ;
                   tm:reputationMetrics/tm:overallScore ?reputation ;
                   tm:economicStake/tm:stakedTokens ?stake .
          
          # Ensure no existing connection to candidate (reduces collusion)
          FILTER NOT EXISTS { ?voucher foaf:knows <${candidateDID}> }
          FILTER NOT EXISTS { <${candidateDID}> foaf:knows ?voucher }
          
          # Calculate connection diversity
          BIND((SELECT (COUNT(DISTINCT ?conn) as ?diversity) 
                WHERE { ?voucher foaf:knows ?conn }) AS ?connectionDiversity)
          
          FILTER (?reputation >= ${this.config.vetting.minReputation})
          FILTER (xsd:integer(?stake) >= ${this.config.vetting.minStake.toString()})
          FILTER (?connectionDiversity >= ${this.config.vetting.minConnectionDiversity})
        }
        ORDER BY DESC(?reputation)
        LIMIT ${count * 2}
      `;

      const results = await this.dkgClient.executeSafeQuery(query, 'SELECT');
      
      // Convert results to Voucher objects
      const potentialVouchers: Voucher[] = results.map((r: any) => ({
        voucherDID: r.voucher?.value || r.voucher,
        reputation: parseFloat(r.reputation?.value || r.reputation || '0'),
        stake: BigInt(r.stake?.value || r.stake || '0'),
        connectionDiversity: parseInt(r.connectionDiversity?.value || r.connectionDiversity || '0')
      }));

      // Apply anti-collusion filters
      const filtered = await this.applyAntiCollusionFilters(potentialVouchers, candidateDID);

      return filtered.slice(0, count);
    } catch (error: any) {
      this.log(`Failed to query vouchers from DKG: ${error.message}`, 'error');
      // Fallback to mock vouchers
      return this.generateMockVouchers(count);
    }
  }

  /**
   * Apply anti-collusion filters
   */
  private async applyAntiCollusionFilters(
    potentialVouchers: Voucher[],
    candidateDID: string
  ): Promise<Voucher[]> {
    const filtered: Voucher[] = [];
    const seenClusters = new Set<string>();

    for (const voucher of potentialVouchers) {
      // Check cluster relationship
      const clusterAnalysis = await this.analyzeClusterRelationship(
        voucher.voucherDID,
        candidateDID
      );
      voucher.clusterRiskScore = clusterAnalysis.riskScore;

      // Check vouch history
      const vouchHistory = await this.getVouchHistory(voucher.voucherDID);
      const recentVouches = vouchHistory.filter(v =>
        new Date(v.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      );
      voucher.recentVouches = recentVouches.length;

      // Apply filters
      const lowClusterRisk = (clusterAnalysis.riskScore || 1.0) < this.config.antiCollusion.maxClusterRiskScore;
      const lowRecentVouches = voucher.recentVouches < this.config.antiCollusion.maxRecentVouches;
      const diverseCluster = !this.config.antiCollusion.requireDiverseClusters ||
        !seenClusters.has(clusterAnalysis.primaryCluster || '');

      if (lowClusterRisk && lowRecentVouches && diverseCluster) {
        filtered.push(voucher);
        if (clusterAnalysis.primaryCluster) {
          seenClusters.add(clusterAnalysis.primaryCluster);
        }
      }
    }

    return filtered;
  }

  /**
   * Analyze cluster relationship between voucher and candidate
   */
  private async analyzeClusterRelationship(
    voucherDID: string,
    candidateDID: string
  ): Promise<{
    riskScore: number;
    primaryCluster?: string;
  }> {
    if (this.config.enableMockMode) {
      return {
        riskScore: Math.random() * 0.2, // Low risk in mock
        primaryCluster: `cluster-${Math.floor(Math.random() * 10)}`
      };
    }

    // TODO: Implement actual cluster analysis using graph algorithms
    // For now, return low risk
    return {
      riskScore: 0.1,
      primaryCluster: 'default-cluster'
    };
  }

  /**
   * Get vouch history for a voucher
   */
  private async getVouchHistory(voucherDID: string): Promise<Array<{ timestamp: string }>> {
    if (this.config.enableMockMode) {
      return [];
    }

    // TODO: Query DKG for vouch history
    return [];
  }

  /**
   * Create vetting pool with staking
   */
  private async createVettingPool(
    session: VettingSession
  ): Promise<{ poolAddress: string }> {
    if (this.config.enableMockMode) {
      this.log(`[MOCK] Creating vetting pool for session ${session.sessionId}`);
      return {
        poolAddress: `0x${Buffer.from(session.sessionId).toString('hex').slice(0, 40)}`
      };
    }

    // TODO: Deploy or create smart contract for vetting pool
    // For now, return mock address
    return {
      poolAddress: `0x${Buffer.from(session.sessionId).toString('hex').slice(0, 40)}`
    };
  }

  /**
   * Start voting period
   */
  private async startVotingPeriod(session: VettingSession): Promise<void> {
    this.log(`Starting voting period for session ${session.sessionId}`);
    // Voting period is implicit - votes can be submitted until finalized
  }

  /**
   * Submit vote in vetting session
   */
  async submitVote(
    vetterDID: string,
    sessionId: string,
    vote: 'approve' | 'reject',
    evidence?: string
  ): Promise<{ status: string; sessionId: string }> {
    const session = this.vettingPools.get(sessionId);
    if (!session) {
      throw new Error('Vetting session not found');
    }

    if (session.status !== 'active') {
      throw new Error(`Vetting session is ${session.status}, cannot accept votes`);
    }

    // Verify voter is authorized
    const isAuthorized = session.vouchers.some(v => v.voucherDID === vetterDID);
    if (!isAuthorized) {
      throw new Error('Unauthorized voter');
    }

    // Get voter reputation
    const voterReputation = await this.getCurrentReputation(vetterDID);

    // Record vote
    session.votes.set(vetterDID, {
      vote,
      evidence,
      timestamp: new Date().toISOString(),
      voterReputation
    });

    this.log(`Vote recorded: ${vetterDID} voted ${vote} in session ${sessionId}`);

    // Check if voting is complete
    if (this.isVotingComplete(session)) {
      await this.finalizeVettingSession(session);
    }

    return { status: 'vote_recorded', sessionId };
  }

  /**
   * Check if voting is complete (quorum reached)
   */
  private isVotingComplete(session: VettingSession): boolean {
    const totalVotes = session.votes.size;
    const requiredQuorum = Math.ceil(session.vouchers.length * this.config.vetting.quorumPercentage);
    return totalVotes >= requiredQuorum;
  }

  /**
   * Finalize vetting session
   */
  private async finalizeVettingSession(session: VettingSession): Promise<void> {
    this.log(`Finalizing vetting session ${session.sessionId}`);

    // Tally votes with reputation weighting
    const result = await this.tallyWeightedVotes(session);
    session.result = result;

    if (result.approved) {
      await this.approveCandidate(session, result);
    } else {
      await this.rejectCandidate(session, result);
    }

    session.status = 'completed';
    session.endTime = new Date().toISOString();

    // Publish results to DKG
    await this.publishVettingResults(session);

    this.log(`Vetting session ${session.sessionId} completed: ${result.approved ? 'APPROVED' : 'REJECTED'}`);
  }

  /**
   * Tally weighted votes
   */
  private async tallyWeightedVotes(session: VettingSession): Promise<NonNullable<VettingSession['result']>> {
    let totalWeight = 0;
    let approveWeight = 0;
    let rejectWeight = 0;

    for (const [voterDID, vote] of session.votes) {
      const weight = vote.voterReputation || 0.5;
      totalWeight += weight;

      if (vote.vote === 'approve') {
        approveWeight += weight;
      } else {
        rejectWeight += weight;
      }
    }

    const approvalRate = totalWeight > 0 ? approveWeight / totalWeight : 0;

    return {
      approved: approvalRate >= this.config.vetting.approvalThreshold,
      approvalRate,
      totalWeight,
      approveWeight,
      rejectWeight,
      requiredApproval: this.config.vetting.approvalThreshold
    };
  }

  /**
   * Approve candidate
   */
  private async approveCandidate(
    session: VettingSession,
    result: NonNullable<VettingSession['result']>
  ): Promise<void> {
    this.log(`Approving candidate ${session.candidateDID}`);

    // Issue verified status via Identity Tokenomics
    if (this.identityTokenomics) {
      await this.identityTokenomics.issueSBTCredential(
        session.candidateDID,
        require('../identity-tokenomics').CredentialType.COMMUNITY_ENDORSED,
        {
          vettingSession: session.sessionId,
          approvalRate: result.approvalRate,
          vouchers: session.vouchers.map(v => v.voucherDID)
        }
      );
    }

    // Distribute rewards
    await this.distributeVettingRewards(session, 'approve');

    // Update participant reputations
    await this.updateParticipantReputations(session, 'successful_approval');
  }

  /**
   * Reject candidate
   */
  private async rejectCandidate(
    session: VettingSession,
    result: NonNullable<VettingSession['result']>
  ): Promise<void> {
    this.log(`Rejecting candidate ${session.candidateDID}`);

    // Identify approving voters to slash
    const approvingVoters = Array.from(session.votes.entries())
      .filter(([_, vote]) => vote.vote === 'approve')
      .map(([voterDID]) => voterDID);

    // Slash stakes
    await this.slashVetterStakes(session, approvingVoters);

    // Distribute rewards to rejecting voters
    await this.distributeVettingRewards(session, 'reject');

    // Update participant reputations
    await this.updateParticipantReputations(session, 'successful_rejection');
  }

  /**
   * Slash vetter stakes
   */
  private async slashVetterStakes(
    session: VettingSession,
    votersToSlash: string[]
  ): Promise<void> {
    if (votersToSlash.length === 0) return;

    this.log(`Slashing stakes for ${votersToSlash.length} voters`);

    // TODO: Implement actual slashing via smart contract
    // For now, just log
    for (const voterDID of votersToSlash) {
      const slashAmount = session.requiredStake * BigInt(Math.floor(this.config.vetting.slashPercentage * 100)) / BigInt(100);
      this.log(`Slashing ${slashAmount.toString()} from ${voterDID}`);
    }
  }

  /**
   * Distribute vetting rewards
   */
  private async distributeVettingRewards(
    session: VettingSession,
    outcome: 'approve' | 'reject'
  ): Promise<void> {
    const rewardPool = session.requiredStake * BigInt(session.vouchers.length) *
      BigInt(Math.floor(this.config.vetting.rewardPercentage * 100)) / BigInt(100);

    const rewards = await this.calculateVettingRewards(session, outcome, rewardPool);

    this.log(`Distributing rewards: ${Object.keys(rewards).length} recipients, total ${rewardPool.toString()}`);

    // TODO: Implement actual token transfers
    for (const [voterDID, amount] of Object.entries(rewards)) {
      this.log(`Rewarding ${voterDID}: ${amount.toString()}`);
    }
  }

  /**
   * Calculate vetting rewards
   */
  private async calculateVettingRewards(
    session: VettingSession,
    outcome: 'approve' | 'reject',
    totalRewardPool: bigint
  ): Promise<Record<string, bigint>> {
    const rewards: Record<string, number> = {};
    let totalScore = 0;

    for (const [voterDID, vote] of session.votes) {
      let score = 0;

      if (outcome === 'approve' && vote.vote === 'approve') {
        score = vote.voterReputation; // Correct approval
      } else if (outcome === 'reject' && vote.vote === 'reject') {
        score = vote.voterReputation; // Correct rejection
      } else {
        score = 0.1; // Small reward for participation
      }

      rewards[voterDID] = score;
      totalScore += score;
    }

    // Normalize and distribute rewards
    const finalRewards: Record<string, bigint> = {};
    for (const voterDID in rewards) {
      if (totalScore > 0) {
        const share = rewards[voterDID] / totalScore;
        finalRewards[voterDID] = totalRewardPool * BigInt(Math.floor(share * 10000)) / BigInt(10000);
      } else {
        finalRewards[voterDID] = BigInt(0);
      }
    }

    return finalRewards;
  }

  /**
   * Update participant reputations
   */
  private async updateParticipantReputations(
    session: VettingSession,
    outcome: 'successful_approval' | 'successful_rejection'
  ): Promise<void> {
    // TODO: Update reputation scores in DKG
    this.log(`Updating reputations for ${session.vouchers.length} participants (outcome: ${outcome})`);
  }

  /**
   * Publish vetting results to DKG
   */
  private async publishVettingResults(session: VettingSession): Promise<void> {
    if (!this.dkgClient) {
      this.log('No DKG client available, skipping publish', 'warn');
      return;
    }

    try {
      await this.dkgClient.publishReputationAsset({
        developerId: session.candidateDID,
        reputationScore: session.result?.approved ? 100 : 0,
        contributions: [],
        timestamp: Date.now(),
        metadata: {
          type: 'community_vetting',
          session: {
            sessionId: session.sessionId,
            status: session.status,
            result: session.result,
            vouchers: session.vouchers.map(v => v.voucherDID),
            votes: Array.from(session.votes.entries()).map(([did, vote]) => ({
              voter: did,
              vote: vote.vote,
              reputation: vote.voterReputation
            }))
          }
        }
      });

      this.log(`Published vetting results to DKG for session ${session.sessionId}`);
    } catch (error: any) {
      this.log(`Failed to publish vetting results: ${error.message}`, 'error');
    }
  }

  /**
   * Get current reputation for a user
   */
  private async getCurrentReputation(userDID: string): Promise<number> {
    if (this.config.enableMockMode) {
      return 0.8; // Default mock reputation
    }

    // TODO: Query DKG for reputation
    return 0.5; // Default
  }

  /**
   * Calculate required stake for vetting pool
   */
  private calculateRequiredStake(poolSize: number): bigint {
    return this.config.vetting.minStake * BigInt(poolSize);
  }

  /**
   * Generate mock vouchers for testing
   */
  private generateMockVouchers(count: number): Voucher[] {
    return Array.from({ length: count }, (_, i) => ({
      voucherDID: `did:mock:voucher:${i}`,
      reputation: 0.8 + Math.random() * 0.2,
      stake: this.config.vetting.minStake * BigInt(2),
      connectionDiversity: 10 + Math.floor(Math.random() * 20)
    }));
  }

  /**
   * Get MCP tools
   */
  getMCPTools() {
    return [
      {
        name: 'initiate_community_vetting',
        description: 'Start a community vetting process for a new user',
        parameters: {
          type: 'object',
          properties: {
            candidate_did: { type: 'string' },
            pool_size: { type: 'number', default: 5 }
          },
          required: ['candidate_did']
        }
      },
      {
        name: 'submit_vetting_vote',
        description: 'Submit a vote in a community vetting session',
        parameters: {
          type: 'object',
          properties: {
            voter_did: { type: 'string' },
            session_id: { type: 'string' },
            vote: { type: 'string', enum: ['approve', 'reject'] },
            evidence: { type: 'string' }
          },
          required: ['voter_did', 'session_id', 'vote']
        }
      }
    ];
  }

  /**
   * Execute MCP tool
   */
  async executeMCPTool(toolName: string, parameters: any): Promise<any> {
    switch (toolName) {
      case 'initiate_community_vetting':
        return await this.initiateCommunityVetting(
          parameters.candidate_did,
          parameters.pool_size
        );
      case 'submit_vetting_vote':
        return await this.submitVote(
          parameters.voter_did,
          parameters.session_id,
          parameters.vote,
          parameters.evidence
        );
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  /**
   * Get vetting session
   */
  getVettingSession(sessionId: string): VettingSession | undefined {
    return this.vettingPools.get(sessionId);
  }

  /**
   * Logging helper
   */
  private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    if (!this.config.enableLogging) return;

    const prefix = '[CommunityVettingAgent]';
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
export function createCommunityVettingAgent(
  config: CommunityVettingConfig
): CommunityVettingAgent {
  return new CommunityVettingAgent(config);
}

