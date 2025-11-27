/**
 * SPARQL Query Validation and Sanitization
 * 
 * Provides validation and sanitization for SPARQL queries to ensure
 * safe and correct query execution on the DKG Edge Node.
 * 
 * @module sparql-validator
 */

/**
 * SPARQL query validation result
 */
export interface SPARQLValidationResult {
  valid: boolean;
  errors: SPARQLError[];
  warnings: SPARQLWarning[];
  sanitizedQuery?: string;
  queryType?: 'SELECT' | 'CONSTRUCT' | 'ASK' | 'DESCRIBE' | 'UPDATE';
}

/**
 * SPARQL validation error
 */
export interface SPARQLError {
  line?: number;
  column?: number;
  message: string;
  code: string;
  severity: 'error' | 'warning';
}

/**
 * SPARQL validation warning
 */
export interface SPARQLWarning {
  line?: number;
  column?: number;
  message: string;
  code: string;
}

/**
 * SPARQL Query Validator
 * 
 * Validates and sanitizes SPARQL queries before execution
 */
export class SPARQLValidator {
  private readonly allowedPrefixes = new Set([
    'PREFIX',
    'prefix',
    'BASE',
    'base'
  ]);

  private readonly allowedQueryTypes = new Set([
    'SELECT',
    'CONSTRUCT',
    'ASK',
    'DESCRIBE'
  ]);

  private readonly dangerousKeywords = new Set([
    'DROP',
    'DELETE',
    'INSERT',
    'LOAD',
    'CLEAR',
    'CREATE',
    'COPY',
    'MOVE',
    'ADD'
  ]);

  private readonly allowedFunctions = new Set([
    'COUNT',
    'SUM',
    'AVG',
    'MIN',
    'MAX',
    'GROUP_CONCAT',
    'STR',
    'LANG',
    'LANGMATCHES',
    'DATATYPE',
    'BOUND',
    'IRI',
    'URI',
    'BNODE',
    'RAND',
    'ABS',
    'CEIL',
    'FLOOR',
    'ROUND',
    'CONCAT',
    'STRLEN',
    'UCASE',
    'LCASE',
    'ENCODE_FOR_URI',
    'SUBSTR',
    'STRSTARTS',
    'STRENDS',
    'CONTAINS',
    'STRBEFORE',
    'STRAFTER',
    'REPLACE',
    'REGEX',
    'YEAR',
    'MONTH',
    'DAY',
    'HOURS',
    'MINUTES',
    'SECONDS',
    'TIMEZONE',
    'TZ',
    'NOW',
    'YEAR',
    'MD5',
    'SHA1',
    'SHA256',
    'SHA384',
    'SHA512'
  ]);

  /**
   * Validate a SPARQL query
   * 
   * @param query - The SPARQL query string to validate
   * @param options - Validation options
   * @returns Validation result with errors and sanitized query
   * 
   * @example
   * ```typescript
   * const validator = new SPARQLValidator();
   * const result = await validator.validate(query);
   * if (result.valid) {
   *   const sanitizedQuery = result.sanitizedQuery;
   *   // Execute query safely
   * }
   * ```
   */
  validate(
    query: string,
    options: {
      allowUpdates?: boolean;
      maxQueryLength?: number;
      allowedNamespaces?: string[];
    } = {}
  ): SPARQLValidationResult {
    const errors: SPARQLError[] = [];
    const warnings: SPARQLWarning[] = [];
    const {
      allowUpdates = false,
      maxQueryLength = 10000,
      allowedNamespaces = []
    } = options;

    // 1. Basic checks
    if (!query || typeof query !== 'string') {
      return {
        valid: false,
        errors: [{
          message: 'Query must be a non-empty string',
          code: 'INVALID_QUERY_TYPE',
          severity: 'error'
        }],
        warnings: []
      };
    }

    // 2. Length check
    if (query.length > maxQueryLength) {
      errors.push({
        message: `Query exceeds maximum length of ${maxQueryLength} characters`,
        code: 'QUERY_TOO_LONG',
        severity: 'error'
      });
    }

    // 3. Check for dangerous keywords (unless updates are allowed)
    if (!allowUpdates) {
      const upperQuery = query.toUpperCase();
      for (const keyword of this.dangerousKeywords) {
        if (upperQuery.includes(` ${keyword} `) || upperQuery.startsWith(`${keyword} `)) {
          errors.push({
            message: `Dangerous keyword "${keyword}" is not allowed in read-only queries`,
            code: 'DANGEROUS_KEYWORD',
            severity: 'error'
          });
        }
      }
    }

    // 4. Validate query type
    const queryType = this.detectQueryType(query);
    if (!queryType) {
      errors.push({
        message: 'Could not determine query type. Query must start with SELECT, CONSTRUCT, ASK, or DESCRIBE',
        code: 'INVALID_QUERY_TYPE',
        severity: 'error'
      });
    } else if (!this.allowedQueryTypes.has(queryType)) {
      if (!allowUpdates || queryType !== 'UPDATE') {
        errors.push({
          message: `Query type "${queryType}" is not allowed`,
          code: 'UNALLOWED_QUERY_TYPE',
          severity: 'error'
        });
      }
    }

    // 5. Validate prefixes
    this.validatePrefixes(query, allowedNamespaces, errors, warnings);

    // 6. Validate basic syntax
    this.validateBasicSyntax(query, errors, warnings);

    // 7. Sanitize query if valid
    let sanitizedQuery: string | undefined;
    if (errors.length === 0) {
      try {
        sanitizedQuery = this.sanitize(query);
      } catch (error: any) {
        errors.push({
          message: `Sanitization failed: ${error.message}`,
          code: 'SANITIZATION_ERROR',
          severity: 'error'
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      sanitizedQuery,
      queryType: queryType as any
    };
  }

  /**
   * Detect query type from SPARQL query
   */
  private detectQueryType(query: string): string | null {
    const trimmed = query.trim().toUpperCase();
    
    for (const type of this.allowedQueryTypes) {
      if (trimmed.startsWith(type)) {
        return type;
      }
    }
    
    // Check for UPDATE queries
    if (trimmed.startsWith('UPDATE') || trimmed.includes('INSERT') || trimmed.includes('DELETE')) {
      return 'UPDATE';
    }
    
    return null;
  }

  /**
   * Validate prefixes in the query
   */
  private validatePrefixes(
    query: string,
    allowedNamespaces: string[],
    errors: SPARQLError[],
    warnings: SPARQLWarning[]
  ): void {
    const prefixRegex = /PREFIX\s+(\w+):\s*<([^>]+)>/gi;
    const matches = Array.from(query.matchAll(prefixRegex));
    
    // Check for well-known prefixes
    const knownPrefixes = new Map([
      ['schema', 'https://schema.org/'],
      ['rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'],
      ['rdfs', 'http://www.w3.org/2000/01/rdf-schema#'],
      ['owl', 'http://www.w3.org/2002/07/owl#'],
      ['xsd', 'http://www.w3.org/2001/XMLSchema#'],
      ['foaf', 'http://xmlns.com/foaf/0.1/'],
      ['dc', 'http://purl.org/dc/elements/1.1/'],
      ['dcterms', 'http://purl.org/dc/terms/'],
      ['dotrep', 'https://dotrep.io/ontology/'],
      ['polkadot', 'https://polkadot.network/ontology/']
    ]);

    for (const match of matches) {
      const prefix = match[1];
      const namespace = match[2];
      
      // Validate namespace is a valid URL
      try {
        new URL(namespace);
      } catch {
        errors.push({
          message: `Invalid namespace URL for prefix "${prefix}": ${namespace}`,
          code: 'INVALID_NAMESPACE_URL',
          severity: 'error'
        });
      }
      
      // Check if prefix matches known namespace
      const knownNamespace = knownPrefixes.get(prefix.toLowerCase());
      if (knownNamespace && knownNamespace !== namespace) {
        warnings.push({
          message: `Prefix "${prefix}" namespace "${namespace}" does not match expected "${knownNamespace}"`,
          code: 'NAMESPACE_MISMATCH'
        });
      }
      
      // Check if namespace is in allowed list
      if (allowedNamespaces.length > 0 && !allowedNamespaces.includes(namespace)) {
        errors.push({
          message: `Namespace "${namespace}" is not in the allowed list`,
          code: 'UNAUTHORIZED_NAMESPACE',
          severity: 'error'
        });
      }
    }
  }

  /**
   * Validate basic SPARQL syntax
   */
  private validateBasicSyntax(
    query: string,
    errors: SPARQLError[],
    warnings: SPARQLWarning[]
  ): void {
    // Check for balanced braces
    const openBraces = (query.match(/{/g) || []).length;
    const closeBraces = (query.match(/}/g) || []).length;
    
    if (openBraces !== closeBraces) {
      errors.push({
        message: `Unbalanced braces: ${openBraces} open, ${closeBraces} close`,
        code: 'UNBALANCED_BRACES',
        severity: 'error'
      });
    }
    
    // Check for balanced parentheses
    const openParens = (query.match(/\(/g) || []).length;
    const closeParens = (query.match(/\)/g) || []).length;
    
    if (openParens !== closeParens) {
      errors.push({
        message: `Unbalanced parentheses: ${openParens} open, ${closeParens} close`,
        code: 'UNBALANCED_PARENTHESES',
        severity: 'error'
      });
    }
    
    // Check for SQL injection patterns (basic)
    const sqlInjectionPatterns = [
      /;\s*DROP/i,
      /;\s*DELETE/i,
      /;\s*INSERT/i,
      /UNION\s+SELECT/i,
      /'\s*OR\s*'1'\s*=\s*'1/i
    ];
    
    for (const pattern of sqlInjectionPatterns) {
      if (pattern.test(query)) {
        errors.push({
          message: 'Potentially dangerous SQL injection pattern detected',
          code: 'SQL_INJECTION_PATTERN',
          severity: 'error'
        });
        break;
      }
    }
    
    // Check for LIMIT clause
    const hasLimit = /\bLIMIT\s+\d+/i.test(query);
    if (!hasLimit) {
      warnings.push({
        message: 'Query does not have a LIMIT clause, which may cause performance issues',
        code: 'MISSING_LIMIT'
      });
    } else {
      // Check LIMIT value is reasonable
      const limitMatch = query.match(/\bLIMIT\s+(\d+)/i);
      if (limitMatch) {
        const limitValue = parseInt(limitMatch[1], 10);
        if (limitValue > 1000) {
          warnings.push({
            message: `LIMIT value ${limitValue} is very large and may cause performance issues`,
            code: 'LARGE_LIMIT'
          });
        }
      }
    }
  }

  /**
   * Sanitize SPARQL query
   * 
   * Removes comments, normalizes whitespace, and ensures safe formatting
   */
  private sanitize(query: string): string {
    let sanitized = query;
    
    // Remove single-line comments
    sanitized = sanitized.replace(/#[^\n]*/g, '');
    
    // Remove multi-line comments (SPARQL doesn't support them, but clean anyway)
    sanitized = sanitized.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ');
    sanitized = sanitized.replace(/\s*{\s*/g, ' { ');
    sanitized = sanitized.replace(/\s*}\s*/g, ' } ');
    sanitized = sanitized.replace(/\s*.\s*/g, ' . ');
    sanitized = sanitized.replace(/\s*;\s*/g, ' ; ');
    sanitized = sanitized.replace(/\s*,\s*/g, ' , ');
    
    // Remove leading/trailing whitespace
    sanitized = sanitized.trim();
    
    return sanitized;
  }

  /**
   * Escape string literals in SPARQL queries
   * 
   * Prevents injection attacks by properly escaping user input
   */
  escapeStringLiteral(value: string): string {
    // Escape backslashes first
    let escaped = value.replace(/\\/g, '\\\\');
    
    // Escape quotes
    escaped = escaped.replace(/"/g, '\\"');
    
    // Escape newlines
    escaped = escaped.replace(/\n/g, '\\n');
    escaped = escaped.replace(/\r/g, '\\r');
    escaped = escaped.replace(/\t/g, '\\t');
    
    return escaped;
  }

  /**
   * Create a safe SPARQL query with parameter binding
   * 
   * @param queryTemplate - Query template with placeholders
   * @param parameters - Parameters to bind
   * @returns Validated and sanitized query
   */
  createSafeQuery(
    queryTemplate: string,
    parameters: Record<string, string | number>
  ): SPARQLValidationResult {
    let query = queryTemplate;
    
    // Replace placeholders with escaped values
    for (const [key, value] of Object.entries(parameters)) {
      const placeholder = `{{${key}}}`;
      if (query.includes(placeholder)) {
        const escapedValue = typeof value === 'string' 
          ? `"${this.escapeStringLiteral(value)}"` 
          : value.toString();
        query = query.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), escapedValue);
      }
    }
    
    // Validate the resulting query
    return this.validate(query);
  }
}

/**
 * Default validator instance
 */
export const sparqlValidator = new SPARQLValidator();

/**
 * Convenience function to validate a SPARQL query
 */
export function validateSPARQL(
  query: string,
  options?: {
    allowUpdates?: boolean;
    maxQueryLength?: number;
    allowedNamespaces?: string[];
  }
): SPARQLValidationResult {
  return sparqlValidator.validate(query, options);
}

/**
 * Convenience function to escape a string literal
 */
export function escapeSPARQLString(value: string): string {
  return sparqlValidator.escapeStringLiteral(value);
}

