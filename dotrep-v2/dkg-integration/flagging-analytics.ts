/**
 * Flagging Analytics & Monitoring
 * 
 * Real-time analytics and monitoring for user-flagging relationships
 */

import { getUserFlaggingService, UserFlaggingService, FlaggingInsights } from './user-flagging-service';
import { DKGClientV8, DKGConfig } from './dkg-client-v8';

export interface FlaggingDashboard {
  insights: FlaggingInsights;
  trends: {
    flagsOverTime: Array<{ timestamp: number; count: number }>;
    coordinationAlertsOverTime: Array<{ timestamp: number; count: number }>;
    resolutionRateOverTime: Array<{ timestamp: number; rate: number }>;
  };
  alerts: Array<{
    id: string;
    type: 'coordination' | 'spam' | 'critical' | 'suspicious_reporter';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: number;
    targetUser?: string;
    recommendedAction: string;
  }>;
}

/**
 * Flagging Analytics Service
 */
export class FlaggingAnalytics {
  private flaggingService: UserFlaggingService;

  constructor(flaggingService?: UserFlaggingService, dkgClient?: DKGClientV8, dkgConfig?: DKGConfig) {
    this.flaggingService = flaggingService || getUserFlaggingService(dkgClient, dkgConfig);
  }

  /**
   * Generate comprehensive flagging insights
   */
  async generateFlaggingInsights(timeWindowHours: number = 24): Promise<FlaggingInsights> {
    return await this.flaggingService.generateFlaggingInsights(timeWindowHours);
  }

  /**
   * Generate real-time dashboard data
   */
  async generateDashboard(timeWindowHours: number = 24): Promise<FlaggingDashboard> {
    const insights = await this.generateFlaggingInsights(timeWindowHours);

    // Generate trends (simplified - would use time-series data in production)
    const trends = this.generateTrends(timeWindowHours);

    // Generate alerts from insights
    const alerts = this.generateAlerts(insights);

    return {
      insights,
      trends,
      alerts,
    };
  }

  /**
   * Generate trends over time
   */
  private generateTrends(timeWindowHours: number): FlaggingDashboard['trends'] {
    // Simplified trend generation - in production would query historical data
    const now = Date.now();
    const intervalHours = Math.max(1, Math.floor(timeWindowHours / 10));
    const intervals: Array<{ timestamp: number; count: number }> = [];

    for (let i = 0; i < 10; i++) {
      const timestamp = now - (10 - i) * intervalHours * 60 * 60 * 1000;
      // Mock data - would query actual flags in production
      intervals.push({
        timestamp,
        count: Math.floor(Math.random() * 20),
      });
    }

    return {
      flagsOverTime: intervals,
      coordinationAlertsOverTime: intervals.map(i => ({
        ...i,
        count: Math.floor(i.count * 0.1),
      })),
      resolutionRateOverTime: intervals.map(i => ({
        timestamp: i.timestamp,
        rate: 0.5 + Math.random() * 0.3, // Mock resolution rate
      })),
    };
  }

  /**
   * Generate alerts from insights
   */
  private generateAlerts(insights: FlaggingInsights): FlaggingDashboard['alerts'] {
    const alerts: FlaggingDashboard['alerts'] = [];

    // Coordination alerts
    insights.coordinationAlerts.forEach((alert, index) => {
      alerts.push({
        id: `coordination_${index}`,
        type: 'coordination',
        severity: alert.riskLevel === 'critical' ? 'critical' :
                 alert.riskLevel === 'high' ? 'high' : 'medium',
        message: `Coordinated flagging detected: ${alert.flagCount} flags from ${alert.patternType} pattern`,
        timestamp: Date.now(),
        targetUser: alert.targetUser,
        recommendedAction: alert.recommendedAction,
      });
    });

    // Critical flags
    insights.topFlaggedUsers
      .filter(user => user.riskLevel === 'critical')
      .forEach((user, index) => {
        alerts.push({
          id: `critical_${index}`,
          type: 'critical',
          severity: 'critical',
          message: `Critical risk user: ${user.flagCount} flags with ${(user.averageConfidence * 100).toFixed(1)}% avg confidence`,
          timestamp: Date.now(),
          targetUser: user.userDid,
          recommendedAction: 'immediate_review',
        });
      });

    // Suspicious reporters
    insights.reporterAnalysis.suspiciousReporters
      .filter(reporter => reporter.coordinationScore > 0.7)
      .forEach((reporter, index) => {
        alerts.push({
          id: `suspicious_reporter_${index}`,
          type: 'suspicious_reporter',
          severity: reporter.lowReputation ? 'high' : 'medium',
          message: `Suspicious reporter: ${reporter.flagCount} flags with ${(reporter.coordinationScore * 100).toFixed(1)}% coordination score`,
          timestamp: Date.now(),
          recommendedAction: 'review_reporter_behavior',
        });
      });

    return alerts.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Get flagging statistics for a specific user
   */
  async getUserFlaggingStats(userDid: string, timeWindowHours: number = 24): Promise<{
    totalFlags: number;
    averageConfidence: number;
    coordinationScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    recentFlags: Array<{
      flagType: string;
      confidence: number;
      timestamp: number;
      status: string;
    }>;
  }> {
    const analysis = await this.flaggingService.analyzeFlaggingPatterns(userDid, timeWindowHours);
    const recentFlags = await this.flaggingService.getRecentFlags(userDid, timeWindowHours);

    return {
      totalFlags: analysis.flaggingMetrics.totalFlags,
      averageConfidence: analysis.flaggingMetrics.averageConfidence,
      coordinationScore: analysis.coordinationSignals.overallCoordinationScore,
      riskLevel: this.determineRiskLevel(analysis),
      recentFlags: recentFlags.map(flag => ({
        flagType: flag.flagType,
        confidence: flag.confidence,
        timestamp: flag.timestamp,
        status: flag.status,
      })),
    };
  }

  /**
   * Determine risk level from analysis
   */
  private determineRiskLevel(analysis: any): 'low' | 'medium' | 'high' | 'critical' {
    const overallRisk = analysis.riskAssessment?.overallRisk || 0;
    const coordinationScore = analysis.coordinationSignals?.overallCoordinationScore || 0;

    // High coordination reduces risk (likely attack)
    const adjustedRisk = overallRisk * (1 - coordinationScore * 0.5);

    if (adjustedRisk >= 0.8) return 'critical';
    if (adjustedRisk >= 0.6) return 'high';
    if (adjustedRisk >= 0.4) return 'medium';
    return 'low';
  }

  /**
   * Monitor flagging patterns and generate alerts
   */
  async monitorFlaggingPatterns(
    checkIntervalMinutes: number = 60
  ): Promise<{
    newAlerts: FlaggingDashboard['alerts'];
    summary: {
      totalFlags: number;
      newCoordinationAlerts: number;
      criticalFlags: number;
    };
  }> {
    const insights = await this.generateFlaggingInsights(24);
    const dashboard = await this.generateDashboard(24);

    return {
      newAlerts: dashboard.alerts,
      summary: {
        totalFlags: insights.summaryMetrics.totalFlags,
        newCoordinationAlerts: insights.coordinationAlerts.length,
        criticalFlags: insights.topFlaggedUsers.filter(u => u.riskLevel === 'critical').length,
      },
    };
  }
}

// Singleton instance
let flaggingAnalyticsInstance: FlaggingAnalytics | null = null;

export function getFlaggingAnalytics(
  flaggingService?: UserFlaggingService,
  dkgClient?: DKGClientV8,
  dkgConfig?: DKGConfig
): FlaggingAnalytics {
  if (!flaggingAnalyticsInstance) {
    flaggingAnalyticsInstance = new FlaggingAnalytics(flaggingService, dkgClient, dkgConfig);
  }
  return flaggingAnalyticsInstance;
}

