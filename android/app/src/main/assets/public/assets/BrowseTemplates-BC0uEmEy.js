import{D as d,j as e}from"./index-DYhbZ1k9.js";import{u,r as i}from"./router-CffnUae-.js";import{a9 as h,aL as b,aM as f,aN as g,aO as x,av as N,aP as w,ab as k,P as y}from"./icons-SXZEOW9i.js";import{m as T}from"./motion-DaOafcva.js";const r=[{id:"todo",title:"To-Do List",description:"Track your daily tasks and priorities easily.",category:"Live",icon:h,content:`<h2>🎯 Task Management</h2>
<ul data-type='taskList'>
  <li data-checked='false'><p>Define today's Top 3 priorities</p></li>
  <li data-checked='false'><p>Review pending tasks from yesterday</p></li>
  <li data-checked='false'><p>Check calendar for appointments</p></li>
</ul>
<hr />
<h3>📝 Notes</h3>
<p>Add context here...</p>`,emoji:"🎯"},{id:"tracker",title:"Daily Tracker",description:"Monitor your health, habits and daily progress.",category:"Live",icon:b,content:`<h2>📊 Daily Progress Tracker</h2>
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
<p>Steps: [Count] | Workout: [Type]</p>`,emoji:"📊"},{id:"meeting",title:"Meeting Notes",description:"Capture decisions and action items from meetings.",category:"Work",icon:f,content:`<h2>🤝 Meeting Summary</h2>
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
</ul>`,emoji:"🤝"},{id:"project",title:"Project Roadmap",description:"Sketch out timelines and milestones for your projects.",category:"Work",icon:g,content:`<h2>🗺️ Project Roadmap</h2>
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
<p>List immediate tasks here...</p>`,emoji:"🗺️"},{id:"study",title:"Study Plan",description:"Organize your learning path and exam preparation.",category:"Work",icon:x,content:`<h2>🎓 Learning Journey</h2>
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
<p><mark>Concept B:</mark> Brief definition.</p>`,emoji:"🎓"},{id:"journal",title:"Personal Journal",description:"Reflect on your day and capture personal growth.",category:"Personal",icon:N,content:`<h2>📓 Personal Journal Entry</h2>
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
<p>One thing I learned... [Text]</p>`,emoji:"📓"},{id:"reading",title:"Reading List",description:"Keep track of books you want to read and key takeaways.",category:"Personal",icon:w,content:`<h2>📚 Reading Log</h2>
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
<blockquote>"Important quote from the book."</blockquote>`,emoji:"📚"}],o=i.memo(({template:a,onUse:s})=>e.jsxDEV(T.div,{initial:{opacity:0,y:10},whileInView:{opacity:1,y:0},viewport:{once:!0},whileTap:{scale:.98},className:"bg-[#1c1c1c] border border-white/5 rounded-3xl p-6 flex flex-col gap-6 hover:border-blue-500/30 transition-all group shadow-xl shadow-black/20",children:[e.jsxDEV("div",{className:"flex items-start justify-between",children:[e.jsxDEV("div",{className:"w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-blue-600/10 transition-colors",children:e.jsxDEV(a.icon,{size:28,className:"text-white group-hover:text-blue-400"},void 0,!1,{fileName:"/app/applet/src/pages/Templates/BrowseTemplates.tsx",lineNumber:23,columnNumber:9},void 0)},void 0,!1,{fileName:"/app/applet/src/pages/Templates/BrowseTemplates.tsx",lineNumber:22,columnNumber:7},void 0),e.jsxDEV("span",{className:"text-[10px] font-black uppercase tracking-[0.2em] text-white/20 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5",children:a.category},void 0,!1,{fileName:"/app/applet/src/pages/Templates/BrowseTemplates.tsx",lineNumber:25,columnNumber:7},void 0)]},void 0,!0,{fileName:"/app/applet/src/pages/Templates/BrowseTemplates.tsx",lineNumber:21,columnNumber:5},void 0),e.jsxDEV("div",{children:[e.jsxDEV("h3",{className:"font-bold text-xl text-white tracking-tight",children:a.title},void 0,!1,{fileName:"/app/applet/src/pages/Templates/BrowseTemplates.tsx",lineNumber:30,columnNumber:7},void 0),e.jsxDEV("p",{className:"text-sm text-white/40 leading-relaxed mt-2 line-clamp-2",children:a.description},void 0,!1,{fileName:"/app/applet/src/pages/Templates/BrowseTemplates.tsx",lineNumber:31,columnNumber:7},void 0)]},void 0,!0,{fileName:"/app/applet/src/pages/Templates/BrowseTemplates.tsx",lineNumber:29,columnNumber:5},void 0),e.jsxDEV("button",{onClick:()=>{s(a)},className:"mt-2 w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-blue-600/20",children:[e.jsxDEV(y,{size:20,strokeWidth:3},void 0,!1,{fileName:"/app/applet/src/pages/Templates/BrowseTemplates.tsx",lineNumber:39,columnNumber:7},void 0),"Use Template"]},void 0,!0,{fileName:"/app/applet/src/pages/Templates/BrowseTemplates.tsx",lineNumber:33,columnNumber:5},void 0)]},void 0,!0,{fileName:"/app/applet/src/pages/Templates/BrowseTemplates.tsx",lineNumber:14,columnNumber:3},void 0));o.displayName="TemplateCard";function E(){const a=u(),[s,p]=i.useState("All"),n=i.useMemo(()=>s==="All"?r:r.filter(t=>t.category===s),[s]),c=i.useCallback(async t=>{const m=t.content||`<h1>${t.title}</h1><p>Start writing your ${t.title.toLowerCase()} here...</p>`,l={id:`note-${Date.now()}`,title:t.title,content:m,emoji:t.emoji,createdAt:Date.now(),updatedAt:Date.now(),isFavorite:!1};await d.saveNote(l),a(`/editor/${l.id}`)},[a]);return e.jsxDEV("div",{className:"min-h-screen bg-[#0A0A0A] text-white pb-40",children:[e.jsxDEV("div",{className:"sticky top-0 z-20 bg-[#0A0A0A]/80 backdrop-blur-3xl px-6 py-6 flex items-center gap-4 border-b border-white/5",children:[e.jsxDEV("button",{onClick:()=>{window.history.length>1?a(-1):a("/main")},className:"w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl transition-all active:scale-90",children:e.jsxDEV(k,{size:20,className:"text-white/60"},void 0,!1,{fileName:"/app/applet/src/pages/Templates/BrowseTemplates.tsx",lineNumber:88,columnNumber:11},this)},void 0,!1,{fileName:"/app/applet/src/pages/Templates/BrowseTemplates.tsx",lineNumber:78,columnNumber:9},this),e.jsxDEV("div",{children:[e.jsxDEV("h1",{className:"text-lg font-bold tracking-tight",children:"Templates"},void 0,!1,{fileName:"/app/applet/src/pages/Templates/BrowseTemplates.tsx",lineNumber:91,columnNumber:11},this),e.jsxDEV("p",{className:"text-[10px] text-blue-400 uppercase tracking-[0.2em] font-black",children:"Redwan Assistant"},void 0,!1,{fileName:"/app/applet/src/pages/Templates/BrowseTemplates.tsx",lineNumber:92,columnNumber:11},this)]},void 0,!0,{fileName:"/app/applet/src/pages/Templates/BrowseTemplates.tsx",lineNumber:90,columnNumber:9},this)]},void 0,!0,{fileName:"/app/applet/src/pages/Templates/BrowseTemplates.tsx",lineNumber:77,columnNumber:7},this),e.jsxDEV("div",{className:"flex gap-2 px-6 py-4 overflow-x-auto no-scrollbar sticky top-[80px] z-20 bg-[#0A0A0A]/80 backdrop-blur-3xl border-b border-white/5",children:["All","Live","Work","Personal"].map(t=>e.jsxDEV("button",{onClick:()=>p(t),className:`px-6 py-2.5 rounded-full text-xs font-black tracking-widest uppercase transition-all border ${s===t?"bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20":"bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white"}`,children:t},t,!1,{fileName:"/app/applet/src/pages/Templates/BrowseTemplates.tsx",lineNumber:99,columnNumber:11},this))},void 0,!1,{fileName:"/app/applet/src/pages/Templates/BrowseTemplates.tsx",lineNumber:97,columnNumber:7},this),e.jsxDEV("div",{className:"px-6 py-8 grid grid-cols-1 gap-6",children:n.map(t=>e.jsxDEV(o,{template:t,onUse:c},t.id,!1,{fileName:"/app/applet/src/pages/Templates/BrowseTemplates.tsx",lineNumber:116,columnNumber:11},this))},void 0,!1,{fileName:"/app/applet/src/pages/Templates/BrowseTemplates.tsx",lineNumber:114,columnNumber:7},this),e.jsxDEV("style",{children:`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `},void 0,!1,{fileName:"/app/applet/src/pages/Templates/BrowseTemplates.tsx",lineNumber:124,columnNumber:7},this)]},void 0,!0,{fileName:"/app/applet/src/pages/Templates/BrowseTemplates.tsx",lineNumber:75,columnNumber:5},this)}export{E as default};
