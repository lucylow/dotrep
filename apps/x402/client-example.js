/**
 * x402 Payment Client Example
 * Demonstrates how to interact with the x402 payment gateway
 */

const axios = require('axios');

const X402_GATEWAY_URL = process.env.X402_GATEWAY_URL || 'http://localhost:4000';
const FACILITATOR_URL = process.env.FACILITATOR_URL || 'https://facil.example/pay';

/**
 * Request a protected resource (will receive 402 if payment required)
 */
async function requestResource(resourcePath) {
  try {
    const response = await axios.get(`${X402_GATEWAY_URL}${resourcePath}`, {
      validateStatus: (status) => status === 200 || status === 402
    });

    if (response.status === 402) {
      console.log('📋 Payment Required');
      console.log('Payment Request:', JSON.stringify(response.data.paymentRequest, null, 2));
      return {
        requiresPayment: true,
        paymentRequest: response.data.paymentRequest
      };
    }

    return {
      requiresPayment: false,
      data: response.data
    };
  } catch (error) {
    console.error('Error requesting resource:', error.message);
    throw error;
  }
}

/**
 * Pay via facilitator (simplified - in production, use facilitator SDK)
 */
async function payViaFacilitator(paymentRequest, payerAddress) {
  // In production, this would:
  // 1. Call facilitator SDK to initiate payment
  // 2. Facilitator handles on-chain transaction
  // 3. Facilitator returns signed attestation
  
  // For demo, simulate payment
  const mockTxHash = `0x${Buffer.from(`${Date.now()}-${Math.random()}`).toString('hex')}`;
  
  console.log('💳 Processing payment via facilitator...');
  console.log(`   Amount: ${paymentRequest.amount} ${paymentRequest.currency}`);
  console.log(`   Recipient: ${paymentRequest.recipient}`);
  console.log(`   Chain: ${paymentRequest.chains[0]}`);
  
  // Simulate facilitator response
  const facilitatorResponse = {
    txHash: mockTxHash,
    chain: paymentRequest.chains[0],
    facilitatorSig: `0x${Buffer.from('facilitator-sig').toString('hex')}`,
    blockNumber: '12345',
    verified: true
  };

  return facilitatorResponse;
}

/**
 * Pay directly on-chain (alternative to facilitator)
 */
async function payOnChain(paymentRequest, payerAddress, privateKey) {
  // In production, this would:
  // 1. Sign transaction with private key
  // 2. Broadcast to blockchain
  // 3. Wait for confirmation
  // 4. Return transaction hash
  
  const mockTxHash = `0x${Buffer.from(`${Date.now()}-${Math.random()}`).toString('hex')}`;
  
  console.log('⛓️  Processing on-chain payment...');
  console.log(`   Amount: ${paymentRequest.amount} ${paymentRequest.currency}`);
  console.log(`   Chain: ${paymentRequest.chains[0]}`);
  
  return {
    txHash: mockTxHash,
    chain: paymentRequest.chains[0],
    blockNumber: 'pending'
  };
}

/**
 * Retry request with X-PAYMENT header
 */
async function retryWithPayment(resourcePath, paymentProof) {
  const xPaymentHeader = JSON.stringify(paymentProof);
  
  try {
    const response = await axios.get(`${X402_GATEWAY_URL}${resourcePath}`, {
      headers: {
        'X-PAYMENT': xPaymentHeader
      }
    });

    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 402) {
      console.error('❌ Payment verification failed:', error.response.data.message);
      return {
        error: error.response.data.message,
        paymentRequest: error.response.data.paymentRequest
      };
    }
    throw error;
  }
}

/**
 * Complete x402 payment flow
 */
async function completePaymentFlow(resourcePath, payerAddress, useFacilitator = true) {
  console.log(`\n🔐 Requesting protected resource: ${resourcePath}\n`);

  // Step 1: Request resource (will get 402)
  const initialResponse = await requestResource(resourcePath);
  
  if (!initialResponse.requiresPayment) {
    console.log('✅ Resource accessible without payment');
    return initialResponse.data;
  }

  const paymentRequest = initialResponse.paymentRequest;
  console.log(`\n💰 Payment Required:`);
  console.log(`   Amount: ${paymentRequest.amount} ${paymentRequest.currency}`);
  console.log(`   Challenge: ${paymentRequest.challenge}`);
  console.log(`   Expires: ${paymentRequest.expires}\n`);

  // Step 2: Process payment
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

  console.log(`\n📤 Retrying request with payment proof...\n`);

  // Step 4: Retry request with X-PAYMENT header
  const finalResponse = await retryWithPayment(resourcePath, paymentProof);

  if (finalResponse.error) {
    console.error('❌ Payment failed:', finalResponse.error);
    return finalResponse;
  }

  console.log('✅ Payment successful!');
  console.log(`   Payment Evidence UAL: ${finalResponse.paymentEvidence?.ual}`);
  console.log(`   Transaction Hash: ${finalResponse.paymentEvidence?.txHash}`);
  console.log(`   Chain: ${finalResponse.paymentEvidence?.chain}\n`);

  return finalResponse;
}

/**
 * Example: Get top reputable users (pay-per-API)
 */
async function exampleTopReputableUsers(payerAddress) {
  console.log('\n📊 Example: Get Top Reputable Users\n');
  
  const response = await axios.get(`${X402_GATEWAY_URL}/api/top-reputable-users`, {
    params: { category: 'tech', limit: 5 },
    validateStatus: (status) => status === 200 || status === 402
  });

  if (response.status === 402) {
    const paymentRequest = response.data.paymentRequest;
    const paymentResult = await payViaFacilitator(paymentRequest, payerAddress);
    
    const paymentProof = {
      txHash: paymentResult.txHash,
      chain: paymentResult.chain,
      payer: payerAddress,
      amount: paymentRequest.amount,
      currency: paymentRequest.currency,
      recipient: paymentRequest.recipient,
      challenge: paymentRequest.challenge,
      signature: `0x${Buffer.from('signed-payload').toString('hex')}`,
      facilitatorSig: paymentResult.facilitatorSig
    };

    const finalResponse = await axios.get(`${X402_GATEWAY_URL}/api/top-reputable-users`, {
      params: { category: 'tech', limit: 5 },
      headers: { 'X-PAYMENT': JSON.stringify(paymentProof) }
    });

    console.log('✅ Top Reputable Users:', JSON.stringify(finalResponse.data, null, 2));
    return finalResponse.data;
  }
  
  return response.data;
}

/**
 * Example: Query verified information (quality data microtransaction)
 */
async function exampleVerifiedInfo(payerAddress) {
  console.log('\n🔍 Example: Query Verified Information\n');
  
  const response = await axios.post(
    `${X402_GATEWAY_URL}/api/verified-info`,
    { query: 'What is the current price of Bitcoin?', sourceReputation: 0.8 },
    { validateStatus: (status) => status === 200 || status === 402 }
  );

  if (response.status === 402) {
    const paymentRequest = response.data.paymentRequest;
    const paymentResult = await payViaFacilitator(paymentRequest, payerAddress);
    
    const paymentProof = {
      txHash: paymentResult.txHash,
      chain: paymentResult.chain,
      payer: payerAddress,
      amount: paymentRequest.amount,
      currency: paymentRequest.currency,
      recipient: paymentRequest.recipient,
      challenge: paymentRequest.challenge,
      signature: `0x${Buffer.from('signed-payload').toString('hex')}`,
      facilitatorSig: paymentResult.facilitatorSig
    };

    const finalResponse = await axios.post(
      `${X402_GATEWAY_URL}/api/verified-info`,
      { query: 'What is the current price of Bitcoin?', sourceReputation: 0.8 },
      { headers: { 'X-PAYMENT': JSON.stringify(paymentProof) } }
    );

    console.log('✅ Verified Info:', JSON.stringify(finalResponse.data, null, 2));
    return finalResponse.data;
  }
  
  return response.data;
}

/**
 * Example: Discover and purchase from data marketplace
 */
async function exampleMarketplacePurchase(payerAddress) {
  console.log('\n🛒 Example: Data Marketplace Purchase\n');
  
  // Step 1: Discover products (free)
  const discoverResponse = await axios.get(`${X402_GATEWAY_URL}/api/marketplace/discover`, {
    params: { type: 'dataset', minReputation: 0.8, limit: 5 }
  });
  
  console.log('📋 Discovered Products:', discoverResponse.data.products.length);
  
  if (discoverResponse.data.products.length === 0) {
    console.log('No products found');
    return;
  }

  const product = discoverResponse.data.products[0];
  console.log(`\n💰 Purchasing: ${product.name} (${product.ual})`);

  // Step 2: Purchase product
  const purchaseResponse = await axios.post(
    `${X402_GATEWAY_URL}/api/marketplace/purchase`,
    {
      productUAL: product.ual,
      buyer: payerAddress,
      paymentMethod: 'x402'
    },
    { validateStatus: (status) => status === 200 || status === 402 }
  );

  if (purchaseResponse.status === 402) {
    const paymentRequest = purchaseResponse.data.paymentRequest;
    const paymentResult = await payViaFacilitator(paymentRequest, payerAddress);
    
    const paymentProof = {
      txHash: paymentResult.txHash,
      chain: paymentResult.chain,
      payer: payerAddress,
      amount: paymentRequest.amount,
      currency: paymentRequest.currency,
      recipient: paymentRequest.recipient,
      challenge: paymentRequest.challenge,
      signature: `0x${Buffer.from('signed-payload').toString('hex')}`,
      facilitatorSig: paymentResult.facilitatorSig
    };

    const finalResponse = await axios.post(
      `${X402_GATEWAY_URL}/api/marketplace/purchase`,
      {
        productUAL: product.ual,
        buyer: payerAddress,
        paymentMethod: 'x402'
      },
      {
        headers: { 'X-PAYMENT': JSON.stringify(paymentProof) }
      }
    );

    console.log('✅ Purchase Successful:', JSON.stringify(finalResponse.data, null, 2));
    return finalResponse.data;
  }
  
  return purchaseResponse.data;
}

/**
 * Example: AI agent-driven purchase
 */
async function exampleAgentPurchase(payerAddress) {
  console.log('\n🤖 Example: AI Agent-Driven Purchase\n');
  
  const productUAL = 'urn:ual:dotrep:product:report:marketing-trends';
  const agentId = 'agent-ai-assistant-001';
  
  const response = await axios.post(
    `${X402_GATEWAY_URL}/api/agent/purchase`,
    {
      productUAL,
      agentId,
      buyer: payerAddress,
      maxPrice: '20.00',
      minSellerReputation: 0.9
    },
    { validateStatus: (status) => status === 200 || status === 402 || status === 403 }
  );

  if (response.status === 402) {
    const paymentRequest = response.data.paymentRequest;
    console.log(`🤖 Agent ${agentId} processing payment: ${paymentRequest.amount} ${paymentRequest.currency}`);
    
    const paymentResult = await payViaFacilitator(paymentRequest, payerAddress);
    
    const paymentProof = {
      txHash: paymentResult.txHash,
      chain: paymentResult.chain,
      payer: payerAddress,
      amount: paymentRequest.amount,
      currency: paymentRequest.currency,
      recipient: paymentRequest.recipient,
      challenge: paymentRequest.challenge,
      signature: `0x${Buffer.from('signed-payload').toString('hex')}`,
      facilitatorSig: paymentResult.facilitatorSig
    };

    const finalResponse = await axios.post(
      `${X402_GATEWAY_URL}/api/agent/purchase`,
      {
        productUAL,
        agentId,
        buyer: payerAddress,
        maxPrice: '20.00',
        minSellerReputation: 0.9
      },
      {
        headers: { 'X-PAYMENT': JSON.stringify(paymentProof) }
      }
    );

    console.log('✅ Agent Purchase Successful:', JSON.stringify(finalResponse.data, null, 2));
    return finalResponse.data;
  } else if (response.status === 403) {
    console.log('❌ Agent Purchase Rejected:', response.data.message);
    return response.data;
  }
  
  return response.data;
}

// Example usage
if (require.main === module) {
  const payerAddress = process.env.PAYER_ADDRESS || '0x1234567890123456789012345678901234567890';
  
  async function runAllExamples() {
    try {
      // Example 1: Pay-per-API for reputation data
      await exampleTopReputableUsers(payerAddress);
      
      // Example 2: Quality data microtransaction
      await exampleVerifiedInfo(payerAddress);
      
      // Example 3: Data marketplace purchase
      await exampleMarketplacePurchase(payerAddress);
      
      // Example 4: AI agent-driven purchase
      await exampleAgentPurchase(payerAddress);
      
      // Example 5: Original verified creators endpoint
      await completePaymentFlow('/api/verified-creators', payerAddress, true);
      
      console.log('\n✅ All examples completed!\n');
    } catch (error) {
      console.error('❌ Error running examples:', error.message);
    }
  }
  
  runAllExamples();
}

module.exports = {
  requestResource,
  payViaFacilitator,
  payOnChain,
  retryWithPayment,
  completePaymentFlow
};

