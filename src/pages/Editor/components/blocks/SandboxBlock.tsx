/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Code2, Play, RefreshCw, Palette, Terminal, Sparkles, Trash2, FileText } from 'lucide-react';
import { cn } from '../../../../utils/cn';

interface SandboxData {
  html: string;
  css: string;
  js: string;
}

// Parses raw content or JSON string into structured html, css, js fields
const parseSandboxContent = (raw: string): SandboxData => {
  if (!raw || !raw.trim()) {
    return { html: '', css: '', js: '' };
  }

  const trimmed = raw.trim();

  // Try parsing JSON format
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed.html === 'string' || typeof parsed.css === 'string' || typeof parsed.js === 'string') {
        return {
          html: parsed.html || '',
          css: parsed.css || '',
          js: parsed.js || ''
        };
      }
    } catch (e) {}
  }

  // Fallback: parse raw string and extract <style> and <script> blocks
  let html = raw;
  let css = '';
  let js = '';

  // Extract <style>...</style>
  html = html.replace(/<style[\s\S]*?>([\s\S]*?)<\/style>/gi, (_, cssContent) => {
    css += cssContent + '\n';
    return '';
  });

  // Extract <script>...</script>
  html = html.replace(/<script[\s\S]*?>([\s\S]*?)<\/script>/gi, (_, jsContent) => {
    js += jsContent + '\n';
    return '';
  });

  return { html: html.trim(), css: css.trim(), js: js.trim() };
};

export const SandboxBlock = ({ block, handleBlockChange, isReadOnly }: any) => {
  const [data, setData] = useState<SandboxData>(() => parseSandboxContent(block.content || ''));
  const [activeTab, setActiveTab] = useState<'html' | 'css' | 'js' | 'preview'>('html');
  const [previewKey, setPreviewKey] = useState(0);

  // Sync state changes if block.content updates externally
  useEffect(() => {
    if (block.content) {
      const parsed = parseSandboxContent(block.content);
      if (parsed.html !== data.html || parsed.css !== data.css || parsed.js !== data.js) {
        setData(parsed);
      }
    }
  }, [block.content]);

  // Internal debouncer to sync local edits back to editor block state as JSON
  useEffect(() => {
    const timer = setTimeout(() => {
      const serialized = JSON.stringify(data);
      if (serialized !== block.content) {
        handleBlockChange(block.id, serialized, true);
      }
    }, 400); // 400ms debounce
    return () => clearTimeout(timer);
  }, [data, block.id, handleBlockChange, block.content]);

  const updateField = (field: keyof SandboxData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  // Helper to generate full executable HTML document containing user's HTML, CSS, and JS
  const srcDoc = useMemo(() => {
    const { html, css, js } = data;
    const hasContent = html.trim() || css.trim() || js.trim();

    if (!hasContent) {
      return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        margin: 0;
        background: #0f0f12;
        color: #888;
        font-size: 13px;
      }
    </style>
  </head>
  <body>
    <div>HTML, CSS, বা JS ট্যাবে কোড লিখলে এখানে লাইভ আউটপুট দেখাবে...</div>
  </body>
</html>`;
    }

    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        margin: 16px;
        color: #111;
        background-color: #fff;
      }
      /* Custom scrollbars inside iframe */
      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }
      button { cursor: pointer; }
      
      /* User CSS Styles */
      ${css}
    </style>
  </head>
  <body>
    ${html}

    <script>
      // Global error logging inside iframe preview
      window.onerror = function(msg, url, line) {
        const errDiv = document.createElement('div');
        errDiv.style.cssText = 'margin-top: 16px; padding: 12px; background: #fee2e2; border: 1px solid #f87171; border-radius: 12px; color: #991b1b; font-family: monospace; font-size: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);';
        errDiv.innerHTML = '<strong>⚠️ JS Error:</strong> ' + msg + ' (Line ' + line + ')';
        document.body.appendChild(errDiv);
      };

      try {
        ${js}
      } catch (err) {
        console.error("Sandbox Execution Error:", err);
      }
    </script>
  </body>
</html>`;
  }, [data]);

  // Load preset starter templates
  const loadPreset = (presetType: 'counter' | 'card' | 'clear') => {
    if (presetType === 'clear') {
      setData({ html: '', css: '', js: '' });
      return;
    }

    if (presetType === 'counter') {
      setData({
        html: `<div class="container">
  <h1>Counter App</h1>
  <div id="counter">0</div>
  <div class="btn-group">
    <button id="decrement">- Decrease</button>
    <button id="increment">+ Increase</button>
  </div>
</div>`,
        css: `body {
  background: #f8fafc;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
}

.container {
  background: white;
  padding: 32px;
  border-radius: 24px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.08);
  text-align: center;
  max-width: 320px;
  width: 100%;
}

h1 {
  margin: 0 0 16px 0;
  font-size: 20px;
  color: #1e293b;
}

#counter {
  font-size: 48px;
  font-weight: 800;
  color: #2563eb;
  margin: 16px 0;
}

.btn-group {
  display: flex;
  gap: 8px;
}

button {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 12px;
  font-weight: bold;
  font-size: 13px;
  transition: all 0.2s;
}

#increment {
  background: #2563eb;
  color: white;
}

#increment:hover {
  background: #1d4ed8;
}

#decrement {
  background: #f1f5f9;
  color: #475569;
}

#decrement:hover {
  background: #e2e8f0;
}`,
        js: `let count = 0;
const counterEl = document.getElementById('counter');
const incBtn = document.getElementById('increment');
const decBtn = document.getElementById('decrement');

incBtn.addEventListener('click', () => {
  count++;
  counterEl.textContent = count;
});

decBtn.addEventListener('click', () => {
  if (count > 0) count--;
  counterEl.textContent = count;
});`
      });
    } else if (presetType === 'card') {
      setData({
        html: `<div class="card">
  <div class="badge">New Release</div>
  <h3>Interactive UI Sandbox</h3>
  <p>Modify HTML, CSS, and JS tabs to see real-time rendered results!</p>
  <button id="toastBtn">Show Toast Alert</button>
</div>`,
        css: `.card {
  background: linear-gradient(135deg, #1e1b4b, #312e81);
  color: white;
  padding: 24px;
  border-radius: 20px;
  max-width: 320px;
  box-shadow: 0 12px 24px rgba(0,0,0,0.2);
}

.badge {
  display: inline-block;
  background: rgba(255,255,255,0.15);
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 10px;
  font-weight: bold;
  letter-spacing: 1px;
  text-transform: uppercase;
}

h3 {
  margin: 12px 0 8px 0;
  font-size: 18px;
}

p {
  font-size: 12px;
  opacity: 0.8;
  line-height: 1.5;
}

button {
  margin-top: 12px;
  width: 100%;
  padding: 10px;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: bold;
  transition: opacity 0.2s;
}

button:hover {
  opacity: 0.9;
}`,
        js: `document.getElementById('toastBtn').addEventListener('click', () => {
  alert('✨ JavaScript executed successfully inside sandbox!');
});`
      });
    }
  };

  return (
    <div className="flex-1 border border-white/10 rounded-2xl overflow-hidden bg-[#070707] shadow-2xl text-left antialiased flex flex-col min-h-[380px] w-full relative group/sandbox my-3">
      {/* Top Header Bar with HTML / CSS / JS / Preview Sub-Tabs */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#121215] border-b border-white/10">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Sub Tabs */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
            <button
              type="button"
              onClick={() => setActiveTab('html')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none",
                activeTab === 'html' 
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" 
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              <FileText size={13} />
              HTML
              {data.html.trim() && <span className="w-1.5 h-1.5 rounded-full bg-blue-300" />}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('css')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none",
                activeTab === 'css' 
                  ? "bg-amber-600 text-white shadow-md shadow-amber-500/20" 
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              <Palette size={13} />
              CSS
              {data.css.trim() && <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('js')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none",
                activeTab === 'js' 
                  ? "bg-purple-600 text-white shadow-md shadow-purple-500/20" 
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              <Terminal size={13} />
              JS
              {data.js.trim() && <span className="w-1.5 h-1.5 rounded-full bg-purple-300" />}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('preview');
                setPreviewKey(k => k + 1);
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none ml-1",
                activeTab === 'preview' 
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20" 
                  : "text-emerald-400 hover:text-white hover:bg-emerald-500/10"
              )}
            >
              <Play size={13} />
              Preview
            </button>
          </div>

          {/* Quick Presets in Code Editor Modes */}
          {activeTab !== 'preview' && !isReadOnly && (
            <div className="hidden sm:flex items-center gap-1 ml-1">
              <button
                type="button"
                onClick={() => loadPreset('counter')}
                className="text-[10px] font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-2 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer"
                title="Load Counter App Sample"
              >
                <Sparkles size={11} /> Counter Sample
              </button>
              <button
                type="button"
                onClick={() => loadPreset('card')}
                className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-1 rounded-md transition-all cursor-pointer"
                title="Load Card Sample"
              >
                UI Card
              </button>
              <button
                type="button"
                onClick={() => loadPreset('clear')}
                className="text-[10px] font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 p-1 rounded-md transition-all cursor-pointer"
                title="Clear All Code"
              >
                <Trash2 size={11} />
              </button>
            </div>
          )}
        </div>

        {/* Right Status Indicator */}
        <div className="flex items-center gap-2">
          {activeTab === 'preview' && (
            <button
              type="button"
              onClick={() => setPreviewKey(k => k + 1)}
              className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-[10px] font-mono"
              title="Refresh Live Preview"
            >
              <RefreshCw size={12} />
              <span>Reload</span>
            </button>
          )}
          <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest px-1">
            {activeTab.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Editor Panels */}
      {activeTab === 'html' && (
        <div className="flex-1 flex flex-col w-full min-h-[300px] relative">
          <div className="px-4 py-1.5 bg-[#0a0a0d] border-b border-white/5 text-[10px] font-mono text-blue-400/80 flex items-center justify-between">
            <span>&lt;body&gt; HTML Structure &lt;/body&gt;</span>
            <span className="text-white/20">Write standard HTML elements</span>
          </div>
          <textarea
            readOnly={isReadOnly}
            value={data.html}
            onChange={(e) => updateField('html', e.target.value)}
            placeholder="Write HTML here (e.g. <button id='btn'>Click Me</button>)..."
            className="w-full bg-[#08080a] p-5 font-mono text-xs leading-relaxed text-blue-200 border-none outline-none focus:outline-none flex-grow resize-y min-h-[280px] selection:bg-blue-500/30"
            spellCheck={false}
          />
        </div>
      )}

      {activeTab === 'css' && (
        <div className="flex-1 flex flex-col w-full min-h-[300px] relative">
          <div className="px-4 py-1.5 bg-[#0a0a0d] border-b border-white/5 text-[10px] font-mono text-amber-400/80 flex items-center justify-between">
            <span>&lt;style&gt; CSS Styling &lt;/style&gt;</span>
            <span className="text-white/20">Write pure CSS (no &lt;style&gt; tag needed)</span>
          </div>
          <textarea
            readOnly={isReadOnly}
            value={data.css}
            onChange={(e) => updateField('css', e.target.value)}
            placeholder="Write CSS here (e.g. button { background: blue; color: white; })..."
            className="w-full bg-[#08080a] p-5 font-mono text-xs leading-relaxed text-amber-200 border-none outline-none focus:outline-none flex-grow resize-y min-h-[280px] selection:bg-amber-500/30"
            spellCheck={false}
          />
        </div>
      )}

      {activeTab === 'js' && (
        <div className="flex-1 flex flex-col w-full min-h-[300px] relative">
          <div className="px-4 py-1.5 bg-[#0a0a0d] border-b border-white/5 text-[10px] font-mono text-purple-400/80 flex items-center justify-between">
            <span>&lt;script&gt; JavaScript Logic &lt;/script&gt;</span>
            <span className="text-white/20">Write pure JS (no &lt;script&gt; tag needed)</span>
          </div>
          <textarea
            readOnly={isReadOnly}
            value={data.js}
            onChange={(e) => updateField('js', e.target.value)}
            placeholder="Write JavaScript here (e.g. document.querySelector('button').onclick = () => alert('Clicked!'))..."
            className="w-full bg-[#08080a] p-5 font-mono text-xs leading-relaxed text-purple-200 border-none outline-none focus:outline-none flex-grow resize-y min-h-[280px] selection:bg-purple-500/30"
            spellCheck={false}
          />
        </div>
      )}

      {/* Preview Tab */}
      {activeTab === 'preview' && (
        <div className="flex-1 flex flex-col bg-white w-full min-h-[300px]">
          <iframe
            key={`sandbox-frame-${previewKey}`}
            title={`sandbox-preview-${block.id}`}
            sandbox="allow-scripts allow-modals allow-forms allow-popups"
            className="w-full h-full bg-white border-none min-h-[300px] flex-1"
            referrerPolicy="no-referrer"
            srcDoc={srcDoc}
          />
        </div>
      )}
    </div>
  );
};
