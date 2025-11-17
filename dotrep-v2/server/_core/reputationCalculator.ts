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
}

export interface ReputationScore {
  overall: number;
  breakdown: Record<string, number>;
  percentile: number;
  rank: number;
  lastUpdated: number;
}

export class ReputationCalculator {
  /**
   * Calculate reputation score with time decay
   */
  async calculateReputation(request: ReputationCalculationRequest): Promise<ReputationScore> {
    const { contributions, algorithmWeights, timeDecayFactor, userId } = request;

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

    return {
      overall: Math.round(overall),
      breakdown,
      percentile,
      rank: await this.calculateRank(userId),
      lastUpdated: now
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


