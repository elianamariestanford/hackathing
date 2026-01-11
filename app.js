import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

let count = 0; // in-memory for now (resets when server restarts)

app.get("/api/waitlist", (req, res) => {
  res.json({ count });
});

app.post("/api/waitlist/join", (req, res) => {
  count += 1;
  res.json({ count });
});

app.post("/api/waitlist/leave", (req, res) => {
  count = Math.max(0, count - 1);
  res.json({ count });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
