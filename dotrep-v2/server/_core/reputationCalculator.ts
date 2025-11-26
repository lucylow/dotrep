/**
 * Serverless Reputation Calculation Service
 * Cloud-optimized reputation scoring algorithm
 */

export interface Contribution {
  id: string;
  type: string;
  weight: number;
  timestamp: number;
  age: number; // in days
}

export interface ReputationCalculationRequest {
  contributions: Contribution[];
  algorithmWeights: Record<string, number>;
  timeDecayFactor: number;
  userId: string;
  includeSafetyScore?: boolean; // Include Guardian safety score
}

export interface ReputationScore {
  overall: number;
  breakdown: Record<string, number>;
  percentile: number;
  rank: number;
  lastUpdated: number;
  safetyScore?: number; // Guardian safety score (0-1)
  combinedScore?: number; // Reputation * safety score
}

export class ReputationCalculator {
  /**
   * Calculate reputation score with time decay
   */
  async calculateReputation(request: ReputationCalculationRequest): Promise<ReputationScore> {
    const { contributions, algorithmWeights, timeDecayFactor, userId, includeSafetyScore = false } = request;

    // Calculate time-decayed scores
    const now = Date.now();
    const decayedScores = contributions.map(contribution => {
      const ageInDays = (now - contribution.timestamp) / (1000 * 60 * 60 * 24);
      const decayFactor = Math.exp(-timeDecayFactor * ageInDays);
      const weight = algorithmWeights[contribution.type] || 1;
      
      return {
        type: contribution.type,
        score: contribution.weight * weight * decayFactor,
        rawScore: contribution.weight * weight
      };
    });

    // Aggregate scores by type
    const breakdown = decayedScores.reduce((acc, { type, score }) => {
      acc[type] = (acc[type] || 0) + score;
      return acc;
    }, {} as Record<string, number>);

    // Calculate overall score
    const overall = Object.values(breakdown).reduce((sum, score) => sum + score, 0);

    // Get percentile from cloud database (or calculate locally)
    const percentile = await this.calculatePercentile(userId, overall);

    // Get Guardian safety score if requested
    let safetyScore: number | undefined;
    let combinedScore: number | undefined;

    if (includeSafetyScore) {
      try {
        const { getGuardianVerificationService } = await import('../../dkg-integration/guardian-verification');
        const guardianService = getGuardianVerificationService();
        const safetyData = await guardianService.calculateCreatorSafetyScore(userId);
        safetyScore = safetyData.safetyScore;
        
        // Combined score: reputation weighted by safety
        // Formula: overall * (0.7 + 0.3 * safetyScore)
        // This ensures safety has meaningful impact but doesn't completely override reputation
        combinedScore = overall * (0.7 + 0.3 * safetyScore);
      } catch (error) {
        console.warn(`Failed to get safety score for ${userId}:`, error);
        // Continue without safety score
      }
    }

    return {
      overall: Math.round(overall),
      breakdown,
      percentile,
      rank: await this.calculateRank(userId),
      lastUpdated: now,
      safetyScore,
      combinedScore: combinedScore ? Math.round(combinedScore) : undefined,
    };
  }

  private async calculatePercentile(userId: string, score: number): Promise<number> {
    // In production, this would query a cloud database
    // For now, return a mock percentile
    try {
      const analyticsEndpoint = process.env.CLOUD_ANALYTICS_ENDPOINT || 'https://analytics.dotrep.cloud';
      const response = await fetch(`${analyticsEndpoint}/percentile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, score })
      });

      if (response.ok) {
        const data = await response.json();
        return data.percentile;
      }
    } catch (error) {
      console.warn('Failed to calculate percentile from cloud, using default:', error);
    }

    // Default percentile calculation (mock)
    return Math.min(100, Math.max(0, (score / 1000) * 100));
  }

  private async calculateRank(userId: string): Promise<number> {
    // In production, this would query a cloud database
    try {
      const analyticsEndpoint = process.env.CLOUD_ANALYTICS_ENDPOINT || 'https://analytics.dotrep.cloud';
      const response = await fetch(`${analyticsEndpoint}/rank/${userId}`, {
        headers: {
          ...(process.env.CLOUD_API_KEY && { 'Authorization': `Bearer ${process.env.CLOUD_API_KEY}` })
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.rank;
      }
    } catch (error) {
      console.warn('Failed to calculate rank from cloud, using default:', error);
    }

    // Default rank (mock)
    return 0;
  }
}


