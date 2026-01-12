import { useState, useEffect } from "react";
import "./Admin.css";

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState({
    maxCapacity: 50,
    avgServiceTime: 20,
  });

  // Simple password check (in production, use proper authentication)
  const ADMIN_PASSWORD = "admin123";

  function handleLogin(e) {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setError("");
      loadStats();
    } else {
      setError("Incorrect password");
      setPassword("");
    }
  }

  async function loadStats() {
    try {
      const res = await fetch("/api/queue/stats");
      if (!res.ok) throw new Error("Failed to load stats");
      const data = await res.json();
      setStats(data);
      setSettings({
        maxCapacity: data.maxCapacity,
        avgServiceTime: data.avgServiceTime,
      });
    } catch (e) {
      setError(e.message || "Failed to load stats");
    }
  }

  async function serveNext() {
    try {
      setError("");
      setMessage("");
      const res = await fetch("/api/queue/serve-next", { method: "POST" });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to serve next");

      setMessage(data.message || "Next person served");
      await loadStats();
    } catch (e) {
      setError(e.message || "Something went wrong");
    }
  }

  async function updateSettings(e) {
    e.preventDefault();
    try {
      setError("");
      setMessage("");
      const res = await fetch("/api/queue/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update settings");
      }

      setMessage("Settings updated successfully");
      await loadStats();
    } catch (e) {
      setError(e.message || "Something went wrong");
    }
  }

  async function resetDailyStats() {
    if (!confirm("Are you sure you want to reset daily statistics?")) {
      return;
    }

    try {
      setError("");
      setMessage("");
      // You'll need to add this endpoint to the backend
      setMessage("Daily stats would be reset (endpoint not implemented)");
    } catch (e) {
      setError(e.message || "Something went wrong");
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadStats();
      const interval = setInterval(loadStats, 10000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="admin-page">
        <div className="admin-card">
          <h1>🔒 Admin Access</h1>
          <p className="sub">Enter password to access admin controls</p>

          <form onSubmit={handleLogin} className="login-form">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            <button type="submit">Login</button>
          </form>

          {error && <p className="error">{error}</p>}

          <div className="hint">
            <small>Hint: Default password is "admin123"</small>
          </div>

          <a href="/" className="back-link">← Back to Queue</a>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-card large">
        <div className="header">
          <h1>⚙️ Admin Dashboard</h1>
          <button onClick={() => setIsAuthenticated(false)} className="logout-btn">
            Logout
          </button>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="stats-overview">
            <div className="stat-card">
              <div className="stat-label">In Queue</div>
              <div className="stat-value">{stats.waiting}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Served Today</div>
              <div className="stat-value">{stats.totalServedToday}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Capacity</div>
              <div className="stat-value">{stats.maxCapacity}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Avg Wait</div>
              <div className="stat-value">{stats.avgServiceTime}m</div>
            </div>
          </div>
        )}

        {/* Currently Serving */}
        {stats?.currentlyServing && (
          <div className="serving-box">
            <strong>Currently Serving:</strong> {stats.currentlyServing.name}
            <br />
            <small>Ticket: {stats.currentlyServing.ticket_number}</small>
          </div>
        )}

        {/* Messages */}
        {error && <div className="error">{error}</div>}
        {message && <div className="success">{message}</div>}

        {/* Queue Actions */}
        <div className="section">
          <h2>Queue Management</h2>
          <button onClick={serveNext} className="primary-btn">
            Serve Next Person
          </button>
          <button onClick={loadStats} className="secondary-btn">
            Refresh Stats
          </button>
        </div>

        {/* Settings */}
        <div className="section">
          <h2>Queue Settings</h2>
          <form onSubmit={updateSettings} className="settings-form">
            <div className="form-group">
              <label>Max Capacity</label>
              <input
                type="number"
                min="1"
                max="1000"
                value={settings.maxCapacity}
                onChange={(e) =>
                  setSettings({ ...settings, maxCapacity: parseInt(e.target.value) })
                }
              />
            </div>
            <div className="form-group">
              <label>Average Service Time (minutes)</label>
              <input
                type="number"
                min="1"
                max="60"
                value={settings.avgServiceTime}
                onChange={(e) =>
                  setSettings({ ...settings, avgServiceTime: parseInt(e.target.value) })
                }
              />
            </div>
            <button type="submit" className="primary-btn">
              Update Settings
            </button>
          </form>
        </div>

        {/* Waiting List */}
        {stats?.waitingList && stats.waitingList.length > 0 && (
          <div className="section">
            <h2>Current Queue ({stats.waitingList.length})</h2>
            <div className="queue-table">
              <table>
                <thead>
                  <tr>
                    <th>Pos</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Ticket</th>
                    <th>Est. Wait</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.waitingList.map((entry) => (
                    <tr key={entry.id}>
                      <td>#{entry.position}</td>
                      <td><strong>{entry.name}</strong></td>
                      <td>{entry.email || "—"}</td>
                      <td><code>{entry.ticket_number}</code></td>
                      <td>~{entry.estimated_wait_minutes}m</td>
                      <td>{new Date(entry.joined_at).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <a href="/" className="back-link">← Back to Queue</a>
      </div>
    </div>
  );
}
