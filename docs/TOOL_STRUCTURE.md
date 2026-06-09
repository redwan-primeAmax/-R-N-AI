# 🏗️ Tool ZIP Structure Guidelines

নোট অ্যাপের জন্য কাস্টম টুল তৈরি করতে নিচের স্ট্রাকচারটি অনুসরণ করুন। টুলটি একটি `.zip` ফাইল হিসেবে আপলোড করতে হবে।

## ১. ফাইল স্ট্রাকচার

জিপ ফাইলের রুটে অবশ্যই একটি `index.html` থাকতে হবে।

```text
my-tool.zip
├── index.html (অবশ্যই থাকতে হবে)
├── style.css
├── script.js
└── assets/
    └── icon.png
```

## ২. `index.html` উদাহরণ

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Custom Tool</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div id="app">
        <h1>হ্যালো! এটি আমার কাস্টম টুল।</h1>
        <button id="alertBtn">ক্লিক করুন</button>
    </div>

    <script src="script.js"></script>
</body>
</html>
```

## ৩. গুরুত্বপূর্ণ নিয়মাবলী

১. **Relative Paths:** সব সিএসএস, জেএস এবং ইমেজ ফাইলের পাথ অবশ্যই রিলেটিভ হতে হবে (যেমন `src="script.js"`, `src="./assets/logo.png"`)। কোনো এবসোলুট পাথ (যেমন `/script.js` বা `C:\tool\script.js`) কাজ করবে না।
২. **Sandboxing:** টুলগুলো একটি আইসোলেটেড ইফ্রেমে চলে। নিরাপত্তার স্বার্থে কিছু ব্রাউজার এপিআই এখানে রেস্ট্রিক্টেড থাকতে পারে।
৩. **LocalStorage:** টুলগুলো ব্রাউজারের শেয়ারড লোকালস্টোরেজ এক্সেস করতে পারে না। ডাটা সেভ করার জন্য তারা নিজস্ব সেশন ব্যবহার করতে পারে।
