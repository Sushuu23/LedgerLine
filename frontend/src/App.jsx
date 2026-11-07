
import { useState } from "react";
import "./App.css";

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setMessage("Checking credentials...");

      const credentials = btoa(`${email.trim()}:${password}`);

      const response = await fetch(
        "http://localhost:8080/api/auth/check",
        {
          method: "GET",
          headers: {
            Authorization: `Basic ${credentials}`
          }
        }
      );

      if (response.ok) {
        const result = await response.text();
        setMessage(result);
        setLoggedIn(true);
      } else if (response.status === 401) {
        setMessage("Invalid email or password.");
      } else {
        setMessage("Login failed. Please try again.");
      }
    } catch (error) {
      setMessage("Cannot connect to backend.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setEmail("");
    setPassword("");
    setMessage("");
    setLoggedIn(false);
  };

  if (loggedIn) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="brand-icon">L</div>
          <h1>LedgerLine</h1>
          <h2>Welcome Back!</h2>
          <p>{message}</p>
          <button
            className="login-button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand-icon">L</div>

        <h1>LedgerLine</h1>

        <p className="tagline">
          Secure money movement. Proven by ledger.
        </p>

        <h2>Welcome Back</h2>

        <p className="subtitle">
          Sign in to access your account
        </p>

        <form onSubmit={handleLogin}>
          <label htmlFor="email">Email Address</label>

          <input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor="password">Password</label>

          <div className="password-box">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button
              type="button"
              className="show-password"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        {message && (
          <p className="login-message" role="status">
            {message}
          </p>
        )}

        <p className="security-note">
          Protected by secure authentication
        </p>
      </div>
    </div>
  );
}

export default App;
