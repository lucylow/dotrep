/**
 * Session-Based Billing for x402 Payments
 * 
 * Enables deferred billing where multiple API calls within a session
 * are aggregated and billed at the end or at intervals.
 * 
 * Use cases:
 * - Multiple API calls in a single session
 * - Streaming data access
 * - Time-based access (e.g., 1 hour of API access)
 * - Usage-based billing with periodic settlement
 */

const crypto = require('crypto');

/**
 * Session Billing Configuration
 */
class SessionBillingConfig {
  constructor(options = {}) {
    this.sessionTimeout = options.sessionTimeout || 60 * 60 * 1000; // 1 hour default
    this.maxCallsPerSession = options.maxCallsPerSession || 100;
    this.billingInterval = options.billingInterval || null; // null = bill at end, or milliseconds
    this.minBillingAmount = options.minBillingAmount || '0.01'; // Minimum amount to bill
    this.currency = options.currency || 'USDC';
  }
}

/**
 * Session Billing Manager
 */
class SessionBillingManager {
  constructor(config = {}) {
    this.config = new SessionBillingConfig(config);
    this.sessions = new Map(); // sessionId -> session data
    this.pendingBills = new Map(); // sessionId -> pending bill
  }

  /**
   * Create a new billing session
   */
  createSession(payerAddress, options = {}) {
    const sessionId = `session-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    const expiresAt = Date.now() + (options.timeout || this.config.sessionTimeout);

    const session = {
      sessionId,
      payerAddress,
      createdAt: Date.now(),
      expiresAt,
      callCount: 0,
      totalAmount: '0',
      currency: options.currency || this.config.currency,
      calls: [],
      status: 'active',
      metadata: options.metadata || {}
    };

    this.sessions.set(sessionId, session);

    // Set up automatic billing if interval is configured
    if (this.config.billingInterval) {
      this.scheduleBilling(sessionId);
    }

    return session;
  }

  /**
   * Record an API call in a session
   */
  recordCall(sessionId, callData) {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (Date.now() > session.expiresAt) {
      session.status = 'expired';
      throw new Error(`Session expired: ${sessionId}`);
    }

    if (session.status !== 'active') {
      throw new Error(`Session not active: ${session.status}`);
    }

    if (session.callCount >= this.config.maxCallsPerSession) {
      throw new Error(`Session call limit reached: ${this.config.maxCallsPerSession}`);
    }

    const call = {
      callId: `call-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      timestamp: Date.now(),
      amount: callData.amount || '0',
      endpoint: callData.endpoint,
      metadata: callData.metadata || {}
    };

    session.calls.push(call);
    session.callCount++;
    session.totalAmount = this.addAmounts(session.totalAmount, call.amount);

    // Check if we should bill now (if billing interval is set)
    if (this.config.billingInterval) {
      const lastBilledAt = session.lastBilledAt || session.createdAt;
      if (Date.now() - lastBilledAt >= this.config.billingInterval) {
        this.billSession(sessionId, false); // Bill but don't close session
      }
    }

    return call;
  }

  /**
   * Get current session bill
   */
  getSessionBill(sessionId) {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    return {
      sessionId,
      payerAddress: session.payerAddress,
      callCount: session.callCount,
      totalAmount: session.totalAmount,
      currency: session.currency,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      status: session.status,
      calls: session.calls
    };
  }

  /**
   * Bill a session (create payment request)
   */
  billSession(sessionId, closeSession = true) {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Check minimum billing amount
    if (parseFloat(session.totalAmount) < parseFloat(this.config.minBillingAmount)) {
      if (closeSession) {
        session.status = 'closed';
        this.sessions.delete(sessionId);
      }
      return {
        billable: false,
        reason: `Amount ${session.totalAmount} below minimum ${this.config.minBillingAmount}`,
        session
      };
    }

    // Create payment request for the session
    const paymentRequest = {
      x402: '1.0',
      amount: session.totalAmount,
      currency: session.currency,
      recipient: session.metadata.recipient || null, // Should be set when creating session
      chains: session.metadata.chains || ['base', 'solana'],
      challenge: `session-${sessionId}-${Date.now()}`,
      expires: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
      resourceUAL: `urn:ual:dotrep:session:${sessionId}`,
      description: `Session billing: ${session.callCount} API calls`,
      metadata: {
        sessionId,
        callCount: session.callCount,
        sessionDuration: Date.now() - session.createdAt,
        billingType: 'session'
      }
    };

    // Store pending bill
    this.pendingBills.set(sessionId, {
      sessionId,
      paymentRequest,
      createdAt: Date.now(),
      session
    });

    if (closeSession) {
      session.status = 'billing';
      session.lastBilledAt = Date.now();
    } else {
      session.lastBilledAt = Date.now();
      // Reset call count and amount for next billing period
      session.callCount = 0;
      session.totalAmount = '0';
      session.calls = [];
    }

    return {
      billable: true,
      paymentRequest,
      session
    };
  }

  /**
   * Complete session billing (payment verified)
   */
  completeBilling(sessionId, paymentProof) {
    const session = this.sessions.get(sessionId);
    const pendingBill = this.pendingBills.get(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (!pendingBill) {
      throw new Error(`No pending bill for session: ${sessionId}`);
    }

    session.status = 'paid';
    session.paymentProof = paymentProof;
    session.paidAt = Date.now();

    // Remove from pending bills
    this.pendingBills.delete(sessionId);

    // If session was closed, remove it
    if (session.status === 'billing') {
      this.sessions.delete(sessionId);
    }

    return {
      success: true,
      session,
      paymentProof
    };
  }

  /**
   * Close a session without billing (e.g., free tier, error)
   */
  closeSession(sessionId, reason = 'closed') {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.status = reason;
    session.closedAt = Date.now();

    // Clean up
    this.sessions.delete(sessionId);
    this.pendingBills.delete(sessionId);

    return session;
  }

  /**
   * Get active sessions for a payer
   */
  getActiveSessions(payerAddress) {
    const active = [];
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.payerAddress.toLowerCase() === payerAddress.toLowerCase() && 
          session.status === 'active' &&
          Date.now() < session.expiresAt) {
        active.push(session);
      }
    }
    return active;
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    const expired = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt && session.status === 'active') {
        // Auto-bill expired sessions if they have calls
        if (session.callCount > 0) {
          try {
            this.billSession(sessionId, true);
            expired.push({ sessionId, action: 'billed' });
          } catch (error) {
            this.closeSession(sessionId, 'expired');
            expired.push({ sessionId, action: 'closed', error: error.message });
          }
        } else {
          this.closeSession(sessionId, 'expired');
          expired.push({ sessionId, action: 'closed' });
        }
      }
    }

    return expired;
  }

  /**
   * Schedule automatic billing for a session
   */
  scheduleBilling(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Set up interval billing
    const interval = setInterval(() => {
      const currentSession = this.sessions.get(sessionId);
      if (!currentSession || currentSession.status !== 'active') {
        clearInterval(interval);
        return;
      }

      if (currentSession.callCount > 0) {
        try {
          this.billSession(sessionId, false); // Bill but keep session active
        } catch (error) {
          console.error(`[SessionBilling] Error billing session ${sessionId}:`, error);
        }
      }
    }, this.config.billingInterval);

    // Store interval reference for cleanup
    session._billingInterval = interval;
  }

  /**
   * Add two amount strings
   */
  addAmounts(amount1, amount2) {
    return (parseFloat(amount1) + parseFloat(amount2)).toFixed(6);
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create session billing manager
 */
function createSessionBillingManager(config = {}) {
  return new SessionBillingManager(config);
}

module.exports = {
  SessionBillingManager,
  createSessionBillingManager,
  SessionBillingConfig
};

