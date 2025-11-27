/**
 * Transparency Metrics Tracking
 * 
 * Tracks and reports transparency metrics for ethics & openness assessment:
 * - Hash validation rate
 * - Signature validation rate
 * - Provenance coverage
 * - Audit trace latency
 * - On-chain anchor rate
 */

import { DKGClientV8 } from '../../dkg-integration/dkg-client-v8';

export interface TransparencyMetrics {
  hashValidationRate: number; // Percentage of assets with valid content hashes
  signatureValidationRate: number; // Percentage of assets with valid signatures
  provenanceCoverage: number; // Percentage of assets with provenance information
  auditTraceLatency: number; // Average time to fetch & verify a UAL (ms)
  anchorValidationRate: number; // Percentage of assets anchored on-chain
  totalAssets: number;
  validAssets: number;
  lastUpdated: number;
}

export interface AssetVerificationResult {
  ual: string;
  contentHashValid: boolean;
  signatureValid: boolean;
  hasProvenance: boolean;
  hasAnchor: boolean;
  verificationTime: number; // ms
}

export class TransparencyMetricsTracker {
  private dkgClient: DKGClientV8;
  private metrics: TransparencyMetrics;
  private verificationCache: Map<string, AssetVerificationResult> = new Map();
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes

  constructor(dkgClient?: DKGClientV8) {
    this.dkgClient = dkgClient || new DKGClientV8({
      useMockMode: process.env.DKG_USE_MOCK === 'true',
      fallbackToMock: true
    });
    
    this.metrics = {
      hashValidationRate: 0,
      signatureValidationRate: 0,
      provenanceCoverage: 0,
      auditTraceLatency: 0,
      anchorValidationRate: 0,
      totalAssets: 0,
      validAssets: 0,
      lastUpdated: Date.now()
    };
  }

  /**
   * Verify a single asset and cache the result
   */
  async verifyAsset(ual: string): Promise<AssetVerificationResult> {
    // Check cache
    const cached = this.verificationCache.get(ual);
    if (cached && (Date.now() - cached.verificationTime) < this.cacheTTL) {
      return cached;
    }

    const startTime = Date.now();
    
    try {
      const asset = await this.dkgClient.queryReputation(ual);
      const verification = await this.dkgClient.verifyAsset(ual);
      
      const verificationTime = Date.now() - startTime;
      
      const result: AssetVerificationResult = {
        ual,
        contentHashValid: verification.contentHashMatch || false,
        signatureValid: verification.signatureValid || false,
        hasProvenance: !!(asset['dotrep:provenance'] || asset.provenance),
        hasAnchor: !!(asset['dotrep:paymentTx'] || asset.transactionHash || asset['dotrep:anchoredBlock']),
        verificationTime
      };

      // Cache result
      this.verificationCache.set(ual, result);
      
      return result;
    } catch (error: any) {
      console.error(`Failed to verify asset ${ual}:`, error);
      return {
        ual,
        contentHashValid: false,
        signatureValid: false,
        hasProvenance: false,
        hasAnchor: false,
        verificationTime: Date.now() - startTime
      };
    }
  }

  /**
   * Batch verify multiple assets and update metrics
   */
  async updateMetrics(uals: string[]): Promise<TransparencyMetrics> {
    console.log(`📊 Updating transparency metrics for ${uals.length} assets...`);

    const results = await Promise.all(
      uals.map(ual => this.verifyAsset(ual))
    );

    const totalAssets = results.length;
    const hashValidCount = results.filter(r => r.contentHashValid).length;
    const signatureValidCount = results.filter(r => r.signatureValid).length;
    const provenanceCount = results.filter(r => r.hasProvenance).length;
    const anchorCount = results.filter(r => r.hasAnchor).length;
    const validAssets = results.filter(r => r.contentHashValid && r.signatureValid).length;
    
    const avgLatency = results.reduce((sum, r) => sum + r.verificationTime, 0) / totalAssets;

    this.metrics = {
      hashValidationRate: totalAssets > 0 ? (hashValidCount / totalAssets) * 100 : 0,
      signatureValidationRate: totalAssets > 0 ? (signatureValidCount / totalAssets) * 100 : 0,
      provenanceCoverage: totalAssets > 0 ? (provenanceCount / totalAssets) * 100 : 0,
      auditTraceLatency: avgLatency,
      anchorValidationRate: totalAssets > 0 ? (anchorCount / totalAssets) * 100 : 0,
      totalAssets,
      validAssets,
      lastUpdated: Date.now()
    };

    console.log(`✅ Metrics updated:`);
    console.log(`   Hash validation: ${this.metrics.hashValidationRate.toFixed(1)}%`);
    console.log(`   Signature validation: ${this.metrics.signatureValidationRate.toFixed(1)}%`);
    console.log(`   Provenance coverage: ${this.metrics.provenanceCoverage.toFixed(1)}%`);
    console.log(`   Average latency: ${this.metrics.auditTraceLatency.toFixed(0)}ms`);

    return this.metrics;
  }

  /**
   * Get current metrics
   */
  getMetrics(): TransparencyMetrics {
    return { ...this.metrics };
  }

  /**
   * Get metrics summary for dashboard
   */
  getMetricsSummary(): {
    overall: 'excellent' | 'good' | 'adequate' | 'needs-improvement';
    score: number; // 0-100
    targets: {
      hashValidation: { current: number; target: number; met: boolean };
      signatureValidation: { current: number; target: number; met: boolean };
      provenanceCoverage: { current: number; target: number; met: boolean };
      auditLatency: { current: number; target: number; met: boolean };
      anchorRate: { current: number; target: number; met: boolean };
    };
  } {
    const targets = {
      hashValidation: { target: 99.9, current: this.metrics.hashValidationRate },
      signatureValidation: { target: 99.9, current: this.metrics.signatureValidationRate },
      provenanceCoverage: { target: 90, current: this.metrics.provenanceCoverage },
      auditLatency: { target: 2000, current: this.metrics.auditTraceLatency }, // 2 seconds
      anchorRate: { target: 80, current: this.metrics.anchorValidationRate }
    };

    const met = {
      hashValidation: targets.hashValidation.current >= targets.hashValidation.target,
      signatureValidation: targets.signatureValidation.current >= targets.signatureValidation.target,
      provenanceCoverage: targets.provenanceCoverage.current >= targets.provenanceCoverage.target,
      auditLatency: targets.auditLatency.current <= targets.auditLatency.target,
      anchorRate: targets.anchorRate.current >= targets.anchorRate.target
    };

    const metCount = Object.values(met).filter(Boolean).length;
    const totalTargets = Object.keys(met).length;
    const score = (metCount / totalTargets) * 100;

    let overall: 'excellent' | 'good' | 'adequate' | 'needs-improvement';
    if (score >= 90) {
      overall = 'excellent';
    } else if (score >= 70) {
      overall = 'good';
    } else if (score >= 50) {
      overall = 'adequate';
    } else {
      overall = 'needs-improvement';
    }

    return {
      overall,
      score,
      targets: {
        hashValidation: { ...targets.hashValidation, met: met.hashValidation },
        signatureValidation: { ...targets.signatureValidation, met: met.signatureValidation },
        provenanceCoverage: { ...targets.provenanceCoverage, met: met.provenanceCoverage },
        auditLatency: { ...targets.auditLatency, met: met.auditLatency },
        anchorRate: { ...targets.anchorRate, met: met.anchorRate }
      }
    };
  }

  /**
   * Clear verification cache
   */
  clearCache(): void {
    this.verificationCache.clear();
  }
}

// Singleton instance
let metricsTrackerInstance: TransparencyMetricsTracker | null = null;

export function getTransparencyMetricsTracker(dkgClient?: DKGClientV8): TransparencyMetricsTracker {
  if (!metricsTrackerInstance) {
    metricsTrackerInstance = new TransparencyMetricsTracker(dkgClient);
  }
  return metricsTrackerInstance;
}

