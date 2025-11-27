/**
 * Guardian Flagging Integration
 * 
 * Automated content verification pipeline that creates flags from Guardian verification results
 */

import { GuardianApiClient, GuardianVerificationResult } from '../server/_core/guardianApi';
import { getUserFlaggingService, UserFlaggingService } from './user-flagging-service';
import { DKGClientV8, DKGConfig } from './dkg-client-v8';

export interface AutomatedFlagResult {
  action: 'auto_flagged' | 'no_action';
  confidence: number;
  flagId?: string;
  flagUAL?: string;
  recommendedAction?: string;
}

/**
 * Guardian Flagging Integration Service
 */
export class GuardianFlaggingIntegration {
  private guardianClient: GuardianApiClient;
  private flaggingService: UserFlaggingService;
  private dkgClient: DKGClientV8;

  constructor(
    guardianClient?: GuardianApiClient,
    flaggingService?: UserFlaggingService,
    dkgClient?: DKGClientV8,
    dkgConfig?: DKGConfig
  ) {
    this.guardianClient = guardianClient || new GuardianApiClient();
    this.flaggingService = flaggingService || getUserFlaggingService(dkgClient, dkgConfig);
    this.dkgClient = dkgClient || new DKGClientV8(dkgConfig);
  }

  /**
   * Automatically review content using Umanitek Guardian and create flags if needed
   */
  async automatedContentReview(
    contentFingerprint: string,
    contentType: 'image' | 'video' | 'text',
    targetUserDid: string
  ): Promise<AutomatedFlagResult> {
    console.log(`🤖 Automated content review for ${contentFingerprint}`);

    // Submit to Guardian for verification
    const verificationResult = await this.guardianClient.verifyContent(
      contentFingerprint,
      contentType
    );

    // Create automated flag if high confidence match
    if (verificationResult.confidence > 0.8 && verificationResult.status === 'flagged') {
      const flagResult = await this.flaggingService.createAutomatedFlagFromGuardian(
        verificationResult,
        contentFingerprint,
        targetUserDid
      );

      if (flagResult.flagId) {
        return {
          action: 'auto_flagged',
          confidence: verificationResult.confidence,
          flagId: flagResult.flagId,
          flagUAL: flagResult.ual,
          recommendedAction: verificationResult.recommendedAction,
        };
      }
    }

    return {
      action: 'no_action',
      confidence: verificationResult.confidence,
    };
  }

  /**
   * Batch review multiple content items
   */
  async batchAutomatedReview(
    contentItems: Array<{
      fingerprint: string;
      contentType: 'image' | 'video' | 'text';
      targetUserDid: string;
    }>
  ): Promise<AutomatedFlagResult[]> {
    const results = await Promise.all(
      contentItems.map(item =>
        this.automatedContentReview(
          item.fingerprint,
          item.contentType,
          item.targetUserDid
        )
      )
    );

    return results;
  }

  /**
   * Monitor content and automatically flag suspicious items
   */
  async monitorAndFlag(
    contentFingerprint: string,
    contentType: 'image' | 'video' | 'text',
    targetUserDid: string,
    threshold: number = 0.8
  ): Promise<AutomatedFlagResult> {
    const verificationResult = await this.guardianClient.verifyContent(
      contentFingerprint,
      contentType
    );

    // Check if confidence exceeds threshold
    if (verificationResult.confidence >= threshold && verificationResult.status === 'flagged') {
      return await this.automatedContentReview(
        contentFingerprint,
        contentType,
        targetUserDid
      );
    }

    return {
      action: 'no_action',
      confidence: verificationResult.confidence,
    };
  }
}

// Singleton instance
let guardianFlaggingInstance: GuardianFlaggingIntegration | null = null;

export function getGuardianFlaggingIntegration(
  guardianClient?: GuardianApiClient,
  flaggingService?: UserFlaggingService,
  dkgClient?: DKGClientV8,
  dkgConfig?: DKGConfig
): GuardianFlaggingIntegration {
  if (!guardianFlaggingInstance) {
    guardianFlaggingInstance = new GuardianFlaggingIntegration(
      guardianClient,
      flaggingService,
      dkgClient,
      dkgConfig
    );
  }
  return guardianFlaggingInstance;
}

