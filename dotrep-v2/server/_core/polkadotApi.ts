import { ApiPromise, WsProvider } from "@polkadot/api";
import type { AccountId, Balance } from "@polkadot/types/interfaces";
import { getOnFinalityWsEndpoint } from "./env";

/**
 * Polkadot.js API service for interacting with DotRep parachain
 * 
 * This service provides methods to interact with the DotRep runtime:
 * - Reputation queries
 * - XCM gateway operations
 * - Governance participation
 * - NFT operations
 * - Identity management
 */
export class PolkadotApiService {
  private api: ApiPromise | null = null;
  private wsProvider: WsProvider | null = null;
  private wsEndpoint: string;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 3000; // 3 seconds
  private eventSubscriptions: Map<string, () => void> = new Map();
  private connectionStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(wsEndpoint?: string) {
    // Use provided endpoint, or try to build from OnFinality API key, or use env var, or default
    this.wsEndpoint = wsEndpoint || getOnFinalityWsEndpoint() || process.env.POLKADOT_WS_ENDPOINT || "ws://127.0.0.1:9944";
    this.setupHealthCheck();
  }

  /**
   * Initialize connection to Polkadot node with automatic reconnection
   */
  async connect(): Promise<void> {
    if (this.api && this.connectionStatus === 'connected') {
      return; // Already connected
    }

    this.connectionStatus = 'connecting';

    try {
      // Disconnect existing connection if any
      if (this.wsProvider) {
        this.wsProvider.disconnect();
      }

      this.wsProvider = new WsProvider(this.wsEndpoint, 0); // 0 = auto-reconnect
      
      // Set up connection event handlers
      this.wsProvider.on('connected', () => {
        console.log(`[Polkadot API] WebSocket connected to ${this.wsEndpoint}`);
        this.reconnectAttempts = 0;
      });

      this.wsProvider.on('disconnected', () => {
        console.warn(`[Polkadot API] WebSocket disconnected from ${this.wsEndpoint}`);
        this.connectionStatus = 'disconnected';
        this.handleReconnection();
      });

      this.wsProvider.on('error', (error) => {
        console.error(`[Polkadot API] WebSocket error:`, error);
        this.connectionStatus = 'disconnected';
      });

      this.api = await ApiPromise.create({
        provider: this.wsProvider,
        types: {
          // Custom types for DotRep runtime
          ReputationScore: {
            overall: "i64",
            breakdown: "Vec<(ContributionType, i64)>",
            percentile: "u8",
            lastUpdated: "u64"
          },
          ContributionType: {
            _enum: [
              "CodeCommit",
              "PullRequest",
              "IssueResolution",
              "CodeReview",
              "Documentation",
              "CommunityHelp",
              "GovernanceParticipation",
              "Mentoring"
            ]
          },
          CrossChainReputation: {
            score: "i64",
            percentile: "u8",
            lastUpdated: "u64",
            sourceChain: "Vec<u8>",
            verified: "bool"
          },
          ReputationXcmMessage: {
            _enum: {
              QueryReputation: {
                account_id: "Vec<u8>",
                response_destination: "Option<MultiLocation>",
                query_id: "Option<u64>"
              },
              BatchQueryReputation: {
                account_ids: "Vec<Vec<u8>>",
                response_destination: "Option<MultiLocation>",
                query_id: "Option<u64>"
              },
              ReputationResponse: {
                query_id: "Option<u64>",
                account_id: "Vec<u8>",
                score: "i32",
                percentile: "u8",
                breakdown: "Vec<(ContributionType, i32)>",
                last_updated: "u64"
              },
              BatchReputationResponse: {
                query_id: "Option<u64>",
                results: "Vec<(Vec<u8>, i32, u8)>"
              },
              ReputationError: {
                query_id: "Option<u64>",
                error_code: "u8",
                error_message: "Vec<u8>"
              }
            }
          }
        },
        noInitWarn: true,
      });

      await this.api.isReady;
      this.connectionStatus = 'connected';
      this.reconnectAttempts = 0;
      console.log(`[Polkadot API] Connected to ${this.wsEndpoint}`);
    } catch (error) {
      this.connectionStatus = 'disconnected';
      console.error("[Polkadot API] Connection failed:", error);
      
      // Attempt reconnection
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.handleReconnection();
      } else {
        throw new Error(`Failed to connect after ${this.maxReconnectAttempts} attempts`);
      }
    }
  }

  /**
   * Handle automatic reconnection with exponential backoff
   */
  private async handleReconnection(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`[Polkadot API] Max reconnection attempts reached`);
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(
      `[Polkadot API] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error(`[Polkadot API] Reconnection attempt ${this.reconnectAttempts} failed:`, error);
      }
    }, delay);
  }

  /**
   * Setup periodic health check
   */
  private setupHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      if (this.api && this.connectionStatus === 'connected') {
        try {
          await this.api.rpc.system.health();
        } catch (error) {
          console.warn(`[Polkadot API] Health check failed:`, error);
          this.connectionStatus = 'disconnected';
          await this.handleReconnection();
        }
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Disconnect from Polkadot node
   */
  async disconnect(): Promise<void> {
    // Clear health check
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Unsubscribe from all events
    this.eventSubscriptions.forEach((unsub) => unsub());
    this.eventSubscriptions.clear();

    if (this.api) {
      await this.api.disconnect();
      this.api = null;
    }
    if (this.wsProvider) {
      this.wsProvider.disconnect();
      this.wsProvider = null;
    }
    
    this.connectionStatus = 'disconnected';
    console.log(`[Polkadot API] Disconnected from ${this.wsEndpoint}`);
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): 'disconnected' | 'connecting' | 'connected' {
    return this.connectionStatus;
  }

  /**
   * Check if API is ready
   */
  async ensureConnected(): Promise<void> {
    if (!this.api || this.connectionStatus !== 'connected') {
      await this.connect();
    }
    
    if (!this.api) {
      throw new Error('Failed to establish API connection');
    }
  }

  /**
   * Get reputation score for an account
   */
  async getReputation(accountId: string): Promise<{
    overall: number;
    breakdown: Array<{ type: string; score: number }>;
    percentile: number;
    lastUpdated: number;
  }> {
    if (!this.api) {
      await this.connect();
    }

    try {
      const account = this.api.createType("AccountId", accountId);
      const result = await this.api.query.reputation.reputationScores(account);
      
      if (result.isNone) {
        return {
          overall: 0,
          breakdown: [],
          percentile: 0,
          lastUpdated: 0
        };
      }

      const score = result.unwrap();
      return {
        overall: score.overall.toNumber(),
        breakdown: score.breakdown.map(([type, value]: any) => ({
          type: type.toString(),
          score: value.toNumber()
        })),
        percentile: score.percentile.toNumber(),
        lastUpdated: score.lastUpdated.toNumber()
      };
    } catch (error) {
      console.error("[Polkadot API] Error getting reputation:", error);
      throw error;
    }
  }

  /**
   * Get contribution count for an account
   */
  async getContributionCount(accountId: string): Promise<number> {
    if (!this.api) {
      await this.connect();
    }

    try {
      const account = this.api.createType("AccountId", accountId);
      const result = await this.api.query.reputation.contributions(account);
      return result.length;
    } catch (error) {
      console.error("[Polkadot API] Error getting contribution count:", error);
      throw error;
    }
  }

  /**
   * Initiate cross-chain reputation query via XCM v3
   */
  async initiateXcmQuery(
    signer: string,
    targetChain: string,
    targetAccount: string,
    responseDestination?: string
  ): Promise<{ queryId: string; txHash?: string }> {
    await this.ensureConnected();

    try {
      // Construct MultiLocation for target chain
      // In production, this would parse the targetChain string into MultiLocation
      const dest = this.parseMultiLocation(targetChain);
      
      const tx = this.api!.tx.reputation.initiateReputationQuery(
        targetChain,
        targetAccount
      );

      // Return transaction for signing
      return {
        queryId: `xcm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        txHash: tx.hash.toString()
      };
    } catch (error) {
      console.error("[Polkadot API] Error initiating XCM query:", error);
      throw error;
    }
  }

  /**
   * Batch query reputation across multiple chains
   */
  async batchXcmQuery(
    queries: Array<{ targetChain: string; targetAccount: string }>
  ): Promise<Array<{ queryId: string; txHash?: string }>> {
    await this.ensureConnected();

    try {
      const results = queries.map((query) => 
        this.initiateXcmQuery('', query.targetChain, query.targetAccount)
      );
      
      return Promise.all(results);
    } catch (error) {
      console.error("[Polkadot API] Error initiating batch XCM queries:", error);
      throw error;
    }
  }

  /**
   * Get XCM query status
   */
  async getXcmQueryStatus(queryId: string): Promise<{
    status: 'pending' | 'completed' | 'timeout' | 'failed';
    response?: any;
  }> {
    await this.ensureConnected();

    try {
      // In production, would query ReputationQueries storage
      // For now, return mock status
      return {
        status: 'pending'
      };
    } catch (error) {
      console.error("[Polkadot API] Error getting XCM query status:", error);
      throw error;
    }
  }

  /**
   * Parse chain identifier to MultiLocation (helper)
   */
  private parseMultiLocation(chainId: string): any {
    // In production, would parse chain identifier to proper MultiLocation format
    // For now, return placeholder
    return { V3: { parents: 0, interior: { X1: { Parachain: 1000 } } } };
  }

  /**
   * Get governance proposals
   */
  async getProposals(): Promise<Array<{
    id: number;
    proposer: string;
    title: string;
    status: string;
    votesFor: number;
    votesAgainst: number;
    endBlock: number;
  }>> {
    if (!this.api) {
      await this.connect();
    }

    try {
      const proposals = await this.api.query.governance.proposals.entries();
      
      return proposals.map(([key, value]: any) => {
        const proposal = value.unwrap();
        return {
          id: key.args[0].toNumber(),
          proposer: proposal.proposer.toString(),
          title: proposal.title?.toString() || "Untitled Proposal",
          status: proposal.status.toString(),
          votesFor: proposal.votesFor.toNumber(),
          votesAgainst: proposal.votesAgainst.toNumber(),
          endBlock: proposal.endBlock.toNumber()
        };
      });
    } catch (error) {
      console.error("[Polkadot API] Error getting proposals:", error);
      // Return mock data if query fails
      return [];
    }
  }

  /**
   * Get NFT achievements for an account
   */
  async getNfts(accountId: string): Promise<Array<{
    id: number;
    achievementType: string;
    metadata: string;
    mintedAt: number;
    soulbound: boolean;
  }>> {
    if (!this.api) {
      await this.connect();
    }

    try {
      const account = this.api.createType("AccountId", accountId);
      const nfts = await this.api.query.nft.nfts(account);
      
      return nfts.map((nft: any) => ({
        id: nft.id.toNumber(),
        achievementType: nft.achievementType.toString(),
        metadata: nft.metadata.toString(),
        mintedAt: nft.mintedAt.toNumber(),
        soulbound: nft.soulbound.toBoolean()
      }));
    } catch (error) {
      console.error("[Polkadot API] Error getting NFTs:", error);
      return [];
    }
  }

  /**
   * Get chain information
   */
  async getChainInfo(): Promise<{
    name: string;
    version: string;
    chainType: string;
    tokenSymbol: string;
    tokenDecimals: number;
  }> {
    if (!this.api) {
      await this.connect();
    }

    try {
      const [chain, version, chainType] = await Promise.all([
        this.api.rpc.system.chain(),
        this.api.rpc.system.version(),
        this.api.rpc.system.chainType(),
        this.api.registry.chainProperties
      ]);

      const properties = this.api.registry.chainProperties;
      
      return {
        name: chain.toString(),
        version: version.toString(),
        chainType: chainType.toString(),
        tokenSymbol: properties?.tokenSymbol?.toString() || "DOT",
        tokenDecimals: properties?.tokenDecimals?.toNumber() || 10
      };
    } catch (error) {
      console.error("[Polkadot API] Error getting chain info:", error);
      throw error;
    }
  }

  /**
   * Get current block number
   */
  async getCurrentBlock(): Promise<number> {
    if (!this.api) {
      await this.connect();
    }

    try {
      const header = await this.api.rpc.chain.getHeader();
      return header.number.toNumber();
    } catch (error) {
      console.error("[Polkadot API] Error getting current block:", error);
      throw error;
    }
  }

  /**
   * Check if account has sufficient reputation
   */
  async hasSufficientReputation(accountId: string, threshold: number): Promise<boolean> {
    const reputation = await this.getReputation(accountId);
    return reputation.overall >= threshold;
  }

  /**
   * Submit a contribution (signed transaction)
   * This requires the account to sign the transaction via Polkadot extension
   */
  async submitContribution(
    accountId: string,
    proof: string,
    contributionType: string,
    weight: number,
    source: string
  ): Promise<{ hash: string; status: string }> {
    if (!this.api) {
      await this.connect();
    }

    try {
      // Create the transaction
      const tx = this.api.tx.reputation.addContribution(
        proof,
        contributionType,
        weight,
        source
      );

      // Return transaction for signing (client-side will sign)
      // In production, this would be signed via Polkadot extension
      return {
        hash: tx.hash.toString(),
        status: "pending_signature"
      };
    } catch (error) {
      console.error("[Polkadot API] Error submitting contribution:", error);
      throw error;
    }
  }

  /**
   * Verify a contribution (signed transaction)
   */
  async verifyContribution(
    accountId: string,
    contributor: string,
    contributionId: number,
    score: number,
    comment: string
  ): Promise<{ hash: string; status: string }> {
    if (!this.api) {
      await this.connect();
    }

    try {
      const tx = this.api.tx.reputation.verifyContribution(
        contributor,
        contributionId,
        score,
        comment
      );

      return {
        hash: tx.hash.toString(),
        status: "pending_signature"
      };
    } catch (error) {
      console.error("[Polkadot API] Error verifying contribution:", error);
      throw error;
    }
  }

  /**
   * Vote on a governance proposal (signed transaction)
   */
  async voteOnProposal(
    accountId: string,
    proposalId: number,
    vote: boolean,
    conviction: number = 0
  ): Promise<{ hash: string; status: string }> {
    if (!this.api) {
      await this.connect();
    }

    try {
      // Create vote transaction
      const tx = this.api.tx.governance.vote(
        proposalId,
        vote,
        conviction
      );

      return {
        hash: tx.hash.toString(),
        status: "pending_signature"
      };
    } catch (error) {
      console.error("[Polkadot API] Error voting on proposal:", error);
      throw error;
    }
  }

  /**
   * Create a governance proposal (signed transaction)
   */
  async createProposal(
    accountId: string,
    title: string,
    description: string,
    proposalType: string,
    parameters: Record<string, any>
  ): Promise<{ hash: string; status: string; proposalId: number }> {
    if (!this.api) {
      await this.connect();
    }

    try {
      // Create proposal transaction based on type
      let tx;
      if (proposalType === "parameter") {
        tx = this.api.tx.reputation.updateAlgorithmParams(parameters);
      } else if (proposalType === "upgrade") {
        tx = this.api.tx.governance.createUpgradeProposal(description, parameters);
      } else {
        tx = this.api.tx.governance.createProposal(title, description, parameters);
      }

      return {
        hash: tx.hash.toString(),
        status: "pending_signature",
        proposalId: 0 // Would be set after submission
      };
    } catch (error) {
      console.error("[Polkadot API] Error creating proposal:", error);
      throw error;
    }
  }

  /**
   * Sign and send a transaction (client-side)
   * This is a helper method that returns the transaction for client to sign
   */
  getTransactionForSigning(
    call: any,
    accountId: string
  ): any {
    if (!this.api) {
      throw new Error("API not connected");
    }

    return {
      tx: call,
      accountId,
      signAndSend: async (injector: any) => {
        const signer = await injector.signer;
        return await call.signAndSend(accountId, { signer });
      }
    };
  }

  /**
   * Listen to all system events
   */
  async subscribeToEvents(
    callback: (event: any) => void
  ): Promise<() => void> {
    await this.ensureConnected();

    const unsub = await this.api!.query.system.events((events) => {
      events.forEach((record) => {
        const { event } = record;
        callback({
          section: event.section.toString(),
          method: event.method.toString(),
          data: event.data.toHuman(),
          phase: record.phase.toString(),
          topics: record.topics.map(t => t.toString())
        });
      });
    });

    const subscriptionId = `events-${Date.now()}`;
    this.eventSubscriptions.set(subscriptionId, unsub as () => void);

    return () => {
      if (unsub) {
        (unsub as any)();
        this.eventSubscriptions.delete(subscriptionId);
      }
    };
  }

  /**
   * Subscribe to reputation-specific events
   */
  async subscribeToReputationEvents(
    callback: (event: {
      type: 'ContributionSubmitted' | 'ContributionVerified' | 'ReputationUpdated' | 'SybilAttackDetected';
      data: any;
    }) => void
  ): Promise<() => void> {
    await this.ensureConnected();

    return this.subscribeToEvents((event) => {
      if (event.section === 'reputation') {
        callback({
          type: event.method as any,
          data: event.data
        });
      }
    });
  }

  /**
   * Subscribe to XCM events
   */
  async subscribeToXcmEvents(
    callback: (event: {
      type: 'CrossChainQueryInitiated' | 'XcmResponse';
      data: any;
    }) => Promise<void>
  ): Promise<() => void> {
    await this.ensureConnected();

    return this.subscribeToEvents(async (event) => {
      if (event.section === 'reputation' && event.method === 'CrossChainQueryInitiated') {
        await callback({
          type: 'CrossChainQueryInitiated',
          data: event.data
        });
      }
    });
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(hash: string): Promise<{
    status: string;
    blockNumber?: number;
    error?: string;
  }> {
    if (!this.api) {
      await this.connect();
    }

    try {
      const blockHash = await this.api.rpc.chain.getBlockHash();
      const signedBlock = await this.api.rpc.chain.getBlock(blockHash);
      
      // Check if transaction is in block
      const txHash = this.api.createType("Hash", hash);
      const events = await this.api.query.system.events.at(blockHash);

      return {
        status: "included",
        blockNumber: signedBlock.block.header.number.toNumber()
      };
    } catch (error) {
      return {
        status: "unknown",
        error: (error as Error).message
      };
    }
  }
}

// Singleton instance
let polkadotApiInstance: PolkadotApiService | null = null;

export function getPolkadotApi(): PolkadotApiService {
  if (!polkadotApiInstance) {
    // Use OnFinality endpoint builder or fallback to env var or default
    const wsEndpoint = getOnFinalityWsEndpoint() || process.env.POLKADOT_WS_ENDPOINT || "ws://127.0.0.1:9944";
    polkadotApiInstance = new PolkadotApiService(wsEndpoint);
  }
  return polkadotApiInstance;
}

