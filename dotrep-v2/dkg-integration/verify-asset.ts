#!/usr/bin/env node
/**
 * Asset Verification Script
 * 
 * Verifies the integrity of a Knowledge Asset by:
 * 1. Fetching the asset from DKG
 * 2. Recomputing content hash
 * 3. Verifying signature
 * 4. Optionally checking on-chain anchor
 * 
 * Usage:
 *   ts-node verify-asset.ts --ual <UAL>
 *   ts-node verify-asset.ts --ual <UAL> --check-anchor
 */

import { DKGClientV8 } from './dkg-client-v8';
import { verifyAssetWithDID, computeContentHash, canonicalizeJSON } from './did-signing';

interface VerificationReport {
  ual: string;
  asset: any;
  contentHash: {
    provided: string;
    computed: string;
    match: boolean;
  };
  signature: {
    present: boolean;
    valid: boolean;
    creatorDID: string;
  };
  provenance: {
    hasProvenance: boolean;
    computedBy?: string;
    method?: string;
    sourceAssets?: string[];
    previousVersion?: string;
  };
  timestamp: string;
  onChainAnchor?: {
    present: boolean;
    blockNumber?: number;
    transactionHash?: string;
  };
  overall: {
    valid: boolean;
    score: number; // 0-100
    issues: string[];
  };
}

async function verifyAsset(ual: string, checkAnchor: boolean = false): Promise<VerificationReport> {
  console.log(`🔍 Verifying asset: ${ual}\n`);

  const dkgClient = new DKGClientV8({
    useMockMode: process.env.DKG_USE_MOCK === 'true',
    fallbackToMock: true
  });

  // Fetch asset
  console.log('📥 Fetching asset from DKG...');
  const asset = await dkgClient.queryReputation(ual);
  
  if (!asset) {
    throw new Error(`Asset not found: ${ual}`);
  }

  console.log('✅ Asset fetched\n');

  // Extract fields
  const providedContentHash = asset.contentHash || asset['@contentHash'] || asset['dotrep:contentHash'];
  const providedSignature = asset.signature || asset['@signature'] || asset['dotrep:signature'];
  const creatorDID = asset.creator || asset['@creator'] || asset['dotrep:creator'];
  const published = asset.published || asset['@published'] || asset['datePublished'];
  const provenance = asset['dotrep:provenance'] || asset.provenance;
  const previousVersion = asset['prov:wasRevisionOf'] || asset['@wasRevisionOf'];

  // Recompute content hash
  console.log('🔐 Computing content hash...');
  const canonicalized = canonicalizeJSON(asset);
  const computedContentHash = computeContentHash(canonicalized);
  const contentHashMatch = providedContentHash === computedContentHash;

  console.log(`   Provided: ${providedContentHash || 'MISSING'}`);
  console.log(`   Computed: ${computedContentHash}`);
  console.log(`   Match: ${contentHashMatch ? '✅' : '❌'}\n`);

  // Verify signature
  let signatureValid = false;
  if (providedSignature && creatorDID) {
    console.log('✍️  Verifying signature...');
    const verificationResult = verifyAssetWithDID(asset, creatorDID, 'Ed25519');
    signatureValid = verificationResult.valid || false;
    console.log(`   Creator DID: ${creatorDID}`);
    console.log(`   Signature: ${signatureValid ? '✅ VALID' : '❌ INVALID'}`);
    if (verificationResult.error) {
      console.log(`   Error: ${verificationResult.error}`);
    }
    console.log();
  } else {
    console.log('⚠️  No signature or creator DID found\n');
  }

  // Check on-chain anchor (if requested)
  let onChainAnchor: VerificationReport['onChainAnchor'] | undefined;
  if (checkAnchor) {
    console.log('⛓️  Checking on-chain anchor...');
    const transactionHash = asset['dotrep:paymentTx'] || asset.transactionHash;
    const blockNumber = asset['dotrep:anchoredBlock'] || asset.blockNumber;
    
    onChainAnchor = {
      present: !!(transactionHash || blockNumber),
      blockNumber,
      transactionHash
    };
    
    if (onChainAnchor.present) {
      console.log(`   ✅ Anchored on-chain`);
      if (blockNumber) console.log(`   Block: ${blockNumber}`);
      if (transactionHash) console.log(`   TX: ${transactionHash}`);
    } else {
      console.log(`   ⚠️  No on-chain anchor found`);
    }
    console.log();
  }

  // Calculate overall score
  const issues: string[] = [];
  let score = 100;

  if (!contentHashMatch) {
    issues.push('Content hash mismatch');
    score -= 50;
  }

  if (!providedContentHash) {
    issues.push('Missing content hash');
    score -= 30;
  }

  if (!providedSignature) {
    issues.push('Missing signature');
    score -= 20;
  } else if (!signatureValid) {
    issues.push('Invalid signature');
    score -= 20;
  }

  if (!provenance) {
    issues.push('Missing provenance information');
    score -= 10;
  }

  const valid = contentHashMatch && signatureValid && score >= 70;

  const report: VerificationReport = {
    ual,
    asset,
    contentHash: {
      provided: providedContentHash || '',
      computed: computedContentHash,
      match: contentHashMatch
    },
    signature: {
      present: !!providedSignature,
      valid: signatureValid,
      creatorDID: creatorDID || ''
    },
    provenance: {
      hasProvenance: !!provenance,
      computedBy: provenance?.computedBy,
      method: provenance?.method,
      sourceAssets: provenance?.sourceAssets,
      previousVersion
    },
    timestamp: published || '',
    onChainAnchor,
    overall: {
      valid,
      score: Math.max(0, score),
      issues
    }
  };

  return report;
}

function printReport(report: VerificationReport) {
  console.log('\n' + '='.repeat(60));
  console.log('📋 VERIFICATION REPORT');
  console.log('='.repeat(60));
  console.log(`UAL: ${report.ual}`);
  console.log(`Timestamp: ${report.timestamp}`);
  console.log();

  console.log('🔐 Content Hash:');
  console.log(`   Provided: ${report.contentHash.provided || 'MISSING'}`);
  console.log(`   Computed: ${report.contentHash.computed}`);
  console.log(`   Status: ${report.contentHash.match ? '✅ MATCH' : '❌ MISMATCH'}`);
  console.log();

  console.log('✍️  Signature:');
  console.log(`   Present: ${report.signature.present ? '✅' : '❌'}`);
  if (report.signature.present) {
    console.log(`   Valid: ${report.signature.valid ? '✅ VALID' : '❌ INVALID'}`);
    console.log(`   Creator DID: ${report.signature.creatorDID}`);
  }
  console.log();

  if (report.provenance.hasProvenance) {
    console.log('📊 Provenance:');
    console.log(`   Computed By: ${report.provenance.computedBy || 'N/A'}`);
    console.log(`   Method: ${report.provenance.method || 'N/A'}`);
    console.log(`   Source Assets: ${report.provenance.sourceAssets?.length || 0}`);
    if (report.provenance.previousVersion) {
      console.log(`   Previous Version: ${report.provenance.previousVersion}`);
    }
    console.log();
  }

  if (report.onChainAnchor) {
    console.log('⛓️  On-Chain Anchor:');
    console.log(`   Present: ${report.onChainAnchor.present ? '✅' : '❌'}`);
    if (report.onChainAnchor.blockNumber) {
      console.log(`   Block: ${report.onChainAnchor.blockNumber}`);
    }
    if (report.onChainAnchor.transactionHash) {
      console.log(`   TX: ${report.onChainAnchor.transactionHash}`);
    }
    console.log();
  }

  console.log('📈 Overall:');
  console.log(`   Valid: ${report.overall.valid ? '✅ YES' : '❌ NO'}`);
  console.log(`   Score: ${report.overall.score}/100`);
  if (report.overall.issues.length > 0) {
    console.log(`   Issues:`);
    report.overall.issues.forEach(issue => console.log(`      - ${issue}`));
  }
  console.log('='.repeat(60));
  console.log();
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const ualIndex = args.indexOf('--ual');
  const checkAnchor = args.includes('--check-anchor');

  if (ualIndex === -1 || !args[ualIndex + 1]) {
    console.error('Usage: ts-node verify-asset.ts --ual <UAL> [--check-anchor]');
    process.exit(1);
  }

  const ual = args[ualIndex + 1];

  try {
    const report = await verifyAsset(ual, checkAnchor);
    printReport(report);
    
    process.exit(report.overall.valid ? 0 : 1);
  } catch (error: any) {
    console.error(`❌ Verification failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { verifyAsset, printReport, type VerificationReport };

