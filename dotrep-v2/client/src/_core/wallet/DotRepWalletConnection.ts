import { web3Enable, web3Accounts, web3FromAddress } from "@polkadot/extension-dapp";
import { ApiPromise, WsProvider } from "@polkadot/api";
import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";

export interface ReputationData {
  score: number;
  tier: "Novice" | "Contributor" | "Expert" | "Legend";
  percentile: number;
  breakdown: Array<{ type: string; score: number }>;
  skills: string[];
  contributionCount: number;
  lastUpdated: number;
}

export interface NftBadge {
  id: number;
  achievementType: string;
  metadata: string;
  mintedAt: number;
  soulbound: boolean;
}

export interface MultiChainReputation {
  chain: string;
  score: number;
  verified: boolean;
}

export interface WalletConnectionResult {
  account: InjectedAccountWithMeta;
  reputation: ReputationData;
  nftBadges: NftBadge[];
  multiChainReputation: MultiChainReputation[];
  permissions: WalletPermissions;
}

export interface WalletPermissions {
  readReputation: boolean;
  readContributions: boolean;
  readSkills: boolean;
  writeEndorsements: boolean;
}

export interface ConnectionOptions {
  dappName?: string;
  requestPermissions?: Partial<WalletPermissions>;
  showReputationPreview?: boolean;
  contextAware?: {
    dappType: "defi" | "governance" | "nft" | "general";
    highlightSkills?: string[];
  };
}

/**
 * DotRep Wallet Connection with Reputation Integration
 * 
 * Provides enhanced wallet connection with reputation-gated access,
 * multi-chain identity aggregation, and context-aware features.
 */
export class DotRepWalletConnection {
  private api: ApiPromise | null = null;
  private wsEndpoint: string;

  constructor(wsEndpoint: string = "ws://127.0.0.1:9944") {
    this.wsEndpoint = wsEndpoint;
  }

  /**
   * Connect wallet with reputation enhancement
   */
  async connectWithReputation(options: ConnectionOptions = {}): Promise<WalletConnectionResult> {
    const {
      dappName = "DotRep dApp",
      requestPermissions = {},
      showReputationPreview = true,
      contextAware
    } = options;

    // 1. Standard Polkadot connection
    const extensions = await web3Enable(dappName);
    if (!extensions || extensions.length === 0) {
      throw new Error("No Polkadot extension found. Please install the polkadot{.js} extension.");
    }

    const accounts = await web3Accounts();
    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts found in Polkadot extension.");
    }

    const selectedAccount = accounts[0];
    const address = selectedAccount.address;

    // 2. Initialize API connection
    await this.initializeApi();

    // 3. Fetch reputation data
    const reputation = await this.fetchReputation(address);
    
    // 4. Fetch NFT badges
    const nftBadges = await this.fetchNftBadges(address);

    // 5. Fetch multi-chain reputation (if applicable)
    const multiChainReputation = await this.fetchMultiChainReputation(address);

    // 6. Apply context-aware filtering
    if (contextAware) {
      this.applyContextAwareFiltering(reputation, contextAware);
    }

    // 7. Request permissions
    const permissions = this.requestPermissions(requestPermissions, reputation);

    // 8. Check reputation-gated access
    await this.checkReputationGatedAccess(reputation);

    return {
      account: selectedAccount,
      reputation,
      nftBadges,
      multiChainReputation,
      permissions
    };
  }

  /**
   * Preview reputation before connection
   */
  async previewReputation(address: string): Promise<ReputationData> {
    await this.initializeApi();
    return await this.fetchReputation(address);
  }

  /**
   * Initialize Polkadot API connection
   */
  private async initializeApi(): Promise<void> {
    if (this.api) {
      return;
    }

    try {
      const provider = new WsProvider(this.wsEndpoint);
      this.api = await ApiPromise.create({
        provider,
        types: {
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
          }
        }
      });

      await this.api.isReady;
    } catch (error) {
      console.error("[DotRepWallet] Failed to connect to Polkadot node:", error);
      throw error;
    }
  }

  /**
   * Fetch reputation data from DotRep parachain
   */
  private async fetchReputation(address: string): Promise<ReputationData> {
    if (!this.api) {
      throw new Error("API not initialized");
    }

    try {
      const account = this.api.createType("AccountId", address);
      
      // Query reputation score
      const reputationResult = await this.api.query.reputation.reputationScores(account);
      
      // Query contribution count
      const contributionCount = await this.api.query.reputation.contributions(account);
      
      // Query skill tags (if available)
      const skillsResult = await this.api.query.reputation.skillTags?.(account) || null;

      let score = 0;
      let breakdown: Array<{ type: string; score: number }> = [];
      let percentile = 0;
      let lastUpdated = 0;

      if (!reputationResult.isNone) {
        const rep = reputationResult.unwrap();
        score = rep.overall?.toNumber() || 0;
        percentile = rep.percentile?.toNumber() || 0;
        lastUpdated = rep.lastUpdated?.toNumber() || 0;
        
        if (rep.breakdown) {
          breakdown = rep.breakdown.map(([type, value]: any) => ({
            type: type.toString(),
            score: value.toNumber()
          }));
        }
      }

      const skills = skillsResult 
        ? (skillsResult as any).map((s: any) => s.toString())
        : [];

      const tier = this.calculateTier(score);
      const contributionCountNum = contributionCount ? (contributionCount as any).length || 0 : 0;

      return {
        score,
        tier,
        percentile,
        breakdown,
        skills,
        contributionCount: contributionCountNum,
        lastUpdated
      };
    } catch (error) {
      console.error("[DotRepWallet] Error fetching reputation:", error);
      // Return default reputation for new users
      return {
        score: 0,
        tier: "Novice",
        percentile: 0,
        breakdown: [],
        skills: [],
        contributionCount: 0,
        lastUpdated: 0
      };
    }
  }

  /**
   * Fetch NFT badges (Soulbound Tokens) from Assets Chain
   */
  private async fetchNftBadges(address: string): Promise<NftBadge[]> {
    if (!this.api) {
      return [];
    }

    try {
      const account = this.api.createType("AccountId", address);
      const nfts = await this.api.query.nft?.nfts?.(account) || null;

      if (!nfts) {
        return [];
      }

      return (nfts as any).map((nft: any) => ({
        id: nft.id.toNumber(),
        achievementType: nft.achievementType?.toString() || "Unknown",
        metadata: nft.metadata?.toString() || "",
        mintedAt: nft.mintedAt?.toNumber() || 0,
        soulbound: nft.soulbound?.toBoolean() || false
      }));
    } catch (error) {
      console.error("[DotRepWallet] Error fetching NFT badges:", error);
      return [];
    }
  }

  /**
   * Fetch multi-chain reputation via XCM
   */
  private async fetchMultiChainReputation(address: string): Promise<MultiChainReputation[]> {
    // This would query multiple parachains via XCM
    // For now, return empty array - implementation would use XCM queries
    try {
      // Example: Query Asset Hub, Moonbeam, Acala, etc.
      const chains = ["asset-hub", "moonbeam", "acala"];
      const results: MultiChainReputation[] = [];

      for (const chain of chains) {
        try {
          // In production, this would use XCM to query reputation
          // For now, we'll return empty results
          // const reputation = await this.queryXcmReputation(chain, address);
          // results.push({ chain, ...reputation });
        } catch (error) {
          console.warn(`[DotRepWallet] Failed to query ${chain}:`, error);
        }
      }

      return results;
    } catch (error) {
      console.error("[DotRepWallet] Error fetching multi-chain reputation:", error);
      return [];
    }
  }

  /**
   * Calculate reputation tier based on score
   */
  private calculateTier(score: number): "Novice" | "Contributor" | "Expert" | "Legend" {
    if (score >= 1000) return "Legend";
    if (score >= 500) return "Expert";
    if (score >= 100) return "Contributor";
    return "Novice";
  }

  /**
   * Apply context-aware filtering for dApp-specific skills
   */
  private applyContextAwareFiltering(
    reputation: ReputationData,
    context: NonNullable<ConnectionOptions["contextAware"]>
  ): void {
    if (context.highlightSkills && context.highlightSkills.length > 0) {
      // Filter and prioritize relevant skills
      reputation.skills = reputation.skills.filter(skill =>
        context.highlightSkills!.some(highlight => 
          skill.toLowerCase().includes(highlight.toLowerCase())
        )
      );
    }

    // Reorder breakdown by relevance to dApp type
    if (context.dappType === "defi") {
      reputation.breakdown.sort((a, b) => {
        const defiRelevant = ["SmartContractAudits", "CodeReview", "Documentation"];
        const aRelevant = defiRelevant.includes(a.type);
        const bRelevant = defiRelevant.includes(b.type);
        if (aRelevant && !bRelevant) return -1;
        if (!aRelevant && bRelevant) return 1;
        return b.score - a.score;
      });
    } else if (context.dappType === "governance") {
      reputation.breakdown.sort((a, b) => {
        const govRelevant = ["GovernanceParticipation", "Documentation", "CommunityHelp"];
        const aRelevant = govRelevant.includes(a.type);
        const bRelevant = govRelevant.includes(b.type);
        if (aRelevant && !bRelevant) return -1;
        if (!aRelevant && bRelevant) return 1;
        return b.score - a.score;
      });
    }
  }

  /**
   * Request and process permissions
   */
  private requestPermissions(
    requested: Partial<WalletPermissions>,
    reputation: ReputationData
  ): WalletPermissions {
    // Default permissions based on reputation
    const defaultPermissions: WalletPermissions = {
      readReputation: reputation.score > 0,
      readContributions: reputation.score > 0,
      readSkills: reputation.score > 0,
      writeEndorsements: reputation.score >= 100 // Only contributors and above can endorse
    };

    // Merge with requested permissions
    return {
      ...defaultPermissions,
      ...requested
    };
  }

  /**
   * Check if user meets reputation requirements for dApp access
   */
  private async checkReputationGatedAccess(reputation: ReputationData): Promise<void> {
    // This would check against dApp-specific requirements
    // For now, we just log the check
    if (reputation.score < 0) {
      console.warn("[DotRepWallet] User has negative reputation score");
    }
  }

  /**
   * Verify cross-chain reputation via XCM
   */
  async verifyCrossChainReputation(
    originChain: string,
    targetAccount: string
  ): Promise<MultiChainReputation | null> {
    if (!this.api) {
      await this.initializeApi();
    }

    try {
      // This would use XCM to query reputation from another parachain
      // Implementation would use XCM message passing
      const queryId = await this.api.tx.xcmGateway?.initiateReputationQuery?.(
        originChain,
        targetAccount
      );

      // In production, this would wait for XCM response
      // For now, return null
      return null;
    } catch (error) {
      console.error("[DotRepWallet] Error verifying cross-chain reputation:", error);
      return null;
    }
  }

  /**
   * Check if account has sufficient reputation for a threshold
   */
  async hasSufficientReputation(address: string, threshold: number): Promise<boolean> {
    const reputation = await this.fetchReputation(address);
    return reputation.score >= threshold;
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect(): Promise<void> {
    if (this.api) {
      await this.api.disconnect();
      this.api = null;
    }
  }
}

// Singleton instance
let walletConnectionInstance: DotRepWalletConnection | null = null;

export function getDotRepWalletConnection(wsEndpoint?: string): DotRepWalletConnection {
  if (!walletConnectionInstance) {
    walletConnectionInstance = new DotRepWalletConnection(wsEndpoint);
  }
  return walletConnectionInstance;
}


