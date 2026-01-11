import { useEffect, useState } from "react";
import "./App.css";

export default function App() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function loadCount() {
    try {
      setErr("");
      setLoading(true);
      const res = await fetch("/api/waitlist");
      if (!res.ok) throw new Error("Failed to load waitlist");
      const data = await res.json();
      setCount(data.count);
    } catch (e) {
      setErr(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function join() {
    try {
      setErr("");
      const res = await fetch("/api/waitlist/join", { method: "POST" });
      if (!res.ok) throw new Error("Failed to join");
      const data = await res.json();
      setCount(data.count);
    } catch (e) {
      setErr(e.message || "Something went wrong");
    }
  }

  async function leave() {
    try {
      setErr("");
      const res = await fetch("/api/waitlist/leave", { method: "POST" });
      if (!res.ok) throw new Error("Failed to leave");
      const data = await res.json();
      setCount(data.count);
    } catch (e) {
      setErr(e.message || "Something went wrong");
    }
  }

  useEffect(() => {
    loadCount();
  }, []);

  return (
    <div className="page">
      <div className="card">
        <h1>PongLine</h1>
        <p className="sub">React/Vite frontend + Express backend waitlist counter</p>

        <div className="countBox">
          <div className="count">{loading ? "…" : count}</div>
          <div className="label">people on the waitlist</div>
        </div>

        {err && <p className="error">{err}</p>}

        <div className="buttons">
          <button onClick={join} disabled={loading}>Join</button>
          <button onClick={leave} disabled={loading}>Leave</button>
          <button className="secondary" onClick={loadCount}>Refresh</button>
        </div>

        <p className="fine">
          Backend stores a simple in-memory counter (resets when server restarts).
        </p>
      </div>
    </div>
  );
}

