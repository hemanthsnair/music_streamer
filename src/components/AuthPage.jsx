import React, { useState } from 'react';
import { Music, Lock, User, LogIn, UserPlus } from 'lucide-react';

const AuthPage = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    setError('');
    setLoading(true);
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';

    try {
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      // Successful Auth
      onAuthSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div className="glass-panel pulse-glowing" style={styles.card}>
        <div style={styles.header}>
          <div style={styles.iconCircle}>
            <Music size={32} color="#a78bfa" />
          </div>
          <h1 style={styles.title}>MelodyStream</h1>
          <p style={styles.subtitle}>
            {isLogin ? 'Sign in to access your personal library' : 'Create an account to start curating music'}
          </p>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="form-group">
            <label className="form-label" htmlFor="auth-username">Username</label>
            <div style={styles.inputWrapper}>
              <User size={18} style={styles.inputIcon} />
              <input
                id="auth-username"
                type="text"
                className="form-input"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={styles.paddedInput}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="auth-password">Password</label>
            <div style={styles.inputWrapper}>
              <Lock size={18} style={styles.inputIcon} />
              <input
                id="auth-password"
                type="password"
                className="form-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.paddedInput}
                disabled={loading}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={styles.submitBtn} disabled={loading}>
            {loading ? (
              'Please wait...'
            ) : isLogin ? (
              <>
                <LogIn size={18} /> Sign In
              </>
            ) : (
              <>
                <UserPlus size={18} /> Register
              </>
            )}
          </button>
        </form>

        <div style={styles.toggleFooter}>
          <span>{isLogin ? "Don't have an account?" : 'Already have an account?'}</span>
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setUsername('');
              setPassword('');
            }}
            style={styles.toggleBtn}
            disabled={loading}
          >
            {isLogin ? 'Register Now' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100vw',
    height: '100vh',
    background: '#080612',
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 999,
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    padding: '2.5rem',
    borderRadius: '24px',
    textAlign: 'center',
  },
  header: {
    marginBottom: '2rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  iconCircle: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: 'rgba(139, 92, 246, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1rem',
    border: '1px solid rgba(139, 92, 246, 0.3)',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #a78bfa, #d946ef)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#9ca3af',
    lineHeight: '1.4',
  },
  form: {
    textAlign: 'left',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '12px',
    color: '#9ca3af',
  },
  paddedInput: {
    paddingLeft: '38px',
  },
  submitBtn: {
    width: '100%',
    marginTop: '1rem',
    padding: '0.8rem',
  },
  errorBox: {
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    color: '#fca5a5',
    padding: '0.75rem',
    borderRadius: '8px',
    fontSize: '0.875rem',
    marginBottom: '1.25rem',
    textAlign: 'left',
  },
  toggleFooter: {
    marginTop: '1.5rem',
    fontSize: '0.85rem',
    color: '#9ca3af',
    display: 'flex',
    justifyContent: 'center',
    gap: '0.5rem',
  },
  toggleBtn: {
    background: 'none',
    border: 'none',
    color: '#a78bfa',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'underline',
    outline: 'none',
  },
};

export default AuthPage;
