/**
 * Reputation Scoring Algorithm
 * 
 * Calculates reputation scores for open source contributions based on:
 * - Contribution type (commits, PRs, issues, reviews)
 * - Code quality metrics
 * - Community engagement
 * - Consistency over time
 */

export type ContributionType = "commit" | "pull_request" | "issue" | "review";

export interface ContributionMetrics {
  type: ContributionType;
  linesAdded?: number;
  linesRemoved?: number;
  filesChanged?: number;
  isMerged?: boolean;
  isApproved?: boolean;
  hasComments?: boolean;
  commentCount?: number;
  daysSinceCreated?: number;
}

export interface ReputationWeights {
  basePoints: {
    commit: number;
    pull_request: number;
    issue: number;
    review: number;
  };
  qualityMultiplier: {
    linesChanged: number;
    filesChanged: number;
    merged: number;
    approved: number;
  };
  engagementMultiplier: {
    comments: number;
    interactions: number;
  };
  timeDecay: number; // Decay factor per day (0-1)
}

/**
 * Default reputation weights
 * These can be configured per deployment
 */
export const DEFAULT_WEIGHTS: ReputationWeights = {
  basePoints: {
    commit: 5,
    pull_request: 20,
    issue: 10,
    review: 15,
  },
  qualityMultiplier: {
    linesChanged: 0.01, // 1 point per 100 lines
    filesChanged: 0.5, // 0.5 points per file
    merged: 1.5, // 50% bonus for merged PRs
    approved: 1.2, // 20% bonus for approved reviews
  },
  engagementMultiplier: {
    comments: 2, // 2 points per comment
    interactions: 1, // 1 point per interaction
  },
  timeDecay: 0.99, // 1% decay per day (very slow decay)
};

/**
 * Calculates reputation points for a single contribution
 * 
 * @param metrics - Contribution metrics
 * @param weights - Reputation weights (optional, uses defaults if not provided)
 * @returns Calculated reputation points
 */
export function calculateContributionPoints(
  metrics: ContributionMetrics,
  weights: ReputationWeights = DEFAULT_WEIGHTS
): number {
  // Start with base points for contribution type
  let points = weights.basePoints[metrics.type] || 0;

  // Apply quality multipliers
  if (metrics.linesAdded !== undefined || metrics.linesRemoved !== undefined) {
    const linesChanged = (metrics.linesAdded || 0) + (metrics.linesRemoved || 0);
    points += linesChanged * weights.qualityMultiplier.linesChanged;
  }

  if (metrics.filesChanged !== undefined) {
    points += metrics.filesChanged * weights.qualityMultiplier.filesChanged;
  }

  // Apply type-specific bonuses
  if (metrics.type === "pull_request" && metrics.isMerged) {
    points *= weights.qualityMultiplier.merged;
  }

  if (metrics.type === "review" && metrics.isApproved) {
    points *= weights.qualityMultiplier.approved;
  }

  // Apply engagement multipliers
  if (metrics.commentCount !== undefined && metrics.commentCount > 0) {
    points += metrics.commentCount * weights.engagementMultiplier.comments;
  }

  // Apply time decay (older contributions worth slightly less)
  if (metrics.daysSinceCreated !== undefined && metrics.daysSinceCreated > 0) {
    const decayFactor = Math.pow(weights.timeDecay, metrics.daysSinceCreated);
    points *= decayFactor;
  }

  // Round to nearest integer
  return Math.round(points);
}

/**
 * Calculates total reputation score from multiple contributions
 * 
 * @param contributions - Array of contribution metrics
 * @param weights - Reputation weights (optional)
 * @returns Total reputation score
 */
export function calculateTotalReputation(
  contributions: ContributionMetrics[],
  weights: ReputationWeights = DEFAULT_WEIGHTS
): number {
  return contributions.reduce((total, contribution) => {
    return total + calculateContributionPoints(contribution, weights);
  }, 0);
}

/**
 * Calculates reputation score with consistency bonus
 * Rewards contributors who contribute regularly over time
 * 
 * @param contributions - Array of contribution metrics with timestamps
 * @param weights - Reputation weights (optional)
 * @returns Total reputation score with consistency bonus
 */
export function calculateReputationWithConsistency(
  contributions: Array<ContributionMetrics & { createdAt: Date }>,
  weights: ReputationWeights = DEFAULT_WEIGHTS
): number {
  const baseScore = calculateTotalReputation(contributions, weights);

  // Calculate consistency bonus
  if (contributions.length < 2) {
    return baseScore;
  }

  // Group contributions by month
  const monthlyContributions = new Map<string, number>();
  contributions.forEach(contrib => {
    const monthKey = `${contrib.createdAt.getFullYear()}-${contrib.createdAt.getMonth()}`;
    monthlyContributions.set(monthKey, (monthlyContributions.get(monthKey) || 0) + 1);
  });

  // Consistency bonus: more months with contributions = higher bonus
  const activeMonths = monthlyContributions.size;
  const consistencyBonus = Math.min(activeMonths * 10, baseScore * 0.2); // Max 20% bonus

  return Math.round(baseScore + consistencyBonus);
}

/**
 * Gets contribution type weight
 * 
 * @param type - Contribution type
 * @param weights - Reputation weights (optional)
 * @returns Base points for the contribution type
 */
export function getContributionTypeWeight(
  type: ContributionType,
  weights: ReputationWeights = DEFAULT_WEIGHTS
): number {
  return weights.basePoints[type] || 0;
}


