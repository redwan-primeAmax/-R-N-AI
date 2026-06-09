# 🏗️ Diamond Road Extension — ১০টি সম্পূর্ণ এক্সাম্পল

> **উদ্দেশ্য:** প্রতিটি এক্সটেনশনে "কী ভুল হচ্ছে" এবং "কী সঠিক" তা গভীরভাবে বোঝার জন্য।  
> **ফরম্যাট:** ❌ ভুল কোড → 🔍 কোথায় ভুল ও কেন → ✅ সঠিক কোড → 📝 কী যোগ/পরিবর্তন করা হলো  
> **প্ল্যাটফর্ম:** Diamond Road Extension Engine (Redwan AI Note)  

---

## 📌 এক্সটেনশন ইঞ্জিনের মূল নিয়ম (পড়ে নাও)

Diamond Road-এ extension তিনটি উপায়ে UI-তে দেখা যায়:

| Entry Point | API Method | কোথায় দেখায় |
|-------------|-----------|--------------|
| Sidebar Button | `api.ui.registerSidebarItem()` | বাম পাশের sidebar menu-তে |
| Editor Block | `api.editor.registerBlock()` + `api.editor.insertBlock()` | Editor-এ custom block হিসেবে |
| Tool/Hub App | `api.ui.registerTool()` বা `api.ui.registerApp()` | Tools dashboard-এ |
| Notification | `api.ui.notify()` | Toast notification হিসেবে |

**সবচেয়ে গুরুত্বপূর্ণ নিয়ম:** শুধু `registerBlock()` call করলে হবে না — block insert করার কোনো উপায় থাকতে হবে (sidebar button, toolbar button, বা slash command)। নাহলে block registry-তে register হয়ে থাকবে, কিন্তু ইউজার কখনো দেখতে পাবে না।

---
---

# এক্সাম্পল ১: 📌 Sidebar Button Extension (সাইডবার বাটন)

**উদ্দেশ্য:** Sidebar-এ একটা button যোগ করা যেটা click করলে নোটিফিকেশন দেখাবে।

## ❌ ভুল কোড

### `manifest.json`
```json
{
  "id": "com.example.hello",
  "name": "Hello Button",
  "version": "1.0.0",
  "description": "Sidebar-এ hello button",
  "author": "Test",
  "type": "extension",
  "icon": "👋",
  "permissions": ["ui"]
}
```

### `index.js`
```javascript
export function activate(api) {
  // ❌ ভুল: registerSidebarItem call করা হয়নি
  // শুধু notify করা হচ্ছে, কিন্তু কে trigger করবে?
  api.ui.notify('Hello from extension!', 'success');
}

export function deactivate(api) {
  // কিছু নেই
}
```

## 🔍 কোথায় ভুল?

| # | ভুল | কারণ |
|---|------|------|
| 1 | `registerSidebarItem()` call করা হয়নি | Sidebar-এ কোনো button যোগ হবে না |
| 2 | `notify()` activate-এ সরাসরি call হচ্ছে | Extension load হওয়ামাত্রই একবার notify হবে, এরপর আর কিছু হবে না |
| 3 | `deactivate()` ফাঁকা | Cleanup নেই |

**ফলাফল:** Extension install হলে একটা notification দেখাবে এবং তারপর চুপচাপ — sidebar-এ কিছু দেখাবে না।

---

## ✅ সঠিক কোড

### `manifest.json`
```json
{
  "id": "com.example.hello",          // ← ইউনিক extension ID (reverse domain format)
  "name": "Hello Button",             // ← ইউজারের দেখার জন্য নাম
  "version": "1.0.0",                 // ← ভার্সন নম্বর (semver format)
  "description": "Sidebar-এ hello button",  // ← বর্ণনা
  "author": "Test",                   // ← ডেভেলপারের নাম
  "type": "extension",                // ← টাইপ: "extension" হতে হবে
  "icon": "👋",                       // ← আইকন (emoji বা string)
  "permissions": ["ui", "sidebar"]    // ← ✅ "sidebar" permission যোগ করা হয়েছে
}
```

### `index.js`
```javascript
// "use strict" মোডে code run হয়, তাই function declaration ব্যবহার করা ভালো

// --------------------------------------------------
// activate() — Extension load হওয়ার সাথে সাথে call হয়
// Parameter: api (AppAPI object) — এটা host app থেকে পাওয়া যায়
// --------------------------------------------------
export function activate(api) {

  // ✅ ধাপ ১: Sidebar-এ button register করো
  // এটা ছাড়া sidebar-এ কিছু দেখাবে না — এটাই মূল entry point
  api.ui.registerSidebarItem({
    id: 'hello-btn',           // ← ইউনিক button ID (string)
    label: 'Hello Button',     // ← Sidebar-এ দেখানো লেবেল টেক্সট
    icon: '👋',                // ← আইকন (emoji string বা Lucide React component)
    color: 'border-yellow-500/30',  // ← Optional: border color class
    
    // onClick: ইউজার button-এ click করলে এটা execute হয়
    onClick: function() {
      // api.ui.notify() দিয়ে toast notification দেখানো যায়
      // Parameter ১: message (string)
      // Parameter ২: type — 'success' | 'error' | 'info'
      api.ui.notify('👋 Hello! Button কাজ করছে!', 'success');
    }
  });

  // ✅ ধাপ ২: Console-এ log করো debugging এর জন্য
  console.log('[Hello Button] Extension activated successfully');
}

// --------------------------------------------------
// deactivate() — Extension uninstall/disable হলে call হয়
// এখানে cleanup করতে হয় (event listener remove, state reset ইত্যাদি)
// --------------------------------------------------
export function deactivate(api) {
  // Sidebar item automatically remove হয় যখন extension disable হয়
  // তবে global state বা event listener থাকলে সেটা manually clean করতে হবে
  console.log('[Hello Button] Extension deactivated');
}
```

## 📝 কী পরিবর্তন হলো?

| পরিবর্তন | কেন? |
|----------|------|
| manifest-এ `"sidebar"` permission যোগ | `registerSidebarItem()` use করতে এই permission লাগে |
| `api.ui.registerSidebarItem()` যোগ | Sidebar-এ button দেখানোর একমাত্র উপায় |
| `onClick` handler-এ `api.ui.notify()` সরানো হয়েছে | সরাসরি activate()-এ notify না করে button click-এ করা উচিত |
| `deactivate()` function যোগ | Cleanup এর জন্য best practice |

---
---

# এক্সাম্পল ২: 📝 Editor Block Extension (এডিটর ব্লক)

**উদ্দেশ্য:** Editor-এ একটা custom block যোগ করা যেটা "Hello World" দেখাবে।

## ❌ ভুল কোড

### `manifest.json`
```json
{
  "id": "com.example.hello-block",
  "name": "Hello Block",
  "version": "1.0.0",
  "description": "Custom hello block",
  "author": "Test",
  "type": "extension",
  "icon": "🧱",
  "permissions": ["editor"]
}
```

### `index.js`
```javascript
export function activate(api) {
  // ❌ Block type register করা হচ্ছে
  api.editor.registerBlock('hello-block', function(props) {
    return React.createElement('div', { className: 'p-4 bg-blue-900' }, 'Hello World');
  });
  // ❌ কিন্তু এই block insert করার কোনো উপায় নেই!
  // কোনো sidebar button নেই, কোনো toolbar button নেই
  // Block type register হয়ে থাকবে, কিন্তু ইউজার কখনো দেখবে না
}
```

## 🔍 কোথায় ভুল?

| # | ভুল | কারণ |
|---|------|------|
| 1 | `registerSidebarItem()` নেই | Sidebar-এ block insert করার button নেই |
| 2 | `registerTool()` নেই | Tools dashboard-এও entry point নেই |
| 3 | `insertBlock()` trigger নেই | Block type register আছে, কিন্তু insert হচ্ছে না |
| 4 | manifest-এ `"sidebar"` permission নেই | Sidebar API access নেই |
| 5 | `props` থেকে `setBlocks` ব্যবহার করা হয়নি | Block data update করার উপায় নেই |

---

## ✅ সঠিক কোড

### `manifest.json`
```json
{
  "id": "com.example.hello-block",       // ← ইউনিক ID
  "name": "Hello Block",                 // ← Extension এর নাম
  "version": "1.0.0",                    // ← ভার্সন
  "description": "Custom hello block",   // ← বর্ণনা
  "author": "Test",                      // ← লেখক
  "type": "extension",                   // ← টাইপ
  "icon": "🧱",                          // ← আইকন
  "permissions": ["editor", "ui", "sidebar"]  // ← ✅ sidebar + ui যোগ করা হয়েছে
}
```

### `index.js`
```javascript
// --------------------------------------------------
// Block type এর নাম constant হিসেবে রাখা ভালো
// যাতে একই নাম বারবার use করতে হলে typing mistake না হয়
// --------------------------------------------------
var BLOCK_TYPE = 'hello-block';

// --------------------------------------------------
// isActive flag: extension একাধিকবার activate হলে duplicate registration রোধ করে
// Diamond Road engine কখনো কখনো একই extension দুইবার load করতে পারে
// --------------------------------------------------
var isActive = false;

// --------------------------------------------------
// activate(api) — Entry point
// --------------------------------------------------
export function activate(api) {

  // ✅ Guard: যদি আগেই active থাকে, আবার register করবে না
  if (isActive) {
    // console.warn দিয়ে warning দেখাও (error না, কারণ এটা fatal না)
    console.warn('[Hello Block] Already active, skipping');
    return; // ← আগেই return করে দাও, নিচের code run হবে না
  }

  // ================================================
  // ধাপ ১: Block Component Register করো
  // ================================================
  // api.editor.registerBlock(type, component)
  //   type: string — block এর unique type identifier
  //   component: function(props) — React component যেটা block render করে
  //
  // Props যা host app থেকে আসে:
  //   props.block — বর্তমান block এর data (id, type, content, indent, etc.)
  //   props.setBlocks — State setter function (array of all blocks update করে)
  //   props.blocks — সব blocks এর array
  //   props.isReadOnly — শুধু read-only mode কিনা (boolean)
  //   props.idx — বর্তমান block এর index (number)
  //   props.editor — TipTap editor instance (যদি থাকে)
  // ================================================
  api.editor.registerBlock(BLOCK_TYPE, function(props) {

    // --- Props Destructuring ---
    var block = props.block;           // ← বর্তমান block data object
    var setBlocks = props.setBlocks;   // ← State setter — সব blocks update করতে পারে
    var blocks = props.blocks;         // ← সম্পূর্ণ blocks array
    var isReadOnly = props.isReadOnly; // ← Read-only flag

    // --- updateBlock Helper Function ---
    // Host app "updateBlock" নামে কোনো prop পাঠায় না
    // তাই আমরা নিজেদের wrapper বানাই যেটা setBlocks ব্যবহার করে
    // এটা শুধু বর্তমান block টা update করে, বাকিগুলো আগের মতো রাখে
    function updateBlock(updatedData) {
      // typeof check দিয়ে নিশ্চিত হচ্ছি setBlocks আছে কিনা
      if (typeof setBlocks === 'function') {
        // setBlocks কে callback দিচ্ছি যেটা previous state নেয়
        setBlocks(function(prevBlocks) {
          // prevBlocks হলো আগের সব blocks এর array
          // .map() দিয়ে শুধু matching block টা update করছি
          return prevBlocks.map(function(b) {
            // b.id === block.id মানে এটাই আমাদের target block
            return b.id === block.id
              ? Object.assign({}, b, updatedData) // ← merge করে update
              : b;                                // ← বাকিগুলো আগের মতো
          });
        });
      }
    }

    // --- Block Content ---
    // block.content থেকে আগের saved data নাও (যদি থাকে)
    var content = block.content || '';

    // --- Render ---
    // React.createElement(tag, attributes, children)
    // tag: HTML tag name (string)
    // attributes: object with props (className, onClick, etc.)
    // children: string, element, বা array of elements
    return React.createElement(
      'div',                                          // ← Outer container
      {                                               // ← Attributes
        className: 'p-4 my-2 rounded-lg bg-blue-950 border border-blue-800 text-blue-200',
        'data-extension-id': BLOCK_TYPE               // ← debugging এর জন্য data attribute
      },
      // Children: array of elements
      [
        // Header row (title + button)
        React.createElement(
          'div',                                      // ← Row container
          {                                           // ← Attributes
            key: 'header',                            // ← React key (unique within siblings)
            className: 'flex items-center justify-between'
          },
          [
            // Title text
            React.createElement(
              'h3',                                   // ← <h3> tag
              {
                key: 'title',                         // ← React key
                className: 'text-sm font-bold text-blue-400' // ← Tailwind classes
              },
              '🧱 Hello Block'                        // ← Text content
            ),
            // Update button
            React.createElement(
              'button',                               // ← <button> tag
              {
                key: 'btn',                           // ← React key
                onClick: function() {                 // ← Click handler
                  // Update block content
                  updateBlock({
                    content: 'Updated at ' + new Date().toLocaleTimeString()
                  });
                },
                className: 'px-2 py-1 text-xs bg-blue-600 hover:bg-blue-500 rounded text-white',
                disabled: isReadOnly                  // ← Read-only হলে disabled
              },
              'Update'                                // ← Button text
            )
          ]
        ),
        // Content area
        React.createElement(
          'div',                                      // ← Content container
          {
            key: 'content',                           // ← React key
            className: 'mt-2 text-sm'                 // ← Spacing + font
          },
          content || 'Button click করে update করো'   // ← Content বা placeholder
        )
      ]
    );
  });

  // ================================================
  // ধাপ ২: ✅ Sidebar-এ Button যোগ করো (Entry Point!)
  // এটা ছাড়া block কখনো editor-এ insert হবে না
  // ================================================
  api.ui.registerSidebarItem({
    id: 'hello-block-trigger',            // ← ইউনিক button ID
    label: '🧱 Hello Block',              // ← Sidebar-এ দেখানো লেবেল
    icon: '🧱',                           // ← আইকন
    color: 'border-blue-500/30',          // ← Optional: colored border

    onClick: function() {
      // api.editor.insertBlock(type) — editor-এ নতুন block insert করে
      // এটা একটা window event dispatch করে যেটা editor component listen করে
      api.editor.insertBlock(BLOCK_TYPE);

      // ইউজারকে confirm করাও যে block insert হয়েছে
      api.ui.notify('Hello Block যোগ হয়েছে!', 'success');
    }
  });

  // ================================================
  // ধাপ ৩: Active flag সেট করো
  // ================================================
  isActive = true;                         // ← Guard flag update
  console.log('[Hello Block] Activated');  // ← Debug log
}

// --------------------------------------------------
// deactivate(api) — Cleanup
// --------------------------------------------------
export function deactivate(api) {
  isActive = false;                         // ← Flag reset করো
  console.log('[Hello Block] Deactivated'); // ← Debug log
}
```

## 📝 কী পরিবর্তন হলো?

| পরিবর্তন | কেন? |
|----------|------|
| `"sidebar"` ও `"ui"` permission যোগ | Sidebar API ও UI API access পেতে |
| `registerSidebarItem()` যোগ | **Entry point** — এটা ছাড়া block insert হওয়ার উপায় নেই |
| `api.editor.insertBlock()` যোগ | Sidebar button click-এ block editor-এ যোগ হবে |
| `updateBlock()` wrapper তৈরি | Host app `updateBlock` prop পাঠায় না, তাই `setBlocks` দিয়ে wrapper বানাতে হয় |
| `isActive` guard flag | Duplicate registration রোধ করতে |
| React `key` props যোগ | React warning রোধ এবং proper rendering এর জন্য |
| `isReadOnly` check | Read-only mode-এ button disable করতে |

---
---

# এক্সাম্পল ৩: 🤖 AI সামারাইজার Extension (সর্বোচ্চ বাগ সহ)

**উদ্দেশ্য:** নোটের content AI দিয়ে summarize করা।

## ❌ ভুল কোড

### `index.js`
```javascript
export function activate(api) {
  api.editor.registerBlock('ai-summarizer', ({ block, updateBlock }) => {
    // ❌ updateBlock নামে কোনো prop आता না host থেকে
    const [summary, setSummary] = React.useState(block.content || '');

    const handleSummarize = async () => {
      const note = await api.editor.getCurrentNote();
      // ❌ note.content হতে পারে HTML, plain text, বা null
      const response = await api.ai.generate({
        prompt: `Summarize: ${note.content}`
      });
      // ❌ response হলো JSON object, string না!
      setSummary(response);           // ← [object Object] দেখাবে
      updateBlock({ content: response }); // ← TypeError!
    };

    return React.createElement('div', { className: 'p-4' },
      React.createElement('button', { onClick: handleSummarize }, 'Summarize'),
      React.createElement('p', null, summary)
    );
  });
  // ❌ কোনো sidebar button নেই — block insert হওয়ার উপায় নেই
}
```

## 🔍 কোথায় ভুল?

| # | ভুল | কারণ |
|---|------|------|
| 1 | `updateBlock` prop expect | Host এই prop পাঠায় না → TypeError |
| 2 | `response` direct use | JSON object → `[object Object]` দেখাবে |
| 3 | `note.content` HTML format | AI-কে raw HTML যাচ্ছে |
| 4 | `note` null check নেই | Note না থাকলে crash |
| 5 | Sidebar button নেই | Block insert হওয়ার উপায় নেই |
| 6 | `deactivate` নেই | Memory leak |
| 7 | Error handling নেই | AI fail করলে app crash |

---

## ✅ সঠিক কোড

### `manifest.json`
```json
{
  "id": "com.example.ai-summarizer",
  "name": "AI Summarizer",
  "version": "1.0.0",
  "description": "নোটের AI সামারি",
  "author": "Test",
  "type": "extension",
  "icon": "🤖",
  "permissions": ["editor", "ai", "ui", "sidebar"]
}
```

### `index.js`
```javascript
// ============================================================
// Constant — Block type identifier
// ============================================================
var BLOCK_TYPE = 'ai-summarizer';

// ============================================================
// isActive — Duplicate registration guard
// ============================================================
var isActive = false;

// ============================================================
// stripHtml(html) — HTML string থেকে plain text বের করে
// কারণ getCurrentNote() HTML format-এ content দেয়
// AI-কে plain text পাঠাতে হয়, HTML না
// ============================================================
function stripHtml(html) {
  // null/undefined check — যদি input empty হয়
  if (!html) return '';

  try {
    // DOMParser বা createElement দিয়ে HTML parse করো
    var tmp = document.createElement('div');
    tmp.innerHTML = html;                    // ← HTML set করো
    // textContent শুধু text দেয়, সব HTML tag remove হয়
    return (tmp.textContent || tmp.innerText || '').trim();
  } catch (e) {
    // Fallback: যদি DOM method কাজ না করে, regex দিয়ে tag remove করো
    return html.replace(/<[^>]*>/g, '').trim();
  }
}

// ============================================================
// extractAIText(response) — AI response থেকে actual text বের করে
// কারণ api.ai.generate() JSON object return করে, string না
// ============================================================
function extractAIText(response) {
  // null/undefined check
  if (!response) return null;

  // যদি সরাসরি string আসে (কিছু provider format)
  if (typeof response === 'string') return response;

  // যদি object আসে (সাধারণ Gemini/OpenAI format)
  if (typeof response === 'object') {
    // Error check — response-এ error field থাকলে throw করো
    if (response.error) {
      throw new Error(response.message || response.error || 'AI service error');
    }

    // Gemini API format:
    // { candidates: [{ content: { parts: [{ text: "..." }] } }] }
    if (response.candidates && response.candidates[0]) {
      var parts = response.candidates[0].content?.parts;
      if (parts && parts[0] && parts[0].text) {
        return parts[0].text;          // ← Gemini text
      }
    }

    // OpenAI format:
    // { choices: [{ message: { content: "..." } }] }
    if (response.choices && response.choices[0]) {
      return response.choices[0].message?.content;  // ← OpenAI text
    }

    // Generic fallback — বিভিন্ন field name try করো
    return response.text                // ← direct .text
      || response.content              // ← .content
      || response.output               // ← .output
      || null;                         // ← কিছু না পেলে null
  }

  // অন্য কোনো type (number, boolean) — এটা হওয়া উচিত না
  return null;
}

// ============================================================
// activate(api) — Main entry point
// ============================================================
export function activate(api) {
  // Guard: আগেই active কিনা check করো
  if (isActive) return;

  // ================================================
  // ধাপ ১: Block Component Register
  // ================================================
  api.editor.registerBlock(BLOCK_TYPE, function(props) {
    // --- Props ---
    var block = props.block;                // ← বর্তমান block data
    var setBlocks = props.setBlocks;        // ← State setter
    var isReadOnly = props.isReadOnly;      // ← Read-only mode

    // --- State ---
    var loadingState = React.useState(false); // ← [value, setter]
    var isLoading = loadingState[0];          // ← বর্তমান loading status
    var setLoading = loadingState[1];         // ← Loading setter

    var initialContent = block.content || ''; // ← আগের saved content
    var summaryState = React.useState(initialContent);
    var summary = summaryState[0];            // ← বর্তমান summary text
    var setSummary = summaryState[1];         // ← Summary setter

    // --- updateBlock wrapper ---
    // host app "updateBlock" prop পাঠায় না
    // তাই আমরা setBlocks কে wrap করে একটা helper বানাই
    function updateBlock(updatedData) {
      if (typeof setBlocks === 'function') {
        setBlocks(function(prev) {
          return prev.map(function(b) {
            // শুধু বর্তমান block update করো
            return b.id === block.id
              ? Object.assign({}, b, updatedData) // ← shallow merge
              : b;                                // ← বাকি unchanged
          });
        });
      }
    }

    // --- handleSummarize ---
    // এটাই মূল function — AI call করে summary তৈরি করে
    var handleSummarize = async function() {
      // যদি ইতিমধ্যে loading চলছে, আবার call করবে না
      if (isLoading) return;

      setLoading(true); // ← Loading start

      try {
        // ---- Step A: বর্তমান note এর content নাও ----
        // getCurrentNote() Promise return করে — await করতে হবে
        var currentNote = await api.editor.getCurrentNote();

        // Content বিভিন্ন format-এ আসতে পারে
        var noteContent = '';

        if (currentNote) {
          // Format ১: সরাসরি string (বিরল)
          if (typeof currentNote === 'string') {
            noteContent = stripHtml(currentNote);
          }
          // Format ২: object with blocks array (common)
          else if (currentNote.blocks && Array.isArray(currentNote.blocks)) {
            noteContent = currentNote.blocks
              .map(function(b) { return stripHtml(b.content || ''); })
              .filter(function(c) { return c.trim(); })   // ← empty বাদ
              .join('\n');                                   // ← newline দিয়ে join
          }
          // Format ৩: object with content string
          else if (currentNote.content) {
            noteContent = stripHtml(currentNote.content);
          }
        }

        // Content check — যদি content খুব কম হয়
        if (!noteContent || noteContent.trim().length < 10) {
          // api.ui.notify() দিয়ে error notification দেখাও
          api.ui.notify('নোটে পর্যাপ্ত content নেই!', 'error');
          setLoading(false);
          return; // ← আগেই return
        }

        // ---- Step B: AI Call (fallback chain) ----
        var summaryText = null;

        // Try ১: api.ai.generate() — Primary method
        try {
          var response = await api.ai.generate({
            prompt: 'সারসংক্ষেপ তৈরি করো:\n\n' + noteContent,
            systemInstruction: 'তুমি একটি সামারাইজার। বুলেট পয়েন্টে সারসংক্ষেপ দাও।'
          });
          // extractAIText() দিয়ে JSON থেকে text বের করো
          summaryText = extractAIText(response);
        } catch (e1) {
          // Proxy fail হলে warning দেখাও, কিন্তু crash করবে না
          console.warn('[AI Summarizer] generate() failed:', e1.message);
        }

        // Try ২: api.ai.chat() — Fallback method
        if (!summaryText) {
          try {
            var chatResult = await api.ai.chat([
              { role: 'system', content: 'তুমি একটি সামারাইজার।' },
              { role: 'user', content: 'সারসংক্ষেপ:\n' + noteContent }
            ]);
            // chat() সাধারণত string return করে
            if (typeof chatResult === 'string' && chatResult.trim()) {
              summaryText = chatResult;
            }
          } catch (e2) {
            console.warn('[AI Summarizer] chat() failed:', e2.message);
          }
        }

        // ---- Step C: Result handle ----
        if (summaryText) {
          // Summary পাওয়া গেছে!
          setSummary(summaryText);                              // ← UI update
          updateBlock(Object.assign({}, block, {               // ← Block data update
            content: summaryText
          }));
          api.ui.notify('✅ সামারি তৈরি হয়েছে!', 'success');
        } else {
          // Summary পাওয়া যায়নি
          api.ui.notify('❌ AI থেকে সামারি পাওয়া যায়নি।', 'error');
        }

      } catch (error) {
        // যেকোনো unexpected error catch করো
        console.error('[AI Summarizer] Error:', error);
        api.ui.notify('এরর: ' + (error.message || 'Unknown'), 'error');
      } finally {
        // finally: success হোক বা error, loading বন্ধ করো
        setLoading(false);
      }
    };

    // ---- Render ----
    return React.createElement(
      'div',
      {
        className: 'p-4 my-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200',
        'data-extension-id': BLOCK_TYPE
      },
      [
        // Header row
        React.createElement('div',
          { key: 'header', className: 'flex items-center justify-between mb-3 border-b border-slate-800 pb-2' },
          [
            // Title
            React.createElement('h3',
              { key: 'title', className: 'text-sm font-semibold text-sky-400' },
              '🤖 AI Summarizer'
            ),
            // Button
            React.createElement('button',
              {
                key: 'btn',
                onClick: handleSummarize,                // ← Click handler
                disabled: isLoading || isReadOnly,       // ← Disable conditions
                className: 'px-3 py-1 text-xs rounded-md text-white ' +
                  (isLoading
                    ? 'bg-slate-700 cursor-not-allowed'    // ← Loading state
                    : 'bg-sky-600 hover:bg-sky-500')       // ← Normal state
              },
              isLoading ? '⏳ Processing...' : '🚀 Summarize'
            )
          ]
        ),
        // Content
        React.createElement('div',
          {
            key: 'content',
            className: 'text-sm text-slate-300 leading-relaxed min-h-[40px] whitespace-pre-line'
          },
          summary || '👆 Button click করে সামারি তৈরি করো'
        )
      ]
    );
  });

  // ================================================
  // ধাপ ২: Sidebar Button (Entry Point!)
  // ================================================
  api.ui.registerSidebarItem({
    id: 'ai-summarizer-trigger',
    label: '🤖 AI Summarizer',
    icon: '🤖',
    color: 'border-sky-500/30',
    onClick: function() {
      api.editor.insertBlock(BLOCK_TYPE);  // ← Block insert
      api.ui.notify('Block যোগ হয়েছে!', 'success');
    }
  });

  isActive = true;
  console.log('[AI Summarizer] Activated');
}

// ============================================================
// deactivate(api) — Cleanup
// ============================================================
export function deactivate(api) {
  isActive = false;
  console.log('[AI Summarizer] Deactivated');
}
```

## 📝 কী পরিবর্তন হলো?

| পরিবর্তন | কেন? |
|----------|------|
| `registerSidebarItem()` যোগ | Block insert করার entry point |
| `updateBlock` wrapper (via `setBlocks`) | Host app props compatible |
| `extractAIText()` helper | AI response JSON object → text extraction |
| `stripHtml()` helper | HTML content → plain text for AI |
| `try/catch` error handling | AI fail → graceful error, crash না |
| Fallback: `ai.chat()` if `ai.generate()` fails | Online/offline reliability |
| `isLoading` state + disabled check | Double-click prevention |
| `isReadOnly` check | Read-only mode support |
| `isActive` guard | Duplicate prevention |

---
---

# এক্সাম্পল ৪: 🎨 Theme Extension (থিম)

**উদ্দেশ্য:** অ্যাপের রঙ পরিবর্তন করা।

## ❌ ভুল কোড

### `index.js`
```javascript
export function activate(api) {
  // ❌ api.theme একটা object, function না
  api.theme('dark-purple');
  
  // ❌ CSS inject করার সঠিক method ব্যবহার হচ্ছে না
  document.body.style.backgroundColor = 'purple';
}
```

## ✅ সঠিক কোড

### `manifest.json`
```json
{
  "id": "com.example.purple-theme",
  "name": "Purple Theme",
  "version": "1.0.0",
  "description": "বেগুনি থিম",
  "author": "Test",
  "type": "extension",
  "icon": "🎨",
  "permissions": ["ui", "theme"]
}
```

### `index.js`
```javascript
var isActive = false;

export function activate(api) {
  if (isActive) return;

  // ================================================
  // ধাপ ১: CSS Variables set করো
  // api.theme.setVariables() — একসাথে অনেক CSS variable change করে
  // এগুলো Tailwind/config classes-এ ব্যবহৃত variables override করে
  // ================================================
  api.theme.setVariables({
    '--app-bg-primary': '#1a0a2e',       // ← মূল background color
    '--app-bg-secondary': '#2d1b4e',     // ← Secondary background
    '--app-text-primary': '#e0c3fc',     // ← Primary text color
    '--app-accent': '#a855f7',           // ← Accent/highlight color
    '--app-border': '#4c1d95'            // ← Border color
  });

  // ================================================
  // ধাপ ২: Custom CSS inject করো
  // api.theme.injectCSS() — যেকোনো custom CSS string inject করে
  // এটা <style> tag হিসেবে page-এ add হয়
  // ================================================
  api.theme.injectCSS(
    '/* Purple Theme Custom Styles */' +
    '.sidebar-panel { background: linear-gradient(180deg, #1a0a2e, #2d1b4e) !important; }' +  // ← Sidebar gradient
    '.editor-area { border-color: #4c1d95 !important; }' +                                    // ← Editor border
    'button:hover { box-shadow: 0 0 10px rgba(168, 85, 247, 0.3); }'                          // ← Button glow
  );

  // ================================================
  // ধাপ ৩: Sidebar button — theme toggle/activate করতে
  // ================================================
  api.ui.registerSidebarItem({
    id: 'purple-theme-toggle',
    label: '🎨 Purple Theme',
    icon: '🎨',
    color: 'border-purple-500/30',
    onClick: function() {
      // Theme re-apply করো click করলে
      api.theme.setVariables({
        '--app-bg-primary': '#1a0a2e',
        '--app-accent': '#a855f7'
      });
      api.ui.notify('🎨 Purple Theme active!', 'success');
    }
  });

  isActive = true;
}

export function deactivate(api) {
  // ================================================
  // ✅ Theme reset — deactivate হলে original theme ফিরিয়ে আনো
  // api.theme.reset() — সব custom CSS variables ও injected styles remove করে
  // ================================================
  api.theme.reset();
  isActive = false;
}
```

## 📝 কী পরিবর্তন হলো?

| পরিবর্তন | কেন? |
|----------|------|
| `api.theme.setVariables()` | CSS variables সঠিকভাবে set করার method |
| `api.theme.injectCSS()` | Custom CSS inject করার method |
| `api.theme.reset()` in deactivate | Theme cleanup — না করলে থিম চলতেই থাকবে |
| `registerSidebarItem()` | Theme activate/toggle করার button |
| `"theme"` permission | Theme API access |

---
---

# এক্সাম্পল ৫: 💾 Storage Extension (ডাটা সেভ)

**উদ্দেশ্য:** Extension-এর নিজস্ব data store করা ও পড়া।

## ❌ ভুল কোড

### `index.js`
```javascript
export function activate(api) {
  // ❌ api.storage.get() synchronous ভাবছে, কিন্তু এটা synchronous
  var data = api.storage.get('my_key');
  console.log(data); // কাজ করতে পারে, কিন্তু...
  
  // ❌ Sidebar button নেই
  // ❌ Storage data দেখানোর UI নেই
}
```

## ✅ সঠিক কোড

### `manifest.json`
```json
{
  "id": "com.example.storage-demo",
  "name": "Storage Demo",
  "version": "1.0.0",
  "description": "Data storage demo",
  "author": "Test",
  "type": "extension",
  "icon": "💾",
  "permissions": ["ui", "sidebar", "storage"]
}
```

### `index.js`
```javascript
var isActive = false;
var STORAGE_KEY = 'storage_demo_counter';  // ← Storage key constant

export function activate(api) {
  if (isActive) return;

  // ================================================
  // Block: Counter display + storage demo
  // ================================================
  api.editor.registerBlock('storage-counter', function(props) {
    var block = props.block;
    var setBlocks = props.setBlocks;

    // React state for display
    var countState = React.useState(0);
    var count = countState[0];
    var setCount = countState[1];

    // updateBlock wrapper
    function updateBlock(data) {
      if (typeof setBlocks === 'function') {
        setBlocks(function(prev) {
          return prev.map(function(b) {
            return b.id === block.id ? Object.assign({}, b, data) : b;
          });
        });
      }
    }

    // ================================================
    // api.storage.get(key) — আগে save করা data পড়ো
    // Return: stored value বা undefined
    // ================================================
    var savedCount = api.storage.get(STORAGE_KEY);
    if (savedCount !== undefined && count === 0) {
      setCount(savedCount); // ← আগের saved value set করো
    }

    // Increment function
    var handleIncrement = function() {
      var newCount = count + 1;
      setCount(newCount);                              // ← UI update
      // ================================================
      // api.storage.set(key, value) — data save করো
      // Data persistent — browser close হলেও থাকে
      // ================================================
      api.storage.set(STORAGE_KEY, newCount);           // ← Storage save
      updateBlock({ content: String(newCount) });       // ← Block data update
      api.ui.notify('Count: ' + newCount, 'info');      // ← Notification
    };

    return React.createElement('div',
      {
        className: 'p-4 my-2 rounded-lg bg-green-950 border border-green-800 text-green-200',
        'data-extension-id': 'storage-counter'
      },
      [
        React.createElement('h3',
          { key: 'title', className: 'text-green-400 font-bold text-sm' },
          '💾 Storage Counter'
        ),
        React.createElement('p',
          { key: 'count', className: 'text-2xl font-mono my-2' },
          'Count: ' + count                           // ← Current count display
        ),
        React.createElement('button',
          {
            key: 'btn',
            onClick: handleIncrement,                 // ← Click handler
            className: 'px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-sm text-white'
          },
          '+ Increment'
        )
      ]
    );
  });

  // ================================================
  // Sidebar: Counter block insert + storage clear
  // ================================================
  api.ui.registerSidebarItem({
    id: 'storage-demo-trigger',
    label: '💾 Storage Demo',
    icon: '💾',
    color: 'border-green-500/30',
    onClick: function() {
      api.editor.insertBlock('storage-counter');
      api.ui.notify('💾 Counter block inserted!', 'success');
    }
  });

  isActive = true;
}

export function deactivate(api) {
  // ================================================
  // ✅ api.storage.remove(key) — নির্দিষ্ট key-এর data delete
  // ================================================
  api.storage.remove(STORAGE_KEY);
  isActive = false;
}
```

## 📝 কী পরিবর্তন হলো?

| পরিবর্তন | কেন? |
|----------|------|
| `api.storage.get()` initialization-এ | আগের saved data load |
| `api.storage.set()` increment-এ | নতুন value save |
| `api.storage.remove()` deactivate-এ | Cleanup |
| Sidebar button + block | Entry point + UI |
| `"storage"` permission | Storage API access |

---
---

# এক্সাম্পল ৬: 🔧 Toolbar Tool Extension (টুল)

**উদ্দেশ্য:** Tools dashboard-এ একটা tool যোগ করা।

## ❌ ভুল কোড

### `index.js`
```javascript
export function activate(api) {
  // ❌ registerTool call হচ্ছে কিন্তু function definition ভুল
  api.ui.registerTool = function() {
    console.log('Tool!');
  };
  // ❌ registerTool override করা হচ্ছে — এটা call করা উচিত, override না
}
```

## ✅ সঠিক কোড

### `manifest.json`
```json
{
  "id": "com.example.word-counter",
  "name": "Word Counter",
  "version": "1.0.0",
  "description": "নোটের শব্দ গণনা টুল",
  "author": "Test",
  "type": "extension",
  "icon": "📊",
  "permissions": ["ui", "editor"]
}
```

### `index.js`
```javascript
var isActive = false;

export function activate(api) {
  if (isActive) return;

  // ================================================
  // api.ui.registerTool(config) — Tools dashboard-এ tool যোগ করে
  // config: { id, label, description, onClick }
  // ================================================
  api.ui.registerTool({
    id: 'word-counter-tool',                       // ← ইউনিক tool ID
    label: '📊 Word Counter',                      // ← Tool এর নাম
    description: 'বর্তমান নোটের শব্দ সংখ্যা গণনা করে', // ← বর্ণনা

    // onClick: Tool-এ click করলে execute হয়
    onClick: async function() {
      try {
        // বর্তমান note এর content নাও
        var note = await api.editor.getCurrentNote();

        if (!note) {
          // Note না থাকলে error দেখাও
          api.ui.notify('কোনো নোট খোলা নেই!', 'error');
          return;
        }

        // Content থেকে plain text বের করো
        var text = '';
        if (note.blocks) {
          text = note.blocks
            .map(function(b) { return b.content || ''; })
            .join(' ');
        } else if (note.content) {
          // HTML strip
          var tmp = document.createElement('div');
          tmp.innerHTML = note.content;
          text = tmp.textContent || '';
        }

        // Word count calculation
        var words = text.trim().split(/\s+/).filter(function(w) {
          return w.length > 0;               // ← empty strings বাদ
        }).length;

        // Character count (without spaces)
        var chars = text.replace(/\s/g, '').length;

        // Sentence count (approximate)
        var sentences = text.split(/[.!?]+/).filter(function(s) {
          return s.trim().length > 0;
        }).length;

        // Result দেখাও
        api.ui.showModal({
          title: '📊 Word Counter',
          content: '📝 শব্দ: ' + words + '\n🔤 অক্ষর: ' + chars + '\n📌 বাক্য: ' + sentences
        });

      } catch (error) {
        api.ui.notify('এরর: ' + error.message, 'error');
      }
    }
  });

  // ================================================
  // Sidebar-এও button যোগ করো (easy access)
  // ================================================
  api.ui.registerSidebarItem({
    id: 'word-counter-sidebar',
    label: '📊 Word Count',
    icon: '📊',
    color: 'border-amber-500/30',
    onClick: async function() {
      var note = await api.editor.getCurrentNote();
      if (note && note.content) {
        var words = note.content.trim().split(/\s+/).length;
        api.ui.notify('📝 শব্দ: ' + words, 'info');
      } else {
        api.ui.notify('নোট খোলা নেই', 'error');
      }
    }
  });

  isActive = true;
}

export function deactivate(api) {
  isActive = false;
}
```

## 📝 কী পরিবর্তন হলো?

| পরিবর্তন | কেন? |
|----------|------|
| `api.ui.registerTool()` (call, not override) | Tools dashboard-এ tool যোগ করার সঠিক method |
| `api.editor.getCurrentNote()` | বর্তমান নোটের data access |
| `api.ui.showModal()` | Result modal-এ দেখানোর জন্য |
| `api.ui.registerSidebarItem()` | Quick access sidebar button |
| Error handling | Note না থাকলে graceful error |

---
---

# এক্সাম্পল ৭: 📱 Hub App Extension (ফুল-স্ক্রিন অ্যাপ)

**উদ্দেশ্য:** Extension Hub-এ একটা full-screen app যোগ করা।

## ❌ ভুল কোড

### `index.js`
```javascript
export function activate(api) {
  // ❌ React component return করছে কিন্তু registerApp call করছে না
  function MyApp() {
    return React.createElement('div', null, 'My App');
  }
  // ❌ MyApp কেউ use করছে না — dead code
}
```

## ✅ সঠিক কোড

### `manifest.json`
```json
{
  "id": "com.example.notes-stats",
  "name": "Notes Statistics",
  "version": "1.0.0",
  "description": "নোট পরিসংখ্যান অ্যাপ",
  "author": "Test",
  "type": "extension",
  "icon": "📈",
  "permissions": ["ui", "storage"]
}
```

### `index.js`
```javascript
var isActive = false;

export function activate(api) {
  if (isActive) return;

  // ================================================
  // api.ui.registerApp(config) — Hub-এ full-screen app register করে
  // config: { id, title, icon, Component }
  //
  // Component হলো একটা React component যেটা full-screen render হয়
  // এটা extension hub/dashboard থেকে accessible হবে
  // ================================================
  api.ui.registerApp({
    id: 'notes-stats-app',                       // ← ইউনিক app ID
    title: '📈 Notes Statistics',                // ← App title (hub-এ দেখায়)
    icon: '📈',                                  // ← App icon

    // Component: React component — এটা full-screen page হিসেবে render হয়
    Component: function() {
      // --- State ---
      var dataState = React.useState(null);      // ← Stats data state
      var data = dataState[0];
      var setData = dataState[1];

      var loadingState = React.useState(true);   // ← Loading state
      var loading = loadingState[0];
      var setLoading = loadingState[1];

      // --- Data load effect ---
      React.useEffect(function() {
        // api.storage.get() দিয়ে data load করো
        var savedData = api.storage.get('notes_stats_data');
        if (savedData) {
          setData(savedData);                     // ← Saved data use করো
        }
        setLoading(false);
      }, []);                                     // ← Empty deps = mount-এ একবার

      // --- Render ---
      if (loading) {
        return React.createElement('div',
          { className: 'flex items-center justify-center h-full text-white/50' },
          'Loading...'
        );
      }

      return React.createElement('div',
        {
          className: 'p-6 max-w-2xl mx-auto',
          'data-extension-id': 'notes-stats-app'
        },
        [
          // App Title
          React.createElement('h1',
            {
              key: 'title',
              className: 'text-2xl font-bold text-white mb-6'
            },
            '📈 Notes Statistics'
          ),
          // Stats Card
          React.createElement('div',
            {
              key: 'card',
              className: 'p-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-200'
            },
            [
              React.createElement('p',
                { key: 'info', className: 'text-sm' },
                data
                  ? 'Last analysis: ' + JSON.stringify(data)
                  : 'কোনো data নেই। Sidebar থেকে analysis run করো।'
              )
            ]
          )
        ]
      );
    }
  });

  // ================================================
  // Sidebar: App তে navigate করার button
  // ================================================
  api.ui.registerSidebarItem({
    id: 'notes-stats-sidebar',
    label: '📈 Stats',
    icon: '📈',
    color: 'border-indigo-500/30',
    onClick: function() {
      // Hub app খোলার জন্য notification দেখাও
      api.ui.notify('Extension Hub → Notes Statistics খুলুন', 'info');
    }
  });

  isActive = true;
}

export function deactivate(api) {
  isActive = false;
}
```

## 📝 কী পরিবর্তন হলো?

| পরিবর্তন | কেন? |
|----------|------|
| `api.ui.registerApp()` কল | Hub-এ app register করার সঠিক method |
| `Component` property-তে React component | Full-screen app rendering |
| `React.useEffect()` for data loading | Component mount-এ data load |
| `api.storage.get()` for persistence | Saved data access |
| Sidebar button | Easy navigation |

---
---

# এক্সাম্পল ৮: 🔄 Extension যেটা অন্য Extension Check করে

**উদ্দেশ্য:** `api.system` ব্যবহার করে অন্য extension installed কিনা check করা।

## ❌ ভুল কোড

### `index.js`
```javascript
export function activate(api) {
  // ❌ api.system একটা optional field, check ছাড়া access করা risky
  var status = api.system.getInstalledStatus('some.id');
  // ❌ যদি api.system undefined হয় → crash
  
  // ❌ কোনো UI entry point নেই
}
```

## ✅ সঠিক কোড

### `manifest.json`
```json
{
  "id": "com.example.dependency-checker",
  "name": "Dependency Checker",
  "version": "1.0.0",
  "description": "অন্য extension check করে",
  "author": "Test",
  "type": "extension",
  "icon": "🔗",
  "permissions": ["ui", "sidebar"]
}
```

### `index.js`
```javascript
var isActive = false;

export function activate(api) {
  if (isActive) return;

  // ================================================
  // Sidebar Button — Dependency check trigger
  // ================================================
  api.ui.registerSidebarItem({
    id: 'dependency-checker-btn',
    label: '🔗 Dependency Check',
    icon: '🔗',
    color: 'border-orange-500/30',
    onClick: function() {

      // ================================================
      // ✅ api.system optional — আগে check করো আছে কিনা
      // পুরানো version-এ api.system নাও থাকতে পারে
      // ================================================
      if (!api.system) {
        // api.system না থাকলে fallback message
        api.ui.showModal({
          title: '🔗 Dependency Checker',
          content: 'System API available নয়। অ্যাপ আপডেট করুন।'
        });
        return; // ← আগেই return
      }

      // ================================================
      // api.system.getInstalledStatus(id)
      // Return: { installed: boolean, version?: string, type?: string }
      // ================================================
      var summarizerStatus = api.system.getInstalledStatus('com.example.ai-summarizer');
      // summarizerStatus = { installed: false } বা { installed: true, version: "1.0.0" }

      var themeStatus = api.system.getInstalledStatus('com.example.purple-theme');

      // ================================================
      // api.system.getExtensionMetadata(id)
      // Return: extension এর full metadata (manifest + script)
      // ================================================
      var summarizerMeta = null;
      if (summarizerStatus && summarizerStatus.installed) {
        // শুধু installed থাকলে metadata নাও
        try {
          summarizerMeta = api.system.getExtensionMetadata('com.example.ai-summarizer');
        } catch (e) {
          console.warn('Metadata fetch failed:', e);
        }
      }

      // Result modal দেখাও
      var content = '📊 Extension Status Report:\n\n';
      content += '🤖 AI Summarizer: ' + (summarizerStatus?.installed ? '✅ Installed (v' + summarizerStatus.version + ')' : '❌ Not Installed') + '\n';
      content += '🎨 Purple Theme: ' + (themeStatus?.installed ? '✅ Installed' : '❌ Not Installed') + '\n';

      if (summarizerMeta) {
        content += '\n📋 AI Summarizer Details:\n';
        content += '  Author: ' + (summarizerMeta.author || 'N/A') + '\n';
        content += '  Permissions: ' + (summarizerMeta.permissions || []).join(', ') + '\n';
      }

      api.ui.showModal({
        title: '🔗 Dependency Checker',
        content: content
      });
    }
  });

  isActive = true;
}

export function deactivate(api) {
  isActive = false;
}
```

## 📝 কী পরিবর্তন হলো?

| পরিবর্তন | কেন? |
|----------|------|
| `api.system` existence check | Optional field — undefined হতে পারে |
| `getInstalledStatus()` | Extension installed কিনা check |
| `getExtensionMetadata()` | Full metadata access |
| Sidebar button | Entry point |
| `showModal()` for results | Detailed result display |

---
---

# এক্সাম্পল ৯: 🔄 Data Filter Extension (Hook System)

**উদ্দেশ্য:** নোট save হওয়ার আগে data modify করা।

## ❌ ভুল কোড

### `index.js`
```javascript
export function activate(api) {
  // ❌ api.addFilter ভুলভাবে ব্যবহার
  api.addFilter('beforeSave', function(blocks) {
    return blocks.map(b => ({ ...b, content: b.content.toUpperCase() }));
  });
  // ❌ Permission-এ "editor" নেই
  // ❌ Sidebar button নেই (filter auto-apply হয়, কিন্তু disable করার উপায় নেই)
}
```

## ✅ সঠিক কোড

### `manifest.json`
```json
{
  "id": "com.example.uppercase-filter",
  "name": "Uppercase Filter",
  "version": "1.0.0",
  "description": "নোট save হওয়ার আগে content uppercase করে",
  "author": "Test",
  "type": "extension",
  "icon": "🔤",
  "permissions": ["editor", "ui", "sidebar"]
}
```

### `index.js`
```javascript
var isActive = false;
var filterEnabled = true; // ← Filter on/off state

export function activate(api) {
  if (isActive) return;

  // ================================================
  // ধাপ ১: Data Filter Register
  // api.addFilter(hookName, callback)
  //
  // Available hooks:
  //   'beforeSave' — data save হওয়ার আগে
  //   'afterLoad'  — data load হওয়ার পর
  //
  // callback parameter: data (blocks array)
  // callback return: modified data (blocks array)
  // ================================================
  api.addFilter('beforeSave', function(blocks) {
    // যদি filter disabled থাকে, data unchanged return করো
    if (!filterEnabled) return blocks;

    // প্রতিটা block process করো
    return blocks.map(function(b) {
      // শুধু paragraph, h1, h2, h3 blocks uppercase করো
      // code, table blocks unchanged রাখো
      var shouldTransform = ['paragraph', 'h1', 'h2', 'h3', 'quote'].indexOf(b.type) !== -1;

      if (shouldTransform && b.content) {
        // নতুন object তৈরি করো (mutation এড়াতে)
        return Object.assign({}, b, {
          content: b.content.toUpperCase() // ← Content uppercase
        });
      }

      return b; // ← Unchanged
    });
  });

  // ================================================
  // ধাপ ২: Sidebar button — Filter toggle
  // ================================================
  api.ui.registerSidebarItem({
    id: 'uppercase-filter-toggle',
    label: '🔤 Uppercase Filter',
    icon: filterEnabled ? '✅' : '❌', // ← Status indicator
    color: 'border-red-500/30',
    onClick: function() {
      // Toggle filter state
      filterEnabled = !filterEnabled;

      // Notify user
      var status = filterEnabled ? 'ON ✅' : 'OFF ❌';
      api.ui.notify('Uppercase Filter: ' + status, filterEnabled ? 'success' : 'info');

      // Note: icon dynamically change হবে না (sidebar re-render needed)
      // কিন্তু filter state change হয়ে যাবে
    }
  });

  isActive = true;
}

export function deactivate(api) {
  // ✅ Filter remove + state reset
  filterEnabled = true; // ← Default-এ reset
  isActive = false;
}
```

## 📝 কী পরিবর্তন হলো?

| পরিবর্তন | কেন? |
|----------|------|
| `api.addFilter('beforeSave', ...)` | Save hook register |
| Filter toggle state | Enable/disable control |
| Block type check | সব block uppercase না করে নির্দিষ্ট types only |
| Sidebar toggle button | User control over filter |
| `Object.assign({}, b, {...})` | Immutable update (mutation safe) |

---
---

# এক্সাম্পল ১০: 🚀 সম্পূর্ণ Feature-Rich Extension (সব একসাথে)

**উদ্দেশ্য:** Sidebar button + Editor block + AI + Storage + Theme + Tool — সব feature সম্বলিত একটা production-grade extension।

## ❌ ভুল কোড

### `index.js` (ভুল — সব আলাদাভাবে, entry point নেই, props ভুল, AI response ভুল)
```javascript
export function activate(api) {
  // ❌ Block register করছে কিন্তু insert করার উপায় নেই
  api.editor.registerBlock('smart-note', (props) => {
    const { block, updateBlock } = props; // ❌ updateBlock undefined
    const [text, setText] = React.useState('');
    const handleClick = async () => {
      const res = await api.ai.generate({ prompt: text }); // ❌ JSON response
      setText(res); // ❌ [object Object]
      updateBlock({ content: res }); // ❌ TypeError
    };
    return React.createElement('div', null, [
      React.createElement('input', { value: text, onChange: e => setText(e.target.value) }),
      React.createElement('button', { onClick: handleClick }, 'Ask AI'),
      React.createElement('p', null, text)
    ]);
  });
  // ❌ কোনো sidebar button নেই
  // ❌ কোনো tool নেই
  // ❌ deactivate নেই
  // ❌ Error handling নেই
}
```

## ✅ সঠিক কোড (Production-Grade)

### `manifest.json`
```json
{
  "id": "com.example.smart-note",
  "name": "Smart Note Assistant",
  "version": "1.0.0",
  "description": "AI-powered note assistant — sidebar, block, theme, storage সহ",
  "author": "Diamond Road Developer",
  "type": "extension",
  "icon": "🚀",
  "permissions": ["ui", "sidebar", "editor", "ai", "storage", "theme"]
}
```

### `index.js`
```javascript
// ============================================================
// SMART NOTE ASSISTANT — Production Extension
// Features: Sidebar + Block + AI + Storage + Theme + Tool
// ============================================================

// --- Constants ---
var BLOCK_TYPE = 'smart-note-block';           // ← Block type ID
var STORAGE_KEY = 'smart_note_history';         // ← Storage key for history
var THEME_KEY = 'smart_note_theme';             // ← Storage key for theme
var isActive = false;                           // ← Activation guard

// ============================================================
// HELPER: HTML থেকে plain text
// ============================================================
function stripHtml(html) {
  if (!html) return '';                          // ← null check
  try {
    var div = document.createElement('div');
    div.innerHTML = html;
    return (div.textContent || div.innerText || '').trim();
  } catch (e) {
    return html.replace(/<[^>]*>/g, '').trim();  // ← regex fallback
  }
}

// ============================================================
// HELPER: AI response → text extraction
// ============================================================
function extractAIText(res) {
  if (!res) return null;                         // ← null check
  if (typeof res === 'string') return res;       // ← string direct
  if (typeof res === 'object') {
    if (res.error) throw new Error(res.message || 'AI error'); // ← error check
    // Gemini format
    var gemini = res?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (gemini) return gemini;
    // OpenAI format
    var openai = res?.choices?.[0]?.message?.content;
    if (openai) return openai;
    // Generic
    return res.text || res.content || res.output || null;
  }
  return null;
}

// ============================================================
// MAIN: activate()
// ============================================================
export function activate(api) {
  if (isActive) return;                          // ← Duplicate guard

  // ================================================
  // FEATURE ১: Editor Block — Smart Note Block
  // ================================================
  api.editor.registerBlock(BLOCK_TYPE, function(props) {
    var block = props.block;                     // ← Block data
    var setBlocks = props.setBlocks;             // ← State setter
    var isReadOnly = props.isReadOnly;           // ← Read-only flag

    // --- State ---
    var inputState = React.useState('');         // ← User input
    var input = inputState[0];
    var setInput = inputState[1];

    var loadingState = React.useState(false);    // ← Loading flag
    var isLoading = loadingState[0];
    var setLoading = loadingState[1];

    var resultState = React.useState(block.content || ''); // ← AI result
    var result = resultState[0];
    var setResult = resultState[1];

    // --- updateBlock wrapper ---
    function updateBlock(data) {
      if (typeof setBlocks === 'function') {
        setBlocks(function(prev) {
          return prev.map(function(b) {
            return b.id === block.id ? Object.assign({}, b, data) : b;
          });
        });
      }
    }

    // --- Save to history ---
    function saveToHistory(question, answer) {
      // আগের history load করো
      var history = api.storage.get(STORAGE_KEY) || [];
      // নতুন entry যোগ করো
      history.unshift({
        question: question,                       // ← প্রশ্ন
        answer: answer,                           // ← উত্তর
        timestamp: Date.now()                     // ← সময়
      });
      // সর্বোচ্চ ৫০টা entry রাখো
      if (history.length > 50) history = history.slice(0, 50);
      // Save করো
      api.storage.set(STORAGE_KEY, history);
    }

    // --- AI Call ---
    var handleAsk = async function() {
      if (isLoading || !input.trim()) return;    // ← Guard
      setLoading(true);

      try {
        var response = await api.ai.generate({
          prompt: input,
          systemInstruction: 'তুমি একটি smart note assistant। সংক্ষেপে ও কার্যকর উত্তর দাও।'
        });
        var text = extractAIText(response);       // ← Extract text

        if (text) {
          setResult(text);                        // ← UI update
          updateBlock({ content: text });         // ← Block data update
          saveToHistory(input, text);             // ← History save
          api.ui.notify('✅ উত্তর তৈরি!', 'success');
        } else {
          api.ui.notify('❌ AI উত্তর দিতে পারেনি', 'error');
        }
      } catch (err) {
        api.ui.notify('এরর: ' + err.message, 'error');
      } finally {
        setLoading(false);
        setInput('');                             // ← Input clear
      }
    };

    // --- Render ---
    return React.createElement('div',
      {
        className: 'p-4 my-3 rounded-xl bg-gradient-to-br from-slate-950 to-indigo-950 border border-indigo-800/50 text-slate-200',
        'data-extension-id': BLOCK_TYPE
      },
      [
        // Header
        React.createElement('div',
          { key: 'header', className: 'flex items-center gap-2 mb-3 pb-2 border-b border-indigo-800/50' },
          [
            React.createElement('span', { key: 'icon', className: 'text-lg' }, '🚀'),
            React.createElement('h3', { key: 'title', className: 'text-sm font-bold text-indigo-400' }, 'Smart Note Assistant')
          ]
        ),
        // Input area
        React.createElement('div', { key: 'input-row', className: 'flex gap-2 mb-3' },
          [
            React.createElement('input',
              {
                key: 'input',
                type: 'text',                     // ← Text input
                value: input,                     // ← Controlled input
                onChange: function(e) {
                  setInput(e.target.value);       // ← Input update
                },
                placeholder: 'প্রশ্ন লিখুন...',     // ← Placeholder
                className: 'flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500',
                disabled: isLoading || isReadOnly  // ← Disable conditions
              }
            ),
            React.createElement('button',
              {
                key: 'ask-btn',
                onClick: handleAsk,               // ← Submit handler
                disabled: isLoading || !input.trim() || isReadOnly,
                className: 'px-4 py-2 text-sm rounded-lg font-medium text-white transition-all ' +
                  (isLoading || !input.trim()
                    ? 'bg-slate-700 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-500 active:scale-95')
              },
              isLoading ? '⏳' : '🚀'            // ← Loading indicator
            )
          ]
        ),
        // Result area
        result
          ? React.createElement('div',
              {
                key: 'result',
                className: 'p-3 bg-slate-900/50 rounded-lg text-sm leading-relaxed whitespace-pre-line'
              },
              result                              // ← AI result text
            )
          : React.createElement('div',
              {
                key: 'placeholder',
                className: 'text-slate-500 text-sm italic'
              },
              '👆 প্রশ্ন লিখে Ask button-এ click করো'
            )
      ]
    );
  });

  // ================================================
  // FEATURE ২: Sidebar Button — Block Insert
  // ================================================
  api.ui.registerSidebarItem({
    id: 'smart-note-sidebar',
    label: '🚀 Smart Note',
    icon: '🚀',
    color: 'border-indigo-500/30',
    onClick: function() {
      api.editor.insertBlock(BLOCK_TYPE);        // ← Block insert
      api.ui.notify('🚀 Smart Note block যোগ হয়েছে!', 'success');
    }
  });

  // ================================================
  // FEATURE ৩: Tool Dashboard — Quick AI Tool
  // ================================================
  api.ui.registerTool({
    id: 'smart-note-tool',
    label: '🚀 Quick AI Ask',
    description: 'দ্রুত AI-তে প্রশ্ন করো',
    onClick: async function() {
      var note = await api.editor.getCurrentNote();
      if (note && note.content) {
        try {
          var res = await api.ai.generate({
            prompt: 'এই নোটের মূল পয়েন্ট তিনটি বুলেটে লিখো:\n' + stripHtml(note.content),
            systemInstruction: 'সংক্ষেপে উত্তর দাও।'
          });
          var text = extractAIText(res);
          if (text) {
            api.ui.showModal({ title: '🚀 Quick Summary', content: text });
          }
        } catch (e) {
          api.ui.notify('AI error: ' + e.message, 'error');
        }
      } else {
        api.ui.notify('প্রথমে একটি নোট খুলুন', 'error');
      }
    }
  });

  // ================================================
  // FEATURE ৪: Theme — Custom accent color
  // ================================================
  api.theme.setVariables({
    '--smart-note-accent': '#818cf8'             // ← Custom CSS variable
  });

  // ================================================
  // Activation complete
  // ================================================
  isActive = true;
  console.log('[Smart Note] v1.0 Activated');
}

// ============================================================
// DEACTIVATE: Full cleanup
// ============================================================
export function deactivate(api) {
  // ✅ Theme reset
  api.theme.reset();

  // ✅ State reset
  isActive = false;
  console.log('[Smart Note] Deactivated');
}
```

## 📝 কী পরিবর্তন হলো?

| পরিবর্তন | কেন? |
|----------|------|
| ৪টি feature একসাথে | Sidebar + Block + Tool + Theme — সব entry point |
| `registerSidebarItem()` | Block insert করার main button |
| `registerTool()` | Quick AI tool — sidebar ছাড়াও access |
| `updateBlock` wrapper via `setBlocks` | Host app props compatible |
| `extractAIText()` | JSON → text conversion |
| `stripHtml()` | HTML → plain text |
| `api.storage` for history | Data persistence |
| `api.theme.setVariables()` | Custom styling |
| `api.theme.reset()` in deactivate | Cleanup |
| Error handling everywhere | Crash prevention |
| `isActive` guard | Duplicate prevention |
| Input validation | Empty input prevention |
| `isReadOnly` check | Read-only mode support |

---

## 📊 সারসংক্ষেপ টেবিল

| # | Extension | Entry Point | API ব্যবহার | প্রধান শিক্ষা |
|---|-----------|-------------|------------|--------------|
| ১ | Hello Button | Sidebar | `registerSidebarItem` | Entry point সবার আগে |
| ২ | Hello Block | Sidebar + Editor | `registerBlock` + `insertBlock` | Block insert করার trigger দরকার |
| ৩ | AI Summarizer | Sidebar + Editor | `ai.generate` + `ai.chat` | Response extraction + HTML strip |
| ৪ | Purple Theme | Sidebar | `theme.setVariables` + `injectCSS` | Theme cleanup on deactivate |
| ৫ | Storage Counter | Sidebar + Editor | `storage.get/set/remove` | Data persistence ও cleanup |
| ৬ | Word Counter | Sidebar + Tool | `getCurrentNote` + `showModal` | Tool dashboard integration |
| ৭ | Notes Stats | Sidebar + Hub App | `registerApp` | Full-screen app registration |
| ৮ | Dependency Checker | Sidebar | `system.getInstalledStatus` | Optional API check |
| ৯ | Uppercase Filter | Sidebar | `addFilter` | Data hook system |
| ১০ | Smart Note | Sidebar + Block + Tool + Theme | সব API | Production-grade template |

> **সবচেয়ে গুরুত্বপূর্ণ নিয়ম:** প্রতিটি extension-এ অন্তত একটা **UI entry point** থাকতে হবে (`registerSidebarItem`, `registerTool`, বা `registerApp`)। নাহলে extension invisible হয়ে থাকবে। 🚀
