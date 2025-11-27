/**
 * Cryptographic Helpers
 * EIP-712 signature verification and related utilities
 */

import { ethers } from 'ethers';
import { randomBytes } from 'crypto';

/**
 * EIP-712 Domain for payment proof signatures
 */
const EIP712_DOMAIN = {
  name: 'DotRep Payment Proof',
  version: '1',
  chainId: 8453, // Base mainnet (adjust for your chain)
};

/**
 * EIP-712 Types for payment proof
 */
const PAYMENT_PROOF_TYPES = {
  PaymentProof: [
    { name: 'txHash', type: 'bytes32' },
    { name: 'nonce', type: 'string' },
    { name: 'reference', type: 'string' },
  ],
};

/**
 * Verify EIP-712 signature for payment proof
 * @param {string} txHash - Transaction hash
 * @param {string} nonce - Nonce from payment request
 * @param {string} reference - Reference ID
 * @param {string} signature - EIP-712 signature
 * @param {string} expectedSigner - Expected signer address
 * @returns {Promise<boolean>} True if signature is valid
 */
export async function verifyPaymentProofSignature(
  txHash,
  nonce,
  reference,
  signature,
  expectedSigner
) {
  try {
    // Convert txHash to bytes32 format if needed
    const txHashBytes = ethers.hexlify(ethers.zeroPadValue(txHash, 32));

    const message = {
      txHash: txHashBytes,
      nonce,
      reference,
    };

    const recoveredAddress = ethers.verifyTypedData(
      EIP712_DOMAIN,
      PAYMENT_PROOF_TYPES,
      message,
      signature
    );

    return recoveredAddress.toLowerCase() === expectedSigner.toLowerCase();
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Sign a payment proof (for testing/facilitator)
 * @param {string} txHash - Transaction hash
 * @param {string} nonce - Nonce
 * @param {string} reference - Reference ID
 * @param {string} privateKey - Private key to sign with
 * @returns {Promise<string>} EIP-712 signature
 */
export async function signPaymentProof(txHash, nonce, reference, privateKey) {
  const wallet = new ethers.Wallet(privateKey);
  
  const txHashBytes = ethers.hexlify(ethers.zeroPadValue(txHash, 32));
  
  const message = {
    txHash: txHashBytes,
    nonce,
    reference,
  };

  return await wallet.signTypedData(
    EIP712_DOMAIN,
    PAYMENT_PROOF_TYPES,
    message
  );
}

/**
 * Generate a random nonce
 * @returns {string} Hex-encoded random bytes
 */
export function generateNonce() {
  return randomBytes(16).toString('hex');
}

/**
 * Hash a string using keccak256
 * @param {string} data - Data to hash
 * @returns {string} Hash
 */
export function hashString(data) {
  return ethers.keccak256(ethers.toUtf8Bytes(data));
}

/**
 * Verify that an address is valid Ethereum address
 * @param {string} address - Address to verify
 * @returns {boolean} True if valid
 */
export function isValidAddress(address) {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
}

/**
 * Normalize address to checksum format
 * @param {string} address - Address to normalize
 * @returns {string} Checksum address
 */
export function toChecksumAddress(address) {
  return ethers.getAddress(address);
}

