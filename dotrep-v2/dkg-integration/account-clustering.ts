/**
 * Advanced Account Clustering Algorithms
 * 
 * Implements multiple clustering methods for detecting account clusters:
 * - DBSCAN (Density-Based Spatial Clustering of Applications with Noise)
 * - Connectivity-based clustering (Union-Find with similarity thresholds)
 * - Hierarchical clustering
 * - Similarity-based clustering with feature engineering
 * 
 * Based on best practices for fraud detection and account clustering.
 */

export interface Account {
  accountId: string;
  reputation?: number;
  contributions?: Array<{ timestamp: number; block: number; type?: string }>;
  connections?: Array<{ target: string; weight: number }>;
  metadata?: {
    emailDomain?: string;
    registrationDate?: number;
    activityLevel?: number;
    stake?: number;
    paymentHistory?: number;
    [key: string]: any;
  };
}

export interface AccountPair {
  account1: string;
  account2: string;
  similarity: number;
  features: {
    sharedConnections: number;
    connectionOverlap: number;
    temporalSimilarity: number;
    metadataSimilarity: number;
    graphDistance: number;
  };
}

export interface Cluster {
  clusterId: string;
  accounts: string[];
  size: number;
  density: number; // Average similarity within cluster
  cohesion: number; // Internal connectivity measure
  riskScore: number;
  patterns: string[];
}

export interface ClusteringConfig {
  method: 'dbscan' | 'connectivity' | 'hierarchical' | 'similarity';
  minSimilarity?: number; // Minimum similarity to form a cluster (0-1)
  minClusterSize?: number; // Minimum accounts in a cluster
  maxClusterSize?: number; // Maximum accounts in a cluster
  dbscanEps?: number; // DBSCAN epsilon parameter
  dbscanMinPts?: number; // DBSCAN minimum points parameter
  featureWeights?: {
    sharedConnections?: number;
    connectionOverlap?: number;
    temporalSimilarity?: number;
    metadataSimilarity?: number;
    graphDistance?: number;
  };
}

/**
 * Advanced Account Clustering Service
 */
export class AccountClusteringService {
  private config: Required<ClusteringConfig>;

  constructor(config: ClusteringConfig = { method: 'connectivity' }) {
    this.config = {
      method: config.method || 'connectivity',
      minSimilarity: config.minSimilarity ?? 0.3,
      minClusterSize: config.minClusterSize ?? 2,
      maxClusterSize: config.maxClusterSize ?? 1000,
      dbscanEps: config.dbscanEps ?? 0.5,
      dbscanMinPts: config.dbscanMinPts ?? 2,
      featureWeights: {
        sharedConnections: config.featureWeights?.sharedConnections ?? 0.3,
        connectionOverlap: config.featureWeights?.connectionOverlap ?? 0.25,
        temporalSimilarity: config.featureWeights?.temporalSimilarity ?? 0.2,
        metadataSimilarity: config.featureWeights?.metadataSimilarity ?? 0.15,
        graphDistance: config.featureWeights?.graphDistance ?? 0.1,
      },
    };
  }

  /**
   * Find clusters of accounts using the configured method
   */
  findClusters(accounts: Account[]): Cluster[] {
    if (accounts.length === 0) return [];

    switch (this.config.method) {
      case 'dbscan':
        return this.dbscanClustering(accounts);
      case 'connectivity':
        return this.connectivityBasedClustering(accounts);
      case 'hierarchical':
        return this.hierarchicalClustering(accounts);
      case 'similarity':
        return this.similarityBasedClustering(accounts);
      default:
        return this.connectivityBasedClustering(accounts);
    }
  }

  /**
   * Find optimal clustering parameters using elbow method and silhouette analysis
   * Helps determine the best minSimilarity threshold for connectivity-based clustering
   */
  findOptimalParameters(
    accounts: Account[],
    similarityRange: { min: number; max: number; step: number } = { min: 0.1, max: 0.9, step: 0.1 }
  ): {
    optimalSimilarity: number;
    metrics: Array<{
      similarity: number;
      clusterCount: number;
      avgClusterSize: number;
      avgDensity: number;
      silhouetteScore: number;
    }>;
  } {
    const metrics: Array<{
      similarity: number;
      clusterCount: number;
      avgClusterSize: number;
      avgDensity: number;
      silhouetteScore: number;
    }> = [];

    // Test different similarity thresholds
    for (let similarity = similarityRange.min; similarity <= similarityRange.max; similarity += similarityRange.step) {
      const originalSimilarity = this.config.minSimilarity;
      this.config.minSimilarity = similarity;

      const clusters = this.findClusters(accounts);
      
      if (clusters.length === 0) {
        this.config.minSimilarity = originalSimilarity;
        continue;
      }

      const avgClusterSize = clusters.reduce((sum, c) => sum + c.size, 0) / clusters.length;
      const avgDensity = clusters.reduce((sum, c) => sum + c.density, 0) / clusters.length;
      const silhouetteScore = this.calculateSilhouetteScore(accounts, clusters);

      metrics.push({
        similarity,
        clusterCount: clusters.length,
        avgClusterSize,
        avgDensity,
        silhouetteScore,
      });

      this.config.minSimilarity = originalSimilarity;
    }

    // Find optimal similarity (elbow method: balance between cluster count and quality)
    // Prefer higher silhouette score with reasonable cluster count
    const optimal = metrics.reduce((best, current) => {
      // Score: silhouette * (1 - normalized cluster count penalty)
      const clusterCountPenalty = Math.min(1, current.clusterCount / accounts.length);
      const currentScore = current.silhouetteScore * (1 - clusterCountPenalty * 0.3);
      
      const bestClusterCountPenalty = Math.min(1, best.clusterCount / accounts.length);
      const bestScore = best.silhouetteScore * (1 - bestClusterCountPenalty * 0.3);

      return currentScore > bestScore ? current : best;
    }, metrics[0] || { similarity: 0.3, clusterCount: 0, avgClusterSize: 0, avgDensity: 0, silhouetteScore: 0 });

    return {
      optimalSimilarity: optimal.similarity,
      metrics,
    };
  }

  /**
   * Calculate silhouette score for cluster quality assessment
   * Higher score (closer to 1) indicates better clustering
   */
  private calculateSilhouetteScore(accounts: Account[], clusters: Cluster[]): number {
    if (clusters.length === 0) return 0;

    const accountToCluster = new Map<string, number>();
    clusters.forEach((cluster, idx) => {
      cluster.accounts.forEach(accountId => {
        accountToCluster.set(accountId, idx);
      });
    });

    let totalSilhouette = 0;
    let count = 0;

    for (const account of accounts) {
      const clusterIdx = accountToCluster.get(account.accountId);
      if (clusterIdx === undefined) continue;

      const cluster = clusters[clusterIdx];
      
      // Calculate average distance to accounts in same cluster (a)
      let a = 0;
      let aCount = 0;
      for (const otherAccountId of cluster.accounts) {
        if (otherAccountId === account.accountId) continue;
        const otherAccount = accounts.find(a => a.accountId === otherAccountId);
        if (!otherAccount) continue;
        
        const pair = this.calculateSimilarity(account, otherAccount);
        a += 1 - pair.similarity; // Distance = 1 - similarity
        aCount++;
      }
      a = aCount > 0 ? a / aCount : 0;

      // Calculate minimum average distance to accounts in other clusters (b)
      let b = Infinity;
      for (let i = 0; i < clusters.length; i++) {
        if (i === clusterIdx) continue;
        
        const otherCluster = clusters[i];
        let avgDistance = 0;
        let bCount = 0;
        
        for (const otherAccountId of otherCluster.accounts) {
          const otherAccount = accounts.find(a => a.accountId === otherAccountId);
          if (!otherAccount) continue;
          
          const pair = this.calculateSimilarity(account, otherAccount);
          avgDistance += 1 - pair.similarity;
          bCount++;
        }
        
        if (bCount > 0) {
          avgDistance = avgDistance / bCount;
          b = Math.min(b, avgDistance);
        }
      }

      if (b === Infinity) b = 1; // If no other clusters, use max distance

      // Silhouette coefficient: (b - a) / max(a, b)
      const maxDist = Math.max(a, b);
      const silhouette = maxDist > 0 ? (b - a) / maxDist : 0;
      
      totalSilhouette += silhouette;
      count++;
    }

    return count > 0 ? totalSilhouette / count : 0;
  }

  /**
   * Calculate similarity between two accounts
   */
  calculateSimilarity(account1: Account, account2: Account): AccountPair {
    const features = this.extractFeatures(account1, account2);
    const similarity = this.computeSimilarityScore(features);

    return {
      account1: account1.accountId,
      account2: account2.accountId,
      similarity,
      features,
    };
  }

  /**
   * Extract features for similarity calculation
   */
  private extractFeatures(account1: Account, account2: Account): AccountPair['features'] {
    // Feature 1: Shared connections
    const connections1 = new Set(account1.connections?.map(c => c.target) || []);
    const connections2 = new Set(account2.connections?.map(c => c.target) || []);
    const sharedConnections = this.setIntersection(connections1, connections2).size;
    const totalConnections = connections1.size + connections2.size;
    const sharedConnectionsRatio = totalConnections > 0 
      ? (sharedConnections * 2) / totalConnections 
      : 0;

    // Feature 2: Connection overlap (Jaccard similarity)
    const connectionOverlap = this.jaccardSimilarity(connections1, connections2);

    // Feature 3: Temporal similarity (activity patterns)
    const temporalSimilarity = this.calculateTemporalSimilarity(
      account1.contributions || [],
      account2.contributions || []
    );

    // Feature 4: Metadata similarity
    const metadataSimilarity = this.calculateMetadataSimilarity(
      account1.metadata || {},
      account2.metadata || {}
    );

    // Feature 5: Graph distance (shortest path if connected)
    const graphDistance = this.calculateGraphDistance(account1, account2);

    return {
      sharedConnections,
      connectionOverlap,
      temporalSimilarity,
      metadataSimilarity,
      graphDistance,
    };
  }

  /**
   * Compute weighted similarity score from features
   */
  private computeSimilarityScore(features: AccountPair['features']): number {
    const weights = this.config.featureWeights;
    
    // Normalize graph distance (invert: closer = higher similarity)
    const normalizedGraphDistance = features.graphDistance === -1 
      ? 0 
      : Math.max(0, 1 - features.graphDistance / 10); // Assume max distance of 10

    return (
      weights.sharedConnections * Math.min(1, features.sharedConnections / 10) +
      weights.connectionOverlap * features.connectionOverlap +
      weights.temporalSimilarity * features.temporalSimilarity +
      weights.metadataSimilarity * features.metadataSimilarity +
      weights.graphDistance * normalizedGraphDistance
    );
  }

  /**
   * DBSCAN Clustering - Density-based clustering
   * Good for finding clusters of irregular shapes and automatically identifying outliers
   */
  private dbscanClustering(accounts: Account[]): Cluster[] {
    const clusters: Cluster[] = [];
    const visited = new Set<string>();
    const noise = new Set<string>();
    const accountMap = new Map(accounts.map(a => [a.accountId, a]));

    // Build similarity matrix (only for pairs above threshold)
    const similarityMatrix = new Map<string, Map<string, number>>();
    for (let i = 0; i < accounts.length; i++) {
      similarityMatrix.set(accounts[i].accountId, new Map());
      for (let j = i + 1; j < accounts.length; j++) {
        const pair = this.calculateSimilarity(accounts[i], accounts[j]);
        if (pair.similarity >= this.config.dbscanEps) {
          similarityMatrix.get(accounts[i].accountId)!.set(accounts[j].accountId, pair.similarity);
          if (!similarityMatrix.has(accounts[j].accountId)) {
            similarityMatrix.set(accounts[j].accountId, new Map());
          }
          similarityMatrix.get(accounts[j].accountId)!.set(accounts[i].accountId, pair.similarity);
        }
      }
    }

    // DBSCAN algorithm
    let clusterId = 0;
    for (const account of accounts) {
      if (visited.has(account.accountId)) continue;

      visited.add(account.accountId);
      const neighbors = this.getNeighbors(account.accountId, similarityMatrix);

      if (neighbors.length < this.config.dbscanMinPts) {
        noise.add(account.accountId);
        continue;
      }

      // Start new cluster
      const clusterAccounts = new Set<string>([account.accountId]);
      const seedSet = [...neighbors];

      while (seedSet.length > 0) {
        const currentId = seedSet.shift()!;
        if (noise.has(currentId)) {
          noise.delete(currentId);
          clusterAccounts.add(currentId);
        }
        if (visited.has(currentId)) continue;

        visited.add(currentId);
        clusterAccounts.add(currentId);

        const currentNeighbors = this.getNeighbors(currentId, similarityMatrix);
        if (currentNeighbors.length >= this.config.dbscanMinPts) {
          seedSet.push(...currentNeighbors.filter(n => !visited.has(n)));
        }
      }

      if (clusterAccounts.size >= this.config.minClusterSize) {
        const cluster = this.buildCluster(
          `cluster-${clusterId++}`,
          Array.from(clusterAccounts),
          accounts,
          similarityMatrix
        );
        if (cluster) clusters.push(cluster);
      }
    }

    return clusters;
  }

  /**
   * Connectivity-based clustering using Union-Find
   * Efficient for large graphs, groups accounts with strong connections
   */
  private connectivityBasedClustering(accounts: Account[]): Cluster[] {
    const clusters: Cluster[] = [];
    const accountMap = new Map(accounts.map(a => [a.accountId, a]));
    
    // Union-Find data structure
    const parent = new Map<string, string>();
    const rank = new Map<string, number>();
    
    accounts.forEach(account => {
      parent.set(account.accountId, account.accountId);
      rank.set(account.accountId, 0);
    });

    // Calculate similarities and union accounts above threshold
    const similarityPairs: Array<{ account1: string; account2: string; similarity: number }> = [];
    
    for (let i = 0; i < accounts.length; i++) {
      for (let j = i + 1; j < accounts.length; j++) {
        const pair = this.calculateSimilarity(accounts[i], accounts[j]);
        if (pair.similarity >= this.config.minSimilarity) {
          similarityPairs.push({
            account1: pair.account1,
            account2: pair.account2,
            similarity: pair.similarity,
          });
          this.union(pair.account1, pair.account2, parent, rank);
        }
      }
    }

    // Group accounts by root
    const rootToAccounts = new Map<string, string[]>();
    accounts.forEach(account => {
      const root = this.find(account.accountId, parent);
      if (!rootToAccounts.has(root)) {
        rootToAccounts.set(root, []);
      }
      rootToAccounts.get(root)!.push(account.accountId);
    });

    // Build clusters
    let clusterId = 0;
    const similarityMap = new Map<string, Map<string, number>>();
    similarityPairs.forEach(pair => {
      if (!similarityMap.has(pair.account1)) {
        similarityMap.set(pair.account1, new Map());
      }
      similarityMap.get(pair.account1)!.set(pair.account2, pair.similarity);
    });

    for (const [root, accountIds] of rootToAccounts.entries()) {
      if (accountIds.length >= this.config.minClusterSize && 
          accountIds.length <= this.config.maxClusterSize) {
        const cluster = this.buildCluster(
          `cluster-${clusterId++}`,
          accountIds,
          accounts,
          similarityMap
        );
        if (cluster) clusters.push(cluster);
      }
    }

    return clusters;
  }

  /**
   * Hierarchical clustering (agglomerative)
   * Builds a hierarchy of clusters
   */
  private hierarchicalClustering(accounts: Account[]): Cluster[] {
    if (accounts.length === 0) return [];

    // Start with each account as its own cluster
    let clusters: Array<Set<string>> = accounts.map(a => new Set([a.accountId]));
    const accountMap = new Map(accounts.map(a => [a.accountId, a]));

    // Calculate all pairwise similarities
    const similarities = new Map<string, Map<string, number>>();
    for (let i = 0; i < accounts.length; i++) {
      similarities.set(accounts[i].accountId, new Map());
      for (let j = i + 1; j < accounts.length; j++) {
        const pair = this.calculateSimilarity(accounts[i], accounts[j]);
        similarities.get(accounts[i].accountId)!.set(accounts[j].accountId, pair.similarity);
        if (!similarities.has(accounts[j].accountId)) {
          similarities.set(accounts[j].accountId, new Map());
        }
        similarities.get(accounts[j].accountId)!.set(accounts[i].accountId, pair.similarity);
      }
    }

    // Merge clusters until we can't find pairs above threshold
    while (true) {
      let bestPair: { i: number; j: number; similarity: number } | null = null;
      let bestSimilarity = -1;

      // Find the two most similar clusters
      for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          const similarity = this.clusterSimilarity(clusters[i], clusters[j], similarities);
          if (similarity >= this.config.minSimilarity && similarity > bestSimilarity) {
            bestSimilarity = similarity;
            bestPair = { i, j, similarity };
          }
        }
      }

      if (!bestPair) break;

      // Merge clusters
      const merged = new Set([...clusters[bestPair.i], ...clusters[bestPair.j]]);
      clusters = clusters.filter((_, idx) => idx !== bestPair!.i && idx !== bestPair!.j);
      clusters.push(merged);
    }

    // Convert to Cluster objects
    return clusters
      .filter(c => c.size >= this.config.minClusterSize && c.size <= this.config.maxClusterSize)
      .map((cluster, idx) => {
        const accountIds = Array.from(cluster);
        return this.buildCluster(
          `cluster-${idx}`,
          accountIds,
          accounts,
          similarities
        )!;
      })
      .filter(c => c !== null);
  }

  /**
   * Similarity-based clustering
   * Groups accounts based on high pairwise similarity
   */
  private similarityBasedClustering(accounts: Account[]): Cluster[] {
    const clusters: Cluster[] = [];
    const assigned = new Set<string>();
    const accountMap = new Map(accounts.map(a => [a.accountId, a]));

    // Build similarity graph
    const similarityGraph = new Map<string, Array<{ account: string; similarity: number }>>();
    accounts.forEach(a => similarityGraph.set(a.accountId, []));

    for (let i = 0; i < accounts.length; i++) {
      for (let j = i + 1; j < accounts.length; j++) {
        const pair = this.calculateSimilarity(accounts[i], accounts[j]);
        if (pair.similarity >= this.config.minSimilarity) {
          similarityGraph.get(pair.account1)!.push({
            account: pair.account2,
            similarity: pair.similarity,
          });
          similarityGraph.get(pair.account2)!.push({
            account: pair.account1,
            similarity: pair.similarity,
          });
        }
      }
    }

    // Find connected components in similarity graph
    let clusterId = 0;
    for (const account of accounts) {
      if (assigned.has(account.accountId)) continue;

      const clusterAccounts = this.findConnectedComponent(
        account.accountId,
        similarityGraph,
        assigned
      );

      if (clusterAccounts.length >= this.config.minClusterSize) {
        const similarityMap = new Map<string, Map<string, number>>();
        clusterAccounts.forEach(id => {
          similarityMap.set(id, new Map());
          const neighbors = similarityGraph.get(id) || [];
          neighbors.forEach(n => {
            if (clusterAccounts.includes(n.account)) {
              similarityMap.get(id)!.set(n.account, n.similarity);
            }
          });
        });

        const cluster = this.buildCluster(
          `cluster-${clusterId++}`,
          clusterAccounts,
          accounts,
          similarityMap
        );
        if (cluster) clusters.push(cluster);
      }
    }

    return clusters;
  }

  /**
   * Build a Cluster object from account IDs
   */
  private buildCluster(
    clusterId: string,
    accountIds: string[],
    allAccounts: Account[],
    similarityMatrix: Map<string, Map<string, number>>
  ): Cluster | null {
    if (accountIds.length < this.config.minClusterSize) return null;

    const clusterAccounts = accountIds
      .map(id => allAccounts.find(a => a.accountId === id))
      .filter((a): a is Account => a !== undefined);

    // Calculate average similarity (density)
    let totalSimilarity = 0;
    let pairCount = 0;
    for (let i = 0; i < accountIds.length; i++) {
      for (let j = i + 1; j < accountIds.length; j++) {
        const sim = similarityMatrix.get(accountIds[i])?.get(accountIds[j]) ?? 0;
        totalSimilarity += sim;
        pairCount++;
      }
    }
    const density = pairCount > 0 ? totalSimilarity / pairCount : 0;

    // Calculate cohesion (internal connectivity)
    const internalConnections = this.countInternalConnections(clusterAccounts);
    const totalPossibleConnections = (accountIds.length * (accountIds.length - 1)) / 2;
    const cohesion = totalPossibleConnections > 0 
      ? internalConnections / totalPossibleConnections 
      : 0;

    // Calculate risk score (higher for suspicious patterns)
    const riskScore = this.calculateClusterRiskScore(clusterAccounts, density, cohesion);

    // Extract patterns
    const patterns = this.extractClusterPatterns(clusterAccounts);

    return {
      clusterId,
      accounts: accountIds,
      size: accountIds.length,
      density,
      cohesion,
      riskScore,
      patterns,
    };
  }

  /**
   * Helper methods
   */
  private setIntersection<T>(set1: Set<T>, set2: Set<T>): Set<T> {
    return new Set([...set1].filter(x => set2.has(x)));
  }

  private jaccardSimilarity<T>(set1: Set<T>, set2: Set<T>): number {
    const intersection = this.setIntersection(set1, set2).size;
    const union = new Set([...set1, ...set2]).size;
    return union > 0 ? intersection / union : 0;
  }

  private calculateTemporalSimilarity(
    contribs1: Array<{ timestamp: number; block?: number }>,
    contribs2: Array<{ timestamp: number; block?: number }>
  ): number {
    if (contribs1.length === 0 || contribs2.length === 0) return 0;

    // Compare activity patterns by time windows
    const windowSize = 24 * 60 * 60 * 1000; // 1 day
    const windows1 = new Set(contribs1.map(c => Math.floor(c.timestamp / windowSize)));
    const windows2 = new Set(contribs2.map(c => Math.floor(c.timestamp / windowSize)));

    return this.jaccardSimilarity(windows1, windows2);
  }

  private calculateMetadataSimilarity(meta1: Record<string, any>, meta2: Record<string, any>): number {
    const keys = new Set([...Object.keys(meta1), ...Object.keys(meta2)]);
    if (keys.size === 0) return 0;

    let matches = 0;
    let total = 0;

    for (const key of keys) {
      if (key === 'accountId') continue; // Skip account ID
      
      const val1 = meta1[key];
      const val2 = meta2[key];

      if (val1 === undefined || val2 === undefined) {
        total++;
        continue;
      }

      total++;
      if (typeof val1 === 'string' && typeof val2 === 'string') {
        // String similarity (e.g., email domains)
        if (val1 === val2) matches++;
        else if (val1.includes('@') && val2.includes('@')) {
          const domain1 = val1.split('@')[1];
          const domain2 = val2.split('@')[1];
          if (domain1 === domain2) matches += 0.5;
        }
      } else if (typeof val1 === 'number' && typeof val2 === 'number') {
        // Numeric similarity (normalized)
        const max = Math.max(Math.abs(val1), Math.abs(val2), 1);
        const diff = Math.abs(val1 - val2) / max;
        matches += 1 - diff;
      } else if (val1 === val2) {
        matches++;
      }
    }

    return total > 0 ? matches / total : 0;
  }

  private calculateGraphDistance(account1: Account, account2: Account): number {
    // Simple BFS to find shortest path
    const connections1 = new Set(account1.connections?.map(c => c.target) || []);
    if (connections1.has(account2.accountId)) return 1;

    // For simplicity, return -1 if not directly connected
    // In production, implement full BFS
    return -1;
  }

  private getNeighbors(
    accountId: string,
    similarityMatrix: Map<string, Map<string, number>>
  ): string[] {
    return Array.from(similarityMatrix.get(accountId)?.keys() || []);
  }

  private find(accountId: string, parent: Map<string, string>): string {
    if (parent.get(accountId) !== accountId) {
      parent.set(accountId, this.find(parent.get(accountId)!, parent));
    }
    return parent.get(accountId)!;
  }

  private union(
    account1: string,
    account2: string,
    parent: Map<string, string>,
    rank: Map<string, number>
  ): void {
    const root1 = this.find(account1, parent);
    const root2 = this.find(account2, parent);

    if (root1 === root2) return;

    const rank1 = rank.get(root1)!;
    const rank2 = rank.get(root2)!;

    if (rank1 < rank2) {
      parent.set(root1, root2);
    } else if (rank1 > rank2) {
      parent.set(root2, root1);
    } else {
      parent.set(root2, root1);
      rank.set(root1, rank1 + 1);
    }
  }

  private clusterSimilarity(
    cluster1: Set<string>,
    cluster2: Set<string>,
    similarities: Map<string, Map<string, number>>
  ): number {
    // Average linkage: average similarity between all pairs
    let total = 0;
    let count = 0;

    for (const id1 of cluster1) {
      for (const id2 of cluster2) {
        const sim = similarities.get(id1)?.get(id2) ?? 0;
        total += sim;
        count++;
      }
    }

    return count > 0 ? total / count : 0;
  }

  private findConnectedComponent(
    startId: string,
    graph: Map<string, Array<{ account: string; similarity: number }>>,
    visited: Set<string>
  ): string[] {
    const component: string[] = [];
    const queue = [startId];
    const localVisited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (localVisited.has(current)) continue;

      localVisited.add(current);
      visited.add(current);
      component.push(current);

      const neighbors = graph.get(current) || [];
      neighbors.forEach(n => {
        if (!localVisited.has(n.account)) {
          queue.push(n.account);
        }
      });
    }

    return component;
  }

  private countInternalConnections(accounts: Account[]): number {
    const accountIds = new Set(accounts.map(a => a.accountId));
    let connections = 0;

    accounts.forEach(account => {
      account.connections?.forEach(conn => {
        if (accountIds.has(conn.target)) {
          connections++;
        }
      });
    });

    return connections;
  }

  private calculateClusterRiskScore(
    accounts: Account[],
    density: number,
    cohesion: number
  ): number {
    let riskScore = 0;

    // High density + high cohesion = suspicious (tightly-knit cluster)
    if (density > 0.7 && cohesion > 0.5) {
      riskScore += 0.3;
    }

    // Large cluster size
    if (accounts.length > 10) {
      riskScore += 0.2;
    }

    // Low reputation accounts
    const avgReputation = accounts.reduce((sum, a) => sum + (a.reputation || 0), 0) / accounts.length;
    if (avgReputation < 10) {
      riskScore += 0.2;
    }

    // Similar metadata (e.g., same email domain)
    const emailDomains = new Set(
      accounts
        .map(a => a.metadata?.emailDomain)
        .filter((d): d is string => d !== undefined)
    );
    if (emailDomains.size === 1 && accounts.length > 3) {
      riskScore += 0.3;
    }

    return Math.min(1, riskScore);
  }

  private extractClusterPatterns(accounts: Account[]): string[] {
    const patterns: string[] = [];

    // Check for common patterns
    const emailDomains = new Set(
      accounts
        .map(a => a.metadata?.emailDomain)
        .filter((d): d is string => d !== undefined)
    );
    if (emailDomains.size === 1) {
      patterns.push('shared_email_domain');
    }

    const avgReputation = accounts.reduce((sum, a) => sum + (a.reputation || 0), 0) / accounts.length;
    if (avgReputation < 10) {
      patterns.push('low_reputation');
    }

    if (accounts.length > 10) {
      patterns.push('large_cluster');
    }

    const highDensity = this.countInternalConnections(accounts) / accounts.length > 2;
    if (highDensity) {
      patterns.push('high_connectivity');
    }

    return patterns;
  }
}

