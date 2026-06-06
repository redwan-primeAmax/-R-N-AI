/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { HashRouter as Router, useLocation, useRoutes, Navigate, useNavigate } from 'react-router-dom';
import HomePage from './pages/Home/HomePage';
import Navigation from './components/Navigation';
import { DataManager } from './services/storage/DataManager';
import localforage from 'localforage';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { ErrorBoundary } from './components/ErrorBoundary';
import LoadingScreen from './components/LoadingScreen';
import VersionControl from './components/VersionControl';
import { Modal } from './components/modals/Modal';
import { UserNamePopup } from './components/modals/UserNamePopup';
import { Loader2, Check, AlertCircle, X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper to retry lazy loading modules when dynamic import fails (e.g. on new PWA builds/deployments)
function lazyWithRetry<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return lazy(() =>
    importFn().catch((error) => {
      const isChunkLoadFailed = error.message && (
        error.message.includes('Failed to fetch dynamically imported module') ||
        error.message.includes('Loading chunk') ||
        error.message.includes('dynamic import')
      );
      
      if (isChunkLoadFailed) {
        // Prevent infinite reload loops (max 1 reload per 10 seconds)
        const lastReload = sessionStorage.getItem('chunk_err_reload');
        const now = Date.now();
        if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
          sessionStorage.setItem('chunk_err_reload', String(now));
          window.location.reload();
          // Return a pending promise to prevent rendering a broken page while reloading
          return new Promise<{ default: T }>(() => {});
        }
      }
      throw error;
    })
  );
}

// Lazy load other components
const SearchPage = lazyWithRetry(() => import('./pages/Search/SearchPage'));
const EditorPage = lazyWithRetry(() => import('./pages/Editor/EditorPage'));
const AIChat = lazyWithRetry(() => import('./pages/AI/AIChat'));
const AIConfiguration = lazyWithRetry(() => import('./pages/AI/AIConfiguration'));
const AIContentArchitect = lazyWithRetry(() => import('./pages/AI/AIContentArchitect'));
const BrowseTemplates = lazyWithRetry(() => import('./pages/Templates/BrowseTemplates'));
const RecycleBin = lazyWithRetry(() => import('./pages/Trash/RecycleBin'));
const NetworkShield = lazyWithRetry(() => import('./pages/Settings/NetworkShield'));
const AppCloudArchive = lazyWithRetry(() => import('./pages/Settings/AppCloudArchive'));
const StorageOptimizer = lazyWithRetry(() => import('./pages/Settings/StorageOptimizer'));
const RecentBackups = lazyWithRetry(() => import('./pages/Settings/RecentBackups'));
const WorkspacePage = lazyWithRetry(() => import('./pages/Workspace/WorkspacePage'));

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

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1, ease: "linear" }}
      className="w-full"
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
    const isExtensionsPage = false;
    const isAIPage = location.pathname.startsWith('/ai') || 
                   location.pathname.startsWith('/manual-control') || 
                   location.pathname === '/ai-auto' ||
                   location.pathname === '/settings' ||
                   location.pathname === '/external-ai-import';
    const isWorkspacePage = location.pathname === '/workspaces';
    const isSpecialPage = location.pathname === '/recycle-bin' || 
                       location.pathname === '/offline' || 
                       location.pathname === '/backup' ||
                       location.pathname === '/data-management' ||
                       location.pathname === '/templates';
    const isFullPage = isEditorPage || isSearchPage || isAIPage || isWorkspacePage || isSpecialPage;
  const [userName, setUserName] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [notification, setNotification] = useState<{ message: string; severity: 'warning' | 'error' } | null>(null);
  const [isOverLimit, setIsOverLimit] = useState(false);
  const [hasDismissedLimitWarning, setHasDismissedLimitWarning] = useState(false);

  useEffect(() => {
    // Refresh Logic: If user refreshes on any page other than /main, take them to /main
    // We check if this is a fresh mount and the current performance entry is a reload
    const entries = performance.getEntriesByType('navigation');
    const isReload = entries.length > 0 && (entries[0] as PerformanceNavigationTiming).type === 'reload';
    
    if (isReload && location.pathname !== '/main' && location.pathname !== '/') {
      console.log('App: Refresh detected, redirecting to home.');
      navigate('/main', { replace: true });
    }
  }, []);

  useEffect(() => {
    const checkLimit = async () => {
      try {
        const activeId = await DataManager.getActiveWorkspaceId();
        const counts = await DataManager.getNoteCountForWorkspaces();
        const count = counts[activeId] || 0;
        setIsOverLimit(count >= 10000);
      } catch (err) {
        console.error(err);
      }
    };

    checkLimit();

    window.addEventListener('workspace-notes-changed', checkLimit);
    return () => {
      window.removeEventListener('workspace-notes-changed', checkLimit);
    };
  }, []);

  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [hasDismissedInstallPrompt, setHasDismissedInstallPrompt] = useState(() => {
    return localStorage.getItem('pwa_dismissed_install') === 'true';
  });

  const isStandalone = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches || 
    (window.navigator as any).standalone === true
  );

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        localStorage.setItem('pwa_dismissed_install', 'true');
        setHasDismissedInstallPrompt(true);
        setDeferredPrompt(null);
      }
    }
  };

  const handleDismissInstall = () => {
    localStorage.setItem('pwa_dismissed_install', 'true');
    setHasDismissedInstallPrompt(true);
  };

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    let timer: any = null;
    const handleStorageWarning = (e: any) => {
      setNotification(e.detail);
      if (timer) clearTimeout(timer);
      // Auto-hide after 5 seconds
      timer = setTimeout(() => setNotification(null), 5000);
    };
    window.addEventListener('storage-warning', handleStorageWarning);
    return () => {
      window.removeEventListener('storage-warning', handleStorageWarning);
      if (timer) clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        // Step 1: Check User Profile
        const name = await DataManager.getUserName();
        const urlParams = new URLSearchParams(window.location.search);
        const isDebug = urlParams.get('debug') === 'true';
        
        if (name || isDebug) {
          setUserName(name || 'Tester');
        } else {
          setShowPopup(true);
        }

        // Step 3: Theme initialization
        const prefs = await DataManager.getUserPreferences();
        setTheme(prefs.theme || 'dark');
        setReducedMotion(!!prefs.reducedMotion);
      } catch (err) {
        console.error('App: Bootstrap failed', err);
      } finally {
        // Add a slight artificial delay for smoother entrance if it's too fast
        setTimeout(() => setIsInitializing(false), 500);
      }
    };

    bootstrap();

    const handleOpenExternal = () => navigate('/ai/external-import');
    const handleOpenSearch = () => navigate('/search');

    window.addEventListener('open-external-import', handleOpenExternal);
    window.addEventListener('open-global-search', handleOpenSearch);

    // Listen for theme changes from AIConfiguration
    const handleSync = (data: any) => {
      if (data.type === 'SYNC_COMPLETE') {
        DataManager.getUserPreferences().then(prefs => {
           setTheme(prefs.theme || 'dark');
           setReducedMotion(!!prefs.reducedMotion);
        });
      }
    };
    const syncHandler = DataManager.onSync(handleSync);
    return () => {
      DataManager.offSync(syncHandler);
      window.removeEventListener('open-external-import', handleOpenExternal);
      window.removeEventListener('open-global-search', handleOpenSearch);
    };
  }, [navigate]);

  const handleSaveName = async (name: string, workspaceName: string) => {
    try {
      await DataManager.saveUserName(name);
      const workspaces = await DataManager.getWorkspaces();
      if (workspaces && workspaces.length > 0) {
        const defaultWorkspace = workspaces[0];
        defaultWorkspace.name = workspaceName;
        await DataManager.saveWorkspace(defaultWorkspace);
      } else {
        await DataManager.saveWorkspace({
          id: 'default',
          name: workspaceName,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }
      DataManager.triggerSync('SYNC_COMPLETE');
      
      setUserName(name);
      setShowPopup(false);
    } catch (err) {
      console.error('Failed to save name & workspace:', err);
    }
  };

  const routingElement = useRoutes([
    { path: "/", element: <Navigate to="/main" replace /> },
    { path: "/main", element: <PageWrapper><HomePage /></PageWrapper> },
    { path: "/search", element: <PageWrapper><SearchPage /></PageWrapper> },
    { path: "/workspaces", element: <PageWrapper><WorkspacePage /></PageWrapper> },
    { path: "/recycle-bin", element: <PageWrapper><RecycleBin /></PageWrapper> },
    { path: "/network-shield", element: <PageWrapper><NetworkShield /></PageWrapper> },
    { path: "/cloud-archive", element: <PageWrapper><AppCloudArchive /></PageWrapper> },
    { path: "/offline", element: <Navigate to="/storage-optimizer" replace /> },
    { path: "/backup", element: <Navigate to="/storage-optimizer" replace /> },
    { path: "/data-management", element: <Navigate to="/storage-optimizer" replace /> },
    { path: "/storage-optimizer", element: <PageWrapper><StorageOptimizer /></PageWrapper> },
    { path: "/recent-backups", element: <PageWrapper><RecentBackups /></PageWrapper> },
    { path: "/editor/:id", element: <PageWrapper><EditorPage /></PageWrapper> },
    { path: "/ai-auto", element: <PageWrapper><AIChat /></PageWrapper> },
    { path: "/manual-control", element: <PageWrapper><AIChat /></PageWrapper> },
    { path: "/manual-control/*", element: <PageWrapper><AIChat /></PageWrapper> },
    { path: "/ai", element: <Navigate to="/ai-auto" replace /> },
    { path: "/settings", element: <PageWrapper><AIConfiguration /></PageWrapper> },
    { path: "/external-ai-import", element: <PageWrapper><AIContentArchitect /></PageWrapper> },
    { path: "/ai/settings", element: <Navigate to="/settings" replace /> },
    { path: "/ai/external-import", element: <Navigate to="/external-ai-import" replace /> },
    { path: "/template", element: <PageWrapper><BrowseTemplates /></PageWrapper> },
    { path: "/templates", element: <Navigate to="/template" replace /> },
    { path: "*", element: <Navigate to="/main" replace /> },
  ]);

  const isLight = theme === 'light';

  useEffect(() => {
    document.documentElement.classList.toggle('light-theme', isLight);
  }, [isLight]);

  if (isInitializing) {
    return <LoadingScreen />;
  }

  return (
    <MotionConfig reducedMotion={reducedMotion ? "always" : "user"}>
    <div className={`min-h-screen font-sans ${isLight ? 'light-theme' : 'bg-[#0A0A0A] text-white'} ${isFullPage ? '' : 'pb-32'} transition-colors duration-300`}>
      <AnimatePresence mode="wait">
        {showPopup && <UserNamePopup onSave={handleSaveName} key="popup" />}
        {isOverLimit && !isWorkspacePage && !hasDismissedLimitWarning && (
          <Modal id="limit-warning-modal" isOpen={true} onClose={() => setHasDismissedLimitWarning(true)} title="একটি সতর্কতা (Note Limit Reached)">
            <div className="flex flex-col items-center text-center p-6 gap-6 relative">
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center animate-bounce">
                <AlertCircle size={32} />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white">আপনি ১০,০০০ এর লিমিট সম্পূর্ণ করে ফেলেছেন।</h2>
                <p className="text-sm text-white/60">
                  আপনার বর্তমান ওয়ার্কস্পেসে ১০,০০০ বা এর বেশি নোট রয়েছে। ডিভাইস স্ট্যাবিলিটি অক্ষুণ্ণ রাখতে লিমিট বাড়ানোর সুযোগ নেই। অনুগ্রহ করে অন্য ওয়ার্কস্পেস ব্যবহার করুন।
                </p>
              </div>
              <button
                onClick={() => {
                  navigate('/workspaces');
                }}
                className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-600/20 active:scale-95"
              >
                নতুন নোট ক্রিয়েট করতে এখানে ক্লিক করুন (ওয়ার্কস্পেস পরিবর্তন)
              </button>
            </div>
          </Modal>
        )}
        {isOffline && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-0 left-0 right-0 z-[9999] bg-orange-500 text-white text-[10px] font-black uppercase tracking-[0.2em] py-1.5 text-center flex items-center justify-center gap-2"
        >
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          আপনি অফলাইনে আছেন (Offline Mode)
        </motion.div>
      )}

      {deferredPrompt && !showPopup && !hasDismissedInstallPrompt && !isStandalone && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: -20 }}
          className="fixed bottom-24 left-4 right-4 z-[9999] p-4 bg-blue-600 rounded-3xl shadow-2xl flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-blue-600">
              <Check size={24} />
            </div>
            <div>
              <p className="font-black text-xs uppercase tracking-wider">অ্যাপটি ইনস্টল করুন</p>
              <p className="text-[10px] text-white/60">দ্রুত এক্সেস এবং অফলাইন ব্যবহারের জন্য</p>
            </div>
          </div>
          <div className="flex gap-2">
             <button onClick={handleDismissInstall} className="p-2 text-white/40 hover:text-white">
                <X size={20} />
             </button>
             <button 
              onClick={handleInstall}
              className="bg-white text-blue-600 px-6 py-3 rounded-2xl font-black text-xs uppercase transition-transform active:scale-90"
            >
              ইন্সটল
            </button>
          </div>
        </motion.div>
      )}

      {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 20 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-0 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-[400px]"
          >
            <div className={cn(
              "px-6 py-4 rounded-2xl border shadow-2xl flex items-center gap-4",
              notification.severity === 'error' 
                ? "bg-red-500/90 text-white border-red-400 backdrop-blur-xl" 
                : "bg-yellow-500/90 text-black border-yellow-400 backdrop-blur-xl"
            )}>
              <div className="shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <AlertCircle size={20} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm leading-tight">{notification.message}</p>
                <p className="text-[10px] mt-1 opacity-60">সঞ্চয়স্থান পূর্ণ হলে ডাটা হারিয়ে যেতে পারে।</p>
              </div>
              <button 
                onClick={() => setNotification(null)}
                className="p-2 hover:bg-black/10 rounded-full transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <ErrorBoundary>
        <Suspense fallback={<LoadingScreen />}>
          {routingElement}
        </Suspense>
      </ErrorBoundary>

      {!isFullPage && <Navigation />}
      <VersionControl />
    </div>
    </MotionConfig>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
