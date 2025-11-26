/**
 * ReceiptAsset JSON-LD Template
 * 
 * Template for creating AccessReceipt Knowledge Assets
 * for x402 micropayment access receipts.
 */

import { signAsset, type DIDKeyPair } from '../did-signing';

export interface ReceiptAssetData {
  receiptId: string;
  payerDID: string;
  recipientDID: string;
  amount: string;
  token: string; // Token symbol (e.g., "DOT", "TRAC")
  resourceUAL: string;
  paymentTx: string; // Transaction hash
  timestamp?: number;
}

/**
 * Create an AccessReceipt Knowledge Asset
 */
export function createReceiptAsset(
  data: ReceiptAssetData,
  keyPair?: DIDKeyPair
): any {
  const timestamp = data.timestamp || Date.now();
  const published = new Date(timestamp).toISOString();

  const baseAsset: any = {
    '@context': [
      'https://schema.org/',
      {
        'dkg': 'https://origintrail.io/dkg-schema/',
        'dotrep': 'https://dotrep.io/ontology/'
      }
    ],
    '@type': 'dotrep:AccessReceipt',
    '@id': `urn:ual:dotrep:receipt:${data.receiptId}`,
    'payer': data.payerDID,
    'recipient': data.recipientDID,
    'amount': data.amount,
    'token': data.token,
    'resourceUAL': data.resourceUAL,
    'paymentTx': data.paymentTx,
    'published': published,
    'price': {
      '@type': 'PriceSpecification',
      'price': data.amount,
      'priceCurrency': data.token
    }
  };

  // Sign if key pair provided
  if (keyPair) {
    const signatureResult = signAsset(baseAsset, keyPair);
    baseAsset['contentHash'] = signatureResult.contentHash;
    baseAsset['signature'] = signatureResult.signature;
  }

  return baseAsset;
}

