/**
 * Trust Layer Utility Functions
 * Helper functions for trust layer operations
 */

import { StakeTier } from './stakingSystem';

/**
 * Convert BigInt to string for JSON serialization
 */
export function bigIntToString(value: bigint): string {
  return value.toString();
}

/**
 * Convert string to BigInt (from JSON)
 */
export function stringToBigInt(value: string): bigint {
  return BigInt(value);
}

/**
 * Format stake amount for display
 */
export function formatStakeAmount(amount: bigint, decimals: number = 18): string {
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;
  
  if (fraction === BigInt(0)) {
    return whole.toString();
  }
  
  const fractionStr = fraction.toString().padStart(decimals, '0');
  const trimmed = fractionStr.replace(/0+$/, '');
  
  return `${whole}.${trimmed}`;
}

/**
 * Format USDC amount (6 decimals)
 */
export function formatUSDC(amount: number): string {
  return (amount / 10 ** 6).toFixed(2);
}

/**
 * Parse USDC amount to micro-units
 */
export function parseUSDC(amount: string): number {
  return Math.floor(parseFloat(amount) * 10 ** 6);
}

/**
 * Calculate tier from stake amount
 */
export function calculateTierFromStake(amount: bigint): StakeTier {
  const ELITE = BigInt(100000) * BigInt(10 ** 18);
  const PREMIUM = BigInt(25000) * BigInt(10 ** 18);
  const VERIFIED = BigInt(5000) * BigInt(10 ** 18);
  const BASIC = BigInt(1000) * BigInt(10 ** 18);

  if (amount >= ELITE) return StakeTier.ELITE;
  if (amount >= PREMIUM) return StakeTier.PREMIUM;
  if (amount >= VERIFIED) return StakeTier.VERIFIED;
  if (amount >= BASIC) return StakeTier.BASIC;
  return StakeTier.BASIC;
}

/**
 * Get tier display name
 */
export function getTierDisplayName(tier: StakeTier): string {
  return tier.charAt(0) + tier.slice(1).toLowerCase();
}

/**
 * Get tier color (for UI)
 */
export function getTierColor(tier: StakeTier): string {
  const colors = {
    [StakeTier.BASIC]: '#6B7280',      // Gray
    [StakeTier.VERIFIED]: '#3B82F6',   // Blue
    [StakeTier.PREMIUM]: '#8B5CF6',    // Purple
    [StakeTier.ELITE]: '#F59E0B'       // Amber
  };
  return colors[tier] || '#6B7280';
}

/**
 * Calculate lock period remaining (days)
 */
export function calculateLockPeriodRemaining(lockedUntil: number): number {
  if (lockedUntil <= Date.now()) {
    return 0;
  }
  return Math.ceil((lockedUntil - Date.now()) / (1000 * 60 * 60 * 24));
}

/**
 * Format lock period
 */
export function formatLockPeriod(days: number): string {
  if (days === 0) return 'Unlocked';
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''}`;
  if (days < 365) {
    const months = Math.floor(days / 30);
    const remainingDays = days % 30;
    if (remainingDays === 0) {
      return `${months} month${months !== 1 ? 's' : ''}`;
    }
    return `${months} month${months !== 1 ? 's' : ''} ${remainingDays} day${remainingDays !== 1 ? 's' : ''}`;
  }
  const years = Math.floor(days / 365);
  const remainingDays = days % 365;
  if (remainingDays === 0) {
    return `${years} year${years !== 1 ? 's' : ''}`;
  }
  return `${years} year${years !== 1 ? 's' : ''} ${remainingDays} day${remainingDays !== 1 ? 's' : ''}`;
}

/**
 * Validate user DID format
 */
export function isValidDID(did: string): boolean {
  // Basic DID validation (did:method:identifier)
  const didPattern = /^did:[a-z0-9]+:[a-zA-Z0-9._-]+$/;
  return didPattern.test(did);
}

/**
 * Generate payment ID
 */
export function generatePaymentId(prefix: string = 'pay'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Generate deal ID
 */
export function generateDealId(prefix: string = 'deal'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Hash string (simple implementation, use crypto in production)
 */
export function hashString(input: string): string {
  // In production, use proper hash function like SHA-256
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Calculate trust score confidence interval
 */
export function calculateConfidenceInterval(
  scores: number[],
  confidenceLevel: number = 0.95
): { lower: number; upper: number; mean: number; stdDev: number } {
  if (scores.length === 0) {
    return { lower: 0, upper: 0, mean: 0, stdDev: 0 };
  }

  const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  // Z-score for 95% confidence (1.96)
  const zScore = confidenceLevel === 0.95 ? 1.96 : 1.645; // 90% default
  const margin = zScore * stdDev;

  return {
    lower: Math.max(0, mean - margin),
    upper: Math.min(1, mean + margin),
    mean,
    stdDev
  };
}

/**
 * Format trust score as percentage
 */
export function formatTrustScore(score: number): string {
  return `${(score * 100).toFixed(1)}%`;
}

/**
 * Get trust score color (for UI)
 */
export function getTrustScoreColor(score: number): string {
  if (score >= 0.8) return '#10B981'; // Green
  if (score >= 0.6) return '#3B82F6'; // Blue
  if (score >= 0.4) return '#F59E0B'; // Amber
  return '#EF4444'; // Red
}

/**
 * Get trust score label
 */
export function getTrustScoreLabel(score: number): string {
  if (score >= 0.9) return 'Excellent';
  if (score >= 0.8) return 'Very Good';
  if (score >= 0.7) return 'Good';
  if (score >= 0.6) return 'Fair';
  if (score >= 0.5) return 'Below Average';
  return 'Poor';
}

/**
 * Validate payment amount
 */
export function validatePaymentAmount(amount: number, min: number = 0, max: number = 1000000): boolean {
  return amount >= min && amount <= max && !isNaN(amount) && isFinite(amount);
}

/**
 * Validate stake amount
 */
export function validateStakeAmount(amount: bigint, min: bigint = BigInt(0)): boolean {
  return amount >= min;
}

/**
 * Calculate performance bonus eligibility
 */
export function calculatePerformanceBonus(
  engagementRate: number,
  conversions: number,
  qualityRating: number
): {
  eligible: boolean;
  bonuses: {
    engagement: boolean;
    conversion: boolean;
    quality: boolean;
  };
  totalBonus: number;
} {
  const bonuses = {
    engagement: engagementRate >= 0.05,
    conversion: conversions >= 100,
    quality: qualityRating >= 4.5
  };

  let totalBonus = 0;
  if (bonuses.engagement) totalBonus += 50 * 10 ** 6; // $50 USDC
  if (bonuses.conversion) totalBonus += 100 * 10 ** 6; // $100 USDC
  if (bonuses.quality) totalBonus += 75 * 10 ** 6; // $75 USDC

  return {
    eligible: totalBonus > 0,
    bonuses,
    totalBonus
  };
}

