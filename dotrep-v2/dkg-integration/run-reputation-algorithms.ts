#!/usr/bin/env ts-node
/**
 * 🚀 Reputation Algorithms Runner Script
 * 
 * Executable script to run reputation algorithms on social graph data.
 * 
 * Usage:
 *   ts-node run-reputation-algorithms.ts [options]
 * 
 * Options:
 *   --quick-demo          Run quick demo with sample data
 *   --dataset <file>      Load dataset from file (SNAP, JSON, CSV)
 *   --users <list>        Comma-separated list of user IDs to compute
 *   --multi-dimensional   Enable multi-dimensional reputation
 *   --batch               Enable batch processing
 *   --publish             Publish results to DKG
 *   --mock                Use mock mode (no real DKG connection)
 */

import { runReputationAlgorithms, createReputationAlgorithmRunner } from './reputation-algorithm-runner';
import { GraphNode, GraphEdge, EdgeType } from './graph-algorithms';

// Parse command line arguments
function parseArgs(): {
  quickDemo?: boolean;
  datasetFile?: string;
  userList?: string[];
  enableMultiDimensional?: boolean;
  enableBatchProcessing?: boolean;
  publishToDKG?: boolean;
  useMockMode?: boolean;
} {
  const args = process.argv.slice(2);
  const options: any = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--quick-demo') {
      options.quickDemo = true;
    } else if (arg === '--multi-dimensional') {
      options.enableMultiDimensional = true;
    } else if (arg === '--batch') {
      options.enableBatchProcessing = true;
    } else if (arg === '--publish') {
      options.publishToDKG = true;
    } else if (arg === '--mock') {
      options.useMockMode = true;
    } else if (arg === '--dataset' && i + 1 < args.length) {
      options.datasetFile = args[++i];
    } else if (arg === '--users' && i + 1 < args.length) {
      options.userList = args[++i].split(',').map(u => u.trim());
    }
  }

  return options;
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Reputation Algorithms Runner\n');
  console.log('='.repeat(60));
  console.log('');

  const options = parseArgs();

  try {
    if (options.quickDemo) {
      console.log('Running quick demo with sample data...\n');
      const runner = createReputationAlgorithmRunner({
        useMockMode: true,
        enableMultiDimensional: true,
        enableBatchProcessing: true
      });
      await runner.runQuickDemo();
    } else {
      console.log('Running reputation algorithms...\n');
      console.log('Configuration:');
      if (options.datasetFile) {
        console.log(`  Dataset: ${options.datasetFile}`);
      }
      if (options.userList) {
        console.log(`  Users: ${options.userList.length} users`);
      }
      console.log(`  Multi-dimensional: ${options.enableMultiDimensional ? 'Yes' : 'No'}`);
      console.log(`  Batch processing: ${options.enableBatchProcessing ? 'Yes' : 'No'}`);
      console.log(`  Publish to DKG: ${options.publishToDKG ? 'Yes' : 'No'}`);
      console.log(`  Mock mode: ${options.useMockMode ? 'Yes' : 'No'}`);
      console.log('');

      const result = await runReputationAlgorithms({
        datasetFile: options.datasetFile,
        userList: options.userList,
        enableMultiDimensional: options.enableMultiDimensional,
        enableBatchProcessing: options.enableBatchProcessing,
        publishToDKG: options.publishToDKG
      });

      console.log('\n📊 Results Summary:');
      console.log(`  Total users processed: ${result.scores.size}`);
      console.log(`  Processing time: ${(result.processingTime / 1000).toFixed(2)}s`);
      
      if (result.snapshotUAL) {
        console.log(`  DKG Snapshot UAL: ${result.snapshotUAL}`);
      }

      // Display top 10 users
      if (result.scores.size > 0) {
        console.log('\n📈 Top 10 Users by Reputation:\n');
        const sorted = Array.from(result.scores.entries())
          .sort((a, b) => b[1].finalScore - a[1].finalScore)
          .slice(0, 10);

        sorted.forEach(([userId, result], index) => {
          console.log(`${(index + 1).toString().padStart(2)}. ${userId}`);
          console.log(`     Score: ${(result.finalScore * 100).toFixed(1)}/100`);
          console.log(`     Sybil Risk: ${(result.sybilRisk * 100).toFixed(1)}%`);
          console.log(`     Confidence: ${(result.confidence * 100).toFixed(1)}%`);
          if (result.componentScores.structural !== undefined) {
            console.log(`     Structural: ${(result.componentScores.structural * 100).toFixed(1)}/100`);
          }
          if (result.componentScores.behavioral !== undefined) {
            console.log(`     Behavioral: ${(result.componentScores.behavioral * 100).toFixed(1)}/100`);
          }
          console.log('');
        });
      }
    }

    console.log('✅ Reputation algorithms completed successfully!\n');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Error running reputation algorithms:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main };

