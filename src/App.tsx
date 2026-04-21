/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, useLocation, useRoutes, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import { DataManager } from './utils/DataManager';
import { motion, AnimatePresence } from 'motion/react';
import { ErrorBoundary } from './components/ErrorBoundary';
import LoadingScreen from './components/LoadingScreen';
import VersionControl from './components/VersionControl';
import { Modal } from './components/Modal';
import { Loader2 } from 'lucide-react';

// Lazy load components
const HomePage = lazy(() => import('./pages/HomePage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const InboxPage = lazy(() => import('./pages/InboxPage'));
const EditorPage = lazy(() => import('./pages/EditorPage'));
const AIChat = lazy(() => import('./pages/AI/AIChat'));
const AISettings = lazy(() => import('./pages/AI/AISettings'));
const ExternalImport = lazy(() => import('./pages/AI/ExternalImport'));
const TitleGenerator = lazy(() => import('./pages/AI/TitleGenerator/TitleGenerator'));
const BrowseTemplates = lazy(() => import('./pages/BrowseTemplates'));
const ToolsDashboard = lazy(() => import('./pages/Tools/ToolsDashboard'));
const ToolsHistory = lazy(() => import('./pages/Tools/ToolsHistory'));
const WordCounter = lazy(() => import('./tool-library/text-tools/WordCounter'));
const NumberRemover = lazy(() => import('./tool-library/text-tools/remove-number-from-text'));
const Summarizer = lazy(() => import('./tool-library/text-tools/Summarizer'));
const ZipFlattener = lazy(() => import('./tool-library/file-tools/ZipFlattener'));

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

function UserNamePopup({ onSave }: { onSave: (name: string, workspaceName: string) => void }) {
  const [name, setName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (name.trim() && workspaceName.trim()) {
      setIsSubmitting(true);
      // Simulate small delay for visual feedback
      await new Promise(resolve => setTimeout(resolve, 500));
      onSave(name.trim(), workspaceName.trim());
    }
  };

  return (
    <Modal isOpen={true} showCloseButton={false} id="setup-modal">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white tracking-tight">Redwan Assistant</h2>
          <p className="text-white/40 text-xs">অ্যাপটি পার্সোনালাইজ করতে আপনার তথ্য দিন।</p>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-white/40 uppercase ml-4" htmlFor="name-input">আপনার নাম</label>
            <input 
              id="name-input"
              type="text"
              placeholder="আপনার নাম..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-blue-500/50 transition-all font-bold"
              disabled={isSubmitting}
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-white/40 uppercase ml-4" htmlFor="workspace-input">ওয়ার্কস্পেস নাম</label>
            <input 
              id="workspace-input"
              type="text"
              placeholder="ওয়ার্কস্পেস নাম..."
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-blue-500/50 transition-all font-bold"
              disabled={isSubmitting}
            />
          </div>

          <button 
            type="submit"
            disabled={!name.trim() || !workspaceName.trim() || isSubmitting}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
            aria-label="Get Started"
            id="start-app-button"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Processing...
              </>
            ) : (
              'Get Started (শুরু করুন)'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1, ease: "linear" }}
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
  const isSearchPage = location.pathname === '/search';
  const isToolsPage = location.pathname.startsWith('/tools');
  const isAIPage = location.pathname.startsWith('/ai') || 
                   location.pathname.startsWith('/manual-control') || 
                   location.pathname === '/ai-auto';
  const isFullPage = isEditorPage || isSearchPage || isToolsPage || isAIPage;
  const [userName, setUserName] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark');

  useEffect(() => {
    DataManager.getUserName().then(name => {
      if (name) {
        setUserName(name);
      } else {
        setShowPopup(true);
      }
    });

    // Theme initialization
    DataManager.getUserPreferences().then(prefs => {
      setTheme(prefs.theme || 'dark');
    });

    // Listen for theme changes from AISettings
    const handleSync = (data: any) => {
      if (data.type === 'SYNC_COMPLETE') {
        DataManager.getUserPreferences().then(prefs => {
           setTheme(prefs.theme || 'dark');
        });
      }
    };
    DataManager.onSync(handleSync);
    return () => DataManager.offSync();
  }, []);

  const handleSaveName = async (name: string, workspaceName: string) => {
    await DataManager.saveUserName(name);
    const workspaces = await DataManager.getWorkspaces();
    const defaultWorkspace = workspaces[0];
    defaultWorkspace.name = workspaceName;
    await DataManager.saveWorkspace(defaultWorkspace);
    setUserName(name);
    setShowPopup(false);
  };

  const routingElement = useRoutes([
    { path: "/", element: <PageWrapper><HomePage /></PageWrapper> },
    { path: "/inbox", element: <PageWrapper><InboxPage /></PageWrapper> },
    { path: "/search", element: <PageWrapper><SearchPage /></PageWrapper> },
    { path: "/import/import", element: <PageWrapper><InboxPage /></PageWrapper> },
    { path: "/editor/:id", element: <PageWrapper><EditorPage /></PageWrapper> },
    { path: "/ai-auto", element: <PageWrapper><AIChat /></PageWrapper> },
    { path: "/manual-control", element: <PageWrapper><AIChat /></PageWrapper> },
    { path: "/manual-control/:model", element: <PageWrapper><AIChat /></PageWrapper> },
    { path: "/ai/settings", element: <PageWrapper><AISettings /></PageWrapper> },
    { path: "/ai/external-import", element: <PageWrapper><ExternalImport /></PageWrapper> },
    { path: "/ai/title-generator", element: <PageWrapper><TitleGenerator /></PageWrapper> },
    {path: "/templates", element: <PageWrapper><BrowseTemplates /></PageWrapper> },
    { path: "/tools", element: <PageWrapper><ToolsDashboard /></PageWrapper> },
    { path: "/tools/use-history", element: <PageWrapper><ToolsHistory /></PageWrapper> },
    { path: "/tools/word-counter", element: <PageWrapper><WordCounter /></PageWrapper> },
    { path: "/tools/number-remover", element: <PageWrapper><NumberRemover /></PageWrapper> },
    { path: "/tools/summarizer", element: <PageWrapper><Summarizer /></PageWrapper> },
    { path: "/tools/zip-flattener", element: <PageWrapper><ZipFlattener /></PageWrapper> },
    // Redirect /main to / for backward compatibility if needed
    { path: "/main", element: <Navigate to="/" replace /> },
  ]);

  const isLight = theme === 'light' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: light)').matches);

  return (
    <div className={`min-h-screen font-sans ${isLight ? 'light-theme' : 'bg-[#0A0A0A] text-white'} ${isFullPage ? '' : 'pb-32'} transition-colors duration-300`}>
      <AnimatePresence mode="wait">
        {showPopup && <UserNamePopup onSave={handleSaveName} key="popup" />}
      </AnimatePresence>
      
      <ErrorBoundary>
        <Suspense fallback={<LoadingScreen />}>
          {routingElement}
        </Suspense>
      </ErrorBoundary>

      {!isFullPage && <Navigation />}
      <VersionControl />
    </div>
  );
}

export default function App() {
  // Dynamically determine basename based on current path
  const basename = window.location.pathname.startsWith('/-R-N-AI') ? '/-R-N-AI' : '/';
  
  return (
    <Router basename={basename}>
      <AppContent />
    </Router>
  );
}
