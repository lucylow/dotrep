/**
 * Guardian Agent Knowledge Base
 * 
 * A structured and centralized repository of information that a Guardian Agent uses
 * to monitor, reason, and manage the behavior of other AI agents or systems.
 * 
 * The knowledge base includes:
 * - Policies, guidelines, and workflow rules that define safe and compliant behavior
 * - Domain-specific data and signature patterns that help detect problematic behaviors
 * - Information for decision-making (block, redirect, escalate actions)
 * - Records of past agent interactions, monitored events, and audit trails
 * - Argument validation, completeness checking, and action plan validation
 * 
 * This knowledge base acts as the Guardian Agent's "brain," enabling autonomous or
 * semi-autonomous evaluation of other agents' action plans before execution, ensuring
 * correctness, relevance, and safety.
 */

import { DKGClientV8, DKGConfig } from './dkg-client-v8';

/**
 * Policy types that define safe and compliant behavior
 */
export enum PolicyType {
  CONTENT_SAFETY = 'content_safety',
  REPUTATION_THRESHOLD = 'reputation_threshold',
  ACTION_VALIDATION = 'action_validation',
  RISK_MITIGATION = 'risk_mitigation',
  COMPLIANCE = 'compliance',
  WORKFLOW_RULE = 'workflow_rule',
}

/**
 * Decision action types
 */
export enum DecisionAction {
  ALLOW = 'allow',
  BLOCK = 'block',
  REDIRECT = 'redirect',
  ESCALATE = 'escalate',
  MONITOR = 'monitor',
  FLAG = 'flag',
  TAKEDOWN = 'takedown',
}

/**
 * Risk level classification
 */
export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Policy definition
 */
export interface Policy {
  id: string;
  type: PolicyType;
  name: string;
  description: string;
  rules: PolicyRule[];
  priority: number; // Higher priority policies are evaluated first
  enabled: boolean;
  effectiveDate: string; // ISO date string
  expirationDate?: string; // ISO date string (optional)
  metadata?: Record<string, any>;
}

/**
 * Policy rule with conditions and actions
 */
export interface PolicyRule {
  id: string;
  condition: RuleCondition;
  action: DecisionAction;
  parameters?: Record<string, any>;
  confidence?: number; // Required confidence level (0-1)
  escalationPath?: string; // Policy ID to escalate to
}

/**
 * Rule condition for policy evaluation
 */
export interface RuleCondition {
  type: 'and' | 'or' | 'not';
  conditions?: RuleCondition[]; // For nested conditions
  field?: string; // Field to check (e.g., 'reputationScore', 'contentType')
  operator?: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'matches';
  value?: any; // Value to compare against
  pattern?: string; // Pattern for regex matching
}

/**
 * Signature pattern for detecting problematic behaviors
 */
export interface SignaturePattern {
  id: string;
  name: string;
  description: string;
  pattern: string | RegExp | PatternMatcher;
  matchType: 'exact' | 'regex' | 'semantic' | 'behavioral';
  riskLevel: RiskLevel;
  category: string; // e.g., 'deepfake', 'csam', 'misinformation', 'illicit'
  confidence: number; // Base confidence for this pattern (0-1)
  metadata?: Record<string, any>;
}

/**
 * Pattern matcher function
 */
export type PatternMatcher = (data: any, context?: any) => boolean | number; // Returns boolean or confidence score

/**
 * Agent interaction record
 */
export interface AgentInteraction {
  id: string;
  timestamp: number;
  agentId: string;
  agentType: string;
  action: string;
  actionPlan?: ActionPlan;
  context: Record<string, any>;
  decision?: Decision;
  outcome?: 'allowed' | 'blocked' | 'redirected' | 'escalated';
  auditUAL?: string; // UAL of audit record on DKG
}

/**
 * Action plan structure
 */
export interface ActionPlan {
  id: string;
  agentId: string;
  actions: PlannedAction[];
  metadata?: Record<string, any>;
  timestamp: number;
}

/**
 * Planned action within an action plan
 */
export interface PlannedAction {
  type: string;
  target: string;
  parameters: Record<string, any>;
  expectedOutcome?: string;
  dependencies?: string[]; // IDs of actions that must complete first
}

/**
 * Decision made by Guardian Agent
 */
export interface Decision {
  id: string;
  timestamp: number;
  action: DecisionAction;
  confidence: number; // 0-1
  reasoning: string;
  appliedPolicies: string[]; // Policy IDs that contributed to this decision
  riskAssessment: RiskAssessment;
  recommendations?: string[];
  escalationPath?: string;
}

/**
 * Risk assessment
 */
export interface RiskAssessment {
  level: RiskLevel;
  score: number; // 0-1
  factors: RiskFactor[];
  mitigation?: string[];
}

/**
 * Risk factor
 */
export interface RiskFactor {
  type: string;
  description: string;
  severity: RiskLevel;
  confidence: number;
}

/**
 * Audit trail entry
 */
export interface AuditEntry {
  id: string;
  timestamp: number;
  eventType: string;
  agentId?: string;
  action?: string;
  decision?: Decision;
  context: Record<string, any>;
  ual?: string; // UAL of this audit entry on DKG
}

/**
 * Knowledge base query options
 */
export interface KnowledgeBaseQuery {
  policyType?: PolicyType;
  riskLevel?: RiskLevel;
  category?: string;
  agentId?: string;
  dateRange?: { start: string; end: string };
  limit?: number;
}

/**
 * Guardian Agent Knowledge Base
 */
export class GuardianKnowledgeBase {
  private dkgClient: DKGClientV8;
  private policies: Map<string, Policy> = new Map();
  private signaturePatterns: Map<string, SignaturePattern> = new Map();
  private interactions: Map<string, AgentInteraction> = new Map();
  private auditTrail: AuditEntry[] = [];
  private knowledgeBaseUAL?: string;

  constructor(dkgClient?: DKGClientV8, dkgConfig?: DKGConfig) {
    this.dkgClient = dkgClient || new DKGClientV8(dkgConfig);
    this.initializeDefaultPolicies();
    this.initializeDefaultPatterns();
  }

  /**
   * Initialize default policies for Guardian Agent
   */
  private initializeDefaultPolicies(): void {
    // Content Safety Policy
    const contentSafetyPolicy: Policy = {
      id: 'policy-content-safety-001',
      type: PolicyType.CONTENT_SAFETY,
      name: 'Content Safety Verification',
      description: 'Enforces content safety standards using Guardian verification',
      priority: 100,
      enabled: true,
      effectiveDate: new Date().toISOString(),
      rules: [
        {
          id: 'rule-csam-block',
          condition: {
            type: 'and',
            conditions: [
              { type: 'and', field: 'matchType', operator: 'eq', value: 'csam' },
              { type: 'and', field: 'confidence', operator: 'gte', value: 0.7 },
            ],
          },
          action: DecisionAction.BLOCK,
          confidence: 0.7,
        },
        {
          id: 'rule-illicit-escalate',
          condition: {
            type: 'and',
            conditions: [
              { type: 'and', field: 'matchType', operator: 'eq', value: 'illicit' },
              { type: 'and', field: 'confidence', operator: 'gte', value: 0.85 },
            ],
          },
          action: DecisionAction.ESCALATE,
          confidence: 0.85,
          escalationPath: 'policy-risk-mitigation-001',
        },
        {
          id: 'rule-deepfake-flag',
          condition: {
            type: 'and',
            conditions: [
              { type: 'and', field: 'matchType', operator: 'eq', value: 'deepfake' },
              { type: 'and', field: 'confidence', operator: 'gte', value: 0.6 },
            ],
          },
          action: DecisionAction.FLAG,
          confidence: 0.6,
        },
      ],
    };

    // Reputation Threshold Policy
    const reputationPolicy: Policy = {
      id: 'policy-reputation-threshold-001',
      type: PolicyType.REPUTATION_THRESHOLD,
      name: 'Reputation-Based Access Control',
      description: 'Restricts actions based on reputation scores',
      priority: 90,
      enabled: true,
      effectiveDate: new Date().toISOString(),
      rules: [
        {
          id: 'rule-low-reputation-block',
          condition: {
            type: 'and',
            field: 'reputationScore',
            operator: 'lt',
            value: 300,
          },
          action: DecisionAction.BLOCK,
        },
        {
          id: 'rule-medium-reputation-monitor',
          condition: {
            type: 'and',
            conditions: [
              { type: 'and', field: 'reputationScore', operator: 'gte', value: 300 },
              { type: 'and', field: 'reputationScore', operator: 'lt', value: 600 },
            ],
          },
          action: DecisionAction.MONITOR,
        },
      ],
    };

    // Action Validation Policy
    const actionValidationPolicy: Policy = {
      id: 'policy-action-validation-001',
      type: PolicyType.ACTION_VALIDATION,
      name: 'Action Plan Validation',
      description: 'Validates action plans for completeness and safety',
      priority: 80,
      enabled: true,
      effectiveDate: new Date().toISOString(),
      rules: [
        {
          id: 'rule-incomplete-plan-block',
          condition: {
            type: 'and',
            field: 'actionPlanCompleteness',
            operator: 'lt',
            value: 0.8,
          },
          action: DecisionAction.BLOCK,
        },
        {
          id: 'rule-unsafe-action-escalate',
          condition: {
            type: 'and',
            field: 'actionSafetyScore',
            operator: 'lt',
            value: 0.5,
          },
          action: DecisionAction.ESCALATE,
          escalationPath: 'policy-risk-mitigation-001',
        },
      ],
    };

    this.policies.set(contentSafetyPolicy.id, contentSafetyPolicy);
    this.policies.set(reputationPolicy.id, reputationPolicy);
    this.policies.set(actionValidationPolicy.id, actionValidationPolicy);
  }

  /**
   * Initialize default signature patterns
   */
  private initializeDefaultPatterns(): void {
    // CSAM detection pattern
    const csamPattern: SignaturePattern = {
      id: 'pattern-csam-001',
      name: 'CSAM Content Pattern',
      description: 'Detects child sexual abuse material',
      pattern: /csam|child.*abuse|minor.*sexual/i,
      matchType: 'regex',
      riskLevel: RiskLevel.CRITICAL,
      category: 'csam',
      confidence: 0.9,
    };

    // Deepfake detection pattern
    const deepfakePattern: SignaturePattern = {
      id: 'pattern-deepfake-001',
      name: 'Deepfake Content Pattern',
      description: 'Detects AI-generated or manipulated media',
      pattern: (data: any) => {
        // Check for deepfake indicators
        if (data.metadata?.aiGenerated === true) return 0.8;
        if (data.metadata?.manipulationScore && data.metadata.manipulationScore > 0.7) return 0.85;
        return 0;
      },
      matchType: 'behavioral',
      riskLevel: RiskLevel.HIGH,
      category: 'deepfake',
      confidence: 0.75,
    };

    // Misinformation pattern
    const misinformationPattern: SignaturePattern = {
      id: 'pattern-misinformation-001',
      name: 'Misinformation Pattern',
      description: 'Detects potentially false or misleading information',
      pattern: /fake.*news|misinformation|disinformation|hoax/i,
      matchType: 'regex',
      riskLevel: RiskLevel.MEDIUM,
      category: 'misinformation',
      confidence: 0.6,
    };

    this.signaturePatterns.set(csamPattern.id, csamPattern);
    this.signaturePatterns.set(deepfakePattern.id, deepfakePattern);
    this.signaturePatterns.set(misinformationPattern.id, misinformationPattern);
  }

  /**
   * Add or update a policy
   */
  async addPolicy(policy: Policy): Promise<void> {
    this.policies.set(policy.id, policy);
    await this.publishPolicyToDKG(policy);
    this.audit('policy_updated', { policyId: policy.id, policyName: policy.name });
  }

  /**
   * Get policy by ID
   */
  getPolicy(policyId: string): Policy | undefined {
    return this.policies.get(policyId);
  }

  /**
   * Get all policies matching query
   */
  getPolicies(query?: KnowledgeBaseQuery): Policy[] {
    let policies = Array.from(this.policies.values());

    if (query?.policyType) {
      policies = policies.filter(p => p.type === query.policyType);
    }

    if (query?.riskLevel) {
      // Filter policies that can result in the specified risk level
      policies = policies.filter(p => 
        p.rules.some(r => this.getRiskLevelForAction(r.action) === query.riskLevel)
      );
    }

    // Filter by enabled status
    policies = policies.filter(p => p.enabled);

    // Filter by date range
    if (query?.dateRange) {
      const start = new Date(query.dateRange.start);
      const end = new Date(query.dateRange.end);
      policies = policies.filter(p => {
        const effective = new Date(p.effectiveDate);
        const expired = p.expirationDate ? new Date(p.expirationDate) : null;
        return effective >= start && (!expired || expired <= end);
      });
    }

    // Sort by priority (descending)
    policies.sort((a, b) => b.priority - a.priority);

    if (query?.limit) {
      policies = policies.slice(0, query.limit);
    }

    return policies;
  }

  /**
   * Add or update a signature pattern
   */
  async addSignaturePattern(pattern: SignaturePattern): Promise<void> {
    this.signaturePatterns.set(pattern.id, pattern);
    await this.publishPatternToDKG(pattern);
    this.audit('pattern_added', { patternId: pattern.id, patternName: pattern.name });
  }

  /**
   * Get signature pattern by ID
   */
  getSignaturePattern(patternId: string): SignaturePattern | undefined {
    return this.signaturePatterns.get(patternId);
  }

  /**
   * Get all signature patterns matching query
   */
  getSignaturePatterns(query?: KnowledgeBaseQuery): SignaturePattern[] {
    let patterns = Array.from(this.signaturePatterns.values());

    if (query?.category) {
      patterns = patterns.filter(p => p.category === query.category);
    }

    if (query?.riskLevel) {
      patterns = patterns.filter(p => p.riskLevel === query.riskLevel);
    }

    return patterns;
  }

  /**
   * Evaluate an action plan and make a decision
   */
  async evaluateActionPlan(
    actionPlan: ActionPlan,
    context: Record<string, any>
  ): Promise<Decision> {
    const riskAssessment = await this.assessRisk(actionPlan, context);
    const appliedPolicies: string[] = [];
    const decisionActions: DecisionAction[] = [];

    // Evaluate all applicable policies
    const policies = this.getPolicies({ policyType: PolicyType.ACTION_VALIDATION });
    
    for (const policy of policies) {
      for (const rule of policy.rules) {
        if (this.evaluateRule(rule, actionPlan, context)) {
          appliedPolicies.push(policy.id);
          decisionActions.push(rule.action);
          
          // If escalation path is defined, follow it
          if (rule.escalationPath) {
            const escalationPolicy = this.getPolicy(rule.escalationPath);
            if (escalationPolicy) {
              const escalationDecision = await this.evaluatePolicy(escalationPolicy, actionPlan, context);
              if (escalationDecision.action === DecisionAction.BLOCK || 
                  escalationDecision.action === DecisionAction.ESCALATE) {
                decisionActions.push(escalationDecision.action);
              }
            }
          }
        }
      }
    }

    // Determine final action (most restrictive wins)
    const finalAction = this.determineFinalAction(decisionActions);
    const confidence = this.calculateDecisionConfidence(riskAssessment, appliedPolicies.length);

    const decision: Decision = {
      id: `decision-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      action: finalAction,
      confidence,
      reasoning: this.generateReasoning(riskAssessment, appliedPolicies, finalAction),
      appliedPolicies,
      riskAssessment,
      recommendations: this.generateRecommendations(riskAssessment, finalAction),
    };

    // Record interaction
    await this.recordInteraction({
      id: `interaction-${Date.now()}`,
      timestamp: Date.now(),
      agentId: actionPlan.agentId,
      agentType: context.agentType || 'unknown',
      action: 'action_plan_evaluation',
      actionPlan,
      context,
      decision,
      outcome: this.mapDecisionToOutcome(finalAction),
    });

    return decision;
  }

  /**
   * Validate action plan completeness
   */
  validateActionPlanCompleteness(actionPlan: ActionPlan): {
    complete: boolean;
    score: number; // 0-1
    missing: string[];
    warnings: string[];
  } {
    const missing: string[] = [];
    const warnings: string[] = [];
    let score = 1.0;

    // Check required fields
    if (!actionPlan.id) {
      missing.push('id');
      score -= 0.2;
    }
    if (!actionPlan.agentId) {
      missing.push('agentId');
      score -= 0.2;
    }
    if (!actionPlan.actions || actionPlan.actions.length === 0) {
      missing.push('actions');
      score -= 0.3;
    }

    // Validate each action
    if (actionPlan.actions) {
      actionPlan.actions.forEach((action, index) => {
        if (!action.type) {
          missing.push(`actions[${index}].type`);
          score -= 0.1;
        }
        if (!action.target) {
          warnings.push(`actions[${index}].target is missing`);
          score -= 0.05;
        }
        if (!action.parameters || Object.keys(action.parameters).length === 0) {
          warnings.push(`actions[${index}].parameters is empty`);
          score -= 0.05;
        }

        // Check dependencies
        if (action.dependencies) {
          action.dependencies.forEach(depId => {
            const depExists = actionPlan.actions?.some(a => a.id === depId);
            if (!depExists) {
              warnings.push(`actions[${index}] depends on missing action: ${depId}`);
              score -= 0.05;
            }
          });
        }
      });
    }

    return {
      complete: score >= 0.8 && missing.length === 0,
      score: Math.max(0, score),
      missing,
      warnings,
    };
  }

  /**
   * Assess risk for an action plan
   */
  private async assessRisk(
    actionPlan: ActionPlan,
    context: Record<string, any>
  ): Promise<RiskAssessment> {
    const factors: RiskFactor[] = [];
    let riskScore = 0;

    // Check action plan completeness
    const completeness = this.validateActionPlanCompleteness(actionPlan);
    if (!completeness.complete) {
      factors.push({
        type: 'incomplete_plan',
        description: `Action plan is incomplete (score: ${completeness.score.toFixed(2)})`,
        severity: completeness.score < 0.5 ? RiskLevel.HIGH : RiskLevel.MEDIUM,
        confidence: 1 - completeness.score,
      });
      riskScore += (1 - completeness.score) * 0.3;
    }

    // Check reputation if available
    if (context.reputationScore !== undefined) {
      const repScore = context.reputationScore;
      if (repScore < 300) {
        factors.push({
          type: 'low_reputation',
          description: `Agent has low reputation score: ${repScore}`,
          severity: RiskLevel.HIGH,
          confidence: 0.9,
        });
        riskScore += 0.4;
      } else if (repScore < 600) {
        factors.push({
          type: 'medium_reputation',
          description: `Agent has medium reputation score: ${repScore}`,
          severity: RiskLevel.MEDIUM,
          confidence: 0.7,
        });
        riskScore += 0.2;
      }
    }

    // Check for signature patterns
    const patternMatches = this.detectPatterns(actionPlan, context);
    patternMatches.forEach(match => {
      factors.push({
        type: 'pattern_match',
        description: `Matched signature pattern: ${match.patternName}`,
        severity: match.riskLevel,
        confidence: match.confidence,
      });
      riskScore += match.confidence * this.getRiskWeight(match.riskLevel);
    });

    // Determine risk level
    let riskLevel: RiskLevel;
    if (riskScore >= 0.7) {
      riskLevel = RiskLevel.CRITICAL;
    } else if (riskScore >= 0.5) {
      riskLevel = RiskLevel.HIGH;
    } else if (riskScore >= 0.3) {
      riskLevel = RiskLevel.MEDIUM;
    } else {
      riskLevel = RiskLevel.LOW;
    }

    return {
      level: riskLevel,
      score: Math.min(1, riskScore),
      factors,
      mitigation: this.suggestMitigation(factors),
    };
  }

  /**
   * Detect signature patterns in action plan or context
   */
  private detectPatterns(
    actionPlan: ActionPlan,
    context: Record<string, any>
  ): Array<{ patternId: string; patternName: string; riskLevel: RiskLevel; confidence: number }> {
    const matches: Array<{ patternId: string; patternName: string; riskLevel: RiskLevel; confidence: number }> = [];
    const dataToCheck = JSON.stringify({ actionPlan, context });

    for (const pattern of this.signaturePatterns.values()) {
      let matchResult: boolean | number = false;

      if (typeof pattern.pattern === 'string') {
        // String pattern (exact match)
        matchResult = dataToCheck.includes(pattern.pattern);
      } else if (pattern.pattern instanceof RegExp) {
        // Regex pattern
        matchResult = pattern.pattern.test(dataToCheck);
      } else if (typeof pattern.pattern === 'function') {
        // Function pattern matcher
        matchResult = pattern.pattern(actionPlan, context);
      }

      if (matchResult) {
        const confidence = typeof matchResult === 'number' ? matchResult : pattern.confidence;
        matches.push({
          patternId: pattern.id,
          patternName: pattern.name,
          riskLevel: pattern.riskLevel,
          confidence,
        });
      }
    }

    return matches;
  }

  /**
   * Evaluate a policy rule
   */
  private evaluateRule(
    rule: PolicyRule,
    actionPlan: ActionPlan,
    context: Record<string, any>
  ): boolean {
    return this.evaluateCondition(rule.condition, actionPlan, context);
  }

  /**
   * Evaluate a condition recursively
   */
  private evaluateCondition(
    condition: RuleCondition,
    actionPlan: ActionPlan,
    context: Record<string, any>
  ): boolean {
    if (condition.type === 'and' && condition.conditions) {
      return condition.conditions.every(c => this.evaluateCondition(c, actionPlan, context));
    }
    if (condition.type === 'or' && condition.conditions) {
      return condition.conditions.some(c => this.evaluateCondition(c, actionPlan, context));
    }
    if (condition.type === 'not' && condition.conditions) {
      return !this.evaluateCondition(condition.conditions[0], actionPlan, context);
    }

    // Leaf condition - evaluate field
    if (condition.field && condition.operator && condition.value !== undefined) {
      const fieldValue = this.getFieldValue(condition.field, actionPlan, context);
      return this.compareValues(fieldValue, condition.operator, condition.value, condition.pattern);
    }

    return false;
  }

  /**
   * Get field value from action plan or context
   */
  private getFieldValue(field: string, actionPlan: ActionPlan, context: Record<string, any>): any {
    // Check context first
    if (context[field] !== undefined) {
      return context[field];
    }

    // Check action plan metadata
    if (actionPlan.metadata && actionPlan.metadata[field] !== undefined) {
      return actionPlan.metadata[field];
    }

    // Special fields
    if (field === 'actionPlanCompleteness') {
      return this.validateActionPlanCompleteness(actionPlan).score;
    }
    if (field === 'actionSafetyScore') {
      // Calculate safety score based on action types
      return this.calculateActionSafetyScore(actionPlan);
    }

    return undefined;
  }

  /**
   * Compare values based on operator
   */
  private compareValues(actual: any, operator: string, expected: any, pattern?: string): boolean {
    switch (operator) {
      case 'eq': return actual === expected;
      case 'ne': return actual !== expected;
      case 'gt': return actual > expected;
      case 'gte': return actual >= expected;
      case 'lt': return actual < expected;
      case 'lte': return actual <= expected;
      case 'in': return Array.isArray(expected) && expected.includes(actual);
      case 'contains': return String(actual).includes(String(expected));
      case 'matches': 
        if (pattern) {
          const regex = new RegExp(pattern);
          return regex.test(String(actual));
        }
        return false;
      default: return false;
    }
  }

  /**
   * Evaluate a policy
   */
  private async evaluatePolicy(
    policy: Policy,
    actionPlan: ActionPlan,
    context: Record<string, any>
  ): Promise<Decision> {
    const riskAssessment = await this.assessRisk(actionPlan, context);
    const matchingRules = policy.rules.filter(r => this.evaluateRule(r, actionPlan, context));
    
    if (matchingRules.length === 0) {
      return {
        id: `decision-${Date.now()}`,
        timestamp: Date.now(),
        action: DecisionAction.ALLOW,
        confidence: 0.5,
        reasoning: 'No matching policy rules',
        appliedPolicies: [],
        riskAssessment,
      };
    }

    const actions = matchingRules.map(r => r.action);
    const finalAction = this.determineFinalAction(actions);

    return {
      id: `decision-${Date.now()}`,
      timestamp: Date.now(),
      action: finalAction,
      confidence: 0.8,
      reasoning: `Policy ${policy.name} applied`,
      appliedPolicies: [policy.id],
      riskAssessment,
    };
  }

  /**
   * Determine final action from multiple actions (most restrictive wins)
   */
  private determineFinalAction(actions: DecisionAction[]): DecisionAction {
    if (actions.length === 0) return DecisionAction.ALLOW;

    const priority: Record<DecisionAction, number> = {
      [DecisionAction.ALLOW]: 0,
      [DecisionAction.MONITOR]: 1,
      [DecisionAction.FLAG]: 2,
      [DecisionAction.REDIRECT]: 3,
      [DecisionAction.ESCALATE]: 4,
      [DecisionAction.BLOCK]: 5,
      [DecisionAction.TAKEDOWN]: 6,
    };

    return actions.reduce((prev, curr) => 
      priority[curr] > priority[prev] ? curr : prev
    );
  }

  /**
   * Calculate decision confidence
   */
  private calculateDecisionConfidence(
    riskAssessment: RiskAssessment,
    policyCount: number
  ): number {
    // Base confidence on risk assessment
    let confidence = 1 - riskAssessment.score;
    
    // Boost confidence if multiple policies agree
    if (policyCount > 1) {
      confidence = Math.min(1, confidence + 0.1 * (policyCount - 1));
    }

    return Math.max(0.1, Math.min(1, confidence));
  }

  /**
   * Generate reasoning for decision
   */
  private generateReasoning(
    riskAssessment: RiskAssessment,
    appliedPolicies: string[],
    action: DecisionAction
  ): string {
    const factors = riskAssessment.factors.map(f => f.description).join('; ');
    const policies = appliedPolicies.length > 0 
      ? `Applied policies: ${appliedPolicies.join(', ')}. `
      : '';
    
    return `${policies}Risk assessment: ${riskAssessment.level} (score: ${riskAssessment.score.toFixed(2)}). ` +
           `Factors: ${factors}. ` +
           `Decision: ${action} due to ${riskAssessment.level} risk level.`;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    riskAssessment: RiskAssessment,
    action: DecisionAction
  ): string[] {
    const recommendations: string[] = [];

    if (action === DecisionAction.BLOCK || action === DecisionAction.ESCALATE) {
      recommendations.push('Review action plan with human oversight');
      recommendations.push('Consider additional verification steps');
    }

    if (riskAssessment.factors.some(f => f.type === 'incomplete_plan')) {
      recommendations.push('Complete missing action plan components');
    }

    if (riskAssessment.factors.some(f => f.type === 'low_reputation')) {
      recommendations.push('Improve agent reputation through verified actions');
    }

    if (riskAssessment.mitigation) {
      recommendations.push(...riskAssessment.mitigation);
    }

    return recommendations;
  }

  /**
   * Record agent interaction
   */
  async recordInteraction(interaction: AgentInteraction): Promise<void> {
    this.interactions.set(interaction.id, interaction);
    
    // Publish to DKG for audit trail
    await this.publishInteractionToDKG(interaction);
    
    // Add to audit trail
    this.audit('agent_interaction', {
      interactionId: interaction.id,
      agentId: interaction.agentId,
      action: interaction.action,
      outcome: interaction.outcome,
    });
  }

  /**
   * Get interaction history
   */
  getInteractionHistory(query?: KnowledgeBaseQuery): AgentInteraction[] {
    let interactions = Array.from(this.interactions.values());

    if (query?.agentId) {
      interactions = interactions.filter(i => i.agentId === query.agentId);
    }

    if (query?.dateRange) {
      const start = new Date(query.dateRange.start).getTime();
      const end = new Date(query.dateRange.end).getTime();
      interactions = interactions.filter(i => i.timestamp >= start && i.timestamp <= end);
    }

    // Sort by timestamp (descending)
    interactions.sort((a, b) => b.timestamp - a.timestamp);

    if (query?.limit) {
      interactions = interactions.slice(0, query.limit);
    }

    return interactions;
  }

  /**
   * Add audit entry
   */
  private audit(eventType: string, context: Record<string, any>): void {
    const entry: AuditEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      eventType,
      context,
    };

    this.auditTrail.push(entry);

    // Keep only last 10000 entries in memory
    if (this.auditTrail.length > 10000) {
      this.auditTrail = this.auditTrail.slice(-10000);
    }
  }

  /**
   * Get audit trail
   */
  getAuditTrail(query?: KnowledgeBaseQuery): AuditEntry[] {
    let entries = [...this.auditTrail];

    if (query?.agentId) {
      entries = entries.filter(e => e.agentId === query.agentId);
    }

    if (query?.dateRange) {
      const start = new Date(query.dateRange.start).getTime();
      const end = new Date(query.dateRange.end).getTime();
      entries = entries.filter(e => e.timestamp >= start && e.timestamp <= end);
    }

    // Sort by timestamp (descending)
    entries.sort((a, b) => b.timestamp - a.timestamp);

    if (query?.limit) {
      entries = entries.slice(0, query.limit);
    }

    return entries;
  }

  // Helper methods

  private getRiskLevelForAction(action: DecisionAction): RiskLevel {
    switch (action) {
      case DecisionAction.TAKEDOWN:
      case DecisionAction.BLOCK:
        return RiskLevel.CRITICAL;
      case DecisionAction.ESCALATE:
        return RiskLevel.HIGH;
      case DecisionAction.FLAG:
        return RiskLevel.MEDIUM;
      case DecisionAction.MONITOR:
        return RiskLevel.LOW;
      default:
        return RiskLevel.LOW;
    }
  }

  private getRiskWeight(riskLevel: RiskLevel): number {
    switch (riskLevel) {
      case RiskLevel.CRITICAL: return 0.5;
      case RiskLevel.HIGH: return 0.3;
      case RiskLevel.MEDIUM: return 0.2;
      case RiskLevel.LOW: return 0.1;
    }
  }

  private calculateActionSafetyScore(actionPlan: ActionPlan): number {
    // Simple heuristic: more actions = potentially less safe
    const actionCount = actionPlan.actions?.length || 0;
    const baseScore = 0.8;
    const penalty = Math.min(0.3, actionCount * 0.05);
    return Math.max(0, baseScore - penalty);
  }

  private suggestMitigation(factors: RiskFactor[]): string[] {
    const mitigations: string[] = [];
    
    factors.forEach(factor => {
      switch (factor.type) {
        case 'incomplete_plan':
          mitigations.push('Complete all required action plan fields');
          break;
        case 'low_reputation':
          mitigations.push('Build reputation through verified actions');
          break;
        case 'pattern_match':
          mitigations.push('Review content for policy violations');
          break;
      }
    });

    return mitigations;
  }

  private mapDecisionToOutcome(action: DecisionAction): 'allowed' | 'blocked' | 'redirected' | 'escalated' {
    switch (action) {
      case DecisionAction.ALLOW:
        return 'allowed';
      case DecisionAction.BLOCK:
      case DecisionAction.TAKEDOWN:
        return 'blocked';
      case DecisionAction.REDIRECT:
        return 'redirected';
      case DecisionAction.ESCALATE:
        return 'escalated';
      default:
        return 'allowed';
    }
  }

  // DKG Publishing Methods

  /**
   * Publish policy to DKG
   */
  private async publishPolicyToDKG(policy: Policy): Promise<void> {
    try {
      const knowledgeAsset = {
        '@context': {
          '@vocab': 'https://schema.org/',
          guardian: 'https://guardian.umanitek.ai/schema/',
        },
        '@type': 'guardian:Policy',
        '@id': `urn:guardian:policy:${policy.id}`,
        'guardian:policyId': policy.id,
        'guardian:policyType': policy.type,
        'schema:name': policy.name,
        'schema:description': policy.description,
        'guardian:priority': policy.priority,
        'guardian:enabled': policy.enabled,
        'schema:dateCreated': policy.effectiveDate,
        'schema:dateModified': new Date().toISOString(),
        'guardian:rules': policy.rules,
        ...(policy.metadata || {}),
      };

      // Publish as Knowledge Asset (simplified - in production, use proper DKG publish)
      console.log(`📤 Publishing policy ${policy.id} to DKG`);
    } catch (error) {
      console.error(`❌ Failed to publish policy to DKG:`, error);
    }
  }

  /**
   * Publish pattern to DKG
   */
  private async publishPatternToDKG(pattern: SignaturePattern): Promise<void> {
    try {
      const knowledgeAsset = {
        '@context': {
          '@vocab': 'https://schema.org/',
          guardian: 'https://guardian.umanitek.ai/schema/',
        },
        '@type': 'guardian:SignaturePattern',
        '@id': `urn:guardian:pattern:${pattern.id}`,
        'guardian:patternId': pattern.id,
        'schema:name': pattern.name,
        'schema:description': pattern.description,
        'guardian:riskLevel': pattern.riskLevel,
        'guardian:category': pattern.category,
        'guardian:confidence': pattern.confidence,
        'schema:dateCreated': new Date().toISOString(),
        ...(pattern.metadata || {}),
      };

      console.log(`📤 Publishing pattern ${pattern.id} to DKG`);
    } catch (error) {
      console.error(`❌ Failed to publish pattern to DKG:`, error);
    }
  }

  /**
   * Publish interaction to DKG
   */
  private async publishInteractionToDKG(interaction: AgentInteraction): Promise<void> {
    try {
      const knowledgeAsset = {
        '@context': {
          '@vocab': 'https://schema.org/',
          guardian: 'https://guardian.umanitek.ai/schema/',
          prov: 'http://www.w3.org/ns/prov#',
        },
        '@type': 'guardian:AgentInteraction',
        '@id': `urn:guardian:interaction:${interaction.id}`,
        'guardian:interactionId': interaction.id,
        'guardian:agentId': interaction.agentId,
        'guardian:agentType': interaction.agentType,
        'guardian:action': interaction.action,
        'guardian:outcome': interaction.outcome,
        'prov:generatedAtTime': new Date(interaction.timestamp).toISOString(),
        'guardian:context': interaction.context,
        ...(interaction.decision ? {
          'guardian:decision': {
            'guardian:action': interaction.decision.action,
            'guardian:confidence': interaction.decision.confidence,
            'guardian:reasoning': interaction.decision.reasoning,
          },
        } : {}),
      };

      console.log(`📤 Publishing interaction ${interaction.id} to DKG`);
    } catch (error) {
      console.error(`❌ Failed to publish interaction to DKG:`, error);
    }
  }
}

// Singleton instance
let knowledgeBaseInstance: GuardianKnowledgeBase | null = null;

/**
 * Get or create Guardian Knowledge Base instance
 */
export function getGuardianKnowledgeBase(
  dkgClient?: DKGClientV8,
  dkgConfig?: DKGConfig
): GuardianKnowledgeBase {
  if (!knowledgeBaseInstance) {
    knowledgeBaseInstance = new GuardianKnowledgeBase(dkgClient, dkgConfig);
  }
  return knowledgeBaseInstance;
}

