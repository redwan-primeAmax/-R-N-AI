# নোশন ক্লোন এক্সটেনশন ডেভেলপমেন্ট গাইডলাইন (v2.0 - Stronger & Modular)

এই ডকুমেন্টটি নোশন ক্লোন অ্যাপের জন্য এক্সটেনশন তৈরির চূড়ান্ত গাইডলাইন। এটি এমনভাবে ডিজাইন করা হয়েছে যাতে যেকোনো এআই (AI) এটি পড়ে নিখুঁত ফাইল স্ট্রাকচার তৈরি করতে পারে।

---

## ১. প্রজেক্ট ও এক্সটেনশন স্ট্রাকচার (App Structure)

অ্যাপের মূল রুটে একটি `index.html` থাকবে। সমস্ত এক্সটেনশন ডেভেলপমেন্টের সময় নিচের ফোল্ডার স্ট্রাকচার মেনে চলতে হবে:

```text
Project Root/
├── index.html
├── src/ (Main App Code)
└── extensions/ (All Extensions Folder)
    ├── ai-summarizer/ (Individual Extension Folder)
    │   ├── manifest.json
    │   ├── index.js
    │   └── styles.css (Optional)
    └── dark-theme-pro/
        ├── manifest.json
        └── index.js
```

---

## ২. এক্সটেনশন প্যাকেজ (ZIP) নিয়মাবলী

টেস্টিং এর জন্য যখন আপনি জিপ (ZIP) ফাইল আপলোড করবেন, তখন জিপের ভেতরে অবশ্যই নিচের ফাইলগুলো সরাসরি (root) থাকতে হবে:
1. **`manifest.json`**: এতে রিলিজ ডেট, অথর, পারমিশন এবং মেটাডাটা থাকবে।
2. **`index.js`**: মেইন লজিক (ES Module)।
3. **`assets/`** (ঐচ্ছিক): ছবি বা লোকাল রিসোর্স।

---

## ৩. ইন্টারফেস ও স্লট কন্ট্রোল (Where can you change?)

এআই বা ডেভেলপাররা যেন ভুল জায়গায় কোড ইনজেক্ট না করে, তার জন্য নিচের **"Authorized Slots"** গুলো ব্যবহার করতে হবে:

| Slot Name | Location | Capability |
| :--- | :--- | :--- |
| `sidebar-bottom` | Sidebar Footer | নতুন মেনু বা স্ট্যাটাস বাটন যোগ করা। |
| `editor-toolbar` | Mobile Toolbar | এডিটিং টুুলস বা এআই বাটন যোগ করা। |
| `block-registry` | Editor Canvas | সম্পূর্ণ নতুন ধরণের ব্লক (যেমন: চার্ট, পোল) তৈরি করা। |
| `data-pipeline` | setBlocks() | ডাটা সেভ হওয়ার আগে সেটি ফিল্টার বা এনক্রিপ্ট করা। |

---

## ৪. সিকিউরিটি ও রিমুভাল লজিক (Removal & Isolation)

১. **কঠোর ডিলিট (Hard Delete):** যখন কোনো এক্সটেনশন রিমুভ করা হবে, `deactivate()` ফাংশনের মাধ্যমে তার তৈরি করা সমস্ত `Slot` এবং `Event Listeners` মেমরি থেকে মুছে ফেলতে হবে।
২. **স্যান্ডবক্স ফিলোসফি:** এক্সটেনশন কখনো সরাসরি `document.body` ক্লিন করবে না। তারা শুধুমাত্র `api.theme` বা `api.ui` মেথড ব্যবহার করে পরিবর্তন করবে।
৩. **টেস্ট ক্যাশ:** জিপ ফাইল থেকে লোড করা এক্সটেনশনগুলো শুধুমাত্র বর্তমান সেশনে ক্যাশ থাকবে। রিফ্রেশ দিলে সেগুলো ধুয়ে যাবে যাতে টেস্টিং এর সময় বাগ জমে না থাকে।

---

## ৫. এপিআই রেফারেন্স (Standard API)

এআইকে এই মেথডগুলো ব্যবহার করতে বলুন:
* `api.ui.registerSidebarItem(config)`
* `api.ui.registerToolbarButton(config)`
* `api.registerBlock(type, Component)`
* `api.notify(msg, type)`
* `api.storage.set(key, val)`

---
