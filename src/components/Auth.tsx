import { useState } from 'react';
import { useSubscription } from '../context/SubscriptionContext';
import './Auth.css';

type AuthTab = 'login' | 'signup';

export const Auth = ({ onAuthSuccess }: { onAuthSuccess?: () => void }) => {
  const [tab, setTab] = useState<AuthTab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, signUp } = useSubscription();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
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
    setLoading(true);
    try {
      await signUp(email, name, password);
      setEmail('');
      setPassword('');
      setName('');
      onAuthSuccess?.();
    } catch (err) {
      setError((err as Error).message || 'Sign-up failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>💚 SplitBuddy</h1>
          <p>Smart Bill Splitting</p>
        </div>

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

        <form onSubmit={tab === 'login' ? handleLogin : handleSignUp} className="auth-form">
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

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '...' : tab === 'login' ? 'Login' : 'Create Account'}
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
          {tab === 'login'
            ? "Don't have an account? Switch to Sign Up above."
            : 'Already have an account? Switch to Login above.'}
        </p>
      </div>
    </div>
  );
};
