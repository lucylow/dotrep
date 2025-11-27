# Guardian Agent Knowledge Base

## Overview

The Guardian Agent Knowledge Base is a structured and centralized repository of information that enables the Guardian Agent to monitor, reason, and manage the behavior of other AI agents or systems. It acts as the Guardian Agent's "brain," providing autonomous or semi-autonomous evaluation of action plans before execution.

## Features

### 1. **Policies and Rules**
- Define safe and compliant behavior through configurable policies
- Support for multiple policy types: content safety, reputation thresholds, action validation, risk mitigation, compliance, and workflow rules
- Priority-based policy evaluation
- Rule conditions with complex logical operators (AND, OR, NOT)
- Escalation paths for high-risk scenarios

### 2. **Signature Pattern Detection**
- Domain-specific patterns for detecting problematic behaviors
- Support for exact, regex, semantic, and behavioral pattern matching
- Risk level classification (LOW, MEDIUM, HIGH, CRITICAL)
- Configurable confidence scores

### 3. **Decision-Making**
- Autonomous decision-making based on policies and risk assessment
- Actions: ALLOW, BLOCK, REDIRECT, ESCALATE, MONITOR, FLAG, TAKEDOWN
- Confidence scoring for decisions
- Reasoning generation for transparency

### 4. **Action Plan Validation**
- Completeness checking for action plans
- Safety score calculation
- Dependency validation
- Missing field detection

### 5. **Audit Trail and Interaction History**
- Complete audit trail of all agent interactions
- Decision history with context
- DKG integration for verifiable audit records
- Queryable history with filtering

## Usage

### Basic Setup

```typescript
import { getGuardianKnowledgeBase } from './guardian-knowledge-base';
import { DKGClientV8 } from './dkg-client-v8';

// Initialize knowledge base
const dkgClient = new DKGClientV8({
  environment: 'testnet',
  useMockMode: true,
});

const knowledgeBase = getGuardianKnowledgeBase(dkgClient);
```

### Adding a Custom Policy

```typescript
import { Policy, PolicyType, DecisionAction } from './guardian-knowledge-base';

const customPolicy: Policy = {
  id: 'policy-custom-001',
  type: PolicyType.CONTENT_SAFETY,
  name: 'Custom Content Safety Policy',
  description: 'Enforces custom content safety rules',
  priority: 95,
  enabled: true,
  effectiveDate: new Date().toISOString(),
  rules: [
    {
      id: 'rule-custom-001',
      condition: {
        type: 'and',
        conditions: [
          { type: 'and', field: 'confidence', operator: 'gte', value: 0.8 },
          { type: 'and', field: 'matchType', operator: 'eq', value: 'deepfake' },
        ],
      },
      action: DecisionAction.FLAG,
      confidence: 0.8,
    },
  ],
};

await knowledgeBase.addPolicy(customPolicy);
```

### Adding a Signature Pattern

```typescript
import { SignaturePattern, RiskLevel } from './guardian-knowledge-base';

const customPattern: SignaturePattern = {
  id: 'pattern-custom-001',
  name: 'Custom Threat Pattern',
  description: 'Detects custom threat indicators',
  pattern: /threat-indicator|suspicious-pattern/i,
  matchType: 'regex',
  riskLevel: RiskLevel.HIGH,
  category: 'custom',
  confidence: 0.75,
};

await knowledgeBase.addSignaturePattern(customPattern);
```

### Evaluating an Action Plan

```typescript
import { ActionPlan } from './guardian-knowledge-base';

const actionPlan: ActionPlan = {
  id: 'plan-001',
  agentId: 'agent-123',
  actions: [
    {
      type: 'publish_content',
      target: 'https://example.com/content',
      parameters: {
        contentType: 'image',
        public: true,
      },
    },
  ],
  timestamp: Date.now(),
  metadata: {
    reputationScore: 750,
  },
};

const decision = await knowledgeBase.evaluateActionPlan(actionPlan, {
  agentType: 'content-publisher',
  reputationScore: 750,
});

console.log(`Decision: ${decision.action}`);
console.log(`Confidence: ${decision.confidence}`);
console.log(`Reasoning: ${decision.reasoning}`);
console.log(`Risk Level: ${decision.riskAssessment.level}`);
```

### Validating Action Plan Completeness

```typescript
const validation = knowledgeBase.validateActionPlanCompleteness(actionPlan);

if (!validation.complete) {
  console.log(`Action plan incomplete (score: ${validation.score})`);
  console.log(`Missing fields: ${validation.missing.join(', ')}`);
  console.log(`Warnings: ${validation.warnings.join(', ')}`);
}
```

### Querying Policies

```typescript
// Get all content safety policies
const policies = knowledgeBase.getPolicies({
  policyType: PolicyType.CONTENT_SAFETY,
  limit: 10,
});

// Get policies for high-risk scenarios
const highRiskPolicies = knowledgeBase.getPolicies({
  riskLevel: RiskLevel.HIGH,
});
```

### Querying Interaction History

```typescript
// Get interaction history for a specific agent
const interactions = knowledgeBase.getInteractionHistory({
  agentId: 'agent-123',
  limit: 50,
});

// Get interactions within a date range
const recentInteractions = knowledgeBase.getInteractionHistory({
  dateRange: {
    start: '2025-01-01T00:00:00Z',
    end: '2025-01-31T23:59:59Z',
  },
  limit: 100,
});
```

### Querying Audit Trail

```typescript
// Get audit trail entries
const auditEntries = knowledgeBase.getAuditTrail({
  agentId: 'agent-123',
  limit: 100,
});
```

## Integration with Guardian Verification Service

The knowledge base is automatically integrated with the Guardian Verification Service:

```typescript
import { getGuardianVerificationService } from './guardian-verification';

const verificationService = getGuardianVerificationService(dkgClient);

// When publishing a verification report, the knowledge base automatically:
// 1. Evaluates the verification result
// 2. Makes a decision based on policies
// 3. Records the interaction
// 4. Includes decision information in the published asset

const result = await verificationService.publishVerificationReport(
  'https://example.com/content',
  'creator-123',
  verificationResult
);

// Access the knowledge base
const kb = verificationService.getKnowledgeBase();
const decision = await kb.evaluateActionPlan(actionPlan, context);
```

## Policy Types

### Content Safety Policy
Enforces content safety standards using Guardian verification results.

### Reputation Threshold Policy
Restricts actions based on reputation scores.

### Action Validation Policy
Validates action plans for completeness and safety.

### Risk Mitigation Policy
Provides risk mitigation strategies and escalation paths.

### Compliance Policy
Ensures compliance with regulations and standards.

### Workflow Rule Policy
Defines workflow rules and process requirements.

## Decision Actions

- **ALLOW**: Action is permitted
- **BLOCK**: Action is blocked
- **REDIRECT**: Action is redirected to alternative path
- **ESCALATE**: Action requires human review
- **MONITOR**: Action is allowed but monitored
- **FLAG**: Action is flagged for review
- **TAKEDOWN**: Content/action is taken down

## Risk Levels

- **LOW**: Minimal risk, standard processing
- **MEDIUM**: Moderate risk, additional monitoring
- **HIGH**: High risk, requires review
- **CRITICAL**: Critical risk, immediate action required

## DKG Integration

All policies, patterns, and interactions are published to the DKG as Knowledge Assets, providing:
- Verifiable audit trails
- Immutable records
- Queryable history via SPARQL
- Cross-platform compatibility

## Best Practices

1. **Policy Design**
   - Start with high-priority policies for critical safety issues
   - Use escalation paths for complex scenarios
   - Regularly review and update policies

2. **Pattern Detection**
   - Use specific patterns for known threats
   - Combine multiple pattern types for better detection
   - Adjust confidence scores based on false positive rates

3. **Action Plan Validation**
   - Ensure all required fields are present
   - Validate dependencies before execution
   - Check safety scores before allowing actions

4. **Audit Trail**
   - Regularly query audit trails for analysis
   - Use DKG queries for complex analysis
   - Maintain audit records for compliance

## Example: Complete Workflow

```typescript
// 1. Initialize knowledge base
const kb = getGuardianKnowledgeBase(dkgClient);

// 2. Add custom policy
await kb.addPolicy(customPolicy);

// 3. Create action plan
const actionPlan: ActionPlan = {
  id: 'plan-001',
  agentId: 'agent-123',
  actions: [/* ... */],
  timestamp: Date.now(),
};

// 4. Validate completeness
const validation = kb.validateActionPlanCompleteness(actionPlan);
if (!validation.complete) {
  throw new Error(`Action plan incomplete: ${validation.missing.join(', ')}`);
}

// 5. Evaluate action plan
const decision = await kb.evaluateActionPlan(actionPlan, context);

// 6. Handle decision
switch (decision.action) {
  case DecisionAction.ALLOW:
    // Proceed with action
    break;
  case DecisionAction.BLOCK:
    // Block action
    break;
  case DecisionAction.ESCALATE:
    // Escalate to human review
    break;
  // ... other cases
}

// 7. Query history
const history = kb.getInteractionHistory({ agentId: 'agent-123' });
```

## API Reference

See the TypeScript definitions in `guardian-knowledge-base.ts` for complete API documentation.

