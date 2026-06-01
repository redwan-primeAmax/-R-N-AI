/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

// Safe path resolution for both ESM (development) and CommonJS (production bundle)
let currentFilename = "";
let currentDirname = process.cwd();

try {
  // Try using ESM's import.meta if available and has a url property.
  // We safe-guard access to avoid runtime exceptions in CJS bundles.
  const metaObj = (import.meta as any) || {};
  if (metaObj.url) {
    currentFilename = fileURLToPath(metaObj.url);
    currentDirname = path.dirname(currentFilename);
  }
} catch (e) {
  // Fallback to standard CJS globals if present and check execution contexts safely
}

if (!currentFilename && typeof __filename !== "undefined") {
  currentFilename = __filename;
}
if (typeof __dirname !== "undefined") {
  currentDirname = __dirname;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Catch-all for /api routes to return JSON 404 instead of HTML
  app.all("/api/*", (req, res) => {
    res.status(404).json({ success: false, error: `API route not found: ${req.method} ${req.url}` });
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
