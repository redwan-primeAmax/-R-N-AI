/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Google OAuth2 Configuration
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
  const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/auth/google/url", (req, res) => {
    const host = req.get('host');
    // Force HTTPS for any domain that isn't localhost
    const isLocalhost = host?.includes('localhost') || host?.includes('127.0.0.1');
    const protocol = isLocalhost ? 'http' : 'https';
    
    // Always use the host from headers if available (for proxies)
    const xForwardedHost = req.headers['x-forwarded-host'] as string;
    const finalHost = xForwardedHost || host;
    const origin = `${protocol}://${finalHost}`;
    
    const redirectUri = `${origin}/auth/google/callback`;
    
    if (!GOOGLE_CLIENT_ID) {
      return res.status(500).json({ error: "GOOGLE_CLIENT_ID not configured" });
    }

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.appdata',
      access_type: 'offline',
      prompt: 'consent'
    });

    res.json({ url: `${GOOGLE_AUTH_URL}?${params.toString()}` });
  });

  app.post("/api/auth/google/refresh", async (req, res) => {
    const { refresh_token } = req.body;
    if (!refresh_token) return res.status(400).json({ error: "No refresh token provided" });

    try {
      const response = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          refresh_token: refresh_token as string,
          client_id: GOOGLE_CLIENT_ID!,
          client_secret: GOOGLE_CLIENT_SECRET!,
          grant_type: 'refresh_token',
        }),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error_description || body.error || "Token refresh failed");
      }

      res.json(body);
    } catch (error: any) {
      console.error("Token refresh error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/auth/google/callback", async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send("No code provided");

    try {
      const host = req.get('host');
      const isLocalhost = host?.includes('localhost') || host?.includes('127.0.0.1');
      const protocol = isLocalhost ? 'http' : 'https';
      const xForwardedHost = req.headers['x-forwarded-host'] as string;
      const finalHost = xForwardedHost || host;
      const origin = `${protocol}://${finalHost}`;
      const redirectUri = `${origin}/auth/google/callback`;
      
      const response = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: code as string,
          client_id: GOOGLE_CLIENT_ID!,
          client_secret: GOOGLE_CLIENT_SECRET!,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const body = await response.json();
      if (!response.ok) {
        console.error("Token exchange failed:", body);
        throw new Error(body.error_description || body.error || "Token exchange failed");
      }

      const tokens = body;
      res.send(`
        <html>
          <body style="background: #191919; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'GOOGLE_AUTH_SUCCESS', 
                  tokens: ${JSON.stringify(tokens)} 
                }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <div style="text-align: center;">
              <h2>Authentication successful!</h2>
              <p>You can close this window now.</p>
            </div>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error("Google Auth Error:", error);
      res.status(500).send("Authentication failed: " + error.message);
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

startServer();
