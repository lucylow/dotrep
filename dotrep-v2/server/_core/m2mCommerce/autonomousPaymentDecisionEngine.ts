/**
 * Autonomous Payment Decision Engine
 * 
 * Enables AI agents to autonomously decide whether to pay for premium data
 * based on cost-benefit analysis, query complexity, and budget constraints.
 * 
 * This implements the decision logic for autonomous x402 payments, allowing
 * chatbots and AI agents to strategically invest in better data to serve users.
 */

export interface DecisionFactors {
  queryComplexity: number; // 0-1: How complex is the query?
  dataGapSeverity: number; // 0-1: How critical are the data gaps?
  userTrustLevel: number; // 0-1: How trusted is the user?
  potentialValue: number; // 0-1: How valuable is the response?
  costBenefitRatio: number; // Calculated: value / cost
}

export interface PaymentDecision {
  shouldPay: boolean;
  maxAmount?: number;
  rationale: string;
  factors?: DecisionFactors;
  recommendedSources?: PremiumDataSource[];
}

export interface PremiumDataSource {
  name: string;
  url: string;
  cost: number; // Cost in USD
  description: string;
  expectedValue: number; // 0-1: Expected value for this query
  dataType?: string;
  provider?: string;
}

export interface QueryAnalysis {
  complexity: number;
  requiresSpecializedData: boolean;
  requiresRealtimeData: boolean;
  requiresFinancialData: boolean;
  requiresIndustryData: boolean;
  dataGaps: string[];
}

export interface BudgetLimits {
  daily: number; // Daily budget limit in USD
  perQuery: number; // Maximum per-query budget in USD
  monthly?: number; // Optional monthly budget
}

export interface UserContext {
  userId: string;
  userDid?: string;
  trustLevel?: number;
  reputationScore?: number;
  paymentHistory?: Array<{
    amount: number;
    timestamp: number;
    resource: string;
  }>;
}

export class AutonomousPaymentDecisionEngine {
  private budgetLimits: BudgetLimits;
  private spentToday: number = 0;
  private lastResetDate: string;
  private paymentHistory: Map<string, number[]> = new Map(); // userId -> amounts[]

  constructor(budgetLimits: BudgetLimits) {
    this.budgetLimits = budgetLimits;
    this.lastResetDate = this.getCurrentDate();
  }

  /**
   * Main decision method: Should we pay for premium data?
   */
  async shouldPayForData(
    userQuery: string,
    context: UserContext,
    availableDataSources: PremiumDataSource[]
  ): Promise<PaymentDecision> {
    // Reset daily spending if new day
    this.resetDailySpendingIfNeeded();

    // Analyze the query
    const queryAnalysis = this.analyzeQuery(userQuery);

    // Assess data gaps
    const dataGapSeverity = this.assessDataGaps(queryAnalysis);

    // Get user trust level
    const userTrustLevel = await this.getUserTrustLevel(context);

    // Estimate potential value
    const potentialValue = this.estimateResponseValue(userQuery, queryAnalysis);

    // Calculate cost-benefit for each data source
    const costBenefitRatios = availableDataSources.map(source => ({
      source,
      ratio: this.calculateCostBenefit(source, queryAnalysis, potentialValue)
    }));

    // Sort by cost-benefit ratio (best first)
    costBenefitRatios.sort((a, b) => b.ratio - a.ratio);

    // Build decision factors
    const factors: DecisionFactors = {
      queryComplexity: queryAnalysis.complexity,
      dataGapSeverity,
      userTrustLevel,
      potentialValue,
      costBenefitRatio: costBenefitRatios.length > 0 ? costBenefitRatios[0].ratio : 0
    };

    // Make payment decision
    return this.makePaymentDecision(factors, costBenefitRatios, context);
  }

  /**
   * Analyze query to determine complexity and data needs
   */
  analyzeQuery(query: string): QueryAnalysis {
    const lowerQuery = query.toLowerCase();
    
    // Complexity indicators
    const complexityKeywords = [
      'analyze', 'compare', 'evaluate', 'recommend', 'investment', 'strategy',
      'forecast', 'prediction', 'trend', 'market analysis', 'competitive'
    ];
    const complexityScore = complexityKeywords.filter(kw => lowerQuery.includes(kw)).length / complexityKeywords.length;

    // Data type requirements
    const requiresSpecializedData = /specialized|expert|professional|industry|sector/.test(lowerQuery);
    const requiresRealtimeData = /real.?time|current|live|now|today|latest/.test(lowerQuery);
    const requiresFinancialData = /stock|price|market|investment|financial|trading|portfolio/.test(lowerQuery);
    const requiresIndustryData = /industry|sector|market|competitive|benchmark/.test(lowerQuery);

    // Identify data gaps
    const dataGaps: string[] = [];
    if (requiresRealtimeData) dataGaps.push('Missing real-time data');
    if (requiresFinancialData) dataGaps.push('Missing financial market data');
    if (requiresIndustryData) dataGaps.push('Missing industry-specific data');
    if (requiresSpecializedData) dataGaps.push('Missing specialized knowledge');

    return {
      complexity: Math.min(1, complexityScore + (requiresSpecializedData ? 0.3 : 0) + (requiresRealtimeData ? 0.2 : 0)),
      requiresSpecializedData,
      requiresRealtimeData,
      requiresFinancialData,
      requiresIndustryData,
      dataGaps
    };
  }

  /**
   * Assess severity of data gaps
   */
  private assessDataGaps(analysis: QueryAnalysis): number {
    if (analysis.dataGaps.length === 0) return 0;

    // More gaps = higher severity
    let severity = analysis.dataGaps.length * 0.2;

    // Real-time data gaps are more critical
    if (analysis.requiresRealtimeData) severity += 0.3;

    // Financial data gaps are critical for investment queries
    if (analysis.requiresFinancialData) severity += 0.3;

    return Math.min(1, severity);
  }

  /**
   * Get user trust level (0-1)
   */
  private async getUserTrustLevel(context: UserContext): Promise<number> {
    // Use reputation score if available
    if (context.reputationScore !== undefined) {
      return Math.min(1, context.reputationScore / 1000); // Normalize to 0-1
    }

    // Use explicit trust level if provided
    if (context.trustLevel !== undefined) {
      return context.trustLevel;
    }

    // Default: moderate trust for unknown users
    return 0.5;
  }

  /**
   * Estimate potential value of the response
   */
  private estimateResponseValue(query: string, analysis: QueryAnalysis): number {
    // High complexity queries have higher value
    let value = analysis.complexity * 0.4;

    // Investment/financial queries are high value
    if (analysis.requiresFinancialData) value += 0.3;

    // Real-time data queries are high value
    if (analysis.requiresRealtimeData) value += 0.2;

    // Specialized knowledge queries are high value
    if (analysis.requiresSpecializedData) value += 0.1;

    return Math.min(1, value);
  }

  /**
   * Calculate cost-benefit ratio for a data source
   */
  private calculateCostBenefit(
    source: PremiumDataSource,
    analysis: QueryAnalysis,
    potentialValue: number
  ): number {
    // Base value from source
    const sourceValue = source.expectedValue;

    // Match data type to query needs
    let matchScore = 0.5; // Default match
    if (source.dataType) {
      if (analysis.requiresFinancialData && source.dataType.includes('financial')) matchScore = 1.0;
      if (analysis.requiresRealtimeData && source.dataType.includes('realtime')) matchScore = 1.0;
      if (analysis.requiresIndustryData && source.dataType.includes('industry')) matchScore = 1.0;
    }

    // Combined value
    const totalValue = (potentialValue * 0.6) + (sourceValue * 0.4) * matchScore;

    // Cost-benefit ratio = value / cost
    // Higher ratio = better investment
    return source.cost > 0 ? totalValue / source.cost : 0;
  }

  /**
   * Make final payment decision based on factors
   */
  private makePaymentDecision(
    factors: DecisionFactors,
    costBenefitRatios: Array<{ source: PremiumDataSource; ratio: number }>,
    context: UserContext
  ): PaymentDecision {
    // Decision matrix
    const highPriority = factors.queryComplexity > 0.8 && factors.dataGapSeverity > 0.7;
    const mediumPriority = factors.potentialValue > factors.costBenefitRatio && factors.costBenefitRatio > 0;
    const withinBudget = this.spentToday + (costBenefitRatios[0]?.source.cost || 0) <= this.budgetLimits.daily;
    const withinPerQueryBudget = (costBenefitRatios[0]?.source.cost || 0) <= this.budgetLimits.perQuery;
    const trustedUser = factors.userTrustLevel > 0.6;

    // Decision logic
    if (highPriority || (mediumPriority && withinBudget && withinPerQueryBudget && trustedUser)) {
      // Find best sources within budget
      const recommendedSources = costBenefitRatios
        .filter(cb => cb.source.cost <= this.budgetLimits.perQuery)
        .filter(cb => this.spentToday + cb.source.cost <= this.budgetLimits.daily)
        .slice(0, 3) // Max 3 sources
        .map(cb => cb.source);

      const totalCost = recommendedSources.reduce((sum, s) => sum + s.cost, 0);
      const maxAmount = Math.min(totalCost, this.budgetLimits.perQuery, this.budgetLimits.daily - this.spentToday);

      return {
        shouldPay: true,
        maxAmount,
        rationale: this.generateDecisionRationale(highPriority, mediumPriority, factors, recommendedSources),
        factors,
        recommendedSources
      };
    }

    return {
      shouldPay: false,
      rationale: this.generateRejectionRationale(factors, withinBudget, trustedUser),
      factors
    };
  }

  /**
   * Generate human-readable decision rationale
   */
  private generateDecisionRationale(
    highPriority: boolean,
    mediumPriority: boolean,
    factors: DecisionFactors,
    sources: PremiumDataSource[]
  ): string {
    if (highPriority) {
      return `High-priority query (complexity: ${(factors.queryComplexity * 100).toFixed(0)}%, data gaps: ${(factors.dataGapSeverity * 100).toFixed(0)}%) - justified payment for premium data`;
    }

    if (mediumPriority) {
      return `Medium-priority query with good cost-benefit ratio (${factors.costBenefitRatio.toFixed(2)}) - paying for ${sources.length} premium data source(s)`;
    }

    return `Payment approved based on query value and user trust level`;
  }

  /**
   * Generate rejection rationale
   */
  private generateRejectionRationale(
    factors: DecisionFactors,
    withinBudget: boolean,
    trustedUser: boolean
  ): string {
    if (!withinBudget) {
      return `Daily budget limit reached ($${this.spentToday.toFixed(2)} / $${this.budgetLimits.daily})`;
    }

    if (!trustedUser) {
      return `User trust level too low (${(factors.userTrustLevel * 100).toFixed(0)}%) - not investing budget`;
    }

    if (factors.costBenefitRatio <= 0) {
      return `Cost-benefit analysis doesn't justify payment (ratio: ${factors.costBenefitRatio.toFixed(2)})`;
    }

    return `Free data sources sufficient for this query`;
  }

  /**
   * Record a payment to track spending
   */
  recordPayment(amount: number, userId: string, resource: string): void {
    this.spentToday += amount;

    // Track per-user spending
    if (!this.paymentHistory.has(userId)) {
      this.paymentHistory.set(userId, []);
    }
    this.paymentHistory.get(userId)!.push(amount);

    // Reset if too many entries (keep last 100)
    const userPayments = this.paymentHistory.get(userId)!;
    if (userPayments.length > 100) {
      this.paymentHistory.set(userId, userPayments.slice(-100));
    }
  }

  /**
   * Get remaining budget
   */
  getRemainingBudget(): { daily: number; perQuery: number } {
    return {
      daily: Math.max(0, this.budgetLimits.daily - this.spentToday),
      perQuery: this.budgetLimits.perQuery
    };
  }

  /**
   * Reset daily spending if new day
   */
  private resetDailySpendingIfNeeded(): void {
    const currentDate = this.getCurrentDate();
    if (currentDate !== this.lastResetDate) {
      this.spentToday = 0;
      this.lastResetDate = currentDate;
    }
  }

  /**
   * Get current date string (YYYY-MM-DD)
   */
  private getCurrentDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Identify premium data sources based on query analysis
   */
  identifyPremiumSources(analysis: QueryAnalysis): PremiumDataSource[] {
    const sources: PremiumDataSource[] = [];

    // Real-time financial data
    if (analysis.requiresFinancialData && analysis.requiresRealtimeData) {
      sources.push({
        name: 'Realtime Stock API',
        url: 'https://api.premium-finance.com/realtime-prices',
        cost: 0.25,
        description: 'Real-time stock prices and volume data',
        expectedValue: 0.8,
        dataType: 'financial-realtime',
        provider: 'Premium Finance API'
      });
    }

    // Industry analysis
    if (analysis.requiresIndustryData) {
      sources.push({
        name: 'Industry Insights API',
        url: 'https://api.trusted-data.com/industry-analysis',
        cost: 1.50,
        description: 'Professional industry reports and analysis',
        expectedValue: 0.9,
        dataType: 'industry-analysis',
        provider: 'Trusted Data API'
      });
    }

    // Specialized knowledge
    if (analysis.requiresSpecializedData) {
      sources.push({
        name: 'Expert Knowledge Base',
        url: 'https://api.expert-knowledge.com/query',
        cost: 0.75,
        description: 'Access to specialized expert knowledge',
        expectedValue: 0.85,
        dataType: 'specialized-knowledge',
        provider: 'Expert Knowledge API'
      });
    }

    // Market sentiment
    if (analysis.requiresFinancialData) {
      sources.push({
        name: 'Sentiment Analysis Pro',
        url: 'https://api.sentiment-pro.com/analyze',
        cost: 0.50,
        description: 'Advanced market sentiment analysis',
        expectedValue: 0.7,
        dataType: 'sentiment-analysis',
        provider: 'Sentiment Pro API'
      });
    }

    return sources;
  }
}

