# নোশন ক্লোন এক্সটেনশন ডেভেলপমেন্ট গাইডলাইন (Extension Development Guidelines)

এই ডকুমেন্টটি আপনাকে একটি নোশন ক্লোন এক্সটেনশন তৈরি করার জন্য প্রয়োজনীয় আর্কিটেকচার, ফাইল স্ট্রাকচার এবং নিয়মাবলী বুঝতে সাহায্য করবে।

---

## ১. এক্সটেনশন প্যাকেজ স্ট্রাকচার (ZIP Structure)

প্রতিটি এক্সটেনশন একটি `.zip` ফাইল হিসেবে আপলোড করতে হবে। জিপ ফাইলের রুটে (root) অবশ্যই নিচের দুটি ফাইল থাকতে হবে:

```text
my-extension.zip
├── manifest.json   (মেটাডাটা ফাইল)
└── index.js        (মূল লজিক ফাইল)
```

> **নোট:** বর্তমানে আমরা শুধুমাত্র একটি জাভাস্ক্রিপ্ট ফাইল (`index.js`) সমর্থন করি। যদি আপনার অতিরিক্ত সিএসএস (CSS) লাগে, তবে তা `index.js`-এর ভেতরে ডাইনামিক স্টাইল ইনজেকশনের মাধ্যমে করতে হবে।

---

## ২. manifest.json ফর্মাট

এই ফাইলে এক্সটেনশনের পরিচয় এবং সেটি অ্যাপের কোথায় মাউন্ট হবে তার তথ্য থাকে।

```json
{
  "id": "com.example.my-tool",
  "name": "Custom Block Tool",
  "version": "1.0.0",
  "description": "Adds a custom banner block to your editor.",
  "author": "Your Name",
  "type": "editor-extension"
}
```

---

## ৩. index.js এর গঠন (The Code)

এক্সটেনশনের কোডটি অবশ্যই একটি স্ট্যান্ডার্ড অবজেক্ট এক্সপোর্ট করতে হবে যাতে `activate` এবং `deactivate` মেথড থাকে।

```javascript
// index.js

export const activate = (api) => {
  console.log("Extension Activated!");

  // ১. কাস্টম ব্লক রেজিস্টার করা
  api.registerBlock('custom-banner', (props) => {
    const { block, setBlocks, idx } = props;
    
    return React.createElement('div', {
      style: {
        background: 'linear-gradient(90deg, #4f46e5, #ec4899)',
        padding: '20px',
        borderRadius: '12px',
        color: 'white',
        margin: '10px 0'
      }
    }, [
      React.createElement('h2', { style: { margin: 0 } }, block.content || 'ব্যানার টেক্সট'),
      React.createElement('p', { style: { fontSize: '12px', opacity: 0.8 } }, 'This is a custom extension block!')
    ]);
  });

  // ২. ডাটা সেভ হওয়ার আগে ফিল্টার করা
  api.addFilter('beforeSave', (blocks) => {
    console.log("Saving data...", blocks);
    return blocks; // ডাটা মডিফাই করে রিটার্ন করতে পারেন
  });

  // ৩. সাইডবারে নতুন বাটন যোগ করা
  api.ui.registerSidebarItem({
    id: 'my-custom-tool',
    label: 'আমার টুল',
    icon: '🚀',
    onClick: () => {
      api.notify("হ্যালো! আমি এক্সটেনশন থেকে বলছি।", "success");
    }
  });
};

export const deactivate = (api) => {
  console.log("Extension Deactivated and Cleaned Up.");
};
```

---

## ৪. এক্সটেনশন ডেভেলপমেন্টের প্রধান ৩টি নিয়ম (Rules)

### রুল ১: সরাসরি DOM মডিফাই করবেন না
এক্সটেনশন কখনো সরাসরি `document.getElementById` বা `querySelector` ব্যবহার করে অ্যাপের এলিমেন্ট পরিবর্তন করবে না। সবসময় `api.registerBlock` বা `api.addFilter` ব্যবহার করুন। এটি অ্যাপের পারফরম্যান্স ও স্ট্যাবিলিটি নিশ্চিত করে।

### রুল ২: লাইফসাইকেল কমপ্লায়েন্স
আপনার এক্সটেনশন যখন `deactivate` হবে, তখন সেটি যে কাস্টম স্টাইল বা ইভেন্ট লিসেনার তৈরি করেছিল তা অবশ্যই রিমুভ করতে হবে। যদিও আমাদের মেইন ইঞ্জিন অনেক কিছু অটোমেটিক হ্যান্ডেল করে, তবুও ক্লিন কোড প্র্যাকটিস জরুরি।

### রুল ৩: গ্লোবাল ভেরিয়েবল ব্যবহার থেকে বিরত থাকুন
এক্সটেনশনের ভেতরে `window.myVariable` টাইপের গ্লোবাল স্টেট তৈরি করবেন না। এটি অন্য এক্সটেনশনের সাথে কনফ্লিক্ট করতে পারে। আপনার সমস্ত লজিক `index.js`-এর স্কোপের ভেতরে রাখুন।

---

## ৫. ইন্টারফেস ও এপিআই (Available API Methods)

এক্সটেনশন লোড হওয়ার সময় মূল অ্যাপ থেকে নিচের মেথডগুলো `api` অবজেক্টের মাধ্যমে পাঠানো হবে:

- **`api.registerBlock(type, ReactComponent)`**: নতুন ধরণের ব্লক তৈরি বা এক্সিস্টিং ব্লক রিপ্লেস করতে।
- **`api.addFilter(hookName, callback)`**: ডাটা ফ্লো ইন্টারসেপ্ট করতে। (Hooks: `onLoad`, `beforeSave`, `onBlocksUpdate`)
- **`api.ui.registerSidebarItem(config)`**: সাইডবারে বাটন যোগ করতে।
- **`api.notify(message, type)`**: অ্যাপের ডিফল্ট নোটিফিকেশন সিস্টেম ব্যবহার করতে।

---
