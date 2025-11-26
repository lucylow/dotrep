/**
 * Umanitek Guardian API Client
 * 
 * This service provides integration with Umanitek Guardian AI Agent for
 * content safety verification. It supports:
 * - Privacy-preserving fingerprinting
 * - Content verification (deepfakes, CSAM, misinformation)
 * - Verifiable evidence generation
 * - Mock mode for development/demo
 * 
 * Based on Umanitek Guardian's capabilities:
 * - Built on OriginTrail DKG
 * - Privacy-first design (fingerprints only, no raw media)
 * - Verifiable audit trails
 * - Partnership with Videntifier for forensic recognition
 */

export interface ContentFingerprint {
  hash: string;
  algorithm: 'videntifier' | 'perceptual' | 'cryptographic';
  metadata?: {
    contentType: 'image' | 'video' | 'text';
    size?: number;
    dimensions?: { width: number; height: number };
  };
}

export interface GuardianVerificationRequest {
  contentUrl?: string;
  fingerprint?: ContentFingerprint;
  contentType: 'image' | 'video' | 'text';
  checkType: 'deepfake' | 'csam' | 'misinformation' | 'illicit' | 'all';
}

export interface GuardianMatch {
  matchId: string;
  confidence: number; // 0-1
  matchType: 'deepfake' | 'csam' | 'illicit' | 'misinformation';
  sourceUAL?: string; // UAL of the matched content in DKG
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface GuardianVerificationResult {
  status: 'verified' | 'flagged' | 'pending' | 'error';
  confidence: number; // 0-1 overall confidence
  matches: GuardianMatch[];
  recommendedAction: 'flag' | 'takedown' | 'monitor' | 'allow';
  evidenceUAL?: string; // UAL of the verification report on DKG
  fingerprint: ContentFingerprint;
  timestamp: number;
  processingTime?: number; // milliseconds
  summary?: string;
}

export interface GuardianConfig {
  apiKey?: string;
  apiUrl?: string;
  useMockMode?: boolean;
  fallbackToMock?: boolean;
  timeout?: number;
}

/**
 * Umanitek Guardian API Client
 */
export class GuardianApiClient {
  private config: Required<GuardianConfig>;
  private useMockMode: boolean;

  constructor(config: GuardianConfig = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.UMANITEK_GUARDIAN_API_KEY || '',
      apiUrl: config.apiUrl || process.env.UMANITEK_GUARDIAN_API_URL || 'https://api.umanitek.ai/v1',
      useMockMode: config.useMockMode ?? (process.env.GUARDIAN_USE_MOCK === 'true' || true),
      fallbackToMock: config.fallbackToMock ?? (process.env.GUARDIAN_FALLBACK_TO_MOCK === 'true' || true),
      timeout: config.timeout || 30000, // 30 seconds
    };
    this.useMockMode = this.config.useMockMode;
  }

  /**
   * Verify content using Guardian
   */
  async verifyContent(request: GuardianVerificationRequest): Promise<GuardianVerificationResult> {
    if (this.useMockMode) {
      return this.mockVerifyContent(request);
    }

    try {
      return await this.realVerifyContent(request);
    } catch (error: any) {
      console.warn(`⚠️  Guardian API call failed: ${error.message}`);
      
      if (this.config.fallbackToMock) {
        console.log('🔄 Falling back to mock mode');
        this.useMockMode = true;
        return this.mockVerifyContent(request);
      }
      
      throw new Error(`Guardian verification failed: ${error.message}`);
    }
  }

  /**
   * Real Guardian API call (when API access is available)
   * 
   * Enhanced with better error handling and content matching integration.
   * Supports Videntifier fingerprint matching as described in the integration guide.
   */
  private async realVerifyContent(request: GuardianVerificationRequest): Promise<GuardianVerificationResult> {
    const startTime = Date.now();

    // Generate or use provided fingerprint
    const fingerprint = request.fingerprint || await this.generateFingerprint(request);

    // Call Guardian API with enhanced payload
    // Try /match endpoint first (for content matching), fallback to /verify
    const payload = {
      fingerprint: fingerprint.hash,
      contentType: request.contentType,
      checkType: request.checkType,
      algorithm: fingerprint.algorithm,
      // Include fingerprint metadata for better matching
      metadata: fingerprint.metadata,
      // Include content URL if available for Videntifier matching
      ...(request.contentUrl && { contentUrl: request.contentUrl }),
    };

    // Try /match endpoint (preferred for Videntifier matching), fallback to /verify
    let endpoint = `${this.config.apiUrl}/match`;
    let response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.config.timeout),
    });

    // If /match endpoint doesn't exist, try /verify
    if (!response.ok && response.status === 404) {
      endpoint = `${this.config.apiUrl}/verify`;
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.config.timeout),
      });
    }

    if (!response.ok) {
      throw new Error(`Guardian API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    const processingTime = Date.now() - startTime;

    // Enhanced match processing with sourceUAL extraction
    const matches: GuardianMatch[] = (data.matches || []).map((match: any) => ({
      matchId: match.id || match.matchId || `match-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      confidence: match.confidence || 0.5,
      matchType: match.type || match.matchType || request.checkType,
      sourceUAL: match.sourceUAL || match.ual || match.sourceAssetUAL,
      timestamp: match.timestamp || Date.now(),
      metadata: {
        ...match.metadata,
        // Include Videntifier-specific metadata if available
        videntifierMatch: match.videntifierMatch,
        detectionMethod: match.detectionMethod || 'perceptual-hash',
      },
    }));

    return {
      status: matches.length > 0 ? 'flagged' : 'verified',
      confidence: data.confidence || (matches.length > 0 ? Math.max(...matches.map(m => m.confidence)) : 0.1),
      matches,
      recommendedAction: this.determineAction(matches, data.confidence || 0.5),
      evidenceUAL: data.evidenceUAL || data.ual,
      fingerprint,
      timestamp: Date.now(),
      processingTime,
      summary: data.summary || this.generateSummary(matches, request.checkType),
    };
  }

  /**
   * Generate summary text for verification result
   */
  private generateSummary(matches: GuardianMatch[], checkType: string): string {
    if (matches.length === 0) {
      return `Content verified clean. No matches found in harmful content database for ${checkType} check.`;
    }

    const matchTypes = matches.map(m => m.matchType).join(', ');
    const avgConfidence = matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length;
    
    return `Content flagged with ${(avgConfidence * 100).toFixed(1)}% confidence. ` +
           `Match(es) found in Videntifier database: ${matchTypes}. ` +
           `Source UAL(s): ${matches.map(m => m.sourceUAL || 'N/A').join(', ')}`;
  }

  /**
   * Mock verification for development/demo
   */
  private async mockVerifyContent(request: GuardianVerificationRequest): Promise<GuardianVerificationResult> {
    console.log(`🔧 [MOCK] Verifying content: ${request.contentType} (${request.checkType})`);

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    // Generate fingerprint if not provided
    const fingerprint = request.fingerprint || await this.generateFingerprint(request);

    // Mock logic: randomly flag some content based on check type
    const shouldFlag = this.shouldMockFlag(request.checkType, fingerprint.hash);
    const confidence = shouldFlag 
      ? 0.7 + Math.random() * 0.25 // 0.7-0.95 for flagged
      : 0.1 + Math.random() * 0.2; // 0.1-0.3 for clean

    const matches: GuardianMatch[] = shouldFlag ? [{
      matchId: `match-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      confidence: confidence,
      matchType: request.checkType === 'all' 
        ? (['deepfake', 'csam', 'illicit', 'misinformation'][Math.floor(Math.random() * 4)] as any)
        : request.checkType,
      sourceUAL: `ual:dkg:videntifier-db:${fingerprint.hash.substr(0, 16)}`,
      timestamp: Date.now(),
      metadata: {
        source: 'videntifier-database',
        detectionMethod: 'perceptual-hash',
      },
    }] : [];

    return {
      status: shouldFlag ? 'flagged' : 'verified',
      confidence,
      matches,
      recommendedAction: shouldFlag 
        ? (confidence > 0.85 ? 'takedown' : 'flag')
        : 'allow',
      evidenceUAL: shouldFlag 
        ? `ual:dkg:guardian-verification:${fingerprint.hash.substr(0, 16)}`
        : undefined,
      fingerprint,
      timestamp: Date.now(),
      processingTime: 150 + Math.random() * 100,
      summary: shouldFlag
        ? `Content flagged with ${(confidence * 100).toFixed(1)}% confidence. Match found in Videntifier database.`
        : `Content verified clean. No matches found in harmful content database.`,
    };
  }

  /**
   * Generate content fingerprint
   */
  async generateFingerprint(request: GuardianVerificationRequest): Promise<ContentFingerprint> {
    // In production, this would use actual fingerprinting libraries
    // For now, generate a mock fingerprint based on content URL or hash
    
    let hash: string;
    if (request.contentUrl) {
      // Generate deterministic hash from URL
      const encoder = new TextEncoder();
      const data = encoder.encode(request.contentUrl);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      hash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } else {
      // Random hash for demo
      hash = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }

    return {
      hash,
      algorithm: 'videntifier', // Default to Videntifier algorithm
      metadata: {
        contentType: request.contentType,
      },
    };
  }

  /**
   * Determine recommended action based on matches and confidence
   */
  private determineAction(matches: any[], confidence: number): 'flag' | 'takedown' | 'monitor' | 'allow' {
    if (matches.length === 0) {
      return 'allow';
    }

    // High confidence + severe violation = takedown
    if (confidence > 0.85) {
      const hasSevereViolation = matches.some(m => 
        m.type === 'csam' || m.type === 'illicit'
      );
      if (hasSevereViolation) {
        return 'takedown';
      }
    }

    // Medium confidence = flag
    if (confidence > 0.6) {
      return 'flag';
    }

    // Low confidence = monitor
    if (confidence > 0.4) {
      return 'monitor';
    }

    return 'allow';
  }

  /**
   * Mock flagging logic (for demo purposes)
   */
  private shouldMockFlag(checkType: string, hash: string): boolean {
    // Deterministic but seemingly random flagging based on hash
    // This ensures consistent results for same content in demo
    const hashNum = parseInt(hash.substr(0, 8), 16);
    const threshold = checkType === 'csam' ? 0.1 : // 10% for CSAM
                     checkType === 'illicit' ? 0.15 : // 15% for illicit
                     checkType === 'deepfake' ? 0.2 : // 20% for deepfake
                     0.25; // 25% for misinformation/all
    
    return (hashNum % 100) / 100 < threshold;
  }

  /**
   * Check if Guardian API is available
   */
  async healthCheck(): Promise<boolean> {
    if (this.useMockMode) {
      return true; // Mock mode is always "healthy"
    }

    try {
      const response = await fetch(`${this.config.apiUrl}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get client status
   */
  getStatus(): {
    mockMode: boolean;
    apiUrl: string;
    hasApiKey: boolean;
  } {
    return {
      mockMode: this.useMockMode,
      apiUrl: this.config.apiUrl,
      hasApiKey: !!this.config.apiKey,
    };
  }
}

// Singleton instance
let guardianApiInstance: GuardianApiClient | null = null;

export function getGuardianApi(config?: GuardianConfig): GuardianApiClient {
  if (!guardianApiInstance) {
    guardianApiInstance = new GuardianApiClient(config);
  }
  return guardianApiInstance;
}

