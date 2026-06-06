# 📘 নোশন ক্লোন এক্সটেনশন ডেভেলপমেন্ট গাইডলাইন (v3.0 - Professional & Amateur Friendly)

এই ডকুমেন্টটি নোশন ক্লোন অ্যাপের জন্য এক্সটেনশন তৈরির চূড়ান্ত এবং সবথেকে আধুনিক গাইডলাইন। এটি এমনভাবে ডিজাইন করা হয়েছে যাতে একদম নতুন কেউ (Amateur) থেকে শুরু করে প্রফেশনাল ডেভেলপার পর্যন্ত সবাই এটি সহজে বুঝতে পারে।

---

## ১. কোর ডেভেলপমেন্ট ফিলোসফি (The Architecture)

আমাদের অ্যাপটি একটি **Registry-Based Extension System** এর ওপর দাঁড়িয়ে। এর মানে হলো আপনি যখন একটি এক্সটেনশন লোড করেন, সেটি অ্যাপের কোর কোডকে পরিবর্তন করে না, বরং অ্যাপের ভেতরে থাকা নির্দিষ্ট কিছু "স্লট" (Slot) বা "হুক" (Hook) এ নিজের কাজ রেজিস্ট্রি করে।

### ফাইল স্ট্রাকচার (The Bundle)
আপনার এক্সটেনশনটি একটি ফোল্ডার হিসেবে থাকবে যা পরবর্তীতে ZIP করতে হবে। স্ট্রাকচারটি এরকম হওয়া উচিত:

```text
my-extension/
├── manifest.json   (আপনার এক্সটেনশনের ডিটেইলস)
├── index.js        (আপনার আসল জাভাস্ক্রিপ্ট কোড)
└── index.html      (যদি আপনি কাস্টম ইন্টারফেস বানাতে চান)
```

---

## ২. ম্যানিফেস্ট ফাইল (manifest.json)

আপনার এক্সটেনশন সম্পর্কে অ্যাপকে জানানোর জন্য এটি অপরিহার্য।

```json
{
  "id": "com.example.my-ai-tool",
  "name": "AI Summarizer",
  "version": "1.0.0",
  "author": "John Doe",
  "description": "এটি আপনার নোটকে এআই দিয়ে সংক্ষেপ করবে।",
  "icon": "🧠",
  "features": ["Content Interception", "Sidebar Button"],
  "permissions": ["EditorContent", "AI_API"],
  "releaseDate": "2026-06-06"
}
```

---

## ৩. কোডিং উদাহরণ (Professional Examples)

আমরা এখানে ৩টি ভিন্ন ধরণের ব্যবহারের উদাহরণ দিচ্ছি:

### উদাহরণ ১: সাইডবারে বাটন এবং নোটিফিকেশন যোগ করা
এটি সবথেকে সাধারণ এবং সহজ উপায় যা যেকোনো ইন্টারঅ্যাকশন শুরু করতে পারে।

```javascript
// index.js
export const activate = (api) => {
  api.ui.registerSidebarItem({
    id: 'hello-tool',
    label: 'Hello World',
    icon: '👋',
    onClick: () => {
      api.notify("হ্যালো! এক্সটেনশন থেকে স্বাগতম।", "success");
    }
  });
};

export const deactivate = (api) => {
  // অ্যাপ অটোমেটিক ক্লিনআপ করে নেয়
};
```

### উদাহরণ ২: নতুন এডিটর ব্লক তৈরি করা (Custom Block Registry)
আপনি এডিটরে সম্পূর্ণ নতুন ধরণের কন্টেন্ট যোগ করতে পারেন।

```javascript
export const activate = (api) => {
  // 'alert-box' টাইপের একটি নতুন ব্লক রেজিস্টার করা
  api.registerBlock('alert-box', (props) => {
    const { block } = props;
    return React.createElement('div', {
      style: {
        border: '2px solid red',
        padding: '10px',
        borderRadius: '8px',
        background: '#fff0f0',
        color: 'red',
        fontWeight: 'bold'
      }
    }, block.content || 'সতর্কতা: কোনো তথ্য নেই!');
  });
};
```

### উদাহরণ ৩: ডাটা সেভ হওয়ার আগে ফিল্টার করা (Data Privacy)
ডাটাবেজে সেভ হওয়ার ঠিক আগে আপনি তথ্য পরিবর্তন করতে পারেন।

```javascript
export const activate = (api) => {
  api.addFilter('beforeSave', (blocks) => {
    // উদাহরণস্বরূপ: সব ব্লকের টেক্সট আপারকেস করা (জাস্ট টেস্টিং এর জন্য)
    return blocks.map(b => ({
      ...b,
      content: b.content ? b.content.replace('BadWord', '***') : b.content
    }));
  });
};
```

### উদাহরণ ৪: কাস্টম এইচটিএমএল (Custom HTML Interface)
আপনি যদি রিঅ্যাক্ট (React) না জানেন, তবে সরাসরি এইচটিএমএল স্ট্রিং ইনজেক্ট করতে পারেন।

```javascript
export const activate = (api) => {
  api.registerBlock('custom-html-tool', (props) => {
    // সরাসরি HTML স্ট্রিং ব্যবহার করা
    const myHtml = `
      <div style="background: #222; color: #0f0; padding: 15px; font-family: monospace; border-left: 5px solid #0f0;">
        <h3>My Custom Terminal</h3>
        <p>This is rendered via raw HTML!</p>
        <button onclick="alert('Action from HTML!')">Click Me</button>
      </div>
    `;

    return React.createElement('div', {
      dangerouslySetInnerHTML: { __html: myHtml }
    });
  });
};
```

---

## ৪. সিকিউরিটি এবং লিমিটেশন (Crucial Rules)

১. **Direct DOM Manipulation নিষেধ:** কখনোই `document.getElementById` বা অ্যাপের ভেতরের HTML সরাসরি সিলেক্ট করবেন না। এটি অ্যাপ ক্র্যাশ করাতে পারে। সবসময় `api` মেথড ব্যবহার করুন।
২. **মেমোরি ম্যানেজমেন্ট:** আপনার এক্সটেনশন যদি কোনো ইন্টারভাল (`setInterval`) চালায়, তবে সেটি `deactivate` এর সময় বন্ধ করে দিন।
৩. **HTML Injection:** যদি আপনার ইন্টারফেসের জন্য HTML লাগে, তবে তা React-এর মাধ্যমে বা `api.ui` স্লটে ইনজেক্ট করতে হবে।
৪. **কঠোর ডিলিট লজিক:** আপনি যখন "রিমুভ" বাটনে ক্লিক করবেন, অ্যাপ আপনার এক্সটেনশনের সমস্ত রেজিস্ট্রি মুছে দিবে এবং একটি রিলোড ট্রিগার করবে যাতে সিস্টেম আবার ফ্রেশ হয়ে যায়।

---

## ৫. কিভাবে টেস্টিং করবেন?

১. আপনার তৈরি করা ফাইলগুলো ZIP করুন।
২. নোশন ক্লোন অ্যাপের **"এক্সটেনশন ম্যানেজার"** এ যান।
৩. **"Import ZIP"** বাটনে ক্লিক করে লোড করুন।
৪. কাজ শেষে **"Installed"** ট্যাব থেকে রিমুভ করে চেক করুন।

এখন আপনি আপনার নিজের নতুন টুল বানাতে প্রস্তুত! 🚀
