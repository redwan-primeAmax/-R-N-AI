/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize SQLite
  const db = new Database("published_notes.db");
  db.exec(`
    CREATE TABLE IF NOT EXISTS published_notes (
      id TEXT PRIMARY KEY,
      title TEXT,
      content TEXT,
      emoji TEXT,
      createdAt INTEGER,
      updatedAt INTEGER
    )
  `);

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.post("/api/publish", (req, res) => {
    console.log("POST /api/publish", req.body?.title);
    const { title, content, emoji, createdAt, updatedAt } = req.body;
    const id = crypto.randomBytes(4).toString('hex').toUpperCase(); // Short readable ID
    
    try {
      const stmt = db.prepare("INSERT INTO published_notes (id, title, content, emoji, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)");
      stmt.run(id, title, content, emoji, createdAt, updatedAt);
      console.log("Published note with ID:", id);
      res.json({ success: true, id });
    } catch (error) {
      console.error("Publish error:", error);
      res.status(500).json({ success: false, error: "Failed to publish note" });
    }
  });

  app.get("/api/import/:id", (req, res) => {
    const { id } = req.params;
    console.log("GET /api/import/", id);
    try {
      const stmt = db.prepare("SELECT * FROM published_notes WHERE id = ?");
      const note = stmt.get(id.toUpperCase());
      if (note) {
        console.log("Found note for ID:", id);
        res.json({ success: true, note });
      } else {
        console.log("Note not found for ID:", id);
        res.status(404).json({ success: false, error: "Note not found" });
      }
    } catch (error) {
      console.error("Import error:", error);
      res.status(500).json({ success: false, error: "Failed to import note" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
