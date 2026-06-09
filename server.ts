/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

// Rate limiter for AI routes
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: { message: "Too many requests from this IP, please try again after 15 minutes." } },
  standardHeaders: true,
  legacyHeaders: false,
});

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
  app.set("trust proxy", true); 
  app.use(cors());
  const PORT = 3000;

  app.use(express.json({ limit: '100mb' }));

  // Request logging for AI routes
  app.use((req, res, next) => {
    if (req.url.startsWith('/api/ai')) {
      console.log(`[AI API] ${req.method} ${req.url}`);
    }
    next();
  });

  // Gemini Proxy Route
  app.post("/api/ai/gemini", aiLimiter, async (req: express.Request, res: express.Response) => {
    try {
      const { model: clientModel, contents, generationConfig, apiKey: clientApiKey } = req.body;
      const apiKey = process.env.GEMINI_API_KEY || clientApiKey;
      let model = clientModel || 'gemini-1.5-flash';
      if (!model.startsWith('models/')) model = `models/${model}`;

      if (!apiKey) {
        return res.status(500).json({ 
          success: false, 
          error: { message: "Server Gemini API Key is missing. Please confirm configuring your API settings in the app.", code: "SERVER_CONFIG_ERROR" } 
        });
      }

      if (!contents || !Array.isArray(contents)) {
        return res.status(400).json({ 
          success: false, 
          error: { message: "Invalid request: missing or malformed 'contents'.", code: "INVALID_REQUEST" } 
        });
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model}:streamGenerateContent?alt=sse&key=${apiKey}`, {
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
          errorData = { error: { message: errorText || `Gemini proxy error status: ${response.status}`, code: "UPSTREAM_ERROR" } };
        }
        return res.status(response.status).json({ success: false, ...errorData });
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
      res.status(500).json({ 
        success: false, 
        error: { message: err.message || "Internal server error", code: "INTERNAL_SERVER_ERROR" } 
      });
    }
  });

  // Simple AI Chat Endpoint (non-streaming, used by extensions)
  app.post("/api/ai/chat", aiLimiter, async (req: express.Request, res: express.Response) => {
    try {
      const { messages, apiKey: clientApiKey, model: clientModel } = req.body;
      const apiKey = process.env.GEMINI_API_KEY || clientApiKey;
      let model = clientModel || 'gemini-1.5-flash';
      if (!apiKey) return res.status(500).json({ error: "AI Key missing. Please check your AI Settings." });

      // Normalize model name
      if (!model.startsWith('models/')) model = `models/${model}`;

      // Separate system messages and conversation contents
      const systemMessages = messages.filter((m: any) => m.role === 'system');
      const chatMessages = messages.filter((m: any) => m.role !== 'system');
      
      const systemInstruction = systemMessages.length > 0 
        ? { parts: [{ text: systemMessages.map((m: any) => m.content || m.text).join('\n') }] }
        : undefined;

      // Transform messages into Gemini format
      const contents = chatMessages.map((m: any) => ({
        role: (m.role === 'assistant' || m.role === 'model') ? 'model' : 'user',
        parts: [{ text: m.content || m.text || '' }]
      }));

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model.startsWith('models/') ? model : 'models/' + model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents,
          system_instruction: systemInstruction
        })
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        console.error(`Gemini Chat API Error (${response.status}):`, errorText);
        try {
          return res.status(response.status).json(JSON.parse(errorText));
        } catch {
          return res.status(response.status).json({ error: { message: errorText } });
        }
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      res.json({ content: text });
    } catch (err: any) {
      console.error("AI Chat Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // General AI Proxy (used by extensions for more control)
  app.post("/api/ai/proxy", aiLimiter, async (req: express.Request, res: express.Response) => {
    try {
      const { prompt, systemInstruction, apiKey: clientApiKey, model: clientModel } = req.body;
      const apiKey = process.env.GEMINI_API_KEY || clientApiKey;
      let model = clientModel || 'gemini-1.5-flash';
      if (!apiKey) return res.status(500).json({ error: "AI Key missing. Please check your AI Settings." });

      // Normalize model name
      if (!model.startsWith('models/')) model = `models/${model}`;

      const body: any = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      };
      
      if (systemInstruction) {
        body.system_instruction = { parts: [{ text: systemInstruction }] };
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model.startsWith('models/') ? model : 'models/' + model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        console.error(`Gemini Proxy API Error (${response.status}):`, errorText);
        try {
          return res.status(response.status).json(JSON.parse(errorText));
        } catch {
          return res.status(response.status).json({ error: { message: errorText } });
        }
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      res.json({ text });
    } catch (err: any) {
      console.error("AI Proxy Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Route to download extensions spec
  app.get("/api/docs/spec", (req, res) => {
    const filePath = path.join(process.cwd(), "docs", "EXTENSIONS_SPEC.md");
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Disposition', 'attachment; filename="EXTENSIONS_SPEC.md"');
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: "Specification file not found" });
    }
  });

  // End point for dev logs
  app.get("/api/dev/logs", (req, res) => {
    res.json(devLogs);
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
      const htmlPath = path.join(distPath, 'index.html');
      if (fs.existsSync(htmlPath)) {
        let html = fs.readFileSync(htmlPath, 'utf8');
        html = injectBaseTag(html, '/');
        res.send(html);
      } else {
        res.status(404).send('Not Found');
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
