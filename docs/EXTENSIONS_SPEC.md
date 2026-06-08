# Diamond Road: Extension System Specification (V1.0)
## The Ultimate Guide for Extension Developers

Diamond Road একটি প্লাগএববল নোট-টেকিং প্ল্যাটফর্ম। এই ডকুমেন্টটি ডেভেলপারদের জন্য তৈরি করা হয়েছে যাতে তারা অ্যাপের ইন্টারনাল কোড না দেখেই পাওয়ারফুল এক্সটেনশন এবং হাব অ্যাপ তৈরি করতে পারেন।

---

## ১. এনভায়রনমেন্ট (Runtime Environment)

আপনার এক্সটেনশন কোডটি একটি স্যান্ডবক্সড এনভায়রনমেন্টে চলে যেখানে নিচের গ্লোবাল ভেরিয়েবলগুলো সরাসরি পাওয়া যায়:

- `React`: UI কম্পোনেন্ট তৈরির জন্য।
- `Lucide`: আইকনের জন্য (Lucide-react library)।
- `api`: অ্যাপের সাথে ইন্টারেক্ট করার প্রধান মাধ্যম (AppAPI)।

---

## ২. ম্যানিফেস্ট ফাইল (manifest.json)

প্রতিটি এক্সটেনশনের মূলে থাকে একটি `manifest.json` ফাইল। এটি আপনার এক্সটেনশনের পরিচয়পত্র।

```json
{
  "id": "com.developer.ai-assistant",
  "name": "AI Logic Assistant",
  "version": "1.0.0",
  "description": "Smart AI blocks for your editor",
  "author": "John Doe",
  "type": "extension",
  "icon": "🤖",
  "permissions": ["ui", "sidebar", "editor", "ai", "storage"]
}
```

### ২.১ পারমিশন লিস্ট (Permissions Matrix)

নিরাপত্তার স্বার্থে অ্যাপের প্রতিটি ফিচারের জন্য পারমিশন চেক করা হয়।

| Permission | API Access | Purpose |
|------------|------------|---------|
| `sidebar`  | `api.ui.registerSidebarItem` | বাম পাশের সাইডবারে বাটন যোগ করা। |
| `ui`       | `api.ui.registerApp`, `api.ui.registerTool`, `api.ui.showModal`, `api.ui.notify` | কাস্টম ড্যাশবোর্ড, টুলবার বাটন এবং নোটিফিকেশন। |
| `editor`   | `api.editor.registerBlock`, `api.editor.getCurrentNote`, `api.editor.applyChanges` | এডিটরের ডাটা পড়া বা নোট মডিফাই করা। |
| `ai`       | `api.ai.chat`, `api.ai.generate` | জেমিনি এআই (Gemini AI) এক্সেস করা। |
| `storage`  | `api.storage.get`, `api.storage.set` | ডাটা পারসিস্টেন্টলি সেভ করে রাখা। |
| `theme`    | `api.ui.registerTheme` | অ্যাপের ভিজ্যুয়াল থিম পরিবর্তন করা। |

---

## ৩. এপিআই রেফারেন্স (API Reference)

### ৩.১ API: UI (User Interface)

- `api.ui.registerSidebarItem(config)`: সাইডবারে নতুন বাটন যোগ করে।
  - `config`: `{ id, label, icon, onClick }`
- `api.ui.registerApp(config)`: এক্সটেনশন হাব-এ একটি ফুল-স্ক্রিন অ্যাপ রেজিস্টার করে।
  - `config`: `{ id, title, icon, Component }`
- `api.ui.notify(message, type)`: ইউজারকে নোটিফিকেশন পাঠায়। `type` হতে পারে `'success'`, `'info'`, `'error'`।
- `api.ui.showModal(config)`: একটি পপআপ উইন্ডো দেখায়।
  - `config`: `{ title, content }`

### ৩.২ API: Editor

- `api.editor.registerBlock(type, Component)`: এডিটরে নতুন কাস্টম ব্লক যোগ করে।
- `api.editor.getCurrentNote()`: বর্তমান নোটের টাইটেল, কন্টেন্ট এবং মেটাডাটা রিটার্ন করে। (Returns a Promise)
- `api.editor.applyChanges(newContent, reason)`: নোটের ডাটা পরিবর্তন করার রিকোয়েস্ট পাঠায়। এটি ইউজারের পারমিশন প্রম্পট ট্রিগার করবে।
- `api.editor.insertBlock(type)`: কার্সারের পজিশনে একটি ব্লক ইনসার্ট করে।

### ৩.৩ API: AI (Artificial Intelligence)

- `api.ai.chat(messages)`: জেমিনি এআই এর সাথে চ্যাট করার জন্য। (Returns a Promise)
  - `messages`: `[{ role: 'user' | 'assistant' | 'system', content: string }]`
- `api.ai.generate({ prompt, systemInstruction })`: সিম্পল টেক্সট জেনারেশনের জন্য।

### ৩.৪ API: Storage

- `api.storage.set(key, value)`: ডাটা সেভ করা।
- `api.storage.get(key)`: সেভ করা ডাটা পড়া।

### ৩.৫ API: System (New)

- `api.system.getInstalledStatus(id)`: কোনো নির্দিষ্ট এক্সটেনশন ইনস্টল করা আছে কিনা এবং তার ভার্সন চেক করার জন্য।
- `api.system.getExtensionMetadata(id)`: এক্সটেনশনের বিস্তারিত মেটাডাটা এবং সোর্স কোড (script) পাওয়ার জন্য। এটি দিয়ে আপনি অন্য এক্সটেনশন বা নিজের এক্সটেনশনের সোর্স ডাটা চেক করতে পারবেন।

---

## ৪. কাস্টম ব্লক তৈরি (Custom Blocks)

রিল্যাক্ট (React) ব্যবহার করে আপনি এডিটরে অত্যন্ত পাওয়ারফুল ব্লক বানাতে পারেন।

```javascript
// index.js
export function activate(api) {
  api.editor.registerBlock('my-custom-card', ({ block, updateBlock }) => {
    return React.createElement('div', { 
      className: 'p-4 rounded-lg bg-slate-900 border border-slate-700' 
    }, [
      React.createElement('h3', { className: 'text-white' }, 'My AI Card'),
      React.createElement('p', { className: 'text-slate-400' }, block.content)
    ]);
  });
}
```

---

## ৫. ডেভেলপমেন্ট গাইড (Quick Start)

১. একটি ফোল্ডার তৈরি করুন যেখানে `manifest.json` এবং `index.js` থাকবে।
২. আপনার কোড লিখুন এবং `activate(api)` ফাংশনটি এক্সপোর্ট করুন।
৩. ফোল্ডারটিকে **ZIP** করুন।
৪. Diamond Road-এর **Developer Editor**-এ গিয়ে জিপ ফাইলটি আপলোড করুন।
৫. "Run Project" এ ক্লিক করলেই আপনার এক্সটেনশনটি অ্যাপে লোড হয়ে যাবে।

---

## ৬. নিয়মাবলী (Best Practices)

- **Performance**: খুব বেশি ফিল্টার বা অটোমেটিক `applyChanges` করবেন না, এতে অ্যাপ স্লো হতে পারে। 
- **Design**: শ্যাডসিএন (shadcn) এবং টেলউইন্ড (Tailwind) এর কালার প্যালেট মেনে চলুন।
- **Security**: কখনোই পারমিশন ছাড়া ইউজারের নোটের ডাটা ডিলিট বা পরিবর্তন করার চেষ্টা করবেন না।

---

© 2026 Diamond Road Ecosystem. Happy Coding!
