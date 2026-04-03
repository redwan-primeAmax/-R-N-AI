/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import EditorPage from './pages/EditorPage';
import AIChat from './pages/AI/AIChat';
import AISettings from './pages/AI/AISettings';
import BrowseTemplates from './pages/BrowseTemplates';
import { DataManager } from './utils/DataManager';
import { motion, AnimatePresence } from 'motion/react';

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

  return (
    <div className={`min-h-screen bg-[#191919] text-white font-sans ${isFullPage ? '' : 'pb-24'}`}>
      <AnimatePresence mode="wait">
        {showPopup && <UserNamePopup onSave={handleSaveName} key="popup" />}
      </AnimatePresence>
      
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageWrapper><HomePage /></PageWrapper>} />
          <Route path="/search" element={<PageWrapper><SearchPage /></PageWrapper>} />
          <Route path="/editor/:id" element={<PageWrapper><EditorPage /></PageWrapper>} />
          <Route path="/ai" element={<PageWrapper><AIChat /></PageWrapper>} />
          <Route path="/ai/settings" element={<PageWrapper><AISettings /></PageWrapper>} />
          <Route path="/templates" element={<PageWrapper><BrowseTemplates /></PageWrapper>} />
        </Routes>
      </AnimatePresence>
      {!isEditorPage && <Navigation />}
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
