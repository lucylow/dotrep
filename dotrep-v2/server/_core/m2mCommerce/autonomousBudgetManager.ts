/**
 * Autonomous Budget Manager
 * 
 * Manages spending limits and tracks payments for autonomous agents.
 * Provides budget constraints and spending analytics.
 */

export interface BudgetConfig {
  dailyBudget: number; // USD per day
  perQueryBudget: number; // USD per query
  monthlyBudget?: number; // USD per month (optional)
  resetTime?: string; // Time of day to reset (HH:MM format, default: 00:00)
}

export interface SpendingRecord {
  amount: number;
  timestamp: number;
  resource: string;
  userId: string;
  rationale: string;
  txHash?: string;
}

export interface BudgetStatus {
  daily: {
    spent: number;
    limit: number;
    remaining: number;
  };
  monthly?: {
    spent: number;
    limit: number;
    remaining: number;
  };
  perQuery: {
    limit: number;
  };
  canSpend: (amount: number) => boolean;
}

export class AutonomousBudgetManager {
  private config: Required<BudgetConfig>;
  private spending: {
    today: SpendingRecord[];
    thisMonth: SpendingRecord[];
    lastReset: Date;
  };

  constructor(config: BudgetConfig) {
    this.config = {
      dailyBudget: config.dailyBudget,
      perQueryBudget: config.perQueryBudget,
      monthlyBudget: config.monthlyBudget || Infinity,
      resetTime: config.resetTime || '00:00'
    };

    this.spending = {
      today: [],
      thisMonth: [],
      lastReset: new Date()
    };
  }

  /**
   * Check if agent can spend a given amount
   */
  canSpend(amount: number, context?: { userId?: string }): {
    allowed: boolean;
    constraints: {
      daily: boolean;
      monthly: boolean;
      perQuery: boolean;
      valueJustified: boolean;
    };
    remaining: {
      daily: number;
      monthly: number;
    };
  } {
    this.resetIfNeeded();

    const constraints = {
      daily: this.getSpentToday() + amount <= this.config.dailyBudget,
      monthly: this.getSpentThisMonth() + amount <= this.config.monthlyBudget,
      perQuery: amount <= this.config.perQueryBudget,
      valueJustified: true // Can be enhanced with value analysis
    };

    return {
      allowed: Object.values(constraints).every(Boolean),
      constraints,
      remaining: {
        daily: Math.max(0, this.config.dailyBudget - this.getSpentToday()),
        monthly: Math.max(0, this.config.monthlyBudget - this.getSpentThisMonth())
      }
    };
  }

  /**
   * Record a spending transaction
   */
  recordSpending(
    amount: number,
    resource: string,
    userId: string,
    rationale: string,
    txHash?: string
  ): void {
    this.resetIfNeeded();

    const record: SpendingRecord = {
      amount,
      timestamp: Date.now(),
      resource,
      userId,
      rationale,
      txHash
    };

    this.spending.today.push(record);
    this.spending.thisMonth.push(record);
  }

  /**
   * Get current budget status
   */
  getBudgetStatus(): BudgetStatus {
    this.resetIfNeeded();

    const spentToday = this.getSpentToday();
    const spentThisMonth = this.getSpentThisMonth();

    return {
      daily: {
        spent: spentToday,
        limit: this.config.dailyBudget,
        remaining: Math.max(0, this.config.dailyBudget - spentToday)
      },
      monthly: this.config.monthlyBudget < Infinity ? {
        spent: spentThisMonth,
        limit: this.config.monthlyBudget,
        remaining: Math.max(0, this.config.monthlyBudget - spentThisMonth)
      } : undefined,
      perQuery: {
        limit: this.config.perQueryBudget
      },
      canSpend: (amount: number) => this.canSpend(amount).allowed
    };
  }

  /**
   * Get spending history
   */
  getSpendingHistory(options?: {
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): SpendingRecord[] {
    this.resetIfNeeded();

    let records = [...this.spending.thisMonth];

    // Filter by user
    if (options?.userId) {
      records = records.filter(r => r.userId === options.userId);
    }

    // Filter by date range
    if (options?.startDate) {
      records = records.filter(r => r.timestamp >= options.startDate!.getTime());
    }
    if (options?.endDate) {
      records = records.filter(r => r.timestamp <= options.endDate!.getTime());
    }

    // Sort by timestamp (newest first)
    records.sort((a, b) => b.timestamp - a.timestamp);

    // Limit results
    if (options?.limit) {
      records = records.slice(0, options.limit);
    }

    return records;
  }

  /**
   * Get total spent today
   */
  getSpentToday(): number {
    return this.spending.today.reduce((sum, r) => sum + r.amount, 0);
  }

  /**
   * Get total spent this month
   */
  getSpentThisMonth(): number {
    return this.spending.thisMonth.reduce((sum, r) => sum + r.amount, 0);
  }

  /**
   * Reset daily spending if needed
   */
  private resetIfNeeded(): void {
    const now = new Date();
    const lastReset = this.spending.lastReset;

    // Check if new day
    const isNewDay = now.toDateString() !== lastReset.toDateString();

    // Check if reset time has passed
    const [resetHour, resetMinute] = this.config.resetTime.split(':').map(Number);
    const resetTime = new Date(now);
    resetTime.setHours(resetHour, resetMinute, 0, 0);
    const isAfterResetTime = now >= resetTime && lastReset < resetTime;

    if (isNewDay || isAfterResetTime) {
      this.spending.today = [];
      this.spending.lastReset = now;
    }

    // Reset monthly spending if new month
    if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
      this.spending.thisMonth = [];
    }
  }

  /**
   * Export spending data for DKG (for transparency)
   */
  exportSpendingForDKG(): {
    dailySpending: number;
    monthlySpending: number;
    transactionCount: number;
    transactions: Array<{
      amount: number;
      timestamp: number;
      resource: string;
      userId: string;
      rationale: string;
      txHash?: string;
    }>;
    budgetLimits: {
      daily: number;
      perQuery: number;
      monthly: number;
    };
  } {
    this.resetIfNeeded();

    return {
      dailySpending: this.getSpentToday(),
      monthlySpending: this.getSpentThisMonth(),
      transactionCount: this.spending.thisMonth.length,
      transactions: this.spending.thisMonth.map(r => ({
        amount: r.amount,
        timestamp: r.timestamp,
        resource: r.resource,
        userId: r.userId,
        rationale: r.rationale,
        txHash: r.txHash
      })),
      budgetLimits: {
        daily: this.config.dailyBudget,
        perQuery: this.config.perQueryBudget,
        monthly: this.config.monthlyBudget
      }
    };
  }
}

