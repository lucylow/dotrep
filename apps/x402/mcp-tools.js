/**
 * MCP (Model Context Protocol) Tools for x402 Payment Gateway
 * Enables AI agents to interact with x402-protected resources
 * 
 * Based on @mfloai/x402-mcp pattern
 */

const axios = require('axios');

const X402_GATEWAY_URL = process.env.X402_GATEWAY_URL || 'http://localhost:4000';
const FACILITATOR_URL = process.env.FACILITATOR_URL || 'https://facil.example/pay';

/**
 * MCP Tool: List available datasets/resources
 */
async function listDatasets(filters = {}) {
  try {
    // Get available resources from marketplace
    const response = await axios.get(`${X402_GATEWAY_URL}/api/marketplace/discover`, {
      params: filters,
      validateStatus: (status) => status === 200 || status === 402
    });

    if (response.status === 402) {
      return {
        error: 'Payment Required',
        message: 'Discovery is free, but payment may be required for details',
        paymentRequest: response.data.paymentRequest
      };
    }

    return {
      datasets: response.data.products || [],
      total: response.data.totalFound || 0,
      filters: response.data.filters
    };
  } catch (error) {
    return {
      error: 'Failed to list datasets',
      message: error.message
    };
  }
}

/**
 * MCP Tool: Request dataset access (triggers x402 payment flow)
 */
async function requestDatasetAccess(datasetUAL, payerAddress, useFacilitator = true) {
  try {
    // Step 1: Request resource (will get 402)
    const response = await axios.get(`${X402_GATEWAY_URL}/api/marketplace/discover`, {
      params: { ual: datasetUAL },
      validateStatus: (status) => status === 200 || status === 402
    });

    if (response.status !== 402) {
      // Resource is free or already accessible
      return {
        accessible: true,
        data: response.data
      };
    }

    const paymentRequest = response.data.paymentRequest;
    
    // Step 2: Process payment (simplified - in production, use facilitator SDK)
    let paymentResult;
    if (useFacilitator) {
      paymentResult = await payViaFacilitator(paymentRequest, payerAddress);
    } else {
      paymentResult = await payOnChain(paymentRequest, payerAddress);
    }

    // Step 3: Construct payment proof
    const paymentProof = {
      txHash: paymentResult.txHash,
      chain: paymentResult.chain,
      payer: payerAddress,
      amount: paymentRequest.amount,
      currency: paymentRequest.currency,
      recipient: paymentRequest.recipient,
      challenge: paymentRequest.challenge,
      signature: `0x${Buffer.from('signed-payload').toString('hex')}`, // In production, sign properly
      facilitatorSig: paymentResult.facilitatorSig || null
    };

    // Step 4: Retry request with X-PAYMENT header
    const finalResponse = await axios.post(
      `${X402_GATEWAY_URL}/api/marketplace/purchase`,
      {
        productUAL: datasetUAL,
        buyer: payerAddress,
        paymentMethod: 'x402'
      },
      {
        headers: {
          'X-PAYMENT': JSON.stringify(paymentProof)
        }
      }
    );

    return {
      accessible: true,
      purchaseId: finalResponse.data.purchaseId,
      dataAccess: finalResponse.data.dataAccess,
      paymentEvidence: finalResponse.data.paymentEvidence
    };
  } catch (error) {
    if (error.response && error.response.status === 402) {
      return {
        accessible: false,
        error: 'Payment Required',
        paymentRequest: error.response.data.paymentRequest
      };
    }
    return {
      accessible: false,
      error: 'Failed to request dataset access',
      message: error.message
    };
  }
}

/**
 * MCP Tool: Query verified information
 */
async function queryVerifiedInfo(query, payerAddress, minSourceReputation = 0.8) {
  try {
    // Step 1: Request verified info (will get 402)
    const response = await axios.post(
      `${X402_GATEWAY_URL}/api/verified-info`,
      { query, sourceReputation: minSourceReputation },
      {
        validateStatus: (status) => status === 200 || status === 402
      }
    );

    if (response.status !== 402) {
      return response.data;
    }

    const paymentRequest = response.data.paymentRequest;
    
    // Step 2: Process payment
    const paymentResult = await payViaFacilitator(paymentRequest, payerAddress);

    // Step 3: Construct payment proof
    const paymentProof = {
      txHash: paymentResult.txHash,
      chain: paymentResult.chain,
      payer: payerAddress,
      amount: paymentRequest.amount,
      currency: paymentRequest.currency,
      recipient: paymentRequest.recipient,
      challenge: paymentRequest.challenge,
      signature: `0x${Buffer.from('signed-payload').toString('hex')}`,
      facilitatorSig: paymentResult.facilitatorSig || null
    };

    // Step 4: Retry with payment
    const finalResponse = await axios.post(
      `${X402_GATEWAY_URL}/api/verified-info`,
      { query, sourceReputation: minSourceReputation },
      {
        headers: {
          'X-PAYMENT': JSON.stringify(paymentProof)
        }
      }
    );

    return finalResponse.data;
  } catch (error) {
    return {
      error: 'Failed to query verified info',
      message: error.message
    };
  }
}

/**
 * MCP Tool: Get top reputable users
 */
async function getTopReputableUsers(category = 'all', limit = 10, payerAddress) {
  try {
    // Step 1: Request top users (will get 402)
    const response = await axios.get(
      `${X402_GATEWAY_URL}/api/top-reputable-users`,
      {
        params: { category, limit },
        validateStatus: (status) => status === 200 || status === 402
      }
    );

    if (response.status !== 402) {
      return response.data;
    }

    if (!payerAddress) {
      return {
        error: 'Payment Required',
        paymentRequest: response.data.paymentRequest,
        message: 'Payer address required for payment'
      };
    }

    const paymentRequest = response.data.paymentRequest;
    
    // Step 2: Process payment
    const paymentResult = await payViaFacilitator(paymentRequest, payerAddress);

    // Step 3: Construct payment proof
    const paymentProof = {
      txHash: paymentResult.txHash,
      chain: paymentResult.chain,
      payer: payerAddress,
      amount: paymentRequest.amount,
      currency: paymentRequest.currency,
      recipient: paymentRequest.recipient,
      challenge: paymentRequest.challenge,
      signature: `0x${Buffer.from('signed-payload').toString('hex')}`,
      facilitatorSig: paymentResult.facilitatorSig || null
    };

    // Step 4: Retry with payment
    const finalResponse = await axios.get(
      `${X402_GATEWAY_URL}/api/top-reputable-users`,
      {
        params: { category, limit },
        headers: {
          'X-PAYMENT': JSON.stringify(paymentProof)
        }
      }
    );

    return finalResponse.data;
  } catch (error) {
    return {
      error: 'Failed to get top reputable users',
      message: error.message
    };
  }
}

/**
 * Helper: Pay via facilitator
 */
async function payViaFacilitator(paymentRequest, payerAddress) {
  // In production, use facilitator SDK
  const mockTxHash = `0x${Buffer.from(`${Date.now()}-${Math.random()}`).toString('hex')}`;
  
  return {
    txHash: mockTxHash,
    chain: paymentRequest.chains[0],
    facilitatorSig: `0x${Buffer.from('facilitator-sig').toString('hex')}`,
    blockNumber: '12345',
    verified: true
  };
}

/**
 * Helper: Pay on-chain
 */
async function payOnChain(paymentRequest, payerAddress) {
  const mockTxHash = `0x${Buffer.from(`${Date.now()}-${Math.random()}`).toString('hex')}`;
  
  return {
    txHash: mockTxHash,
    chain: paymentRequest.chains[0],
    blockNumber: 'pending'
  };
}

/**
 * MCP Tools Export
 */
module.exports = {
  listDatasets,
  requestDatasetAccess,
  queryVerifiedInfo,
  getTopReputableUsers
};

/**
 * MCP Tools Schema (for MCP server integration)
 */
const mcpToolsSchema = {
  tools: [
    {
      name: 'list_datasets',
      description: 'List available datasets/resources in the marketplace. Discovery is free.',
      inputSchema: {
        type: 'object',
        properties: {
          type: { type: 'string', description: 'Filter by type (dataset, report, etc.)' },
          minReputation: { type: 'number', description: 'Minimum provider reputation score' },
          limit: { type: 'number', description: 'Maximum number of results' }
        }
      }
    },
    {
      name: 'request_dataset_access',
      description: 'Request access to a dataset. Automatically handles x402 payment flow.',
      inputSchema: {
        type: 'object',
        required: ['datasetUAL', 'payerAddress'],
        properties: {
          datasetUAL: { type: 'string', description: 'Universal Asset Locator for the dataset' },
          payerAddress: { type: 'string', description: 'Wallet address of the payer' },
          useFacilitator: { type: 'boolean', description: 'Use facilitator for gasless payments' }
        }
      }
    },
    {
      name: 'query_verified_info',
      description: 'Query verified information backed by high-reputation sources. Pay-per-query.',
      inputSchema: {
        type: 'object',
        required: ['query', 'payerAddress'],
        properties: {
          query: { type: 'string', description: 'Information query' },
          payerAddress: { type: 'string', description: 'Wallet address of the payer' },
          minSourceReputation: { type: 'number', description: 'Minimum reputation of sources' }
        }
      }
    },
    {
      name: 'get_top_reputable_users',
      description: 'Get list of top-N reputable users by category. Pay-per-API call.',
      inputSchema: {
        type: 'object',
        required: ['payerAddress'],
        properties: {
          category: { type: 'string', description: 'Category filter (tech, finance, all)' },
          limit: { type: 'number', description: 'Number of users to return' },
          payerAddress: { type: 'string', description: 'Wallet address of the payer' }
        }
      }
    }
  ]
};

module.exports.mcpToolsSchema = mcpToolsSchema;

