import { useEffect, useState } from "react";
import "./App.css";
import API, { setAuthToken } from "./api/api";
import AuthPage from "./components/AuthPage";
import type { AuthResponse, User } from "./components/AuthPage";
import Dashboard from "./components/Dashboard";

const tokenStorageKey = "processmind-token";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    const token = window.localStorage.getItem(tokenStorageKey);
    if (!token) {
      setIsCheckingSession(false);
      return;
    }

    setAuthToken(token);
    API.get<User>("/auth/me")
      .then((response) => {
        setUser(response.data);
      })
      .catch(() => {
        window.localStorage.removeItem(tokenStorageKey);
        setAuthToken(null);
      })
      .finally(() => {
        setIsCheckingSession(false);
      });
  }, []);

  const handleAuthenticated = (payload: AuthResponse) => {
    window.localStorage.setItem(tokenStorageKey, payload.access_token);
    setAuthToken(payload.access_token);
    setUser(payload.user);
  };

  const handleLogout = () => {
    window.localStorage.removeItem(tokenStorageKey);
    setAuthToken(null);
    setUser(null);
  };

  if (isCheckingSession) {
    return (
      <main className="auth-shell">
        <section className="auth-card auth-card-loading">
          <p className="panel-kicker">Session</p>
          <h2>Checking your workspace access...</h2>
        </section>
      </main>
    );
  }

  if (!user) {
    return <AuthPage onAuthenticated={handleAuthenticated} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}

export default App;
