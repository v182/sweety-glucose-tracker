import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Heart,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Brand } from '../components/Brand.jsx';
import { ErrorMessage, Spinner } from '../components/UI.jsx';
import { useAuth } from '../auth.jsx';

export function AuthPage({ register = false }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!auth.loading && auth.user) return <Navigate to="/" replace />;
  async function submit(event) {
    event.preventDefault();
    const fields = {};
    if (register && name.trim().length < 2)
      fields.name = 'Please enter your name (at least 2 characters).';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      fields.email = 'Please enter a valid email address.';
    if (!password) fields.password = 'Please enter your password.';
    else if (register && password.length < 8) fields.password = 'Use at least 8 characters.';
    setErrors(fields);
    setError('');
    if (Object.keys(fields).length) return;
    setBusy(true);
    try {
      await auth[register ? 'register' : 'login']({ name, email, password });
      navigate('/');
    } catch (err) {
      setErrors(err.fields || {});
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <section className="auth-story">
        <Brand />
        <div className="auth-story-content">
          <span className="eyebrow light">
            <Sparkles size={14} /> YOUR EVERYDAY COMPANION
          </span>
          <h1>
            A little tracking.
            <br />A clearer <em>picture.</em>
          </h1>
          <p>
            A calm, simple space to record your glucose readings and see your days come together.
          </p>
          <div className="auth-illustration" aria-hidden="true">
            <div className="illustration-orbit orbit-one" />
            <div className="illustration-orbit orbit-two" />
            <div className="illustration-card">
              <div className="illustration-top">
                <span className="mini-drop">♥</span>
                <span>Your daily rhythm</span>
                <span className="mini-pill">4 slots</span>
              </div>
              <svg viewBox="0 0 320 100">
                <path
                  d="M8 70 C38 70 36 25 70 30 S120 65 148 45 S200 18 230 35 S270 65 310 20"
                  fill="none"
                  stroke="#42b5a4"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <path d="M8 95H310M8 50H310M8 10H310" stroke="#e8f0ec" strokeDasharray="4 5" />
                <circle cx="148" cy="45" r="6" fill="#16857b" stroke="#fff" strokeWidth="3" />
              </svg>
              <div className="illustration-days">
                <span>MON</span>
                <span>TUE</span>
                <span>WED</span>
                <span>THU</span>
                <span>FRI</span>
              </div>
            </div>
            <div className="illustration-float">
              <span>
                <Check size={17} />
              </span>
              A small check-in, logged.
            </div>
          </div>
        </div>
        <div className="auth-story-footer">
          <ShieldCheck size={17} />
          <span>Your readings. Your private space.</span>
        </div>
      </section>
      <section className="auth-form-side">
        <div className="auth-mobile-brand">
          <Brand />
        </div>
        <div className="auth-form-content">
          <span className="auth-welcome-icon">
            <Heart size={23} />
          </span>
          <span className="eyebrow">WELCOME TO SWEETY</span>
          <h2>{register ? 'Start your daily rhythm.' : 'Good to see you again.'}</h2>
          <p className="auth-description">
            {register
              ? 'Create an account for your everyday check-ins.'
              : 'Log in to pick up where you left off.'}
          </p>
          <form onSubmit={submit} noValidate>
            {error && <ErrorMessage message={error} />}
            {register && (
              <div className="form-field">
                <label htmlFor="name">Your name</label>
                <input
                  id="name"
                  name="name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Morgan"
                  disabled={busy}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? 'name-error' : undefined}
                />
                {errors.name && (
                  <span id="name-error" className="field-error">
                    {errors.name}
                  </span>
                )}
              </div>
            )}
            <div className="form-field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={busy}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email && (
                <span id="email-error" className="field-error">
                  {errors.email}
                </span>
              )}
            </div>
            <div className="form-field">
              <label htmlFor="password">Password</label>
              <div className="password-input">
                <input
                  id="password"
                  name="password"
                  type={visible ? 'text' : 'password'}
                  autoComplete={register ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={register ? 'At least 8 characters' : 'Enter your password'}
                  disabled={busy}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label={visible ? 'Hide password' : 'Show password'}
                  onClick={() => setVisible((value) => !value)}
                >
                  {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <span id="password-error" className="field-error">
                  {errors.password}
                </span>
              )}
            </div>
            <button className="button primary full-width auth-submit" type="submit" disabled={busy}>
              {busy ? (
                <Spinner />
              ) : (
                <>
                  {register ? 'Create my account' : 'Log in'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
          <p className="auth-switch">
            {register ? 'Already have an account?' : 'New to Sweety?'}{' '}
            <Link to={register ? '/login' : '/register'}>
              {register ? 'Log in' : 'Create an account'}
            </Link>
          </p>
          <div className="auth-security">
            <LockKeyhole size={15} />
            <span>Secure sign-in. Private readings.</span>
          </div>
        </div>
        <p className="auth-bottom">
          A little care, every day. <span>♥</span>
        </p>
      </section>
    </div>
  );
}
