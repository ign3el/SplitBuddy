import './FeaturesComparison.css';

interface FeaturesComparisonProps {
  onClose: () => void;
  onUpgrade?: () => void;
}

export const FeaturesComparison: React.FC<FeaturesComparisonProps> = ({ onClose, onUpgrade }) => {
  const features = [
    { name: 'OCR Receipt Scanning', free: '5 scans/month', pro: 'Unlimited' },
    { name: 'Manual Item Entry', free: '✓', pro: '✓' },
    { name: 'Participant Management', free: '✓', pro: '✓' },
    { name: 'Item Assignment', free: '✓', pro: '✓' },
    { name: 'Tax & Tip Calculation', free: '✓', pro: '✓' },
    { name: 'Split History', free: 'Deleted monthly', pro: 'Saved forever' },
    { name: 'Export History (CSV)', free: '✗', pro: '✓' },
    { name: 'Detailed Split Records', free: 'Limited', pro: 'Full access' },
    { name: 'Priority Support', free: '✗', pro: '✓' },
    { name: 'Ad-Free Experience', free: '✗', pro: '✓' },
  ];

  return (
    <div className="features-overlay">
      <div className="features-modal">
        <div className="features-header">
          <h2>🎯 Free vs Pro Features</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="features-content">
          <div className="features-grid">
            <div className="feature-header"></div>
            <div className="feature-header tier-header free-tier">
              <h3>Free</h3>
              <p className="tier-price">$0/mo</p>
            </div>
            <div className="feature-header tier-header pro-tier">
              <h3>Pro</h3>
              <p className="tier-price">$4.99/mo</p>
            </div>

            {features.map((feature, index) => (
              <div key={index} className="feature-row-group">
                <div className="feature-name">{feature.name}</div>
                <div className={`feature-value ${feature.free === '✗' ? 'unavailable' : ''}`}>
                  {feature.free}
                </div>
                <div className="feature-value pro-value">{feature.pro}</div>
              </div>
            ))}
          </div>

          <div className="upgrade-section">
            <p className="upgrade-pitch">
              🚀 Upgrade to Pro to unlock unlimited scans, permanent history storage, and export capabilities!
            </p>
            {onUpgrade && (
              <button className="btn btn-primary upgrade-btn" onClick={onUpgrade}>
                Upgrade to Pro
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
