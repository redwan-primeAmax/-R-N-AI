# Diamond Road: Extension System Specification (V1.0)
## The Ultimate Guide for Extension Developers

এই গাইডটি আপনাকে Diamond Road-এর জন্য কাস্টম এক্সটেনশন এবং হাব অ্যাপ তৈরি করতে সাহায্য করবে। এখানে প্রতিটি API এবং ইঞ্জিন কিভাবে কাজ করে তা বিস্তারিত ব্যাখ্যা করা হয়েছে।

---

### ১. এক্সটেনশন স্ট্রাকচার (Manifest & Index)

একটি প্যাকেজে সাধারণত দুটি মেইন ফাইল থাকে:
1. **manifest.json**: এক্সটেনশনের টাইটেল, ভার্সন এবং মেটাডাটা।
2. **index.js**: মূল লজিক (JavaScript Code)।

#### manifest.json Example:
```json
{
  "id": "com.user.custom-extension",
  "name": "My Extension",
  "version": "1.0.0",
  "description": "Short description of your tool",
  "author": "Your Name",
  "type": "extension",
  "icon": "🚀"
}
```

---

### ২. কোর আর্কিটেকচার ও স্লট (Available Slots)

Diamond Road-এ বর্তমানে প্রধান স্লটগুলো হলো:

#### ২.১ হাব অ্যাপ স্লট (Extension Hub App) - [NEW]
এক্সটেনশন হাব-এ আপনার এক্সটেনশনের জন্য একটি বড় ইন্টারফেস বা মিনি-অ্যাপ রেজিস্টার করতে পারেন।
- **Hook**: `api.ui.registerApp(config)`
- **Capabilities**: ফুল স্ক্রিন ড্যাশবোর্ড, কাস্টম SVG আইকন সাপোর্ট।

```javascript
api.ui.registerApp({
  id: 'vision-studio',
  title: 'Vision Studio',
  icon: '<svg>...</svg>', // SVG কোড সরাসরি স্ট্রিং হিসেবে
  Component: MyStudioApp // React Component
});
```

#### ২.২ সাইডবার স্লট (Sidebar Slot)
সাইডবার বা প্রধান মেনুতে আপনার নিজস্ব আইটেম যোগ করুন।
- **Hook**: `api.ui.registerSidebarItem(item)`
- **Capabilities**: কাস্টম আইকন এবং ক্লিক অ্যাকশন।

#### ২.৩ ইনসার্ট টুল স্লট (Insert / Slash Menu)
এডিটরের "+" বাটন বা "/" মেনুতে আপনার টুলটি দেখাবে।
- **Hook**: `api.ui.registerTool(config)`
- **Capabilities**: সরাসরি এডিটরে নতুন কন্টেন্ট বা ব্লক যুক্ত করা।

#### ২.৪ ব্লক রেন্ডারার স্লট (Editor Block)
এডিটরের ভেতরে নতুন ধরণের ইন্টারেক্টিভ এলিমেন্ট রেন্ডার করতে পারেন।
- **Hook**: `api.editor.registerBlock(type, ReactComponent)`

---

### ৩. থিম স্লট (The Canvas API)

थিম এক্সটেনশনগুলো এডিটরের "Canvas State" পরিবর্তন করতে পারে। আপনি `api.ui.registerTheme` এর মাধ্যমে এটি করবেন।

```javascript
api.ui.registerTheme({
  id: 'midnight-neon',
  name: 'Midnight Neon',
  previewClassName: 'bg-black border-purple-500', 
  config: {
    styles: {
      '--editor-bg': '#050505',
      '--editor-text': '#00ff41',
      '--editor-line': '#1a1a1a',
      '--accent-color': '#ff00ff'
    }
  }
});
```

---

### ৪. ডাটা স্টোরেজ (Persistent API)

এক্সটেনশনকে যাতে রিলোড করলে ডাটা হারাতে না হয়, তার জন্য `api.storage` ব্যবহার করুন।

```javascript
// Data Save
api.storage.set('user_pref', 'value');

// Data Load
const value = api.storage.get('user_pref');
```

---

### ৫. অ্যাডভান্সড হুক্স (Filters & Hooks)

আপনি যদি চান অ্যাপের ডাটা সেভ হওয়ার আগে বা লোড হওয়ার পরে কোনো পরিবর্তন করতে, তবে ফিল্টার ব্যবহার করুন।

```javascript
api.addFilter('beforeSave', (content) => {
  return content.toUpperCase();
});
```

---

### ৬. পারফরম্যান্স ও স্কেলেবিলিটি গাইডলাইন (Performance & Scalability)

যখন অ্যাপে ১০০ এর বেশি এক্সটেনশন থাকবে, তখন পারফরম্যান্স ঠিক রাখতে এই নিয়মগুলো মানা বাধ্যতামূলক:

1. **Lazy Loading**: হাব অ্যাপের মেনু বা বড় কম্পোনেন্টগুলো `React.lazy()` ব্যবহার করে লোড করুন। এতে র্যাম খরচ কমবে।
2. **SVG Optimization**: আইকনের জন্য এসভিজি কোড যতটা সম্ভব ক্লিন এবং ছোট রাখুন। বড় ইমেজ সরাসরি কোডে ব্যবহার করা নিষেধ।
3. **Memory Management**: প্রতিটি এক্সটেনশনে `destroy()` ফাংশন ব্যবহার করে গ্লোবাল লিসেনার বা টেম্পোরারি অবজেক্টগুলো ক্লিনিং নিশ্চিত করুন।
4. **Batching Update**: অ্যাপের কোর ইঞ্জিন এখন আপডেটগুলো ব্যাচিং করে প্রসেস করে। তাই বারবার `emitChange` বা গ্লোবাল রেন্ডার ট্রিগার করবেন না।

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

### ৮. ডেটা পারসিস্টেন্স ও সিকিউরিটি (Data Persistence & Security) [CRITICAL]

Diamond Road-এ ইউজারের ডাটা সুরক্ষা সবচেয়ে বড় অগ্রাধিকার। এক্সটেনশন ডেভেলপারদের অবশ্যই নিচের নিয়মগুলো মেনে চলতে হবে:

#### ৮.১ স্টিকি ব্লক (Sticky Blocks)
যদি আপনার এক্সটেনশন নতুন কোনো **ব্লক টাইপ** রেজিস্টার করে, তবে মনে রাখবেন:
- ইউজার এক্সটেনশন ডিলিট করলেও পুরনো নোটের ডাটা হারাবে না।
- সিস্টেম ওই ব্লকের ডাটা একটি "Legacy Fallback" মোডে রেন্ডার করবে।
- এর ফলে এক্সটেনশন টেম্পোরারি ডাউনলোড এবং ডিলিট করা নিরাপদ।

#### ৮.২ ফিল্টার সিকিউরিটি (Filter Security Protocol)
`api.addFilter` ব্যবহার করার সময় খেয়াল রাখুন:
- সরাসরি ইউজারের র ডাটা (Raw Data) ডিলেট করা যাবে না।
- ফিল্টার যদি `null` বা `undefined` রিটার্ন করে, সিস্টেম অটোমেটিক ওই পরিবর্তন বাতিল করে দেবে।
- বড় অবজেক্ট ফিল্টার করার সময় সিস্টেম ইন্টারনাল "Deep Copy" ব্যবহার করে, যাতে কোর ভেরিয়েবলগুলো করাপ্ট না হয়।

#### ৮.৩ স্টোরেজ লিমিট
`api.storage` শুধুমাত্র কনফিগারেশন এবং ছোট ইউজার প্রেফারেন্সের জন্য। বড় কোনো ফাইল বা মিডিয়া সরাসরি স্টোরেজে সেভ করবেন না, এটি অ্যাপের লোডিং স্লো করে দিতে পারে।

#### ৮.৪ এআই ইন্টিগ্রেশন (AI Proxy API) [NEW]
এক্সটেনশন ডেভেলপাররা ইউজারের কনফিগার করা এআই ইঞ্জিন ব্যবহার করতে পারেন।
- **Hook**: `api.ai.generate({ prompt, systemInstruction })`
- **Safety**: এক্সটেনশন সরাসরি এপিআই কী দেখতে পারে না। যদি এআই কনফিগার না থাকে তবে এরর রিটার্ন করবে।

#### ৮.৫ সিকিউর ডাটা ওভাররাইট (Secure Overwrite Protocol) [NEW]
ইউজারের পারমিশন ছাড়া কোনো নোটের ডাটা পরিবর্তন করা সম্ভব নয়।
- **Process**: `api.editor.applyChanges(newContent, reason)` কল করলে ইউজারের কাছে একটি কনফার্মেশন প্রম্পট যাবে। ইউজার "Apply" করলে তবেই ডাটা আপডেট হবে।
- **Best Practice**: সবসময় পরিবর্তনের কারণ (reason) উল্লেখ করুন যেন ইউজার বুঝতে পারে আপনার এক্সটেনশন কি করতে চাচ্ছে।

---

### ৯. উপসংহার
এই গাইডলাইন অনুসরণ করে তৈরি করা এক্সটেনশনগুলো Diamond Road-এর ফিউচার আপডেটের সাথে সামঞ্জস্যপূর্ণ থাকবে। আপনার নতুন আইডিয়া নিয়ে কাজ শুরু করুন!
