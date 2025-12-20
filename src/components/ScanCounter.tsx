import { useSubscription } from '../context/SubscriptionContext';
import './ScanCounter.css';

export default function ScanCounter() {
  const { isPro, scansUsedThisMonth, maxScansPerMonth } = useSubscription();
  const scansRemaining = Math.max(0, maxScansPerMonth - scansUsedThisMonth);
  const isAtLimit = scansRemaining === 0 && !isPro;

  return (
    <div className={`scan-counter ${isPro ? 'pro' : 'free'} ${isAtLimit ? 'at-limit' : ''}`}>
      <span className="scan-icon">📷</span>
      <span className="scan-text">
        {scansUsedThisMonth}/{isPro ? '∞' : maxScansPerMonth}
      </span>
      {isPro && <span className="pro-badge">PRO</span>}
    </div>
  );
}
