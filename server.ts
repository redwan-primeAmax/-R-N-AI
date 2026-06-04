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
  const RUNTIME_BASE = path.join(process.cwd(), 'runtime_sessions');
  const UPLOADS_PATH = path.join(process.cwd(), 'uploads');

  // Ensure directories exist
  [RUNTIME_BASE, UPLOADS_PATH].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  app.use(express.json({ limit: '50mb' }));

  // Middleware to fix absolute path requests from extensions
  app.use((req, res, next) => {
    const referer = req.get('Referer');
    if (referer && referer.includes('/runtime/')) {
      const match = referer.match(/\/runtime\/([^\/]+)\//);
      if (match && !req.url.startsWith('/runtime/') && !req.url.startsWith('/api/')) {
        const sessionId = match[1];
        
        // 1. Try resolving relative to the session root
        const sessionRootPath = path.join(RUNTIME_BASE, sessionId, req.url);
        if (fs.existsSync(sessionRootPath) && fs.statSync(sessionRootPath).isFile()) {
           return res.sendFile(sessionRootPath);
        }

        // 2. Try resolving relative to the index.html directory (baseDir)
        const sessionInfo = (app as any)._sessions?.[sessionId];
        if (sessionInfo?.baseDir) {
          const baseDirPath = path.join(RUNTIME_BASE, sessionId, sessionInfo.baseDir, req.url);
          if (fs.existsSync(baseDirPath) && fs.statSync(baseDirPath).isFile()) {
             return res.sendFile(baseDirPath);
          }
        }
      }
    }
    next();
  });
  
  // Static host for the modules
  app.use('/runtime', express.static(RUNTIME_BASE));

  // Extension Interaction API (Add to my collection)
  app.post("/api/add-extension", (req, res) => {
    try {
      const extensionData = req.body;
      console.log("Extension adding requested:", extensionData.id);
      // For now, we return success. In a real persistence layer, this would be saved to a database.
      res.json({ success: true, message: `${extensionData.name} added to your workspace.` });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Extension Deployment API (Optimized with Session)
  app.post("/api/extensions/deploy", upload.single('zip'), (req: any, res: any) => {
    try {
      if (!req.file) throw new Error("No zip file provided");
      
      const sessionId = `ext_${Date.now()}`;
      const sessionPath = path.join(RUNTIME_BASE, sessionId);
      fs.mkdirSync(sessionPath, { recursive: true });

      const zip = new AdmZip(req.file.path);
      zip.extractAllTo(sessionPath, true);
      
      // Cleanup the uploaded temp zip manually
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

      // Find actual index.html path
      const indexPath = findIndexHtml(sessionPath);
      if (!indexPath) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
        throw new Error("ZIP ফাইলের ভেতর কোনো index.html পাওয়া যায়নি।");
      }

      // Inject <base> tag into index.html for correct asset resolution
      const fullIndexPath = path.join(sessionPath, indexPath);
      const indexDir = path.dirname(indexPath);
      const baseHref = indexDir === '.' ? `/runtime/${sessionId}/` : `/runtime/${sessionId}/${indexDir}/`;
      
      let html = fs.readFileSync(fullIndexPath, 'utf8');
      if (!html.includes('<base')) {
        html = html.replace('<head>', `<head>\n    <base href="${baseHref}">`);
        fs.writeFileSync(fullIndexPath, html);
      }

      // Store session metadata (like index directory) for better routing
      (app as any)._sessions = (app as any)._sessions || {};
      (app as any)._sessions[sessionId] = { 
        baseDir: indexDir === '.' ? '' : indexDir 
      };

      // Return the launch URL with session
      res.json({ success: true, url: `/runtime/${sessionId}/${indexPath}`, sessionId });
    } catch (err: any) {
      console.error("Deploy Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Proxy for remote zip (Optimized with Session)
  app.get("/api/extensions/proxy", async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url) return res.status(400).send("URL required");
      
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch remote module. Please provide a direct download link.");
      
      const buffer = await response.arrayBuffer();
      const sessionId = `ext_${Date.now()}`;
      const sessionPath = path.join(RUNTIME_BASE, sessionId);
      const tempZip = path.join(UPLOADS_PATH, `${sessionId}.zip`);
      
      fs.mkdirSync(sessionPath, { recursive: true });
      fs.writeFileSync(tempZip, Buffer.from(buffer));
      
      const zip = new AdmZip(tempZip);
      zip.extractAllTo(sessionPath, true);
      fs.unlinkSync(tempZip);

      const indexPath = findIndexHtml(sessionPath);
      if (!indexPath) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
        throw new Error("ZIP ফাইলের ভেতর কোনো index.html পাওয়া যায়নি।");
      }

      // Inject <base> tag
      const fullIndexPath = path.join(sessionPath, indexPath);
      const indexDir = path.dirname(indexPath);
      const baseHref = indexDir === '.' ? `/runtime/${sessionId}/` : `/runtime/${sessionId}/${indexDir}/`;
      
      let html = fs.readFileSync(fullIndexPath, 'utf8');
      if (!html.includes('<base')) {
        html = html.replace('<head>', `<head>\n    <base href="${baseHref}">`);
        fs.writeFileSync(fullIndexPath, html);
      }

      // Store session metadata
      (app as any)._sessions = (app as any)._sessions || {};
      (app as any)._sessions[sessionId] = { 
        baseDir: indexDir === '.' ? '' : indexDir 
      };

      res.json({ success: true, url: `/runtime/${sessionId}/${indexPath}`, sessionId });
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
