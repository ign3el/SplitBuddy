import { useSubscription } from '../context/SubscriptionContext';
import './AdWrapper.css';

export interface AdWrapperProps {
  adUnitId?: string;
  position?: 'top' | 'bottom';
  className?: string;
}

/**
 * AdWrapper component - renders ads only for free tier users
 * Pro users get an ad-free experience
 */
export const AdWrapper = ({
  position = 'bottom',
  className = '',
}: AdWrapperProps) => {
  const { isPro } = useSubscription();

  // Pro users don't see ads
  if (isPro) {
    return null;
  }

  return (
    <div className={`ad-wrapper ad-${position} ${className}`}>
      <div className="ad-container">
        {/* 
          Placeholder for Google AdMob banner
          In production, integrate Google AdMob SDK:
          - Install: npm install react-google-adsense
          - Import: import { GoogleAd } from "react-google-adsense";
          - Use: <GoogleAd client="ca-app-pub-xxx" slot={adUnitId} format="auto" />
        */}
        <div className="ad-placeholder">
          <span className="ad-text">Advertisement</span>
          <p className="ad-subtext">Upgrade to Pro to remove ads</p>
        </div>

        {/* 
          Real AdMob implementation would look like:
          <GoogleAd 
            client={`ca-app-pub-3940256099942544`}
            slot={'6300978111'}
            format="auto"
            responsive
          />
        */}
      </div>
    </div>
  );
};

export default AdWrapper;
