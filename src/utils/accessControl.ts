import type { SubscriptionContextType } from '../types/index';

export type ActionType = 'OCR' | 'ITEMIZE' | 'EXPORT';
export type RedirectTarget = 'LOGIN' | 'PRICING' | null;

export interface AccessCheckResult {
  allowed: boolean;
  redirectTo: RedirectTarget;
  reason?: string;
}

/**
 * Check if user has access to perform an action
 * @param actionType The action being attempted (OCR, ITEMIZE, EXPORT)
 * @param subscription The current subscription state
 * @returns Access result with allowed flag and optional redirect target
 */
export const checkAccess = (
  actionType: ActionType,
  subscription: SubscriptionContextType
): AccessCheckResult => {
  // If not logged in, require login
  if (!subscription.isLoggedIn) {
    return {
      allowed: false,
      redirectTo: 'LOGIN',
      reason: 'Please log in to continue',
    };
  }

  // Free tier users have scan limits
  if (!subscription.isPro) {
    // OCR is the main limited action
    if (actionType === 'OCR') {
      const scansRemaining =
        subscription.maxScansPerMonth - subscription.scansUsedThisMonth;

      if (scansRemaining <= 0) {
        return {
          allowed: false,
          redirectTo: 'PRICING',
          reason: `You've used all ${subscription.maxScansPerMonth} OCR scans this month. Upgrade to Pro for unlimited scans.`,
        };
      }

      // Allow OCR, but warn if low on scans
      if (scansRemaining === 1) {
        console.warn('⚠️ Last OCR scan of the month!');
      }
    }

    // Itemized splitting available only to Pro users
    if (actionType === 'ITEMIZE') {
      return {
        allowed: false,
        redirectTo: 'PRICING',
        reason: 'Itemized splitting is a Pro feature. Upgrade to unlock.',
      };
    }

    // History export available only to Pro users
    if (actionType === 'EXPORT') {
      return {
        allowed: false,
        redirectTo: 'PRICING',
        reason: 'History export is a Pro feature. Upgrade to unlock.',
      };
    }
  }

  // Pro users have full access
  return {
    allowed: true,
    redirectTo: null,
  };
};

/**
 * Hook-style wrapper for access checking (for use in components)
 * Automatically logs access denial for debugging
 */
export const canPerformAction = (
  actionType: ActionType,
  subscription: SubscriptionContextType,
  onDenied?: (result: AccessCheckResult) => void
): boolean => {
  const result = checkAccess(actionType, subscription);

  if (!result.allowed) {
    console.log(
      `Access denied for ${actionType}: ${result.reason || 'Unknown reason'}`
    );
    onDenied?.(result);
  }

  return result.allowed;
};
