# Transparency Metrics Dashboard

**DotRep - Ethics, Sustainability & Openness Metrics**

This document describes the transparency metrics tracked by DotRep and how to access them.

## Metrics Overview

### 1. Hash Validation Rate
**Target: ≥ 99.9%**

Percentage of published assets with valid content hashes (SHA-256). A valid hash ensures data integrity and tamper-evidence.

**Calculation:**
```
Hash Validation Rate = (Assets with valid contentHash / Total assets) × 100
```

### 2. Signature Validation Rate
**Target: ≥ 99.9%**

Percentage of published assets with valid cryptographic signatures from publisher DIDs.

**Calculation:**
```
Signature Validation Rate = (Assets with valid signature / Total assets) × 100
```

### 3. Provenance Coverage
**Target: ≥ 90%**

Percentage of assets that include provenance metadata (computedBy, method, sourceAssets).

**Calculation:**
```
Provenance Coverage = (Assets with provenance / Total assets) × 100
```

### 4. Audit Trace Latency
**Target: < 2 seconds**

Average time to fetch and verify a UAL from the DKG Edge Node.

**Calculation:**
```
Audit Trace Latency = Average(verification_time for all assets)
```

### 5. On-Chain Anchor Rate
**Target: ≥ 80%**

Percentage of critical assets (reputation scores, major updates) anchored on NeuroWeb parachain.

**Calculation:**
```
Anchor Rate = (Assets with on-chain anchor / Total assets) × 100
```

## Accessing Metrics

### API Endpoint

```bash
GET /api/metrics/transparency
```

**Response:**
```json
{
  "hashValidationRate": 99.8,
  "signatureValidationRate": 99.9,
  "provenanceCoverage": 92.5,
  "auditTraceLatency": 1250,
  "anchorValidationRate": 85.2,
  "totalAssets": 15420,
  "validAssets": 15380,
  "lastUpdated": 1701000000000,
  "summary": {
    "overall": "excellent",
    "score": 95,
    "targets": {
      "hashValidation": {
        "current": 99.8,
        "target": 99.9,
        "met": true
      },
      "signatureValidation": {
        "current": 99.9,
        "target": 99.9,
        "met": true
      },
      "provenanceCoverage": {
        "current": 92.5,
        "target": 90,
        "met": true
      },
      "auditLatency": {
        "current": 1250,
        "target": 2000,
        "met": true
      },
      "anchorRate": {
        "current": 85.2,
        "target": 80,
        "met": true
      }
    }
  }
}
```

### UI Dashboard

Access the transparency metrics dashboard at:
- **Route**: `/dashboard/transparency`
- **Component**: `TransparencyMetricsDashboard`

### SPARQL Query

Query metrics directly from DKG:

```sparql
PREFIX schema: <https://schema.org/>
PREFIX dotrep: <https://dotrep.io/ontology/>

SELECT 
  (COUNT(?asset) as ?totalAssets)
  (COUNT(?assetWithHash) as ?assetsWithHash)
  (COUNT(?assetWithSig) as ?assetsWithSig)
  (COUNT(?assetWithProv) as ?assetsWithProv)
WHERE {
  ?asset a schema:CreativeWork .
  OPTIONAL {
    ?asset dotrep:contentHash ?hash .
    BIND(?asset as ?assetWithHash)
  }
  OPTIONAL {
    ?asset dotrep:signature ?sig .
    BIND(?asset as ?assetWithSig)
  }
  OPTIONAL {
    ?asset dotrep:provenance ?prov .
    BIND(?asset as ?assetWithProv)
  }
}
```

## Implementation

### Server-Side Tracking

```typescript
import { getTransparencyMetricsTracker } from '@/server/_core/transparencyMetrics';

const tracker = getTransparencyMetricsTracker();

// Update metrics for a set of UALs
const metrics = await tracker.updateMetrics(uals);

// Get current metrics
const currentMetrics = tracker.getMetrics();

// Get summary with targets
const summary = tracker.getMetricsSummary();
```

### Client-Side Display

```typescript
import { ProvenanceCard } from '@/components/provenance/ProvenanceCard';

// Display provenance for a specific asset
<ProvenanceCard 
  data={provenanceData}
  showDetails={true}
/>
```

## Monitoring and Alerts

### Automated Monitoring

Metrics are automatically updated:
- **Frequency**: Every 5 minutes
- **Sample Size**: Last 1000 assets
- **Cache TTL**: 5 minutes

### Alert Thresholds

Alerts are triggered when:
- Hash validation rate < 95%
- Signature validation rate < 95%
- Provenance coverage < 80%
- Audit latency > 5 seconds
- Anchor rate < 70%

### Reporting

Weekly transparency reports are published to DKG:
- **UAL**: `urn:ual:dotrep:metrics:transparency:YYYY-MM-DD`
- **Format**: JSON-LD Knowledge Asset
- **Retention**: 52 weeks (1 year)

## Continuous Improvement

### Target Adjustments

Targets are reviewed quarterly and adjusted based on:
- Industry best practices
- System capabilities
- User feedback
- Regulatory requirements

### Historical Trends

Historical metrics are available via:
- **API**: `/api/metrics/transparency/history?days=30`
- **DKG**: Query weekly report UALs
- **Dashboard**: Historical charts

## References

- **Ethics Policy**: `docs/ethics.md`
- **Verification Tools**: `dotrep-v2/dkg-integration/verify-asset.ts`
- **Metrics Tracker**: `dotrep-v2/server/_core/transparencyMetrics.ts`
- **Provenance Queries**: `dotrep-v2/dkg-integration/sparql/provenance-queries.ts`

