# RNAI Note v2.3

A feature-rich, AI-integrated note-taking application built as a modern, Notion-like workspace with mobile usability, AI-assisted content generation, and cloud synchronization.

## Tech Stack

- **Frontend:** React 18 + TypeScript
- **Build Tool:** Vite 6
- **Styling:** Tailwind CSS 4.0
- **Routing:** React Router DOM 7
- **Editor:** Tiptap (rich-text editor)
- **Animations:** Framer Motion
- **Storage:** IndexedDB via localforage (local), Supabase (cloud)
- **Search:** FlexSearch (local full-text indexing)
- **AI:** Google Gemini, Mistral AI, OpenRouter integrations
- **Server:** Express + Vite middleware (dev), Express + static (production)
- **Package Manager:** npm

## Project Structure

- `src/` - Core application source
  - `components/` - Reusable UI components
  - `pages/` - Main views (HomePage, EditorPage, AI/, Tools/)
  - `services/` - AI management, Supabase integration
  - `utils/` - DataManager, LogManager, export utilities
  - `tool-library/` - Text processing tools
- `public/` - Static assets, system prompts, HTML templates
- `server.ts` - Express server (serves Vite in dev, static in production)
- `vite.config.ts` - Vite configuration
- `index.html` - Root HTML

## Running the App

```bash
npm run dev    # Start development server (port 5000)
npm run build  # Build for production
```

## Environment Variables

See `.env.example` for required variables:
- `VITE_SUPABASE_URL` - Supabase project URL (optional, for cloud sync)
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key (optional)
- `GEMINI_API_KEY` - Google Gemini API key (optional, for AI features)
- `OPENROUTER_API_KEY` - OpenRouter API key (optional, for AI features)
- `MISTRAL_API_KEY` - Mistral API key (optional, for AI features)

## Key Features

- Rich-text note editing (Tiptap)
- Local-first storage with IndexedDB
- Optional Supabase cloud sync/publishing
- AI chat with multiple provider support (Gemini, Mistral, OpenRouter, Pico)
- Full-text search with FlexSearch
- Export/import in custom `.redwan` format, PDF, and more
- Speech-to-text input
- Multi-tab sync via BroadcastChannel
- Virtual list rendering for large note collections
