/**
 * Mock Router
 * 
 * Provides mock implementations of all tRPC endpoints for running in mock mode.
 * This allows the frontend to work standalone without backend dependencies.
 */

import { router, publicProcedure } from "./trpc";
import { z } from "zod";
import { 
  mockContributors, 
  mockContributions, 
  mockAchievements,
  getMockContributor,
  getMockContributions,
  getMockAchievements,
} from '../../client/src/data/mockData';
import {
  getMockReputation,
  getMockMultiChainReputation,
  getMockContextAwareReputation,
  getMockProposals,
  getMockNFTs,
  getMockChainInfo,
  getMockAnchors,
  getMockAnalyticsContributions,
  getMockInfluencers,
  getMockSybilClusters,
  getMockTrustScore,
  getMockVerificationStatus,
  getMockCommunityNotes,
} from './mockDataProviders';

// Input validation schemas (same as real router)
const githubUsernameSchema = z.object({
  username: z.string().min(1).max(255).trim(),
});

const contributorIdSchema = z.object({
  id: z.number().int().positive(),
});

const limitSchema = z.object({
  limit: z.number().int().min(1).max(1000).optional(),
});

const contributorIdWithLimitSchema = z.object({
  contributorId: z.number().int().positive(),
  limit: z.number().int().min(1).max(500).optional(),
});

export const mockRouter = router({
  system: router({
    health: publicProcedure
      .input(z.object({ timestamp: z.number().min(0) }))
      .query(() => ({ ok: true })),
    
    notifyOwner: publicProcedure
      .input(z.object({
        title: z.string().min(1),
        content: z.string().min(1),
      }))
      .mutation(() => ({ success: true })),
  }),

  agents: router({
    findInfluencers: publicProcedure
      .input(z.object({
        query: z.union([z.string(), z.object({
          targetAudience: z.string(),
          minReputation: z.number().optional(),
          maxSybilRisk: z.number().optional(),
          platforms: z.array(z.string()).optional(),
          specialties: z.array(z.string()).optional(),
          budget: z.number().optional(),
          campaignType: z.enum(['product_launch', 'brand_awareness', 'event_promotion', 'content_creation']).optional(),
        })]),
        limit: z.number().min(1).max(50).default(10),
      }))
      .query(({ input }) => ({
        success: true,
        matches: getMockInfluencers(input.query, input.limit),
      })),

    detectSybilClusters: publicProcedure
      .input(z.object({
        accountIds: z.array(z.string()).optional(),
        analysisDepth: z.number().min(1).max(5).default(3),
      }))
      .query(({ input }) => ({
        success: true,
        clusters: getMockSybilClusters(input.accountIds || []),
      })),

    negotiateDeal: publicProcedure
      .input(z.object({
        influencerDid: z.string(),
        brandDid: z.string(),
        terms: z.any(),
      }))
      .mutation(() => ({
        success: true,
        deal: {
          dealId: `deal-${Date.now()}`,
          influencerDid: 'did:influencer:1',
          brandDid: 'did:brand:1',
          terms: {},
          status: 'pending',
        },
      })),

    optimizeCampaign: publicProcedure
      .input(z.object({
        campaignId: z.string(),
        dealIds: z.array(z.string()),
      }))
      .query(() => ({
        success: true,
        optimization: {
          recommendations: [],
          estimatedROI: 1.5,
        },
      })),

    verifyReputation: publicProcedure
      .input(z.object({
        did: z.string(),
        includeHistory: z.boolean().default(false),
      }))
      .query(({ input }) => ({
        success: true,
        verification: {
          verified: true,
          score: 1250,
          history: input.includeHistory ? [] : undefined,
        },
      })),

    generateTransparencyReport: publicProcedure
      .input(z.object({
        campaignId: z.string(),
        dealIds: z.array(z.string()),
      }))
      .query(() => ({
        success: true,
        report: {
          campaignId: 'campaign-1',
          deals: [],
          summary: {},
        },
      })),

    detectMisinformation: publicProcedure
      .input(z.object({
        claim: z.string().min(1),
        context: z.string().optional(),
      }))
      .query(() => ({
        success: true,
        analysis: {
          isMisinformation: false,
          confidence: 0.85,
          evidence: [],
        },
      })),

    verifyTruth: publicProcedure
      .input(z.object({ claim: z.string().min(1) }))
      .query(() => ({
        success: true,
        result: {
          verified: true,
          confidence: 0.9,
          sources: [],
        },
      })),

    makeAutonomousDecision: publicProcedure
      .input(z.object({
        action: z.string(),
        targetAccount: z.string(),
        amount: z.number().optional(),
        context: z.record(z.any()).optional(),
      }))
      .query(() => ({
        success: true,
        decision: {
          approved: true,
          reason: 'Mock decision',
        },
      })),

    crossChainReasoning: publicProcedure
      .input(z.object({
        query: z.string().min(1),
        chains: z.array(z.string()).optional(),
      }))
      .query(() => ({
        success: true,
        result: {
          answer: 'Mock cross-chain reasoning result',
          chains: ['polkadot', 'kusama'],
        },
      })),
  }),

  auth: router({
    me: publicProcedure.query(() => ({
      id: 'mock-user',
      openId: 'mock-github-id',
      name: 'Mock User',
      avatar: 'https://via.placeholder.com/100',
    })),
    
    logout: publicProcedure.mutation(() => ({ success: true })),
  }),

  contributor: router({
    me: publicProcedure.query(() => mockContributors[0]),
    
    getByGithubUsername: publicProcedure
      .input(githubUsernameSchema)
      .query(({ input }) => {
        const contributor = mockContributors.find(c => c.githubUsername === input.username);
        if (!contributor) {
          throw new Error(`Contributor with username "${input.username}" not found`);
        }
        return contributor;
      }),
    
    getAll: publicProcedure
      .input(limitSchema)
      .query(({ input }) => mockContributors.slice(0, input.limit || 100)),
    
    getStats: publicProcedure
      .input(contributorIdSchema)
      .query(({ input }) => {
        const contributor = getMockContributor(input.id);
        if (!contributor) {
          throw new Error(`Contributor with ID ${input.id} not found`);
        }
        return {
          contributorId: input.id,
          totalContributions: contributor.totalContributions,
          totalReputation: contributor.reputationScore,
          averageReputationPerContribution: Math.round(contributor.reputationScore / contributor.totalContributions),
          verified: contributor.verified,
        };
      }),
  }),

  contribution: router({
    list: publicProcedure
      .input(contributorIdWithLimitSchema)
      .query(({ input }) => getMockContributions(input.contributorId).slice(0, input.limit || 100)),
    
    getByContributor: publicProcedure
      .input(contributorIdWithLimitSchema)
      .query(({ input }) => getMockContributions(input.contributorId).slice(0, input.limit || 100)),
    
    getRecent: publicProcedure
      .input(limitSchema)
      .query(({ input }) => mockContributions.slice(0, input.limit || 100)),
  }),

  achievement: router({
    list: publicProcedure
      .input(contributorIdSchema)
      .query(({ input }) => getMockAchievements(input.id)),
    
    getByContributor: publicProcedure
      .input(contributorIdSchema)
      .query(({ input }) => getMockAchievements(input.id)),
  }),

  anchor: router({
    getRecent: publicProcedure
      .input(limitSchema)
      .query(({ input }) => getMockAnchors(input.limit || 10)),
    
    getTotal: publicProcedure.query(() => ({ total: 1234 })),
  }),

  polkadot: router({
    reputation: router({
      get: publicProcedure
        .input(z.object({ accountId: z.string() }))
        .query(({ input }) => getMockReputation(input.accountId)),
      
      getContributionCount: publicProcedure
        .input(z.object({ accountId: z.string() }))
        .query(({ input }) => {
          const contributor = mockContributors.find(c => c.walletAddress === input.accountId);
          return { count: contributor?.totalContributions || 0 };
        }),
      
      hasSufficient: publicProcedure
        .input(z.object({ accountId: z.string(), threshold: z.number() }))
        .query(({ input }) => {
          const rep = getMockReputation(input.accountId);
          return { hasSufficient: rep.overall >= input.threshold };
        }),

      preview: publicProcedure
        .input(z.object({ accountId: z.string() }))
        .query(({ input }) => {
          const rep = getMockReputation(input.accountId);
          let tier: "Novice" | "Contributor" | "Expert" | "Legend" = "Novice";
          if (rep.overall >= 1000) tier = "Legend";
          else if (rep.overall >= 500) tier = "Expert";
          else if (rep.overall >= 100) tier = "Contributor";

          return {
            score: rep.overall,
            tier,
            percentile: rep.percentile,
            breakdown: rep.breakdown,
            contributionCount: mockContributors.find(c => c.walletAddress === input.accountId)?.totalContributions || 0,
          };
        }),

      getMultiChain: publicProcedure
        .input(z.object({
          accountId: z.string(),
          chains: z.array(z.string()),
        }))
        .query(({ input }) => ({
          success: true,
          reputations: getMockMultiChainReputation(input.accountId, input.chains),
        })),

      getContextAware: publicProcedure
        .input(z.object({
          accountId: z.string(),
          dappType: z.enum(['defi', 'governance', 'nft', 'general']).optional(),
          highlightSkills: z.array(z.string()).optional(),
        }))
        .query(({ input }) => getMockContextAwareReputation(input.accountId, input.dappType)),
    }),

    xcm: router({
      initiateQuery: publicProcedure
        .input(z.object({
          signer: z.string(),
          targetChain: z.string(),
          targetAccount: z.string(),
        }))
        .mutation(() => ({
          queryId: `xcm-mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          txHash: `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        })),

      verifyCrossChain: publicProcedure
        .input(z.object({
          originChain: z.string(),
          targetAccount: z.string(),
        }))
        .query(({ input }) => ({
          chain: input.originChain,
          account: input.targetAccount,
          score: getMockReputation(input.targetAccount).overall,
          verified: true,
          timestamp: Date.now(),
        })),
    }),

    governance: router({
      getProposals: publicProcedure.query(() => getMockProposals()),
    }),

    nft: router({
      getByAccount: publicProcedure
        .input(z.object({ accountId: z.string() }))
        .query(({ input }) => getMockNFTs(input.accountId)),
    }),

    chain: router({
      getInfo: publicProcedure.query(() => getMockChainInfo()),
      
      getCurrentBlock: publicProcedure.query(() => ({ blockNumber: 1234567 })),
    }),
  }),

  cloud: router({
    verification: router({
      verify: publicProcedure
        .input(z.object({
          contributionId: z.string(),
          proof: z.string(),
          type: z.enum(['github', 'gitlab', 'direct']),
          metadata: z.record(z.string(), z.any()).optional(),
          timestamp: z.number().optional(),
        }))
        .mutation(({ input }) => ({
          success: true,
          verificationId: `verify-${Date.now()}`,
          status: 'verified',
        })),

      batchVerify: publicProcedure
        .input(z.object({
          verifications: z.array(z.object({
            contributionId: z.string(),
            proof: z.string(),
            type: z.enum(['github', 'gitlab', 'direct']),
            metadata: z.record(z.string(), z.any()).optional(),
            timestamp: z.number().optional(),
          })),
        }))
        .mutation(() => ({
          success: true,
          results: [],
        })),

      getStatus: publicProcedure
        .input(z.object({ contributionId: z.string() }))
        .query(({ input }) => getMockVerificationStatus(input.contributionId)),
    }),

    storage: router({
      storeProof: publicProcedure
        .input(z.object({
          contributionId: z.string(),
          proof: z.any(),
          metadata: z.record(z.any()).optional(),
        }))
        .mutation(() => ({
          success: true,
          cid: `Qm${Math.random().toString(36).substring(2, 15)}`,
          url: `https://ipfs.io/ipfs/Qm${Math.random().toString(36).substring(2, 15)}`,
        })),

      retrieveProof: publicProcedure
        .input(z.object({ cid: z.string() }))
        .query(() => ({
          success: true,
          proof: {},
        })),
    }),

    monitoring: router({
      trackEvent: publicProcedure
        .input(z.object({
          type: z.enum(['reputation_update', 'contribution_verified', 'governance_proposal', 'nft_minted']),
          userId: z.string(),
          score: z.number().optional(),
        }))
        .mutation(() => ({ success: true })),

      generateReport: publicProcedure
        .input(z.object({ userId: z.string() }))
        .query(() => ({
          success: true,
          report: {
            userId: 'mock-user',
            events: [],
            summary: {},
          },
        })),
    }),
  }),

  github: router({
    backfill: publicProcedure
      .input(z.object({
        githubUsername: z.string().min(1),
        monthsBack: z.number().min(1).max(24).optional().default(12),
      }))
      .mutation(() => ({
        success: true,
        processed: 42,
        contributions: [],
      })),

    webhookHealth: publicProcedure.query(() => ({
      ok: true,
      queue: {
        name: 'github-ingest',
        connected: true,
      },
    })),
  }),

  analytics: router({
    contributions: publicProcedure
      .input(z.object({
        actor: z.string().optional(),
        weeks: z.number().int().min(1).max(52).optional().default(12),
      }))
      .query(({ input }) => ({
        ok: true,
        actor: input.actor || null,
        weeks: input.weeks,
        data: getMockAnalyticsContributions(input.actor, input.weeks),
      })),

    mergedRatio: publicProcedure
      .input(z.object({ actor: z.string().optional() }))
      .query(() => ({
        ok: true,
        actor: null,
        data: { ratio: 0.75, merged: 30, total: 40 },
      })),

    anomalies: publicProcedure
      .input(z.object({ k: z.number().min(1).max(10).optional().default(3) }))
      .query(() => ({
        ok: true,
        flagged: [],
      })),

    score: publicProcedure
      .input(z.object({
        actor: z.string(),
        weights: z.object({
          quality: z.number().min(0).max(1).optional(),
          impact: z.number().min(0).max(1).optional(),
          consistency: z.number().min(0).max(1).optional(),
          community: z.number().min(0).max(1).optional(),
        }).optional(),
      }))
      .query(({ input }) => ({
        ok: true,
        actor: input.actor,
        score: 1250,
      })),

    explain: publicProcedure
      .input(z.object({
        actor: z.string(),
        limit: z.number().int().min(1).max(10).optional().default(3),
      }))
      .query(({ input }) => ({
        ok: true,
        actor: input.actor,
        score: 1250,
        evidence: [],
      })),
  }),

  metrics: router({
    getAll: publicProcedure.query(() => ({
      totalContributors: 100,
      totalContributions: 500,
      totalReputation: 50000,
      averageReputation: 500,
      verifiedContributors: 80,
    })),
    
    getSummary: publicProcedure.query(() => ({
      totalContributors: 100,
      totalContributions: 500,
      totalReputation: 50000,
      averageReputation: 500,
      verifiedContributors: 80,
      growthRate: 15.5,
      topContributors: [],
    })),
    
    getHistory: publicProcedure
      .input(z.object({ limit: z.number().int().min(1).max(1000).optional() }))
      .query(() => ({
        history: [],
        total: 0,
      })),
  }),

  communityNotes: router({
    publish: publicProcedure
      .input(z.object({
        targetUAL: z.string(),
        noteType: z.enum(['misinformation', 'correction', 'verification', 'other']),
        content: z.string(),
        author: z.string(),
        evidence: z.array(z.string()).optional(),
        reasoning: z.string().optional(),
      }))
      .mutation(() => ({
        success: true,
        noteId: `note-${Date.now()}`,
        ual: `ual:note:${Date.now()}`,
      })),

    getForTarget: publicProcedure
      .input(z.object({ targetUAL: z.string() }))
      .query(({ input }) => getMockCommunityNotes(input.targetUAL)),

    getStatistics: publicProcedure.query(() => ({
      totalNotes: 100,
      notesByType: {
        misinformation: 20,
        correction: 30,
        verification: 40,
        other: 10,
      },
      averageRating: 4.2,
    })),

    createAgentNote: publicProcedure
      .input(z.object({
        targetUAL: z.string(),
        claim: z.string(),
        correction: z.string(),
        evidence: z.array(z.string()).optional(),
        agentId: z.string().optional(),
      }))
      .mutation(() => ({
        success: true,
        noteId: `agent-note-${Date.now()}`,
        ual: `ual:agent-note:${Date.now()}`,
      })),
  }),

  trust: router({
    stake: publicProcedure
      .input(z.object({
        userDID: z.string(),
        amount: z.number(),
      }))
      .mutation(() => ({ success: true, txHash: `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}` })),

    unstake: publicProcedure
      .input(z.object({
        userDID: z.string(),
        amount: z.number(),
      }))
      .mutation(() => ({ success: true, txHash: `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}` })),

    getStake: publicProcedure
      .input(z.object({ userDID: z.string() }))
      .query(() => ({ amount: 1000, locked: true })),

    slash: publicProcedure
      .input(z.object({
        userDID: z.string(),
        amount: z.number(),
        reason: z.string(),
      }))
      .mutation(() => ({ success: true })),

    createPayment: publicProcedure
      .input(z.object({
        from: z.string(),
        to: z.string(),
        amount: z.number(),
        resource: z.string(),
        conditions: z.any().optional(),
      }))
      .mutation(() => ({
        success: true,
        payment: {
          paymentId: `payment-${Date.now()}`,
          status: 'pending',
        },
      })),

    completePayment: publicProcedure
      .input(z.object({
        paymentId: z.string(),
        verificationProof: z.string().optional(),
      }))
      .mutation(() => ({ success: true })),

    getPaymentStats: publicProcedure.query(() => ({
      totalPayments: 100,
      totalAmount: 10000,
      averageAmount: 100,
    })),

    createEscrow: publicProcedure
      .input(z.object({
        from: z.string(),
        to: z.string(),
        amount: z.number(),
        conditions: z.any(),
      }))
      .mutation(() => ({
        success: true,
        escrowId: `escrow-${Date.now()}`,
      })),

    releaseEscrow: publicProcedure
      .input(z.object({
        escrowId: z.string(),
        reason: z.string(),
      }))
      .mutation(() => ({ success: true })),

    getTrustReport: publicProcedure
      .input(z.object({ userDID: z.string() }))
      .query(({ input }) => ({
        ...getMockTrustScore(input),
        report: {
          factors: {},
          recommendations: [],
        },
      })),

    getTrustScore: publicProcedure
      .input(z.object({ userDID: z.string() }))
      .query(({ input }) => getMockTrustScore(input)),

    executeCampaign: publicProcedure
      .input(z.any())
      .mutation(() => ({ success: true, campaignId: `campaign-${Date.now()}` })),

    getTrustEnhancedRecommendations: publicProcedure
      .input(z.any())
      .query(() => ({ recommendations: [] })),

    verifyBrandForCampaign: publicProcedure
      .input(z.any())
      .mutation(() => ({ verified: true })),

    setupInfluencerEscrow: publicProcedure
      .input(z.any())
      .mutation(() => ({ success: true, escrowId: `escrow-${Date.now()}` })),

    enhanceInfluencerWithTrust: publicProcedure
      .input(z.any())
      .mutation(() => ({ success: true })),
  }),

  identity: router({
    createAccount: publicProcedure
      .input(z.any())
      .mutation(() => ({ success: true, accountId: `account-${Date.now()}` })),

    getIdentityTrustScore: publicProcedure
      .input(z.object({ accountId: z.string() }))
      .query(() => ({ score: 0.8, factors: {} })),
  }),
});

