/**
 * EIP-712 Structured Data Signing for x402 Payments
 * 
 * Implements EIP-712 standard for secure, typed structured data signing.
 * This provides better security and user experience compared to raw message signing.
 * 
 * Based on EIP-712: https://eips.ethereum.org/EIPS/eip-712
 */

const { ethers } = require('ethers');
const crypto = require('crypto');

/**
 * EIP-712 Domain Separator for x402 Payments
 * This ensures signatures are only valid for x402 protocol payments
 */
const X402_DOMAIN = {
  name: 'x402',
  version: '1.0',
  chainId: null, // Set per chain
  verifyingContract: null // Optional: contract address if using on-chain verification
};

/**
 * EIP-712 Type Definitions for Payment Authorization
 */
const PAYMENT_AUTHORIZATION_TYPES = {
  PaymentAuthorization: [
    { name: 'payer', type: 'address' },
    { name: 'recipient', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'currency', type: 'string' },
    { name: 'chain', type: 'string' },
    { name: 'challenge', type: 'string' },
    { name: 'resourceUAL', type: 'string' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' }
  ]
};

/**
 * Get chain ID for a given chain name
 */
function getChainId(chain) {
  const chainLower = chain.toLowerCase();
  const chainIds = {
    'base': 8453,
    'base-sepolia': 84532,
    'ethereum': 1,
    'sepolia': 11155111,
    'polygon': 137,
    'arbitrum': 42161,
    'xdc': 50,
    'xdc-apothem': 51,
    'neuroweb-evm': 2024 // Example, adjust as needed
  };
  return chainIds[chainLower] || null;
}

/**
 * Create EIP-712 domain for a specific chain
 */
function createDomain(chain, verifyingContract = null) {
  const chainId = getChainId(chain);
  return {
    ...X402_DOMAIN,
    chainId: chainId,
    verifyingContract: verifyingContract
  };
}

/**
 * Create payment authorization message for EIP-712 signing
 */
function createPaymentAuthorizationMessage(paymentRequest, options = {}) {
  const {
    payer,
    recipient,
    amount,
    currency,
    chain,
    challenge,
    resourceUAL,
    validAfter = Math.floor(Date.now() / 1000),
    validBefore = Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes default
    nonce = crypto.randomBytes(32)
  } = paymentRequest;

  // Convert amount to wei (USDC has 6 decimals)
  const amountWei = ethers.parseUnits(amount, 6);

  // Convert nonce to bytes32 if it's a string
  let nonceBytes32;
  if (typeof nonce === 'string') {
    nonceBytes32 = ethers.hexlify(ethers.toUtf8Bytes(nonce.padEnd(32, '\0'))).slice(0, 66);
  } else {
    nonceBytes32 = ethers.hexlify(nonce);
  }

  return {
    payer,
    recipient,
    amount: amountWei.toString(),
    currency,
    chain,
    challenge,
    resourceUAL,
    validAfter: validAfter.toString(),
    validBefore: validBefore.toString(),
    nonce: nonceBytes32
  };
}

/**
 * Sign payment authorization using EIP-712
 * 
 * @param {object} paymentRequest - Payment request object
 * @param {object} signer - ethers.js signer (wallet, provider, etc.)
 * @param {object} options - Signing options
 * @returns {Promise<string>} EIP-712 signature (hex string)
 */
async function signPaymentAuthorization(paymentRequest, signer, options = {}) {
  const chain = paymentRequest.chain || options.chain || 'base';
  const domain = createDomain(chain, options.verifyingContract);
  const message = createPaymentAuthorizationMessage(paymentRequest, options);

  try {
    // Use ethers.js TypedDataEncoder for EIP-712 signing
    const signature = await signer.signTypedData(
      domain,
      PAYMENT_AUTHORIZATION_TYPES,
      message
    );

    return signature;
  } catch (error) {
    console.error('[EIP-712] Signing error:', error);
    throw new Error(`Failed to sign payment authorization: ${error.message}`);
  }
}

/**
 * Verify EIP-712 signature
 * 
 * @param {object} paymentProof - Payment proof with signature
 * @param {object} options - Verification options
 * @returns {Promise<object>} Verification result
 */
async function verifyPaymentAuthorizationSignature(paymentProof, options = {}) {
  const {
    payer,
    recipient,
    amount,
    currency,
    chain,
    challenge,
    resourceUAL,
    validAfter,
    validBefore,
    nonce,
    signature
  } = paymentProof;

  if (!signature) {
    return {
      verified: false,
      error: 'Missing signature'
    };
  }

  try {
    const domain = createDomain(chain, options.verifyingContract);
    const message = {
      payer,
      recipient,
      amount: ethers.parseUnits(amount, 6).toString(),
      currency,
      chain,
      challenge,
      resourceUAL,
      validAfter: validAfter ? validAfter.toString() : '0',
      validBefore: validBefore ? validBefore.toString() : '0',
      nonce: nonce || ethers.ZeroHash
    };

    // Recover signer address from signature
    const recoveredAddress = ethers.verifyTypedData(
      domain,
      PAYMENT_AUTHORIZATION_TYPES,
      message,
      signature
    );

    const isValid = recoveredAddress.toLowerCase() === payer.toLowerCase();

    return {
      verified: isValid,
      recoveredAddress,
      expectedAddress: payer,
      error: isValid ? null : 'Signature does not match payer address'
    };
  } catch (error) {
    console.error('[EIP-712] Verification error:', error);
    return {
      verified: false,
      error: `Verification failed: ${error.message}`
    };
  }
}

/**
 * Create payment proof from signed authorization
 * 
 * @param {object} paymentRequest - Original payment request
 * @param {string} signature - EIP-712 signature
 * @param {string} txHash - Transaction hash (if payment already executed)
 * @param {object} options - Additional options
 * @returns {object} Payment proof object
 */
function createPaymentProof(paymentRequest, signature, txHash = null, options = {}) {
  const message = createPaymentAuthorizationMessage(paymentRequest, options);

  return {
    txHash: txHash || null,
    chain: paymentRequest.chain,
    payer: paymentRequest.payer,
    recipient: paymentRequest.recipient,
    amount: paymentRequest.amount,
    currency: paymentRequest.currency,
    challenge: paymentRequest.challenge,
    resourceUAL: paymentRequest.resourceUAL,
    signature: signature,
    validAfter: message.validAfter,
    validBefore: message.validBefore,
    nonce: message.nonce,
    facilitatorSig: options.facilitatorSig || null,
    method: txHash ? 'on-chain' : 'authorization',
    timestamp: new Date().toISOString()
  };
}

/**
 * Validate payment authorization timing
 */
function validateAuthorizationTiming(paymentProof) {
  const now = Math.floor(Date.now() / 1000);
  const validAfter = parseInt(paymentProof.validAfter || '0');
  const validBefore = parseInt(paymentProof.validBefore || '0');

  if (validAfter && now < validAfter) {
    return {
      valid: false,
      error: `Authorization not yet valid. Valid after: ${new Date(validAfter * 1000).toISOString()}`,
      code: 'AUTHORIZATION_NOT_YET_VALID'
    };
  }

  if (validBefore && now > validBefore) {
    return {
      valid: false,
      error: `Authorization expired. Valid before: ${new Date(validBefore * 1000).toISOString()}`,
      code: 'AUTHORIZATION_EXPIRED'
    };
  }

  return { valid: true };
}

/**
 * Format payment proof for X-PAYMENT header
 */
function formatPaymentProofForHeader(paymentProof) {
  // Remove any undefined/null values and format for HTTP header
  const formatted = {
    txHash: paymentProof.txHash,
    chain: paymentProof.chain,
    payer: paymentProof.payer,
    amount: paymentProof.amount,
    currency: paymentProof.currency,
    challenge: paymentProof.challenge,
    signature: paymentProof.signature
  };

  if (paymentProof.recipient) formatted.recipient = paymentProof.recipient;
  if (paymentProof.resourceUAL) formatted.resourceUAL = paymentProof.resourceUAL;
  if (paymentProof.facilitatorSig) formatted.facilitatorSig = paymentProof.facilitatorSig;
  if (paymentProof.validAfter) formatted.validAfter = paymentProof.validAfter;
  if (paymentProof.validBefore) formatted.validBefore = paymentProof.validBefore;
  if (paymentProof.nonce) formatted.nonce = paymentProof.nonce;

  return formatted;
}

module.exports = {
  signPaymentAuthorization,
  verifyPaymentAuthorizationSignature,
  createPaymentAuthorizationMessage,
  createPaymentProof,
  validateAuthorizationTiming,
  formatPaymentProofForHeader,
  createDomain,
  getChainId,
  PAYMENT_AUTHORIZATION_TYPES,
  X402_DOMAIN
};

