# Quality Data Exchange System

A comprehensive implementation of quality data exchange for decentralized data marketplaces, based on research-informed best practices from academic literature and existing data marketplace protocols.

## Overview

The Quality Data Exchange system enables trusted, high-quality data exchange by implementing:

1. **Provenance & Traceability** - Complete data origin, transformations, and ownership history
2. **Transparency & Auditability** - All transactions recorded immutably on DKG + blockchain
3. **Security & Privacy Protection** - Access control, encryption, and privacy-aware data handling
4. **Data Quality & Standardization** - Metadata, documentation, versioning, and quality metrics
5. **Fairness & Compensation** - Fair exchange protocols with escrow and payment verification
6. **Interoperability & Discoverability** - Easy search, query, and integration with standard schemas

## Architecture

The system consists of four main modules:

### 1. Data Product Registry (`data-product-registry.ts`)

Manages data product metadata and schema registry:

- **JSON-LD / RDF schema** for Data Products / Knowledge Assets
- **Complete metadata** including provenance, license, quality metrics, payment metadata
- **Versioning and lineage** tracking with `prov:wasRevisionOf`
- **Search and discovery** with SPARQL queries
- **Quality scoring** based on completeness, accuracy, and validation results

**Key Features:**
- Register data products with complete metadata
- Update data products (creates new versions)
- Search by type, license, quality, reputation, price, tags, category
- Track version history and lineage

### 2. Fair Exchange Protocol (`fair-exchange-protocol.ts`)

Implements atomic data exchange with payment verification:

- **Escrow-based payments** with automatic release on delivery verification
- **Content hash verification** before payment release
- **Dispute handling** with on-chain/DKG audit trail
- **Support for x402** payment standard
- **Proof-of-delivery** mechanisms

**Key Features:**
- Initiate exchanges with payment escrow
- Deliver data with verification
- Raise and resolve disputes
- Track exchange status and history

### 3. Quality Validators (`quality-validators.ts`)

Automated validation tools for data products:

- **Schema validation** - Validate against JSON schemas
- **Format validation** - Verify data format matches declaration
- **Structure validation** - Check data structure consistency
- **Fingerprinting** - Media fingerprinting for content verification
- **Sanity checks** - Detect suspicious patterns or errors
- **Completeness checks** - Verify metadata completeness
- **Domain-specific validation** - Extensible for custom validators

**Key Features:**
- Run multiple validation types
- Generate validation reports
- Publish validation results as Knowledge Assets
- Calculate overall quality scores

### 4. Data Marketplace (`data-marketplace.ts`)

Complete marketplace interface integrating all components:

- **Discovery** - Search and browse data products
- **Purchase flow** - Complete purchase with payment and delivery
- **Validation** - Validate data products before/after purchase
- **Dispute resolution** - Handle disputes and refunds
- **Statistics** - Marketplace analytics and insights

**Key Features:**
- List products with filters and sorting
- Get product details with quality scores
- Purchase products with fair exchange
- Deliver products with verification
- Handle disputes and resolutions
- Get marketplace statistics

## Usage Examples

### Register a Data Product

```typescript
import { DKGClientV8 } from './dkg-client-v8';
import { DataProductMetadata } from './data-product-registry';

const dkgClient = new DKGClientV8({ environment: 'testnet' });
const registry = await dkgClient.getDataProductRegistry();

const metadata: DataProductMetadata = {
  id: 'dataset-ai-training-v1',
  name: 'AI Training Dataset',
  description: 'A comprehensive dataset for AI training',
  type: 'dataset',
  creator: 'did:polkadot:alice',
  timestamp: Date.now(),
  version: '1.0.0',
  license: 'CC-BY',
  qualityMetrics: {
    completeness: 95,
    accuracy: 92,
    validationScore: 88
  },
  format: 'JSON',
  size: 1024 * 1024 * 50, // 50 MB
  accessControl: 'public',
  price: {
    amount: 100,
    currency: 'TRAC',
    paymentMethod: 'escrow'
  },
  providerReputation: 850,
  tags: ['AI', 'ML', 'Training']
};

const result = await registry.registerDataProduct(metadata);
console.log(`Registered with UAL: ${result.UAL}`);
```

### Search Data Products

```typescript
const marketplace = await dkgClient.getDataMarketplace();

const listings = await marketplace.listProducts({
  type: 'dataset',
  minQuality: 80,
  minReputation: 700,
  tags: ['AI'],
  sortBy: 'quality',
  sortOrder: 'desc',
  limit: 10
});

listings.forEach(listing => {
  console.log(`${listing.entry.metadata.name} - Quality: ${listing.qualityScore}/100`);
});
```

### Purchase a Data Product

```typescript
const purchaseResult = await marketplace.purchaseProduct({
  dataProductUAL: 'ual:...',
  buyer: 'did:polkadot:bob',
  paymentMethod: 'escrow',
  deliveryVerification: {
    required: true,
    validationRequired: true
  }
});

// Deliver the product
const deliveryResult = await marketplace.deliverProduct(
  purchaseResult.exchangeId!,
  'ipfs://QmXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx',
  contentHash
);
```

### Validate Data Quality

```typescript
const validators = await dkgClient.getQualityValidators();

const report = await validators.validateDataProduct(
  'ual:...',
  'ipfs://QmXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx',
  ['schema', 'format', 'structure', 'completeness']
);

console.log(`Overall Score: ${report.overallScore}/100`);
console.log(`Passed: ${report.passed}`);
```

## Data Product Schema

Data products are stored as JSON-LD Knowledge Assets with the following structure:

```json
{
  "@context": {
    "@vocab": "https://schema.org/",
    "dotrep": "https://dotrep.io/ontology/",
    "dcterms": "http://purl.org/dc/terms/",
    "prov": "http://www.w3.org/ns/prov#"
  },
  "@type": "dotrep:DataProduct",
  "@id": "dotrep:dataproduct:dataset-ai-training-v1",
  "name": "AI Training Dataset",
  "description": "...",
  "dotrep:dataProductType": "dataset",
  "dcterms:creator": "did:polkadot:alice",
  "dcterms:created": "2024-01-01T00:00:00Z",
  "dcterms:license": "CC-BY",
  "softwareVersion": "1.0.0",
  "prov:wasRevisionOf": "ual:previous-version",
  "dotrep:qualityMetrics": {
    "@type": "dotrep:QualityMetrics",
    "dotrep:completeness": 95,
    "dotrep:accuracy": 92,
    "dotrep:validationScore": 88
  },
  "dotrep:price": {
    "@type": "dotrep:Price",
    "dotrep:amount": 100,
    "dotrep:currency": "TRAC",
    "dotrep:paymentMethod": "escrow"
  },
  "dotrep:accessControl": "public"
}
```

## Exchange Flow

1. **Initiate Exchange**
   - Buyer requests purchase
   - Payment escrow is set up
   - Exchange record created on DKG

2. **Payment Confirmation**
   - Payment confirmed in escrow
   - Exchange status: `payment_received`

3. **Delivery**
   - Seller delivers data
   - Content hash/fingerprint verified
   - Exchange status: `delivery_verified`

4. **Completion**
   - Payment released from escrow
   - Exchange status: `completed`
   - Validation results published as KA

5. **Dispute Handling** (if needed)
   - Dispute raised and recorded
   - Resolution by arbitrator
   - Refund issued if warranted

## Quality Metrics

Data products are scored on multiple dimensions:

- **Completeness** (0-100) - Metadata completeness
- **Accuracy** (0-100) - Data accuracy (domain-specific)
- **Validation Score** (0-100) - Automated validation results
- **Schema Compliance** (0-100) - Schema validation score
- **Community Rating** (0-5) - User ratings

Overall quality score is calculated as a weighted average of these metrics.

## Access Control

Data products support multiple access control levels:

- **public** - Open access
- **restricted** - Access with conditions (reputation, payment, etc.)
- **private** - Access only to specific users
- **encrypted** - Encrypted data with key management
- **gated** - Access through smart contract gates

## Integration with Existing Systems

The quality data exchange system integrates with:

- **DKG Client V8** - For publishing and querying Knowledge Assets
- **Reputation System** - For provider reputation scoring
- **x402 Payment Handler** - For payment processing
- **Umanitek Guardian** - For media fingerprinting and verification
- **NeuroWeb Parachain** - For blockchain anchoring

## Research Foundation

This implementation is based on research from:

- **DEXO** (2025) - Secure and fair exchange for decentralized IoT data marketplaces
- **martFL** (2023) - Federated learning marketplace with quality-aware aggregation
- **Open Data Fabric** (2021) - Decentralized data exchange with reproducibility
- **IACR ePrint Archive** - Fair exchange protocols and cryptographic commitments
- **Denodo** - Data marketplace best practices

## Future Enhancements

- [ ] Zero-knowledge proofs for privacy-preserving validation
- [ ] Domain-specific validators (healthcare, finance, etc.)
- [ ] Automated pricing based on quality and demand
- [ ] Community review and rating system
- [ ] Data transformation and lineage tracking
- [ ] Multi-party data exchange protocols
- [ ] Integration with IPFS/Arweave for large dataset storage
- [ ] Real-time data streaming support

## See Also

- [Data Product Registry API](./data-product-registry.ts)
- [Fair Exchange Protocol API](./fair-exchange-protocol.ts)
- [Quality Validators API](./quality-validators.ts)
- [Data Marketplace API](./data-marketplace.ts)
- [Example Usage](./examples/quality-data-exchange-example.ts)

