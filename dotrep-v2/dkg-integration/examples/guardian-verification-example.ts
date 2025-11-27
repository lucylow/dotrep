/**
 * Guardian Verification Example
 * 
 * This example demonstrates how to use the Guardian integration:
 * 1. Verify content using Guardian
 * 2. Publish verification report to DKG
 * 3. Create Community Note
 * 4. Calculate safety score
 * 5. Integrate with reputation system
 */

import { getGuardianApi } from '../../server/_core/guardianApi';
import { getGuardianVerificationService } from '../guardian-verification';
import { getPolkadotApi } from '../../server/_core/polkadotApi';
import { ReputationCalculator } from '../../server/_core/reputationCalculator';

async function guardianVerificationExample() {
  console.log('🔍 Guardian Verification Example\n');

  // 1. Initialize services
  const guardianApi = getGuardianApi();
  const guardianService = getGuardianVerificationService();
  const polkadotApi = getPolkadotApi();
  const reputationCalculator = new ReputationCalculator();

  const contentUrl = 'https://example.com/user-content/image.jpg';
  const creatorId = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';

  // 2. Verify content
  console.log('📸 Step 1: Verifying content...');
  const verificationResult = await guardianApi.verifyContent({
    contentUrl,
    contentType: 'image',
    checkType: 'all', // Check for all types: deepfake, CSAM, illicit, misinformation
  });

  console.log(`   Status: ${verificationResult.status}`);
  console.log(`   Confidence: ${(verificationResult.confidence * 100).toFixed(1)}%`);
  console.log(`   Matches: ${verificationResult.matches.length}`);
  console.log(`   Recommended Action: ${verificationResult.recommendedAction}`);
  console.log(`   Summary: ${verificationResult.summary}\n`);

  // 3. Publish verification report to DKG
  console.log('📤 Step 2: Publishing verification report to DKG...');
  const reportResult = await guardianService.publishVerificationReport(
    contentUrl,
    creatorId,
    verificationResult,
    2 // epochs
  );

  console.log(`   ✅ Verification report published: ${reportResult.ual}`);
  if (reportResult.transactionHash) {
    console.log(`   Transaction: ${reportResult.transactionHash}\n`);
  }

  // 4. Create Community Note
  if (verificationResult.evidenceUAL) {
    console.log('📝 Step 3: Creating Community Note...');
    const noteResult = await guardianService.createVerificationCommunityNote(
      reportResult.ual,
      verificationResult,
      'did:dkg:umanitek-guardian'
    );

    console.log(`   ✅ Community Note published: ${noteResult.ual}\n`);
  }

  // 5. Calculate creator safety score
  console.log('🛡️  Step 4: Calculating creator safety score...');
  const safetyScore = await guardianService.calculateCreatorSafetyScore(creatorId);

  console.log(`   Safety Score: ${(safetyScore.safetyScore * 100).toFixed(1)}%`);
  console.log(`   Total Verifications: ${safetyScore.totalVerifications}`);
  console.log(`   Flagged Count: ${safetyScore.flaggedCount}`);
  console.log(`   Average Confidence: ${(safetyScore.averageConfidence * 100).toFixed(1)}%\n`);

  // 6. Get reputation with safety score
  console.log('⭐ Step 5: Calculating reputation with safety score...');
  const reputation = await reputationCalculator.calculateReputation({
    contributions: [
      {
        id: 'contrib-1',
        type: 'github_pr',
        weight: 10,
        timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago
        age: 7,
      },
      {
        id: 'contrib-2',
        type: 'github_commit',
        weight: 5,
        timestamp: Date.now() - 14 * 24 * 60 * 60 * 1000, // 14 days ago
        age: 14,
      },
    ],
    algorithmWeights: {
      github_pr: 1.5,
      github_commit: 1.0,
    },
    timeDecayFactor: 0.01,
    userId: creatorId,
    includeSafetyScore: true, // Include Guardian safety score
  });

  console.log(`   Overall Reputation: ${reputation.overall}`);
  console.log(`   Safety Score: ${reputation.safetyScore ? (reputation.safetyScore * 100).toFixed(1) + '%' : 'N/A'}`);
  console.log(`   Combined Score: ${reputation.combinedScore || 'N/A'}`);
  console.log(`   Percentile: ${reputation.percentile}%\n`);

  // 7. Evaluate for slashing (if flagged)
  if (verificationResult.status === 'flagged' && verificationResult.confidence > 0.85) {
    console.log('⚖️  Step 6: Evaluating for slashing...');
    const slashResult = await polkadotApi.evaluateGuardianFlag(
      reportResult.ual,
      creatorId
    );

    if (slashResult.slashed) {
      console.log(`   ⚠️  Slashing triggered: ${slashResult.amount} TRAC`);
      console.log(`   Reason: ${slashResult.reason}`);
      console.log(`   Transaction: ${slashResult.transactionHash}\n`);
    } else {
      console.log(`   ✅ No slashing: ${slashResult.reason}\n`);
    }
  }

  // 8. Get verification history
  console.log('📊 Step 7: Getting verification history...');
  const history = await guardianService.getCreatorVerificationHistory(creatorId);
  console.log(`   Total verifications: ${history.length}`);
  if (history.length > 0) {
    console.log(`   Latest verification:`);
    const latest = history[0];
    console.log(`     - Status: ${latest.status}`);
    console.log(`     - Confidence: ${(latest.confidence * 100).toFixed(1)}%`);
    console.log(`     - UAL: ${latest.ual}\n`);
  }

  console.log('✅ Example complete!');
}

// Run example if executed directly
if (require.main === module) {
  guardianVerificationExample().catch((error) => {
    console.error('❌ Example failed:', error);
    process.exit(1);
  });
}

export { guardianVerificationExample };

