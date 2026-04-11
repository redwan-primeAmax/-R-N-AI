/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, useLocation, useRoutes, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import { motion, AnimatePresence } from 'motion/react';
import { ErrorBoundary } from './components/ErrorBoundary';

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
const ToolsHistory = lazy(() => import('./pages/Tools/ToolsHistory'));
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

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
}

function AppContent() {
  const location = useLocation();
  const isEditorPage = location.pathname.startsWith('/editor/');
  const isSearchPage = location.pathname === '/search';
  const isToolsPage = location.pathname.startsWith('/tools');
  const isFullPage = isEditorPage || isSearchPage || isToolsPage || location.pathname.startsWith('/ai');

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
    { path: "/templates", element: <PageWrapper><BrowseTemplates /></PageWrapper> },
    { path: "/tools", element: <PageWrapper><ToolsDashboard /></PageWrapper> },
    { path: "/tools/use-history", element: <PageWrapper><ToolsHistory /></PageWrapper> },
    { path: "/tools/word-counter", element: <PageWrapper><WordCounter /></PageWrapper> },
    { path: "/tools/number-remover", element: <PageWrapper><NumberRemover /></PageWrapper> },
    { path: "/tools/summarizer", element: <PageWrapper><Summarizer /></PageWrapper> },
  ]);

  return (
    <div className={`min-h-screen bg-[#191919] text-white font-sans ${isFullPage ? '' : 'pb-24'}`}>
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <AnimatePresence mode="sync">
            <React.Fragment key={location.pathname}>
              {routingElement}
            </React.Fragment>
          </AnimatePresence>
        </Suspense>
      </ErrorBoundary>
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
