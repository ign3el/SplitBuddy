import { useState } from 'react';
import { useSubscription } from '../context/SubscriptionContext';
import './Pricing.css';

export const Pricing = () => {
  const { isPro, upgradeToPro } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    setLoading(true);
    setError(null);
    try {
      // Simulated payment; in production, integrate Stripe checkout
      const token = 'fake_token_' + Math.random().toString(36).substr(2, 9);
      await upgradeToPro(token);
      alert('✅ Upgraded to Pro! Enjoy unlimited OCR scans.');
    } catch (err) {
      setError((err as Error).message || 'Upgrade failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pricing-container">
      <div className="pricing-header">
        <h2>Choose Your Plan</h2>
        <p>Unlock more features to get the most out of SplitBuddy</p>
      </div>

      <div className="pricing-grid">
        {/* Free Tier */}
        <div className="pricing-card free">
          <div className="pricing-tier">Free</div>
          <div className="pricing-price">
            <span className="currency">$</span>
            <span className="amount">0</span>
            <span className="period">/month</span>
          </div>
          <ul className="pricing-features">
            <li className="included">
              <span className="check">✓</span> 5 OCR scans/month
            </li>
            <li className="included">
              <span className="check">✓</span> Basic item assignment
            </li>
            <li className="included">
              <span className="check">✓</span> Split history
            </li>
            <li className="excluded">
              <span className="x">✕</span> Itemized splitting
            </li>
            <li className="excluded">
              <span className="x">✕</span> Ad-free experience
            </li>
          </ul>
          <button className="btn btn-secondary" disabled>
            Current Plan
          </button>
        </div>

        {/* Pro Tier */}
        <div className={`pricing-card pro ${isPro ? 'active' : ''}`}>
          <div className="pricing-badge">POPULAR</div>
          <div className="pricing-tier">Pro</div>
          <div className="pricing-price">
            <span className="currency">$</span>
            <span className="amount">4.99</span>
            <span className="period">/month</span>
          </div>
          <ul className="pricing-features">
            <li className="included">
              <span className="check">✓</span> Unlimited OCR scans
            </li>
            <li className="included">
              <span className="check">✓</span> Itemized splitting
            </li>
            <li className="included">
              <span className="check">✓</span> Split history
            </li>
            <li className="included">
              <span className="check">✓</span> Advanced analytics
            </li>
            <li className="included">
              <span className="check">✓</span> Ad-free experience
            </li>
          </ul>
          {isPro ? (
            <button className="btn btn-primary" disabled>
              ✓ Active
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleUpgrade}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Upgrade Now'}
            </button>
          )}
        </div>
      </div>

      {error && <div className="pricing-error">{error}</div>}

      <div className="pricing-footer">
        <p>💳 Billing is handled securely. Cancel anytime, no questions asked.</p>
        <p className="text-muted">
          Pro membership auto-renews monthly. See our{' '}
          <a href="#privacy">privacy policy</a> and{' '}
          <a href="#terms">terms of service</a>.
        </p>
      </div>
    </div>
  );
};
