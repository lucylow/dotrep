/**
 * x402 Protocol Helpers
 * Utilities for formatting X-Payment-Request and X-Payment-Proof headers
 */

import { randomBytes } from 'crypto';
import config from './config.js';

/**
 * Generate a payment request object
 * @param {Object} params - Payment parameters
 * @param {string} params.amount - Payment amount (e.g., "0.01")
 * @param {string} params.token - Token symbol (e.g., "USDC")
 * @param {string} params.recipient - Recipient address
 * @param {string} params.reference - Resource reference ID
 * @param {string} params.denomChain - Chain identifier (optional)
 * @param {string} params.resource - Resource identifier (optional)
 * @param {number} params.expiresInMinutes - Expiry in minutes (default: 15)
 * @returns {Object} Payment request object
 */
export function createPaymentRequest({
  amount,
  token,
  recipient,
  reference,
  denomChain = 'base',
  resource = '',
  expiresInMinutes = 15,
}) {
  const nonce = randomBytes(16).toString('hex');
  const expiresAt = Date.now() + (expiresInMinutes * 60 * 1000);

  return {
    amount,
    token,
    recipient: recipient || config.recipientAddress,
    denomChain,
    resource: resource || reference,
    nonce,
    expiresAt,
    reference,
  };
}

/**
 * Format payment request as X-Payment-Request header value
 * @param {Object} paymentRequest - Payment request object
 * @returns {string} JSON string for header
 */
export function formatPaymentRequestHeader(paymentRequest) {
  return JSON.stringify(paymentRequest);
}

/**
 * Parse X-Payment-Request header
 * @param {string} headerValue - Header value
 * @returns {Object} Parsed payment request
 */
export function parsePaymentRequestHeader(headerValue) {
  try {
    return JSON.parse(headerValue);
  } catch (error) {
    throw new Error('Invalid X-Payment-Request header format');
  }
}

/**
 * Parse X-Payment-Proof header
 * @param {string} headerValue - Header value
 * @returns {Object} Parsed payment proof
 */
export function parsePaymentProofHeader(headerValue) {
  try {
    const proof = JSON.parse(headerValue);
    
    // Validate required fields
    if (!proof.txHash || !proof.signedBy || !proof.proofSignature) {
      throw new Error('Missing required fields in X-Payment-Proof');
    }

    return {
      txHash: proof.txHash,
      signedBy: proof.signedBy,
      chain: proof.chain || 'base',
      proofSignature: proof.proofSignature,
      nonce: proof.nonce,
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid X-Payment-Proof header format: not valid JSON');
    }
    throw error;
  }
}

/**
 * Check if payment request has expired
 * @param {Object} paymentRequest - Payment request object
 * @returns {boolean} True if expired
 */
export function isPaymentRequestExpired(paymentRequest) {
  if (!paymentRequest.expiresAt) {
    return false; // No expiry set
  }
  return Date.now() > paymentRequest.expiresAt;
}

/**
 * Generate a reference ID for a resource
 * @param {string} resourceType - Type of resource (e.g., "trusted_feed")
 * @param {string} resourceId - Resource identifier
 * @param {string} timestamp - Optional timestamp (defaults to current date)
 * @returns {string} Reference ID
 */
export function generateReferenceId(resourceType, resourceId, timestamp = null) {
  const date = timestamp || new Date().toISOString().split('T')[0].replace(/-/g, '');
  return `${resourceType}:${resourceId}:${date}`;
}

