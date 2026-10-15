/** @license SPDX-License-Identifier: Apache-2.0 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'node:path';

const app = express();
const production = process.env.NODE_ENV === 'production';
app.disable('x-powered-by');
// Only trust a known deployment proxy; do not trust arbitrary forwarded IPs.
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 0));
const allowedOrigins = new Set((process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (production) res.setHeader('Content-Security-Policy', [
    "default-src 'self'", "base-uri 'self'", "object-src 'none'",
    "script-src 'self' 'wasm-unsafe-eval' https://apis.google.com",
    "style-src 'self' 'unsafe-inline'", "font-src 'self' data:",
    "img-src 'self' data: blob: https:", "media-src 'self' data: blob: https:",
    "connect-src 'self' https:", "worker-src 'self' blob:",
    "frame-src https: blob: data:", "form-action 'self'",
  ].join('; '));
  // Same-origin requests (including proxied live previews) work without CORS.
  // Cross-origin access is opt-in, and never reflects credentialed wildcards.
  const origin = req.get('origin');
  const sameHost = (() => { try { return !!origin && new URL(origin).host === req.get('host'); } catch { return false; } })();
  if (origin && !sameHost && !allowedOrigins.has(origin)) {
    res.status(403).json({ success: false, error: 'Origin not allowed' });
    return;
  }
  next();
});
app.use(cors({ origin: [...allowedOrigins], credentials: false }));
// SSE must not be buffered by compression.
app.use(compression({ filter: (req, res) => !req.path.startsWith('/api/ai/') && compression.filter(req, res) }));
app.use(express.json({ limit: '10mb' }));
const aiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: 'draft-8', legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Try again later.' } });
app.use('/api/ai', aiLimiter);

class RequestError extends Error { constructor(public status: number, message: string) { super(message); } }
function text(value: unknown, field: string, max = 200_000): string {
  if (typeof value !== 'string' || value.length > max) throw new RequestError(400, `Invalid ${field}`);
  return value;
}
function apiKey(body: any): string {
  // BYOK only. Never let an anonymous request spend a shared environment key.
  if (!body?.apiKey) throw new RequestError(401, 'Supply your provider API key in AI Settings.');
  const key = text(body.apiKey, 'apiKey', 1024);
  if (!key.trim() || /[\r\n]/.test(key)) throw new RequestError(400, 'Invalid apiKey');
  return key;
}
function modelName(value: unknown, fallback: string): string {
  const model = value === undefined ? fallback : text(value, 'model', 200);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._:/-]*$/.test(model) || model.includes('..')) throw new RequestError(400, 'Invalid model');
  return model;
}
function systemInstruction(value: any): any {
  if (value === undefined) return undefined;
  if (!Array.isArray(value?.parts) || value.parts.length !== 1) throw new RequestError(400, 'Invalid systemInstruction');
  return { parts: [{ text: text(value.parts[0]?.text, 'systemInstruction') }] };
}
function contents(value: any): any[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 200) throw new RequestError(400, 'contents must contain 1–200 messages');
  return value.map(c => {
    if (!['user', 'model'].includes(c?.role) || !Array.isArray(c.parts) || c.parts.length === 0 || c.parts.length > 20) throw new RequestError(400, 'Invalid message');
    return { role: c.role, parts: c.parts.map((p: any) => ({ text: text(p?.text, 'message text') })) };
  });
}
function generationConfig(value: any = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new RequestError(400, 'Invalid generationConfig');
  const temperature = value.temperature ?? 0.7;
  const maxOutputTokens = value.maxOutputTokens ?? 4096;
  if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2 || !Number.isInteger(maxOutputTokens) || maxOutputTokens < 1 || maxOutputTokens > 32768) throw new RequestError(400, 'Invalid generation limits');
  return { temperature, maxOutputTokens };
}
async function upstream(req: express.Request, res: express.Response, url: string, keyHeaders: Record<string, string>, body: any, streaming: boolean, responseField = 'text') {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  const abort = () => controller.abort();
  req.on('aborted', abort);
  res.on('close', abort);
  try {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...keyHeaders }, body: JSON.stringify(body), signal: controller.signal });
    if (!response.ok) {
      await response.body?.cancel();
      res.status(response.status === 429 ? 429 : response.status === 401 || response.status === 403 ? 401 : 502)
        .json({ success: false, error: `AI provider rejected the request (${response.status}). Check your key and model.` });
      return;
    }
    if (streaming) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();
      if (response.body) for await (const chunk of response.body as any) {
        if (res.destroyed) break;
        res.write(chunk);
      }
      res.end();
    } else {
      const data = await response.json();
      res.json({ [responseField]: data.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '' });
    }
  } catch (error) {
    if (res.destroyed) return;
    if (res.headersSent) { res.end(); return; }
    res.status(controller.signal.aborted ? 504 : 502).json({ success: false, error: controller.signal.aborted ? 'AI request timed out.' : 'AI provider is unavailable.' });
  } finally {
    clearTimeout(timer);
    req.off('aborted', abort);
    res.off('close', abort);
  }
}
const handler = (fn: (req: express.Request, res: express.Response) => Promise<void>) =>
  (req: express.Request, res: express.Response, next: express.NextFunction) => { fn(req, res).catch(next); };

// Specific routes MUST precede /:provider.
app.post('/api/ai/chat', handler(async (req, res) => {
  const key = apiKey(req.body);
  const model = modelName(req.body.model, 'gemini-flash-latest').replace(/^models\//, '');
  const messages = req.body.messages;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 200) throw new RequestError(400, 'Invalid messages');
  messages.forEach((m: any) => {
    if (!['system', 'user', 'assistant', 'model'].includes(m?.role)) throw new RequestError(400, 'Invalid role');
    text(m.content ?? m.text, 'message');
  });
  const system = messages.filter((m: any) => m.role === 'system').map((m: any) => m.content ?? m.text).join('\n');
  const conversation = contents(messages.filter((m: any) => m.role !== 'system').map((m: any) => ({ role: ['assistant', 'model'].includes(m.role) ? 'model' : 'user', parts: [{ text: m.content ?? m.text }] })));
  await upstream(req, res, `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { 'x-goog-api-key': key }, { contents: conversation, ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}) }, false, 'content');
}));
app.post('/api/ai/proxy', handler(async (req, res) => {
  const key = apiKey(req.body);
  const model = modelName(req.body.model, 'gemini-flash-latest').replace(/^models\//, '');
  const prompt = text(req.body.prompt, 'prompt');
  const instruction = req.body.systemInstruction ?? req.body.system_instruction;
  const system = instruction === undefined ? undefined : typeof instruction === 'string' ? { parts: [{ text: text(instruction, 'systemInstruction') }] } : systemInstruction(instruction);
  await upstream(req, res, `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { 'x-goog-api-key': key }, { contents: [{ role: 'user', parts: [{ text: prompt }] }], systemInstruction: system }, false);
}));
app.post('/api/ai/:provider', handler(async (req, res) => {
  const provider = req.params.provider;
  if (!['gemini', 'openrouter', 'fireworks', 'together'].includes(provider)) throw new RequestError(400, 'Unsupported AI provider');
  const key = apiKey(req.body);
  const model = modelName(req.body.model, provider === 'gemini' ? 'gemini-flash-latest' : '');
  const conversation = contents(req.body.contents);
  const system = systemInstruction(req.body.systemInstruction);
  const config = generationConfig(req.body.generationConfig);
  if (provider === 'gemini') {
    await upstream(req, res, `https://generativelanguage.googleapis.com/v1beta/models/${model.replace(/^models\//, '')}:streamGenerateContent?alt=sse`, { 'x-goog-api-key': key }, { contents: conversation, systemInstruction: system, generationConfig: config }, true);
  } else {
    const urls: Record<string, string> = { openrouter: 'https://openrouter.ai/api/v1/chat/completions', fireworks: 'https://api.fireworks.ai/inference/v1/chat/completions', together: 'https://api.together.xyz/v1/chat/completions' };
    const messages = conversation.map(c => ({ role: c.role === 'model' ? 'assistant' : 'user', content: c.parts.map((p: any) => p.text).join('\n') }));
    if (system) messages.unshift({ role: 'system', content: system.parts[0].text });
    await upstream(req, res, urls[provider], { Authorization: `Bearer ${key}` }, { model, messages, stream: true, temperature: config.temperature, max_tokens: config.maxOutputTokens }, true);
  }
}));
app.all('/api/*', (_req, res) => { res.status(404).json({ success: false, error: 'API route not found' }); });
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err instanceof RequestError ? err.status : err.type === 'entity.too.large' ? 413 : err instanceof SyntaxError || err.status === 400 ? 400 : 500;
  res.status(status).json({ success: false, error: err instanceof RequestError ? err.message : status === 413 ? 'Request body too large' : status === 400 ? 'Invalid JSON body' : 'Internal server error' });
});
async function start() {
  if (!production) {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const publicDir = path.resolve('dist');
    app.use(express.static(publicDir, { setHeaders(res, file) {
      res.setHeader('Cache-Control', file.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache');
    } }));
    app.get('*', (req, res) => {
      // Missing files are not SPA routes. In particular never expose server artifacts.
      if (path.extname(req.path) || req.path.startsWith('/assets/')) { res.status(404).send('Not found'); return; }
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(publicDir, 'index.html'));
    });
  }
  app.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log('RN AI server ready'));
}
start().catch(error => { console.error('Server startup failed:', error.message); process.exitCode = 1; });
