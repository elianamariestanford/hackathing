import express from "express";
import cors from "cors";
import { dbOps } from "./database.js";

const app = express();
app.use(cors());
app.use(express.json());

// Get queue statistics and current state
app.get("/api/queue/stats", (req, res) => {
  try {
    const stats = dbOps.getQueueStats();
    const waiting = dbOps.getWaitingEntries();
    res.json({
      ...stats,
      waitingList: waiting,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Join the queue
app.post("/api/queue/join", (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: "Name is required" });
    }

    const entry = dbOps.joinQueue(name.trim(), email?.trim() || null);
    res.json({
      success: true,
      ticket: entry,
      message: `Welcome ${name}! Your position is #${entry.position}`,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Leave the queue
app.post("/api/queue/leave", (req, res) => {
  try {
    const { ticketNumber } = req.body;

    if (!ticketNumber) {
      return res.status(400).json({ error: "Ticket number is required" });
    }

    dbOps.leaveQueue(ticketNumber);
    res.json({
      success: true,
      message: "You have left the queue",
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Check status of a specific ticket
app.get("/api/queue/ticket/:ticketNumber", (req, res) => {
  try {
    const { ticketNumber } = req.params;
    const entry = dbOps.findByTicket(ticketNumber);

    if (!entry) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    res.json(entry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve next person (admin function)
app.post("/api/queue/serve-next", (req, res) => {
  try {
    const served = dbOps.serveNext();

    if (!served) {
      return res.json({
        success: false,
        message: "No one in queue",
      });
    }

    res.json({
      success: true,
      served,
      message: `Now serving: ${served.name}`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update queue settings (admin function)
app.post("/api/queue/settings", (req, res) => {
  try {
    const { maxCapacity, avgServiceTime } = req.body;

    if (maxCapacity !== undefined && (maxCapacity < 1 || maxCapacity > 1000)) {
      return res.status(400).json({ error: "Max capacity must be between 1 and 1000" });
    }

    if (avgServiceTime !== undefined && (avgServiceTime < 1 || avgServiceTime > 60)) {
      return res.status(400).json({ error: "Average service time must be between 1 and 60 minutes" });
    }

    dbOps.updateSettings(
      maxCapacity || 50,
      avgServiceTime || 5
    );

    res.json({
      success: true,
      message: "Settings updated",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Legacy endpoints for backward compatibility
app.get("/api/waitlist", (req, res) => {
  try {
    const stats = dbOps.getQueueStats();
    res.json({ count: stats.waiting });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`Database initialized with queue management features`);
});
