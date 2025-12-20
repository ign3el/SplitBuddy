import { useEffect, useRef, useState } from 'react';
import { useSubscription } from '../context/SubscriptionContext';
import { SplitHistory } from './SplitHistory';
import type { SplitRecord, DetailedSplit } from '../types';
import './UserMenu.css';

type MenuView = 'profile' | 'subscription' | 'logout';

interface UserMenuProps {
  onNotify?: (message: string, type: 'info' | 'error') => void;
  splitHistory: SplitRecord[];
  detailedSplits: DetailedSplit[];
  onClearHistory: () => void;
  onShowFeatures: () => void;
}

export const UserMenu = ({ onNotify, splitHistory, detailedSplits, onClearHistory, onShowFeatures }: UserMenuProps) => {
  const subscription = useSubscription();
  const [showDropdown, setShowDropdown] = useState(false);
  const [view, setView] = useState<MenuView | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleLogout = async () => {
    await subscription.logout();
    setShowDropdown(false);
    onNotify?.('Logged out successfully', 'info');
  };

  const userName = subscription.user?.name || subscription.user?.email || 'User';

  const toggleDropdown = () => setShowDropdown(v => !v);
  const closeDropdown = () => setShowDropdown(false);

  // Click-outside logic
  useEffect(() => {
    if (!showDropdown) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [showDropdown]);

  // Keyboard navigation for menu
  const menuItems = [
    { key: 'profile', label: 'Profile Settings', action: () => setView('profile') },
    { key: 'membership', label: 'Membership Settings', action: () => setView('subscription') },
    { key: 'logout', label: 'Logout', action: handleLogout },
  ];

  const onMenuKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (!showDropdown) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeDropdown();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => (i + 1) % menuItems.length);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => (i - 1 + menuItems.length) % menuItems.length);
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      menuItems[activeIndex]?.action();
      return;
    }
  };

  return (
    <div className="user-menu" ref={menuRef}>
      <button
        className="user-button"
        onClick={toggleDropdown}
        title={`Logged in as ${userName}`}
        aria-haspopup="true"
        aria-expanded={showDropdown}
      >
        <span className="avatar">👤</span>
        <span className="user-label">{userName.split(' ')[0]}</span>
        <span className={`chevron ${showDropdown ? 'open' : ''}`} aria-hidden>
          ▾
        </span>
      </button>

      {showDropdown && (
        <div
          className="dropdown-menu"
          role="menu"
          aria-label="User menu"
          tabIndex={-1}
          onKeyDown={onMenuKeyDown}
        >
          <button
            className={`menu-item ${activeIndex === 0 ? 'active' : ''}`}
            role="menuitem"
            onMouseEnter={() => setActiveIndex(0)}
            onClick={() => setView('profile')}
          >
            <span className="mi-icon">👤</span>
            <span className="mi-text">Profile Settings</span>
          </button>
          <button
            className={`menu-item ${activeIndex === 1 ? 'active' : ''}`}
            role="menuitem"
            onMouseEnter={() => setActiveIndex(1)}
            onClick={() => setView('subscription')}
          >
            <span className="mi-icon">⭐</span>
            <span className="mi-text">Membership Settings</span>
            <span className={`plan-badge ${subscription.isPro ? 'pro' : 'free'}`}>{subscription.isPro ? 'Pro' : 'Free'}</span>
          </button>
          <hr className="menu-divider" />
          <button
            className={`menu-item logout ${activeIndex === 2 ? 'active' : ''}`}
            role="menuitem"
            onMouseEnter={() => setActiveIndex(2)}
            onClick={handleLogout}
          >
            <span className="mi-icon">🚪</span>
            <span className="mi-text">Logout</span>
          </button>
        </div>
      )}

      {view === 'profile' && (
        <ProfileModal onClose={() => setView(null)} splitHistory={splitHistory} detailedSplits={detailedSplits} onClearHistory={onClearHistory} />
      )}

      {view === 'subscription' && (
        <SubscriptionModal onClose={() => setView(null)} onShowFeatures={onShowFeatures} />
      )}
    </div>
  );
};

const ProfileModal = ({ onClose, splitHistory, detailedSplits, onClearHistory }: { onClose: () => void; splitHistory: SplitRecord[]; detailedSplits: DetailedSplit[]; onClearHistory: () => void }) => {
  const subscription = useSubscription();
  const [name, setName] = useState(subscription.user?.name || '');
  const [saving, setSaving] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Name cannot be empty');
      return;
    }
    setSaving(true);
    try {
      await subscription.updateProfile({ name });
      alert('Profile updated successfully');
      onClose();
    } catch (err) {
      alert((err as Error).message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert('All password fields are required');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      alert('New password must be at least 6 characters');
      return;
    }
    setChangingPassword(true);
    try {
      await subscription.changePassword(currentPassword, newPassword);
      alert('Password changed successfully');
      setShowPasswordChange(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      alert((err as Error).message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (showHistory) {
    return (
      <SplitHistory
        records={splitHistory}
        detailedSplits={detailedSplits}
        onClose={() => setShowHistory(false)}
        isPro={subscription.isPro}
        onClearHistory={onClearHistory}
      />
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2>Profile Settings</h2>
        
        <div className="form-group">
          <label>Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={saving}
          />
        </div>
        
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={subscription.user?.email || ''}
            disabled
            style={{ opacity: 0.6 }}
          />
        </div>

        <div className="form-group">
          <label>Member Since</label>
          <input
            type="text"
            value={formatDate(subscription.user?.createdAt)}
            disabled
            style={{ opacity: 0.6 }}
          />
        </div>

        <div className="form-group" style={{ marginTop: '1.5rem' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => setShowPasswordChange(!showPasswordChange)}
            style={{ width: '100%' }}
          >
            {showPasswordChange ? '🔒 Cancel Password Change' : '🔑 Change Password'}
          </button>
        </div>

        {showPasswordChange && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#f0fdf4', borderRadius: '8px' }}>
            <div className="form-group">
              <label>Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                disabled={changingPassword}
                placeholder="Enter current password"
              />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                disabled={changingPassword}
                placeholder="Enter new password (min 6 characters)"
              />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                disabled={changingPassword}
                placeholder="Confirm new password"
              />
            </div>
            <button 
              className="btn btn-primary" 
              onClick={handlePasswordChange} 
              disabled={changingPassword}
              style={{ width: '100%' }}
            >
              {changingPassword ? 'Changing...' : 'Update Password'}
            </button>
          </div>
        )}

        {splitHistory.length > 0 && (
          <div className="form-group" style={{ marginTop: '1.5rem' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setShowHistory(true)}
              style={{ width: '100%' }}
            >
              📊 View Split History ({splitHistory.length})
            </button>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

const SubscriptionModal = ({ onClose, onShowFeatures }: { onClose: () => void; onShowFeatures: () => void }) => {
  const subscription = useSubscription();
  
  // Calculate next reset date (1st of next month)
  const getNextResetDate = () => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2>Membership Settings</h2>
        <div className="subscription-info">
          <div className="info-row">
            <span>Plan:</span>
            <strong>{subscription.isPro ? 'Pro' : 'Free'}</strong>
          </div>
          <div className="info-row">
            <span>OCR Scans:</span>
            <strong>
              {subscription.scansUsedThisMonth}/{subscription.maxScansPerMonth}
            </strong>
          </div>
          {!subscription.isPro && (
            <>
              <div className="info-row">
                <span>Remaining:</span>
                <strong>
                  {subscription.maxScansPerMonth - subscription.scansUsedThisMonth}
                </strong>
              </div>
              <div className="info-row">
                <span>Next Reset:</span>
                <strong>{getNextResetDate()}</strong>
              </div>
            </>
          )}
        </div>
        {!subscription.isPro ? (
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#ecfdf3', borderRadius: '8px' }}>
            <p style={{ margin: '0 0 1rem 0', color: '#065f46' }}>
              Upgrade to Pro for unlimited OCR scans and premium features!
            </p>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => { onClose(); onShowFeatures(); }}>
              Upgrade
            </button>
          </div>
        ) : (
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f3f4f6', borderRadius: '8px' }}>
            <p style={{ margin: '0 0 1rem 0', color: '#374151' }}>
              You are on the Pro plan.
            </p>
            <button className="btn btn-secondary" style={{ width: '100%' }}>
              Manage Subscription
            </button>
          </div>
        )}
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default UserMenu;
