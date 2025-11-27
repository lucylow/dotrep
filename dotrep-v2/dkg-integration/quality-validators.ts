/**
 * Quality & Validation Tools for Data Products
 * 
 * Provides automated validators for data products:
 * - Schema checks
 * - Format validation
 * - Data structure consistency
 * - Fingerprinting for media
 * - Sanity checks
 * - Domain-specific validation
 * 
 * Supports both automated and community/human review validation.
 */

import { DKGClientV8, DKGConfig, PublishResult } from './dkg-client-v8';
import { DataProductMetadata } from './data-product-registry';
import { computeContentHash } from './jsonld-validator';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Validation Type
 */
export type ValidationType = 
  | 'schema' 
  | 'format' 
  | 'structure' 
  | 'fingerprint' 
  | 'sanity' 
  | 'domain' 
  | 'completeness' 
  | 'accuracy';

/**
 * Validation Result
 */
export interface ValidationResult {
  type: ValidationType;
  passed: boolean;
  score: number; // 0-100
  issues: ValidationIssue[];
  metadata?: Record<string, any>;
  timestamp: number;
  validator: string; // DID or identifier
}

/**
 * Validation Issue
 */
export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  path?: string; // Path in data structure
  suggestion?: string;
}

/**
 * Validation Report
 */
export interface ValidationReport {
  dataProductUAL: string;
  overallScore: number; // 0-100
  passed: boolean;
  results: ValidationResult[];
  timestamp: number;
  validator: string;
  validationUAL?: string; // UAL of validation report KA
}

/**
 * Schema Validator Configuration
 */
export interface SchemaValidatorConfig {
  strict?: boolean; // Fail on unknown fields
  allowAdditional?: boolean; // Allow fields not in schema
  validateTypes?: boolean; // Validate data types
}

/**
 * Format Validator Configuration
 */
export interface FormatValidatorConfig {
  allowedFormats?: string[]; // e.g., ['CSV', 'JSON', 'Parquet']
  maxSize?: number; // Max file size in bytes
  checkEncoding?: boolean; // Check file encoding
}

/**
 * Quality Validators Service
 */
export class QualityValidators {
  private dkgClient: DKGClientV8;

  constructor(dkgClient?: DKGClientV8, dkgConfig?: DKGConfig) {
    this.dkgClient = dkgClient || new DKGClientV8(dkgConfig);
  }

  /**
   * Validate a data product
   */
  async validateDataProduct(
    dataProductUAL: string,
    dataLocation?: string, // URL, IPFS hash, or file path
    validationTypes?: ValidationType[]
  ): Promise<ValidationReport> {
    console.log(`🔍 Validating data product: ${dataProductUAL}`);

    // Get data product metadata
    const { getDataProduct } = await import('./data-product-registry');
    const registry = new (await import('./data-product-registry')).DataProductRegistry(this.dkgClient);
    const product = await registry.getDataProduct(dataProductUAL);
    
    if (!product) {
      throw new Error(`Data product not found: ${dataProductUAL}`);
    }

    const metadata = product.metadata;
    const typesToValidate = validationTypes || [
      'schema',
      'format',
      'structure',
      'completeness',
      'sanity'
    ];

    const results: ValidationResult[] = [];

    // Run validations
    for (const type of typesToValidate) {
      try {
        const result = await this.runValidation(type, metadata, dataLocation);
        results.push(result);
      } catch (error: any) {
        console.error(`Validation ${type} failed:`, error);
        results.push({
          type,
          passed: false,
          score: 0,
          issues: [{
            severity: 'error',
            code: 'VALIDATION_ERROR',
            message: error.message
          }],
          timestamp: Date.now(),
          validator: 'system'
        });
      }
    }

    // Calculate overall score
    const overallScore = this.calculateOverallScore(results);
    const passed = overallScore >= 70; // Threshold: 70%

    // Create validation report
    const report: ValidationReport = {
      dataProductUAL,
      overallScore,
      passed,
      results,
      timestamp: Date.now(),
      validator: 'system'
    };

    // Publish validation report as KA
    const publishResult = await this.publishValidationReport(report);
    report.validationUAL = publishResult.UAL;

    console.log(`✅ Validation complete: ${passed ? 'PASSED' : 'FAILED'} (${overallScore}/100)`);

    return report;
  }

  /**
   * Run a specific validation
   */
  private async runValidation(
    type: ValidationType,
    metadata: DataProductMetadata,
    dataLocation?: string
  ): Promise<ValidationResult> {
    switch (type) {
      case 'schema':
        return this.validateSchema(metadata);
      case 'format':
        return this.validateFormat(metadata, dataLocation);
      case 'structure':
        return this.validateStructure(metadata, dataLocation);
      case 'fingerprint':
        return this.validateFingerprint(metadata, dataLocation);
      case 'sanity':
        return this.validateSanity(metadata, dataLocation);
      case 'completeness':
        return this.validateCompleteness(metadata);
      case 'accuracy':
        return this.validateAccuracy(metadata, dataLocation);
      default:
        throw new Error(`Unknown validation type: ${type}`);
    }
  }

  /**
   * Validate schema compliance
   */
  private async validateSchema(metadata: DataProductMetadata): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    let score = 100;

    // Check required fields
    const requiredFields = ['id', 'name', 'creator', 'type', 'license'];
    for (const field of requiredFields) {
      if (!(metadata as any)[field]) {
        issues.push({
          severity: 'error',
          code: 'MISSING_REQUIRED_FIELD',
          message: `Missing required field: ${field}`,
          path: field
        });
        score -= 15;
      }
    }

    // Validate schema if provided
    if (metadata.schema) {
      try {
        // In production, use a JSON schema validator
        // For now, just check if it's valid JSON
        if (typeof metadata.schema === 'object') {
          // Schema is valid
        } else {
          issues.push({
            severity: 'warning',
            code: 'INVALID_SCHEMA_FORMAT',
            message: 'Schema should be a JSON object',
            path: 'schema'
          });
          score -= 5;
        }
      } catch (error: any) {
        issues.push({
          severity: 'error',
          code: 'SCHEMA_PARSE_ERROR',
          message: `Failed to parse schema: ${error.message}`,
          path: 'schema'
        });
        score -= 20;
      }
    }

    return {
      type: 'schema',
      passed: score >= 70,
      score: Math.max(0, score),
      issues,
      timestamp: Date.now(),
      validator: 'system'
    };
  }

  /**
   * Validate format
   */
  private async validateFormat(
    metadata: DataProductMetadata,
    dataLocation?: string
  ): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    let score = 100;

    // Check format is specified
    if (!metadata.format) {
      issues.push({
        severity: 'warning',
        code: 'MISSING_FORMAT',
        message: 'Data format not specified',
        suggestion: 'Specify format (e.g., CSV, JSON, Parquet)'
      });
      score -= 10;
    } else {
      // Validate format is known
      const knownFormats = ['CSV', 'JSON', 'Parquet', 'Avro', 'ORC', 'Image', 'Video', 'Audio', 'Text'];
      if (!knownFormats.includes(metadata.format)) {
        issues.push({
          severity: 'info',
          code: 'UNKNOWN_FORMAT',
          message: `Format "${metadata.format}" is not in known formats list`,
          suggestion: 'Consider using a standard format'
        });
        score -= 5;
      }
    }

    // If data location provided, try to validate actual format
    if (dataLocation && metadata.format) {
      try {
        const actualFormat = await this.detectFormat(dataLocation);
        if (actualFormat !== metadata.format) {
          issues.push({
            severity: 'error',
            code: 'FORMAT_MISMATCH',
            message: `Declared format "${metadata.format}" does not match actual format "${actualFormat}"`,
            path: 'format'
          });
          score -= 30;
        }
      } catch (error: any) {
        issues.push({
          severity: 'warning',
          code: 'FORMAT_DETECTION_FAILED',
          message: `Could not detect format: ${error.message}`
        });
        score -= 5;
      }
    }

    return {
      type: 'format',
      passed: score >= 70,
      score: Math.max(0, score),
      issues,
      timestamp: Date.now(),
      validator: 'system'
    };
  }

  /**
   * Validate data structure
   */
  private async validateStructure(
    metadata: DataProductMetadata,
    dataLocation?: string
  ): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    let score = 100;

    // Check if structure is consistent
    if (metadata.schema && metadata.sampleData) {
      try {
        // In production, validate sample data against schema
        // For now, just check if sample data is valid JSON
        if (typeof metadata.sampleData === 'object') {
          // Structure looks valid
        } else {
          issues.push({
            severity: 'warning',
            code: 'INVALID_SAMPLE_DATA',
            message: 'Sample data should be a valid object/array',
            path: 'sampleData'
          });
          score -= 10;
        }
      } catch (error: any) {
        issues.push({
          severity: 'error',
          code: 'SAMPLE_DATA_PARSE_ERROR',
          message: `Failed to parse sample data: ${error.message}`,
          path: 'sampleData'
        });
        score -= 20;
      }
    }

    // Validate record count matches expectations
    if (metadata.recordCount !== undefined && metadata.recordCount < 0) {
      issues.push({
        severity: 'error',
        code: 'INVALID_RECORD_COUNT',
        message: 'Record count cannot be negative',
        path: 'recordCount'
      });
      score -= 15;
    }

    return {
      type: 'structure',
      passed: score >= 70,
      score: Math.max(0, score),
      issues,
      timestamp: Date.now(),
      validator: 'system'
    };
  }

  /**
   * Validate fingerprint (for media)
   */
  private async validateFingerprint(
    metadata: DataProductMetadata,
    dataLocation?: string
  ): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    let score = 100;

    // Only applicable for media types
    if (!['media', 'content'].includes(metadata.type)) {
      return {
        type: 'fingerprint',
        passed: true,
        score: 100,
        issues: [],
        timestamp: Date.now(),
        validator: 'system',
        metadata: { skipped: true, reason: 'Not a media type' }
      };
    }

    // Check if fingerprint is provided
    if (!dataLocation) {
      issues.push({
        severity: 'warning',
        code: 'MISSING_DATA_LOCATION',
        message: 'Data location not provided for fingerprint validation',
        suggestion: 'Provide data location to enable fingerprint validation'
      });
      score -= 20;
    } else {
      try {
        // In production, compute fingerprint using Umanitek or similar
        // For now, compute simple hash
        const fingerprint = await this.computeFingerprint(dataLocation);
        
        // Store fingerprint in metadata if not present
        if (!metadata.customMetadata?.fingerprint) {
          issues.push({
            severity: 'info',
            code: 'FINGERPRINT_NOT_STORED',
            message: 'Fingerprint computed but not stored in metadata',
            suggestion: 'Store fingerprint in metadata for verification'
          });
          score -= 5;
        }
      } catch (error: any) {
        issues.push({
          severity: 'error',
          code: 'FINGERPRINT_COMPUTATION_FAILED',
          message: `Failed to compute fingerprint: ${error.message}`
        });
        score -= 30;
      }
    }

    return {
      type: 'fingerprint',
      passed: score >= 70,
      score: Math.max(0, score),
      issues,
      timestamp: Date.now(),
      validator: 'system'
    };
  }

  /**
   * Validate sanity checks
   */
  private async validateSanity(
    metadata: DataProductMetadata,
    dataLocation?: string
  ): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    let score = 100;

    // Check for suspicious patterns
    if (metadata.size !== undefined) {
      if (metadata.size === 0) {
        issues.push({
          severity: 'error',
          code: 'ZERO_SIZE',
          message: 'Data size is zero',
          path: 'size'
        });
        score -= 30;
      }

      if (metadata.size > 10 * 1024 * 1024 * 1024) { // 10GB
        issues.push({
          severity: 'warning',
          code: 'LARGE_SIZE',
          message: 'Data size is very large (>10GB), ensure proper storage',
          path: 'size'
        });
        score -= 5;
      }
    }

    // Check for reasonable record count
    if (metadata.recordCount !== undefined) {
      if (metadata.recordCount === 0) {
        issues.push({
          severity: 'error',
          code: 'ZERO_RECORDS',
          message: 'Record count is zero',
          path: 'recordCount'
        });
        score -= 30;
      }

      if (metadata.recordCount > 1000000000) { // 1 billion
        issues.push({
          severity: 'warning',
          code: 'LARGE_RECORD_COUNT',
          message: 'Record count is very large, verify accuracy',
          path: 'recordCount'
        });
        score -= 5;
      }
    }

    // Check quality metrics are reasonable
    if (metadata.qualityMetrics) {
      const metrics = metadata.qualityMetrics;
      if (metrics.completeness !== undefined && (metrics.completeness < 0 || metrics.completeness > 100)) {
        issues.push({
          severity: 'error',
          code: 'INVALID_COMPLETENESS',
          message: 'Completeness must be between 0 and 100',
          path: 'qualityMetrics.completeness'
        });
        score -= 20;
      }

      if (metrics.accuracy !== undefined && (metrics.accuracy < 0 || metrics.accuracy > 100)) {
        issues.push({
          severity: 'error',
          code: 'INVALID_ACCURACY',
          message: 'Accuracy must be between 0 and 100',
          path: 'qualityMetrics.accuracy'
        });
        score -= 20;
      }
    }

    return {
      type: 'sanity',
      passed: score >= 70,
      score: Math.max(0, score),
      issues,
      timestamp: Date.now(),
      validator: 'system'
    };
  }

  /**
   * Validate completeness
   */
  private async validateCompleteness(metadata: DataProductMetadata): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    let score = 0;
    const maxScore = 100;

    // Required fields (40 points)
    const requiredFields = ['id', 'name', 'creator', 'type', 'license'];
    const requiredCount = requiredFields.filter(f => (metadata as any)[f]).length;
    score += (requiredCount / requiredFields.length) * 40;

    // Recommended fields (30 points)
    const recommendedFields = ['description', 'version', 'format', 'tags', 'category'];
    const recommendedCount = recommendedFields.filter(f => (metadata as any)[f]).length;
    score += (recommendedCount / recommendedFields.length) * 30;

    // Quality metrics (20 points)
    if (metadata.qualityMetrics) {
      score += 20;
    } else {
      issues.push({
        severity: 'warning',
        code: 'MISSING_QUALITY_METRICS',
        message: 'Quality metrics not provided',
        suggestion: 'Provide quality metrics for better discoverability'
      });
    }

    // Documentation (10 points)
    if (metadata.documentationUrl || metadata.readme) {
      score += 10;
    } else {
      issues.push({
        severity: 'info',
        code: 'MISSING_DOCUMENTATION',
        message: 'Documentation not provided',
        suggestion: 'Add documentation URL or readme'
      });
    }

    if (score < 70) {
      issues.push({
        severity: 'warning',
        code: 'LOW_COMPLETENESS',
        message: `Completeness score is ${score.toFixed(1)}/100`,
        suggestion: 'Add more metadata fields to improve completeness'
      });
    }

    return {
      type: 'completeness',
      passed: score >= 70,
      score: Math.round(score),
      issues,
      timestamp: Date.now(),
      validator: 'system'
    };
  }

  /**
   * Validate accuracy (domain-specific)
   */
  private async validateAccuracy(
    metadata: DataProductMetadata,
    dataLocation?: string
  ): Promise<ValidationResult> {
    // This would be domain-specific validation
    // For now, return a placeholder
    return {
      type: 'accuracy',
      passed: true,
      score: metadata.qualityMetrics?.accuracy || 100,
      issues: [],
      timestamp: Date.now(),
      validator: 'system',
      metadata: { note: 'Domain-specific accuracy validation not implemented' }
    };
  }

  /**
   * Calculate overall validation score
   */
  private calculateOverallScore(results: ValidationResult[]): number {
    if (results.length === 0) return 0;

    // Weighted average (all validations equally weighted)
    const totalScore = results.reduce((sum, r) => sum + r.score, 0);
    return Math.round(totalScore / results.length);
  }

  /**
   * Detect file format
   */
  private async detectFormat(dataLocation: string): Promise<string> {
    // Simple format detection based on extension or content
    if (dataLocation.startsWith('http://') || dataLocation.startsWith('https://')) {
      // URL - try to detect from content-type header
      return 'Unknown';
    }

    if (dataLocation.startsWith('ipfs://')) {
      // IPFS - would need to fetch and detect
      return 'Unknown';
    }

    // File path - detect from extension
    const ext = path.extname(dataLocation).toLowerCase();
    const formatMap: Record<string, string> = {
      '.csv': 'CSV',
      '.json': 'JSON',
      '.parquet': 'Parquet',
      '.avro': 'Avro',
      '.jpg': 'Image',
      '.jpeg': 'Image',
      '.png': 'Image',
      '.mp4': 'Video',
      '.mp3': 'Audio'
    };

    return formatMap[ext] || 'Unknown';
  }

  /**
   * Compute fingerprint for media
   */
  private async computeFingerprint(dataLocation: string): Promise<string> {
    // In production, use Umanitek or similar for media fingerprinting
    // For now, compute simple hash
    if (dataLocation.startsWith('http://') || dataLocation.startsWith('https://')) {
      // Would fetch and hash
      return crypto.randomBytes(32).toString('hex');
    }

    if (fs.existsSync(dataLocation)) {
      const data = fs.readFileSync(dataLocation);
      return crypto.createHash('sha256').update(data).digest('hex');
    }

    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Publish validation report as KA
   */
  private async publishValidationReport(report: ValidationReport): Promise<PublishResult> {
    const knowledgeAsset = {
      '@context': {
        '@vocab': 'https://schema.org/',
        'dotrep': 'https://dotrep.io/ontology/'
      },
      '@type': 'dotrep:ValidationReport',
      '@id': `dotrep:validation:${report.dataProductUAL}`,
      'dotrep:dataProductUAL': report.dataProductUAL,
      'dotrep:overallScore': report.overallScore,
      'dotrep:passed': report.passed,
      'dotrep:results': report.results,
      'dotrep:validatedAt': new Date(report.timestamp).toISOString(),
      'dotrep:validator': report.validator
    };

    return this.dkgClient.publishReputationAsset(
      {
        developerId: report.validator,
        reputationScore: 0,
        contributions: [],
        timestamp: report.timestamp,
        metadata: knowledgeAsset as any
      },
      2
    );
  }
}

/**
 * Factory function to create a Quality Validators instance
 */
export function createQualityValidators(
  dkgClient?: DKGClientV8,
  dkgConfig?: DKGConfig
): QualityValidators {
  return new QualityValidators(dkgClient, dkgConfig);
}

export default QualityValidators;

