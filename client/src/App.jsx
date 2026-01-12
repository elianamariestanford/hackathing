import { useEffect, useState } from "react";
import "./App.css";

export default function App() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [myTicket, setMyTicket] = useState(null);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "" });

  async function loadStats() {
    try {
      setErr("");
      setLoading(true);
      const res = await fetch("/api/queue/stats");
      if (!res.ok) throw new Error("Failed to load queue stats");
      const data = await res.json();
      setStats(data);
    } catch (e) {
      setErr(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function joinQueue(e) {
    e.preventDefault();
    try {
      setErr("");
      const res = await fetch("/api/queue/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to join");

      setMyTicket(data.ticket);
      setShowJoinForm(false);
      setFormData({ name: "", email: "" });
      await loadStats();
    } catch (e) {
      setErr(e.message || "Something went wrong");
    }
  }

  async function leaveQueue() {
    if (!myTicket) return;

    try {
      setErr("");
      const res = await fetch("/api/queue/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketNumber: myTicket.ticketNumber }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to leave");
      }

      setMyTicket(null);
      await loadStats();
    } catch (e) {
      setErr(e.message || "Something went wrong");
    }
  }

  useEffect(() => {
    loadStats();
    // Auto-refresh every 10 seconds
    const interval = setInterval(loadStats, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
    return (
      <div className="page">
        <div className="card">
          <h1>PongLine Queue</h1>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card">
        <h1>🏓 PongLine Queue</h1>
        <p className="sub">Advanced waitlist management with real-time tracking</p>

        {/* Queue Stats */}
        <div className="stats-grid">
          <div className="stat-box">
            <div className="stat-value">{stats?.waiting || 0}</div>
            <div className="stat-label">In Queue</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">{stats?.maxCapacity || 50}</div>
            <div className="stat-label">Max Capacity</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">{stats?.totalServedToday || 0}</div>
            <div className="stat-label">Served Today</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">{stats?.avgServiceTime || 5}m</div>
            <div className="stat-label">Avg Wait</div>
          </div>
        </div>

        {/* Currently Serving */}
        {stats?.currentlyServing && (
          <div className="serving-banner">
            <strong>Now Serving:</strong> {stats.currentlyServing.name}
            (Ticket: {stats.currentlyServing.ticket_number})
          </div>
        )}

        {/* Queue Full Warning */}
        {stats?.isFull && !myTicket && (
          <div className="warning">
            Queue is currently full ({stats.waiting}/{stats.maxCapacity})
          </div>
        )}

        {/* My Ticket Display */}
        {myTicket && (
          <div className="my-ticket">
            <h3>Your Ticket</h3>
            <div className="ticket-number">{myTicket.ticketNumber}</div>
            <div className="ticket-info">
              <p><strong>Position:</strong> #{myTicket.position}</p>
              <p><strong>Estimated Wait:</strong> ~{myTicket.estimatedWait} minutes</p>
              <p><strong>Name:</strong> {myTicket.name}</p>
            </div>
            <button onClick={leaveQueue} className="danger">Leave Queue</button>
          </div>
        )}

        {/* Error Display */}
        {err && <p className="error">{err}</p>}

        {/* Join Form */}
        {!myTicket && !showJoinForm && (
          <div className="buttons">
            <button
              onClick={() => setShowJoinForm(true)}
              disabled={stats?.isFull}
            >
              Join Queue
            </button>
            <button className="secondary" onClick={loadStats}>Refresh</button>
          </div>
        )}

        {showJoinForm && (
          <form onSubmit={joinQueue} className="join-form">
            <input
              type="text"
              placeholder="Your Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <input
              type="email"
              placeholder="Email (optional)"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <div className="form-buttons">
              <button type="submit">Join Queue</button>
              <button
                type="button"
                className="secondary"
                onClick={() => setShowJoinForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Waiting List */}
        {stats?.waitingList && stats.waitingList.length > 0 && (
          <div className="waiting-list">
            <h3>Current Queue ({stats.waitingList.length})</h3>
            <div className="queue-items">
              {stats.waitingList.slice(0, 10).map((entry) => (
                <div key={entry.id} className="queue-item">
                  <span className="position">#{entry.position}</span>
                  <span className="name">{entry.name}</span>
                  <span className="wait">~{entry.estimated_wait_minutes}m</span>
                </div>
              ))}
              {stats.waitingList.length > 10 && (
                <p className="more">...and {stats.waitingList.length - 10} more</p>
              )}
            </div>
          </div>
        )}

        <p className="fine">
          Data persists in SQLite database. Auto-refreshes every 10 seconds.
        </p>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <a href="/admin" style={{ color: '#999', fontSize: '12px', textDecoration: 'none' }}>
            Admin
          </a>
        </div>
      </div>
    </div>
  );
}

