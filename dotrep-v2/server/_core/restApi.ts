/**
 * REST API Router for DotRep
 * 
 * Provides RESTful HTTP endpoints that wrap tRPC functionality,
 * making the API accessible to external systems, AI agents, and non-TypeScript clients.
 * 
 * This follows REST best practices:
 * - Proper HTTP methods (GET, POST, PUT, DELETE)
 * - Standard status codes
 * - JSON request/response format
 * - OpenAPI/Swagger documentation support
 */

import { Router, Request, Response, NextFunction } from 'express';
import { appRouter } from '../routers';
import { createContext } from './context';
import { TRPCError } from '@trpc/server';
import { logError } from './errorHandler';
import { createDKGClientV8, type ReputationAsset } from '../../dkg-integration/dkg-client-v8';

const router = Router();

/**
 * Error handler middleware for REST API
 */
function handleError(error: unknown, req: Request, res: Response, next: NextFunction) {
  if (error instanceof TRPCError) {
    const statusCode = error.code === 'UNAUTHORIZED' ? 401 :
                      error.code === 'FORBIDDEN' ? 403 :
                      error.code === 'NOT_FOUND' ? 404 :
                      error.code === 'BAD_REQUEST' ? 400 :
                      error.code === 'TIMEOUT' ? 408 :
                      error.code === 'CONFLICT' ? 409 :
                      error.code === 'PRECONDITION_FAILED' ? 412 :
                      error.code === 'PAYLOAD_TOO_LARGE' ? 413 :
                      error.code === 'UNPROCESSABLE_CONTENT' ? 422 :
                      error.code === 'TOO_MANY_REQUESTS' ? 429 :
                      500;
    
    res.status(statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        cause: error.cause
      }
    });
  } else {
    logError(error, { path: req.path, method: req.method });
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }
    });
  }
}

/**
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'dotrep-api',
    version: process.env.npm_package_version || '1.0.0'
  });
});

/**
 * API information endpoint
 */
router.get('/api', (req: Request, res: Response) => {
  res.json({
    name: 'DotRep REST API',
    version: '1.0.0',
    description: 'RESTful API for DotRep decentralized reputation system',
    endpoints: {
      health: '/api/health',
      reputation: {
        publish: 'POST /api/v1/reputation',
        query: 'GET /api/v1/reputation/:ual',
        search: 'GET /api/v1/reputation/search',
        byDeveloper: 'GET /api/v1/reputation/developer/:developerId'
      },
      payment: {
        publish: 'POST /api/v1/payment-evidence',
        query: 'GET /api/v1/payment-evidence',
        byTxHash: 'GET /api/v1/payment-evidence/tx/:txHash'
      },
      trust: {
        stake: 'POST /api/v1/trust/stake',
        unstake: 'POST /api/v1/trust/unstake',
        getStake: 'GET /api/v1/trust/stake/:userDID',
        trustScore: 'GET /api/v1/trust/score/:userDID',
        trustReport: 'GET /api/v1/trust/report/:userDID'
      },
      polkadot: {
        reputation: 'GET /api/v1/polkadot/reputation/:accountId',
        chainInfo: 'GET /api/v1/polkadot/chain/info',
        proposals: 'GET /api/v1/polkadot/governance/proposals'
      },
      dkg: {
        nodeInfo: 'GET /api/v1/dkg/node/info',
        health: 'GET /api/v1/dkg/health',
        query: 'POST /api/v1/dkg/query'
      },
      contributors: {
        list: 'GET /api/v1/contributors',
        get: 'GET /api/v1/contributors/:id',
        byUsername: 'GET /api/v1/contributors/username/:username',
        stats: 'GET /api/v1/contributors/:id/stats'
      }
    },
    documentation: '/api/docs',
    openapi: '/api/openapi.json'
  });
});

// ============================================================================
// DKG Endpoints
// ============================================================================

/**
 * GET /api/v1/dkg/node/info
 * Get DKG node information
 */
router.get('/v1/dkg/node/info', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dkgClient = createDKGClientV8({
      useMockMode: process.env.DKG_USE_MOCK === 'true',
      fallbackToMock: true
    });
    
    const info = await dkgClient.getNodeInfo();
    res.json({ success: true, data: info });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/dkg/health
 * Check DKG connection health
 */
router.get('/v1/dkg/health', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dkgClient = createDKGClientV8({
      useMockMode: process.env.DKG_USE_MOCK === 'true',
      fallbackToMock: true
    });
    
    const isHealthy = await dkgClient.healthCheck();
    const status = dkgClient.getStatus();
    
    res.json({
      success: true,
      healthy: isHealthy,
      status: {
        initialized: status.initialized,
        environment: status.environment,
        endpoint: status.endpoint,
        mockMode: status.mockMode
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/dkg/query
 * Execute SPARQL query on DKG
 */
router.post('/v1/dkg/query', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query, queryType = 'SELECT', allowUpdates = false } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Query parameter is required and must be a string'
        }
      });
    }
    
    const dkgClient = createDKGClientV8({
      useMockMode: process.env.DKG_USE_MOCK === 'true',
      fallbackToMock: true
    });
    
    const results = await dkgClient.executeSafeQuery(
      query,
      queryType as 'SELECT' | 'ASK' | 'CONSTRUCT' | 'DESCRIBE',
      { allowUpdates }
    );
    
    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// Reputation Endpoints
// ============================================================================

/**
 * POST /api/v1/reputation
 * Publish a reputation asset to DKG
 */
router.post('/v1/reputation', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      developerId,
      reputationScore,
      contributions,
      timestamp,
      metadata,
      previousVersionUAL,
      epochs = 2,
      validateSchema = true,
      walletAddress,
      bypassTokenCheck = false
    } = req.body;
    
    // Validate required fields
    if (!developerId || typeof reputationScore !== 'number') {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'developerId and reputationScore are required'
        }
      });
    }
    
    const dkgClient = createDKGClientV8({
      useMockMode: process.env.DKG_USE_MOCK === 'true',
      fallbackToMock: true,
      enableTokenGating: process.env.DKG_ENABLE_TOKEN_GATING === 'true'
    });
    
    const reputationData: ReputationAsset = {
      developerId,
      reputationScore,
      contributions: contributions || [],
      timestamp: timestamp || Date.now(),
      metadata: metadata || {},
      previousVersionUAL
    };
    
    const result = await dkgClient.publishReputationAsset(
      reputationData,
      epochs,
      {
        validateSchema,
        walletAddress,
        bypassTokenCheck
      }
    );
    
    res.status(201).json({
      success: true,
      data: {
        ual: result.UAL,
        transactionHash: result.transactionHash,
        blockNumber: result.blockNumber,
        costEstimate: result.costEstimate ? {
          tracFee: result.costEstimate.tracFee.toString(),
          neuroGasFee: result.costEstimate.neuroGasFee.toString(),
          totalCostUSD: result.costEstimate.totalCostUSD
        } : undefined
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/reputation/:ual
 * Query reputation asset by UAL
 */
router.get('/v1/reputation/:ual', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ual } = req.params;
    
    if (!ual) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'UAL parameter is required'
        }
      });
    }
    
    const dkgClient = createDKGClientV8({
      useMockMode: process.env.DKG_USE_MOCK === 'true',
      fallbackToMock: true
    });
    
    const data = await dkgClient.queryReputation(ual);
    
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/reputation/search
 * Search reputation assets by developer ID
 */
router.get('/v1/reputation/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { developerId, limit = 10 } = req.query;
    
    if (!developerId || typeof developerId !== 'string') {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'developerId query parameter is required'
        }
      });
    }
    
    const dkgClient = createDKGClientV8({
      useMockMode: process.env.DKG_USE_MOCK === 'true',
      fallbackToMock: true
    });
    
    const results = await dkgClient.searchByDeveloper(developerId, {
      limit: parseInt(limit as string, 10)
    });
    
    res.json({ success: true, data: results, count: results.length });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/reputation/developer/:developerId
 * Get reputation for a specific developer
 */
router.get('/v1/reputation/developer/:developerId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { developerId } = req.params;
    const { limit = 10 } = req.query;
    
    const dkgClient = createDKGClientV8({
      useMockMode: process.env.DKG_USE_MOCK === 'true',
      fallbackToMock: true
    });
    
    const results = await dkgClient.searchByDeveloper(developerId, {
      limit: parseInt(limit as string, 10)
    });
    
    res.json({
      success: true,
      developerId,
      data: results,
      count: results.length
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// Payment Evidence Endpoints
// ============================================================================

/**
 * POST /api/v1/payment-evidence
 * Publish payment evidence to DKG
 */
router.post('/v1/payment-evidence', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      txHash,
      payer,
      recipient,
      amount,
      currency,
      chain,
      resourceUAL,
      challenge,
      facilitatorSig,
      signature,
      blockNumber,
      timestamp,
      epochs = 2,
      validateSchema = true
    } = req.body;
    
    // Validate required fields
    if (!txHash || !payer || !recipient || !amount || !currency || !chain) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'txHash, payer, recipient, amount, currency, and chain are required'
        }
      });
    }
    
    const dkgClient = createDKGClientV8({
      useMockMode: process.env.DKG_USE_MOCK === 'true',
      fallbackToMock: true
    });
    
    const result = await dkgClient.publishPaymentEvidence(
      {
        txHash,
        payer,
        recipient,
        amount: amount.toString(),
        currency,
        chain,
        resourceUAL,
        challenge,
        facilitatorSig,
        signature,
        blockNumber,
        timestamp
      },
      {
        epochs,
        validateSchema
      }
    );
    
    res.status(201).json({
      success: true,
      data: {
        ual: result.UAL,
        transactionHash: result.transactionHash,
        blockNumber: result.blockNumber,
        costEstimate: result.costEstimate ? {
          tracFee: result.costEstimate.tracFee.toString(),
          neuroGasFee: result.costEstimate.neuroGasFee.toString(),
          totalCostUSD: result.costEstimate.totalCostUSD
        } : undefined
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/payment-evidence
 * Query payment evidence with filters
 */
router.get('/v1/payment-evidence', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      payer,
      recipient,
      minAmount,
      chain,
      resourceUAL,
      limit = 100
    } = req.query;
    
    const dkgClient = createDKGClientV8({
      useMockMode: process.env.DKG_USE_MOCK === 'true',
      fallbackToMock: true
    });
    
    const results = await dkgClient.queryPaymentEvidence({
      payer: payer as string | undefined,
      recipient: recipient as string | undefined,
      minAmount: minAmount ? parseFloat(minAmount as string) : undefined,
      chain: chain as string | undefined,
      resourceUAL: resourceUAL as string | undefined,
      limit: parseInt(limit as string, 10)
    });
    
    res.json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// Trust Layer Endpoints
// ============================================================================

/**
 * POST /api/v1/trust/stake
 * Stake tokens for trust layer
 */
router.post('/v1/trust/stake', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = await createContext({ req, res });
    const caller = appRouter.createCaller(ctx);
    
    const { userDID, amount, targetTier } = req.body;
    
    if (!userDID || !amount) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'userDID and amount are required'
        }
      });
    }
    
    const result = await caller.trust.stake({
      userDID,
      amount: amount.toString(),
      targetTier
    });
    
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/trust/unstake
 * Unstake tokens
 */
router.post('/v1/trust/unstake', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = await createContext({ req, res });
    const caller = appRouter.createCaller(ctx);
    
    const { userDID, amount } = req.body;
    
    if (!userDID || !amount) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'userDID and amount are required'
        }
      });
    }
    
    const result = await caller.trust.unstake({
      userDID,
      amount: amount.toString()
    });
    
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/trust/stake/:userDID
 * Get stake information for a user
 */
router.get('/v1/trust/stake/:userDID', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = await createContext({ req, res });
    const caller = appRouter.createCaller(ctx);
    
    const { userDID } = req.params;
    
    const result = await caller.trust.getStake({ userDID });
    
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/trust/score/:userDID
 * Get trust score for a user
 */
router.get('/v1/trust/score/:userDID', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = await createContext({ req, res });
    const caller = appRouter.createCaller(ctx);
    
    const { userDID } = req.params;
    
    const result = await caller.trust.getTrustScore({ userDID });
    
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/trust/report/:userDID
 * Get comprehensive trust report for a user
 */
router.get('/v1/trust/report/:userDID', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = await createContext({ req, res });
    const caller = appRouter.createCaller(ctx);
    
    const { userDID } = req.params;
    
    const result = await caller.trust.getTrustReport({ userDID });
    
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// Polkadot Endpoints
// ============================================================================

/**
 * GET /api/v1/polkadot/reputation/:accountId
 * Get reputation from Polkadot chain
 */
router.get('/v1/polkadot/reputation/:accountId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = await createContext({ req, res });
    const caller = appRouter.createCaller(ctx);
    
    const { accountId } = req.params;
    
    const result = await caller.polkadot.reputation.get({ accountId });
    
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/polkadot/chain/info
 * Get chain information
 */
router.get('/v1/polkadot/chain/info', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = await createContext({ req, res });
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.polkadot.chain.getInfo();
    
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/polkadot/governance/proposals
 * Get governance proposals
 */
router.get('/v1/polkadot/governance/proposals', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = await createContext({ req, res });
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.polkadot.governance.getProposals();
    
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// Contributors Endpoints
// ============================================================================

/**
 * GET /api/v1/contributors
 * List all contributors
 */
router.get('/v1/contributors', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = await createContext({ req, res });
    const caller = appRouter.createCaller(ctx);
    
    const { limit } = req.query;
    
    const result = await caller.contributor.getAll({
      limit: limit ? parseInt(limit as string, 10) : undefined
    });
    
    res.json({ success: true, data: result, count: result.length });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/contributors/:id
 * Get contributor by ID
 */
router.get('/v1/contributors/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = await createContext({ req, res });
    const caller = appRouter.createCaller(ctx);
    
    // Note: tRPC router doesn't have getById, so we'll use getAll and filter
    // In production, you'd add a getById endpoint to the tRPC router
    const result = await caller.contributor.getAll({ limit: 1000 });
    const contributor = result.find(c => c.id === parseInt(req.params.id, 10));
    
    if (!contributor) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Contributor with ID ${req.params.id} not found`
        }
      });
    }
    
    res.json({ success: true, data: contributor });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/contributors/username/:username
 * Get contributor by GitHub username
 */
router.get('/v1/contributors/username/:username', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = await createContext({ req, res });
    const caller = appRouter.createCaller(ctx);
    
    const { username } = req.params;
    
    const result = await caller.contributor.getByGithubUsername({ username });
    
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/contributors/:id/stats
 * Get contributor statistics
 */
router.get('/v1/contributors/:id/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = await createContext({ req, res });
    const caller = appRouter.createCaller(ctx);
    
    const { id } = req.params;
    
    const result = await caller.contributor.getStats({
      id: parseInt(id, 10)
    });
    
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// Apply error handler
router.use(handleError);

export default router;

