import { useState, useEffect, useCallback, type FormEvent } from "react";
import { supabase } from "@/infrastructure/supabaseClient";
import "./AdminLogin.module.css";

const typedSupabase = supabase as any;

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

type ErrorType = "wrong_credentials" | "missing_id" | "missing_password" | "auth_error" | "rate_limited";

const ERROR_MESSAGES: Record<ErrorType, string> = {
  wrong_credentials: "ID またはパスワードが違います",
  missing_id: "ID を入力してください",
  missing_password: "パスワードを入力してください",
  auth_error: "認証エラーが発生しました",
  rate_limited: "試行回数が多すぎます。しばらく待ってから再試行してください",
};

// Simple in-memory rate limiting (resets on page reload)
// For production, use Supabase Auth rate limiting or a backend service
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function getRateLimitKey(): string {
  return `admin_login_attempts_${window.location.hostname}`;
}

function checkRateLimit(): { allowed: boolean; remainingTime?: number } {
  if (typeof window === 'undefined') return { allowed: true };

  const key = getRateLimitKey();
  const stored = sessionStorage.getItem(key);
  if (!stored) return { allowed: true };

  try {
    const { count, timestamp } = JSON.parse(stored);
    const now = Date.now();

    // Reset if lockout period has passed
    if (now - timestamp > LOCKOUT_DURATION_MS) {
      sessionStorage.removeItem(key);
      return { allowed: true };
    }

    if (count >= MAX_ATTEMPTS) {
      const remainingTime = LOCKOUT_DURATION_MS - (now - timestamp);
      return { allowed: false, remainingTime };
    }

    return { allowed: true };
  } catch {
    // Corrupted data, reset
    sessionStorage.removeItem(key);
    return { allowed: true };
  }
}

function recordFailedAttempt(): void {
  if (typeof window === 'undefined') return;

  const key = getRateLimitKey();
  const stored = sessionStorage.getItem(key);
  const now = Date.now();

  let count = 1;
  let timestamp = now;

  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Reset if lockout period has passed
      if (now - parsed.timestamp > LOCKOUT_DURATION_MS) {
        count = 1;
        timestamp = now;
      } else {
        count = parsed.count + 1;
        timestamp = parsed.timestamp;
      }
    } catch {
      count = 1;
      timestamp = now;
    }
  }

  sessionStorage.setItem(key, JSON.stringify({ count, timestamp }));
}

function clearRateLimit(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(getRateLimitKey());
}

export function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<ErrorType | null>(null);
  const [loading, setLoading] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  // Check rate limit on mount
  useEffect(() => {
    const { allowed, remainingTime } = checkRateLimit();
    if (!allowed && remainingTime) {
      setRateLimited(true);
      setLockoutRemaining(remainingTime);
      // Update countdown
      const interval = setInterval(() => {
        const { remainingTime: rt } = checkRateLimit();
        if (rt) {
          setLockoutRemaining(rt);
        } else {
          setRateLimited(false);
          setLockoutRemaining(0);
          clearInterval(interval);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, []);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();

    // Check rate limit before processing
    const { allowed, remainingTime } = checkRateLimit();
    if (!allowed) {
      setError("rate_limited");
      if (remainingTime) {
        setRateLimited(true);
        setLockoutRemaining(remainingTime);
      }
      return;
    }

    if (!email) {
      setError("missing_id");
      return;
    }
    if (!password) {
      setError("missing_password");
      return;
    }

    setLoading(true);
    setError(null);

    // Add a small random delay to mitigate timing attacks
    // This makes response time less correlated with user existence
    const timingDelay = Math.random() * 200; // 0-200ms
    await new Promise(resolve => setTimeout(resolve, timingDelay));

    const { error: authError } = await typedSupabase.auth.signInWithPassword({
      email,
      password,
    });

    // Another small delay to normalize response time
    await new Promise(resolve => setTimeout(resolve, timingDelay));

    setLoading(false);

    if (authError) {
      recordFailedAttempt();
      // Use generic error message to prevent user enumeration
      // Don't distinguish between "user not found" and "wrong password"
      setError("wrong_credentials");

      // Check if we hit rate limit after this attempt
      const { allowed: stillAllowed, remainingTime } = checkRateLimit();
      if (!stillAllowed && remainingTime) {
        setRateLimited(true);
        setLockoutRemaining(remainingTime);
      }
    } else {
      // Success - clear rate limit
      clearRateLimit();
      onLoginSuccess();
    }
  }, [email, password]);

  // Format lockout time as MM:SS
  const formatLockoutTime = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div data-testid="admin-login-form" className="theme-bg">
      <form onSubmit={handleSubmit} className="formContainer">
        <div>
          <label htmlFor="admin-email">
            メールアドレス
            <input
              id="admin-email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              disabled={loading || rateLimited}
              autoComplete="email"
            />
          </label>
        </div>
        <div>
          <label htmlFor="admin-password">
            パスワード
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              disabled={loading || rateLimited}
              autoComplete="current-password"
            />
          </label>
        </div>
        {error && (
          <div style={{ color: "red" }}>
            {ERROR_MESSAGES[error]}
            {error === "rate_limited" && lockoutRemaining > 0 && (
              <span> （残り: {formatLockoutTime(lockoutRemaining)}）</span>
            )}
          </div>
        )}
        <button type="submit" disabled={loading || rateLimited}>
          {loading ? "認証中..." : rateLimited ? `ロック中 (${formatLockoutTime(lockoutRemaining)})` : "ログイン"}
        </button>
      </form>
    </div>
  );
}