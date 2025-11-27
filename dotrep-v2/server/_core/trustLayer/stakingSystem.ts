/**
 * Advanced Staking System for Trust Layer
 * Multi-tiered staking with Sybil resistance and slashing mechanisms
 */

export enum StakeTier {
  BASIC = 'BASIC',
  VERIFIED = 'VERIFIED',
  PREMIUM = 'PREMIUM',
  ELITE = 'ELITE'
}

export interface UserStake {
  totalStaked: bigint;
  lockedUntil: number; // Unix timestamp
  reputationMultiplier: number; // e.g., 110 = 1.10x (10% boost)
  slashableAmount: bigint;
  tier: StakeTier;
  endorsedUsers: string[]; // Array of user DIDs/addresses
  totalSlashable: bigint;
  createdAt: number;
  lastUpdated: number;
}

export interface SlashCondition {
  conditionType: string;
  slashPercentage: number; // 0-100
  evidenceThreshold: number; // Number of reports/evidence needed
  requiresArbitration: boolean;
}

export interface StakingConfig {
  tierRequirements: Record<StakeTier, bigint>;
  tierMultipliers: Record<StakeTier, number>;
  tierLockPeriods: Record<StakeTier, number>; // Days
  slashablePercentages: Record<StakeTier, number>; // 0-100
  slashConditions: SlashCondition[];
}

export class SybilResistantStaking {
  private config: StakingConfig;
  private userStakes: Map<string, UserStake> = new Map();
  private slashableBalances: Map<string, bigint> = new Map();

  constructor(config?: Partial<StakingConfig>) {
    this.config = {
      tierRequirements: {
        [StakeTier.BASIC]: BigInt(1000) * BigInt(10 ** 18),      // 1000 TRAC
        [StakeTier.VERIFIED]: BigInt(5000) * BigInt(10 ** 18),  // 5000 TRAC
        [StakeTier.PREMIUM]: BigInt(25000) * BigInt(10 ** 18),  // 25,000 TRAC
        [StakeTier.ELITE]: BigInt(100000) * BigInt(10 ** 18)    // 100,000 TRAC
      },
      tierMultipliers: {
        [StakeTier.BASIC]: 110,    // 10% boost (1.10x)
        [StakeTier.VERIFIED]: 125, // 25% boost
        [StakeTier.PREMIUM]: 150,  // 50% boost
        [StakeTier.ELITE]: 200     // 100% boost
      },
      tierLockPeriods: {
        [StakeTier.BASIC]: 30,     // 30 days
        [StakeTier.VERIFIED]: 90,  // 90 days
        [StakeTier.PREMIUM]: 180,  // 180 days
        [StakeTier.ELITE]: 365     // 365 days
      },
      slashablePercentages: {
        [StakeTier.BASIC]: 10,
        [StakeTier.VERIFIED]: 20,
        [StakeTier.PREMIUM]: 30,
        [StakeTier.ELITE]: 40
      },
      slashConditions: [
        {
          conditionType: 'Fake_Engagement',
          slashPercentage: 25,
          evidenceThreshold: 3,
          requiresArbitration: false
        },
        {
          conditionType: 'Sybil_Identity',
          slashPercentage: 50,
          evidenceThreshold: 1,
          requiresArbitration: true
        },
        {
          conditionType: 'Campaign_Fraud',
          slashPercentage: 75,
          evidenceThreshold: 2,
          requiresArbitration: true
        },
        {
          conditionType: 'Platform_Abuse',
          slashPercentage: 100,
          evidenceThreshold: 5,
          requiresArbitration: true
        }
      ],
      ...config
    };
  }

  /**
   * Stake tokens and upgrade tier if eligible
   */
  async stake(userDID: string, amount: bigint, targetTier?: StakeTier): Promise<{
    success: boolean;
    newTier: StakeTier;
    lockedUntil: number;
    reputationMultiplier: number;
  }> {
    const currentStake = this.userStakes.get(userDID) || this.createEmptyStake(userDID);
    const newTotalStaked = currentStake.totalStaked + amount;

    // Determine new tier
    let newTier = currentStake.tier;
    if (targetTier) {
      // User specified target tier - verify they have enough
      if (newTotalStaked < this.config.tierRequirements[targetTier]) {
        throw new Error(`Insufficient stake for ${targetTier} tier. Required: ${this.config.tierRequirements[targetTier]}`);
      }
      newTier = targetTier;
    } else {
      // Auto-upgrade to highest eligible tier
      newTier = this.calculateTier(newTotalStaked);
    }

    const lockPeriod = this.config.tierLockPeriods[newTier];
    const lockedUntil = Date.now() + (lockPeriod * 24 * 60 * 60 * 1000);
    const slashablePercentage = this.config.slashablePercentages[newTier];
    const slashableAmount = (newTotalStaked * BigInt(slashablePercentage)) / BigInt(100);

    const updatedStake: UserStake = {
      ...currentStake,
      totalStaked: newTotalStaked,
      lockedUntil,
      reputationMultiplier: this.config.tierMultipliers[newTier],
      slashableAmount,
      tier: newTier,
      totalSlashable: slashableAmount,
      lastUpdated: Date.now()
    };

    this.userStakes.set(userDID, updatedStake);
    this.slashableBalances.set(userDID, slashableAmount);

    return {
      success: true,
      newTier,
      lockedUntil,
      reputationMultiplier: updatedStake.reputationMultiplier
    };
  }

  /**
   * Unstake tokens (only if lock period has expired)
   */
  async unstake(userDID: string, amount: bigint): Promise<{
    success: boolean;
    remainingStake: bigint;
    newTier: StakeTier;
  }> {
    const stake = this.userStakes.get(userDID);
    if (!stake) {
      throw new Error('No stake found for user');
    }

    if (Date.now() < stake.lockedUntil) {
      throw new Error(`Stake is locked until ${new Date(stake.lockedUntil).toISOString()}`);
    }

    if (amount > stake.totalStaked) {
      throw new Error('Cannot unstake more than total staked');
    }

    const newTotalStaked = stake.totalStaked - amount;
    const newTier = this.calculateTier(newTotalStaked);
    const slashablePercentage = this.config.slashablePercentages[newTier];
    const slashableAmount = (newTotalStaked * BigInt(slashablePercentage)) / BigInt(100);

    const updatedStake: UserStake = {
      ...stake,
      totalStaked: newTotalStaked,
      reputationMultiplier: this.config.tierMultipliers[newTier],
      slashableAmount,
      tier: newTier,
      totalSlashable: slashableAmount,
      lastUpdated: Date.now()
    };

    this.userStakes.set(userDID, updatedStake);
    this.slashableBalances.set(userDID, slashableAmount);

    return {
      success: true,
      remainingStake: newTotalStaked,
      newTier
    };
  }

  /**
   * Execute slashing based on condition
   */
  async executeSlash(
    userDID: string,
    conditionType: string,
    evidence: string[],
    isArbitrator: boolean = false
  ): Promise<{
    success: boolean;
    slashedAmount: bigint;
    remainingStake: bigint;
  }> {
    const stake = this.userStakes.get(userDID);
    if (!stake) {
      throw new Error('No stake found for user');
    }

    const condition = this.config.slashConditions.find(c => c.conditionType === conditionType);
    if (!condition) {
      throw new Error(`Unknown slash condition: ${conditionType}`);
    }

    // Verify evidence threshold
    if (evidence.length < condition.evidenceThreshold) {
      throw new Error(`Insufficient evidence. Required: ${condition.evidenceThreshold}, Provided: ${evidence.length}`);
    }

    // Check arbitration requirement
    if (condition.requiresArbitration && !isArbitrator) {
      throw new Error('This slash condition requires arbitrator approval');
    }

    const slashAmount = (stake.totalStaked * BigInt(condition.slashPercentage)) / BigInt(100);
    const newTotalStaked = stake.totalStaked - slashAmount;
    const newTier = this.calculateTier(newTotalStaked);
    const slashablePercentage = this.config.slashablePercentages[newTier];
    const newSlashableAmount = (newTotalStaked * BigInt(slashablePercentage)) / BigInt(100);

    const updatedStake: UserStake = {
      ...stake,
      totalStaked: newTotalStaked,
      slashableAmount: newSlashableAmount,
      tier: newTier,
      reputationMultiplier: this.config.tierMultipliers[newTier],
      totalSlashable: newSlashableAmount,
      lastUpdated: Date.now()
    };

    this.userStakes.set(userDID, updatedStake);
    this.slashableBalances.set(userDID, newSlashableAmount);

    return {
      success: true,
      slashedAmount: slashAmount,
      remainingStake: newTotalStaked
    };
  }

  /**
   * Get user stake information
   */
  getUserStake(userDID: string): UserStake | null {
    return this.userStakes.get(userDID) || null;
  }

  /**
   * Verify if user meets staking requirements for a tier
   */
  verifyStakingRequirements(userDID: string, requiredTier: StakeTier): {
    verified: boolean;
    currentTier: StakeTier;
    requiredTier: StakeTier;
    currentStake: bigint;
    requiredStake: bigint;
    reputationMultiplier: number;
  } {
    const stake = this.userStakes.get(userDID) || this.createEmptyStake(userDID);
    const requiredStake = this.config.tierRequirements[requiredTier];

    return {
      verified: stake.tier === requiredTier || this.isTierHigherOrEqual(stake.tier, requiredTier),
      currentTier: stake.tier,
      requiredTier,
      currentStake: stake.totalStaked,
      requiredStake,
      reputationMultiplier: stake.reputationMultiplier
    };
  }

  /**
   * Calculate tier based on staked amount
   */
  private calculateTier(totalStaked: bigint): StakeTier {
    if (totalStaked >= this.config.tierRequirements[StakeTier.ELITE]) {
      return StakeTier.ELITE;
    } else if (totalStaked >= this.config.tierRequirements[StakeTier.PREMIUM]) {
      return StakeTier.PREMIUM;
    } else if (totalStaked >= this.config.tierRequirements[StakeTier.VERIFIED]) {
      return StakeTier.VERIFIED;
    } else if (totalStaked >= this.config.tierRequirements[StakeTier.BASIC]) {
      return StakeTier.BASIC;
    }
    return StakeTier.BASIC; // Default to basic even with 0 stake
  }

  /**
   * Check if tier1 is higher or equal to tier2
   */
  private isTierHigherOrEqual(tier1: StakeTier, tier2: StakeTier): boolean {
    const tierOrder = [StakeTier.BASIC, StakeTier.VERIFIED, StakeTier.PREMIUM, StakeTier.ELITE];
    return tierOrder.indexOf(tier1) >= tierOrder.indexOf(tier2);
  }

  /**
   * Create empty stake for new user
   */
  private createEmptyStake(userDID: string): UserStake {
    return {
      totalStaked: BigInt(0),
      lockedUntil: 0,
      reputationMultiplier: 100, // 1.0x (no boost)
      slashableAmount: BigInt(0),
      tier: StakeTier.BASIC,
      endorsedUsers: [],
      totalSlashable: BigInt(0),
      createdAt: Date.now(),
      lastUpdated: Date.now()
    };
  }

  /**
   * Get all slash conditions
   */
  getSlashConditions(): SlashCondition[] {
    return this.config.slashConditions;
  }

  /**
   * Get tier configuration
   */
  getTierConfig(tier: StakeTier): {
    minimumStake: bigint;
    lockPeriod: number;
    reputationMultiplier: number;
    slashablePercentage: number;
  } {
    return {
      minimumStake: this.config.tierRequirements[tier],
      lockPeriod: this.config.tierLockPeriods[tier],
      reputationMultiplier: this.config.tierMultipliers[tier],
      slashablePercentage: this.config.slashablePercentages[tier]
    };
  }
}

// Singleton instance
let stakingInstance: SybilResistantStaking | null = null;

export function getStakingSystem(config?: Partial<StakingConfig>): SybilResistantStaking {
  if (!stakingInstance) {
    stakingInstance = new SybilResistantStaking(config);
  }
  return stakingInstance;
}

