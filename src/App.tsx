/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, useLocation, useRoutes, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import { DataManager } from './utils/DataManager';
import { motion, AnimatePresence } from 'motion/react';

// Lazy load components
const HomePage = lazy(() => import('./pages/HomePage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const InboxPage = lazy(() => import('./pages/InboxPage'));
const EditorPage = lazy(() => import('./pages/EditorPage'));
const AIChat = lazy(() => import('./pages/AI/AIChat'));
const AISettings = lazy(() => import('./pages/AI/AISettings'));
const TitleGenerator = lazy(() => import('./pages/AI/TitleGenerator/TitleGenerator'));
const BrowseTemplates = lazy(() => import('./pages/BrowseTemplates'));
const ToolsDashboard = lazy(() => import('./pages/Tools/ToolsDashboard'));
const WordCounter = lazy(() => import('./tool-library/text-tools/WordCounter'));
const NumberRemover = lazy(() => import('./tool-library/text-tools/remove-number-from-text'));
const Summarizer = lazy(() => import('./tool-library/text-tools/Summarizer'));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-screen bg-[#191919]">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-8 h-8 border-2 border-white/10 border-t-white rounded-full"
      />
    </div>
  );
}

function UserNamePopup({ onSave }: { onSave: (name: string) => void }) {
  const [name, setName] = useState('');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#191919] border border-white/10 p-6 rounded-2xl w-full max-w-sm shadow-2xl"
      >
        <h2 className="text-xl font-bold text-white mb-2">Welcome!</h2>
        <p className="text-white/60 text-sm mb-6">What should we call you? Your name will be stored locally.</p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mb-6 focus:outline-none focus:border-white/20"
          autoFocus
        />
        <button
          onClick={() => name.trim() && onSave(name.trim())}
          disabled={!name.trim()}
          className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-white/90 disabled:opacity-50 transition-all"
        >
          Save
        </button>
      </motion.div>
    </div>
  );
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
}

function AppContent() {
  console.log('App: Rendering AppContent, path:', window.location.pathname);
  const location = useLocation();
  const isEditorPage = location.pathname.startsWith('/editor/');
  const isFullPage = isEditorPage || location.pathname.startsWith('/ai');
  const [userName, setUserName] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    DataManager.getUserName().then(name => {
      if (name) {
        setUserName(name);
      } else {
        setShowPopup(true);
      }
    });
  }, []);

  const handleSaveName = async (name: string) => {
    await DataManager.saveUserName(name);
    setUserName(name);
    setShowPopup(false);
  };

  const routingElement = useRoutes([
    { path: "/", element: <Navigate to="/main" replace /> },
    { path: "/main", element: <PageWrapper><HomePage /></PageWrapper> },
    { path: "/inbox", element: <PageWrapper><InboxPage /></PageWrapper> },
    { path: "/search", element: <PageWrapper><SearchPage /></PageWrapper> },
    { path: "/import/import", element: <PageWrapper><InboxPage /></PageWrapper> },
    { path: "/editor/:id", element: <PageWrapper><EditorPage /></PageWrapper> },
    { path: "/ai-auto", element: <PageWrapper><AIChat /></PageWrapper> },
    { path: "/manual-control/:model", element: <PageWrapper><AIChat /></PageWrapper> },
    { path: "/ai/settings", element: <PageWrapper><AISettings /></PageWrapper> },
    { path: "/ai/title-generator", element: <PageWrapper><TitleGenerator /></PageWrapper> },
    {path: "/templates", element: <PageWrapper><BrowseTemplates /></PageWrapper> },
    { path: "/tools", element: <PageWrapper><ToolsDashboard /></PageWrapper> },
    { path: "/tools/word-counter", element: <PageWrapper><WordCounter /></PageWrapper> },
    { path: "/tools/number-remover", element: <PageWrapper><NumberRemover /></PageWrapper> },
    { path: "/tools/summarizer", element: <PageWrapper><Summarizer /></PageWrapper> },
  ]);

  return (
    <div className={`min-h-screen bg-[#191919] text-white font-sans ${isFullPage ? '' : 'pb-24'}`}>
      <AnimatePresence mode="wait">
        {showPopup && <UserNamePopup onSave={handleSaveName} key="popup" />}
      </AnimatePresence>
      
      <AnimatePresence mode="wait">
        <Suspense fallback={<LoadingFallback />}>
          {routingElement && React.cloneElement(routingElement, { key: location.pathname })}
        </Suspense>
      </AnimatePresence>
      {!isFullPage && <Navigation />}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
