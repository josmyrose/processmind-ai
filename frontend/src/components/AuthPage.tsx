import { useState } from "react";
import type { FormEvent } from "react";
import type { AxiosError } from "axios";
import API from "../api/api";

type User = {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
};

type AuthResponse = {
  access_token: string;
  token_type: string;
  user: User;
};

type AuthPageProps = {
  onAuthenticated: (payload: AuthResponse) => void;
};

const initialRegisterForm = {
  name: "",
  email: "",
  password: "",
};

const initialLoginForm = {
  email: "",
  password: "",
};

function getRequestErrorMessage(error: unknown, fallbackMessage: string) {
  const requestError = error as AxiosError<{ detail?: string | { msg?: string }[] }>;
  const detail = requestError?.response?.data?.detail;

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail) && detail.length > 0) {
    const firstMessage = detail
      .map((entry) => entry?.msg?.trim())
      .find((message): message is string => Boolean(message));

    if (firstMessage) {
      return firstMessage;
    }
  }

  if (requestError?.message === "Network Error") {
    return "Cannot reach the authentication service. Make sure the backend is running and allows this frontend origin.";
  }

  return fallbackMessage;
}

function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [registerForm, setRegisterForm] = useState(initialRegisterForm);
  const [loginForm, setLoginForm] = useState(initialLoginForm);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await API.post<AuthResponse>("/auth/register", registerForm);
      onAuthenticated(response.data);
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, "Registration failed. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await API.post<AuthResponse>("/auth/login", loginForm);
      onAuthenticated(response.data);
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, "Login failed. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (mode === "login") {
      void handleLogin();
      return;
    }

    void handleRegister();
  };

  return (
    <main className="auth-shell">
      <section className="auth-showcase">
        <p className="eyebrow">ProcessMind AI</p>
        <h1 className="auth-title">Sign in to your process workspace.</h1>
        <p className="auth-lead">
          Keep uploads, process reviews, and AI-assisted analysis tied to the right account with a clean PostgreSQL-backed sign-in flow.
        </p>
        <div className="auth-highlights">
          <article>
            <strong>Protected event data</strong>
            <p>Only authenticated users can access the dashboard and process uploads.</p>
          </article>
          <article>
            <strong>Quick onboarding</strong>
            <p>Create an account in a few seconds and continue directly into the app.</p>
          </article>
          <article>
            <strong>Built for browsers</strong>
            <p>The screen now scales cleanly from mobile widths to full desktop layouts.</p>
          </article>
        </div>
      </section>

      <section className="auth-card">
        <div className="auth-card-header">
          <div>
            <p className="panel-kicker">{mode === "login" ? "Welcome back" : "New workspace access"}</p>
            <h2>{mode === "login" ? "Sign in to ProcessMind" : "Create your account"}</h2>
          </div>
          <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
            <button
              className={mode === "login" ? "auth-tab auth-tab-active" : "auth-tab"}
              type="button"
              onClick={() => setMode("login")}
            >
              Sign in
            </button>
            <button
              className={mode === "register" ? "auth-tab auth-tab-active" : "auth-tab"}
              type="button"
              onClick={() => setMode("register")}
            >
              Create account
            </button>
          </div>
        </div>

        <form className="auth-panel" onSubmit={handleSubmit}>
          <div className="panel-header">
            <p>
              {mode === "login"
                ? "Use your email and password to continue to the dashboard."
                : "Create a local account stored in PostgreSQL for this project."}
            </p>
          </div>

          {mode === "register" && (
            <label className="auth-field">
              <span>Name</span>
              <input
                type="text"
                value={registerForm.name}
                onChange={(event) =>
                  setRegisterForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Aarav Kumar"
              />
            </label>
          )}

          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              value={mode === "login" ? loginForm.email : registerForm.email}
              onChange={(event) =>
                mode === "login"
                  ? setLoginForm((current) => ({ ...current, email: event.target.value }))
                  : setRegisterForm((current) => ({ ...current, email: event.target.value }))
              }
              placeholder="you@company.com"
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              value={mode === "login" ? loginForm.password : registerForm.password}
              onChange={(event) =>
                mode === "login"
                  ? setLoginForm((current) => ({ ...current, password: event.target.value }))
                  : setRegisterForm((current) => ({ ...current, password: event.target.value }))
              }
              placeholder="Minimum 8 characters"
            />
          </label>

          {error && (
            <div className="feedback-card feedback-card-error" role="alert">
              <p className="feedback-label">Authentication issue</p>
              <p>{error}</p>
            </div>
          )}

          <div className="auth-actions">
            <button className="auth-submit-button" type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Please wait..."
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

export type { AuthResponse, User };
export default AuthPage;
