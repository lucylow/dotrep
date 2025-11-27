# JSON to JSON-LD Conversion Guide

## Overview

This guide explains how to convert plain JSON data into JSON-LD (Linked Data) format using the `json-to-jsonld` utility module. JSON-LD adds semantic meaning to JSON by mapping keys to IRIs (Internationalized Resource Identifiers), enabling integration with knowledge graphs and Linked Data systems.

## Basic Conversion

### Simple Example

```typescript
import { convertToJSONLD } from './json-to-jsonld';

const json = {
  name: "Alice",
  homepage: "http://alice.example.com",
  email: "alice@example.com"
};

const jsonld = convertToJSONLD(json, {
  baseContext: 'https://schema.org/',
  type: 'Person',
  id: 'did:example:alice',
  urlFields: ['homepage']
});

// Result:
// {
//   "@context": {
//     "@vocab": "https://schema.org/",
//     "name": "https://schema.org/name",
//     "homepage": { "@id": "https://schema.org/url", "@type": "@id" },
//     "email": "https://schema.org/email"
//   },
//   "@type": "Person",
//   "@id": "did:example:alice",
//   "name": "Alice",
//   "homepage": "http://alice.example.com",
//   "email": "alice@example.com"
// }
```

## Conversion Options

### Base Context

Use a base vocabulary (like Schema.org) to automatically map fields:

```typescript
const jsonld = convertToJSONLD(json, {
  baseContext: 'https://schema.org/',
  type: 'Person'
});
```

### Custom Context

Define custom field mappings:

```typescript
const jsonld = convertToJSONLD(json, {
  context: {
    'name': 'https://schema.org/name',
    'homepage': {
      '@id': 'https://schema.org/url',
      '@type': '@id'  // Treat as URL reference
    },
    'reputationScore': 'https://dotrep.io/ontology/reputationScore'
  },
  type: 'Person'
});
```

### Type and ID

Specify the type and ID of the object:

```typescript
const jsonld = convertToJSONLD(json, {
  type: 'schema:Person',  // Can use namespace prefix
  id: 'did:example:123',
  // Or auto-generate ID:
  // autoGenerateId: true,
  // idPrefix: 'urn:example:'
});
```

### URL Fields

Mark fields that contain URLs (they'll be typed as `@id`):

```typescript
const jsonld = convertToJSONLD(json, {
  urlFields: ['homepage', 'image', 'sameAs']
});
```

### Date Fields

Mark fields that contain dates (they'll be normalized to ISO 8601):

```typescript
const jsonld = convertToJSONLD(json, {
  dateFields: ['dateCreated', 'dateModified', 'datePublished']
});
```

### Nested Objects

Handle nested objects with proper `@id` references:

```typescript
const json = {
  name: "Alice",
  author: {
    id: "author-123",
    name: "Bob"
  }
};

const jsonld = convertToJSONLD(json, {
  nestedObjectFields: ['author'],
  type: 'Article'
});

// Result:
// {
//   "@context": { ... },
//   "@type": "Article",
//   "name": "Alice",
//   "author": {
//     "@id": "author-123",
//     "name": "Bob"
//   }
// }
```

### Namespaces

Add custom namespace prefixes:

```typescript
const jsonld = convertToJSONLD(json, {
  namespaces: {
    'dotrep': 'https://dotrep.io/ontology/',
    'prov': 'http://www.w3.org/ns/prov#'
  },
  type: 'dotrep:ReputationAsset'
});
```

## Advanced Usage

### Converting Arrays

```typescript
import { convertArrayToJSONLD } from './json-to-jsonld';

const jsonArray = [
  { name: "Alice", email: "alice@example.com" },
  { name: "Bob", email: "bob@example.com" }
];

const jsonldArray = convertArrayToJSONLD(jsonArray, {
  baseContext: 'https://schema.org/',
  type: 'Person',
  autoGenerateId: true
});
```

### Using Schemas

Define reusable schemas for common data structures:

```typescript
import { convertWithSchema } from './json-to-jsonld';

const reputationSchema = {
  context: {
    'identifier': 'https://schema.org/identifier',
    'reputationScore': 'https://dotrep.io/ontology/reputationScore',
    'dateModified': 'https://schema.org/dateModified'
  },
  type: 'dotrep:ReputationAsset',
  idField: 'identifier',
  dateFields: ['dateModified']
};

const jsonld = convertWithSchema(json, reputationSchema);
```

### Merging Multiple Documents

```typescript
import { mergeJSONLD } from './json-to-jsonld';

const doc1 = convertToJSONLD({ name: "Alice" }, { type: 'Person' });
const doc2 = convertToJSONLD({ name: "Bob" }, { type: 'Person' });

const merged = mergeJSONLD([doc1, doc2]);
// Result has @graph with both documents
```

### Flattening Documents

```typescript
import { flattenJSONLD } from './json-to-jsonld';

const flattened = flattenJSONLD(jsonld);
// Converts nested structure to @graph format
```

## Common Patterns

### Reputation Asset

```typescript
const reputationJSON = {
  developerId: "alice",
  reputationScore: 850,
  contributions: [
    { id: "contrib-1", title: "Feature X", url: "https://github.com/..." }
  ],
  timestamp: Date.now()
};

const jsonld = convertToJSONLD(reputationJSON, {
  baseContext: 'https://schema.org/',
  context: {
    'dotrep': 'https://dotrep.io/ontology/',
    'reputationScore': 'dotrep:reputationScore',
    'contributions': 'dotrep:contributions'
  },
  type: 'Person',
  id: `did:polkadot:${reputationJSON.developerId}`,
  dateFields: ['timestamp'],
  urlFields: ['url'],
  nestedObjectFields: ['contributions']
});
```

### Content Verification Report

```typescript
const verificationJSON = {
  contentUrl: "https://example.com/content",
  confidence: 0.95,
  matchFound: true,
  matchType: "deepfake",
  timestamp: new Date().toISOString()
};

const jsonld = convertToJSONLD(verificationJSON, {
  context: {
    'guardian': 'https://guardian.umanitek.ai/schema/',
    'contentUrl': { '@id': 'schema:about', '@type': '@id' },
    'confidence': 'guardian:confidence',
    'matchFound': 'guardian:matchFound',
    'matchType': 'guardian:matchType'
  },
  type: 'guardian:ContentVerificationReport',
  dateFields: ['timestamp']
});
```

### Payment Evidence

```typescript
const paymentJSON = {
  txHash: "0xabc123...",
  payer: "0xBuyer",
  recipient: "0xSeller",
  amount: "10.00",
  currency: "USDC",
  chain: "base",
  timestamp: Date.now()
};

const jsonld = convertToJSONLD(paymentJSON, {
  context: {
    'schema': 'https://schema.org/',
    'dotrep': 'https://dotrep.io/ontology/',
    'price': 'schema:price',
    'priceCurrency': 'schema:priceCurrency',
    'txHash': 'dotrep:txHash',
    'payer': 'schema:payee',
    'recipient': 'schema:recipient'
  },
  type: 'schema:PaymentChargeSpecification',
  dateFields: ['timestamp']
});
```

## Integration with DKG Client

```typescript
import { DKGClientV8 } from './dkg-client-v8';
import { convertToJSONLD } from './json-to-jsonld';

const dkgClient = new DKGClientV8();

// Convert JSON to JSON-LD
const jsonld = convertToJSONLD(myData, {
  baseContext: 'https://schema.org/',
  type: 'MyType'
});

// Validate before publishing
const { validateJSONLD } = await import('./jsonld-validator');
const validation = await validateJSONLD(jsonld);

if (validation.valid) {
  // Publish to DKG
  const result = await dkgClient.publishReputationAsset({
    developerId: 'alice',
    reputationScore: 0,
    contributions: [],
    timestamp: Date.now(),
    metadata: jsonld
  });
}
```

## Best Practices

1. **Always specify @type**: Helps processors understand the data structure
2. **Use proper IDs**: Use DIDs, URNs, or other globally unique identifiers
3. **Normalize dates**: Always use ISO 8601 format for dates
4. **Mark URLs properly**: Use `urlFields` option to mark URL fields
5. **Use namespaces**: Prefer namespace prefixes over full IRIs for readability
6. **Validate before publishing**: Always validate JSON-LD before publishing to DKG
7. **Reuse contexts**: Define reusable context mappings for common data types

## Vocabulary Mappings

The module includes predefined mappings for:

- **Schema.org**: Common properties like `name`, `description`, `url`, `email`, etc.
- **DotRep Ontology**: Reputation-specific properties
- **PROV-O**: Provenance properties

You can extend these by providing custom context mappings.

## Validation

After conversion, validate your JSON-LD:

```typescript
import { validateJSONLD } from './jsonld-validator';

const validation = await validateJSONLD(jsonld);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}
```

## References

- [JSON-LD Specification (W3C)](https://www.w3.org/TR/json-ld11/)
- [JSON-LD Playground](https://json-ld.org/playground/)
- [Schema.org Vocabulary](https://schema.org/)

