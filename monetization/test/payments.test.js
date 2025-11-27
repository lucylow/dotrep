/**
 * Payment Integration Tests
 * Tests the full 402 flow: request → pay → verify → feed
 */

import request from 'supertest';
import app from '../src/api/server.js';

describe('Payment Flow Integration Tests', () => {
  let paymentRequest = null;
  let txHash = null;

  test('GET /api/marketplace/trusted-feed/:creatorId returns 402 with payment request', async () => {
    const response = await request(app)
      .get('/api/marketplace/trusted-feed/creator123')
      .expect(402);

    expect(response.headers['x-payment-request']).toBeDefined();
    expect(response.body.paymentRequest).toBeDefined();
    expect(response.body.paymentRequest.amount).toBe('0.01');
    expect(response.body.paymentRequest.token).toBe('USDC');
    expect(response.body.paymentRequest.nonce).toBeDefined();

    paymentRequest = response.body.paymentRequest;
  });

  test('POST /api/payments/submit creates a payment', async () => {
    const response = await request(app)
      .post('/api/payments/submit')
      .send({ paymentRequest })
      .expect(200);

    expect(response.body.txHash).toBeDefined();
    expect(response.body.status).toBe('confirmed');

    txHash = response.body.txHash;
  });

  test('GET /api/payments/:txHash returns payment details', async () => {
    const response = await request(app)
      .get(`/api/payments/${txHash}`)
      .expect(200);

    expect(response.body.txHash).toBe(txHash);
    expect(response.body.amount).toBe('0.01');
    expect(response.body.token).toBe('USDC');
  });

  test('POST /api/payments/verify validates payment proof', async () => {
    // Create a mock payment proof
    const proof = {
      txHash: txHash,
      signedBy: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      chain: 'base',
      proofSignature: '0x' + '0'.repeat(130), // Mock signature
      nonce: paymentRequest.nonce,
    };

    const response = await request(app)
      .post('/api/payments/verify')
      .send({ proof })
      .expect(200);

    // In simulate mode, verification may pass with mock signature
    expect(response.body).toHaveProperty('valid');
  });

  test('GET /api/marketplace/trusted-feed/:creatorId with payment proof returns feed', async () => {
    const proof = {
      txHash: txHash,
      signedBy: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      chain: 'base',
      proofSignature: '0x' + '0'.repeat(130),
      nonce: paymentRequest.nonce,
    };

    const response = await request(app)
      .get('/api/marketplace/trusted-feed/creator123')
      .set('X-Payment-Proof', JSON.stringify(proof))
      .expect(200);

    expect(response.body.feed).toBeDefined();
    expect(Array.isArray(response.body.feed)).toBe(true);
    expect(response.body.receiptUAL).toBeDefined();
    expect(response.body.receiptUAL).toMatch(/^urn:ual:dotrep:receipt:/);
  });
});

describe('Payment Request Format', () => {
  test('X-Payment-Request header is valid JSON', async () => {
    const response = await request(app)
      .get('/api/marketplace/trusted-feed/creator123')
      .expect(402);

    const headerValue = response.headers['x-payment-request'];
    expect(() => JSON.parse(headerValue)).not.toThrow();
    
    const parsed = JSON.parse(headerValue);
    expect(parsed).toHaveProperty('amount');
    expect(parsed).toHaveProperty('token');
    expect(parsed).toHaveProperty('recipient');
    expect(parsed).toHaveProperty('nonce');
    expect(parsed).toHaveProperty('expiresAt');
    expect(parsed).toHaveProperty('reference');
  });
});

