/**
 * JSON-LD Validation and Canonicalization Utilities
 * 
 * Provides W3C-compliant JSON-LD validation, canonicalization, and schema validation
 * for Knowledge Assets before publishing to the DKG Edge Node.
 * 
 * @module jsonld-validator
 */

import { createHash } from 'crypto';
import reputationSchema from './schemas/reputation-schema.json';
import provenanceSchema from './schemas/provenance-schema.json';

/**
 * Validation result for JSON-LD documents
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  canonicalForm?: string;
  contentHash?: string;
}

/**
 * Validation error details
 */
export interface ValidationError {
  path: string;
  message: string;
  code: string;
  severity: 'error' | 'warning';
}

/**
 * Validation warning details
 */
export interface ValidationWarning {
  path: string;
  message: string;
  code: string;
}

/**
 * JSON-LD canonicalization options
 */
export interface CanonicalizationOptions {
  algorithm?: 'URDNA2015' | 'GCA2015';
  format?: 'application/n-quads' | 'application/n-quads+json';
  expandContext?: Record<string, any>;
}

/**
 * JSON-LD Validator for Knowledge Assets
 * 
 * Validates JSON-LD documents against W3C standards and custom schemas
 */
export class JSONLDValidator {
  private schemas: Map<string, any> = new Map();

  constructor() {
    // Load schemas
    this.schemas.set('reputation', reputationSchema);
    this.schemas.set('provenance', provenanceSchema);
  }

  /**
   * Validate a JSON-LD document
   * 
   * @param document - The JSON-LD document to validate
   * @param schemaType - Optional schema type to validate against ('reputation' | 'provenance')
   * @returns Validation result with errors and warnings
   * 
   * @example
   * ```typescript
   * const validator = new JSONLDValidator();
   * const result = await validator.validate(jsonldDocument, 'reputation');
   * if (!result.valid) {
   *   console.error('Validation failed:', result.errors);
   * }
   * ```
   */
  async validate(
    document: any,
    schemaType?: 'reputation' | 'provenance'
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // 1. Basic JSON-LD structure validation
    this.validateBasicStructure(document, errors, warnings);

    // 2. Context validation
    this.validateContext(document, errors, warnings);

    // 3. Type validation
    this.validateTypes(document, errors, warnings);

    // 4. Required properties validation
    this.validateRequiredProperties(document, errors, warnings);

    // 5. Schema-specific validation
    if (schemaType) {
      this.validateAgainstSchema(document, schemaType, errors, warnings);
    }

    // 6. Semantic validation
    this.validateSemantics(document, errors, warnings);

    // 7. Generate canonical form and hash if valid
    let canonicalForm: string | undefined;
    let contentHash: string | undefined;

    if (errors.length === 0) {
      try {
        canonicalForm = this.canonicalize(document);
        contentHash = this.computeContentHash(canonicalForm);
      } catch (error: any) {
        errors.push({
          path: '/',
          message: `Canonicalization failed: ${error.message}`,
          code: 'CANONICALIZATION_ERROR',
          severity: 'error'
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      canonicalForm,
      contentHash
    };
  }

  /**
   * Validate basic JSON-LD structure
   */
  private validateBasicStructure(
    document: any,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!document || typeof document !== 'object') {
      errors.push({
        path: '/',
        message: 'Document must be a valid JSON object',
        code: 'INVALID_DOCUMENT',
        severity: 'error'
      });
      return;
    }

    // Check for @context
    if (!document['@context']) {
      errors.push({
        path: '/@context',
        message: 'JSON-LD document must have a @context property',
        code: 'MISSING_CONTEXT',
        severity: 'error'
      });
    }

    // Check for @id or @type
    if (!document['@id'] && !document['@type'] && !document['@graph']) {
      warnings.push({
        path: '/',
        message: 'Document should have @id or @type for proper identification',
        code: 'MISSING_ID_OR_TYPE'
      });
    }
  }

  /**
   * Validate JSON-LD context
   */
  private validateContext(
    document: any,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const context = document['@context'];
    if (!context) return;

    // Context should be object, array, or string
    const contextType = typeof context;
    if (contextType !== 'object' && contextType !== 'string') {
      errors.push({
        path: '/@context',
        message: '@context must be an object, array, or string',
        code: 'INVALID_CONTEXT_TYPE',
        severity: 'error'
      });
      return;
    }

    // Validate vocabulary definitions
    const contexts = Array.isArray(context) ? context : [context];
    for (const ctx of contexts) {
      if (typeof ctx === 'object' && ctx !== null) {
        // Check for common vocabularies
        const vocab = ctx['@vocab'];
        if (vocab && typeof vocab === 'string') {
          try {
            new URL(vocab);
          } catch {
            warnings.push({
              path: '/@context/@vocab',
              message: `@vocab "${vocab}" is not a valid URL`,
              code: 'INVALID_VOCAB_URL'
            });
          }
        }

        // Validate namespace definitions
        for (const [key, value] of Object.entries(ctx)) {
          if (key !== '@vocab' && typeof value === 'string') {
            try {
              new URL(value);
            } catch {
              warnings.push({
                path: `/@context/${key}`,
                message: `Namespace "${key}" has invalid URL: ${value}`,
                code: 'INVALID_NAMESPACE_URL'
              });
            }
          }
        }
      }
    }
  }

  /**
   * Validate types in the document
   */
  private validateTypes(
    document: any,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const type = document['@type'];
    if (!type) return;

    const types = Array.isArray(type) ? type : [type];
    for (const t of types) {
      if (typeof t === 'string') {
        // Type should be a valid IRI or prefixed name
        if (!t.includes(':') && !t.startsWith('http')) {
          warnings.push({
            path: '/@type',
            message: `Type "${t}" should use a namespaced format (e.g., "schema:Person")`,
            code: 'UNQUALIFIED_TYPE'
          });
        }
      }
    }
  }

  /**
   * Validate required properties
   */
  private validateRequiredProperties(
    document: any,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Common required properties for Knowledge Assets
    const requiredForReputation = ['identifier', 'dotrep:reputationScore', 'dateModified'];
    
    const hasReputationType = document['@type']?.includes('Person') || 
                             document['@type']?.includes('DeveloperReputation');

    if (hasReputationType) {
      for (const prop of requiredForReputation) {
        const propPath = prop.includes(':') ? prop : prop;
        if (!this.hasProperty(document, propPath)) {
          errors.push({
            path: `/${propPath}`,
            message: `Required property "${propPath}" is missing for reputation asset`,
            code: 'MISSING_REQUIRED_PROPERTY',
            severity: 'error'
          });
        }
      }
    }
  }

  /**
   * Check if document has a property (handles nested paths)
   */
  private hasProperty(document: any, path: string): boolean {
    // Handle namespaced properties
    const keys = Object.keys(document);
    
    // Direct match
    if (keys.includes(path)) return true;
    
    // Check for namespaced versions
    if (path.includes(':')) {
      const [prefix, localName] = path.split(':');
      for (const key of keys) {
        if (key === path || key.endsWith(`:${localName}`)) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Validate against custom schema
   */
  private validateAgainstSchema(
    document: any,
    schemaType: 'reputation' | 'provenance',
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const schema = this.schemas.get(schemaType);
    if (!schema) {
      warnings.push({
        path: '/',
        message: `Schema "${schemaType}" not found, skipping schema validation`,
        code: 'SCHEMA_NOT_FOUND'
      });
      return;
    }

    // Extract classes and properties from schema
    const schemaGraph = schema['@graph'] || [];
    
    // Validate document types exist in schema
    const docType = document['@type'];
    if (docType) {
      const types = Array.isArray(docType) ? docType : [docType];
      for (const type of types) {
        const typeId = type.includes(':') ? type : `dotrep:${type}`;
        const schemaClass = schemaGraph.find((item: any) => 
          item['@id'] === typeId && item['@type'] === 'rdfs:Class'
        );
        
        if (!schemaClass) {
          warnings.push({
            path: '/@type',
            message: `Type "${type}" not found in ${schemaType} schema`,
            code: 'TYPE_NOT_IN_SCHEMA'
          });
        }
      }
    }
  }

  /**
   * Validate semantic correctness
   */
  private validateSemantics(
    document: any,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Validate date formats
    this.validateDateFormats(document, errors, warnings);
    
    // Validate URLs
    this.validateURLs(document, errors, warnings);
    
    // Validate numeric ranges
    this.validateNumericRanges(document, errors, warnings);
  }

  /**
   * Validate date formats (should be ISO 8601)
   */
  private validateDateFormats(
    document: any,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const dateFields = ['dateModified', 'datePublished', 'dateCreated', 'createdAt', 'publishedAt'];
    
    for (const field of dateFields) {
      const value = document[field];
      if (value && typeof value === 'string') {
        try {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            errors.push({
              path: `/${field}`,
              message: `Invalid date format for "${field}": ${value}. Expected ISO 8601 format.`,
              code: 'INVALID_DATE_FORMAT',
              severity: 'error'
            });
          }
        } catch (e) {
          errors.push({
            path: `/${field}`,
            message: `Invalid date format for "${field}": ${value}`,
            code: 'INVALID_DATE_FORMAT',
            severity: 'error'
          });
        }
      }
    }
  }

  /**
   * Validate URLs
   */
  private validateURLs(
    document: any,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const urlFields = ['url', 'image', 'sameAs', 'homepage'];
    
    for (const field of urlFields) {
      const value = document[field];
      if (value && typeof value === 'string') {
        try {
          new URL(value);
        } catch {
          errors.push({
            path: `/${field}`,
            message: `Invalid URL for "${field}": ${value}`,
            code: 'INVALID_URL',
            severity: 'error'
          });
        }
      }
    }
  }

  /**
   * Validate numeric ranges
   */
  private validateNumericRanges(
    document: any,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Validate reputation score (0-1000)
    const reputationScore = document['dotrep:reputationScore'] || 
                           document['reputationScore'];
    if (reputationScore !== undefined) {
      const score = typeof reputationScore === 'object' ? reputationScore['@value'] : reputationScore;
      if (typeof score === 'number') {
        if (score < 0 || score > 1000) {
          errors.push({
            path: '/dotrep:reputationScore',
            message: `Reputation score must be between 0 and 1000, got ${score}`,
            code: 'INVALID_SCORE_RANGE',
            severity: 'error'
          });
        }
      }
    }

    // Validate impact score (0-100)
    const impactScore = document['dotrep:impactScore'] || document['impactScore'];
    if (impactScore !== undefined) {
      const score = typeof impactScore === 'object' ? impactScore['@value'] : impactScore;
      if (typeof score === 'number' && (score < 0 || score > 100)) {
        warnings.push({
          path: '/dotrep:impactScore',
          message: `Impact score should be between 0 and 100, got ${score}`,
          code: 'INVALID_IMPACT_SCORE'
        });
      }
    }
  }

  /**
   * Canonicalize JSON-LD document using URDNA2015 algorithm
   * 
   * This is a simplified canonicalization. For production, consider using
   * a library like jsonld.js or rdf-canonize.
   */
  canonicalize(document: any, options?: CanonicalizationOptions): string {
    // Simplified canonicalization:
    // 1. Sort keys alphabetically
    // 2. Remove undefined/null values
    // 3. Convert to normalized JSON
    // 
    // Note: For full URDNA2015 canonicalization, use a proper library
    
    const normalized = this.normalizeDocument(document);
    return JSON.stringify(normalized, null, 0);
  }

  /**
   * Normalize document for canonicalization
   */
  private normalizeDocument(document: any): any {
    if (Array.isArray(document)) {
      return document.map(item => this.normalizeDocument(item)).sort();
    }
    
    if (document !== null && typeof document === 'object') {
      const normalized: any = {};
      
      // Process @context first
      if (document['@context']) {
        normalized['@context'] = this.normalizeContext(document['@context']);
      }
      
      // Process other keys in sorted order
      const keys = Object.keys(document)
        .filter(key => key !== '@context')
        .sort();
      
      for (const key of keys) {
        const value = document[key];
        if (value !== undefined && value !== null) {
          normalized[key] = this.normalizeDocument(value);
        }
      }
      
      return normalized;
    }
    
    return document;
  }

  /**
   * Normalize context
   */
  private normalizeContext(context: any): any {
    if (typeof context === 'string') {
      return context;
    }
    
    if (Array.isArray(context)) {
      return context.map(c => this.normalizeContext(c));
    }
    
    if (typeof context === 'object' && context !== null) {
      const normalized: any = {};
      const keys = Object.keys(context).sort();
      
      for (const key of keys) {
        normalized[key] = context[key];
      }
      
      return normalized;
    }
    
    return context;
  }

  /**
   * Compute content hash from canonical form
   */
  computeContentHash(canonicalForm: string, algorithm: string = 'sha256'): string {
    return createHash(algorithm).update(canonicalForm, 'utf8').digest('hex');
  }

  /**
   * Verify content hash
   */
  verifyContentHash(document: any, expectedHash: string): boolean {
    const canonicalForm = this.canonicalize(document);
    const computedHash = this.computeContentHash(canonicalForm);
    return computedHash === expectedHash.toLowerCase();
  }
}

/**
 * Default validator instance
 */
export const validator = new JSONLDValidator();

/**
 * Convenience function to validate a JSON-LD document
 */
export async function validateJSONLD(
  document: any,
  schemaType?: 'reputation' | 'provenance'
): Promise<ValidationResult> {
  return validator.validate(document, schemaType);
}

/**
 * Convenience function to canonicalize a JSON-LD document
 */
export function canonicalizeJSONLD(
  document: any,
  options?: CanonicalizationOptions
): string {
  return validator.canonicalize(document, options);
}

/**
 * Convenience function to compute content hash
 */
export function computeContentHash(
  document: any,
  algorithm: string = 'sha256'
): string {
  const canonicalForm = validator.canonicalize(document);
  return validator.computeContentHash(canonicalForm, algorithm);
}

