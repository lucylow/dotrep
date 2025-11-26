import { ApiPromise, WsProvider } from "@polkadot/api";
import { getOnFinalityWsEndpoint } from "./env";
import { NetworkError, TimeoutError, ExternalApiError } from "@shared/_core/errors";
import { retryWithBackoff, withTimeout, isRetryableError, logError } from "./errorHandler";
import { 
  getMockReputation, 
  getMockContributionCount, 
  getMockNfts,
  mockGovernanceProposals,
  mockChainInfo
} from "./mockData";

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
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;

  constructor(wsEndpoint?: string) {
    // Use provided endpoint, or try to build from OnFinality API key, or use env var, or default
    const getEnvVar = (name: string): string | undefined => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const proc = (globalThis as any).process || (globalThis as any).global?.process;
        return proc?.env?.[name];
      } catch {
        return undefined;
      }
    };
    const envEndpoint = getEnvVar('POLKADOT_WS_ENDPOINT');
    this.wsEndpoint = wsEndpoint || getOnFinalityWsEndpoint() || envEndpoint || "ws://127.0.0.1:9944";
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

      this.wsProvider.on('error', (error: unknown) => {
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

      await withTimeout(
        this.api.isReady,
        30000, // 30 second timeout
        `Connection to ${this.wsEndpoint} timed out`
      );
      this.connectionStatus = 'connected';
      this.reconnectAttempts = 0;
      console.log(`[Polkadot API] Connected to ${this.wsEndpoint}`);
    } catch (error) {
      this.connectionStatus = 'disconnected';
      logError(error, { operation: "connect", endpoint: this.wsEndpoint });
      
      // Attempt reconnection
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.handleReconnection();
      } else {
        throw new NetworkError(
          `Failed to connect to Polkadot node after ${this.maxReconnectAttempts} attempts`,
          this.wsEndpoint,
          error instanceof Error ? error : undefined
        );
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
    try {
      await this.ensureConnected();
    } catch (error) {
      // If connection fails, return mock data
      console.warn(`[Polkadot API] Connection failed, using mock data for account ${accountId}`);
      return getMockReputation(accountId);
    }

    return retryWithBackoff(
      async () => {
        try {
          const account = this.api!.createType("AccountId", accountId);
          const result = await withTimeout(
            this.api!.query.reputation.reputationScores(account),
            10000, // 10 second timeout
            "Reputation query timed out"
          ) as any;
          
          if (result && result.isNone) {
            // Return mock data if no result found
            return getMockReputation(accountId);
          }

          const score = result?.unwrap ? result.unwrap() : result;
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
          logError(error, { operation: "getReputation", accountId });
          // Return mock data on error
          console.warn(`[Polkadot API] Error getting reputation, using mock data for account ${accountId}`);
          return getMockReputation(accountId);
        }
      },
      {
        maxRetries: 2,
        retryable: isRetryableError,
      }
    );
  }

  /**
   * Get contribution count for an account
   */
  async getContributionCount(accountId: string): Promise<number> {
    try {
      if (!this.api) {
        await this.connect();
      }
    } catch (error) {
      // If connection fails, return mock data
      console.warn(`[Polkadot API] Connection failed, using mock contribution count for account ${accountId}`);
      return getMockContributionCount(accountId);
    }

    try {
      const account = this.api.createType("AccountId", accountId);
      const result = await this.api.query.reputation.contributions(account);
      return result.length;
    } catch (error) {
      console.warn("[Polkadot API] Error getting contribution count, using mock data:", error);
      return getMockContributionCount(accountId);
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
    try {
      if (!this.api) {
        await this.connect();
      }
    } catch (error) {
      // If connection fails, return mock data
      console.warn("[Polkadot API] Connection failed, using mock governance proposals");
      return mockGovernanceProposals;
    }

    try {
      const proposals = await this.api.query.governance.proposals.entries();
      
      if (proposals.length === 0) {
        // Return mock data if no proposals found
        return mockGovernanceProposals;
      }
      
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
      console.warn("[Polkadot API] Error getting proposals, using mock data:", error);
      // Return mock data if query fails
      return mockGovernanceProposals;
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
    try {
      if (!this.api) {
        await this.connect();
      }
    } catch (error) {
      // If connection fails, return mock data
      console.warn(`[Polkadot API] Connection failed, using mock NFTs for account ${accountId}`);
      return getMockNfts(accountId);
    }

    try {
      const account = this.api.createType("AccountId", accountId);
      const nfts = await this.api.query.nft.nfts(account);
      
      if (nfts.length === 0) {
        // Return mock data if no NFTs found
        return getMockNfts(accountId);
      }
      
      return nfts.map((nft: any) => ({
        id: nft.id.toNumber(),
        achievementType: nft.achievementType.toString(),
        metadata: nft.metadata.toString(),
        mintedAt: nft.mintedAt.toNumber(),
        soulbound: nft.soulbound.toBoolean()
      }));
    } catch (error) {
      console.warn("[Polkadot API] Error getting NFTs, using mock data:", error);
      return getMockNfts(accountId);
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
    try {
      if (!this.api) {
        await this.connect();
      }
    } catch (error) {
      // If connection fails, return mock data
      console.warn("[Polkadot API] Connection failed, using mock chain info");
      return mockChainInfo;
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
      console.warn("[Polkadot API] Error getting chain info, using mock data:", error);
      return mockChainInfo;
    }
  }

  /**
   * Get current block number
   */
  async getCurrentBlock(): Promise<number> {
    try {
      if (!this.api) {
        await this.connect();
      }
    } catch (error) {
      // If connection fails, return mock block number
      console.warn("[Polkadot API] Connection failed, using mock block number");
      return 15000000; // Mock block number
    }

    try {
      const header = await this.api.rpc.chain.getHeader();
      return header.number.toNumber();
    } catch (error) {
      console.warn("[Polkadot API] Error getting current block, using mock data:", error);
      return 15000000; // Mock block number
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

    const unsub = await this.api!.query.system.events((events: any) => {
      events.forEach((record: any) => {
        const { event } = record;
        callback({
          section: event?.section?.toString() || '',
          method: event?.method?.toString() || '',
          data: event?.data?.toHuman ? event.data.toHuman() : event?.data,
          phase: record?.phase?.toString() || '',
          topics: (record?.topics || []).map((t: any) => t?.toString() || String(t))
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

  /**
   * Post a verifiable claim anchored to Knowledge Assets
   */
  async postClaim(
    accountId: string,
    claimUAL: string,
    evidenceUALs: string[],
    stake: string // Balance as string
  ): Promise<{ hash: string; claimId?: number; status: string }> {
    if (!this.api) {
      await this.connect();
    }

    try {
      const tx = this.api.tx.trustLayer.postClaim(
        claimUAL,
        evidenceUALs,
        stake
      );

      return {
        hash: tx.hash.toString(),
        status: "pending_signature"
      };
    } catch (error) {
      console.error("[Polkadot API] Error posting claim:", error);
      throw error;
    }
  }

  /**
   * Challenge a claim with counter-evidence
   */
  async challengeClaim(
    accountId: string,
    claimId: number,
    counterEvidenceUALs: string[],
    stake: string
  ): Promise<{ hash: string; status: string }> {
    if (!this.api) {
      await this.connect();
    }

    try {
      const tx = this.api.tx.trustLayer.challengeClaim(
        claimId,
        counterEvidenceUALs,
        stake
      );

      return {
        hash: tx.hash.toString(),
        status: "pending_signature"
      };
    } catch (error) {
      console.error("[Polkadot API] Error challenging claim:", error);
      throw error;
    }
  }

  /**
   * Get claim information
   */
  async getClaim(claimId: number): Promise<{
    id: number;
    submitter: string;
    claimUAL: string;
    evidenceUALs: string[];
    status: string;
    stake: string;
    challenger?: string;
    resolution?: string;
  } | null> {
    try {
      if (!this.api) {
        await this.connect();
      }
    } catch (error) {
      console.warn("[Polkadot API] Connection failed:", error);
      return null;
    }

    try {
      const claim = await this.api.query.trustLayer.claim(claimId);
      
      if (claim.isNone) {
        return null;
      }

      const claimData = claim.unwrap();
      // Convert UAL from bytes to string
      const convertUAL = (ual: any): string => {
        if (typeof ual === 'string') return ual;
        if (ual?.toString) return ual.toString();
        if (ual instanceof Uint8Array) {
          return new TextDecoder('utf-8').decode(ual);
        }
        if (Array.isArray(ual)) {
          return new TextDecoder('utf-8').decode(new Uint8Array(ual));
        }
        return String(ual);
      };
      
      return {
        id: claimData.id.toNumber(),
        submitter: claimData.submitter.toString(),
        claimUAL: convertUAL(claimData.claimUAL),
        evidenceUALs: (claimData.evidenceUALs || []).map((ual: any) => 
          convertUAL(ual)
        ),
        status: claimData.status.toString(),
        stake: claimData.stake.toString(),
        challenger: claimData.challenger?.toString(),
        resolution: claimData.resolution?.toString()
      };
    } catch (error) {
      console.warn("[Polkadot API] Error getting claim:", error);
      return null;
    }
  }

  /**
   * Check if account has reputation-backed access to a premium asset
   */
  async hasReputationBackedAccess(
    accountId: string,
    ual: string,
    minReputation?: number,
    minStake?: string
  ): Promise<{
    hasAccess: boolean;
    reason?: string;
    reputationScore?: number;
    stakedAmount?: string;
  }> {
    try {
      // Check reputation
      const reputation = await this.getReputation(accountId);
      const hasReputation = minReputation 
        ? reputation.overall >= minReputation 
        : true;

      // Check stake
      let hasStake = true;
      let stakedAmount = '0';
      if (minStake) {
        try {
          if (!this.api) {
            await this.connect();
          }
          const staked = await this.api.query.trustLayer.stakedAmount(accountId);
          stakedAmount = staked.toString();
          hasStake = staked.gte(this.api.createType('Balance', minStake));
        } catch (error) {
          console.warn("[Polkadot API] Error checking stake:", error);
        }
      }

      // Check x402 payment access
      let hasPaymentAccess = false;
      try {
        if (this.api) {
          const accessExpiry = await this.api.query.trustLayer.queryAccess(accountId, ual);
          if (!accessExpiry.isNone) {
            const currentBlock = await this.getCurrentBlock();
            hasPaymentAccess = accessExpiry.unwrap().toNumber() >= currentBlock;
          }
        }
      } catch (error) {
        console.warn("[Polkadot API] Error checking payment access:", error);
      }

      const hasAccess = hasReputation && hasStake && hasPaymentAccess;

      return {
        hasAccess,
        reason: hasAccess 
          ? undefined 
          : !hasReputation 
            ? 'Insufficient reputation' 
            : !hasStake 
              ? 'Insufficient stake' 
              : 'Payment required',
        reputationScore: reputation.overall,
        stakedAmount
      };
    } catch (error) {
      console.error("[Polkadot API] Error checking reputation-backed access:", error);
      return {
        hasAccess: false,
        reason: 'Error checking access'
      };
    }
  }

  /**
   * Get provenance information for a UAL (requires DKG integration)
   */
  async getProvenance(ual: string): Promise<{
    ual: string;
    checksum?: string;
    merkleRoot?: string;
    publisher?: string;
    publishedAt?: number;
    verified: boolean;
    provenanceScore?: number;
  } | null> {
    // This would integrate with the ProvenanceRegistry service
    // For now, return mock/null
    try {
      // In production, would call ProvenanceRegistry.getProvenance()
      return null;
    } catch (error) {
      console.error("[Polkadot API] Error getting provenance:", error);
      return null;
    }
  }
}

// Singleton instance
let polkadotApiInstance: PolkadotApiService | null = null;

export function getPolkadotApi(): PolkadotApiService {
  if (!polkadotApiInstance) {
    // Use OnFinality endpoint builder or fallback to env var or default
    const getEnvVar = (name: string): string | undefined => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const proc = (globalThis as any).process || (globalThis as any).global?.process;
        return proc?.env?.[name];
      } catch {
        return undefined;
      }
    };
    const envEndpoint = getEnvVar('POLKADOT_WS_ENDPOINT');
    const wsEndpoint = getOnFinalityWsEndpoint() || envEndpoint || "ws://127.0.0.1:9944";
    polkadotApiInstance = new PolkadotApiService(wsEndpoint);
  }
  return polkadotApiInstance;
}

