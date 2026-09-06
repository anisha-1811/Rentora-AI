import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

// A handful of window positions along the skyline. Each lights up on a
// staggered delay when the page mounts, like a city switching its lights on.
const WINDOWS = [
  { x: 18, y: 62, delay: 0.1 }, { x: 34, y: 48, delay: 0.5 }, { x: 34, y: 70, delay: 0.9 },
  { x: 50, y: 40, delay: 0.3 }, { x: 50, y: 58, delay: 0.7 }, { x: 50, y: 76, delay: 1.2 },
  { x: 66, y: 52, delay: 0.6 }, { x: 66, y: 68, delay: 0.2 }, { x: 82, y: 44, delay: 1.0 },
  { x: 82, y: 62, delay: 0.4 }, { x: 82, y: 80, delay: 0.8 }, { x: 26, y: 84, delay: 1.1 },
  { x: 58, y: 88, delay: 0.15 }, { x: 74, y: 86, delay: 0.65 }, { x: 42, y: 90, delay: 0.95 },
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
        <svg className="auth-skyline" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <rect x="10" y="55" width="14" height="45" className="auth-building" />
          <rect x="27" y="38" width="16" height="62" className="auth-building" />
          <rect x="46" y="30" width="12" height="70" className="auth-building" />
          <rect x="61" y="42" width="14" height="58" className="auth-building" />
          <rect x="78" y="35" width="16" height="65" className="auth-building" />
          {WINDOWS.map((w, i) => (
            <rect
              key={i}
              x={w.x}
              y={w.y}
              width="3.2"
              height="3.2"
              className="auth-window"
              style={{ animationDelay: `${w.delay}s` }}
            />
          ))}
        </svg>

        <div className="auth-brand-copy">
          <span className="auth-wordmark">Rentora</span>
          <h1 className="auth-headline">
            Find your place<br />in the city.
          </h1>
          <p className="auth-subcopy">
            Tell us the locality and layout you have in mind — Rentora estimates
            what it should rent for, block by block.
          </p>
        </div>
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