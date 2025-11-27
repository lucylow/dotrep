# User-Flagging Relationships: Implementation Guide

This document describes the comprehensive user-flagging relationship system implemented in DotRep for detecting harmful content, spam, and coordinated manipulation in social networks.

## 🏗️ Architecture Overview

The user-flagging system consists of several integrated components:

1. **Flagging Service** (`user-flagging-service.ts`) - Core flagging operations and DKG integration
2. **Flagging Analysis Engine** (`flagging_analysis_engine.py`) - Advanced coordination detection algorithms
3. **Guardian Integration** (`guardian-flagging-integration.ts`) - Automated content verification pipeline
4. **Reputation Integration** (`flagging_aware_reputation.py`) - Flagging-weighted reputation scoring
5. **Analytics Dashboard** (`flagging-analytics.ts`) - Real-time monitoring and insights

## 📋 Core Features

### Flag Types

The system supports six flag types with different weights and requirements:

- **SPAM** (weight: 0.3) - Spam content detection
- **HARASSMENT** (weight: 0.7) - Harassment detection, requires evidence
- **MISINFORMATION** (weight: 0.8) - Misinformation detection, requires evidence
- **IMPERSONATION** (weight: 0.9) - Impersonation detection, requires evidence
- **ILLEGAL_CONTENT** (weight: 1.0) - Illegal content, auto-escalates, requires evidence
- **COORDINATED_HARM** (weight: 0.9) - Coordinated harm detection, requires evidence

### Coordination Detection

The system uses advanced algorithms to detect coordinated flagging attacks:

1. **Temporal Clustering** - Detects burst patterns and regular intervals
2. **Reporter Graph Analysis** - Analyzes social connections between reporters
3. **Behavioral Similarity** - Identifies similar flagging patterns
4. **Content Pattern Analysis** - Finds common patterns in flag descriptions

### Guardian Integration

Automated flagging from Umanitek Guardian verification:

- Automatically creates flags when Guardian detects harmful content with >80% confidence
- Maps Guardian match types to appropriate flag types
- Includes forensic evidence in flag metadata
- Supports batch content review

### Reputation Impact

Flags affect user reputation scores:

- Coordination detection mitigates impact (likely attacks don't harm reputation)
- Credible reporters have more weight
- Maximum 50% reputation reduction from flagging
- Real-time reputation adjustments

## 🚀 Usage Examples

### Creating a Flag

```typescript
import { getUserFlaggingService } from './dkg-integration/user-flagging-service';

const flaggingService = getUserFlaggingService();

const result = await flaggingService.createFlag({
  flagActor: 'did:dkg:user:trusted_reporter',
  flagTarget: 'did:dkg:user:spammer_123',
  flagType: 'SPAM',
  confidence: 0.9,
  reporterReputation: 0.85,
  description: 'Repeated spam messages',
  evidence: ['ual:dkg:evidence:123'],
  severity: 'medium',
});
```

### Analyzing Flagging Patterns

```typescript
const analysis = await flaggingService.analyzeFlaggingPatterns(
  'did:dkg:user:target_user',
  24 // time window in hours
);

console.log('Coordination Score:', analysis.coordinationSignals.overallCoordinationScore);
console.log('Risk Assessment:', analysis.riskAssessment);
```

### Automated Guardian Review

```typescript
import { getGuardianFlaggingIntegration } from './dkg-integration/guardian-flagging-integration';

const guardianIntegration = getGuardianFlaggingIntegration();

const result = await guardianIntegration.automatedContentReview(
  'content_fingerprint_hash',
  'image',
  'did:dkg:user:creator_123'
);

if (result.action === 'auto_flagged') {
  console.log('Flag created:', result.flagId);
}
```

### Getting Analytics

```typescript
import { getFlaggingAnalytics } from './dkg-integration/flagging-analytics';

const analytics = getFlaggingAnalytics();
const dashboard = await analytics.generateDashboard(24);

console.log('Coordination Alerts:', dashboard.alerts.length);
console.log('Top Flagged Users:', dashboard.insights.topFlaggedUsers);
```

## 🔧 MCP Server Integration

The system exposes MCP tools for AI agents:

- `create_user_flag` - Create a new user flag
- `analyze_flagging_patterns` - Analyze flagging patterns for a user
- `calculate_flagging_impact` - Calculate reputation impact
- `get_flagging_insights` - Get comprehensive insights
- `automated_content_review` - Automated Guardian review

## 📊 DKG Knowledge Assets

Flags are published as JSON-LD Knowledge Assets to the DKG:

- **UserFlag** - Standard user-created flags
- **AutomatedUserFlag** - Flags created by Guardian

Both include:
- Flag metadata (type, confidence, severity)
- Evidence UALs
- Reporter reputation
- Provenance information

## 🧪 Demo

Run the complete demo:

```typescript
import { runFlaggingSystemDemo } from './dkg-integration/examples/user-flagging-demo';

await runFlaggingSystemDemo();
```

The demo includes:
1. Simulating flagging events
2. Analyzing coordination patterns
3. Guardian integration
4. Reputation impact analysis
5. Analytics generation

## 🔍 Python Analysis Engine

The Python analysis engine provides advanced graph-based coordination detection:

```python
from services.reputation.flagging_analysis_engine import FlaggingAnalysisEngine
import networkx as nx

# Initialize with graph
graph = nx.DiGraph()  # Your user relationship graph
engine = FlaggingAnalysisEngine(graph)

# Add flags
engine.add_flag({
    "flag_actor": "did:dkg:user:reporter",
    "flag_target": "did:dkg:user:target",
    "flag_type": "SPAM",
    "confidence": 0.9,
    "reporter_reputation": 0.85,
    "timestamp": int(time.time() * 1000),
})

# Analyze patterns
analysis = engine.analyze_flagging_patterns("did:dkg:user:target", 24)
print(f"Coordination Score: {analysis['coordination_signals']['overall_coordination_score']}")
```

## 🛡️ Best Practices

1. **Evidence Requirements**: Always provide evidence UALs for flags requiring evidence
2. **Reporter Reputation**: Consider reporter reputation when evaluating flags
3. **Coordination Detection**: High coordination scores suggest attacks - mitigate impact
4. **Guardian Integration**: Use automated Guardian review for content verification
5. **Analytics Monitoring**: Regularly check coordination alerts and suspicious patterns

## 📈 Performance Considerations

- Flags are cached in-memory (use database in production)
- Coordination analysis is optimized for real-time queries
- Batch operations supported for Guardian integration
- Analytics can be generated on-demand or scheduled

## 🔗 Related Documentation

- [Guardian Integration Guide](./GUARDIAN_INTEGRATION.md)
- [Reputation System Documentation](../services/reputation/README.md)
- [DKG Client Documentation](./dkg-client-v8.ts)

