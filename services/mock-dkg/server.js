/**
 * Mock DKG Edge Node
 * Simulates OriginTrail DKG Edge Node for offline demos
 */

const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;
const DATA_DIR = path.join(__dirname, 'data');
const ASSETS_FILE = path.join(DATA_DIR, 'assets.json');

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(ASSETS_FILE);
    } catch {
      await fs.writeFile(ASSETS_FILE, JSON.stringify([], null, 2));
    }
  } catch (error) {
    console.error('Error setting up data directory:', error);
  }
}

// Load assets from disk
async function loadAssets() {
  try {
    const data = await fs.readFile(ASSETS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Save assets to disk
async function saveAssets(assets) {
  await fs.writeFile(ASSETS_FILE, JSON.stringify(assets, null, 2));
}

// Generate simulated UAL
function generateUAL(type, id) {
  const hash = crypto.createHash('sha256').update(`${type}:${id}:${Date.now()}`).digest('hex').substring(0, 16);
  return `urn:ual:dotrep:${type}:${hash}`;
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'mock-dkg' });
});

// Publish asset
app.post('/publish', async (req, res) => {
  try {
    const asset = req.body;
    
    if (!asset.id) {
      asset.id = generateUAL('asset', crypto.randomBytes(8).toString('hex'));
    }
    
    const assets = await loadAssets();
    assets.push({
      ...asset,
      publishedAt: new Date().toISOString(),
      ual: asset.id
    });
    
    await saveAssets(assets);
    
    res.json({
      ual: asset.id,
      contentHash: asset.contentHash,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error publishing asset:', error);
    res.status(500).json({ error: error.message });
  }
});

// SPARQL query endpoint (simplified)
app.post('/sparql', async (req, res) => {
  try {
    const { query } = req.body;
    const assets = await loadAssets();
    
    // Very simple SPARQL-like query parsing
    // In production, use a proper SPARQL engine
    let results = [];
    
    if (query.includes('SELECT') && query.includes('ReputationAsset')) {
      results = assets.filter(a => a.type === 'ReputationAsset');
    } else if (query.includes('SELECT') && query.includes('AccessReceipt')) {
      results = assets.filter(a => a.type === 'AccessReceipt');
    } else if (query.includes('SELECT') && query.includes('CommunityNote')) {
      results = assets.filter(a => a.type === 'CommunityNote');
    } else {
      // Return all assets
      results = assets;
    }
    
    res.json({
      results: {
        bindings: results.map(asset => ({
          asset: { value: asset.ual || asset.id, type: 'uri' },
          ...Object.entries(asset).reduce((acc, [key, value]) => {
            if (typeof value === 'string' || typeof value === 'number') {
              acc[key] = { value: String(value), type: 'literal' };
            }
            return acc;
          }, {})
        }))
      }
    });
  } catch (error) {
    console.error('Error executing SPARQL query:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get asset by UAL
app.get('/asset/:ual', async (req, res) => {
  try {
    const { ual } = req.params;
    const assets = await loadAssets();
    const asset = assets.find(a => (a.ual || a.id) === ual);
    
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    res.json(asset);
  } catch (error) {
    console.error('Error getting asset:', error);
    res.status(500).json({ error: error.message });
  }
});

// List all assets
app.get('/assets', async (req, res) => {
  try {
    const assets = await loadAssets();
    res.json({
      count: assets.length,
      assets: assets.map(a => ({
        ual: a.ual || a.id,
        type: a.type,
        publishedAt: a.publishedAt
      }))
    });
  } catch (error) {
    console.error('Error listing assets:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
async function start() {
  await ensureDataDir();
  
  app.listen(PORT, () => {
    console.log(`Mock DKG Edge Node running on http://localhost:${PORT}`);
    console.log(`Data directory: ${DATA_DIR}`);
  });
}

start().catch(console.error);

