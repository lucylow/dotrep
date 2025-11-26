/**
 * x402 Payment Handler for Trust Layer
 * Multi-stage payment flows with conditional releases and escrow
 */

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  DISPUTED = 'DISPUTED'
}

export interface MicroPayment {
  id: string;
  from: string; // Brand/influencer DID
  to: string; // Recipient DID
  amount: number; // Amount in USDC (6 decimals)
  resourceHash: string; // Hash of the resource being paid for
  timestamp: number;
  status: PaymentStatus;
  conditions?: PaymentConditions;
  metadata?: Record<string, unknown>;
}

export interface PaymentConditions {
  maxResults?: number;
  qualityThreshold?: number;
  expiry?: number; // Unix timestamp
  verification?: string;
  releaseConditions?: string;
  disputePeriod?: number; // Days
  performanceThreshold?: number;
}

export interface PaymentRequest {
  from: string;
  to: string;
  amount: number;
  resource: string;
  conditions?: PaymentConditions;
}

export interface PaymentFlow {
  id: string;
  stage: 'discovery' | 'verification' | 'participation' | 'success' | 'dispute';
  brand: string;
  campaignUAL?: string;
  totalBudget: number;
  allocatedPayments: Map<string, number>;
  completedPayments: Set<string>;
  payments: MicroPayment[];
  createdAt: number;
  updatedAt: number;
}

export class X402PaymentHandler {
  private payments: Map<string, MicroPayment> = new Map();
  private userBalances: Map<string, number> = new Map();
  private paymentFlows: Map<string, PaymentFlow> = new Map();

  // Payment thresholds and fees (in USDC, 6 decimals)
  private readonly discoveryFee = 5 * 10 ** 6; // $5 USDC
  private readonly verificationFee = 10 * 10 ** 6; // $10 USDC
  private readonly successFeePercentage = 500; // 5% of deal value

  // Verification costs
  private readonly verificationCosts = {
    identity_verification: 10 * 10 ** 6,      // $10
    sybil_analysis: 25 * 10 ** 6,              // $25
    reputation_audit: 15 * 10 ** 6,            // $15
    cross_platform_check: 20 * 10 ** 6        // $20
  };

  /**
   * Create a payment request
   */
  async createPaymentRequest(request: PaymentRequest): Promise<MicroPayment> {
    const paymentId = this.generatePaymentId(request.from, request.to, request.resource);
    
    const payment: MicroPayment = {
      id: paymentId,
      from: request.from,
      to: request.to,
      amount: request.amount,
      resourceHash: this.hashResource(request.resource),
      timestamp: Date.now(),
      status: PaymentStatus.PENDING,
      conditions: request.conditions,
      metadata: {
        resource: request.resource,
        createdAt: new Date().toISOString()
      }
    };

    this.payments.set(paymentId, payment);
    return payment;
  }

  /**
   * Initiate discovery phase payment
   */
  async initiateDiscoveryPayment(brandDID: string, campaignBudget: number): Promise<PaymentFlow> {
    const flowId = `flow_${brandDID}_${Date.now()}`;
    
    // Reserve 5% of budget for discovery
    const discoveryBudget = campaignBudget * 0.05;
    
    const paymentRequest: PaymentRequest = {
      from: brandDID,
      to: 'platform_treasury',
      amount: discoveryBudget,
      resource: `discovery_access_${Date.now()}`,
      conditions: {
        maxResults: 50,
        qualityThreshold: 0.7,
        expiry: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
      }
    };

    const payment = await this.createPaymentRequest(paymentRequest);
    
    const flow: PaymentFlow = {
      id: flowId,
      stage: 'discovery',
      brand: brandDID,
      totalBudget: campaignBudget,
      allocatedPayments: new Map([['discovery', discoveryBudget]]),
      completedPayments: new Set(),
      payments: [payment],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.paymentFlows.set(flowId, flow);
    return flow;
  }

  /**
   * Initiate verification phase payment
   */
  async initiateVerificationPayment(
    influencerDID: string,
    verificationType: keyof typeof X402PaymentHandler.prototype.verificationCosts
  ): Promise<MicroPayment> {
    const cost = this.verificationCosts[verificationType];
    
    const paymentRequest: PaymentRequest = {
      from: influencerDID,
      to: 'verification_service',
      amount: cost,
      resource: `${verificationType}_${influencerDID}`,
      conditions: {
        verification_depth: 'comprehensive',
        turnaround_time: '2_hours',
        accuracy_guarantee: 0.95
      }
    };

    return await this.createPaymentRequest(paymentRequest);
  }

  /**
   * Release success-based payment
   */
  async releaseSuccessPayment(
    campaignUAL: string,
    influencerDID: string,
    performanceMetrics: {
      engagementRate?: number;
      conversions?: number;
      qualityRating?: number;
    },
    baseCompensation: number
  ): Promise<MicroPayment> {
    const bonuses = this.calculatePerformanceBonuses(performanceMetrics, baseCompensation);
    const totalPayment = baseCompensation + bonuses;

    const paymentRequest: PaymentRequest = {
      from: campaignUAL, // Campaign creator
      to: influencerDID,
      amount: totalPayment,
      resource: `campaign_success_${campaignUAL}`,
      conditions: {
        verification: 'performance_verified',
        release_conditions: 'automatic',
        dispute_period: 7 // days
      }
    };

    const payment = await this.createPaymentRequest(paymentRequest);
    
    // Mark as completed automatically (in production, would verify performance first)
    payment.status = PaymentStatus.COMPLETED;
    this.payments.set(payment.id, payment);

    return payment;
  }

  /**
   * Handle dispute resolution payment
   */
  async handleDisputePayment(
    disputeId: string,
    arbitratorDID: string,
    resolutionFee: number
  ): Promise<MicroPayment> {
    const paymentRequest: PaymentRequest = {
      from: 'dispute_escrow',
      to: arbitratorDID,
      amount: resolutionFee,
      resource: `dispute_resolution_${disputeId}`,
      conditions: {
        resolution_deadline: '48_hours',
        fairness_metrics: 'transparent',
        appeal_process: 'available'
      }
    };

    return await this.createPaymentRequest(paymentRequest);
  }

  /**
   * Complete a payment
   */
  async completePayment(paymentId: string, verificationProof?: string): Promise<boolean> {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new Error(`Payment is not pending. Current status: ${payment.status}`);
    }

    // Verify conditions if provided
    if (payment.conditions) {
      if (payment.conditions.expiry && Date.now() > payment.conditions.expiry) {
        payment.status = PaymentStatus.FAILED;
        this.payments.set(paymentId, payment);
        return false;
      }
    }

    payment.status = PaymentStatus.COMPLETED;
    if (verificationProof) {
      payment.metadata = {
        ...payment.metadata,
        verificationProof
      };
    }
    
    this.payments.set(paymentId, payment);
    
    // Update user balance
    const currentBalance = this.userBalances.get(payment.to) || 0;
    this.userBalances.set(payment.to, currentBalance + payment.amount);

    return true;
  }

  /**
   * Refund a payment
   */
  async refundPayment(paymentId: string, reason?: string): Promise<boolean> {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      // Deduct from recipient balance
      const currentBalance = this.userBalances.get(payment.to) || 0;
      this.userBalances.set(payment.to, Math.max(0, currentBalance - payment.amount));
    }

    payment.status = PaymentStatus.REFUNDED;
    if (reason) {
      payment.metadata = {
        ...payment.metadata,
        refundReason: reason
      };
    }
    
    this.payments.set(paymentId, payment);
    return true;
  }

  /**
   * Get payment by ID
   */
  getPayment(paymentId: string): MicroPayment | null {
    return this.payments.get(paymentId) || null;
  }

  /**
   * Get user balance
   */
  getUserBalance(userDID: string): number {
    return this.userBalances.get(userDID) || 0;
  }

  /**
   * Get payment flow
   */
  getPaymentFlow(flowId: string): PaymentFlow | null {
    return this.paymentFlows.get(flowId) || null;
  }

  /**
   * Calculate performance bonuses
   */
  private calculatePerformanceBonuses(
    metrics: {
      engagementRate?: number;
      conversions?: number;
      qualityRating?: number;
    },
    baseCompensation: number
  ): number {
    let totalBonus = 0;

    // Engagement bonus: 50 USDC if engagement rate >= 5%
    if (metrics.engagementRate && metrics.engagementRate >= 0.05) {
      totalBonus += 50 * 10 ** 6; // $50 USDC
    }

    // Conversion bonus: 100 USDC if conversions >= 100
    if (metrics.conversions && metrics.conversions >= 100) {
      totalBonus += 100 * 10 ** 6; // $100 USDC
    }

    // Quality bonus: 75 USDC if quality rating >= 4.5
    if (metrics.qualityRating && metrics.qualityRating >= 4.5) {
      totalBonus += 75 * 10 ** 6; // $75 USDC
    }

    return totalBonus;
  }

  /**
   * Generate unique payment ID
   */
  private generatePaymentId(from: string, to: string, resource: string): string {
    const timestamp = Date.now();
    const data = `${from}_${to}_${resource}_${timestamp}`;
    // In production, use proper hash function
    return `pay_${Buffer.from(data).toString('base64').slice(0, 32)}`;
  }

  /**
   * Hash resource string
   */
  private hashResource(resource: string): string {
    // In production, use proper hash function (e.g., SHA-256)
    return Buffer.from(resource).toString('base64').slice(0, 32);
  }

  /**
   * Get payment history for a user
   */
  getPaymentHistory(userDID: string, limit: number = 100): MicroPayment[] {
    const userPayments: MicroPayment[] = [];
    
    for (const payment of this.payments.values()) {
      if (payment.from === userDID || payment.to === userDID) {
        userPayments.push(payment);
      }
    }

    // Sort by timestamp descending
    userPayments.sort((a, b) => b.timestamp - a.timestamp);
    
    return userPayments.slice(0, limit);
  }

  /**
   * Get payment statistics for a user
   */
  getPaymentStatistics(userDID: string): {
    totalTransactions: number;
    successRate: number;
    averageAmount: number;
    disputeRate: number;
    totalReceived: number;
    totalSent: number;
  } {
    const payments = this.getPaymentHistory(userDID, 1000);
    const received = payments.filter(p => p.to === userDID);
    const sent = payments.filter(p => p.from === userDID);
    const completed = payments.filter(p => p.status === PaymentStatus.COMPLETED);
    const disputed = payments.filter(p => p.status === PaymentStatus.DISPUTED);

    const totalReceived = received
      .filter(p => p.status === PaymentStatus.COMPLETED)
      .reduce((sum, p) => sum + p.amount, 0);
    
    const totalSent = sent
      .filter(p => p.status === PaymentStatus.COMPLETED)
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      totalTransactions: payments.length,
      successRate: payments.length > 0 ? completed.length / payments.length : 0,
      averageAmount: payments.length > 0
        ? payments.reduce((sum, p) => sum + p.amount, 0) / payments.length
        : 0,
      disputeRate: payments.length > 0 ? disputed.length / payments.length : 0,
      totalReceived,
      totalSent
    };
  }
}

// Singleton instance
let paymentHandlerInstance: X402PaymentHandler | null = null;

export function getX402PaymentHandler(): X402PaymentHandler {
  if (!paymentHandlerInstance) {
    paymentHandlerInstance = new X402PaymentHandler();
  }
  return paymentHandlerInstance;
}

