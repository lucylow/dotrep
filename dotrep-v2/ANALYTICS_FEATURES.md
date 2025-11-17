# Analytics Features Implementation

This document describes the comprehensive analytics features implemented for the DotRep GitHub reputation system.

## Overview

The analytics system provides real-time insights into GitHub contribution patterns, reputation scoring, anomaly detection, and explainable evidence for reputation scores.

## Components

### 1. Analytics Engine (`server/analytics/engine.ts`)

Pure TypeScript functions that compute reputation metrics:

- **`contributionsPerWeek`**: Calculates weekly contribution counts for actors
- **`mergedPrRatio`**: Computes merged PR percentage (quality metric)
- **`anomalyDetection`**: Detects burst patterns using z-score analysis
- **`computeReputationScore`**: Calculates explainable reputation vector with 4 dimensions:
  - Quality: Merged PR rate (0-100)
  - Impact: Unique repos touched + review signals (0-100)
  - Consistency: Median weekly contributions normalized (0-100)
  - Community: Review engagement signals (0-100)

### 2. Analytics API Endpoints (`server/routers.ts`)

tRPC endpoints under `analytics` router:

- **`contributions`**: GET contribution counts per week
  - Input: `actor?`, `weeks?` (default: 12)
  - Returns: Weekly counts array

- **`mergedRatio`**: GET merged PR ratio
  - Input: `actor?`
  - Returns: `{pr_total, pr_merged, merged_pct}`

- **`anomalies`**: GET anomaly detection results
  - Input: `k?` (z-score threshold, default: 3)
  - Returns: Array of flagged suspicious patterns

- **`score`**: GET reputation score
  - Input: `actor`, `weights?` (custom weight overrides)
  - Returns: `{finalScore, vector, explanation}`

- **`explain`**: GET explainability with top evidence
  - Input: `actor`, `limit?` (default: 3)
  - Returns: Score + top evidence items with natural language explanations

### 3. Database Layer (`server/db.ts`)

New analytics query functions:

- **`getAllProofRecords()`**: Fetches all proof records with contribution metadata
- **`getProofsByActor(actor, limit)`**: Gets proofs for a specific actor (GitHub username or wallet)
- **`getTopProofsByImpact(actor, limit)`**: Returns top proofs by reputation points

### 4. Enhanced Analytics Dashboard (`client/src/pages/AnalyticsPage.tsx`)

Interactive React dashboard with:

- **Actor Search**: Search by GitHub username or wallet address
- **Stats Cards**: Total contributions, reputation score, merged PR ratio, anomalies detected
- **Tabs**:
  - Contributions: Weekly contribution bar chart
  - Reputation: Reputation score timeline
  - Score Breakdown: Radar chart showing quality/impact/consistency/community vectors
  - Explainability: Top evidence cards with natural language explanations
  - Anomalies: Table of flagged suspicious patterns

### 5. Python Anomaly Detection Service (`services/anomaly_service/`)

FastAPI microservice using scikit-learn IsolationForest:

- **Endpoint**: `POST /anomaly/detect`
  - Input: `weeks`, `contamination`, `min_samples`
  - Returns: Anomalous actors with feature vectors

- **Health Check**: `GET /anomaly/health`

- **Docker Integration**: Included in `docker-compose.cloud.yml`

## Usage Examples

### Query Contributions
```typescript
const data = await trpc.analytics.contributions.query({
  actor: "github:octocat",
  weeks: 12
});
```

### Get Reputation Score
```typescript
const score = await trpc.analytics.score.query({
  actor: "github:octocat",
  weights: {
    quality: 0.4,
    impact: 0.3,
    consistency: 0.2,
    community: 0.1
  }
});
```

### Explain Reputation
```typescript
const explanation = await trpc.analytics.explain.query({
  actor: "github:octocat",
  limit: 3
});
// Returns: { score, top_evidence: [...] }
```

## Reputation Score Calculation

The reputation score is computed as a weighted sum of 4 dimensions:

```
finalScore = quality × 0.4 + impact × 0.3 + consistency × 0.2 + community × 0.1
```

Each dimension is normalized to 0-100:

- **Quality**: Merged PR percentage
- **Impact**: `min(100, log(1 + unique_repos) × 30 + min(20, review_signal))`
- **Consistency**: `min(100, (median_weekly_count / 10) × 100)`
- **Community**: `min(100, review_signal × 5)`

## Anomaly Detection

Two detection methods:

1. **Heuristic (TypeScript)**: Z-score based burst detection
   - Flags weeks where `count > mean + k × std`
   - Default k = 3

2. **ML-based (Python)**: IsolationForest
   - Unsupervised anomaly detection
   - Uses weekly count matrix + summary features (mean, std)
   - Configurable contamination rate

## Explainability

The `explain` endpoint provides:

1. **Score Breakdown**: Vector values and explanations
2. **Top Evidence**: Highest impact contributions with:
   - Proof hash and CID
   - Repository and event type
   - Reputation points earned
   - Natural language explanation

## Future Enhancements

- [ ] Graph-based reviewer trust scoring
- [ ] Code semantic embeddings for novelty detection
- [ ] Continuous aggregates in TimescaleDB for performance
- [ ] ZK proofs for selective disclosure
- [ ] Real-time WebSocket updates for live analytics

## Deployment

The Python anomaly service is included in `docker-compose.cloud.yml`:

```bash
docker-compose -f docker-compose.cloud.yml up --build
```

The service will be available at `http://localhost:8000`.

## Testing

Test the analytics endpoints:

```bash
# Contributions
curl http://localhost:3001/api/trpc/analytics.contributions?input={"actor":"github:octocat","weeks":12}

# Score
curl http://localhost:3001/api/trpc/analytics.score?input={"actor":"github:octocat"}

# Explain
curl http://localhost:3001/api/trpc/analytics.explain?input={"actor":"github:octocat"}
```


