/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, useLocation, useRoutes, Navigate, useNavigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import { DataManager } from './utils/DataManager';
import { motion, AnimatePresence } from 'motion/react';
import { ErrorBoundary } from './components/ErrorBoundary';
import LoadingScreen from './components/LoadingScreen';
import VersionControl from './components/VersionControl';
import { Modal } from './components/Modal';
import { Loader2, Check } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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

const UserNamePopup = React.forwardRef<HTMLDivElement, { onSave: (name: string, workspaceName: string, storageType: 'local' | 'cloud') => void }>(({ onSave }, ref) => {
  const [name, setName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [storageType, setStorageType] = useState<'local' | 'cloud'>('local');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedWorkspace = workspaceName.trim();

    if (!trimmedName || !trimmedWorkspace) {
      setError('দয়া করে আপনার নাম এবং ওয়ার্কস্পেস নাম দিন।');
      return;
    }

    if (trimmedName.length < 2 || trimmedWorkspace.length < 2) {
      setError('নাম অন্তত ২ অক্ষরের হতে হবে।');
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulate small delay for visual feedback
      await new Promise(resolve => setTimeout(resolve, 500));
      onSave(trimmedName, trimmedWorkspace, storageType);
    } catch (err) {
      setError('কিছু একটা ভুল হয়েছে। আবার চেষ্টা করুন।');
      setIsSubmitting(false);
    }
  };

  return (
    <Modal ref={ref} isOpen={true} showCloseButton={false} id="setup-modal">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white tracking-tight">Redwan Assistant</h2>
          <p className="text-white/40 text-xs">অ্যাপটি পার্সোনালাইজ করতে আপনার তথ্য দিন।</p>
        </div>
        
        <div className="space-y-4">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold text-center"
            >
              {error}
            </motion.div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-white/40 uppercase ml-4" htmlFor="name-input">আপনার নাম</label>
            <input 
              id="name-input"
              type="text"
              placeholder="আপনার নাম..."
              value={name}
              maxLength={20}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-blue-500/50 transition-all font-bold placeholder:text-white/20 dark:bg-white/5 bg-gray-100 dark:text-white text-gray-900 shadow-inner"
              disabled={isSubmitting}
              autoFocus
              aria-required="true"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-white/40 uppercase ml-4" htmlFor="workspace-input">ওয়ার্কস্পেস নাম</label>
            <input 
              id="workspace-input"
              type="text"
              placeholder="ওয়ার্কস্পেস নাম..."
              value={workspaceName}
              maxLength={30}
              onChange={(e) => setWorkspaceName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-blue-500/50 transition-all font-bold placeholder:text-white/20 dark:bg-white/5 bg-gray-100 dark:text-white text-gray-900 shadow-inner"
              disabled={isSubmitting}
              aria-required="true"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-white/40 uppercase ml-4">তথ্য সংরক্ষণের মাধ্যম</label>
            <div className="grid grid-cols-1 gap-2">
              <button 
                type="button"
                onClick={() => setStorageType('local')}
                className={cn(
                  "p-4 rounded-2xl border text-left flex items-center justify-between transition-all",
                  storageType === 'local' ? "bg-blue-600 border-blue-400 text-white" : "bg-white/5 border-white/10 text-white/60"
                )}
              >
                <div>
                  <div className="font-bold text-sm">ব্রাউজার মেমোরি (সুপারিশকৃত)</div>
                  <div className="text-[10px] opacity-60">অফলাইন স্টোরেজ, দ্রুত ও সহজ</div>
                </div>
                {storageType === 'local' && <Check size={18} />}
              </button>
              <button 
                type="button"
                onClick={() => setStorageType('cloud')}
                className={cn(
                  "p-4 rounded-2xl border text-left flex items-center justify-between transition-all",
                  storageType === 'cloud' ? "bg-blue-600 border-blue-400 text-white" : "bg-white/5 border-white/10 text-white/60"
                )}
              >
                <div>
                  <div className="font-bold text-sm">গুগল ড্রাইভ (অনলাইন)</div>
                  <div className="text-[10px] opacity-60">সব ডিভাইসে তথ্য সমন্বয় করুন</div>
                </div>
                {storageType === 'cloud' && <Check size={18} />}
              </button>
            </div>
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
});

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
  const navigate = useNavigate();
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
    // Check for auto-sync from Drive on start (RN AI 2.7)
    DataManager.autoSyncOnStart().then(didRestore => {
      if (didRestore) {
        console.log('App: Data restored from Drive on startup');
      }
    });

    DataManager.getUserName().then(name => {
      const urlParams = new URLSearchParams(window.location.search);
      const isDebug = urlParams.get('debug') === 'true';
      
      if (name || isDebug) {
        setUserName(name || 'Tester');
        setShowPopup(false);
      } else {
        setShowPopup(true);
      }
    });

    // Theme initialization
    DataManager.getUserPreferences().then(prefs => {
      setTheme(prefs.theme || 'dark');
    });

    const handleOpenExternal = () => navigate('/ai/external-import');
    const handleOpenCloud = () => navigate('/inbox');

    window.addEventListener('open-external-import', handleOpenExternal);
    window.addEventListener('open-cloud-import', handleOpenCloud);

    // Listen for theme changes from AISettings
    const handleSync = (data: any) => {
      if (data.type === 'SYNC_COMPLETE') {
        DataManager.getUserPreferences().then(prefs => {
           setTheme(prefs.theme || 'dark');
        });
      }
    };
    DataManager.onSync(handleSync);
    return () => {
      DataManager.offSync(handleSync);
      window.removeEventListener('open-external-import', handleOpenExternal);
      window.removeEventListener('open-cloud-import', handleOpenCloud);
    };
  }, [navigate]);

  const handleSaveName = async (name: string, workspaceName: string, storageType: 'local' | 'cloud') => {
    await DataManager.saveUserName(name);
    const workspaces = await DataManager.getWorkspaces();
    const defaultWorkspace = workspaces[0];
    defaultWorkspace.name = workspaceName;
    await DataManager.saveWorkspace(defaultWorkspace);
    
    // Save storage preference
    const prefs = await DataManager.getUserPreferences();
    await DataManager.saveUserPreferences({ ...prefs, storageType });
    
    if (storageType === 'cloud') {
      const tokens = await DataManager.getGoogleTokens();
      if (!tokens) {
        // We could theoretically trigger the connect flow here, but 
        // the user is usually better off just starting with local first
        // especially if we recommended it.
      }
    }
    
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
