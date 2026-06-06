/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

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

// Robustly inject <base> tag into html
function injectBaseTag(html: string, baseHref: string): string {
  // If there's already some variation of <base href=, don't overwrite it
  if (/<base\s+href=/i.test(html)) {
    return html;
  }

  const baseTag = `<base href="${baseHref}">`;

  // 1. Try case-insensitive <head>
  if (/<head>/i.test(html)) {
    return html.replace(/<head>/i, (match) => `${match}\n    ${baseTag}`);
  }

  // 2. Try case-insensitive <html>
  if (/<html>/i.test(html)) {
    return html.replace(/<html>/i, (match) => `${match}\n    <head>${baseTag}</head>`);
  }

  // 3. Try case-insensitive <!doctype html>
  if (/<!doctype\s+html>/i.test(html)) {
    return html.replace(/<!doctype\s+html>/i, (match) => `${match}\n<head>${baseTag}</head>`);
  }

  // 4. Otherwise, prepend to the very beginning of the html content
  return `<head>${baseTag}</head>\n` + html;
}

interface DevLog {
  time: string;
  type: "info" | "warn" | "error";
  msg: string;
}
const devLogs: DevLog[] = [];
function addDevLog(type: "info" | "warn" | "error", msg: string) {
  const log: DevLog = {
    time: new Date().toLocaleTimeString(),
    type,
    msg
  };
  devLogs.push(log);
  if (devLogs.length > 200) {
    devLogs.shift();
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

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
