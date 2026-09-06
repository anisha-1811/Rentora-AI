import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

// A handful of window positions along the skyline. Each lights up on a
// staggered delay when the page mounts, like a city switching its lights on.
const WINDOWS = [
  { x: 11, y: 18, delay: 0.1 }, { x: 11, y: 24, delay: 0.6 }, { x: 16, y: 21, delay: 1.0 },
  { x: 27, y: 10, delay: 0.3 }, { x: 27, y: 17, delay: 0.75 }, { x: 32, y: 24, delay: 1.1 },
  { x: 32, y: 12, delay: 0.45 }, { x: 45, y: 6, delay: 0.2 }, { x: 45, y: 14, delay: 0.85 },
  { x: 45, y: 22, delay: 1.2 }, { x: 60, y: 13, delay: 0.5 }, { x: 60, y: 20, delay: 0.95 },
  { x: 65, y: 16, delay: 0.35 }, { x: 78, y: 8, delay: 0.65 }, { x: 78, y: 16, delay: 1.05 },
  { x: 83, y: 12, delay: 0.15 }, { x: 83, y: 22, delay: 0.55 },
];

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M7 10V7a5 5 0 0110 0v3" />
    </svg>
  );
}

function EyeIcon({ visible }) {
  return visible ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 3l18 18" />
      <path d="M10.6 5.2A10.8 10.8 0 0112 5c6.5 0 10 7 10 7a17.5 17.5 0 01-3.4 4.3M6.6 6.6C4.3 8.1 2 12 2 12s3.5 7 10 7a10.6 10.6 0 004.2-.85" />
      <path d="M9.9 9.9a3 3 0 004.2 4.2" />
    </svg>
  );
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError("Couldn't log you in: " + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    setError("");
    try {
      await loginWithGoogle();
      navigate("/");
    } catch (err) {
      setError("Google sign-in didn't go through: " + err.message);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-brand">
        <span className="auth-wordmark">Rentora</span>

        <div className="auth-brand-copy">
          <h1 className="auth-headline">
            Find your place<br />in the city.
          </h1>
          <p className="auth-subcopy">
            Tell us the locality and layout you have in mind — Rentora estimates
            what it should rent for, block by block.
          </p>
        </div>

        <svg className="auth-skyline" viewBox="0 0 100 34" preserveAspectRatio="none" aria-hidden="true">
          <rect x="8" y="14" width="13" height="20" className="auth-building" />
          <rect x="24" y="6" width="15" height="28" className="auth-building" />
          <rect x="42" y="2" width="11" height="32" className="auth-building" />
          <rect x="57" y="9" width="13" height="25" className="auth-building" />
          <rect x="74" y="4" width="15" height="30" className="auth-building" />
          {WINDOWS.map((w, i) => (
            <rect
              key={i}
              x={w.x}
              y={w.y}
              width="2.6"
              height="2.6"
              className="auth-window"
              style={{ animationDelay: `${w.delay}s` }}
            />
          ))}
        </svg>
      </div>

      <div className="auth-panel">
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <h2 className="auth-form-title">Log in</h2>

          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          <label className="auth-field">
            <span className="auth-field-label">Email</span>
            <span className="auth-field-control">
              <MailIcon />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </span>
          </label>

          <label className="auth-field">
            <span className="auth-field-label">Password</span>
            <span className="auth-field-control">
              <LockIcon />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="auth-field-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <EyeIcon visible={showPassword} />
              </button>
            </span>
          </label>

          <button type="submit" className="auth-submit" disabled={submitting}>
            {submitting ? "Logging in…" : "Log in"}
          </button>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <button type="button" className="auth-google" onClick={handleGoogleLogin}>
            <span className="auth-google-mark">G</span>
            Continue with Google
          </button>

          <p className="auth-footer">
            Need an account? <Link to="/signup">Sign up</Link>
          </p>
        </form>
      </div>
    </div>
  );
}