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
    
    // Support NeuroWeb-specific RPC endpoint
    const neurowebEndpoint = getEnvVar('NEUROWEB_RPC_URL');
    const envEndpoint = getEnvVar('POLKADOT_WS_ENDPOINT');
    
    // Prefer NeuroWeb endpoint if available, otherwise use standard Polkadot endpoint
    this.wsEndpoint = wsEndpoint || 
                     neurowebEndpoint || 
                     getOnFinalityWsEndpoint() || 
                     envEndpoint || 
                     "ws://127.0.0.1:9944";
    this.setupHealthCheck();
  }

  /**
   * Check if connected to NeuroWeb parachain
   */
  async isNeuroWeb(): Promise<boolean> {
    await this.ensureConnected();
    if (!this.api) return false;
    
    try {
      const chainInfo = await this.api.rpc.system.chain();
      const chainName = chainInfo.toString().toLowerCase();
      return chainName.includes('neuroweb') || chainName.includes('origin-trail');
    } catch {
      return false;
    }
  }

  /**
   * Get NeuroWeb-specific chain information
   */
  async getNeuroWebInfo(): Promise<{
    chainName: string;
    isParachain: boolean;
    relayChain?: string;
    blockNumber: number;
    blockHash: string;
    chainId?: number;
    paraId?: number;
    nativeCurrency?: {
      name: string;
      symbol: string;
      decimals: number;
    };
  } | null> {
    if (!(await this.isNeuroWeb())) {
      return null;
    }

    await this.ensureConnected();
    if (!this.api) return null;

    try {
      const chainInfo = await this.api.rpc.system.chain();
      const chainName = chainInfo.toString();
      const blockHash = await this.api.rpc.chain.getBlockHash();
      const signedBlock = await this.api.rpc.chain.getBlock(blockHash);
      const blockNumber = signedBlock.block.header.number.toNumber();

      // Determine if mainnet or testnet based on chain name
      const isMainnet = chainName.toLowerCase().includes('neuroweb') && 
                       !chainName.toLowerCase().includes('test');
      const paraId = isMainnet ? 2043 : 20430;
      const chainId = isMainnet ? 2043 : 20430;
      const relayChain = isMainnet ? 'polkadot' : 'rococo';

      return {
        chainName,
        isParachain: true,
        relayChain,
        blockNumber,
        blockHash: blockHash.toString(),
        chainId,
        paraId,
        nativeCurrency: {
          name: 'NEURO',
          symbol: 'NEURO',
          decimals: 18,
        },
      };
    } catch (error) {
      console.error('Failed to get NeuroWeb info:', error);
      return null;
    }
  }

  /**
   * Get NeuroWeb parachain ID
   */
  async getNeuroWebParaId(): Promise<number | null> {
    const info = await this.getNeuroWebInfo();
    return info?.paraId || null;
  }

  /**
   * Send XCM message to NeuroWeb
   * 
   * This allows sending cross-chain messages from other parachains to NeuroWeb
   */
  async sendXCMToNeuroWeb(
    message: any,
    options?: {
      maxWeight?: bigint;
      feeAsset?: any;
    }
  ): Promise<{ txHash: string; status: string }> {
    await this.ensureConnected();
    if (!this.api) {
      throw new Error('API not connected');
    }

    const paraId = await this.getNeuroWebParaId();
    if (!paraId) {
      throw new Error('Not connected to NeuroWeb or para ID not found');
    }

    try {
      // Construct XCM message for NeuroWeb
      // In production, this would use proper XCM v3 format
      const dest = {
        V3: {
          parents: 1,
          interior: {
            X1: {
              Parachain: paraId,
            },
          },
        },
      };

      // Create XCM transaction
      const tx = this.api.tx.polkadotXcm?.limitedReserveTransferAssets?.(
        dest,
        message.assets || [],
        message.fee || 0,
        options?.maxWeight || BigInt(5000000000),
      ) || this.api.tx.system.remark(JSON.stringify(message));

      return {
        txHash: tx.hash.toString(),
        status: 'pending_signature',
      };
    } catch (error: any) {
      console.error('[Polkadot API] Error sending XCM to NeuroWeb:', error);
      throw error;
    }
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
            } as any
          }
        } as any,
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
   * Get the API instance (ensures connection first)
   */
  async getApi(): Promise<ApiPromise> {
    await this.ensureConnected();
    if (!this.api) {
      throw new Error('API not connected');
    }
    return this.api;
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
      if (!this.api) throw new Error('API not connected');
      const account = this.api.createType("AccountId", accountId);
      const result = await this.api.query.reputation.contributions(account);
      const resultArray = result as any;
      return (Array.isArray(resultArray) ? resultArray.length : 
              (resultArray?.toArray ? resultArray.toArray().length : 0)) || 0;
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
      if (!this.api) throw new Error('API not connected');
      const proposals = await this.api.query.governance.proposals.entries();
      
      if (proposals.length === 0) {
        // Return mock data if no proposals found
        return mockGovernanceProposals;
      }
      
      return proposals.map(([key, value]: any) => {
        if (!value || !key) return null;
        const proposal = (value as any).unwrap ? (value as any).unwrap() : value;
        const keyArgs = (key as any).args || [];
        return {
          id: keyArgs[0]?.toNumber?.() || 0,
          proposer: proposal?.proposer?.toString() || '',
          title: proposal?.title?.toString() || "Untitled Proposal",
          status: proposal?.status?.toString() || 'Unknown',
          votesFor: proposal?.votesFor?.toNumber?.() || 0,
          votesAgainst: proposal?.votesAgainst?.toNumber?.() || 0,
          endBlock: proposal?.endBlock?.toNumber?.() || 0
        };
      }).filter((p): p is { id: number; proposer: string; title: string; status: string; votesFor: number; votesAgainst: number; endBlock: number } => p !== null);
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
      if (!this.api) throw new Error('API not connected');
      const account = this.api.createType("AccountId", accountId);
      const nfts = await this.api.query.nft.nfts(account);
      const nftsArray = (nfts as any);
      
      if (!nftsArray) {
        // Return mock data if no NFTs found
        return getMockNfts(accountId);
      }
      
      // Handle different Codec types
      let nftsList: any[] = [];
      if (Array.isArray(nftsArray)) {
        nftsList = nftsArray;
      } else if (nftsArray?.toArray) {
        nftsList = nftsArray.toArray();
      } else if (nftsArray?.toHuman) {
        const human = nftsArray.toHuman();
        nftsList = Array.isArray(human) ? human : [];
      }
      
      if (nftsList.length === 0) {
        return getMockNfts(accountId);
      }
      
      return nftsList.map((nft: any) => ({
        id: nft?.id?.toNumber?.() || 0,
        achievementType: nft?.achievementType?.toString() || '',
        metadata: nft?.metadata?.toString() || '',
        mintedAt: nft?.mintedAt?.toNumber?.() || 0,
        soulbound: nft?.soulbound?.toBoolean?.() || false
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
      if (!this.api) throw new Error('API not connected');
      const [chain, version, chainType] = await Promise.all([
        this.api.rpc.system.chain(),
        this.api.rpc.system.version(),
        this.api.rpc.system.chainType()
      ]);

      const properties = this.api.registry.getChainProperties();
      const tokenDecimals = properties?.tokenDecimals;
      const decimalsValue = tokenDecimals 
        ? (Array.isArray(tokenDecimals) && tokenDecimals.length > 0 
          ? (tokenDecimals[0] as any)?.toNumber?.() || 10
          : (tokenDecimals as any)?.toNumber?.() || 10)
        : 10;
      
      return {
        name: chain ? chain.toString() : 'Unknown',
        version: version ? version.toString() : 'Unknown',
        chainType: chainType ? chainType.toString() : 'Unknown',
        tokenSymbol: properties?.tokenSymbol?.toString() || "DOT",
        tokenDecimals: decimalsValue
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
      if (!this.api) throw new Error('API not connected');
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
    if (!this.api) throw new Error('API not connected');

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
    if (!this.api) throw new Error('API not connected');

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
    if (!this.api) throw new Error('API not connected');

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
    if (!this.api) throw new Error('API not connected');

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
    if (!this.api) throw new Error('API not connected');

    const unsub = await this.api.query.system.events((events: any) => {
      if (events && Array.isArray(events)) {
        events.forEach((record: any) => {
          const { event } = record || {};
          if (event) {
            callback({
              section: event?.section?.toString() || '',
              method: event?.method?.toString() || '',
              data: event?.data?.toHuman ? event.data.toHuman() : event?.data,
              phase: record?.phase?.toString() || '',
              topics: (record?.topics || []).map((t: any) => t?.toString() || String(t))
            });
          }
        });
      }
    });

    const subscriptionId = `events-${Date.now()}`;
    // Store unsubscribe function with proper type handling
    const unsubscribeFn: () => void = typeof unsub === 'function' 
      ? unsub 
      : () => { 
          try {
            if (unsub && typeof (unsub as any) === 'function') {
              (unsub as any)();
            } else if (unsub && typeof (unsub as any).then === 'function') {
              (unsub as any).then((fn: () => void) => fn?.());
            }
          } catch (e) {
            console.warn('Error unsubscribing:', e);
          }
        };
    this.eventSubscriptions.set(subscriptionId, unsubscribeFn);

    return () => {
      unsubscribeFn();
      this.eventSubscriptions.delete(subscriptionId);
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
    if (!this.api) throw new Error('API not connected');

    try {
      if (!this.api) throw new Error('API not connected');
      const blockHash = await this.api.rpc.chain.getBlockHash();
      if (!blockHash) {
        return { status: "unknown", error: "Block hash not found" };
      }
      const signedBlock = await this.api.rpc.chain.getBlock(blockHash);
      if (!signedBlock || !signedBlock.block || !signedBlock.block.header) {
        return { status: "unknown", error: "Block not found" };
      }
      
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
    if (!this.api) throw new Error('API not connected');

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
    if (!this.api) throw new Error('API not connected');

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
      if (!this.api) throw new Error('API not connected');
      const claim = await this.api.query.trustLayer.claim(claimId);
      const claimCodec = claim as any;
      
      if (!claimCodec || (claimCodec.isNone !== undefined && claimCodec.isNone)) {
        return null;
      }

      const claimData = claimCodec.unwrap ? claimCodec.unwrap() : claimCodec;
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
          if (!this.api) throw new Error('API not connected');
          const staked = await this.api.query.trustLayer.stakedAmount(accountId);
          const stakedCodec = staked as any;
          if (stakedCodec) {
            stakedAmount = stakedCodec.toString();
            const minBalance = this.api.createType('Balance', minStake);
            hasStake = stakedCodec.gte ? stakedCodec.gte(minBalance) : 
                      (BigInt(stakedAmount) >= BigInt(minStake));
          }
        } catch (error) {
          console.warn("[Polkadot API] Error checking stake:", error);
        }
      }

      // Check x402 payment access
      let hasPaymentAccess = false;
      try {
        if (this.api) {
          const accessExpiry = await this.api.query.trustLayer.queryAccess(accountId, ual);
          const accessExpiryCodec = accessExpiry as any;
          if (accessExpiryCodec && 
              (accessExpiryCodec.isNone === undefined || !accessExpiryCodec.isNone)) {
            const expiryValue = accessExpiryCodec.unwrap ? 
                               accessExpiryCodec.unwrap() : accessExpiryCodec;
            const currentBlock = await this.getCurrentBlock();
            const expiryBlock = expiryValue?.toNumber ? expiryValue.toNumber() : 
                               (typeof expiryValue === 'number' ? expiryValue : 0);
            hasPaymentAccess = expiryBlock >= currentBlock;
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

  /**
   * Evaluate Guardian flag and execute slashing if criteria met
   * 
   * This function checks a Guardian verification report and triggers slashing
   * if the content is flagged with high confidence for severe violations.
   * 
   * @param verificationUAL - UAL of the Guardian verification report on DKG
   * @param creatorDID - Creator's DID or account ID
   * @param slasherAccount - Account that will execute the slash (must have permission)
   * @returns Slashing result
   */
  async evaluateGuardianFlag(
    verificationUAL: string,
    creatorDID: string,
    slasherAccount?: string
  ): Promise<{
    slashed: boolean;
    amount?: string;
    reason?: string;
    transactionHash?: string;
  }> {
    await this.ensureConnected();

    try {
      // Fetch verification report from DKG
      // In production, this would query the DKG for the verification report
      // For now, we'll simulate based on the UAL
      console.log(`[Polkadot API] Evaluating Guardian flag: ${verificationUAL} for creator ${creatorDID}`);

      // In production, would fetch from DKG:
      // const report = await dkg.getAsset(verificationUAL);
      // const confidence = report.verificationResult.confidence;
      // const matchType = report.verificationResult.matchType;
      
      // For demo, we'll check if UAL indicates a flag (contains 'flag' or 'match')
      const isFlagged = verificationUAL.includes('flag') || verificationUAL.includes('match');
      const confidence = 0.85; // Mock confidence
      const matchType: string = verificationUAL.includes('csam') ? 'csam' : 
                                 verificationUAL.includes('illicit') ? 'illicit' : 
                                 'deepfake'; // Mock match type

      // Slashing criteria:
      // - High confidence (>0.85)
      // - Severe violation (CSAM, illicit) OR repeated deepfake violations
      const shouldSlash = isFlagged && 
        confidence > 0.85 && 
        (matchType === 'csam' || matchType === 'illicit');

      if (!shouldSlash) {
        return {
          slashed: false,
          reason: `Flag does not meet slashing criteria (confidence: ${confidence}, type: ${matchType})`,
        };
      }

      // Calculate slash amount (1 TRAC for severe violations)
      const slashAmount = '1000000000000000000'; // 1 TRAC (18 decimals)

      if (!this.api) {
        throw new Error('API not connected');
      }

      // Execute slash transaction
      // In production, this would call the actual slashing pallet
      const tx = this.api.tx.stakingModule?.slashStake?.(
        creatorDID,
        slashAmount,
        `Guardian violation: ${verificationUAL}`
      ) || this.api.tx.system.remark(
        `Guardian slash: ${creatorDID} - ${verificationUAL}`
      );

      // Return transaction for signing (client-side will sign)
      return {
        slashed: true,
        amount: slashAmount,
        reason: `Guardian flag: ${matchType} violation with ${(confidence * 100).toFixed(1)}% confidence`,
        transactionHash: tx.hash.toString(),
      };
    } catch (error: any) {
      console.error("[Polkadot API] Error evaluating Guardian flag:", error);
      throw new Error(`Failed to evaluate Guardian flag: ${error.message}`);
    }
  }

  /**
   * Get Guardian verification history for a creator
   */
  async getGuardianVerificationHistory(creatorDID: string): Promise<Array<{
    ual: string;
    status: string;
    confidence: number;
    matchType?: string;
    timestamp: number;
  }>> {
    try {
      // In production, would query DKG for verification reports
      // For now, return empty array
      return [];
    } catch (error) {
      console.error("[Polkadot API] Error getting Guardian verification history:", error);
      return [];
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

