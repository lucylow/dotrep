/**
 * Example Usage of DKG Social Reputation Mock Data
 * 
 * This file demonstrates how to use the DKG knowledge assets mock data
 * in your frontend components.
 */

import {
  allDKGKnowledgeAssets,
  getKnowledgeAssetByUAL,
  getLinkedAssets,
  getSocialReputationProfiles,
  getCampaignAssets,
  searchKnowledgeAssets,
  getVerifiedAssets,
  getAssetsByReputationScore,
  getKnowledgeGraphStats,
  exportAllAsJSONLD,
  getAssetNetworkGraph
} from './dkgSocialReputationMockData';

// ========== Example 1: Get a specific asset by UAL ==========
export function exampleGetAssetByUAL() {
  const ual = 'did:dkg:otp:20430:0x1234567890abcdef1234567890abcdef12345678';
  const asset = getKnowledgeAssetByUAL(ual);
  
  if (asset) {
    console.log('Asset found:', asset.jsonld.name);
    console.log('Reputation Score:', asset.jsonld['dotrep:reputationScore']);
    console.log('Linked Assets:', asset.linkedAssets);
  }
  
  return asset;
}

// ========== Example 2: Get all linked assets ==========
export function exampleGetLinkedAssets() {
  const ual = 'did:dkg:otp:20430:0x1234567890abcdef1234567890abcdef12345678';
  const linked = getLinkedAssets(ual);
  
  console.log(`Found ${linked.length} linked assets`);
  linked.forEach(asset => {
    console.log(`- ${asset.jsonld.name} (${asset.ual})`);
  });
  
  return linked;
}

// ========== Example 3: Search assets ==========
export function exampleSearchAssets() {
  const results = searchKnowledgeAssets('blockchain');
  
  console.log(`Found ${results.length} assets matching "blockchain"`);
  results.forEach(asset => {
    console.log(`- ${asset.jsonld.name}`);
  });
  
  return results;
}

// ========== Example 4: Get all social reputation profiles ==========
export function exampleGetProfiles() {
  const profiles = getSocialReputationProfiles();
  
  console.log(`Found ${profiles.length} social reputation profiles`);
  profiles.forEach(profile => {
    const score = profile.jsonld['dotrep:reputationScore']?.['@value'] || 
                  profile.jsonld['dotrep:reputationScore'];
    console.log(`- ${profile.jsonld.name}: ${score}`);
  });
  
  return profiles;
}

// ========== Example 5: Filter by reputation score ==========
export function exampleFilterByScore() {
  const highReputation = getAssetsByReputationScore(0.85, 1.0);
  
  console.log(`Found ${highReputation.length} assets with reputation >= 0.85`);
  highReputation.forEach(asset => {
    const score = asset.jsonld['dotrep:reputationScore']?.['@value'] || 
                  asset.jsonld['dotrep:reputationScore'];
    console.log(`- ${asset.jsonld.name}: ${score}`);
  });
  
  return highReputation;
}

// ========== Example 6: Get knowledge graph statistics ==========
export function exampleGetStats() {
  const stats = getKnowledgeGraphStats();
  
  console.log('Knowledge Graph Statistics:');
  console.log(`- Total Assets: ${stats.totalAssets}`);
  console.log(`- Verified Assets: ${stats.verifiedAssets}`);
  console.log(`- Social Reputation Profiles: ${stats.socialReputationProfiles}`);
  console.log(`- Campaign Assets: ${stats.campaignAssets}`);
  console.log(`- Connection Assets: ${stats.connectionAssets}`);
  console.log(`- Total Links: ${stats.totalLinks}`);
  console.log(`- Average Links per Asset: ${stats.averageLinksPerAsset.toFixed(2)}`);
  
  return stats;
}

// ========== Example 7: Export as JSON-LD for SPARQL queries ==========
export function exampleExportJSONLD() {
  const jsonldArray = exportAllAsJSONLD();
  
  // This can be used for SPARQL queries or sent to DKG
  console.log(`Exported ${jsonldArray.length} assets as JSON-LD`);
  console.log('Sample JSON-LD:', JSON.stringify(jsonldArray[0], null, 2));
  
  return jsonldArray;
}

// ========== Example 8: Get network graph for visualization ==========
export function exampleGetNetworkGraph() {
  const graph = getAssetNetworkGraph();
  
  console.log(`Network Graph: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);
  console.log('Nodes:', graph.nodes.map(n => n.label));
  console.log('Edges:', graph.edges.map(e => `${e.from} -> ${e.to}`));
  
  // This can be used with visualization libraries like D3.js, vis.js, etc.
  return graph;
}

// ========== Example 9: React Component Usage ==========
/*
import React from 'react';
import { getSocialReputationProfiles, getKnowledgeAssetByUAL } from './dkgSocialReputationMockData';

export function SocialReputationProfileList() {
  const profiles = getSocialReputationProfiles();
  
  return (
    <div>
      <h2>Social Reputation Profiles</h2>
      {profiles.map(profile => {
        const score = profile.jsonld['dotrep:reputationScore']?.['@value'] || 
                     profile.jsonld['dotrep:reputationScore'];
        return (
          <div key={profile.ual}>
            <h3>{profile.jsonld.name}</h3>
            <p>Reputation Score: {score}</p>
            <p>UAL: {profile.ual}</p>
            <p>Linked Assets: {profile.linkedAssets.length}</p>
          </div>
        );
      })}
    </div>
  );
}

export function AssetDetailView({ ual }: { ual: string }) {
  const asset = getKnowledgeAssetByUAL(ual);
  
  if (!asset) {
    return <div>Asset not found</div>;
  }
  
  const jsonld = asset.jsonld;
  const score = jsonld['dotrep:reputationScore']?.['@value'] || 
                jsonld['dotrep:reputationScore'];
  
  return (
    <div>
      <h1>{jsonld.name}</h1>
      <p>{jsonld.description}</p>
      <p>Reputation Score: {score}</p>
      <p>Verification Status: {asset.verificationStatus}</p>
      {asset.neuroWebAnchor && (
        <div>
          <p>Blockchain Anchor:</p>
          <p>Block: {asset.neuroWebAnchor.blockNumber}</p>
          <p>TX: {asset.neuroWebAnchor.transactionHash}</p>
        </div>
      )}
      <div>
        <h3>Linked Assets:</h3>
        {asset.linkedAssets.map(linkedUAL => (
          <div key={linkedUAL}>{linkedUAL}</div>
        ))}
      </div>
    </div>
  );
}
*/

// ========== Example 10: Validate JSON-LD structure ==========
export function exampleValidateJSONLD() {
  const assets = allDKGKnowledgeAssets;
  const errors: string[] = [];
  
  assets.forEach(asset => {
    // Check required fields
    if (!asset.jsonld['@context']) {
      errors.push(`Asset ${asset.ual} missing @context`);
    }
    if (!asset.jsonld['@type']) {
      errors.push(`Asset ${asset.ual} missing @type`);
    }
    if (!asset.jsonld['@id']) {
      errors.push(`Asset ${asset.ual} missing @id`);
    }
    if (!asset.ual) {
      errors.push(`Asset missing UAL`);
    }
    if (!asset.contentHash) {
      errors.push(`Asset ${asset.ual} missing contentHash`);
    }
  });
  
  if (errors.length > 0) {
    console.error('Validation errors:', errors);
    return false;
  }
  
  console.log('All assets validated successfully!');
  return true;
}

