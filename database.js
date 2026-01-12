import Database from "better-sqlite3";

// Initialize database
const db = new Database("waitlist.db");

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS queue_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    ticket_number TEXT UNIQUE NOT NULL,
    position INTEGER NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'waiting',
    served_at DATETIME,
    estimated_wait_minutes INTEGER
  );

  CREATE TABLE IF NOT EXISTS queue_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    max_capacity INTEGER DEFAULT 50,
    avg_service_time_minutes INTEGER DEFAULT 5,
    currently_serving_id INTEGER,
    total_served_today INTEGER DEFAULT 0,
    FOREIGN KEY (currently_serving_id) REFERENCES queue_entries(id)
  );

  -- Initialize settings if not exists
  INSERT OR IGNORE INTO queue_settings (id, max_capacity, avg_service_time_minutes, total_served_today)
  VALUES (1, 50, 20, 0);
`);

// Helper function to generate ticket number
function generateTicketNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${timestamp}-${random}`;
}

// Database operations
export const dbOps = {
  // Get current queue stats
  getQueueStats() {
    const settings = db.prepare("SELECT * FROM queue_settings WHERE id = 1").get();
    const waitingCount = db.prepare("SELECT COUNT(*) as count FROM queue_entries WHERE status = 'waiting'").get();
    const currentlyServing = settings.currently_serving_id
      ? db.prepare("SELECT * FROM queue_entries WHERE id = ?").get(settings.currently_serving_id)
      : null;

    return {
      waiting: waitingCount.count,
      maxCapacity: settings.max_capacity,
      avgServiceTime: settings.avg_service_time_minutes,
      totalServedToday: settings.total_served_today,
      currentlyServing,
      isFull: waitingCount.count >= settings.max_capacity,
    };
  },

  // Join the queue
  joinQueue(name, email = null) {
    const stats = this.getQueueStats();

    if (stats.isFull) {
      throw new Error("Queue is full. Please try again later.");
    }

    const ticketNumber = generateTicketNumber();
    const position = stats.waiting + 1;
    const estimatedWait = position * stats.avgServiceTime;

    const stmt = db.prepare(`
      INSERT INTO queue_entries (name, email, ticket_number, position, estimated_wait_minutes)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(name, email, ticketNumber, position, estimatedWait);

    return {
      id: result.lastInsertRowid,
      ticketNumber,
      position,
      estimatedWait,
      name,
      email,
    };
  },

  // Get all waiting entries
  getWaitingEntries() {
    return db.prepare("SELECT * FROM queue_entries WHERE status = 'waiting' ORDER BY position ASC").all();
  },

  // Find entry by ticket number
  findByTicket(ticketNumber) {
    return db.prepare("SELECT * FROM queue_entries WHERE ticket_number = ?").get(ticketNumber);
  },

  // Remove from queue by ticket number
  leaveQueue(ticketNumber) {
    const entry = this.findByTicket(ticketNumber);
    if (!entry) {
      throw new Error("Ticket not found");
    }

    if (entry.status !== 'waiting') {
      throw new Error("Cannot leave queue - already served or not in queue");
    }

    // Delete the entry
    db.prepare("DELETE FROM queue_entries WHERE ticket_number = ?").run(ticketNumber);

    // Reposition remaining entries
    db.prepare("UPDATE queue_entries SET position = position - 1 WHERE position > ? AND status = 'waiting'")
      .run(entry.position);

    // Update estimated wait times
    this.updateWaitTimes();

    return { success: true };
  },

  // Serve next person in queue
  serveNext() {
    const next = db.prepare("SELECT * FROM queue_entries WHERE status = 'waiting' ORDER BY position ASC LIMIT 1").get();

    if (!next) {
      return null;
    }

    // Mark as served
    db.prepare("UPDATE queue_entries SET status = 'served', served_at = CURRENT_TIMESTAMP WHERE id = ?").run(next.id);

    // Update settings
    db.prepare("UPDATE queue_settings SET currently_serving_id = ?, total_served_today = total_served_today + 1 WHERE id = 1")
      .run(next.id);

    // Reposition remaining entries
    db.prepare("UPDATE queue_entries SET position = position - 1 WHERE position > ? AND status = 'waiting'")
      .run(next.position);

    // Update wait times
    this.updateWaitTimes();

    return next;
  },

  // Update estimated wait times for all waiting entries
  updateWaitTimes() {
    const settings = db.prepare("SELECT avg_service_time_minutes FROM queue_settings WHERE id = 1").get();
    const waiting = this.getWaitingEntries();

    waiting.forEach((entry) => {
      const estimatedWait = entry.position * settings.avg_service_time_minutes;
      db.prepare("UPDATE queue_entries SET estimated_wait_minutes = ? WHERE id = ?")
        .run(estimatedWait, entry.id);
    });
  },

  // Update settings
  updateSettings(maxCapacity, avgServiceTime) {
    db.prepare("UPDATE queue_settings SET max_capacity = ?, avg_service_time_minutes = ? WHERE id = 1")
      .run(maxCapacity, avgServiceTime);

    this.updateWaitTimes();
  },

  // Reset daily stats (could be called by a cron job)
  resetDailyStats() {
    db.prepare("UPDATE queue_settings SET total_served_today = 0, currently_serving_id = NULL WHERE id = 1").run();
  },

  // Clear old served entries (keep only last 7 days)
  cleanupOldEntries() {
    db.prepare("DELETE FROM queue_entries WHERE status = 'served' AND served_at < datetime('now', '-7 days')").run();
  },
};

export default db;
