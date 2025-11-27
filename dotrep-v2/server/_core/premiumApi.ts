/**
 * Premium API Router with x402 Payment Protection
 * 
 * This module provides premium reputation API endpoints protected by x402 micropayments.
 * Aligned with OriginTrail hackathon requirements for "high-confidence data" and "trusted feeds".
 * 
 * Features:
 * - x402 protocol integration for autonomous agent payments
 * - Premium reputation scores with Sybil analysis
 * - Guardian dataset integration for enhanced safety scores
 * - Automatic DKG publishing of reputation data as Knowledge Assets
 * - MCP-compatible responses for AI agent integration
 * 
 * Three-Layer Architecture:
 * - Trust Layer: x402 payments, token staking, Sybil resistance
 * - Knowledge Layer: OriginTrail DKG for verifiable reputation data
 * - Agent Layer: MCP-compatible API for AI agent queries
 */

import { Router, Request, Response, NextFunction } from 'express';
import { ReputationCalculator, type ReputationCalculationRequest, type ReputationScore } from './reputationCalculator';
import { createDKGClientV8 } from '../../dkg-integration/dkg-client-v8';
import { getGuardianVerificationService } from '../../dkg-integration/guardian-verification';
import { BotClusterDetector } from './botClusterDetector';
import type { BotDetectionResults } from './botClusterDetector';
import { logError } from './errorHandler';

const router = Router();

/**
 * x402 Payment Middleware Factory
 * 
 * Creates middleware that protects endpoints with x402 payments.
 * Returns HTTP 402 Payment Required if payment proof is missing or invalid.
 * 
 * @param resourceId - Resource identifier for access policy
 * @param price - Price in USD (e.g., "0.10")
 * @param network - Blockchain network (default: "base-sepolia")
 */
function createX402Middleware(
  resourceId: string,
  price: string,
  network: string = 'base-sepolia'
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Check for x402 payment proof in header
    const xPaymentHeader = req.headers['x-payment'] || req.headers['x-payment-proof'];
    
    if (!xPaymentHeader) {
      // Return HTTP 402 Payment Required
      const challenge = generateChallenge();
      const paymentRequest = {
        amount: price,
        currency: 'USDC',
        recipient: process.env.X402_WALLET_ADDRESS || '0x0000000000000000000000000000000000000000',
        chains: [network],
        resourceUAL: `urn:ual:dotrep:premium:${resourceId}`,
        description: `Premium access to ${resourceId}`,
        challenge,
        facilitator: process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator'
      };
      
      return res.status(402).json({
        error: 'Payment Required',
        code: 'X402_PAYMENT_REQUIRED',
        message: `This endpoint requires payment of $${price} USDC`,
        paymentRequest,
        documentation: 'https://x402.org/docs/client-integration'
      });
    }
    
    try {
      // Parse and validate payment proof
      const proof = typeof xPaymentHeader === 'string' 
        ? JSON.parse(xPaymentHeader) 
        : xPaymentHeader;
      
      // In production, verify payment with facilitator
      // For now, basic validation
      if (!proof.txHash || !proof.chain || !proof.amount) {
        return res.status(402).json({
          error: 'Invalid Payment Proof',
          code: 'X402_INVALID_PROOF',
          message: 'Payment proof is missing required fields'
        });
      }
      
      // Payment verified, continue to handler
      req.paymentProof = proof;
      next();
    } catch (error) {
      logError(error, { operation: 'x402_validation', resourceId });
      return res.status(402).json({
        error: 'Payment Verification Failed',
        code: 'X402_VERIFICATION_FAILED',
        message: 'Failed to verify payment proof'
      });
    }
  };
}

/**
 * Generate challenge for payment request (replay protection)
 */
function generateChallenge(): string {
  return `x402-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Extend Express Request type to include payment proof
declare global {
  namespace Express {
    interface Request {
      paymentProof?: {
        txHash: string;
        chain: string;
        amount: string;
        currency: string;
        payer?: string;
        challenge?: string;
      };
    }
  }
}

/**
 * GET /api/premium/reputation-score/:userId
 * 
 * Get premium reputation score with comprehensive analysis.
 * Protected by x402 payment ($0.10).
 * 
 * Features:
 * - Full reputation calculation with time decay
 * - Guardian safety score integration
 * - Bot cluster detection and Sybil risk analysis
 * - Automatic DKG publishing as Knowledge Asset
 * - MCP-compatible response format
 */
router.get(
  '/premium/reputation-score/:userId',
  createX402Middleware('reputation-score', '0.10', 'base-sepolia'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const { includeHistory, includeSybilAnalysis } = req.query;
      
      const calculator = new ReputationCalculator();
      const dkgClient = createDKGClientV8({
        useMockMode: process.env.DKG_USE_MOCK === 'true',
        fallbackToMock: true
      });
      
      // Get user contributions (would fetch from database in production)
      const contributions = await getUserContributions(userId);
      
      // Get Guardian safety score
      let guardianSafetyScore: number | undefined;
      try {
        const guardianService = getGuardianVerificationService();
        const safetyData = await guardianService.calculateCreatorSafetyScore(userId);
        guardianSafetyScore = safetyData.safetyScore;
      } catch (error) {
        console.warn(`Failed to get Guardian safety score for ${userId}:`, error);
      }
      
      // Bot cluster detection for Sybil resistance
      let botDetectionResults: BotDetectionResults | undefined;
      if (includeSybilAnalysis === 'true') {
        try {
          const detector = new BotClusterDetector();
          botDetectionResults = await detector.detectBotClusters([userId]);
        } catch (error) {
          console.warn(`Failed to detect bot clusters for ${userId}:`, error);
        }
      }
      
      // Calculate reputation
      const request: ReputationCalculationRequest = {
        contributions,
        algorithmWeights: {
          github_pr: 1.0,
          github_commit: 0.5,
          gitlab_mr: 1.0,
          other: 0.3
        },
        timeDecayFactor: 0.01,
        userId,
        includeSafetyScore: true,
        includeHighlyTrustedDetermination: true,
        botDetectionResults
      };
      
      const reputationScore = await calculator.calculateReputation(request);
      
      // Publish to DKG as Knowledge Asset
      let dkgUAL: string | undefined;
      try {
        const dkgResult = await dkgClient.publishReputationAsset({
          developerId: userId,
          reputationScore: reputationScore.overall,
          contributions: contributions.map(c => ({
            id: c.id,
            type: c.type as any,
            url: '',
            title: c.type,
            date: new Date(c.timestamp).toISOString(),
            impact: c.weight
          })),
          timestamp: Date.now(),
          metadata: {
            safetyScore: guardianSafetyScore,
            sybilRisk: reputationScore.sybilRisk,
            botDetectionPenalty: reputationScore.botDetectionPenalty,
            highlyTrusted: reputationScore.highlyTrustedStatus?.isHighlyTrusted,
            paymentProof: req.paymentProof?.txHash,
            source: 'premium_api'
          }
        }, 2); // Store for 2 epochs
        
        dkgUAL = dkgResult.UAL;
      } catch (error) {
        console.warn(`Failed to publish reputation to DKG for ${userId}:`, error);
      }
      
      // MCP-compatible response
      res.json({
        success: true,
        data: {
          userId,
          reputation: reputationScore,
          guardianSafetyScore,
          dkgUAL,
          paymentProof: req.paymentProof?.txHash,
          timestamp: Date.now(),
          // MCP metadata for AI agents
          mcp: {
            tool: 'get_reputation_score',
            version: '1.0.0',
            verifiable: dkgUAL ? true : false,
            source: 'dotrep_premium_api'
          }
        }
      });
    } catch (error) {
      logError(error, { operation: 'premium_reputation_score', userId: req.params.userId });
      next(error);
    }
  }
);

/**
 * GET /api/premium/sybil-analysis-report
 * 
 * Get comprehensive Sybil analysis report for a user or cluster.
 * Protected by x402 payment ($0.25).
 * 
 * Features:
 * - Bot cluster detection using Guardian dataset
 * - Graph analysis for coordinated attacks
 * - Reputation adjustment recommendations
 * - DKG publishing of analysis results
 */
router.get(
  '/premium/sybil-analysis-report',
  createX402Middleware('sybil-analysis', '0.25', 'base-sepolia'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, accountIds } = req.query;
      
      if (!userId && !accountIds) {
        return res.status(400).json({
          error: {
            code: 'BAD_REQUEST',
            message: 'Either userId or accountIds query parameter is required'
          }
        });
      }
      
      const detector = new BotClusterDetector();
      const targetIds = accountIds 
        ? (typeof accountIds === 'string' ? [accountIds] : accountIds as string[])
        : [userId as string];
      
      // Detect bot clusters
      const botDetectionResults = await detector.detectBotClusters(targetIds);
      
      // Get Guardian dataset analysis
      let guardianAnalysis: any = undefined;
      try {
        const guardianService = getGuardianVerificationService();
        for (const id of targetIds) {
          const safetyData = await guardianService.calculateCreatorSafetyScore(id);
          if (!guardianAnalysis) {
            guardianAnalysis = {
              safetyScores: [],
              averageSafetyScore: 0,
              riskLevel: 'unknown'
            };
          }
          guardianAnalysis.safetyScores.push({
            userId: id,
            safetyScore: safetyData.safetyScore,
            riskFactors: safetyData.riskFactors || []
          });
        }
        
        if (guardianAnalysis && guardianAnalysis.safetyScores.length > 0) {
          guardianAnalysis.averageSafetyScore = 
            guardianAnalysis.safetyScores.reduce((sum: number, s: any) => sum + s.safetyScore, 0) /
            guardianAnalysis.safetyScores.length;
          
          // Determine risk level
          if (guardianAnalysis.averageSafetyScore < 0.3) {
            guardianAnalysis.riskLevel = 'high';
          } else if (guardianAnalysis.averageSafetyScore < 0.6) {
            guardianAnalysis.riskLevel = 'medium';
          } else {
            guardianAnalysis.riskLevel = 'low';
          }
        }
      } catch (error) {
        console.warn('Failed to get Guardian analysis:', error);
      }
      
      // Publish analysis to DKG
      let dkgUAL: string | undefined;
      try {
        const dkgClient = createDKGClientV8({
          useMockMode: process.env.DKG_USE_MOCK === 'true',
          fallbackToMock: true
        });
        
        const dkgResult = await dkgClient.publishReputationAsset({
          developerId: targetIds.join(','),
          reputationScore: 0, // Not applicable for analysis
          contributions: [],
          timestamp: Date.now(),
          metadata: {
            type: 'sybil_analysis_report',
            botDetectionResults: {
              confirmedBotClusters: botDetectionResults.confirmedBotClusters.length,
              suspiciousClusters: botDetectionResults.suspiciousClusters.length,
              individualBots: botDetectionResults.individualBots.length
            },
            guardianAnalysis,
            paymentProof: req.paymentProof?.txHash,
            source: 'premium_api'
          }
        }, 2);
        
        dkgUAL = dkgResult.UAL;
      } catch (error) {
        console.warn('Failed to publish Sybil analysis to DKG:', error);
      }
      
      res.json({
        success: true,
        data: {
          analysis: {
            botDetection: botDetectionResults,
            guardianAnalysis,
            recommendations: generateSybilRecommendations(botDetectionResults, guardianAnalysis)
          },
          dkgUAL,
          paymentProof: req.paymentProof?.txHash,
          timestamp: Date.now(),
          mcp: {
            tool: 'get_sybil_analysis',
            version: '1.0.0',
            verifiable: dkgUAL ? true : false,
            source: 'dotrep_premium_api'
          }
        }
      });
    } catch (error) {
      logError(error, { operation: 'sybil_analysis_report', query: req.query });
      next(error);
    }
  }
);

/**
 * GET /api/premium/influencer-recommendations
 * 
 * Get trust-enhanced influencer recommendations for brands.
 * Protected by x402 payment ($0.15).
 * 
 * Features:
 * - PageRank-based influencer identification
 * - Sybil-resistant filtering
 * - Guardian safety score integration
 * - Reputation-weighted recommendations
 */
router.get(
  '/premium/influencer-recommendations',
  createX402Middleware('influencer-recommendations', '0.15', 'base-sepolia'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { 
        targetAudience, 
        minReputation, 
        maxSybilRisk,
        platforms,
        specialties,
        budget,
        campaignType,
        limit = '10'
      } = req.query;
      
      // Get recommendations (would use Trust Navigator Agent in production)
      const recommendations = await getInfluencerRecommendations({
        targetAudience: targetAudience as string,
        minReputation: minReputation ? Number(minReputation) : undefined,
        maxSybilRisk: maxSybilRisk ? Number(maxSybilRisk) : undefined,
        platforms: platforms ? (typeof platforms === 'string' ? [platforms] : platforms as string[]) : undefined,
        specialties: specialties ? (typeof specialties === 'string' ? [specialties] : specialties as string[]) : undefined,
        budget: budget ? Number(budget) : undefined,
        campaignType: campaignType as string,
        limit: Number(limit)
      });
      
      res.json({
        success: true,
        data: {
          recommendations,
          count: recommendations.length,
          paymentProof: req.paymentProof?.txHash,
          timestamp: Date.now(),
          mcp: {
            tool: 'get_influencer_recommendations',
            version: '1.0.0',
            verifiable: false,
            source: 'dotrep_premium_api'
          }
        }
      });
    } catch (error) {
      logError(error, { operation: 'influencer_recommendations', query: req.query });
      next(error);
    }
  }
);

// Helper functions

/**
 * Get user contributions (mock implementation - would fetch from database)
 */
async function getUserContributions(userId: string) {
  // In production, fetch from database
  return [
    {
      id: `contrib-${userId}-1`,
      type: 'github_pr',
      weight: 100,
      timestamp: Date.now() - 30 * 24 * 60 * 60 * 1000,
      age: 30,
      verified: true,
      verifierCount: 3
    }
  ];
}

/**
 * Generate Sybil resistance recommendations
 */
function generateSybilRecommendations(
  botDetection: BotDetectionResults,
  guardianAnalysis?: any
): string[] {
  const recommendations: string[] = [];
  
  if (botDetection.confirmedBotClusters.length > 0) {
    recommendations.push('High risk: User is in a confirmed bot cluster. Recommend reputation penalty.');
  }
  
  if (botDetection.suspiciousClusters.length > 0) {
    recommendations.push('Medium risk: User is in a suspicious cluster. Recommend additional verification.');
  }
  
  if (guardianAnalysis && guardianAnalysis.riskLevel === 'high') {
    recommendations.push('Guardian dataset indicates high risk. Recommend enhanced monitoring.');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('No significant Sybil risk detected. User appears legitimate.');
  }
  
  return recommendations;
}

/**
 * Get influencer recommendations (mock implementation)
 */
async function getInfluencerRecommendations(params: {
  targetAudience?: string;
  minReputation?: number;
  maxSybilRisk?: number;
  platforms?: string[];
  specialties?: string[];
  budget?: number;
  campaignType?: string;
  limit: number;
}) {
  // In production, use Trust Navigator Agent
  return [
    {
      userId: 'influencer-1',
      reputation: 850,
      sybilRisk: 0.1,
      guardianSafetyScore: 0.9,
      platforms: ['twitter', 'youtube'],
      specialties: ['tech', 'crypto'],
      matchScore: 0.95
    }
  ];
}

export default router;

