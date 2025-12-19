export interface Participant {
  id: string;
  name: string;
  color: string;
}

export interface ReceiptItem {
  id: string;
  description: string;
  price: number;
  assignedTo: string[]; // Participant IDs
  isShared: boolean;
}

export interface Receipt {
  id: string;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  imageUrl?: string;
}

export interface ParticipantTotal {
  participantId: string;
  participantName: string;
  items: ReceiptItem[];
  itemsTotal: number;
  taxShare: number;
  tipShare: number;
  grandTotal: number;
}

export interface SplitItemDetail {
  description: string;
  price: number;
  isShared: boolean;
  assignedShare: number; // This person's share of this item
}

export interface SplitPersonDetail {
  name: string;
  items: SplitItemDetail[];
  itemsTotal: number;
  taxShare: number;
  tipShare: number;
  grandTotal: number;
}

export interface DetailedSplit {
  date: string;
  taxPercent: number;
  tip: number;
  people: SplitPersonDetail[];
}

export interface SplitRecord {
  name: string;
  amount: number;
  date: string; // ISO string
}

export interface OCRResult {
  text: string;
  confidence: number;
}

// Authentication & Subscription types
export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}

export interface SubscriptionPlan {
  tier: 'free' | 'pro';
  maxScansPerMonth: number;
  price?: number; // in cents, e.g., 499 = $4.99
  features: string[];
}

export interface SubscriptionState {
  isLoggedIn: boolean;
  user?: User;
  isPro: boolean;
  scansUsedThisMonth: number;
  maxScansPerMonth: number;
  monthResetDate: string; // ISO date
}

export interface SubscriptionContextType extends SubscriptionState {
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, name: string, password: string) => Promise<void>;
  logout: () => void;
  upgradeToPro: (paymentToken: string) => Promise<void>;
  useScan: () => boolean; // Returns true if scan was allowed, false if limit exceeded
  resetMonthlyScans: () => void;
}
