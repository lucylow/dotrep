/**
 * Provenance Registry for Datasets and Models
 * 
 * Implements verifiable dataset & model provenance registry as specified in
 * the NeuroWeb-Polkadot trust layer improvements.
 * 
 * Features:
 * - Publish dataset assets with Merkle roots and checksums
 * - Publish model checkpoints with training provenance
 * - Verify provenance integrity
 * - Track citations and lineage
 * - Anchor UALs on NeuroWeb parachain
 */

import { DKGClientV8, DKGConfig } from './dkg-client-v8';
import * as crypto from 'crypto';

export interface DatasetMetadata {
  id: string;
  name: string;
  publisher: string; // Account ID or DID
  description?: string;
  checksum: string; // SHA-256 hash
  merkleRoot?: string; // Merkle root for large datasets
  manifestUrl?: string; // URL to manifest file
  license: string;
  tags?: string[];
  createdAt: number;
  signatures?: Array<{
    signer: string;
    signature: string;
    timestamp: number;
  }>;
}

export interface ModelCheckpointMetadata {
  id: string;
  name: string;
  publisher: string;
  description?: string;
  checksum: string;
  datasetUALs: string[]; // UALs of training datasets
  trainingConfig?: Record<string, any>;
  trainingRunUAL?: string; // UAL of training run asset
  version: string;
  license: string;
  tags?: string[];
  createdAt: number;
  signatures?: Array<{
    signer: string;
    signature: string;
    timestamp: number;
  }>;
}

export interface TrainingRunMetadata {
  id: string;
  modelCheckpointUAL: string;
  datasetUALs: string[];
  trainingConfig: Record<string, any>;
  metrics?: Record<string, number>;
  startedAt: number;
  completedAt?: number;
  publisher: string;
}

export interface PublishResult {
  UAL: string;
  transactionHash?: string;
  blockNumber?: number;
  provenanceScore?: number;
}

export interface ProvenanceInfo {
  UAL: string;
  checksum: string;
  merkleRoot?: string;
  publisher: string;
  publishedAt: number;
  anchoredBlock?: number;
  anchoredParachain?: string;
  verified: boolean;
  provenanceScore: number;
  citations: string[];
}

/**
 * Provenance Registry Service
 */
export class ProvenanceRegistry {
  private dkgClient: DKGClientV8;

  constructor(dkgClient?: DKGClientV8, dkgConfig?: DKGConfig) {
    this.dkgClient = dkgClient || new DKGClientV8(dkgConfig);
  }

  /**
   * Publish a dataset asset to the DKG with provenance information
   */
  async publishDatasetAsset(
    metadata: DatasetMetadata,
    epochs: number = 2
  ): Promise<PublishResult> {
    console.log(`📦 Publishing dataset asset: ${metadata.name}`);

    // Convert to JSON-LD Knowledge Asset
    const knowledgeAsset = this.datasetToJSONLD(metadata);

    // Publish to DKG
    const result = await this.dkgClient.publishReputationAsset(
      {
        developerId: metadata.publisher,
        reputationScore: 0, // Not applicable for datasets
        contributions: [],
        timestamp: metadata.createdAt,
        metadata: knowledgeAsset as any
      },
      epochs
    );

    // Calculate provenance score based on completeness
    const provenanceScore = this.calculateProvenanceScore(metadata);

    console.log(`✅ Dataset asset published: ${result.UAL}`);
    console.log(`📊 Provenance score: ${provenanceScore}/100`);

    return {
      ...result,
      provenanceScore
    };
  }

  /**
   * Publish a model checkpoint with training provenance
   */
  async publishModelCheckpoint(
    metadata: ModelCheckpointMetadata,
    epochs: number = 2
  ): Promise<PublishResult> {
    console.log(`🤖 Publishing model checkpoint: ${metadata.name}`);

    // Verify referenced dataset UALs exist
    await this.verifyDatasetUALs(metadata.datasetUALs);

    // Convert to JSON-LD Knowledge Asset
    const knowledgeAsset = this.modelCheckpointToJSONLD(metadata);

    // Publish to DKG
    const result = await this.dkgClient.publishReputationAsset(
      {
        developerId: metadata.publisher,
        reputationScore: 0,
        contributions: [],
        timestamp: metadata.createdAt,
        metadata: knowledgeAsset as any
      },
      epochs
    );

    // Calculate provenance score
    const provenanceScore = this.calculateModelProvenanceScore(metadata);

    console.log(`✅ Model checkpoint published: ${result.UAL}`);
    console.log(`📊 Provenance score: ${provenanceScore}/100`);

    return {
      ...result,
      provenanceScore
    };
  }

  /**
   * Publish a training run record
   */
  async publishTrainingRun(
    metadata: TrainingRunMetadata,
    epochs: number = 2
  ): Promise<PublishResult> {
    console.log(`🏃 Publishing training run: ${metadata.id}`);

    const knowledgeAsset = this.trainingRunToJSONLD(metadata);

    const result = await this.dkgClient.publishReputationAsset(
      {
        developerId: metadata.publisher,
        reputationScore: 0,
        contributions: [],
        timestamp: metadata.startedAt,
        metadata: knowledgeAsset as any
      },
      epochs
    );

    console.log(`✅ Training run published: ${result.UAL}`);

    return result;
  }

  /**
   * Get provenance information for a UAL
   */
  async getProvenance(ual: string): Promise<ProvenanceInfo | null> {
    try {
      const asset = await this.dkgClient.queryReputation(ual);

      if (!asset) {
        return null;
      }

      // Extract provenance information from asset
      const provenance: ProvenanceInfo = {
        UAL: ual,
        checksum: asset['dotrep:checksum'] || asset.checksum || '',
        merkleRoot: asset['dotrep:merkleRoot'] || asset.merkleRoot,
        publisher: asset['dotrep:publishedBy'] || asset.publisher || '',
        publishedAt: new Date(asset['dotrep:publishedAt'] || asset.publishedAt || 0).getTime(),
        anchoredBlock: asset['dotrep:anchoredBlock'] || asset.anchoredBlock,
        anchoredParachain: asset['dotrep:anchoredParachain'] || asset.anchoredParachain,
        verified: this.verifyChecksum(asset, asset['dotrep:checksum'] || asset.checksum),
        provenanceScore: asset['dotrep:provenanceScore'] || asset.provenanceScore || 0,
        citations: asset['dotrep:citations'] || asset.citations || []
      };

      return provenance;
    } catch (error: any) {
      console.error(`❌ Failed to get provenance for ${ual}:`, error);
      return null;
    }
  }

  /**
   * Verify multiple UALs and return their provenance info
   */
  async verifyProvenance(uals: string[]): Promise<Array<ProvenanceInfo | null>> {
    const results = await Promise.all(
      uals.map(ual => this.getProvenance(ual))
    );
    return results;
  }

  /**
   * Compare provenance of two models side-by-side
   */
  async compareModelProvenance(
    model1UAL: string,
    model2UAL: string
  ): Promise<{
    model1: ProvenanceInfo | null;
    model2: ProvenanceInfo | null;
    differences: string[];
  }> {
    const [model1, model2] = await Promise.all([
      this.getProvenance(model1UAL),
      this.getProvenance(model2UAL)
    ]);

    const differences: string[] = [];

    if (!model1 || !model2) {
      differences.push('One or both models not found');
      return { model1, model2, differences };
    }

    // Compare provenance scores
    if (model1.provenanceScore !== model2.provenanceScore) {
      differences.push(
        `Provenance score: ${model1.provenanceScore} vs ${model2.provenanceScore}`
      );
    }

    // Compare publisher
    if (model1.publisher !== model2.publisher) {
      differences.push(`Publisher: ${model1.publisher} vs ${model2.publisher}`);
    }

    // Compare citations
    const citations1 = new Set(model1.citations);
    const citations2 = new Set(model2.citations);
    const uniqueTo1 = [...citations1].filter(c => !citations2.has(c));
    const uniqueTo2 = [...citations2].filter(c => !citations1.has(c));

    if (uniqueTo1.length > 0 || uniqueTo2.length > 0) {
      differences.push(
        `Citations differ: Model 1 has ${uniqueTo1.length} unique, Model 2 has ${uniqueTo2.length} unique`
      );
    }

    return { model1, model2, differences };
  }

  /**
   * Convert dataset metadata to JSON-LD
   */
  private datasetToJSONLD(metadata: DatasetMetadata): any {
    return {
      '@context': {
        '@vocab': 'https://schema.org/',
        'dotrep': 'https://dotrep.io/ontology/',
        'dcterms': 'http://purl.org/dc/terms/'
      },
      '@type': 'dotrep:DatasetAsset',
      '@id': `dotrep:dataset:${metadata.id}`,
      'name': metadata.name,
      'description': metadata.description || '',
      'dcterms:license': metadata.license,
      'dotrep:checksum': metadata.checksum,
      'dotrep:merkleRoot': metadata.merkleRoot || '',
      'dotrep:manifestUrl': metadata.manifestUrl || '',
      'dotrep:publishedBy': metadata.publisher,
      'dotrep:publishedAt': new Date(metadata.createdAt).toISOString(),
      'dotrep:version': metadata.id.split(':').pop() || '1.0.0',
      'keywords': metadata.tags || [],
      'dotrep:publisherSignature': metadata.signatures?.[0]?.signature || '',
      'dotrep:provenanceScore': this.calculateProvenanceScore(metadata),
      'dateCreated': new Date(metadata.createdAt).toISOString(),
      'dateModified': new Date(metadata.createdAt).toISOString()
    };
  }

  /**
   * Convert model checkpoint metadata to JSON-LD
   */
  private modelCheckpointToJSONLD(metadata: ModelCheckpointMetadata): any {
    return {
      '@context': {
        '@vocab': 'https://schema.org/',
        'dotrep': 'https://dotrep.io/ontology/'
      },
      '@type': 'dotrep:ModelCheckpoint',
      '@id': `dotrep:model:${metadata.id}`,
      'name': metadata.name,
      'description': metadata.description || '',
      'dcterms:license': metadata.license,
      'dotrep:checksum': metadata.checksum,
      'dotrep:datasetUALs': metadata.datasetUALs,
      'dotrep:trainingConfig': metadata.trainingConfig
        ? JSON.stringify(metadata.trainingConfig)
        : '',
      'dotrep:trainingRunUAL': metadata.trainingRunUAL || '',
      'dotrep:publishedBy': metadata.publisher,
      'dotrep:publishedAt': new Date(metadata.createdAt).toISOString(),
      'dotrep:version': metadata.version,
      'keywords': metadata.tags || [],
      'dotrep:publisherSignature': metadata.signatures?.[0]?.signature || '',
      'dotrep:provenanceScore': this.calculateModelProvenanceScore(metadata),
      'dateCreated': new Date(metadata.createdAt).toISOString(),
      'softwareVersion': metadata.version
    };
  }

  /**
   * Convert training run metadata to JSON-LD
   */
  private trainingRunToJSONLD(metadata: TrainingRunMetadata): any {
    return {
      '@context': {
        '@vocab': 'https://schema.org/',
        'dotrep': 'https://dotrep.io/ontology/'
      },
      '@type': 'dotrep:TrainingRun',
      '@id': `dotrep:training:${metadata.id}`,
      'dotrep:modelCheckpointUAL': metadata.modelCheckpointUAL,
      'dotrep:datasetUALs': metadata.datasetUALs,
      'dotrep:trainingConfig': JSON.stringify(metadata.trainingConfig),
      'dotrep:metrics': metadata.metrics || {},
      'startTime': new Date(metadata.startedAt).toISOString(),
      'endTime': metadata.completedAt
        ? new Date(metadata.completedAt).toISOString()
        : undefined,
      'dotrep:publishedBy': metadata.publisher
    };
  }

  /**
   * Calculate provenance score for a dataset (0-100)
   */
  private calculateProvenanceScore(metadata: DatasetMetadata): number {
    let score = 0;

    // Checksum present: 20 points
    if (metadata.checksum) score += 20;

    // Merkle root present: 15 points
    if (metadata.merkleRoot) score += 15;

    // Manifest URL present: 15 points
    if (metadata.manifestUrl) score += 15;

    // License present: 10 points
    if (metadata.license) score += 10;

    // Description present: 10 points
    if (metadata.description) score += 10;

    // Signatures present: 20 points
    if (metadata.signatures && metadata.signatures.length > 0) score += 20;

    // Tags present: 10 points
    if (metadata.tags && metadata.tags.length > 0) score += 10;

    return Math.min(score, 100);
  }

  /**
   * Calculate provenance score for a model (0-100)
   */
  private calculateModelProvenanceScore(metadata: ModelCheckpointMetadata): number {
    let score = 0;

    // Checksum present: 20 points
    if (metadata.checksum) score += 20;

    // Dataset UALs present: 25 points
    if (metadata.datasetUALs && metadata.datasetUALs.length > 0) score += 25;

    // Training config present: 15 points
    if (metadata.trainingConfig) score += 15;

    // Training run UAL present: 10 points
    if (metadata.trainingRunUAL) score += 10;

    // License present: 10 points
    if (metadata.license) score += 10;

    // Version present: 10 points
    if (metadata.version) score += 10;

    // Signatures present: 10 points
    if (metadata.signatures && metadata.signatures.length > 0) score += 10;

    return Math.min(score, 100);
  }

  /**
   * Verify checksum of an asset
   */
  private verifyChecksum(asset: any, expectedChecksum: string): boolean {
    // In production, this would verify the actual file checksum
    // For now, just check if checksum field is present
    return !!expectedChecksum && expectedChecksum.length > 0;
  }

  /**
   * Verify that dataset UALs exist
   */
  private async verifyDatasetUALs(uals: string[]): Promise<void> {
    for (const ual of uals) {
      try {
        const asset = await this.dkgClient.queryReputation(ual);
        if (!asset) {
          console.warn(`⚠️  Dataset UAL not found: ${ual}`);
        }
      } catch (error) {
        console.warn(`⚠️  Failed to verify dataset UAL: ${ual}`);
      }
    }
  }

  /**
   * Compute Merkle root for a dataset (helper function)
   */
  static computeMerkleRoot(dataChunks: Buffer[]): string {
    if (dataChunks.length === 0) {
      return '';
    }

    let hashes = dataChunks.map(chunk =>
      crypto.createHash('sha256').update(chunk).digest()
    );

    while (hashes.length > 1) {
      const newHashes: Buffer[] = [];
      for (let i = 0; i < hashes.length; i += 2) {
        if (i + 1 < hashes.length) {
          const combined = Buffer.concat([hashes[i], hashes[i + 1]]);
          newHashes.push(crypto.createHash('sha256').update(combined).digest());
        } else {
          newHashes.push(hashes[i]);
        }
      }
      hashes = newHashes;
    }

    return hashes[0].toString('hex');
  }

  /**
   * Compute SHA-256 checksum for data
   */
  static computeChecksum(data: Buffer | string): string {
    const buffer = typeof data === 'string' ? Buffer.from(data) : data;
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }
}

