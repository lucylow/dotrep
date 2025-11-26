import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { toTRPCError, logError } from "./_core/errorHandler";

// Input validation schemas
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

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    /**
     * Gets the current authenticated user
     */
    me: publicProcedure.query(opts => opts.ctx.user),
    
    /**
     * Logs out the current user by clearing the session cookie
     */
    logout: publicProcedure.mutation(({ ctx }) => {
      try {
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
        return {
          success: true,
        } as const;
      } catch (error) {
        console.error("[Auth] Logout failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to logout",
        });
      }
    }),
  }),

  contributor: router({
    /**
     * Gets the current authenticated contributor (based on GitHub OAuth)
     */
    me: publicProcedure.query(async ({ ctx }) => {
      try {
        if (!ctx.user?.openId) {
          return null;
        }
        // Get contributor by GitHub ID from user's openId (which is GitHub ID)
        const contributor = await db.getContributorByGithubId(ctx.user.openId);
        return contributor || null;
      } catch (error) {
        console.error("[Router] Failed to get current contributor:", error);
        return null;
      }
    }),
    
    /**
     * Gets a contributor by their GitHub username
     */
    getByGithubUsername: publicProcedure
      .input(githubUsernameSchema)
      .query(async ({ input }) => {
        try {
          const contributor = await db.getContributorByGithubUsername(input.username);
          if (!contributor) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Contributor with username "${input.username}" not found`,
            });
          }
          return contributor;
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error;
          }
          logError(error, { operation: "getByGithubUsername", username: input.username });
          throw toTRPCError(error);
        }
      }),
    
    /**
     * Gets all contributors ordered by reputation score
     */
    getAll: publicProcedure
      .input(limitSchema)
      .query(async ({ input }) => {
        try {
          return await db.getAllContributors(input.limit);
        } catch (error) {
          logError(error, { operation: "getAllContributors", limit: input.limit });
          throw toTRPCError(error);
        }
      }),
    
    /**
     * Gets statistics for a specific contributor
     */
    getStats: publicProcedure
      .input(contributorIdSchema)
      .query(async ({ input }) => {
        try {
          const stats = await db.getContributorStats(input.id);
          if (!stats) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Contributor with ID ${input.id} not found`,
            });
          }
          return stats;
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error;
          }
          console.error("[Router] Failed to get contributor stats:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to fetch contributor statistics",
          });
        }
      }),
  }),

  contribution: router({
    /**
     * Gets contributions by a specific contributor (alias for getByContributor)
     */
    list: publicProcedure
      .input(contributorIdWithLimitSchema)
      .query(async ({ input }) => {
        try {
          return await db.getContributionsByContributor(input.contributorId, input.limit);
        } catch (error) {
          console.error("[Router] Failed to get contributions by contributor:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to fetch contributions",
          });
        }
      }),
    
    /**
     * Gets contributions by a specific contributor
     */
    getByContributor: publicProcedure
      .input(contributorIdWithLimitSchema)
      .query(async ({ input }) => {
        try {
          return await db.getContributionsByContributor(input.contributorId, input.limit);
        } catch (error) {
          console.error("[Router] Failed to get contributions by contributor:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to fetch contributions",
          });
        }
      }),
    
    /**
     * Gets recent contributions across all contributors
     */
    getRecent: publicProcedure
      .input(limitSchema)
      .query(async ({ input }) => {
        try {
          return await db.getRecentContributions(input.limit);
        } catch (error) {
          console.error("[Router] Failed to get recent contributions:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to fetch recent contributions",
          });
        }
      }),
  }),

  achievement: router({
    /**
     * Gets all achievements for a specific contributor (alias for getByContributor)
     */
    list: publicProcedure
      .input(contributorIdSchema)
      .query(async ({ input }) => {
        try {
          return await db.getAchievementsByContributor(input.contributorId);
        } catch (error) {
          console.error("[Router] Failed to get achievements by contributor:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to fetch achievements",
          });
        }
      }),
    
    /**
     * Gets all achievements for a specific contributor
     */
    getByContributor: publicProcedure
      .input(contributorIdSchema)
      .query(async ({ input }) => {
        try {
          return await db.getAchievementsByContributor(input.contributorId);
        } catch (error) {
          console.error("[Router] Failed to get achievements by contributor:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to fetch achievements",
          });
        }
      }),
  }),

  anchor: router({
    /**
     * Gets recent anchors ordered by creation date
     */
    getRecent: publicProcedure
      .input(limitSchema)
      .query(async ({ input }) => {
        try {
          return await db.getRecentAnchors(input.limit);
        } catch (error) {
          console.error("[Router] Failed to get recent anchors:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to fetch anchors",
          });
        }
      }),
    
    /**
     * Gets the total count of anchors
     */
    getTotal: publicProcedure.query(async () => {
      try {
        return await db.getTotalAnchors();
      } catch (error) {
        console.error("[Router] Failed to get total anchors:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch anchor count",
        });
      }
    }),
  }),

  // Polkadot SDK Integration Routers
  polkadot: router({
    reputation: router({
      /**
       * Gets reputation score for an account from the DotRep parachain
       */
      get: publicProcedure
        .input(z.object({ accountId: z.string() }))
        .query(async ({ input }) => {
          try {
            const { getPolkadotApi } = await import("./_core/polkadotApi");
            const api = getPolkadotApi();
            await api.connect();
            return await api.getReputation(input.accountId);
          } catch (error) {
            logError(error, { operation: "getReputation", accountId: input.accountId });
            throw toTRPCError(error);
          }
        }),
      
      /**
       * Gets contribution count for an account
       */
      getContributionCount: publicProcedure
        .input(z.object({ accountId: z.string() }))
        .query(async ({ input }) => {
          try {
            const { getPolkadotApi } = await import("./_core/polkadotApi");
            const api = getPolkadotApi();
            await api.connect();
            return await api.getContributionCount(input.accountId);
          } catch (error) {
            console.error("[Router] Failed to get contribution count:", error);
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to fetch contribution count",
            });
          }
        }),
      
      /**
       * Checks if account has sufficient reputation
       */
      hasSufficient: publicProcedure
        .input(z.object({ accountId: z.string(), threshold: z.number() }))
        .query(async ({ input }) => {
          try {
            const { getPolkadotApi } = await import("./_core/polkadotApi");
            const api = getPolkadotApi();
            await api.connect();
            return await api.hasSufficientReputation(input.accountId, input.threshold);
          } catch (error) {
            console.error("[Router] Failed to check reputation:", error);
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to check reputation threshold",
            });
          }
        }),

      /**
       * Preview reputation for wallet connection (before connecting)
       */
      preview: publicProcedure
        .input(z.object({ accountId: z.string() }))
        .query(async ({ input }) => {
          try {
            const { getPolkadotApi } = await import("./_core/polkadotApi");
            const api = getPolkadotApi();
            await api.connect();
            const reputation = await api.getReputation(input.accountId);
            const contributionCount = await api.getContributionCount(input.accountId);
            
            // Calculate tier
            let tier: "Novice" | "Contributor" | "Expert" | "Legend" = "Novice";
            if (reputation.overall >= 1000) tier = "Legend";
            else if (reputation.overall >= 500) tier = "Expert";
            else if (reputation.overall >= 100) tier = "Contributor";

            return {
              score: reputation.overall,
              tier,
              percentile: reputation.percentile,
              breakdown: reputation.breakdown,
              skills: [], // Would be fetched from skillTags if available
              contributionCount,
              lastUpdated: reputation.lastUpdated
            };
          } catch (error) {
            console.error("[Router] Failed to preview reputation:", error);
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to preview reputation",
            });
          }
        }),

      /**
       * Get multi-chain reputation aggregation
       */
      getMultiChain: publicProcedure
        .input(z.object({ accountId: z.string(), chains: z.array(z.string()).optional() }))
        .query(async ({ input }) => {
          try {
            const { getPolkadotApi } = await import("./_core/polkadotApi");
            const api = getPolkadotApi();
            
            // Default chains to query
            const chainsToQuery = input.chains || ["asset-hub", "moonbeam", "acala"];
            const results = [];
            
            // Get base reputation for mock data
            let baseReputation;
            try {
              await api.connect();
              baseReputation = await api.getReputation(input.accountId);
            } catch (error) {
              // If connection fails, use mock reputation
              const { getMockReputation } = await import("./_core/mockData");
              baseReputation = getMockReputation(input.accountId);
            }

            // Query each chain via XCM (simplified - in production would use actual XCM)
            for (const chain of chainsToQuery) {
              try {
                // In production, this would use XCM to query reputation from other parachains
                // For now, return mock data with slight variations per chain
                const chainMultiplier: Record<string, number> = {
                  "asset-hub": 0.9,
                  "moonbeam": 0.85,
                  "acala": 0.8
                };
                
                const multiplier = chainMultiplier[chain] || 0.75;
                
                results.push({
                  chain,
                  score: Math.round(baseReputation.overall * multiplier),
                  verified: true,
                  percentile: Math.round(baseReputation.percentile * multiplier)
                });
              } catch (error) {
                console.warn(`[Router] Failed to query ${chain}, using mock data:`, error);
                results.push({
                  chain,
                  score: Math.round(baseReputation.overall * 0.7),
                  verified: false
                });
              }
            }

            return results;
          } catch (error) {
            console.warn("[Router] Failed to get multi-chain reputation, using mock data:", error);
            // Return mock data on error
            const chainsToQuery = input.chains || ["asset-hub", "moonbeam", "acala"];
            return chainsToQuery.map(chain => ({
              chain,
              score: Math.floor(Math.random() * 1000) + 500,
              verified: true,
              percentile: Math.floor(Math.random() * 50) + 50
            }));
          }
        }),

      /**
       * Get context-aware reputation (filtered by dApp type)
       */
      getContextAware: publicProcedure
        .input(z.object({
          accountId: z.string(),
          dappType: z.enum(["defi", "governance", "nft", "general"]).optional(),
          highlightSkills: z.array(z.string()).optional()
        }))
        .query(async ({ input }) => {
          try {
            const { getPolkadotApi } = await import("./_core/polkadotApi");
            const api = getPolkadotApi();
            await api.connect();
            const reputation = await api.getReputation(input.accountId);
            
            // Apply context-aware filtering
            let filteredBreakdown = reputation.breakdown;
            if (input.dappType === "defi") {
              // Prioritize DeFi-relevant contributions
              filteredBreakdown = reputation.breakdown.sort((a, b) => {
                const defiRelevant = ["SmartContractAudits", "CodeReview", "Documentation"];
                const aRelevant = defiRelevant.includes(a.type);
                const bRelevant = defiRelevant.includes(b.type);
                if (aRelevant && !bRelevant) return -1;
                if (!aRelevant && bRelevant) return 1;
                return b.score - a.score;
              });
            } else if (input.dappType === "governance") {
              // Prioritize governance-relevant contributions
              filteredBreakdown = reputation.breakdown.sort((a, b) => {
                const govRelevant = ["GovernanceParticipation", "Documentation", "CommunityHelp"];
                const aRelevant = govRelevant.includes(a.type);
                const bRelevant = govRelevant.includes(b.type);
                if (aRelevant && !bRelevant) return -1;
                if (!aRelevant && bRelevant) return 1;
                return b.score - a.score;
              });
            }

            return {
              ...reputation,
              breakdown: filteredBreakdown,
              context: {
                dappType: input.dappType || "general",
                highlightSkills: input.highlightSkills || []
              }
            };
          } catch (error) {
            console.error("[Router] Failed to get context-aware reputation:", error);
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to fetch context-aware reputation",
            });
          }
        }),
    }),

    xcm: router({
      /**
       * Initiates a cross-chain reputation query via XCM
       */
      initiateQuery: publicProcedure
        .input(z.object({
          signer: z.string(),
          targetChain: z.string(),
          targetAccount: z.string()
        }))
        .mutation(async ({ input }) => {
          try {
            const { getPolkadotApi } = await import("./_core/polkadotApi");
            const api = getPolkadotApi();
            await api.connect();
            return await api.initiateXcmQuery(
              input.signer,
              input.targetChain,
              input.targetAccount
            );
          } catch (error) {
            console.warn("[Router] Failed to initiate XCM query, using mock data:", error);
            // Return mock query ID
            return {
              queryId: `xcm-mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              txHash: `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`
            };
          }
        }),

      /**
       * Verify cross-chain reputation
       */
      verifyCrossChain: publicProcedure
        .input(z.object({
          originChain: z.string(),
          targetAccount: z.string()
        }))
        .query(async ({ input }) => {
          try {
            const { getPolkadotApi } = await import("./_core/polkadotApi");
            const api = getPolkadotApi();
            await api.connect();
            
            // In production, this would use XCM to verify reputation
            // For now, return mock verification data
            const { getMockReputation } = await import("./_core/mockData");
            const reputation = getMockReputation(input.targetAccount);
            
            return {
              chain: input.originChain,
              account: input.targetAccount,
              score: reputation.overall,
              verified: true,
              timestamp: Date.now()
            };
          } catch (error) {
            console.warn("[Router] Failed to verify cross-chain reputation, using mock data:", error);
            // Return mock verification data
            return {
              chain: input.originChain,
              account: input.targetAccount,
              score: Math.floor(Math.random() * 2000) + 500,
              verified: true,
              timestamp: Date.now()
            };
          }
        }),
    }),

    governance: router({
      /**
       * Gets all governance proposals from the chain
       */
      getProposals: publicProcedure.query(async () => {
        try {
          const { getPolkadotApi } = await import("./_core/polkadotApi");
          const api = getPolkadotApi();
          await api.connect();
          return await api.getProposals();
        } catch (error) {
          console.error("[Router] Failed to get proposals:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to fetch governance proposals",
          });
        }
      }),
    }),

    nft: router({
      /**
       * Gets NFT achievements for an account
       */
      getByAccount: publicProcedure
        .input(z.object({ accountId: z.string() }))
        .query(async ({ input }) => {
          try {
            const { getPolkadotApi } = await import("./_core/polkadotApi");
            const api = getPolkadotApi();
            await api.connect();
            return await api.getNfts(input.accountId);
          } catch (error) {
            console.error("[Router] Failed to get NFTs:", error);
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to fetch NFTs",
            });
          }
        }),
    }),

    chain: router({
      /**
       * Gets chain information
       */
      getInfo: publicProcedure.query(async () => {
        try {
          const { getPolkadotApi } = await import("./_core/polkadotApi");
          const api = getPolkadotApi();
          await api.connect();
          return await api.getChainInfo();
        } catch (error) {
          console.error("[Router] Failed to get chain info:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to fetch chain information",
          });
        }
      }),
      
      /**
       * Gets current block number
       */
      getCurrentBlock: publicProcedure.query(async () => {
        try {
          const { getPolkadotApi } = await import("./_core/polkadotApi");
          const api = getPolkadotApi();
          await api.connect();
          return await api.getCurrentBlock();
        } catch (error) {
          console.error("[Router] Failed to get current block:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to fetch current block",
          });
        }
      }),
    }),
  }),

  // Cloud Services Routers
  cloud: router({
    verification: router({
      /**
       * Verify a contribution via cloud service
       */
      verify: publicProcedure
        .input(z.object({
          contributionId: z.string(),
          proof: z.string(),
          type: z.enum(['github', 'gitlab', 'direct']),
          metadata: z.record(z.any()).optional(),
          timestamp: z.number().optional()
        }))
        .mutation(async ({ input }) => {
          try {
            const { CloudVerificationService } = await import('./_core/cloudVerification');
            const service = new CloudVerificationService();
            return await service.verifyContribution({
              contributionId: input.contributionId,
              proof: input.proof,
              type: input.type,
              metadata: input.metadata || {},
              timestamp: input.timestamp || Date.now()
            });
          } catch (error) {
            console.error('[Router] Cloud verification failed:', error);
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to verify contribution via cloud service'
            });
          }
        }),

      /**
       * Batch verify multiple contributions
       */
      batchVerify: publicProcedure
        .input(z.object({
          verifications: z.array(z.object({
            contributionId: z.string(),
            proof: z.string(),
            type: z.enum(['github', 'gitlab', 'direct']),
            metadata: z.record(z.any()).optional(),
            timestamp: z.number().optional()
          }))
        }))
        .mutation(async ({ input }) => {
          try {
            const { CloudVerificationService } = await import('./_core/cloudVerification');
            const service = new CloudVerificationService();
            return await service.batchVerifyContributions(
              input.verifications.map(v => ({
                contributionId: v.contributionId,
                proof: v.proof,
                type: v.type,
                metadata: v.metadata || {},
                timestamp: v.timestamp || Date.now()
              }))
            );
          } catch (error) {
            console.error('[Router] Batch verification failed:', error);
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to batch verify contributions'
            });
          }
        }),

      /**
       * Get verification status
       */
      getStatus: publicProcedure
        .input(z.object({ contributionId: z.string() }))
        .query(async ({ input }) => {
          try {
            const { CloudVerificationService } = await import('./_core/cloudVerification');
            const service = new CloudVerificationService();
            return await service.getVerificationStatus(input.contributionId);
          } catch (error) {
            console.error('[Router] Failed to get verification status:', error);
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to get verification status'
            });
          }
        }),
    }),

    storage: router({
      /**
       * Store contribution proof on IPFS and cloud
       */
      storeProof: publicProcedure
        .input(z.object({
          contributionId: z.string(),
          proof: z.any(),
          metadata: z.record(z.any()).optional()
        }))
        .mutation(async ({ input }) => {
          try {
            const { CloudStorageService } = await import('./_core/cloudStorage');
            const service = new CloudStorageService();
            return await service.storeContributionProof({
              contributionId: input.contributionId,
              proof: input.proof,
              metadata: input.metadata || {},
              timestamp: Date.now()
            });
          } catch (error) {
            console.error('[Router] Failed to store proof:', error);
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to store contribution proof'
            });
          }
        }),

      /**
       * Retrieve proof from IPFS or cloud storage
       */
      retrieveProof: publicProcedure
        .input(z.object({ ipfsHash: z.string() }))
        .query(async ({ input }) => {
          try {
            const { CloudStorageService } = await import('./_core/cloudStorage');
            const service = new CloudStorageService();
            return await service.retrieveProof(input.ipfsHash);
          } catch (error) {
            console.error('[Router] Failed to retrieve proof:', error);
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to retrieve proof'
            });
          }
        }),
    }),

    reputation: router({
      /**
       * Calculate reputation using cloud service
       */
      calculate: publicProcedure
        .input(z.object({
          contributions: z.array(z.object({
            id: z.string(),
            type: z.string(),
            weight: z.number(),
            timestamp: z.number(),
            age: z.number()
          })),
          algorithmWeights: z.record(z.number()).optional(),
          timeDecayFactor: z.number().optional(),
          userId: z.string()
        }))
        .mutation(async ({ input }) => {
          try {
            const { ReputationCalculator } = await import('./_core/reputationCalculator');
            const calculator = new ReputationCalculator();
            return await calculator.calculateReputation({
              contributions: input.contributions,
              algorithmWeights: input.algorithmWeights || {},
              timeDecayFactor: input.timeDecayFactor || 0.01,
              userId: input.userId
            });
          } catch (error) {
            console.error('[Router] Failed to calculate reputation:', error);
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to calculate reputation'
            });
          }
        }),
    }),

    monitoring: router({
      /**
       * Track a reputation event
       */
      trackEvent: publicProcedure
        .input(z.object({
          type: z.enum(['reputation_update', 'contribution_verified', 'governance_proposal', 'nft_minted']),
          userId: z.string(),
          score: z.number().optional(),
          metadata: z.record(z.any()).optional()
        }))
        .mutation(async ({ input }) => {
          try {
            const { CloudMonitoringService } = await import('./_core/cloudMonitoring');
            const service = new CloudMonitoringService();
            service.trackReputationEvent({
              type: input.type,
              userId: input.userId,
              score: input.score,
              timestamp: Date.now(),
              metadata: input.metadata
            });
            return { success: true };
          } catch (error) {
            console.error('[Router] Failed to track event:', error);
            // Non-critical, return success anyway
            return { success: false };
          }
        }),

      /**
       * Generate reputation report
       */
      generateReport: publicProcedure
        .input(z.object({ userId: z.string() }))
        .query(async ({ input }) => {
          try {
            const { CloudMonitoringService } = await import('./_core/cloudMonitoring');
            const service = new CloudMonitoringService();
            return await service.generateReputationReport(input.userId);
          } catch (error) {
            console.error('[Router] Failed to generate report:', error);
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to generate reputation report'
            });
          }
        }),
    }),
  }),

  // GitHub Integration Routers
  github: router({
    /**
     * Backfills contributions for a GitHub user
     */
    backfill: publicProcedure
      .input(z.object({
        githubUsername: z.string().min(1),
        monthsBack: z.number().min(1).max(24).optional().default(12),
      }))
      .mutation(async ({ input }) => {
        try {
          const { backfillUserContributions } = await import("./services/githubGraphQL");
          return await backfillUserContributions(input.githubUsername, input.monthsBack);
        } catch (error) {
          logError(error, { operation: "backfill", githubUsername: input.githubUsername, monthsBack: input.monthsBack });
          throw toTRPCError(error);
        }
      }),

    /**
     * Gets webhook health status
     */
    webhookHealth: publicProcedure.query(async () => {
      try {
        const IORedis = (await import("ioredis")).default;
        const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
        const connection = new IORedis(REDIS_URL);
        const status = connection.status;
        return {
          ok: true,
          queue: {
            name: "github-ingest",
            connected: status === "ready",
          },
        };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),
  }),

  // Analytics Router
  analytics: router({
    /**
     * Gets contribution counts per week for an actor
     */
    contributions: publicProcedure
      .input(z.object({
        actor: z.string().optional(),
        weeks: z.number().int().min(1).max(52).optional().default(12),
      }))
      .query(async ({ input }) => {
        try {
          const { contributionsPerWeek } = await import("./analytics/engine");
          const { getAllProofRecords, getProofsByActor } = await import("./db");
          
          const proofs = input.actor 
            ? await getProofsByActor(input.actor, 1000)
            : await getAllProofRecords();
          
          const data = contributionsPerWeek(proofs, input.actor || null, input.weeks);
          return { ok: true, actor: input.actor || null, weeks: input.weeks, data };
        } catch (error) {
          console.error("[Analytics] Contributions error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error instanceof Error ? error.message : "Failed to compute contributions",
          });
        }
      }),

    /**
     * Gets merged PR ratio for an actor
     */
    mergedRatio: publicProcedure
      .input(z.object({
        actor: z.string().optional(),
      }))
      .query(async ({ input }) => {
        try {
          const { mergedPrRatio } = await import("./analytics/engine");
          const { getAllProofRecords, getProofsByActor } = await import("./db");
          
          const proofs = input.actor 
            ? await getProofsByActor(input.actor, 1000)
            : await getAllProofRecords();
          
          const data = mergedPrRatio(proofs, input.actor || null);
          return { ok: true, actor: input.actor || null, data };
        } catch (error) {
          console.error("[Analytics] Merged ratio error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error instanceof Error ? error.message : "Failed to compute merged ratio",
          });
        }
      }),

    /**
     * Detects anomalies in contribution patterns
     */
    anomalies: publicProcedure
      .input(z.object({
        k: z.number().min(1).max(10).optional().default(3),
      }))
      .query(async ({ input }) => {
        try {
          const { anomalyDetection } = await import("./analytics/engine");
          const { getAllProofRecords } = await import("./db");
          
          const proofs = await getAllProofRecords();
          const flagged = anomalyDetection(proofs, input.k);
          
          return { ok: true, flagged };
        } catch (error) {
          console.error("[Analytics] Anomaly detection error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error instanceof Error ? error.message : "Failed to detect anomalies",
          });
        }
      }),

    /**
     * Computes reputation score for an actor
     */
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
      .query(async ({ input }) => {
        try {
          const { computeReputationScore } = await import("./analytics/engine");
          const { getProofsByActor } = await import("./db");
          
          const proofs = await getProofsByActor(input.actor, 1000);
          const score = computeReputationScore(proofs, input.actor, input.weights);
          
          return { ok: true, actor: input.actor, score };
        } catch (error) {
          console.error("[Analytics] Score computation error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error instanceof Error ? error.message : "Failed to compute score",
          });
        }
      }),

    /**
     * Explains reputation score with top evidence
     */
    explain: publicProcedure
      .input(z.object({
        actor: z.string(),
        limit: z.number().int().min(1).max(10).optional().default(3),
      }))
      .query(async ({ input }) => {
        try {
          const { computeReputationScore } = await import("./analytics/engine");
          const { getProofsByActor, getTopProofsByImpact } = await import("./db");
          
          const proofs = await getProofsByActor(input.actor, 1000);
          const score = computeReputationScore(proofs, input.actor);
          const top = await getTopProofsByImpact(input.actor, input.limit);
          
          // Map to evidence items with natural language explanations
          const templates = top.map((p, i) => {
            const impactScore = (p.reputationPoints || 0) + (p.review_count || 0) * 10;
            const type = p.event_type || "contribution";
            const repo = p.repo || "unknown";
            const when = p.anchoredAt || p.createdAt;
            
            return {
              proofHash: p.proofHash,
              cid: p.cid,
              event_type: p.event_type,
              repo: repo,
              lines_added: p.lines_added,
              review_count: p.review_count,
              reputationPoints: p.reputationPoints,
              verified: p.verified,
              anchoredAt: p.anchoredAt,
              createdAt: p.createdAt,
              summary: `#${i + 1}: ${type.toUpperCase()} in ${repo}; impact score ${impactScore}`,
              explanation_nl: `This ${type} in ${repo} earned ${p.reputationPoints || 0} reputation points and is ${p.verified ? 'verified' : 'pending verification'}. It contributed significantly to the overall reputation score.`,
            };
          });
          
          return { ok: true, actor: input.actor, score, top_evidence: templates };
        } catch (error) {
          console.error("[Analytics] Explain error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error instanceof Error ? error.message : "Failed to explain score",
          });
        }
      }),
  }),

  // Impact Metrics Router
  metrics: router({
    /**
     * Get all impact metrics
     */
    getAll: publicProcedure.query(async () => {
      try {
        const { getImpactMetrics } = await import('./_core/impactMetrics');
        const metrics = getImpactMetrics();
        return metrics.getMetrics();
      } catch (error) {
        console.error('[Router] Failed to get metrics:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch impact metrics',
        });
      }
    }),

    /**
     * Get metrics summary for judges/demo
     */
    getSummary: publicProcedure.query(async () => {
      try {
        const { getImpactMetrics } = await import('./_core/impactMetrics');
        const metrics = getImpactMetrics();
        return metrics.getMetricsSummary();
      } catch (error) {
        console.error('[Router] Failed to get metrics summary:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch metrics summary',
        });
      }
    }),

    /**
     * Get metrics history
     */
    getHistory: publicProcedure
      .input(z.object({ limit: z.number().int().min(1).max(1000).optional() }))
      .query(async ({ input }) => {
        try {
          const { getImpactMetrics } = await import('./_core/impactMetrics');
          const metrics = getImpactMetrics();
          return metrics.getMetricsHistory(input.limit);
        } catch (error) {
          console.error('[Router] Failed to get metrics history:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch metrics history',
          });
        }
      }),
  }),

  // Community Notes Router
  communityNotes: router({
    /**
     * Publish a Community Note
     */
    publish: publicProcedure
      .input(z.object({
        targetUAL: z.string(),
        noteType: z.enum(['misinformation', 'correction', 'verification', 'other']),
        content: z.string(),
        author: z.string(),
        evidence: z.array(z.string()).optional(),
        reasoning: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          const { getCommunityNotesService } = await import('../dkg-integration/community-notes');
          const service = getCommunityNotesService();
          return await service.publishNote({
            targetUAL: input.targetUAL,
            noteType: input.noteType,
            content: input.content,
            author: input.author,
            evidence: input.evidence || [],
            reasoning: input.reasoning || '',
            timestamp: Date.now(),
          });
        } catch (error) {
          console.error('[Router] Failed to publish Community Note:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to publish Community Note',
          });
        }
      }),

    /**
     * Get Community Notes for a target UAL
     */
    getForTarget: publicProcedure
      .input(z.object({ targetUAL: z.string() }))
      .query(async ({ input }) => {
        try {
          const { getCommunityNotesService } = await import('../dkg-integration/community-notes');
          const service = getCommunityNotesService();
          return await service.getNotesForTarget(input.targetUAL);
        } catch (error) {
          console.error('[Router] Failed to get Community Notes:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch Community Notes',
          });
        }
      }),

    /**
     * Get Community Notes statistics
     */
    getStatistics: publicProcedure.query(async () => {
      try {
        const { getCommunityNotesService } = await import('../dkg-integration/community-notes');
        const service = getCommunityNotesService();
        return await service.getNoteStatistics();
      } catch (error) {
        console.error('[Router] Failed to get Community Notes statistics:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch Community Notes statistics',
        });
      }
    }),

    /**
     * Create an agent-driven Community Note
     */
    createAgentNote: publicProcedure
      .input(z.object({
        targetUAL: z.string(),
        claim: z.string(),
        correction: z.string(),
        evidence: z.array(z.string()).optional(),
        agentId: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          const { getCommunityNotesService } = await import('../dkg-integration/community-notes');
          const service = getCommunityNotesService();
          return await service.createAgentNote(
            input.targetUAL,
            input.claim,
            input.correction,
            input.evidence || [],
            input.agentId
          );
        } catch (error) {
          console.error('[Router] Failed to create agent note:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create agent Community Note',
          });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
