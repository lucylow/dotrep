import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = 'http://localhost:3000';

function App() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [feed, setFeed] = useState(null);
  const [receiptUAL, setReceiptUAL] = useState(null);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/reputation/top?limit=10`);
      setLeaderboard(response.data.creators);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  };

  const requestTrustedFeed = async (creatorId) => {
    setLoading(true);
    setPaymentStatus(null);
    setFeed(null);
    setReceiptUAL(null);

    try {
      // First request - will get 402
      const response = await axios.get(
        `${API_URL}/api/marketplace/trusted-feed/${creatorId}`,
        { validateStatus: (status) => status === 200 || status === 402 }
      );

      if (response.status === 402) {
        setPaymentStatus('payment_required');
        const paymentRequest = response.data.paymentRequest;

        // Simulate payment submission
        const paymentResponse = await axios.post(`${API_URL}/api/payments/submit`, {
          paymentRequest,
        });

        setPaymentStatus('payment_submitted');
        const txHash = paymentResponse.data.txHash;

        // Create mock payment proof
        const proof = {
          txHash,
          signedBy: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          chain: 'base',
          proofSignature: '0x' + '0'.repeat(130),
          nonce: paymentRequest.nonce,
        };

        // Retry with payment proof
        const feedResponse = await axios.get(
          `${API_URL}/api/marketplace/trusted-feed/${creatorId}`,
          {
            headers: {
              'X-Payment-Proof': JSON.stringify(proof),
            },
          }
        );

        setFeed(feedResponse.data.feed);
        setReceiptUAL(feedResponse.data.receiptUAL);
        setPaymentStatus('payment_verified');
      } else {
        setFeed(response.data.feed);
        setReceiptUAL(response.data.receiptUAL);
      }
    } catch (error) {
      console.error('Error requesting feed:', error);
      setPaymentStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>DotRep Monetization Demo</h1>
        <p>Sybil-Resistant Social Credit Marketplace</p>
      </header>

      <main className="app-main">
        <section className="leaderboard-section">
          <h2>Reputation Leaderboard</h2>
          <div className="leaderboard">
            {leaderboard.map((creator, index) => (
              <div key={creator.creatorId} className="leaderboard-item">
                <span className="rank">#{index + 1}</span>
                <span className="creator-id">{creator.creatorId}</span>
                <span className="score">{creator.finalScore.toFixed(4)}</span>
                <button
                  onClick={() => requestTrustedFeed(creator.creatorId)}
                  disabled={loading}
                  className="feed-button"
                >
                  View Feed
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="payment-section">
          <h2>Payment Flow</h2>
          {paymentStatus === 'payment_required' && (
            <div className="status payment-required">
              💳 Payment Required - Submitting payment...
            </div>
          )}
          {paymentStatus === 'payment_submitted' && (
            <div className="status payment-submitted">
              ✅ Payment Submitted - Verifying...
            </div>
          )}
          {paymentStatus === 'payment_verified' && (
            <div className="status payment-verified">
              ✅ Payment Verified - Access granted!
            </div>
          )}
          {paymentStatus === 'error' && (
            <div className="status error">
              ❌ Payment Error
            </div>
          )}
        </section>

        {feed && (
          <section className="feed-section">
            <h2>Trusted Feed</h2>
            <div className="feed">
              {feed.map((item) => (
                <div key={item.id} className="feed-item">
                  <h3>{item.title}</h3>
                  <p>{item.content}</p>
                  <small>Reputation: {item.reputation.toFixed(4)}</small>
                </div>
              ))}
            </div>
          </section>
        )}

        {receiptUAL && (
          <section className="receipt-section">
            <h2>Receipt UAL</h2>
            <div className="receipt-ual">
              <code>{receiptUAL}</code>
              <p className="receipt-note">
                This receipt has been published to OriginTrail DKG and can be verified.
              </p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;

