var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_vite = require("vite");
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_express_rate_limit = __toESM(require("express-rate-limit"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_cors = __toESM(require("cors"), 1);
var __dirname_resolved = typeof __dirname !== "undefined" ? __dirname : import_path.default.resolve();
import_dotenv.default.config();
var aiLimiter = (0, import_express_rate_limit.default)({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: 100,
  // limit each IP to 100 requests per windowMs
  message: { error: { message: "Too many requests from this IP, please try again after 15 minutes." } },
  standardHeaders: true,
  legacyHeaders: false
});
function injectBaseTag(html, baseHref) {
  if (/<base\s+href=/i.test(html)) {
    return html;
  }
  const baseTag = `<base href="${baseHref}">`;
  if (/<head>/i.test(html)) {
    return html.replace(/<head>/i, (match) => `${match}
    ${baseTag}`);
  }
  if (/<html>/i.test(html)) {
    return html.replace(/<html>/i, (match) => `${match}
    <head>${baseTag}</head>`);
  }
  if (/<!doctype\s+html>/i.test(html)) {
    return html.replace(/<!doctype\s+html>/i, (match) => `${match}
<head>${baseTag}</head>`);
  }
  return `<head>${baseTag}</head>
` + html;
}
var devLogs = [];
async function startServer() {
  const app = (0, import_express.default)();
  app.set("trust proxy", true);
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    next();
  });
  app.use((0, import_cors.default)({
    origin: (origin, callback) => {
      if (!origin || /localhost/.test(origin) || /asia-southeast1\.run\.app$/.test(origin)) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true
  }));
  const PORT = 3e3;
  app.use(import_express.default.json({ limit: "10mb" }));
  app.use((req, res, next) => {
    if (req.url.startsWith("/api/ai")) {
      console.log(`[AI API] ${req.method} ${req.url}`);
    }
    next();
  });
  app.post("/api/ai/gemini", aiLimiter, async (req, res) => {
    try {
      const { model: clientModel, contents, generationConfig, systemInstruction, system_instruction, apiKey: clientApiKey } = req.body;
      const apiKey = process.env.GEMINI_API_KEY || clientApiKey;
      let model = clientModel || "gemini-1.5-flash";
      if (!model.startsWith("models/")) model = `models/${model}`;
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
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model}:streamGenerateContent?alt=sse`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
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
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      if (response.body) {
        for await (const chunk of response.body) {
          res.write(chunk);
        }
      }
      res.end();
    } catch (err) {
      console.error("Gemini Proxy Route Error:", err);
      res.status(500).json({
        success: false,
        error: { message: err.message || "Internal server error", code: "INTERNAL_SERVER_ERROR" }
      });
    }
  });
  app.post("/api/ai/chat", aiLimiter, async (req, res) => {
    try {
      const { messages, apiKey: clientApiKey, model: clientModel } = req.body;
      const apiKey = process.env.GEMINI_API_KEY || clientApiKey;
      let model = clientModel || "gemini-1.5-flash";
      if (!apiKey) return res.status(500).json({ error: "AI Key missing. Please check your AI Settings." });
      if (!model.startsWith("models/")) model = `models/${model}`;
      const systemMessages = messages.filter((m) => m.role === "system");
      const chatMessages = messages.filter((m) => m.role !== "system");
      const systemInstruction = systemMessages.length > 0 ? { parts: [{ text: systemMessages.map((m) => m.content || m.text).join("\n") }] } : void 0;
      const contents = chatMessages.map((m) => ({
        role: m.role === "assistant" || m.role === "model" ? "model" : "user",
        parts: [{ text: m.content || m.text || "" }]
      }));
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model.startsWith("models/") ? model : "models/" + model}:generateContent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        // Bug 8: Support both standard camelCase and backward-compatibility snake_case
        body: JSON.stringify({
          contents,
          systemInstruction,
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
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      res.json({ content: text });
    } catch (err) {
      console.error("AI Chat Error:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/ai/proxy", aiLimiter, async (req, res) => {
    try {
      const { prompt, systemInstruction, system_instruction, apiKey: clientApiKey, model: clientModel } = req.body;
      const apiKey = process.env.GEMINI_API_KEY || clientApiKey;
      let model = clientModel || "gemini-1.5-flash";
      if (!apiKey) return res.status(500).json({ error: "AI Key missing. Please check your AI Settings." });
      if (!model.startsWith("models/")) model = `models/${model}`;
      const activeInstruction = systemInstruction || system_instruction;
      const body = {
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      };
      if (activeInstruction) {
        const partsObj = { parts: [{ text: activeInstruction }] };
        body.systemInstruction = partsObj;
        body.system_instruction = partsObj;
      }
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model.startsWith("models/") ? model : "models/" + model}:generateContent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
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
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      res.json({ text });
    } catch (err) {
      console.error("AI Proxy Error:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/docs/spec", (req, res) => {
    const filePath = import_path.default.join(process.cwd(), "docs", "EXTENSIONS_SPEC.md");
    if (import_fs.default.existsSync(filePath)) {
      res.setHeader("Content-Disposition", 'attachment; filename="EXTENSIONS_SPEC.md"');
      res.setHeader("Content-Type", "text/markdown; charset=utf-8");
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: "Specification file not found" });
    }
  });
  app.get("/api/dev/logs", (req, res) => {
    res.json(devLogs);
  });
  app.all("/api/*", (req, res) => {
    res.status(404).json({ success: false, error: `API route not found: ${req.method} ${req.url}` });
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      const htmlPath = import_path.default.join(distPath, "index.html");
      if (import_fs.default.existsSync(htmlPath)) {
        let html = import_fs.default.readFileSync(htmlPath, "utf8");
        html = injectBaseTag(html, "/");
        res.send(html);
      } else {
        res.status(404).send("Not Found");
      }
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
//# sourceMappingURL=server.cjs.map
