/**
 * CommunityNote JSON-LD Template
 * 
 * Template for creating CommunityNote Knowledge Assets
 * that annotate or comment on reputation assets.
 */

import { signAsset, type DIDKeyPair } from '../did-signing';

export interface CommunityNoteData {
  noteId: string;
  authorDID: string;
  targetUAL: string;
  summary: string;
  evidence?: string[]; // URLs or UALs
  timestamp?: number;
}

/**
 * Create a CommunityNote Knowledge Asset
 */
export function createCommunityNote(
  data: CommunityNoteData,
  keyPair?: DIDKeyPair
): any {
  const timestamp = data.timestamp || Date.now();
  const published = new Date(timestamp).toISOString();

  const baseAsset: any = {
    '@context': [
      'https://schema.org/',
      {
        'prov': 'http://www.w3.org/ns/prov#',
        'dkg': 'https://origintrail.io/dkg-schema/',
        'dotrep': 'https://dotrep.io/ontology/'
      }
    ],
    '@type': 'dotrep:CommunityNote',
    '@id': `urn:ual:dotrep:communitynote:${data.noteId}`,
    'author': data.authorDID,
    'published': published,
    'targetUAL': data.targetUAL,
    'summary': data.summary,
    'description': data.summary
  };

  if (data.evidence && data.evidence.length > 0) {
    baseAsset['evidence'] = data.evidence;
  }

  // Sign if key pair provided
  if (keyPair) {
    const signatureResult = signAsset(baseAsset, keyPair);
    baseAsset['contentHash'] = signatureResult.contentHash;
    baseAsset['signature'] = signatureResult.signature;
  }

  return baseAsset;
}

