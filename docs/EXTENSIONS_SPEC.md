# Extension System Specification (V1.0)
## Project: Diamond Road Note-Taking App

এই ডকুমেন্টটি আপনার অ্যাপের এক্সটেনশন সিস্টেমের আর্কিটেকচার, কোডিং স্ট্যান্ডার্ড এবং সীমাবদ্ধতাগুলো সংজ্ঞায়িত করে। এই গাইডলাইন মেনে চললে আপনার অ্যাপে বাগ বা গ্লিচ ছাড়াই অসংখ্য থিম এবং ফিচার রিচ এক্সটেনশন যোগ করা সম্ভব হবে।

---

### ১. আর্কিটেকচারাল ফিলোসফি (The Logic)
আমরা এখানে **"Hook-based Plugin Architecture"** ব্যবহার করব। 
- **Core App**: ডাটা ম্যানেজমেন্ট এবং রেন্ডারিং লজিকের মালিক।
- **Extension Registry**: এখানে সব এক্সটেনশন রেজিস্টারড হবে।
- **Hooks**: অ্যাপের বিভিন্ন জায়গায় (Sidebar, Editor, Toolbar) আমরা "Slot" বা "Hook" রাখব যেখানে এক্সটেনশনগুলো তাদের কোড বা স্টাইল ইনজেক্ট করতে পারবে।

---

### ২. এক্সটেনশন কোডিং স্ট্যান্ডার্ড (Coding Rules)

প্রতিটি এক্সটেনশন একটি স্ট্যান্ডার্ড অবজেক্ট হিসেবে থাকতে হবে যা নিচের ইন্টারফেস ফলো করবে:

```typescript
interface AppExtension {
  id: string;             // ইউনিক আইডি (e.g., 'nebula-dark-theme')
  name: string;           // নাম
  version: string;        // ভার্সন
  author: string;         // ডেভেলপারের নাম
  description: string;    // বর্ণনা
  type: 'theme' | 'tool' | 'widget'; 
  
  // Lifecycle Methods
  init: (api: AppAPI) => void;    // যখন এক্সটেনশন লোড হবে
  destroy: (api: AppAPI) => void; // যখন এক্সটেনশন রিমুভ করা হবে
}
```

#### API Reference (AppAPI):

এক্সটেনশনগুলো `init` মেথডের মাধ্যমে নিচের সার্ভিসগুলোতে এক্সেস পাবে:

**১. ui Namespace:**
- `registerTheme(config: ThemeConfig)`: এডিটরের জন্য নতুন ক্যানভাস থিম রেজিস্টার করে।
- `registerTool(config: ToolConfig)`: নতুন এডিটর টুল বা মডিউল যোগ করে। এটি রেজিস্টার করলে এডিটরের (+) বা ইনসার্ট মেনুতে টুলটি দেখা যাবে।
- `registerSidebarItem(item: SidebarItem)`: বাম পাশের সাইডবারে আইটেম যোগ করে।
- `addButton(btn: ToolbarButton)`: এডিটর টুলবারে বাটন যোগ করে।
- `notify(message: string, type: string)`: ইউজারকে নোটিফিকেশন দেখায়।

**২. Editor Namespace:**
- `registerBlock(type: string, Component: React.ComponentType<any>)`: এডিটরের জন্য নতুন কাস্টম ব্লক টাইপ রেন্ডারার রেজিস্টার করে।
- `addFilter(hook: string, callback: (data: any) => any)`: ডাটা প্রসেসিংয়ের সময় হুক যোগ করে (e.g., 'onLoad', 'beforeSave').

**৩. storage Namespace:**
- `get(key)` / `set(key, value)`: এক্সটেনশনের জন্য পারসিস্টেন্ট ডাটা সেভ এবং লোড করে।

---

### ৩. থিম রেজিস্ট্রেশন লজিক (Theme API)

একটি থিম এক্সটেনশন তৈরি করতে `ui.registerTheme` ব্যবহার করতে হয়:

```javascript
api.ui.registerTheme({
  id: 'my-custom-theme',
  name: 'Ocean Blue',
  description: 'A deep sea writing experience',
  previewClassName: 'bg-blue-900', // থিম সিলেক্টরে প্রিভিউ কালার
  config: {
    // CSS মেইন ভেরিয়েবল যা ক্যানভাসে অ্যাপ্লাই হবে
    styles: {
      '--editor-bg': '#001529',
      '--editor-text': '#e6f7ff',
      '--editor-line': '#002140'
    }
  }
});
```

---

### ৪. কাস্টম ব্লক রেজিস্ট্রেশন (Custom Block API)

এডিটরের ভেতরে নতুন কোনো এলিমেন্ট (যেমন: ক্লক, ক্যালেন্ডার, চার্ট) যোগ করতে নিচে দেয়া পদ্ধতি অনুসরণ করুন:

```javascript
// ১. রেন্ডারার কম্পোনেন্ট তৈরি করুন
const MyBlock = ({ block, setBlocks, isReadOnly }) => {
  return React.createElement('div', { 
    className: 'p-4 bg-blue-500 rounded-xl text-white' 
  }, 'This is a custom extension block!');
};

// ২. এডিটরের রেন্ডারিং ইঞ্জিনে এটি রেজিস্টার করুন
api.registerBlock('my-custom-block', MyBlock);

// ৩. ইনসার্ট মেনুতে (Block Menu) এটি দেখানোর জন্য রেজিস্টার করুন
api.ui.registerTool({
  id: 'my-custom-block',
  label: 'My Extension Block',
  icon: '🚀',
  description: 'Inserts a custom futuristic block.',
  Component: MyBlock // ঐচ্ছিক, যদি এটি গ্লোবাল রেজিস্ট্রিতে রাখতে চান
});
```

---

### ৫. সীমাবদ্ধতা ও নিরাপত্তা (Security & Limits)

সিস্টেমটি বাগ-ফ্রি রাখার জন্য নিচের সীমাবদ্ধতাগুলো অবশ্যই মানতে হবে:

1. **ইসোলেটেড সিএসএস (Isolated CSS)**: এক্সটেনশন থেকে আসা স্টাইলগুলো অবশ্যই `[data-extension-id="id"]` বা নির্দিষ্ট রুট ক্লাসের ভেতরে থাকতে হবে যাতে মূল অ্যাপের লেআউট ভেঙে না যায়।
2. **রিড-অনলি ডিফল্ট (Read-only Defaults)**: এক্সটেনশন অ্যাপের সিস্টেম ফাইল বা কোর সোর্স কোড সরাসরি এডিট করতে পারবে না। তারা শুধু অ্যাপের দেওয়া API ব্যবহার করে ডাটা বা স্টাইল ওভাররাইড করতে পারবে।
3. **পারফরম্যান্স চেক (Performance)**: প্রতিটি এক্সটেনশনকে অবশ্যই অ্যাসিংক্রোনাসভাবে (Async) লোড হতে হবে যাতে অ্যাপ স্টার্টআপে দেরি না হয়।

---

### ৪. থিম কাস্টমাইজেশন লজিক (The Power)

থিম ম্যানেজমেন্টের জন্য আমরা একটি **Global Theme Variable System** ব্যবহার করব। 
```css
/* এক্সটেনশন যা কন্ট্রোল করতে পারবে */
:root {
  --app-bg: #000;
  --sidebar-width: 280px;
  --accent-color: #3b82f6;
  --glass-blur: 20px;
}
```
একটি এক্সটেনশন এই ভেরিয়েবলগুলো ইনজেক্ট করবে, ফলে কোনো কোড পরিবর্তন না করেই পুরো অ্যাপের লুক পাল্টে যাবে।

---

### ৫. গ্লিচ প্রতিরোধের উপায় (Anti-Glitch Logic)

সিস্টেমটিকে সর্বোচ্চ শক্তিশালী বা "Strongest" করার জন্য আমাদের নিচের প্রোটোকলগুলো পালন করতে হবে:

- **Sandbox Runtime**: কোনো এক্সটেনশন যদি এরর দেয়, তবে শুধু সেই এক্সটেনশনটি বন্ধ হবে, পুরো অ্যাপ ক্র্যাশ করবে না (Try-Catch isolation)।
- **Conflict Resolver**: যদি দুটি এক্সটেনশন একই সাথে একই এলিমেন্ট পরিবর্তন করতে চায়, তবে লেটেস্ট লোড হওয়া এক্সটেনশনটি প্রাধান্য পাবে, কিন্তু ডাটা লস হবে না।
- **Versioning Check**: কোর অ্যাপ আপডেট হলে এক্সটেনশনগুলো সামঞ্জস্যপূর্ণ কি না তা ভার্সন আইডি দিয়ে চেক করতে হবে।

---

### উপসংহার
এই কাঠামোটি ব্যবহার করলে আপনি আপনার অ্যাপের বাইরে একটি সম্পূর্ণ আলাদা রিপোজিটরিতে এক্সটেনশন ডেভেলপ করতে পারবেন এবং সেগুলোকে রিমোটলি বা লোরালি ইনজেক্ট করতে পারবেন। এটি আপনার অ্যাপকে একটি "Platform" এ পরিণত করবে।
