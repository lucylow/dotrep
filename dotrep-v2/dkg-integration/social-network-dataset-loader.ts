/**
 * Social Network Dataset Loader
 * 
 * Comprehensive loader for social network datasets from various sources and formats.
 * Supports SNAP datasets, JSON, CSV, and other common formats used in social network research.
 * 
 * Key Features:
 * - Load datasets from SNAP format (edge lists, node lists)
 * - Support for weighted, signed, directed, and temporal networks
 * - Dataset validation and preprocessing
 * - Support for popular datasets (Bitcoin-OTC, Reddit, Facebook, etc.)
 * - Automatic format detection
 * - Graph statistics and validation
 * 
 * Based on research from Stanford SNAP, Network Repository, and other authoritative sources.
 */

import * as fs from 'fs';
import * as path from 'path';
import { GraphNode, GraphEdge, EdgeType } from './graph-algorithms';

export interface DatasetMetadata {
  name: string;
  source: string;
  description?: string;
  nodes: number;
  edges: number;
  directed: boolean;
  weighted: boolean;
  signed: boolean;
  temporal: boolean;
  format: 'snap' | 'json' | 'csv' | 'graphml' | 'gexf';
  properties?: Record<string, any>;
}

export interface DatasetLoadOptions {
  format?: 'auto' | 'snap' | 'json' | 'csv' | 'graphml' | 'gexf';
  directed?: boolean;
  weighted?: boolean;
  signed?: boolean;
  temporal?: boolean;
  skipValidation?: boolean;
  maxNodes?: number;
  maxEdges?: number;
  nodeFilter?: (nodeId: string) => boolean;
  edgeFilter?: (source: string, target: string) => boolean;
  normalizeWeights?: boolean;
  minWeight?: number;
  maxWeight?: number;
}

export interface LoadedDataset {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: DatasetMetadata;
  statistics: GraphStatistics;
}

export interface GraphStatistics {
  totalNodes: number;
  totalEdges: number;
  directed: boolean;
  weighted: boolean;
  signed: boolean;
  temporal: boolean;
  density: number;
  averageDegree: number;
  maxDegree: number;
  minDegree: number;
  selfLoops: number;
  isolatedNodes: number;
  connectedComponents?: number;
  averageClustering?: number;
  weightRange?: { 
    min: number; 
    max: number; 
    mean: number;
    trustRatio?: number; // For signed networks: ratio of positive weights
    distrustRatio?: number; // For signed networks: ratio of negative weights
  };
  timestampRange?: { min: number; max: number };
}

/**
 * Social Network Dataset Loader
 * 
 * Loads and processes social network datasets from various formats
 */
export class SocialNetworkDatasetLoader {
  /**
   * Load dataset from file
   * 
   * @param filePath - Path to dataset file
   * @param options - Loading options
   * @returns Loaded dataset with nodes, edges, and metadata
   */
  async loadFromFile(
    filePath: string,
    options: DatasetLoadOptions = {}
  ): Promise<LoadedDataset> {
    console.log(`📂 Loading social network dataset from: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Dataset file not found: ${filePath}`);
    }

    // Auto-detect format if not specified
    const format = options.format === 'auto' || !options.format
      ? this.detectFormat(filePath)
      : options.format;

    console.log(`📋 Detected format: ${format}`);

    let dataset: LoadedDataset;

    switch (format) {
      case 'snap':
        dataset = await this.loadSNAPFormat(filePath, options);
        break;
      case 'json':
        dataset = await this.loadJSONFormat(filePath, options);
        break;
      case 'csv':
        dataset = await this.loadCSVFormat(filePath, options);
        break;
      case 'graphml':
        dataset = await this.loadGraphMLFormat(filePath, options);
        break;
      case 'gexf':
        dataset = await this.loadGEXFFormat(filePath, options);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    // Validate dataset
    if (!options.skipValidation) {
      this.validateDataset(dataset);
    }

    // Compute statistics
    dataset.statistics = this.computeStatistics(dataset.nodes, dataset.edges, dataset.metadata);

    console.log(`✅ Loaded dataset: ${dataset.nodes.length} nodes, ${dataset.edges.length} edges`);
    console.log(`   Format: ${dataset.metadata.format}, Directed: ${dataset.metadata.directed}, Weighted: ${dataset.metadata.weighted}`);
    
    // Log enhanced statistics
    const stats = dataset.statistics;
    if (stats.connectedComponents !== undefined && stats.connectedComponents > 0) {
      console.log(`   Connected components: ${stats.connectedComponents}`);
    }
    if (stats.averageClustering !== undefined) {
      console.log(`   Average clustering: ${stats.averageClustering.toFixed(4)}`);
    }
    if (dataset.metadata.signed && stats.weightRange) {
      const wr = stats.weightRange as any;
      if (wr.trustRatio !== undefined) {
        console.log(`   Trust ratio: ${(wr.trustRatio * 100).toFixed(1)}% positive, ${(wr.distrustRatio * 100).toFixed(1)}% negative`);
      }
    }

    return dataset;
  }

  /**
   * Load dataset from URL (for remote datasets)
   * 
   * Downloads the dataset file if not already cached, then loads it.
   * 
   * @param url - URL to dataset file
   * @param options - Loading options
   * @param options.cacheDir - Directory to cache downloaded files (default: './data/cache')
   * @param options.forceDownload - Force re-download even if cached (default: false)
   * @returns Loaded dataset
   */
  async loadFromURL(
    url: string,
    options: DatasetLoadOptions & {
      cacheDir?: string;
      forceDownload?: boolean;
    } = {}
  ): Promise<LoadedDataset> {
    console.log(`🌐 Loading social network dataset from URL: ${url}`);

    const cacheDir = options.cacheDir || path.join(process.cwd(), 'data', 'cache');
    const urlHash = this.hashURL(url);
    const fileName = path.basename(url) || `dataset-${urlHash}.txt`;
    const cachedPath = path.join(cacheDir, fileName);

    // Create cache directory if it doesn't exist
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Check if file is already cached
    if (!options.forceDownload && fs.existsSync(cachedPath)) {
      console.log(`📦 Using cached dataset: ${cachedPath}`);
      return this.loadFromFile(cachedPath, options);
    }

    // Download the file
    console.log(`⬇️  Downloading dataset from URL...`);
    try {
      // Use fetch API (Node.js 18+) or node-fetch
      let fetchFn: typeof fetch;
      if (typeof fetch !== 'undefined') {
        fetchFn = fetch;
      } else {
        // Try to use node-fetch if available
        try {
          const nodeFetch = require('node-fetch');
          fetchFn = nodeFetch.default || nodeFetch;
        } catch {
          throw new Error(
            'Fetch API not available. Please install node-fetch or use Node.js 18+. ' +
            'Alternatively, download the dataset manually and use loadFromFile().'
          );
        }
      }

      const response = await fetchFn(url);
      if (!response.ok) {
        throw new Error(`Failed to download dataset: HTTP ${response.status} ${response.statusText}`);
      }

      // Read response as text (for text files) or buffer (for binary)
      const content = await response.text();
      
      // Save to cache
      fs.writeFileSync(cachedPath, content, 'utf-8');
      console.log(`✅ Downloaded and cached dataset: ${cachedPath}`);

      // Load from cached file
      return this.loadFromFile(cachedPath, options);
    } catch (error: any) {
      console.error(`❌ Failed to download dataset: ${error.message}`);
      throw new Error(
        `Failed to load dataset from URL: ${error.message}. ` +
        `Please download manually from ${url} and use loadFromFile().`
      );
    }
  }

  /**
   * Hash URL for cache filename
   */
  private hashURL(url: string): string {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(url).digest('hex').substring(0, 8);
  }

  /**
   * Load SNAP format dataset
   * 
   * SNAP format is commonly used by Stanford SNAP datasets.
   * Format: edge list with optional weights, signs, timestamps
   * Example: "1 2 0.5" or "1 2 0.5 1234567890" or "1 2 -1"
   */
  private async loadSNAPFormat(
    filePath: string,
    options: DatasetLoadOptions
  ): Promise<LoadedDataset> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 0 && !trimmed.startsWith('#');
    });

    const nodeSet = new Set<string>();
    const edges: GraphEdge[] = [];
    let hasWeights = false;
    let hasSigns = false;
    let hasTimestamps = false;

    // Parse edges
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 2) continue;

      const source = parts[0].trim();
      const target = parts[1].trim();
      
      if (!source || !target || source === target) continue;

      // Apply filters
      if (options.nodeFilter && (!options.nodeFilter(source) || !options.nodeFilter(target))) {
        continue;
      }
      if (options.edgeFilter && !options.edgeFilter(source, target)) {
        continue;
      }

      nodeSet.add(source);
      nodeSet.add(target);

      // Parse weight (3rd column)
      let weight = 1.0;
      let sign = 1;
      let timestamp: number | undefined;

      if (parts.length >= 3) {
        const value = parseFloat(parts[2]);
        if (!isNaN(value)) {
          weight = Math.abs(value);
          hasWeights = true;
          
          // Check if negative (signed network)
          if (value < 0) {
            sign = -1;
            hasSigns = true;
          }
        }
      }

      // Parse timestamp (4th column)
      if (parts.length >= 4) {
        const ts = parseFloat(parts[3]);
        if (!isNaN(ts)) {
          timestamp = ts > 1e10 ? ts : ts * 1000; // Handle both seconds and milliseconds
          hasTimestamps = true;
        }
      }

      // Normalize weight if requested
      if (options.normalizeWeights) {
        weight = Math.min(1.0, Math.max(0.0, weight));
      }

      // Apply weight filters
      if (options.minWeight !== undefined && weight < options.minWeight) continue;
      if (options.maxWeight !== undefined && weight > options.maxWeight) continue;

      // Apply limits
      if (options.maxNodes && nodeSet.size > options.maxNodes) break;
      if (options.maxEdges && edges.length >= options.maxEdges) break;

      edges.push({
        source,
        target,
        weight: weight * sign, // Include sign in weight
        edgeType: EdgeType.FOLLOW,
        timestamp: timestamp || Date.now(),
        metadata: {
          originalWeight: weight,
          sign: sign,
          ...(timestamp && { timestamp })
        }
      });
    }

    // Build nodes
    const nodes: GraphNode[] = Array.from(nodeSet).map(id => ({
      id,
      metadata: {}
    }));

    // Limit nodes if specified
    if (options.maxNodes && nodes.length > options.maxNodes) {
      const limitedNodes = nodes.slice(0, options.maxNodes);
      const nodeSetLimited = new Set(limitedNodes.map(n => n.id));
      const limitedEdges = edges.filter(e => 
        nodeSetLimited.has(e.source) && nodeSetLimited.has(e.target)
      );
      return {
        nodes: limitedNodes,
        edges: limitedEdges,
        metadata: {
          name: path.basename(filePath),
          source: filePath,
          nodes: limitedNodes.length,
          edges: limitedEdges.length,
          directed: options.directed !== false, // Default to directed for SNAP
          weighted: hasWeights || options.weighted === true,
          signed: hasSigns || options.signed === true,
          temporal: hasTimestamps || options.temporal === true,
          format: 'snap'
        },
        statistics: {} as GraphStatistics
      };
    }

    return {
      nodes,
      edges,
      metadata: {
        name: path.basename(filePath),
        source: filePath,
        nodes: nodes.length,
        edges: edges.length,
        directed: options.directed !== false,
        weighted: hasWeights || options.weighted === true,
        signed: hasSigns || options.signed === true,
        temporal: hasTimestamps || options.temporal === true,
        format: 'snap'
      },
      statistics: {} as GraphStatistics
    };
  }

  /**
   * Load JSON format dataset
   * 
   * Expected format:
   * {
   *   "nodes": [{"id": "1", ...}, ...],
   *   "edges": [{"source": "1", "target": "2", "weight": 0.5, ...}, ...]
   * }
   */
  private async loadJSONFormat(
    filePath: string,
    options: DatasetLoadOptions
  ): Promise<LoadedDataset> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // Load nodes
    if (Array.isArray(data.nodes)) {
      for (const node of data.nodes) {
        const nodeId = typeof node === 'string' ? node : (node.id || node.node || node.identifier);
        if (!nodeId) continue;

        if (options.nodeFilter && !options.nodeFilter(nodeId)) continue;
        if (options.maxNodes && nodes.length >= options.maxNodes) break;

        nodes.push({
          id: String(nodeId),
          metadata: typeof node === 'object' ? { ...node, id: undefined } : {}
        });
      }
    }

    // Load edges
    if (Array.isArray(data.edges)) {
      for (const edge of data.edges) {
        const source = edge.source || edge.from || edge.src || edge[0];
        const target = edge.target || edge.to || edge.dst || edge[1];
        
        if (!source || !target) continue;

        if (options.edgeFilter && !options.edgeFilter(String(source), String(target))) continue;
        if (options.maxEdges && edges.length >= options.maxEdges) break;

        const weight = edge.weight || edge.value || 1.0;
        const timestamp = edge.timestamp || edge.time || Date.now();

        // Apply filters
        if (options.minWeight !== undefined && weight < options.minWeight) continue;
        if (options.maxWeight !== undefined && weight > options.maxWeight) continue;

        edges.push({
          source: String(source),
          target: String(target),
          weight: options.normalizeWeights ? Math.min(1.0, Math.max(0.0, weight)) : weight,
          edgeType: this.parseEdgeType(edge.type || edge.edgeType),
          timestamp: typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime(),
          metadata: { ...edge, source: undefined, target: undefined, weight: undefined, timestamp: undefined }
        });
      }
    }

    return {
      nodes,
      edges,
      metadata: {
        name: data.name || path.basename(filePath),
        source: filePath,
        description: data.description,
        nodes: nodes.length,
        edges: edges.length,
        directed: data.directed !== false && options.directed !== false,
        weighted: data.weighted !== false && (options.weighted !== false && edges.some(e => e.weight !== 1.0)),
        signed: data.signed === true || options.signed === true,
        temporal: data.temporal === true || options.temporal === true || edges.some(e => e.timestamp),
        format: 'json',
        properties: data.properties || data.metadata
      },
      statistics: {} as GraphStatistics
    };
  }

  /**
   * Load CSV format dataset
   * 
   * Expected format: source,target,weight,timestamp
   */
  private async loadCSVFormat(
    filePath: string,
    options: DatasetLoadOptions
  ): Promise<LoadedDataset> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim().length > 0);

    const nodeSet = new Set<string>();
    const edges: GraphEdge[] = [];

    // Parse header
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const sourceIdx = header.indexOf('source') !== -1 ? header.indexOf('source') : 
                     header.indexOf('from') !== -1 ? header.indexOf('from') : 0;
    const targetIdx = header.indexOf('target') !== -1 ? header.indexOf('target') : 
                     header.indexOf('to') !== -1 ? header.indexOf('to') : 1;
    const weightIdx = header.indexOf('weight') !== -1 ? header.indexOf('weight') : 
                     header.indexOf('value') !== -1 ? header.indexOf('value') : -1;
    const timestampIdx = header.indexOf('timestamp') !== -1 ? header.indexOf('timestamp') : 
                       header.indexOf('time') !== -1 ? header.indexOf('time') : -1;

    // Parse rows
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim());
      if (parts.length < 2) continue;

      const source = parts[sourceIdx];
      const target = parts[targetIdx];
      
      if (!source || !target) continue;

      if (options.nodeFilter && (!options.nodeFilter(source) || !options.nodeFilter(target))) continue;
      if (options.edgeFilter && !options.edgeFilter(source, target)) continue;

      nodeSet.add(source);
      nodeSet.add(target);

      const weight = weightIdx >= 0 && parts[weightIdx] 
        ? parseFloat(parts[weightIdx]) || 1.0 
        : 1.0;
      const timestamp = timestampIdx >= 0 && parts[timestampIdx]
        ? (parseFloat(parts[timestampIdx]) || Date.now())
        : Date.now();

      if (options.minWeight !== undefined && weight < options.minWeight) continue;
      if (options.maxWeight !== undefined && weight > options.maxWeight) continue;

      if (options.maxNodes && nodeSet.size > options.maxNodes) break;
      if (options.maxEdges && edges.length >= options.maxEdges) break;

      edges.push({
        source,
        target,
        weight: options.normalizeWeights ? Math.min(1.0, Math.max(0.0, weight)) : weight,
        edgeType: EdgeType.FOLLOW,
        timestamp: timestamp > 1e10 ? timestamp : timestamp * 1000,
        metadata: {}
      });
    }

    const nodes: GraphNode[] = Array.from(nodeSet).map(id => ({
      id,
      metadata: {}
    }));

    return {
      nodes,
      edges,
      metadata: {
        name: path.basename(filePath),
        source: filePath,
        nodes: nodes.length,
        edges: edges.length,
        directed: options.directed !== false,
        weighted: weightIdx >= 0 || options.weighted === true,
        signed: options.signed === true,
        temporal: timestampIdx >= 0 || options.temporal === true,
        format: 'csv'
      },
      statistics: {} as GraphStatistics
    };
  }

  /**
   * Load GraphML format (placeholder - would need GraphML parser)
   */
  private async loadGraphMLFormat(
    filePath: string,
    options: DatasetLoadOptions
  ): Promise<LoadedDataset> {
    throw new Error('GraphML format not yet implemented. Please convert to JSON or SNAP format.');
  }

  /**
   * Load GEXF format (placeholder - would need GEXF parser)
   */
  private async loadGEXFFormat(
    filePath: string,
    options: DatasetLoadOptions
  ): Promise<LoadedDataset> {
    throw new Error('GEXF format not yet implemented. Please convert to JSON or SNAP format.');
  }

  /**
   * Detect file format from extension
   */
  private detectFormat(filePath: string): 'snap' | 'json' | 'csv' | 'graphml' | 'gexf' {
    const ext = path.extname(filePath).toLowerCase();
    
    switch (ext) {
      case '.json':
      case '.jsonld':
        return 'json';
      case '.csv':
      case '.tsv':
        return 'csv';
      case '.graphml':
        return 'graphml';
      case '.gexf':
        return 'gexf';
      case '.txt':
      case '.edges':
      case '.snap':
      default:
        // Try to detect SNAP format by checking first few lines
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const firstLines = content.split('\n').slice(0, 5).join('\n');
          // SNAP format typically has space-separated numbers
          if (/^\d+\s+\d+/.test(firstLines) || /^#/.test(firstLines)) {
            return 'snap';
          }
        } catch {
          // Fallback to snap
        }
        return 'snap';
    }
  }

  /**
   * Validate dataset structure
   * 
   * Enhanced validation with dataset-specific guidance and warnings
   */
  private validateDataset(dataset: LoadedDataset): void {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check nodes
    if (dataset.nodes.length === 0) {
      errors.push('Dataset has no nodes');
    }

    // Check for duplicate node IDs
    const nodeIds = new Set<string>();
    for (const node of dataset.nodes) {
      if (nodeIds.has(node.id)) {
        errors.push(`Duplicate node ID: ${node.id}`);
      }
      nodeIds.add(node.id);
    }

    // Check edges
    if (dataset.edges.length === 0) {
      errors.push('Dataset has no edges');
    }

    // Check edge references
    const validNodeIds = new Set(dataset.nodes.map(n => n.id));
    const invalidEdges: Array<{ source?: string; target?: string }> = [];
    
    for (const edge of dataset.edges) {
      if (!validNodeIds.has(edge.source)) {
        invalidEdges.push({ source: edge.source });
      }
      if (!validNodeIds.has(edge.target)) {
        invalidEdges.push({ target: edge.target });
      }
    }

    if (invalidEdges.length > 0) {
      const uniqueInvalid = new Set(invalidEdges.map(e => e.source || e.target));
      if (uniqueInvalid.size <= 10) {
        errors.push(`Edges reference non-existent nodes: ${Array.from(uniqueInvalid).join(', ')}`);
      } else {
        errors.push(`${invalidEdges.length} edges reference non-existent nodes (showing first 10: ${Array.from(uniqueInvalid).slice(0, 10).join(', ')})`);
      }
    }

    // Validate signed network properties
    if (dataset.metadata.signed) {
      const hasNegativeWeights = dataset.edges.some(e => e.weight < 0);
      if (!hasNegativeWeights) {
        warnings.push('Dataset marked as signed but no negative weights found. Consider setting signed: false');
      }
    }

    // Validate temporal properties
    if (dataset.metadata.temporal) {
      const hasTimestamps = dataset.edges.some(e => e.timestamp && e.timestamp > 0);
      if (!hasTimestamps) {
        warnings.push('Dataset marked as temporal but no valid timestamps found. Consider setting temporal: false');
      }
    }

    // Check for expected dataset size (if known dataset)
    const datasetName = dataset.metadata.name?.toLowerCase() || '';
    const knownDataset = SocialNetworkDatasetLoader.getDatasetInfo(datasetName);
    if (knownDataset) {
      const nodeRatio = dataset.nodes.length / knownDataset.expectedNodes;
      const edgeRatio = dataset.edges.length / knownDataset.expectedEdges;
      
      if (nodeRatio < 0.5 || edgeRatio < 0.5) {
        warnings.push(
          `Dataset size is significantly smaller than expected. ` +
          `Expected: ~${knownDataset.expectedNodes} nodes, ~${knownDataset.expectedEdges} edges. ` +
          `Got: ${dataset.nodes.length} nodes, ${dataset.edges.length} edges. ` +
          `This might indicate incomplete data or filtering.`
        );
      }
    }

    // Check graph connectivity
    const connectedComponents = dataset.statistics.connectedComponents;
    if (connectedComponents !== undefined && connectedComponents > 1) {
      warnings.push(
        `Graph has ${connectedComponents} connected components. ` +
        `This may affect reputation computation. Consider using largest connected component.`
      );
    }

    // Check for isolated nodes
    if (dataset.statistics.isolatedNodes > 0) {
      warnings.push(
        `Graph has ${dataset.statistics.isolatedNodes} isolated nodes (degree 0). ` +
        `These nodes will have zero reputation scores.`
      );
    }

    // Log warnings
    if (warnings.length > 0) {
      console.warn('⚠️  Dataset validation warnings:');
      warnings.forEach(warning => console.warn(`   - ${warning}`));
    }

    // Throw errors
    if (errors.length > 0) {
      const errorMsg = `Dataset validation failed:\n${errors.join('\n')}`;
      
      // Add helpful guidance for common errors
      if (errors.some(e => e.includes('non-existent'))) {
        throw new Error(
          `${errorMsg}\n\n` +
          `💡 Tip: Make sure all edge source/target nodes exist in the nodes array. ` +
          `If loading from SNAP format, nodes are automatically inferred from edges.`
        );
      }
      
      throw new Error(errorMsg);
    }
  }

  /**
   * Compute graph statistics
   * 
   * Enhanced statistics including connected components, clustering coefficient,
   * and signed network metrics (trust/distrust ratios)
   */
  private computeStatistics(
    nodes: GraphNode[],
    edges: GraphEdge[],
    metadata: DatasetMetadata
  ): GraphStatistics {
    const nodeSet = new Set(nodes.map(n => n.id));
    const degreeMap = new Map<string, number>();
    const inDegreeMap = new Map<string, number>();
    const outDegreeMap = new Map<string, number>();
    let selfLoops = 0;
    let totalWeight = 0;
    let weightCount = 0;
    let minWeight = Infinity;
    let maxWeight = -Infinity;
    let positiveWeights = 0;
    let negativeWeights = 0;
    const timestamps: number[] = [];
    const adjacencyMap = new Map<string, Set<string>>();

    // Initialize adjacency map
    for (const node of nodes) {
      adjacencyMap.set(node.id, new Set());
    }

    // Calculate degrees and other metrics
    for (const edge of edges) {
      // Self loops
      if (edge.source === edge.target) {
        selfLoops++;
        continue;
      }

      // Build adjacency for clustering coefficient
      adjacencyMap.get(edge.source)?.add(edge.target);
      if (!metadata.directed) {
        adjacencyMap.get(edge.target)?.add(edge.source);
      }

      // Degrees
      outDegreeMap.set(edge.source, (outDegreeMap.get(edge.source) || 0) + 1);
      inDegreeMap.set(edge.target, (inDegreeMap.get(edge.target) || 0) + 1);
      
      if (metadata.directed) {
        degreeMap.set(edge.source, (degreeMap.get(edge.source) || 0) + 1);
      } else {
        degreeMap.set(edge.source, (degreeMap.get(edge.source) || 0) + 1);
        degreeMap.set(edge.target, (degreeMap.get(edge.target) || 0) + 1);
      }

      // Weights
      if (metadata.weighted) {
        const absWeight = Math.abs(edge.weight);
        totalWeight += absWeight;
        weightCount++;
        minWeight = Math.min(minWeight, absWeight);
        maxWeight = Math.max(maxWeight, absWeight);

        // Signed network statistics
        if (metadata.signed) {
          if (edge.weight > 0) {
            positiveWeights++;
          } else if (edge.weight < 0) {
            negativeWeights++;
          }
        }
      }

      // Timestamps
      if (metadata.temporal && edge.timestamp) {
        timestamps.push(edge.timestamp);
      }
    }

    const degrees = Array.from(degreeMap.values());
    const averageDegree = degrees.length > 0 
      ? degrees.reduce((a, b) => a + b, 0) / degrees.length 
      : 0;
    const maxDegree = degrees.length > 0 ? Math.max(...degrees) : 0;
    const minDegree = degrees.length > 0 ? Math.min(...degrees) : 0;

    // Calculate density
    const n = nodes.length;
    const maxEdges = metadata.directed ? n * (n - 1) : (n * (n - 1)) / 2;
    const density = maxEdges > 0 ? edges.length / maxEdges : 0;

    // Isolated nodes
    const isolatedNodes = nodes.filter(n => !degreeMap.has(n.id)).length;

    // Connected components (simple BFS-based)
    const connectedComponents = this.computeConnectedComponents(nodes, edges, metadata.directed);

    // Average clustering coefficient (for undirected graphs or as local clustering)
    let averageClustering: number | undefined;
    if (!metadata.directed || metadata.directed) {
      averageClustering = this.computeAverageClustering(nodes, adjacencyMap, metadata.directed);
    }

    // Weight statistics
    const weightRange = metadata.weighted && weightCount > 0
      ? {
          min: minWeight,
          max: maxWeight,
          mean: totalWeight / weightCount
        }
      : undefined;

    // Signed network statistics
    if (metadata.signed && weightCount > 0) {
      const trustRatio = positiveWeights / weightCount;
      const distrustRatio = negativeWeights / weightCount;
      // Add to weightRange metadata if needed
      if (weightRange) {
        (weightRange as any).trustRatio = trustRatio;
        (weightRange as any).distrustRatio = distrustRatio;
      }
    }

    // Timestamp range
    const timestampRange = metadata.temporal && timestamps.length > 0
      ? {
          min: Math.min(...timestamps),
          max: Math.max(...timestamps)
        }
      : undefined;

    return {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      directed: metadata.directed,
      weighted: metadata.weighted,
      signed: metadata.signed,
      temporal: metadata.temporal,
      density,
      averageDegree,
      maxDegree,
      minDegree,
      selfLoops,
      isolatedNodes,
      connectedComponents,
      averageClustering,
      weightRange,
      timestampRange
    };
  }

  /**
   * Compute connected components using BFS
   */
  private computeConnectedComponents(
    nodes: GraphNode[],
    edges: GraphEdge[],
    directed: boolean
  ): number {
    const visited = new Set<string>();
    let components = 0;

    const buildAdjacency = () => {
      const adj = new Map<string, Set<string>>();
      for (const node of nodes) {
        adj.set(node.id, new Set());
      }
      for (const edge of edges) {
        adj.get(edge.source)?.add(edge.target);
        if (!directed) {
          adj.get(edge.target)?.add(edge.source);
        }
      }
      return adj;
    };

    const bfs = (start: string, adjacency: Map<string, Set<string>>) => {
      const queue = [start];
      visited.add(start);

      while (queue.length > 0) {
        const current = queue.shift()!;
        const neighbors = adjacency.get(current) || new Set();
        
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }
    };

    const adjacency = buildAdjacency();

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        bfs(node.id, adjacency);
        components++;
      }
    }

    return components;
  }

  /**
   * Compute average clustering coefficient
   */
  private computeAverageClustering(
    nodes: GraphNode[],
    adjacencyMap: Map<string, Set<string>>,
    directed: boolean
  ): number {
    let totalClustering = 0;
    let nodesWithNeighbors = 0;

    for (const node of nodes) {
      const neighbors = adjacencyMap.get(node.id) || new Set();
      const neighborCount = neighbors.size;

      if (neighborCount < 2) {
        continue; // Need at least 2 neighbors for clustering
      }

      nodesWithNeighbors++;

      // Count triangles (connected triplets)
      let triangles = 0;
      const neighborArray = Array.from(neighbors);

      for (let i = 0; i < neighborArray.length; i++) {
        for (let j = i + 1; j < neighborArray.length; j++) {
          const n1 = neighborArray[i];
          const n2 = neighborArray[j];
          const n1Neighbors = adjacencyMap.get(n1) || new Set();
          
          if (n1Neighbors.has(n2)) {
            triangles++;
            if (directed) {
              // Check reverse edge too
              const n2Neighbors = adjacencyMap.get(n2) || new Set();
              if (n2Neighbors.has(n1)) {
                triangles++; // Count both directions
              }
            }
          }
        }
      }

      // Clustering coefficient for this node
      const possibleTriangles = directed
        ? neighborCount * (neighborCount - 1)
        : (neighborCount * (neighborCount - 1)) / 2;
      
      const clustering = possibleTriangles > 0 ? triangles / possibleTriangles : 0;
      totalClustering += clustering;
    }

    return nodesWithNeighbors > 0 ? totalClustering / nodesWithNeighbors : 0;
  }

  /**
   * Parse edge type from string
   */
  private parseEdgeType(type: string | undefined): EdgeType {
    if (!type) return EdgeType.FOLLOW;
    
    const typeStr = String(type).toLowerCase();
    if (typeStr.includes('follow') || typeStr.includes('friend')) return EdgeType.FOLLOW;
    if (typeStr.includes('collaborate')) return EdgeType.COLLABORATE;
    if (typeStr.includes('endorse') || typeStr.includes('trust')) return EdgeType.ENDORSE;
    if (typeStr.includes('pay') || typeStr.includes('payment')) return EdgeType.PAYMENT;
    if (typeStr.includes('review')) return EdgeType.REVIEW;
    if (typeStr.includes('stake')) return EdgeType.STAKE;
    if (typeStr.includes('trust')) return EdgeType.TRUST;
    
    return EdgeType.FOLLOW;
  }

  /**
   * Get dataset information for popular datasets
   * 
   * Returns comprehensive metadata including download URLs and recommended use cases
   */
  static getDatasetInfo(datasetName: string): {
    name: string;
    url: string;
    downloadUrl?: string;
    description: string;
    format: string;
    expectedNodes: number;
    expectedEdges: number;
    properties: Record<string, any>;
    recommendedFor?: string[];
    citation?: string;
    license?: string;
  } | null {
    const datasets: Record<string, any> = {
      'bitcoin-otc': {
        name: 'Bitcoin OTC Trust Network',
        url: 'https://snap.stanford.edu/data/soc-sign-bitcoin-otc.html',
        downloadUrl: 'https://snap.stanford.edu/data/soc-sign-bitcoin-otc.txt.gz',
        description: 'Weighted, signed, directed, temporal web of trust network from Bitcoin OTC marketplace',
        format: 'snap',
        expectedNodes: 5881,
        expectedEdges: 35592,
        properties: {
          weighted: true,
          signed: true,
          directed: true,
          temporal: true,
          type: 'trust_network',
          weightRange: [-10, 10],
          timeSpan: '2009-2016'
        },
        recommendedFor: ['trust_modeling', 'sybil_detection', 'reputation_systems', 'signed_networks'],
        citation: 'Kumar et al. (2016) - "Edge Weight Prediction in Weighted Signed Networks"',
        license: 'Academic use'
      },
      'bitcoin-alpha': {
        name: 'Bitcoin Alpha Trust Network',
        url: 'https://snap.stanford.edu/data/soc-sign-bitcoin-alpha.html',
        downloadUrl: 'https://snap.stanford.edu/data/soc-sign-bitcoin-alpha.txt.gz',
        description: 'Weighted, signed, directed, temporal web of trust network from Bitcoin Alpha marketplace',
        format: 'snap',
        expectedNodes: 3783,
        expectedEdges: 24186,
        properties: {
          weighted: true,
          signed: true,
          directed: true,
          temporal: true,
          type: 'trust_network',
          weightRange: [-10, 10],
          timeSpan: '2010-2016'
        },
        recommendedFor: ['trust_modeling', 'sybil_detection', 'reputation_systems', 'signed_networks'],
        citation: 'Kumar et al. (2016) - "Edge Weight Prediction in Weighted Signed Networks"',
        license: 'Academic use'
      },
      'reddit-hyperlinks': {
        name: 'Reddit Hyperlinks Network',
        url: 'https://snap.stanford.edu/data/soc-RedditHyperlinks.html',
        downloadUrl: 'https://snap.stanford.edu/data/soc-RedditHyperlinks-body.tsv',
        description: 'Signed, attributed hyperlinks between subreddits with temporal information',
        format: 'snap',
        expectedNodes: 55863,
        expectedEdges: 858490,
        properties: {
          weighted: false,
          signed: true,
          directed: true,
          temporal: true,
          type: 'social_network',
          timeSpan: '2014-2017'
        },
        recommendedFor: ['social_network_analysis', 'community_detection', 'temporal_analysis'],
        citation: 'Kumar et al. (2018) - "Community Interaction and Conflict on the Web"',
        license: 'Academic use'
      },
      'facebook-ego': {
        name: 'Facebook Ego Network',
        url: 'https://snap.stanford.edu/data/ego-Facebook.html',
        downloadUrl: 'https://snap.stanford.edu/data/facebook_combined.txt.gz',
        description: 'Undirected social circles from Facebook (anonymized)',
        format: 'snap',
        expectedNodes: 4039,
        expectedEdges: 88234,
        properties: {
          weighted: false,
          signed: false,
          directed: false,
          temporal: false,
          type: 'social_network'
        },
        recommendedFor: ['social_network_analysis', 'community_detection', 'prototyping'],
        citation: 'Leskovec & Mcauley (2012) - "Learning to Discover Social Circles in Ego Networks"',
        license: 'Academic use'
      },
      'wiki-vote': {
        name: 'Wikipedia Vote Network',
        url: 'https://snap.stanford.edu/data/wiki-Vote.html',
        downloadUrl: 'https://snap.stanford.edu/data/wiki-Vote.txt.gz',
        description: 'Directed network of who votes for whom on Wikipedia administrator elections',
        format: 'snap',
        expectedNodes: 7115,
        expectedEdges: 103689,
        properties: {
          weighted: false,
          signed: false,
          directed: true,
          temporal: false,
          type: 'peer_evaluation'
        },
        recommendedFor: ['peer_evaluation', 'reputation_systems', 'prototyping'],
        citation: 'Leskovec et al. (2010) - "Signed Networks in Social Media"',
        license: 'Academic use'
      },
      'epinions': {
        name: 'Epinions Trust Network',
        url: 'https://snap.stanford.edu/data/soc-Epinions1.html',
        downloadUrl: 'https://snap.stanford.edu/data/soc-Epinions1.txt.gz',
        description: 'Who-trusts-whom network from Epinions.com product review platform',
        format: 'snap',
        expectedNodes: 75879,
        expectedEdges: 508837,
        properties: {
          weighted: false,
          signed: false,
          directed: true,
          temporal: false,
          type: 'trust_network'
        },
        recommendedFor: ['trust_modeling', 'reputation_systems', 'large_scale_analysis'],
        citation: 'Richardson et al. (2003) - "Trust Management for the Semantic Web"',
        license: 'Academic use'
      },
      'academia': {
        name: 'Academia.edu Social Network',
        url: 'https://networkrepository.com/academia.php',
        description: 'Social network from Academia.edu academic social network',
        format: 'snap',
        expectedNodes: 200200,
        expectedEdges: 1400000,
        properties: {
          weighted: false,
          signed: false,
          directed: true,
          temporal: false,
          type: 'social_network'
        },
        recommendedFor: ['social_network_analysis', 'scalability_testing', 'large_scale_analysis'],
        license: 'Academic use'
      }
    };

    const key = datasetName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return datasets[key] || null;
  }

  /**
   * Get download URL for a dataset
   * 
   * @param datasetName - Name of the dataset
   * @returns Direct download URL or null if not available
   */
  static getDatasetDownloadUrl(datasetName: string): string | null {
    const info = this.getDatasetInfo(datasetName);
    return info?.downloadUrl || null;
  }

  /**
   * List all available datasets with their properties
   * 
   * @returns Array of dataset information objects
   */
  static listAvailableDatasets(): Array<{
    key: string;
    name: string;
    nodes: number;
    edges: number;
    type: string;
    properties: string[];
  }> {
    const datasetKeys = [
      'bitcoin-otc',
      'bitcoin-alpha',
      'reddit-hyperlinks',
      'facebook-ego',
      'wiki-vote',
      'epinions',
      'academia'
    ];

    return datasetKeys.map(key => {
      const info = this.getDatasetInfo(key);
      if (!info) return null;

      const properties: string[] = [];
      if (info.properties.weighted) properties.push('Weighted');
      if (info.properties.signed) properties.push('Signed');
      if (info.properties.directed) properties.push('Directed');
      else properties.push('Undirected');
      if (info.properties.temporal) properties.push('Temporal');

      return {
        key,
        name: info.name,
        nodes: info.expectedNodes,
        edges: info.expectedEdges,
        type: info.properties.type,
        properties
      };
    }).filter(Boolean) as Array<{
      key: string;
      name: string;
      nodes: number;
      edges: number;
      type: string;
      properties: string[];
    }>;
  }
}

/**
 * Download a dataset from SNAP or other sources
 * 
 * @param datasetName - Name of the dataset (e.g., 'bitcoin-otc')
 * @param options - Download options
 * @param options.outputDir - Directory to save the dataset (default: './data')
 * @param options.forceDownload - Force re-download even if file exists (default: false)
 * @returns Path to downloaded file
 */
export async function downloadDataset(
  datasetName: string,
  options: {
    outputDir?: string;
    forceDownload?: boolean;
  } = {}
): Promise<string> {
  const info = SocialNetworkDatasetLoader.getDatasetInfo(datasetName);
  if (!info) {
    throw new Error(
      `Unknown dataset: ${datasetName}. ` +
      `Available datasets: ${SocialNetworkDatasetLoader.listAvailableDatasets().map(d => d.key).join(', ')}`
    );
  }

  if (!info.downloadUrl) {
    throw new Error(
      `No direct download URL available for ${datasetName}. ` +
      `Please visit ${info.url} to download manually.`
    );
  }

  const outputDir = options.outputDir || path.join(process.cwd(), 'data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const fileName = path.basename(info.downloadUrl) || `${datasetName}.txt.gz`;
  const outputPath = path.join(outputDir, fileName);

  // Check if already downloaded
  if (!options.forceDownload && fs.existsSync(outputPath)) {
    console.log(`✅ Dataset already exists: ${outputPath}`);
    return outputPath;
  }

  console.log(`⬇️  Downloading ${info.name} from ${info.downloadUrl}...`);
  console.log(`   Saving to: ${outputPath}`);

  try {
    // Use fetch API (Node.js 18+) or node-fetch
    let fetchFn: typeof fetch;
    if (typeof fetch !== 'undefined') {
      fetchFn = fetch;
    } else {
      try {
        const nodeFetch = require('node-fetch');
        fetchFn = nodeFetch.default || nodeFetch;
      } catch {
        throw new Error(
          'Fetch API not available. Please install node-fetch or use Node.js 18+. ' +
          `Alternatively, download manually from ${info.downloadUrl}`
        );
      }
    }

    const response = await fetchFn(info.downloadUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    // Handle gzipped files
    const isGzipped = fileName.endsWith('.gz');
    let content: Buffer | string;

    if (isGzipped) {
      const arrayBuffer = await response.arrayBuffer();
      const zlib = require('zlib');
      content = zlib.gunzipSync(Buffer.from(arrayBuffer));
    } else {
      content = await response.text();
    }

    // Save file
    if (Buffer.isBuffer(content)) {
      fs.writeFileSync(outputPath.replace('.gz', ''), content);
    } else {
      fs.writeFileSync(outputPath.replace('.gz', ''), content, 'utf-8');
    }

    console.log(`✅ Downloaded successfully: ${outputPath.replace('.gz', '')}`);
    return outputPath.replace('.gz', '');
  } catch (error: any) {
    console.error(`❌ Failed to download dataset: ${error.message}`);
    throw new Error(
      `Failed to download ${datasetName}: ${error.message}. ` +
      `Please download manually from ${info.url}`
    );
  }
}

/**
 * Factory function to create a dataset loader instance
 */
export function createSocialNetworkDatasetLoader(): SocialNetworkDatasetLoader {
  return new SocialNetworkDatasetLoader();
}

export default SocialNetworkDatasetLoader;

