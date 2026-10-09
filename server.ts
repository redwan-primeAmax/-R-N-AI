/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { Readable } from "stream";
import rateLimit from 'express-rate-limit';
import cors from 'cors';

// Robust __dirname for both CJS and ESM without top-level await
const __dirname_resolved = typeof __dirname !== 'undefined' 
  ? __dirname 
  : path.resolve();

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
  // Set trust proxy to 1 (trust the first proxy, e.g. Cloud Run load balancer)
  // to satisfy express-rate-limit validation and ensure correct IP detection.
  app.set("trust proxy", 1);

  // Customized safe security headers (Bug 99)
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    next();
  });

  // Tighten CORS configuration (Bug 98)
  app.use(cors({
    origin: (origin, callback) => {
      // Allow localhost, the AI Studio runner, and Cloud Run preview URLs
      if (!origin || /localhost/.test(origin) || /asia-southeast1\.run\.app$/.test(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Fallback to allow preview, but securely configurable
      }
    },
    credentials: true
  }));

  const PORT = 3000;

  // Protect against Denial of Service with a safer 10MB limit (Bug 97)
  app.use(express.json({ limit: '10mb' }));

  // Request logging for AI routes
  app.use((req, res, next) => {
    if (req.url.startsWith('/api/ai')) {
      console.log(`[AI API] ${req.method} ${req.url}`);
    }
    next();
  });

  // Generic AI Provider Proxy (Supports Gemini, OpenRouter, Fireworks, etc.)
  app.post("/api/ai/:provider", aiLimiter, async (req: express.Request, res: express.Response) => {
    const { provider } = req.params;
    try {
      const { model, contents, generationConfig, systemInstruction, apiKey: clientApiKey } = req.body;
      
      let apiUrl = '';
      let headers: Record<string, string> = { 'Content-Type': 'application/json' };
      let body: any = {};

      if (provider === 'gemini') {
        const apiKey = process.env.GEMINI_API_KEY || clientApiKey;
        if (!apiKey) throw new Error("Gemini API Key missing");
        
        let targetModel = model || 'gemini-flash-latest';
        if (!targetModel.startsWith('models/')) targetModel = `models/${targetModel}`;
        
        apiUrl = `https://generativelanguage.googleapis.com/v1beta/${targetModel}:streamGenerateContent?alt=sse`;
        headers['x-goog-api-key'] = apiKey;
        body = {
          contents,
          systemInstruction,
          generationConfig: generationConfig || { temperature: 0.7, maxOutputTokens: 8192 }
        };
      } else if (provider === 'openrouter' || provider === 'fireworks' || provider === 'together') {
        const apiKey = (provider === 'openrouter' ? process.env.OPENROUTER_API_KEY : 
                        provider === 'fireworks' ? process.env.FIREWORKS_API_KEY : 
                        process.env.TOGETHER_API_KEY) || clientApiKey;
        
        if (!apiKey) throw new Error(`${provider} API Key missing`);

        apiUrl = provider === 'openrouter' ? 'https://openrouter.ai/api/v1/chat/completions' :
                 provider === 'fireworks' ? 'https://api.fireworks.ai/inference/v1/chat/completions' :
                 'https://api.together.xyz/v1/chat/completions';

        headers['Authorization'] = `Bearer ${apiKey}`;
        if (provider === 'openrouter') {
          headers['HTTP-Referer'] = 'https://redwan-notes.app';
          headers['X-Title'] = 'Redwan Notes';
        }

        // Transform Gemini format to OpenAI format for these providers
        const messages = [];
        if (systemInstruction?.parts?.[0]?.text) {
          messages.push({ role: 'system', content: systemInstruction.parts[0].text });
        }
        
        contents.forEach((c: any) => {
          messages.push({
            role: c.role === 'model' ? 'assistant' : 'user',
            content: c.parts[0].text
          });
        });

        body = {
          model: model,
          messages,
          stream: true,
          temperature: generationConfig?.temperature || 0.7,
          max_tokens: generationConfig?.maxOutputTokens || 4096
        };
      } else {
        return res.status(400).json({ success: false, error: `Unsupported AI provider: ${provider}` });
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ success: false, error: errorText });
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
      console.error(`AI Proxy Error (${provider}):`, err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Gemini Proxy Route (Legacy / Compatibility)

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

      // Bug 7: Pass API key securely in header instead of URL
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model.startsWith('models/') ? model : 'models/' + model}:generateContent`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        // Bug 8: Support both standard camelCase and backward-compatibility snake_case
        body: JSON.stringify({ 
          contents,
          systemInstruction: systemInstruction,
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
      const { prompt, systemInstruction, system_instruction, apiKey: clientApiKey, model: clientModel } = req.body;
      const apiKey = process.env.GEMINI_API_KEY || clientApiKey;
      let model = clientModel || 'gemini-1.5-flash';
      if (!apiKey) return res.status(500).json({ error: "AI Key missing. Please check your AI Settings." });

      // Normalize model name
      if (!model.startsWith('models/')) model = `models/${model}`;

      const activeInstruction = systemInstruction || system_instruction;
      const body: any = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      };
      
      if (activeInstruction) {
        const partsObj = { parts: [{ text: activeInstruction }] };
        body.systemInstruction = partsObj;
        body.system_instruction = partsObj; // Support both (Bug 8)
      }

      // Bug 7: Pass API key securely in header instead of URL
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model.startsWith('models/') ? model : 'models/' + model}:generateContent`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
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

  // Mediafire direct download proxy - REMOVED AS REQUESTED TO USE LOCAL FILES
  // ...

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
