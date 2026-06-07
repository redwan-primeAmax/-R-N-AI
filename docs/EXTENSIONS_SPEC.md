# Diamond Road: Extension System Specification (V1.0)
## The Ultimate Guide for Extension Developers

এই গাইডটি আপনাকে Diamond Road-এর জন্য কাস্টম এক্সটেনশন এবং থিম তৈরি করতে সাহায্য করবে। এখানে প্রতিটি API, স্লট এবং ইঞ্জিনের কাজ করার পদ্ধতি বিস্তারিতভাবে ব্যাখ্যা করা হয়েছে।

---

### ১. এক্সটেনশন স্ট্রাকচার (Manifest & Code)

একটি স্ট্যান্ডার্ড এক্সটেনশন প্যাকেজে সাধারণত দুটি ফাইল থাকে:
1. **manifest.json**: এক্সটেনশনের মেটাডাটা।
2. **index.js**: মূল লজিক (যা অ্যাপ কল করবে)।

#### manifest.json Example:
```json
{
  "id": "com.example.calendar-plus",
  "name": "Calendar Plus",
  "version": "1.1.0",
  "description": "Adds a powerful calendar module to your editor.",
  "author": "DevTeam",
  "type": "extension",
  "icon": "📅"
}
```

---

### ২. কোর আর্কিটেকচার (The AppAPI & Available Slots)

Diamond Road এ বর্তমানে ৫টি প্রধান "Slot" বা হুক এভেইলেবল আছে যেখানে আপনি আপনার কাস্টম লজিক বা ইউআই ইনজেক্ট করতে পারেন:

#### ২.১ সাইডবার স্লট (Sidebar Slot)
সাইডবার হলো অ্যাপের নেভিগেশন হাব। আপনি এখানে আপনার নিজস্ব আইটেম যোগ করতে পারেন।
- **Hook**: `api.ui.registerSidebarItem(item)`
- **Capabilities**: আইকন এবং লেবেল সেট করা, ক্লিক হ্যান্ডল করা।
- **Use Case**: ইউসেজ স্ট্যাটস, ক্যালেন্ডার শর্টকাট, বা অন্য কোনো গ্লোবাল টুল।

```javascript
api.ui.registerSidebarItem({
  id: 'my-stats',
  label: 'ইউসেজ স্ট্যাটস',
  icon: '📊',
  onClick: () => api.ui.notify('বিকাশমান...', 'info')
});
```

#### ২.২ ইনসার্ট / স্লাশ মেনু (Insert Menu / Slash Command Slot)
এডিটরের "+" বাটন বা "/" মেনুতে আপনার টুলটি দেখাবে।
- **Hook**: `api.ui.registerTool(config)`
- **Capabilities**: কাস্টম ক্লিক হ্যান্ডলার অথবা সরাসরি ব্লক ইনসার্ট করা।
- **Use Case**: নতুন ইমেজ জেনারেটর, ক্লক ব্লক, বা কাস্টম কোনো উইজেট যোগ করা।

```javascript
api.ui.registerTool({
  id: 'clock-block',
  label: 'লাইভ ঘড়ি (Clock)',
  icon: '⏰',
  description: 'এডিটরে একটি লাইভ ঘড়ি যুক্ত করুন',
  onClick: (editor) => editor.chain().focus().insertBlock('clock-block').run()
});
```

#### ২.৩ ব্লক রেন্ডারার স্লট (Editor Block Renderer)
এটি সবচেয়ে পাওয়ারফুল স্লট। আপনি এডিটরের ভেতরে নতুন ধরণের এলিমেন্ট রেন্ডার করতে পারেন।
- **Hook**: `api.registerBlock(type, ReactComponent)`
- **Capabilities**: পূর্ণ রিয়্যাক্ট কম্পোনেন্ট হিসেবে কাজ করা, এডিটর ডাটা ম্যানিপুলেট করা।
- **Use Case**: গেজ চার্ট, অডিও প্লেয়ার, বা ইন্টারেক্টিভ ক্যানভাস।

```javascript
api.registerBlock('clock-block', ({ block }) => {
  const [time, setTime] = React.useState(new Date().toLocaleTimeString());
  React.useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(t);
  }, []);
  return React.createElement('div', { className: 'p-4 bg-black/5 rounded-xl font-mono text-center' }, time);
});
```

#### ২.৪ থিম ইঞ্জিন স্লট (Theme Slot)
এডিটরের লুক এবং ফিল পরিবর্তন করতে পারবেন।
- **Hook**: `api.ui.registerTheme(config)`
- **Capabilities**: সিএসএস ভেরিয়েবল সেট করা এবং কাস্টম স্টাইল ইনজেক্ট করা।

#### ২.৫ ডাটা ট্রান্সফরমেশন স্লট (Data Filters)
ডাটা লোড হওয়া বা সেভ হওয়ার সময় আপনার কাস্টম লজিক রান করবে।
- **Hook**: `api.addFilter(hook, callback)`
- **Hooks**: `beforeSave` (সেভ করার আগে), `onLoad` (লোড হওয়ার সময়), `onBlocksUpdate` (এডিট হওয়ার সময়)।

---

---

### ৩. থিম স্লট (The Canvas API)

থিম এক্সটেনশনগুলো এডিটরের "Canvas State" পরিবর্তন করতে পারে। আপনি `api.ui.registerTheme` এর মাধ্যমে এটি করবেন।

```javascript
api.ui.registerTheme({
  id: 'midnight-neon',
  name: 'Midnight Neon',
  previewClassName: 'bg-black border-purple-500', 
  config: {
    styles: {
      '--editor-bg': '#050505',
      '--editor-text': '#00ff41', // Matrix green!
      '--editor-line': '#1a1a1a',
      '--accent-color': '#ff00ff'
    }
  }
});
```

---

### ৪. ডাটা স্টোরেজ (Persistent API)

এক্সটেনশনকে যাতে রিলোড করলে ডাটা হারাতে না হয়, তার জন্য আমরা `api.storage` দিয়েছি। এটি ব্রাউজারের লোকাল স্টোরেজের একটি এনক্রিপ্টেড লেয়ার।

```javascript
// Save preferences
api.storage.set('user_theme_pref', 'dark');

// Load preferences
const pref = api.storage.get('user_theme_pref');
```

---

### ৫. অ্যাডভান্সড হুক্স (Filters & Hooks)

আপনি যদি চান অ্যাপের ডাটা সেভ হওয়ার আগে বা লোড হওয়ার পরে কোনো পরিবর্তন করতে, তবে ফিল্টার ব্যবহার করুন।

```javascript
// ডাটা সেভ করার আগে টাইটেল বড় হাতের করা
api.addFilter('beforeSave', (content) => {
  return content.toUpperCase();
});
```

---

### ৬. গাইডলাইন এবং রুলস (Developer Best Practices)

আপনার এক্সটেনশনটি মজবুত এবং বাগ-ফ্রি করতে নিচের ৩টি রুল মেনে চলুন:

1. **Namespace Your Styles**: আপনার সিএসএস যেন অন্য কারো সিএসএসকে নষ্ট না করে। সবসময় প্রিফিক্স ব্যবহার করুন (যেমন: `.ext-calendar-header`).
2. **Handle Errors Gracefully**: কোডের ভেতরে `try-catch` ব্লক ব্যবহার করুন। আপনার এক্সটেনশন ক্রাশ করলে যেন পুরো অ্যাপ বন্ধ না হয়ে যায়।
3. **Optimized Rendering**: অপ্রয়োজনীয় বার রেন্ডারিং রিঅ্যাক্ট কম্পোনেন্টকে স্লো করে দিতে পারে। `React.memo` ব্যবহার করার চেষ্টা করুন।

---

### ৭. কমপ্লিট "Kitchen Sink" এক্সাম্পল

```javascript
export const activate = (api) => {
  // ১. সাইডবারে বাটন যোগ করা
  api.ui.registerSidebarItem({
    id: 'hello-world',
    label: 'Hello',
    icon: '👋',
    onClick: () => api.ui.notify('Hello from Extension!', 'success')
  });

  // ২. নতুন এডিটর ব্লক তৈরি
  api.registerBlock('simple-msg', (props) => {
    return React.createElement('div', { className: 'p-4 border-l-4 border-orange-500 bg-orange-500/10' }, 
      'Message: ' + props.block.content
    );
  });

  // ৩. ইনসার্ট মেনুতে টুল যোগ করা
  api.ui.registerTool({
    id: 'simple-msg',
    label: 'Extension Message',
    icon: '📩',
    onClick: (e) => e.chain().focus().insertBlock('simple-msg').run()
  });
};
```

---

### ৮. উপসংহার
এই গাইডলাইন অনুসরণ করে তৈরি করা এক্সটেনশনগুলো Diamond Road-এর ফিউচার আপডেটের সাথে সামঞ্জস্যপূর্ণ থাকবে। আপনার নতুন আইডিয়া নিয়ে কাজ শুরু করুন!
