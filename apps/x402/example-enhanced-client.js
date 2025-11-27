/**
 * Enhanced x402 Client Example
 * Demonstrates the improved client SDK with EIP-712 signing and facilitator support
 */

const { createX402Client, createX402ClientFromPrivateKey } = require('./x402-client-sdk');
const { ethers } = require('ethers');

// Example 1: Create client with wallet
async function example1_BasicUsage() {
  console.log('\n📚 Example 1: Basic Client Usage\n');

  // Create wallet (in production, use environment variable or secure storage)
  const privateKey = process.env.PRIVATE_KEY || '0x' + '1'.repeat(64); // Dummy key for demo
  const wallet = new ethers.Wallet(privateKey);

  // Create x402 client
  const client = createX402Client({
    wallet,
    apiUrl: process.env.X402_API_URL || 'http://localhost:4000',
    facilitator: 'auto', // Automatically selects best facilitator
    useEIP712: true, // Use EIP-712 signing
    onPaymentRequired: (paymentRequest) => {
      console.log(`💰 Payment Required: ${paymentRequest.amount} ${paymentRequest.currency}`);
      console.log(`   Challenge: ${paymentRequest.challenge}`);
    },
    onPaymentComplete: (proof, response) => {
      console.log(`✅ Payment Complete: ${proof.txHash}`);
      console.log(`   Payment Evidence UAL: ${response.paymentEvidence?.ual}`);
    }
  });

  try {
    // Request protected resource - payment is handled automatically
    const result = await client.request('/api/premium-data');
    console.log('📦 Resource Data:', result.data);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Example 2: Create client from private key
async function example2_FromPrivateKey() {
  console.log('\n📚 Example 2: Create Client from Private Key\n');

  const privateKey = process.env.PRIVATE_KEY || '0x' + '1'.repeat(64);
  
  const client = createX402ClientFromPrivateKey(privateKey, {
    apiUrl: process.env.X402_API_URL || 'http://localhost:4000',
    facilitator: 'coinbase', // Use Coinbase facilitator
    rpcUrl: 'https://mainnet.base.org'
  });

  try {
    const result = await client.request('/api/verified-creators');
    console.log('✅ Verified Creators:', result.data);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Example 3: Manual payment flow with EIP-712
async function example3_ManualEIP712() {
  console.log('\n📚 Example 3: Manual EIP-712 Payment Flow\n');

  const { signPaymentAuthorization, createPaymentProof, formatPaymentProofForHeader } = require('./eip712-signing');
  const { createFacilitatorClient } = require('./facilitator-client');
  const axios = require('axios');

  const privateKey = process.env.PRIVATE_KEY || '0x' + '1'.repeat(64);
  const wallet = new ethers.Wallet(privateKey);
  const apiUrl = process.env.X402_API_URL || 'http://localhost:4000';

  try {
    // Step 1: Request resource (will get 402)
    const response = await axios.get(`${apiUrl}/api/premium-data`, {
      validateStatus: (status) => status === 200 || status === 402
    });

    if (response.status !== 402) {
      console.log('✅ Resource accessible without payment');
      return;
    }

    const paymentRequest = response.data.paymentRequest;
    console.log(`💰 Payment Required: ${paymentRequest.amount} ${paymentRequest.currency}`);

    // Step 2: Sign payment authorization with EIP-712
    const signature = await signPaymentAuthorization(paymentRequest, wallet, {
      chain: paymentRequest.chains[0]
    });
    console.log('✍️  Payment authorization signed (EIP-712)');

    // Step 3: Execute payment via facilitator
    const facilitator = createFacilitatorClient();
    const paymentResult = await facilitator.pay(paymentRequest, await wallet.getAddress(), {
      signature: signature
    });
    console.log(`💳 Payment executed: ${paymentResult.txHash}`);

    // Step 4: Create payment proof
    const paymentProof = createPaymentProof(paymentRequest, signature, paymentResult.txHash, {
      facilitatorSig: paymentResult.facilitatorSig
    });

    // Step 5: Retry request with X-PAYMENT header
    const formattedProof = formatPaymentProofForHeader(paymentProof);
    const finalResponse = await axios.get(`${apiUrl}/api/premium-data`, {
      headers: {
        'X-PAYMENT': JSON.stringify(formattedProof)
      }
    });

    console.log('✅ Resource accessed:', finalResponse.data);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Example 4: Session-based billing
async function example4_SessionBilling() {
  console.log('\n📚 Example 4: Session-Based Billing\n');

  const { createSessionBillingManager } = require('./session-billing');

  const billing = createSessionBillingManager({
    sessionTimeout: 3600000, // 1 hour
    billingInterval: 300000, // Bill every 5 minutes
    minBillingAmount: '0.01',
    currency: 'USDC'
  });

  const payerAddress = '0x1234567890123456789012345678901234567890';

  // Create session
  const session = billing.createSession(payerAddress, {
    recipient: '0x0000000000000000000000000000000000000000',
    chains: ['base']
  });

  console.log(`📝 Session created: ${session.sessionId}`);

  // Record multiple API calls
  for (let i = 0; i < 5; i++) {
    const call = billing.recordCall(session.sessionId, {
      amount: '0.001',
      endpoint: `/api/data/${i}`
    });
    console.log(`📊 Call recorded: ${call.callId} (${call.amount} USDC)`);
  }

  // Get session bill
  const bill = billing.getSessionBill(session.sessionId);
  console.log(`\n💰 Session Bill:`);
  console.log(`   Total Calls: ${bill.callCount}`);
  console.log(`   Total Amount: ${bill.totalAmount} ${bill.currency}`);

  // Bill session
  const billingResult = billing.billSession(session.sessionId, true);
  if (billingResult.billable) {
    console.log(`\n💳 Payment Request Created:`);
    console.log(`   Amount: ${billingResult.paymentRequest.amount} ${billingResult.paymentRequest.currency}`);
    console.log(`   Challenge: ${billingResult.paymentRequest.challenge}`);
  }
}

// Example 5: Multiple resources in sequence
async function example5_MultipleResources() {
  console.log('\n📚 Example 5: Multiple Resources\n');

  const privateKey = process.env.PRIVATE_KEY || '0x' + '1'.repeat(64);
  const wallet = new ethers.Wallet(privateKey);

  const client = createX402Client({
    wallet,
    apiUrl: process.env.X402_API_URL || 'http://localhost:4000',
    facilitator: 'auto'
  });

  try {
    // Request multiple resources - each will handle payment automatically
    const resources = [
      '/api/top-reputable-users?category=tech&limit=5',
      '/api/user-reputation-profile?account=did:dkg:user:alice',
      '/api/verified-info'
    ];

    for (const resource of resources) {
      console.log(`\n📡 Requesting: ${resource}`);
      const result = await client.request(resource, {
        method: resource.startsWith('/api/verified-info') ? 'POST' : 'GET',
        data: resource.startsWith('/api/verified-info') ? {
          query: 'What is Bitcoin?',
          sourceReputation: 0.8
        } : undefined
      });
      console.log(`✅ Success: ${resource}`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run all examples
async function runAllExamples() {
  try {
    await example1_BasicUsage();
    await example2_FromPrivateKey();
    await example3_ManualEIP712();
    await example4_SessionBilling();
    await example5_MultipleResources();
    
    console.log('\n✅ All examples completed!\n');
  } catch (error) {
    console.error('\n❌ Error running examples:', error);
  }
}

// Run if executed directly
if (require.main === module) {
  runAllExamples();
}

module.exports = {
  example1_BasicUsage,
  example2_FromPrivateKey,
  example3_ManualEIP712,
  example4_SessionBilling,
  example5_MultipleResources
};

