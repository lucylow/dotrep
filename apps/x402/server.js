/**
 * x402 Micropayment Gateway
 * Implements HTTP 402 Payment Required flow and publishes ReceiptAssets
 */

const express = require('express');
const crypto = require('crypto');
const axios = require('axios');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4000;
const EDGE_PUBLISH_URL = process.env.EDGE_PUBLISH_URL || 'http://mock-dkg:8080';

// In-memory payment proofs (in production, use database)
const paymentProofs = new Map();

// Access policies for resources
const accessPolicies = {
  'creator123': {
    amount: '0.01',
    token: 'TEST-USDC',
    recipient: '0xdeadbeef',
    resourceUAL: 'urn:ual:trusted:feed:creator123'
  }
};

// Generate payment proof
function generatePaymentProof(txHash, payerDid) {
  return {
    tx: txHash,
    signed_by: payerDid,
    timestamp: new Date().toISOString()
  };
}

// Validate payment proof (simplified for demo)
function validatePaymentProof(proof) {
  // In production, verify on-chain transaction
  return proof.tx && proof.signed_by && proof.tx.startsWith('0x');
}

// Publish ReceiptAsset to DKG
async function publishReceiptAsset(receipt) {
  try {
    const response = await axios.post(`${EDGE_PUBLISH_URL}/publish`, receipt, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  } catch (error) {
    console.error('Error publishing ReceiptAsset:', error.message);
    // Return simulated UAL if publishing fails
    return {
      ual: `urn:ual:dotrep:receipt:simulated:${crypto.randomBytes(8).toString('hex')}`,
      simulated: true
    };
  }
}

// Create ReceiptAsset JSON-LD
function createReceiptAsset(paymentRequest, paymentProof) {
  const contentHash = crypto.createHash('sha256')
    .update(JSON.stringify({ paymentRequest, paymentProof }))
    .digest('hex');
  
  return {
    '@context': ['https://schema.org/'],
    type: 'AccessReceipt',
    id: `urn:ual:dotrep:receipt:${paymentProof.tx}`,
    payer: paymentProof.signed_by,
    recipient: `did:key:${paymentRequest.recipient}`,
    amount: paymentRequest.amount,
    token: paymentRequest.token,
    resourceUAL: paymentRequest.resourceUAL,
    paymentTx: paymentProof.tx,
    published: new Date().toISOString(),
    contentHash: contentHash,
    signature: crypto.createHash('sha256').update(contentHash).digest('hex').substring(0, 64), // Simulated
    'schema:paymentMethod': {
      type: 'x402',
      protocol: 'HTTP/1.1 402 Payment Required'
    }
  };
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'x402-gateway' });
});

// Request trusted feed (x402 flow)
app.get('/trusted-feed/:resource', async (req, res) => {
  const { resource } = req.params;
  const paymentProofHeader = req.headers['x-payment-proof'];
  
  const policy = accessPolicies[resource];
  if (!policy) {
    return res.status(404).json({ error: 'Resource not found' });
  }
  
  // Check if payment proof provided
  if (paymentProofHeader) {
    try {
      const proof = JSON.parse(paymentProofHeader);
      
      if (!validatePaymentProof(proof)) {
        return res.status(402).json({
          error: 'Invalid payment proof',
          paymentRequest: policy
        });
      }
      
      // Store proof
      paymentProofs.set(proof.tx, proof);
      
      // Publish ReceiptAsset
      const receiptAsset = createReceiptAsset(policy, proof);
      const publishResult = await publishReceiptAsset(receiptAsset);
      
      // Return content with receipt UAL
      return res.json({
        resource: resource,
        content: {
          type: 'trustedFeed',
          data: `Trusted feed content for ${resource}`,
          verified: true
        },
        receiptUAL: publishResult.ual,
        receiptAsset: receiptAsset
      });
    } catch (error) {
      return res.status(400).json({ error: 'Invalid payment proof format' });
    }
  }
  
  // Return 402 Payment Required
  res.status(402).setHeader('X-Payment-Request', JSON.stringify(policy));
  res.json({
    error: 'Payment Required',
    paymentRequest: policy,
    message: 'Include X-Payment-Proof header with payment transaction proof'
  });
});

// Payment proof endpoint
app.post('/payment/proof', async (req, res) => {
  try {
    const { txHash, payerDid, resource } = req.body;
    
    if (!txHash || !payerDid || !resource) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const policy = accessPolicies[resource];
    if (!policy) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    
    const proof = generatePaymentProof(txHash, payerDid);
    paymentProofs.set(txHash, proof);
    
    // Publish ReceiptAsset
    const receiptAsset = createReceiptAsset(policy, proof);
    const publishResult = await publishReceiptAsset(receiptAsset);
    
    res.json({
      success: true,
      receiptUAL: publishResult.ual,
      receiptAsset: receiptAsset,
      accessGranted: true
    });
  } catch (error) {
    console.error('Error processing payment proof:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get receipt by UAL
app.get('/receipt/:ual', (req, res) => {
  const { ual } = req.params;
  // In production, query DKG for receipt
  res.json({
    ual: ual,
    message: 'Query DKG for full receipt details',
    endpoint: `${EDGE_PUBLISH_URL}/asset/${ual}`
  });
});

app.listen(PORT, () => {
  console.log(`x402 Gateway running on http://localhost:${PORT}`);
  console.log(`Edge Node URL: ${EDGE_PUBLISH_URL}`);
});

