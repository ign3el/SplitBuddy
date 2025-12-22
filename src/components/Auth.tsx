import { useState } from 'react';
import { useSubscription } from '../context/SubscriptionContext';
import { getBuildVersion } from '../utils/buildInfo';
import './Auth.css';

type AuthTab = 'login' | 'signup' | 'reset';

export const Auth = ({ onAuthSuccess }: { onAuthSuccess?: () => void }) => {
  const [tab, setTab] = useState<AuthTab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, signUp, requestPasswordReset } = useSubscription();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      await login(email, password);
      setEmail('');
      setPassword('');
      onAuthSuccess?.();
    } catch (err) {
      setError((err as Error).message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      await signUp(email, name, password);
      setEmail('');
      setPassword('');
      setName('');
      setInfo('Check your email to verify your account.');
      setTab('login');
    } catch (err) {
      setError((err as Error).message || 'Sign-up failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setInfo('Password reset email sent. Check your inbox.');
      setTab('login');
    } catch (err) {
      setError((err as Error).message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>SplitBuddy</h1>
          <p>Smart Bill Splitting</p>
        </div>

        {/* Backend health messages, if any, are shown via form actions */}

        {tab !== 'reset' && (
          <div className="auth-tabs">
            <button
              className={`tab ${tab === 'login' ? 'active' : ''}`}
              onClick={() => setTab('login')}
            >
              Login
            </button>
            <button
              className={`tab ${tab === 'signup' ? 'active' : ''}`}
              onClick={() => setTab('signup')}
            >
              Sign Up
            </button>
          </div>
        )}

        {tab === 'reset' && (
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <button
              type="button"
              className="link-btn"
              onClick={() => setTab('login')}
              style={{ display: 'inline-block' }}
            >
              ← Back to Login
            </button>
            <h2 style={{ color: '#10b981', marginTop: '1rem' }}>Reset Password</h2>
          </div>
        )}

        <form
          onSubmit={
            tab === 'login'
              ? handleLogin
              : tab === 'signup'
              ? handleSignUp
              : handlePasswordReset
          }
          className="auth-form"
        >
          {tab === 'signup' && (
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          {tab !== 'reset' && (
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="********"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          {error && <div className="auth-error">{error}</div>}
          {info && <div className="auth-info">{info}</div>}

          {tab === 'login' && (
            <div className="auth-inline">
              <button
                type="button"
                className="link-btn"
                onClick={() => setTab('reset')}
              >
                Forgot password?
              </button>
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading} aria-busy={loading}>
            {loading
              ? (tab === 'login'
                ? 'Signing you in…'
                : tab === 'signup'
                ? 'Creating account…'
                : 'Sending reset…')
              : (tab === 'login'
                ? 'Login'
                : tab === 'signup'
                ? 'Create Account'
                : 'Send Reset Email')}
          </button>
        </form>

        <div className="auth-divider">or continue with</div>

        <div className="social-login">
          <button className="social-btn google" disabled>
            Google
          </button>
          <button className="social-btn apple" disabled>
            Apple
          </button>
        </div>

        <p className="auth-note">
          {tab === 'signup'
            ? 'Already have an account? Switch to Login above.'
            : 'Need an account? Switch to Sign Up above.'}
        </p>

        <div className="build-info">
          Build: {getBuildVersion()}
        </div>
      </div>
    </div>
  );
};
