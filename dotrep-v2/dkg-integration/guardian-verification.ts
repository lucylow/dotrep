/**
 * Guardian Verification Service
 * 
 * This service integrates Umanitek Guardian verification results with the DKG,
 * creating verifiable Knowledge Assets for content safety verification.
 * 
 * Features:
 * - Publish verification reports as Knowledge Assets
 * - Link verification results to content and creators
 * - Enable SPARQL queries for safety insights
 * - Support reputation impact calculations
 */

import { DKGClientV8, DKGConfig } from './dkg-client-v8';
import { GuardianVerificationResult, GuardianMatch } from '../server/_core/guardianApi';
import { getImpactMetrics } from '../server/_core/impactMetrics';

export interface ContentVerificationAsset {
  '@context': (string | Record<string, string>)[];
  '@type': string;
  '@id': string;
  dateCreated: string;
  about: string; // URL or identifier of the content
  generatedBy: {
    '@id': string;
    '@type': string;
    name: string;
  };
  verificationResult: {
    confidence: number;
    matchFound: boolean;
    matchType?: string;
    originalFingerprint: string;
    recommendedAction: string;
  };
  matches?: Array<{
    matchId: string;
    confidence: number;
    matchType: string;
    sourceUAL?: string;
  }>;
  wasDerivedFrom?: Array<{
    '@id': string;
  }>;
}

export interface VerificationReportResult {
  ual: string;
  verificationResult: GuardianVerificationResult;
  transactionHash?: string;
  blockNumber?: number;
}

/**
 * Guardian Verification Service
 */
export class GuardianVerificationService {
  private dkgClient: DKGClientV8;
  private impactMetrics: ReturnType<typeof getImpactMetrics>;

  constructor(dkgClient?: DKGClientV8, dkgConfig?: DKGConfig) {
    this.dkgClient = dkgClient || new DKGClientV8(dkgConfig);
    this.impactMetrics = getImpactMetrics();
  }

  /**
   * Publish a verification report to the DKG as a Knowledge Asset
   */
  async publishVerificationReport(
    contentUrl: string,
    creatorId: string,
    verificationResult: GuardianVerificationResult,
    epochs: number = 2
  ): Promise<VerificationReportResult> {
    console.log(`📤 Publishing Guardian verification report for ${contentUrl}`);

    // Convert to JSON-LD Knowledge Asset
    const knowledgeAsset = this.verificationToJSONLD(
      contentUrl,
      creatorId,
      verificationResult
    );

    try {
      // Publish to DKG
      const result = await this.dkgClient.publishReputationAsset(
        {
          developerId: creatorId,
          reputationScore: 0, // Not a reputation score, but required by interface
          contributions: [],
          timestamp: verificationResult.timestamp,
          metadata: knowledgeAsset as any,
        },
        epochs
      );

      // Record metrics
      if (verificationResult.status === 'flagged') {
        this.impactMetrics.recordGuardianFlag(
          verificationResult.matches[0]?.matchType || 'unknown',
          verificationResult.confidence
        );
      }

      console.log(`✅ Verification report published: ${result.UAL}`);

      return {
        ual: result.UAL,
        verificationResult,
        transactionHash: result.transactionHash,
        blockNumber: result.blockNumber,
      };
    } catch (error: any) {
      console.error(`❌ Failed to publish verification report:`, error);
      throw new Error(`Failed to publish verification report: ${error.message}`);
    }
  }

  /**
   * Create a Community Note from a verification result
   */
  async createVerificationCommunityNote(
    targetUAL: string,
    verificationResult: GuardianVerificationResult,
    author: string = 'did:dkg:umanitek-guardian'
  ): Promise<{ ual: string; note: any }> {
    const { getCommunityNotesService } = await import('./community-notes');
    const service = getCommunityNotesService();

    const noteType = verificationResult.status === 'flagged' 
      ? 'verification' 
      : 'verification';

    const content = verificationResult.status === 'flagged'
      ? `Umanitek Guardian verification: Content flagged with ${(verificationResult.confidence * 100).toFixed(1)}% confidence. ${verificationResult.summary}`
      : `Umanitek Guardian verification: Content verified clean. No harmful content detected.`;

    const evidence = verificationResult.evidenceUAL 
      ? [verificationResult.evidenceUAL]
      : [];

    const result = await service.publishNote({
      targetUAL,
      noteType,
      content,
      author,
      evidence,
      reasoning: `Automated verification by Umanitek Guardian AI Agent. Fingerprint: ${verificationResult.fingerprint.hash}`,
      timestamp: verificationResult.timestamp,
    });

    return {
      ual: result.ual,
      note: result.note,
    };
  }

  /**
   * Query verification reports for a creator
   */
  async getCreatorVerificationHistory(creatorId: string): Promise<Array<{
    ual: string;
    contentUrl: string;
    status: string;
    confidence: number;
    timestamp: number;
  }>> {
    const query = `
      PREFIX schema: <https://schema.org/>
      PREFIX dotrep: <https://dotrep.io/ontology/>
      PREFIX guardian: <https://guardian.umanitek.ai/schema/>
      
      SELECT ?report ?contentUrl ?status ?confidence ?timestamp
      WHERE {
        ?report a guardian:ContentVerificationReport .
        ?report schema:about ?contentUrl .
        ?report guardian:verificationResult ?result .
        ?result guardian:confidence ?confidence .
        ?result guardian:matchFound ?matchFound .
        BIND(IF(?matchFound, "flagged", "verified") AS ?status)
        ?report schema:dateCreated ?timestamp .
        ?report guardian:generatedBy/guardian:creator ?creator .
        FILTER(?creator = "${creatorId}")
      }
      ORDER BY DESC(?timestamp)
    `;

    try {
      const results = await this.dkgClient['dkg']?.graph?.query?.(query, 'SELECT') || [];
      
      return results.map((result: any) => ({
        ual: result.report,
        contentUrl: result.contentUrl,
        status: result.status,
        confidence: parseFloat(result.confidence),
        timestamp: new Date(result.timestamp).getTime(),
      }));
    } catch (error: any) {
      console.error(`❌ Failed to query verification history:`, error);
      return [];
    }
  }

  /**
   * Calculate safety score for a creator based on verification history
   */
  async calculateCreatorSafetyScore(creatorId: string): Promise<{
    safetyScore: number; // 0-1
    totalVerifications: number;
    flaggedCount: number;
    averageConfidence: number;
  }> {
    const history = await this.getCreatorVerificationHistory(creatorId);

    if (history.length === 0) {
      return {
        safetyScore: 0.5, // Neutral if no history
        totalVerifications: 0,
        flaggedCount: 0,
        averageConfidence: 0,
      };
    }

    const flaggedCount = history.filter(h => h.status === 'flagged').length;
    const averageConfidence = history.reduce((sum, h) => sum + h.confidence, 0) / history.length;

    // Safety score: higher is better
    // Formula: (1 - flaggedRatio) * (1 - averageFlagConfidence)
    const flaggedRatio = flaggedCount / history.length;
    const flaggedItems = history.filter(h => h.status === 'flagged');
    const averageFlagConfidence = flaggedItems.length > 0
      ? flaggedItems.reduce((sum, h) => sum + h.confidence, 0) / flaggedItems.length
      : 0;

    const safetyScore = (1 - flaggedRatio) * (1 - averageFlagConfidence * 0.5);

    return {
      safetyScore: Math.max(0, Math.min(1, safetyScore)),
      totalVerifications: history.length,
      flaggedCount,
      averageConfidence,
    };
  }

  /**
   * Convert verification result to JSON-LD Knowledge Asset
   */
  private verificationToJSONLD(
    contentUrl: string,
    creatorId: string,
    verificationResult: GuardianVerificationResult
  ): ContentVerificationAsset {
    return {
      '@context': [
        'https://schema.org/',
        {
          guardian: 'https://guardian.umanitek.ai/schema/',
          dotrep: 'https://dotrep.io/ontology/',
          prov: 'http://www.w3.org/ns/prov#',
        },
      ],
      '@type': 'guardian:ContentVerificationReport',
      '@id': verificationResult.evidenceUAL || `urn:ual:guardian:verification:${Date.now()}`,
      dateCreated: new Date(verificationResult.timestamp).toISOString(),
      about: contentUrl,
      generatedBy: {
        '@id': 'did:dkg:umanitek-guardian',
        '@type': 'guardian:GuardianAgent',
        name: 'Umanitek Guardian AI Agent',
      },
      verificationResult: {
        confidence: verificationResult.confidence,
        matchFound: verificationResult.matches.length > 0,
        matchType: verificationResult.matches[0]?.matchType,
        originalFingerprint: verificationResult.fingerprint.hash,
        recommendedAction: verificationResult.recommendedAction,
      },
      matches: verificationResult.matches.map(match => ({
        matchId: match.matchId,
        confidence: match.confidence,
        matchType: match.matchType,
        sourceUAL: match.sourceUAL,
      })),
      wasDerivedFrom: verificationResult.matches
        .filter(m => m.sourceUAL)
        .map(m => ({ '@id': m.sourceUAL! })),
    };
  }

  /**
   * SPARQL query to find creators with high safety scores
   */
  static getSafeCreatorsQuery(minSafetyScore: number = 0.9, limit: number = 50): string {
    return `
      PREFIX schema: <https://schema.org/>
      PREFIX dotrep: <https://dotrep.io/ontology/>
      PREFIX guardian: <https://guardian.umanitek.ai/schema/>
      
      SELECT ?creator ?name ?safetyScore ?totalVerifications
      WHERE {
        ?profile a dotrep:TrustedUserProfile .
        ?profile dotrep:creator ?creator .
        OPTIONAL { ?profile schema:name ?name . }
        ?profile dotrep:reputationMetrics/dotrep:safetyScore ?safetyScore .
        ?profile dotrep:reputationMetrics/dotrep:totalVerifications ?totalVerifications .
        FILTER(?safetyScore >= ${minSafetyScore} && ?totalVerifications > 0)
      }
      ORDER BY DESC(?safetyScore)
      LIMIT ${limit}
    `;
  }
}

// Singleton instance
let guardianVerificationInstance: GuardianVerificationService | null = null;

export function getGuardianVerificationService(
  dkgClient?: DKGClientV8,
  dkgConfig?: DKGConfig
): GuardianVerificationService {
  if (!guardianVerificationInstance) {
    guardianVerificationInstance = new GuardianVerificationService(dkgClient, dkgConfig);
  }
  return guardianVerificationInstance;
}

