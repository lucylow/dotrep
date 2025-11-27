/**
 * JSON to JSON-LD Converter
 * 
 * Converts plain JSON data into JSON-LD (Linked Data) format by adding semantic context.
 * This enables JSON data to be processed as Linked Data and integrated with knowledge graphs.
 * 
 * The main step is to add a "@context" element that maps JSON keys to IRIs (Internationalized
 * Resource Identifiers) which define the meaning of those keys in a linked data context.
 * 
 * Features:
 * - Automatic context mapping using predefined vocabularies (Schema.org, custom ontologies)
 * - Support for inline and external context definitions
 * - Automatic @type and @id generation
 * - Nested object handling with proper @id references
 * - URL detection and proper typing
 * - Date format validation and conversion
 * 
 * @module json-to-jsonld
 * 
 * @example
 * ```typescript
 * const json = {
 *   name: "Alice",
 *   homepage: "http://alice.example.com"
 * };
 * 
 * const jsonld = convertToJSONLD(json, {
 *   baseContext: 'https://schema.org/',
 *   type: 'Person'
 * });
 * 
 * // Result:
 * // {
 * //   "@context": {
 * //     "name": "http://schema.org/name",
 * //     "homepage": { "@id": "http://schema.org/url", "@type": "@id" }
 * //   },
 * //   "@type": "Person",
 * //   "name": "Alice",
 * //   "homepage": "http://alice.example.com"
 * // }
 * ```
 */

/**
 * Conversion options for JSON to JSON-LD
 */
export interface JSONToJSONLDOptions {
  /**
   * Base context URL (e.g., 'https://schema.org/')
   * If provided, keys will be mapped to this vocabulary
   */
  baseContext?: string;
  
  /**
   * Custom context mapping object
   * Maps JSON keys to IRIs or context definitions
   */
  context?: Record<string, string | ContextDefinition>;
  
  /**
   * Type of the root object (e.g., 'Person', 'schema:Person')
   */
  type?: string | string[];
  
  /**
   * ID for the root object (e.g., 'did:example:123', 'urn:example:456')
   */
  id?: string;
  
  /**
   * Generate ID automatically if not provided
   */
  autoGenerateId?: boolean;
  
  /**
   * ID generation prefix
   */
  idPrefix?: string;
  
  /**
   * Namespace prefixes to use in context
   */
  namespaces?: Record<string, string>;
  
  /**
   * Fields that should be treated as URLs (@type: "@id")
   */
  urlFields?: string[];
  
  /**
   * Fields that should be treated as dates
   */
  dateFields?: string[];
  
  /**
   * Fields that should be treated as nested objects with @id
   */
  nestedObjectFields?: string[];
  
  /**
   * Fields to exclude from conversion
   */
  excludeFields?: string[];
  
  /**
   * Preserve original JSON structure (don't add @context if false)
   */
  preserveOriginal?: boolean;
  
  /**
   * Expand compact IRIs to full IRIs
   */
  expandIRIs?: boolean;
}

/**
 * Context definition for a field
 */
export interface ContextDefinition {
  '@id'?: string;
  '@type'?: string | '@id' | '@vocab';
  '@container'?: '@set' | '@list' | '@language';
  '@context'?: Record<string, any>;
}

/**
 * Predefined vocabulary mappings
 */
export const VOCABULARIES: Record<string, Record<string, string>> = {
  'https://schema.org/': {
    'name': 'https://schema.org/name',
    'description': 'https://schema.org/description',
    'url': 'https://schema.org/url',
    'homepage': 'https://schema.org/url',
    'image': 'https://schema.org/image',
    'email': 'https://schema.org/email',
    'identifier': 'https://schema.org/identifier',
    'dateCreated': 'https://schema.org/dateCreated',
    'dateModified': 'https://schema.org/dateModified',
    'datePublished': 'https://schema.org/datePublished',
    'author': 'https://schema.org/author',
    'creator': 'https://schema.org/creator',
    'publisher': 'https://schema.org/publisher',
    'about': 'https://schema.org/about',
    'sameAs': 'https://schema.org/sameAs',
    'aggregateRating': 'https://schema.org/AggregateRating',
    'ratingValue': 'https://schema.org/ratingValue',
    'bestRating': 'https://schema.org/bestRating',
    'worstRating': 'https://schema.org/worstRating',
    'ratingCount': 'https://schema.org/ratingCount',
  },
  'https://dotrep.io/ontology/': {
    'reputationScore': 'https://dotrep.io/ontology/reputationScore',
    'contributions': 'https://dotrep.io/ontology/contributions',
    'contributionType': 'https://dotrep.io/ontology/contributionType',
    'impactScore': 'https://dotrep.io/ontology/impactScore',
    'safetyScore': 'https://dotrep.io/ontology/safetyScore',
    'targetUAL': 'https://dotrep.io/ontology/targetUAL',
    'noteType': 'https://dotrep.io/ontology/noteType',
  },
  'http://www.w3.org/ns/prov#': {
    'wasDerivedFrom': 'http://www.w3.org/ns/prov#wasDerivedFrom',
    'wasGeneratedBy': 'http://www.w3.org/ns/prov#wasGeneratedBy',
    'wasRevisionOf': 'http://www.w3.org/ns/prov#wasRevisionOf',
    'generatedAtTime': 'http://www.w3.org/ns/prov#generatedAtTime',
  },
};

/**
 * Default namespace prefixes
 */
export const DEFAULT_NAMESPACES: Record<string, string> = {
  'schema': 'https://schema.org/',
  'dotrep': 'https://dotrep.io/ontology/',
  'prov': 'http://www.w3.org/ns/prov#',
  'dcterms': 'http://purl.org/dc/terms/',
  'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
};

/**
 * Convert JSON object to JSON-LD
 * 
 * @param json - Plain JSON object to convert
 * @param options - Conversion options
 * @returns JSON-LD object with @context and semantic annotations
 * 
 * @example
 * ```typescript
 * const json = {
 *   name: "Alice",
 *   homepage: "http://alice.example.com",
 *   email: "alice@example.com"
 * };
 * 
 * const jsonld = convertToJSONLD(json, {
 *   baseContext: 'https://schema.org/',
 *   type: 'Person',
 *   id: 'did:example:alice',
 *   urlFields: ['homepage']
 * });
 * ```
 */
export function convertToJSONLD(
  json: any,
  options: JSONToJSONLDOptions = {}
): any {
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    throw new Error('Input must be a non-null object');
  }

  const {
    baseContext,
    context: customContext,
    type,
    id,
    autoGenerateId = false,
    idPrefix = 'urn:jsonld:',
    namespaces = {},
    urlFields = [],
    dateFields = [],
    nestedObjectFields = [],
    excludeFields = [],
    preserveOriginal = false,
    expandIRIs = true,
  } = options;

  // Build context
  const context = buildContext(json, {
    baseContext,
    customContext,
    namespaces,
    urlFields,
    dateFields,
    excludeFields,
  });

  // Convert the JSON object
  const converted = convertObject(json, {
    context,
    urlFields,
    dateFields,
    nestedObjectFields,
    excludeFields,
    expandIRIs,
  });

  // Add @context
  if (!preserveOriginal) {
    converted['@context'] = context;
  }

  // Add @type
  if (type) {
    converted['@type'] = expandIRIs && typeof type === 'string' && !type.includes(':')
      ? expandType(type, baseContext, namespaces)
      : type;
  }

  // Add @id
  if (id) {
    converted['@id'] = id;
  } else if (autoGenerateId) {
    converted['@id'] = `${idPrefix}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  return converted;
}

/**
 * Build context object from options and JSON structure
 */
function buildContext(
  json: any,
  options: {
    baseContext?: string;
    customContext?: Record<string, string | ContextDefinition>;
    namespaces: Record<string, string>;
    urlFields: string[];
    dateFields: string[];
    excludeFields: string[];
  }
): any {
  const { baseContext, customContext, namespaces, urlFields, dateFields, excludeFields } = options;
  
  const context: any = {};
  
  // Add namespace prefixes
  const allNamespaces = { ...DEFAULT_NAMESPACES, ...namespaces };
  for (const [prefix, uri] of Object.entries(allNamespaces)) {
    context[prefix] = uri;
  }
  
  // Add @vocab if baseContext is provided
  if (baseContext) {
    context['@vocab'] = baseContext;
  }
  
  // Process custom context first (takes precedence)
  if (customContext) {
    for (const [key, value] of Object.entries(customContext)) {
      if (!excludeFields.includes(key)) {
        context[key] = value;
      }
    }
  }
  
  // Auto-map fields from JSON
  if (baseContext) {
    const vocabulary = VOCABULARIES[baseContext] || {};
    
    for (const key of Object.keys(json)) {
      if (excludeFields.includes(key) || key.startsWith('@')) {
        continue;
      }
      
      // Skip if already in custom context
      if (customContext && key in customContext) {
        continue;
      }
      
      // Check vocabulary mapping
      if (vocabulary[key]) {
        if (urlFields.includes(key)) {
          context[key] = {
            '@id': vocabulary[key],
            '@type': '@id',
          };
        } else if (dateFields.includes(key)) {
          context[key] = {
            '@id': vocabulary[key],
            '@type': 'http://www.w3.org/2001/XMLSchema#dateTime',
          };
        } else {
          context[key] = vocabulary[key];
        }
      } else {
        // Default: map to baseContext + key
        if (urlFields.includes(key)) {
          context[key] = {
            '@id': `${baseContext}${key}`,
            '@type': '@id',
          };
        } else if (dateFields.includes(key)) {
          context[key] = {
            '@id': `${baseContext}${key}`,
            '@type': 'http://www.w3.org/2001/XMLSchema#dateTime',
          };
        } else {
          context[key] = `${baseContext}${key}`;
        }
      }
    }
  }
  
  return context;
}

/**
 * Convert object recursively
 */
function convertObject(
  obj: any,
  options: {
    context: any;
    urlFields: string[];
    dateFields: string[];
    nestedObjectFields: string[];
    excludeFields: string[];
    expandIRIs: boolean;
  }
): any {
  const { urlFields, dateFields, nestedObjectFields, excludeFields, expandIRIs } = options;
  
  if (Array.isArray(obj)) {
    return obj.map(item => convertObject(item, options));
  }
  
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  const converted: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Skip excluded fields
    if (excludeFields.includes(key)) {
      continue;
    }
    
    // Skip @-prefixed keys (already JSON-LD)
    if (key.startsWith('@')) {
      converted[key] = value;
      continue;
    }
    
    // Handle nested objects
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      if (nestedObjectFields.includes(key)) {
        // Treat as nested object with @id
        converted[key] = {
          '@id': value.id || value['@id'] || `urn:${key}:${Date.now()}`,
          ...convertObject(value, options),
        };
      } else {
        // Recursively convert
        converted[key] = convertObject(value, options);
      }
    } else if (Array.isArray(value)) {
      // Convert array items
      converted[key] = value.map(item => {
        if (typeof item === 'object' && item !== null && nestedObjectFields.includes(key)) {
          return {
            '@id': item.id || item['@id'] || `urn:${key}:${Date.now()}`,
            ...convertObject(item, options),
          };
        }
        return convertObject(item, options);
      });
    } else {
      // Handle primitive values
      if (urlFields.includes(key) && typeof value === 'string') {
        // Validate URL
        try {
          new URL(value);
          converted[key] = value;
        } catch {
          // Not a valid URL, keep as string
          converted[key] = value;
        }
      } else if (dateFields.includes(key) && typeof value === 'string') {
        // Validate and normalize date
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          converted[key] = date.toISOString();
        } else {
          converted[key] = value;
        }
      } else {
        converted[key] = value;
      }
    }
  }
  
  return converted;
}

/**
 * Expand type IRI
 */
function expandType(
  type: string,
  baseContext?: string,
  namespaces?: Record<string, string>
): string {
  // Already a full IRI
  if (type.startsWith('http://') || type.startsWith('https://')) {
    return type;
  }
  
  // Check for namespace prefix
  if (type.includes(':')) {
    const [prefix, localName] = type.split(':', 2);
    const allNamespaces = { ...DEFAULT_NAMESPACES, ...namespaces };
    if (allNamespaces[prefix]) {
      return `${allNamespaces[prefix]}${localName}`;
    }
  }
  
  // Use baseContext if available
  if (baseContext) {
    return `${baseContext}${type}`;
  }
  
  return type;
}

/**
 * Convert JSON array to JSON-LD array
 * 
 * @param jsonArray - Array of JSON objects
 * @param options - Conversion options (applied to each item)
 * @returns Array of JSON-LD objects
 */
export function convertArrayToJSONLD(
  jsonArray: any[],
  options: JSONToJSONLDOptions = {}
): any[] {
  return jsonArray.map((item, index) => {
    const itemOptions = {
      ...options,
      id: options.id || (options.autoGenerateId ? `${options.idPrefix || 'urn:jsonld:'}item-${index}` : undefined),
    };
    return convertToJSONLD(item, itemOptions);
  });
}

/**
 * Convert JSON to JSON-LD with a predefined schema
 * 
 * @param json - Plain JSON object
 * @param schema - Schema definition with field mappings
 * @param options - Additional conversion options
 * @returns JSON-LD object
 */
export function convertWithSchema(
  json: any,
  schema: {
    context: Record<string, string | ContextDefinition>;
    type: string;
    idField?: string;
    urlFields?: string[];
    dateFields?: string[];
    nestedObjectFields?: string[];
  },
  options: Omit<JSONToJSONLDOptions, 'context' | 'type'> = {}
): any {
  return convertToJSONLD(json, {
    ...options,
    context: schema.context,
    type: schema.type,
    id: schema.idField ? json[schema.idField] : options.id,
    urlFields: schema.urlFields || options.urlFields,
    dateFields: schema.dateFields || options.dateFields,
    nestedObjectFields: schema.nestedObjectFields || options.nestedObjectFields,
  });
}

/**
 * Merge multiple JSON-LD documents
 * 
 * @param documents - Array of JSON-LD documents
 * @returns Merged JSON-LD document with combined @graph
 */
export function mergeJSONLD(documents: any[]): any {
  if (documents.length === 0) {
    throw new Error('At least one document is required');
  }
  
  if (documents.length === 1) {
    return documents[0];
  }
  
  // Extract contexts
  const contexts: any[] = [];
  const graphs: any[] = [];
  
  for (const doc of documents) {
    if (doc['@context']) {
      contexts.push(doc['@context']);
    }
    
    if (doc['@graph']) {
      graphs.push(...(Array.isArray(doc['@graph']) ? doc['@graph'] : [doc['@graph']]));
    } else {
      // Extract non-context, non-graph properties
      const node: any = {};
      for (const [key, value] of Object.entries(doc)) {
        if (key !== '@context' && key !== '@graph') {
          node[key] = value;
        }
      }
      if (Object.keys(node).length > 0) {
        graphs.push(node);
      }
    }
  }
  
  // Merge contexts
  const mergedContext: any = {};
  for (const ctx of contexts) {
    if (typeof ctx === 'object') {
      Object.assign(mergedContext, ctx);
    }
  }
  
  return {
    '@context': mergedContext,
    '@graph': graphs,
  };
}

/**
 * Extract context from existing JSON-LD document
 * 
 * @param jsonld - JSON-LD document
 * @returns Context object
 */
export function extractContext(jsonld: any): any {
  if (!jsonld || typeof jsonld !== 'object') {
    return {};
  }
  
  return jsonld['@context'] || {};
}

/**
 * Flatten JSON-LD document (remove nesting, use @graph)
 * 
 * @param jsonld - JSON-LD document
 * @returns Flattened JSON-LD with @graph
 */
export function flattenJSONLD(jsonld: any): any {
  if (!jsonld || typeof jsonld !== 'object') {
    return jsonld;
  }
  
  // Already has @graph
  if (jsonld['@graph']) {
    return jsonld;
  }
  
  const context = jsonld['@context'] || {};
  const graph: any[] = [];
  
  // Extract root node
  const rootNode: any = {};
  for (const [key, value] of Object.entries(jsonld)) {
    if (key !== '@context') {
      rootNode[key] = value;
    }
  }
  
  if (Object.keys(rootNode).length > 0) {
    graph.push(rootNode);
  }
  
  return {
    '@context': context,
    '@graph': graph,
  };
}

/**
 * Compact JSON-LD document (use prefixes from context)
 * 
 * @param jsonld - Expanded JSON-LD document
 * @param context - Context to use for compaction
 * @returns Compacted JSON-LD
 */
export function compactJSONLD(jsonld: any, context: any): any {
  // This is a simplified compaction
  // For full compaction, use a library like jsonld.js
  
  if (!jsonld || typeof jsonld !== 'object') {
    return jsonld;
  }
  
  const compacted: any = {
    '@context': context,
  };
  
  // Copy non-context properties
  for (const [key, value] of Object.entries(jsonld)) {
    if (key !== '@context') {
      compacted[key] = value;
    }
  }
  
  return compacted;
}

/**
 * Validate that a value is a valid URL
 */
export function isValidURL(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate that a value is a valid ISO 8601 date
 */
export function isValidISODate(value: string): boolean {
  const date = new Date(value);
  return !isNaN(date.getTime()) && value.includes('T') && value.includes('Z');
}

/**
 * Normalize date to ISO 8601 format
 */
export function normalizeDate(value: string | Date | number): string {
  if (typeof value === 'string') {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
    return value;
  }
  
  if (value instanceof Date) {
    return value.toISOString();
  }
  
  if (typeof value === 'number') {
    return new Date(value).toISOString();
  }
  
  return String(value);
}

