/**
 * MCP Prompts for Reputation System
 * 
 * Defines reusable prompt templates that can be used by AI agents,
 * following MCP specification for prompt management.
 */

import { MCPStandardPrompt } from '../types/mcp-standard';
import { createMCPProperty } from '../types/mcp-standard';

/**
 * Reputation Prompts
 * 
 * Prompts are templates that can be filled with arguments
 * to generate context for AI agents.
 */
export class ReputationPrompts {
  /**
   * Get all available prompts
   */
  getPrompts(): MCPStandardPrompt[] {
    return [
      this.getAnalyzeReputationTrendsPrompt(),
      this.getCompareUsersPrompt(),
      this.getTrustAssessmentPrompt(),
      this.getReputationExplanationPrompt(),
      this.getSybilRiskAnalysisPrompt(),
    ];
  }

  /**
   * Get a specific prompt by name
   */
  getPrompt(name: string): MCPStandardPrompt | null {
    const prompts = this.getPrompts();
    return prompts.find(p => p.name === name) || null;
  }

  /**
   * Generate prompt text from template
   */
  generatePrompt(name: string, args: Record<string, any>): string {
    const prompt = this.getPrompt(name);
    if (!prompt) {
      throw new Error(`Prompt not found: ${name}`);
    }

    // Simple template replacement
    let template = this.getPromptTemplate(name);
    
    // Replace variables in template
    for (const [key, value] of Object.entries(args)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      template = template.replace(regex, String(value));
    }

    return template;
  }

  /**
   * Prompt: Analyze Reputation Trends
   */
  private getAnalyzeReputationTrendsPrompt(): MCPStandardPrompt {
    return {
      name: 'analyze_reputation_trends',
      description: 'Analyze reputation trends over time and provide insights on growth patterns, potential concerns, and recommendations.',
      arguments: {
        type: 'object',
        properties: {
          timeRange: createMCPProperty('string', 'Time range for analysis', {
            enum: ['7d', '30d', '90d', '180d', '1y'],
            default: '30d',
          }),
          metrics: createMCPProperty('array', 'Specific metrics to analyze', {
            items: {
              type: 'string',
              enum: ['overall', 'contributions', 'payments', 'ratings', 'trust_factors'],
            },
          }),
          userId: createMCPProperty('string', 'User ID to analyze (optional, if not provided analyzes network-wide trends)'),
        },
      },
    };
  }

  /**
   * Prompt: Compare Users
   */
  private getCompareUsersPrompt(): MCPStandardPrompt {
    return {
      name: 'compare_users',
      description: 'Compare multiple users and provide a detailed comparison of their reputation scores, trust factors, and recommendations.',
      arguments: {
        type: 'object',
        properties: {
          userIds: createMCPProperty('array', 'Array of user IDs to compare', {
            items: { type: 'string' },
            minItems: 2,
          }),
          includeBreakdown: createMCPProperty('boolean', 'Include detailed breakdown', {
            default: true,
          }),
          focusArea: createMCPProperty('string', 'Focus area for comparison', {
            enum: ['overall', 'trust', 'activity', 'payments', 'ratings'],
            default: 'overall',
          }),
        },
        required: ['userIds'],
      },
    };
  }

  /**
   * Prompt: Trust Assessment
   */
  private getTrustAssessmentPrompt(): MCPStandardPrompt {
    return {
      name: 'assess_trust',
      description: 'Provide a comprehensive trust assessment for a user, including risk factors, recommendations, and trust level explanation.',
      arguments: {
        type: 'object',
        properties: {
          userId: createMCPProperty('string', 'User ID to assess'),
          context: createMCPProperty('string', 'Context for trust assessment (e.g., "endorsement_campaign", "payment_processing")'),
          includeSybilAnalysis: createMCPProperty('boolean', 'Include Sybil risk analysis', {
            default: true,
          }),
        },
        required: ['userId'],
      },
    };
  }

  /**
   * Prompt: Reputation Explanation
   */
  private getReputationExplanationPrompt(): MCPStandardPrompt {
    return {
      name: 'explain_reputation',
      description: 'Explain how a user\'s reputation score was calculated, including breakdown of components and factors.',
      arguments: {
        type: 'object',
        properties: {
          userId: createMCPProperty('string', 'User ID to explain'),
          includeFactors: createMCPProperty('boolean', 'Include detailed factor explanations', {
            default: true,
          }),
          language: createMCPProperty('string', 'Language for explanation', {
            enum: ['en', 'es', 'fr', 'de', 'zh'],
            default: 'en',
          }),
        },
        required: ['userId'],
      },
    };
  }

  /**
   * Prompt: Sybil Risk Analysis
   */
  private getSybilRiskAnalysisPrompt(): MCPStandardPrompt {
    return {
      name: 'analyze_sybil_risk',
      description: 'Analyze Sybil risk for a user or group of users, identifying potential bot clusters and suspicious patterns.',
      arguments: {
        type: 'object',
        properties: {
          userIds: createMCPProperty('array', 'User IDs to analyze (can be single user or multiple)', {
            items: { type: 'string' },
          }),
          includeRecommendations: createMCPProperty('boolean', 'Include risk mitigation recommendations', {
            default: true,
          }),
          severity: createMCPProperty('string', 'Minimum severity level to report', {
            enum: ['low', 'medium', 'high', 'critical'],
            default: 'medium',
          }),
        },
      },
    };
  }

  /**
   * Get prompt template text
   */
  private getPromptTemplate(name: string): string {
    const templates: Record<string, string> = {
      analyze_reputation_trends: `Analyze reputation trends for the past {{timeRange}}.
Focus on these metrics: {{metrics}}.
{{#if userId}}For user: {{userId}}{{/if}}
Provide insights on:
- Growth patterns and trajectory
- Potential concerns or anomalies
- Recommendations for improvement
- Comparison to network averages`,

      compare_users: `Compare the following users: {{userIds}}
Focus area: {{focusArea}}
{{#if includeBreakdown}}Include detailed breakdown of reputation components.{{/if}}

Provide:
- Side-by-side comparison
- Strengths and weaknesses of each user
- Recommendations for selection or ranking
- Trust level assessment`,

      assess_trust: `Assess trust level for user: {{userId}}
Context: {{context}}
{{#if includeSybilAnalysis}}Include Sybil risk analysis.{{/if}}

Provide:
- Overall trust assessment
- Risk factors identified
- Trust level explanation
- Recommendations for interaction
- Confidence score`,

      explain_reputation: `Explain how the reputation score was calculated for user: {{userId}}
{{#if includeFactors}}Include detailed explanation of all factors.{{/if}}
Language: {{language}}

Provide:
- Overall reputation score breakdown
- Contribution of each component
- Time decay effects
- Verification boosts
- Trust factors`,

      analyze_sybil_risk: `Analyze Sybil risk for users: {{userIds}}
Minimum severity: {{severity}}
{{#if includeRecommendations}}Include risk mitigation recommendations.{{/if}}

Provide:
- Sybil risk assessment
- Identified patterns or clusters
- Severity levels
- Evidence and reasoning
- Recommendations`,
    };

    return templates[name] || '';
  }
}

/**
 * Create Reputation Prompts instance
 */
export function createReputationPrompts(): ReputationPrompts {
  return new ReputationPrompts();
}

export default ReputationPrompts;

