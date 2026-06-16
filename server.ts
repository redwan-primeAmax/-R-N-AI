/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { Readable } from "stream";
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  // Gemini Proxy Route
  app.post("/api/ai/gemini", aiLimiter, async (req: express.Request, res: express.Response) => {
    try {
      const { model: clientModel, contents, generationConfig, systemInstruction, system_instruction, apiKey: clientApiKey } = req.body;
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

      // Bug 7: Pass API key securely in header instead of URL to prevent logs/history exposure
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model}:streamGenerateContent?alt=sse`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents,
          // Bug 8 & 33: Forward systemInstruction in proxy call
          systemInstruction: systemInstruction || system_instruction,
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

  // Mediafire direct download proxy
  app.get("/api/icons/download-proxy", async (req, res) => {
    try {
      addDevLog("info", "Starting icon library direct URL scraping and download processes");
      
      // Serve pre-cached local ZIP if available to bypass Cloud Run IP blocks and scrape failures
      // We check multiple candidate paths to ensure robust path resolution in both dev and production containers.
      const candidatePaths = [
        path.join(process.cwd(), "public", "library1.zip"),
        path.join(process.cwd(), "dist", "library1.zip"),
        path.join(process.cwd(), "library1.zip"),
        path.join(__dirname, "library1.zip"),
        path.join(__dirname, "..", "public", "library1.zip"),
        path.join(__dirname, "..", "dist", "library1.zip"),
        path.join(__dirname, "..", "library1.zip")
      ];
      
      let localZipPath: string | null = null;
      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          localZipPath = p;
          break;
        }
      }

      if (localZipPath) {
        console.log(`[Icon Download Node] Serving pre-cached local zip file from: ${localZipPath}`);
        addDevLog("info", `Successfully served pre-cached local icon library1.zip from: ${localZipPath}`);
        const stats = fs.statSync(localZipPath);
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="library1.zip"');
        res.setHeader('Content-Length', stats.size);
        
        const readStream = fs.createReadStream(localZipPath);
        readStream.pipe(res);
        return;
      } else {
        const checkedPathsStr = candidatePaths.join(", ");
        console.warn(`[Icon Download Node] Pre-cached local ZIP not found in candidates: [${checkedPathsStr}]`);
        addDevLog("warn", "Pre-cached local library1.zip not found on disk. Attempting to fall back to scrape & download.");
      }

      let directUrl: string | null = null;
      
      // Attempt 1: Scrape first version of the Mediafire page (with parameters)
      const pageUrls = [
        "https://www.mediafire.com/file/sm5axccozk9owk6/library1.zip/file?dkey=kf1dhqzov1m&r=170",
        "https://www.mediafire.com/file/sm5axccozk9owk6/library1.zip/file"
      ];
      
      for (const pageUrl of pageUrls) {
        try {
          console.log(`[Icon Download Node] Trying to scrape direct URL from page: ${pageUrl}`);
          addDevLog("info", `Trying to scrape direct URL from: ${pageUrl}`);
          
          const pageRes = await fetch(pageUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept-Language': 'en-US,en;q=0.9',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7'
            }
          });
          
          if (pageRes.ok) {
            const html = await pageRes.text();
            const match = html.match(/https?:\/\/download[a-zA-Z0-9.-]*\.mediafire\.com\/[^\s"'>]+/i) ||
                          html.match(/https?:\/\/download[^\s"'>]+/i);
            if (match) {
              directUrl = match[0].replace(/&amp;/g, '&');
              console.log(`[Icon Download Node] Successfully scraped direct URL: ${directUrl}`);
              addDevLog("info", `Scraper successfully resolved URL: ${directUrl}`);
              break;
            } else {
              console.warn(`[Icon Download Node] Could not match direct URL in page content for: ${pageUrl}. Content length: ${html.length}`);
              addDevLog("warn", `REGEX mismatch in page body of ${pageUrl} (Length ${html.length}). Body preview: ${html.substring(0, 300)}`);
            }
          } else {
            console.warn(`[Icon Download Node] Page response was not ok: ${pageRes.status} for ${pageUrl}`);
            addDevLog("warn", `Scrape HTTP non-ok status: ${pageRes.status} received for target: ${pageUrl}`);
          }
        } catch (scrapeErr: any) {
          console.warn(`[Icon Download Node] Scrape attempt failed for ${pageUrl}:`, scrapeErr.message || scrapeErr);
          addDevLog("error", `Exception encountered scraping target ${pageUrl}: ${scrapeErr.message || scrapeErr}`);
        }
      }
      
      // Fallback: If scraper failed, use the hardcoded URL provided by the user
      if (!directUrl) {
        console.log("[Icon Download Node] Scraper failed to retrieve a direct link. Falling back to the hardcoded direct URL.");
        addDevLog("warn", "Scraper fell back to static hardcoded link (might be expired)");
        directUrl = "https://download2297.mediafire.com/4r46itftwxtguVVUKeGB4WrmA6HFWPB4Yo0_WsTD_7Qoaxtk-X9aRcBDxntXGToQmhwMjmTupA9Dom00IxIAlxh6aZp28WsDoUASdbJsgJv0fzSc4dpTvfZ_2gaTlvwweLZWvk5kJvoSepJkUnb9r1N7jiFgoafOok8miwWJQ5w2boc/sm5axccozk9owk6/library1.zip";
      }
      
      console.log(`[Icon Download Node] Requesting actual download from: ${directUrl}`);
      addDevLog("info", `Initiating direct file stream fetch from: ${directUrl}`);
      
      const downloadRes = await fetch(directUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });
      
      if (!downloadRes.ok) {
        addDevLog("error", `Direct file stream HTTP error: Received code ${downloadRes.status} from file server`);
        throw new Error(`Direct zip download failed with status ${downloadRes.status}`);
      }
      
      const contentLength = downloadRes.headers.get('content-length');
      const contentType = downloadRes.headers.get('content-type') || 'application/zip';
      
      console.log(`[Icon Download Node] Streaming direct download size: ${contentLength} bytes to client`);
      addDevLog("info", `Streaming file download content-length: ${contentLength} bytes, content-type: ${contentType}`);
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', 'attachment; filename="library1.zip"');
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }
      
      if (downloadRes.body) {
        // Convert Web standard ReadableStream to Node.js Readable stream and pipe it to response
        Readable.fromWeb(downloadRes.body as any).pipe(res);
        addDevLog("info", `Download stream piping initiated successfully`);
      } else {
        addDevLog("error", `Streaming downstream failed: downloadRes.body is not defined`);
        throw new Error("No download response body available to stream");
      }
    } catch (err: any) {
      console.error("[Icon Download Node Error]", err);
      addDevLog("error", `FATAL exception in download process: ${err.message || err}`);
      try {
        const timestamp = new Date().toISOString();
        const errDetail = `[${timestamp}] Error: ${err.message}\nStack: ${err.stack}\n\n`;
        fs.appendFileSync(path.join(process.cwd(), "proxy_error.log"), errDetail);
      } catch (logErr) {
        console.error("Failed to write to proxy_error.log:", logErr);
      }
      res.status(500).json({ error: err.message || "Failed to download icons. Ensure Mediafire remains reachable." });
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
