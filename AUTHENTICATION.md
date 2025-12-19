# SplitBuddy - Authentication & Monetization Implementation

## Overview
Implemented a complete authentication, subscription, and feature-gating system for SplitBuddy to enable monetization with tiered access levels (Free and Pro).

## Architecture

### Components
1. **Authentication Layer** (`Auth.tsx`)
   - Login/Sign-up UI with tab-based interface
   - Form validation and error handling
   - Modern gradient styling matching app theme
   - Social login placeholders for future integration

2. **Subscription Management** (`SubscriptionContext.tsx`)
   - React Context API for centralized state management
   - localStorage persistence with monthly reset logic
   - Tracks user login status, pro tier, and scan usage

3. **Pricing UI** (`Pricing.tsx`)
   - Responsive pricing table showing Free vs Pro tiers
   - Feature comparison with checkmarks
   - Upgrade CTA button with simulated payment flow
   - Card-based layout with "POPULAR" badge for Pro tier

4. **Feature Gating** (`accessControl.ts`)
   - `checkAccess(actionType, subscription)` - Determines if action is allowed
   - `canPerformAction()` - Hook-style wrapper with callback support
   - Supports: OCR (scan-limited), ITEMIZE (pro-only), EXPORT (pro-only)

5. **Ad Wrapper** (`AdWrapper.tsx`)
   - Displays ads only to free-tier users
   - Ready for Google AdMob integration
   - Placeholder styling with upgrade CTA

### Types (`types/index.ts`)
```typescript
interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}

interface SubscriptionPlan {
  tier: 'free' | 'pro';
  maxScansPerMonth: number;
  price?: number;
  features: string[];
}

interface SubscriptionState {
  isLoggedIn: boolean;
  user?: User;
  isPro: boolean;
  scansUsedThisMonth: number;
  maxScansPerMonth: number;
  monthResetDate: string;
}

interface SubscriptionContextType extends SubscriptionState {
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, name: string, password: string) => Promise<void>;
  logout: () => void;
  upgradeToPro: (paymentToken: string) => Promise<void>;
  useScan: () => boolean;
  resetMonthlyScans: () => void;
}
```

## Integration

### App.tsx Structure
```
App (wraps with SubscriptionProvider)
├── AppContent (checks auth, routes to auth/pricing/main)
└── AppMainContent (main app flow)
    ├── Auth (if not logged in)
    ├── Pricing (if redirected from access denial)
    └── Main App (scan → participants → assign → results)
        ├── CameraCapture (with access check)
        └── AdWrapper (shown only for free users)
```

### Key Changes to App.tsx
- **Access Control**: OCR trigger wrapped with `checkAccess('OCR', subscription)`
- **Scan Counter**: Calls `subscription.useScan()` after successful OCR
- **UI Enhancements**:
  - Header shows remaining scans for free users
  - Logout button in header
  - Pricing redirect when scans exhausted
- **Ad Placement**: AdWrapper component at bottom (hidden for Pro users)

## Pricing Tiers

### Free Tier
- 5 OCR scans/month
- Basic item assignment
- Split history
- Ad-supported experience
- Price: $0

### Pro Tier
- Unlimited OCR scans
- Itemized splitting (reserved for Pro)
- Full split history
- Ad-free experience
- Advanced analytics (future)
- Price: $4.99/month (simulated)

## State Management Details

### SubscriptionContext Features
- **Monthly Reset**: Auto-detects month/year change and resets `scansUsedThisMonth`
- **localStorage Persistence**: Key = `"splitbuddy_subscription"`
- **Graceful Degradation**: JSON parse errors handled gracefully
- **Default State**:
  ```
  isLoggedIn: false
  isPro: false
  scansUsedThisMonth: 0
  maxScansPerMonth: 5
  monthResetDate: "2024-01"
  ```

### Mock Implementation
Currently uses client-side simulations:
- Login/SignUp create local User objects with random IDs
- Logout clears all state
- UpgradeToPro simulates payment and enables Pro tier
- In production: Replace with actual API calls

## Styling

### Design System
- **Primary Color**: #10b981 (Green)
- **Secondary Color**: #059669 (Dark Green)
- **Background**: Linear gradient (#d1fae5 → #f0fdf4)
- **Accent**: #d1fae5 (Light Green)

### Responsive Breakpoints
- **Mobile**: 600px and below
- **Tablet**: 768px
- **Desktop**: 1200px max-width containers

### Component Styling
- **Auth**: Tab-based interface with gradient background
- **Pricing**: Card layout with feature matrix
- **AdWrapper**: Dashed placeholder with upgrade CTA
- **Header**: Green gradient background with white text

## Usage Examples

### Check Access Before Action
```typescript
const handleCameraStart = async () => {
  const accessResult = checkAccess('OCR', subscription);
  if (!accessResult.allowed) {
    if (accessResult.redirectTo === 'LOGIN') setScreenState('auth');
    if (accessResult.redirectTo === 'PRICING') setShowPricingRedirect(true);
    return;
  }
  // Proceed with OCR
  const ocrResult = await processReceiptImages(files);
  subscription.useScan(); // Count the scan
};
```

### Use Subscription Context
```typescript
const MyComponent = () => {
  const { isLoggedIn, isPro, scansRemaining, login, logout } = useSubscription();
  
  if (!isLoggedIn) {
    return <button onClick={() => login(email, password)}>Login</button>;
  }
  
  if (!isPro) {
    return <div>Scans remaining: {scansRemaining}/5</div>;
  }
  
  return <div>Pro user - enjoy unlimited scans!</div>;
};
```

### Ad Wrapper Usage
```typescript
// Automatically hidden for Pro users
<AdWrapper position="bottom" className="my-custom-class" />
```

## Future Enhancements

### Payment Integration
- [ ] Integrate Stripe for real payment processing
- [ ] Handle webhooks for subscription updates
- [ ] Support multiple payment methods (PayPal, Apple Pay)

### Backend Integration
- [ ] Real API endpoints for login/signup
- [ ] JWT token management
- [ ] Server-side scan counting and monthly reset
- [ ] User profile management

### AdMob Integration
- [ ] Install `react-google-adsense` package
- [ ] Replace placeholder with real AdMob banners
- [ ] Configure ad unit IDs per platform

### Additional Features
- [ ] Email verification
- [ ] Password reset flow
- [ ] Social login (Google, Apple, Facebook)
- [ ] Subscription management dashboard
- [ ] Usage analytics
- [ ] Premium feature requests

## Files Modified/Created

### New Files
- `src/components/Auth.tsx` - Authentication UI
- `src/components/Auth.css` - Auth styling
- `src/components/Pricing.tsx` - Pricing table UI
- `src/components/Pricing.css` - Pricing styling
- `src/components/AdWrapper.tsx` - Ad placeholder component
- `src/components/AdWrapper.css` - Ad wrapper styling
- `src/context/SubscriptionContext.tsx` - State management
- `src/utils/accessControl.ts` - Access control logic

### Modified Files
- `src/types/index.ts` - Added subscription types
- `src/App.tsx` - Integrated authentication flow
- `src/App.css` - Added header styling

## Testing Checklist

- [x] Authentication flow (login/signup/logout)
- [x] Scan limit enforcement (5 scans/month free)
- [x] Monthly reset logic
- [x] Feature gating (OCR denied when scans exhausted)
- [x] Pricing page display
- [x] Pro tier upgrade flow (simulated)
- [x] Ad visibility (shown only to free users)
- [x] localStorage persistence
- [x] TypeScript compilation
- [x] Build success

## Deployment Notes

### Pre-Deployment Checklist
1. Replace simulated auth with real backend API
2. Add Stripe payment integration
3. Configure production payment credentials
4. Set up backend subscription management
5. Add email verification
6. Implement rate limiting on auth endpoints
7. Add HTTPS enforcement
8. Configure CORS for API calls
9. Set up analytics tracking
10. Create user support documentation

### Environment Variables (To Add)
```
VITE_API_URL=https://api.splitbuddy.com
VITE_STRIPE_PUBLIC_KEY=pk_live_xxxxx
VITE_ADMOB_CLIENT_ID=ca-app-pub-xxxxx
```

## Support

For authentication issues:
- Check browser localStorage for subscription state
- Monitor console for access check logs
- Verify API connectivity (when implemented)

For styling issues:
- Review CSS media queries for responsive breakpoints
- Check color scheme against design system

## References

- React Context API: https://react.dev/reference/react/useContext
- localStorage: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
- TypeScript: https://www.typescriptlang.org/
