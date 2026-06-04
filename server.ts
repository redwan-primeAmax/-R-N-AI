/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import AdmZip from "adm-zip";
import multer from "multer";

const upload = multer({ dest: 'uploads/' });

// Helper to find index.html recursively
function findIndexHtml(dir: string, base: string = ''): string | null {
  const files = fs.readdirSync(dir);
  
  // Look for index.html in current dir first
  if (files.some(f => f.toLowerCase() === 'index.html')) {
    const found = files.find(f => f.toLowerCase() === 'index.html');
    return path.join(base, found!);
  }

  // Look in subdirs
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      const found = findIndexHtml(fullPath, path.join(base, file));
      if (found) return found;
    }
  }

  return null;
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  const RUNTIME_PATH = path.join(process.cwd(), 'extension_runtime');
  const UPLOADS_PATH = path.join(process.cwd(), 'uploads');

  // Ensure directories exist
  [RUNTIME_PATH, UPLOADS_PATH].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  app.use(express.json({ limit: '50mb' }));
  
  // Static host for the modules
  app.use('/runtime', express.static(RUNTIME_PATH));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Extension Deployment API
  app.post("/api/extensions/deploy", upload.single('zip'), (req: any, res: any) => {
    try {
      if (!req.file) throw new Error("No zip file provided");
      
      const zipPath = req.file.path;
      
      // Cleanup previous runtime content
      fs.rmSync(RUNTIME_PATH, { recursive: true, force: true });
      fs.mkdirSync(RUNTIME_PATH, { recursive: true });

      const zip = new AdmZip(zipPath);
      zip.extractAllTo(RUNTIME_PATH, true);
      
      // Cleanup the uploaded temp zip manually
      if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

      // Find actual index.html path
      const indexPath = findIndexHtml(RUNTIME_PATH);
      if (!indexPath) throw new Error("ZIP ফাইলের ভেতর কোনো index.html পাওয়া যায়নি।");

      // Inject <base> tag into index.html for correct asset resolution
      const fullIndexPath = path.join(RUNTIME_PATH, indexPath);
      const indexDir = path.dirname(indexPath);
      const baseHref = indexDir === '.' ? '/runtime/' : `/runtime/${indexDir}/`;
      
      let html = fs.readFileSync(fullIndexPath, 'utf8');
      if (!html.includes('<base')) {
        html = html.replace('<head>', `<head>\n    <base href="${baseHref}">`);
        fs.writeFileSync(fullIndexPath, html);
      }

      // Return the launch URL
      res.json({ success: true, url: `/runtime/${indexPath}` });
    } catch (err: any) {
      console.error("Deploy Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Proxy for remote zip (MediaFire, etc)
  app.get("/api/extensions/proxy", async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url) return res.status(400).send("URL required");
      
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch remote module. Please provide a direct download link.");
      
      const buffer = await response.arrayBuffer();
      
      if (!fs.existsSync(UPLOADS_PATH)) {
        fs.mkdirSync(UPLOADS_PATH, { recursive: true });
      }
      
      const tempPath = path.join(UPLOADS_PATH, `remote_${Date.now()}.zip`);
      fs.writeFileSync(tempPath, Buffer.from(buffer));
      
      // Cleanup runtime
      fs.rmSync(RUNTIME_PATH, { recursive: true, force: true });
      fs.mkdirSync(RUNTIME_PATH, { recursive: true });

      const zip = new AdmZip(tempPath);
      zip.extractAllTo(RUNTIME_PATH, true);
      
      fs.unlinkSync(tempPath);

      const indexPath = findIndexHtml(RUNTIME_PATH);
      if (!indexPath) throw new Error("ZIP ফাইলের ভেতর কোনো index.html পাওয়া যায়নি।");

      // Inject <base> tag
      const fullIndexPath = path.join(RUNTIME_PATH, indexPath);
      const indexDir = path.dirname(indexPath);
      const baseHref = indexDir === '.' ? '/runtime/' : `/runtime/${indexDir}/`;
      
      let html = fs.readFileSync(fullIndexPath, 'utf8');
      if (!html.includes('<base')) {
        html = html.replace('<head>', `<head>\n    <base href="${baseHref}">`);
        fs.writeFileSync(fullIndexPath, html);
      }

      res.json({ success: true, url: `/runtime/${indexPath}` });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Gemini Proxy Route
  app.post("/api/ai/gemini", async (req: express.Request, res: express.Response) => {
    try {
      const { model, contents, generationConfig } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: { message: "Server Gemini API Key is missing. Please define GEMINI_API_KEY." } });
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-flash'}:streamGenerateContent?alt=sse&key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: generationConfig || { temperature: 0.7, maxOutputTokens: 8192 }
        })
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: { message: errorText || `Gemini proxy error status: ${response.status}` } };
        }
        return res.status(response.status).json(errorData);
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      if (response.body) {
        // @ts-ignore
        for await (const chunk of response.body) {
          res.write(chunk);
        }
      }
      res.end();
    } catch (err: any) {
      console.error("Gemini Proxy Route Error:", err);
      res.status(500).json({ error: { message: err.message || "Internal server error" } });
    }
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

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
