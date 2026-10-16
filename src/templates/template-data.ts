import { CheckSquare, BarChart3, Briefcase, User, GraduationCap, Layout, BookOpen } from 'lucide-react';

export interface Template {
  id: string;
  title: string;
  titleBn: string;
  description: string;
  descriptionBn: string;
  category: 'Live' | 'Work' | 'Personal';
  icon: any;
  content: string;
  emoji: string;
}

export const TEMPLATES: Template[] = [
  {
    id: 'todo',
    title: 'To-Do List',
    titleBn: 'করণীয় তালিকা',
    description: 'Track your daily tasks and priorities easily.',
    descriptionBn: 'আপনার দৈনন্দিন কাজ এবং অগ্রাধিকার সহজে ট্র্যাক করুন।',
    category: 'Live',
    icon: CheckSquare,
    content: `<h2>🎯 Task Management</h2>
<ul data-type='taskList'>
  <li data-checked='false'><p>Define today's Top 3 priorities</p></li>
  <li data-checked='false'><p>Review pending tasks from yesterday</p></li>
  <li data-checked='false'><p>Check calendar for appointments</p></li>
</ul>
<hr />
<h3>📝 Notes</h3>
<p>Add context here...</p>`,
    emoji: '🎯'
  },
  {
    id: 'tracker',
    title: 'Daily Tracker',
    titleBn: 'দৈনিক ট্র্যাকার',
    description: 'Monitor your health, habits and daily progress.',
    descriptionBn: 'আপনার স্বাস্থ্য, অভ্যাস এবং দৈনন্দিন অগ্রগতি পর্যবেক্ষণ করুন।',
    category: 'Live',
    icon: BarChart3,
    content: `<h2>📊 Daily Progress Tracker</h2>
<p><b>Date:</b> [Date] | <b>Overall Mood:</b> ⭐⭐⭐⭐⭐</p>
<hr />
<h3>💧 Habits</h3>
<ul data-type='taskList'>
  <li data-checked='false'><p>Drink 2L Water</p></li>
  <li data-checked='false'><p>10 mins Meditation</p></li>
  <li data-checked='false'><p>Read 10 pages</p></li>
</ul>
<hr />
<h3>🏃 Fitness</h3>
<p>Steps: [Count] | Workout: [Type]</p>`,
    emoji: '📊'
  },
  {
    id: 'meeting',
    title: 'Meeting Notes',
    titleBn: 'মিটিং নোট',
    description: 'Capture decisions and action items from meetings.',
    descriptionBn: 'মিটিংয়ের সিদ্ধান্ত এবং করণীয় বিষয়গুলো লিখে রাখুন।',
    category: 'Work',
    icon: Briefcase,
    content: `<h2>🤝 Meeting Summary</h2>
<p><b>Topic:</b> [Title] | <b>Attendees:</b> [Names]</p>
<hr />
<blockquote style="border-left: 4px solid #3b82f6; padding-left: 1rem;">
  <b>Context:</b> Brief overview of the meeting purpose.
</blockquote>
<h3>📌 Key Decisions</h3>
<ul>
  <li>Decision 1</li>
  <li>Decision 2</li>
</ul>
<hr />
<h3>⚡ Action Items</h3>
<ul data-type='taskList'>
  <li data-checked='false'><p>Assign task A to @person</p></li>
  <li data-checked='false'><p>Follow up by [Date]</p></li>
</ul>`,
    emoji: '🤝'
  },
  {
    id: 'project',
    title: 'Project Roadmap',
    titleBn: 'প্রজেক্ট রোডম্যাপ',
    description: 'Sketch out timelines and milestones for your projects.',
    descriptionBn: 'আপনার প্রজেক্টের সময়রেখা এবং মাইলফলক সাজান।',
    category: 'Work',
    icon: Layout,
    content: `<h2>🗺️ Project Roadmap</h2>
<p><b>Project Name:</b> [Name] | <b>Status:</b> <mark style="background: rgba(59,130,246,0.2); color: #60a5fa;">In Progress</mark></p>
<hr />
<h3>📅 Milestones</h3>
<ul data-type='taskList'>
  <li data-checked='true'><p>Phase 1: Planning</p></li>
  <li data-checked='false'><p>Phase 2: Execution</p></li>
  <li data-checked='false'><p>Phase 3: Delivery</p></li>
</ul>
<hr />
<h3>🚀 Next Steps</h3>
<p>List immediate tasks here...</p>`,
    emoji: '🗺️'
  },
  {
    id: 'study',
    title: 'Study Plan',
    titleBn: 'পড়াশোনার পরিকল্পনা',
    description: 'Organize your learning path and exam preparation.',
    descriptionBn: 'আপনার শেখার পথ এবং পরীক্ষার প্রস্তুতি সাজান।',
    category: 'Work',
    icon: GraduationCap,
    content: `<h2>🎓 Learning Journey</h2>
<p><b>Subject:</b> [Topic] | <b>Goal:</b> [Description]</p>
<hr />
<h3>📚 Study Materials</h3>
<ul>
  <li>Book/Link 1</li>
  <li>Lecture Notes</li>
</ul>
<hr />
<h3>🧠 Key Concepts</h3>
<p><mark>Concept A:</mark> Brief definition.</p>
<p><mark>Concept B:</mark> Brief definition.</p>`,
    emoji: '🎓'
  },
  {
    id: 'journal',
    title: 'Personal Journal',
    titleBn: 'ব্যক্তিগত জার্নাল',
    description: 'Reflect on your day and capture personal growth.',
    descriptionBn: 'আপনার দিন নিয়ে ভাবুন এবং ব্যক্তিগত অগ্রগতি লিখে রাখুন।',
    category: 'Personal',
    icon: User,
    content: `<h2>📓 Personal Journal Entry</h2>
<p><b>Date:</b> [Date] | <b>Vibe:</b> [Emoji]</p>
<hr />
<h3>🧠 Morning Mindset</h3>
<p>I am grateful for... [Text]</p>
<p>Today's focus is... [Text]</p>
<hr />
<h3>🌦️ Day Summary</h3>
<p>What happened today? [Text]</p>
<hr />
<h3>🌙 Evening Gratitude</h3>
<p>One thing I learned... [Text]</p>`,
    emoji: '📓'
  },
  {
    id: 'reading',
    title: 'Reading List',
    titleBn: 'পড়ার তালিকা',
    description: 'Keep track of books you want to read and key takeaways.',
    descriptionBn: 'আপনি যে বই পড়তে চান এবং মূল বিষয়গুলো ট্র্যাক করুন।',
    category: 'Personal',
    icon: BookOpen,
    content: `<h2>📚 Reading Log</h2>
<p><b>Current Book:</b> [Title] | <b>Author:</b> [Name]</p>
<hr />
<h3>⭐ Rating</h3>
<p>⭐⭐⭐⭐⭐</p>
<hr />
<h3>💡 Key Takeaways</h3>
<ul>
  <li>Insight 1</li>
  <li>Insight 2</li>
</ul>
<hr />
<h3>✍️ Quotes</h3>
<blockquote>"Important quote from the book."</blockquote>`,
    emoji: '📚'
  }
];
