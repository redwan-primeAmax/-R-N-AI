import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Plus, Edit2, Trash2, Check, X, 
  Layout, Loader2, MoreHorizontal, Home, Users 
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DataManager } from '../../services/storage/DataManager';
import { globalCollabManager } from '../../services/PeerCollabManager';
import { ConfirmDialog } from '../../components/modals/CustomDialogs';
import { Workspace } from '../../types';

import { WorkspaceLogoModal } from '../../components/modals/WorkspaceLogoModal';
import LoadingScreen from '../../components/LoadingScreen';
import { Modal } from '../../components/modals/Modal';

export default function WorkspacePage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>('');
  const [workspaceNoteCounts, setWorkspaceNoteCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [editName, setEditName] = useState('');
  const [isSwitching, setIsSwitching] = useState(false);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<string | null>(null);
  const [workspaceForLogo, setWorkspaceForLogo] = useState<Workspace | null>(null);
  const [workspaceSettingsModal, setWorkspaceSettingsModal] = useState<Workspace | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const origin = location.state?.from || 'direct';

  const animationVariants = useMemo(() => ({
    header: {
      top: { initial: { y: '-100%' }, animate: { y: 0 } },
      bottom: { initial: { y: '100%' }, animate: { y: 0 } }
    },
    sidebar: {
      topLeft: { initial: { x: '-100%', y: '-100%' }, animate: { x: 0, y: 0 } },
      bottomRight: { initial: { x: '100%', y: '100%' }, animate: { x: 0, y: 0 } }
    }
  }), []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const ws = await DataManager.getWorkspaces();
      const activeId = await DataManager.getActiveWorkspaceId();
      const counts = await DataManager.getNoteCountForWorkspaces();
      setWorkspaceNoteCounts(counts || {});
      setWorkspaces(ws);
      setActiveWorkspaceId(activeId);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    window.addEventListener('workspace-notes-changed', loadData);
    return () => {
      window.removeEventListener('workspace-notes-changed', loadData);
    };
  }, [loadData]);

  const handleCreate = async () => {
    if (!newWorkspaceName.trim()) return;
    
    const newWs: Workspace = {
      id: crypto.randomUUID(),
      name: newWorkspaceName.trim(),
      createdAt: Date.now()
    };
    
    await DataManager.saveWorkspace(newWs);
    setNewWorkspaceName('');
    setIsCreating(false);
    
    // Switch to new workspace immediately/automatically
    await handleSwitch(newWs.id);
  };

  const handleRename = async () => {
    if (!editingWorkspace || !editName.trim()) return;
    
    const updated = { ...editingWorkspace, name: editName.trim() };
    await DataManager.saveWorkspace(updated);
    setEditingWorkspace(null);
    loadData();
  };

  const handleDelete = async () => {
    if (!workspaceToDelete) return;

    await DataManager.deleteWorkspace(workspaceToDelete);
    if (activeWorkspaceId === workspaceToDelete) {
      await DataManager.setActiveWorkspaceId('default');
    }
    setWorkspaceToDelete(null);
    loadData();
  };

  const handleSwitch = async (id: string) => {
    setIsSwitching(true);
    // User requested: "লোড না হওয়া পর্যন্ত স্ক্রিনে কিছু দেখানো যাবে না (Loading State)"
    await new Promise(resolve => setTimeout(resolve, 800)); // Artificial delay for smoother transition
    await DataManager.setActiveWorkspaceId(id);
    setActiveWorkspaceId(id);
    setIsSwitching(false);
    
    // Switch should always go to home page
    navigate('/main');
  };

  const handleUpdateLogo = async (svg: string) => {
    if (!workspaceForLogo) return;
    const updated = { ...workspaceForLogo, logoSvg: svg };
    await DataManager.saveWorkspace(updated);
    setWorkspaceForLogo(null);
    loadData();
  };

  return (
    <div className="relative min-h-screen bg-[#0A0A0A] overflow-hidden antialiased">
      {isLoading && <LoadingScreen />}
      {/* Background Layer to prevent flashes */}
      <div className="fixed inset-0 bg-[#0A0A0A] z-[-1]" />

      {/* Split Animation Containers */}
      <AnimatePresence mode="wait">
        {origin === 'header' ? (
          <div className="fixed inset-0 z-0 pointer-events-none">
            <motion.div 
              initial={animationVariants.header.top.initial}
              animate={animationVariants.header.top.animate}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="absolute top-0 left-0 w-full h-1/2 bg-[#0A0A0A]"
            />
            <motion.div 
              initial={animationVariants.header.bottom.initial}
              animate={animationVariants.header.bottom.animate}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="absolute bottom-0 left-0 w-full h-1/2 bg-[#0A0A0A]"
            />
          </div>
        ) : origin === 'sidebar' ? (
          <div className="fixed inset-0 z-0 pointer-events-none">
            <motion.div 
              initial={animationVariants.sidebar.topLeft.initial}
              animate={animationVariants.sidebar.topLeft.animate}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="absolute top-0 left-0 w-full h-1/2 bg-[#0A0A0A]"
            />
            <motion.div 
              initial={animationVariants.sidebar.bottomRight.initial}
              animate={animationVariants.sidebar.bottomRight.animate}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="absolute bottom-0 left-0 w-full h-1/2 bg-[#0A0A0A]"
            />
          </div>
        ) : null}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="relative z-10 p-6 pb-32"
      >
        <AnimatePresence>
          {isSwitching && <LoadingScreen />}
        </AnimatePresence>

        <header className="mb-10 pt-4 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tighter italic">ওয়ার্কস্পেস</h1>
            <p className="text-[10px] text-white/20 uppercase font-black tracking-[0.3em] mt-1">Management</p>
          </div>
        </header>

        {/* New Glassmorphic Navigation Bar */}
        <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-xl bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[40px] p-3 flex items-center gap-3 z-[100] shadow-2xl">
          <button 
            onClick={() => {
              navigate('/main');
            }}
            className="w-16 h-16 bg-white/5 hover:bg-white/10 rounded-[30px] flex items-center justify-center text-white/60 transition-all active:scale-90"
          >
            <Home size={24} />
          </button>
          
          <button 
            onClick={() => setIsCreating(true)}
            className="flex-1 h-16 bg-blue-600 hover:bg-blue-500 rounded-[30px] flex items-center justify-center gap-3 text-sm font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95"
          >
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
              <Plus size={20} />
            </div>
            <span>Create New Workspace</span>
          </button>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {isCreating && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="p-6 bg-white/5 border-2 border-blue-500/50 rounded-[32px] flex flex-col gap-4"
            >
              <div className="text-[10px] text-blue-500 font-black uppercase tracking-widest">New Workspace</div>
              <input 
                autoFocus
                type="text" 
                placeholder="নাম লিখুন..."
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                className="w-full bg-transparent border-b border-white/10 py-2 text-lg font-bold outline-none focus:border-blue-500 transition-colors"
              />
              <div className="flex gap-2 mt-2">
                <button 
                  onClick={handleCreate}
                  className="flex-1 py-3 bg-blue-600 rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  <Check size={18} /> সেভ
                </button>
                <button 
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-3 bg-white/5 rounded-xl font-bold"
                >
                  <X size={18} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 bg-white/5 rounded-[32px] animate-pulse" />
          ))
        ) : (
          workspaces.map((ws) => (
            <motion.div 
              key={ws.id}
              className={`group p-6 rounded-[32px] border transition-all duration-300 flex flex-col justify-between h-48 relative overflow-hidden ${
                ws.id === activeWorkspaceId 
                  ? "bg-blue-500/10 border-blue-500/50 shadow-xl shadow-blue-500/5" 
                  : "bg-white/[0.03] border-white/[0.05] hover:bg-white/[0.05]"
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        setWorkspaceForLogo(ws);
                      }}
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center cursor-pointer transition-transform active:scale-95 ${
                        ws.id === activeWorkspaceId ? "bg-blue-500 text-white" : "bg-white/10 text-white/40"
                      }`}
                    >
                      {ws.logoSvg ? (
                         <div 
                           className="w-6 h-6 flex items-center justify-center overflow-hidden pointer-events-none"
                           dangerouslySetInnerHTML={{ __html: ws.logoSvg }}
                         />
                      ) : (
                        <Layout size={20} />
                      )}
                    </div>
                  <div>
                    {editingWorkspace?.id === ws.id ? (
                      <input 
                        autoFocus
                        className="bg-transparent border-b border-white/20 outline-none font-bold text-lg w-40"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={handleRename}
                        onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                      />
                    ) : (
                      <h3 className="font-bold text-lg truncate w-40">{ws.name}</h3>
                    )}
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-bold text-white/30 uppercase tracking-tighter">
                        Created: {new Date(ws.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
                
                {ws.id === activeWorkspaceId && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 rounded-full shadow-[0_4px_12px_rgba(37,99,235,0.4)]">
                    <div className="w-1 h-1 rounded-full bg-white animate-pulse" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-white">Live</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-auto">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleSwitch(ws.id)}
                    className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      ws.id === activeWorkspaceId 
                        ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" 
                        : "bg-white/5 text-white/40 hover:bg-white/10"
                    }`}
                  >
                    {ws.id === activeWorkspaceId ? "Live" : "Select"}
                  </button>
                  <span className="text-[9px] font-mono font-bold text-white/20 bg-white/5 px-2 py-1 rounded-lg">
                    {workspaceNoteCounts[ws.id] || 0} / 10,000
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => {
                        setWorkspaceSettingsModal(ws);
                    }}
                    className="p-3 bg-white/[0.03] hover:bg-white/[0.08] rounded-2xl border border-white/[0.05] transition-all text-white/40 hover:text-white active:scale-90"
                  >
                    <MoreHorizontal size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {workspaceSettingsModal && (
          <Modal 
            id="workspace-settings"
            isOpen={true} 
            onClose={() => setWorkspaceSettingsModal(null)} 
            title="Workspace settings"
          >
            <div className="p-6 space-y-4">
              <button 
                onClick={() => {
                  setEditName(workspaceSettingsModal.name);
                  setEditingWorkspace(workspaceSettingsModal);
                  setWorkspaceSettingsModal(null);
                }}
                className="w-full flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-3xl transition-all active:scale-95 text-left"
              >
                <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center">
                  <Edit2 size={20} />
                </div>
                <div>
                  <div className="font-bold text-white">Rename Workspace</div>
                  <div className="text-[10px] text-white/40 uppercase font-black">Change the display name</div>
                </div>
              </button>

              <button 
                onClick={() => {
                  if (workspaceSettingsModal.id === 'default') return;
                  setWorkspaceToDelete(workspaceSettingsModal.id);
                  setWorkspaceSettingsModal(null);
                }}
                className={`w-full flex items-center gap-4 p-4 bg-white/5 hover:bg-red-500/10 border border-white/5 rounded-3xl transition-all active:scale-95 text-left group ${workspaceSettingsModal.id === 'default' ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}
              >
                <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-all">
                  <Trash2 size={20} />
                </div>
                <div>
                  <div className="font-bold text-white group-hover:text-red-500 transition-colors">Delete Workspace</div>
                  <div className="text-[10px] text-white/40 uppercase font-black">Permanently remove this workspace</div>
                </div>
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <div className="mt-20 p-8 bg-amber-500/10 rounded-[40px] border border-amber-500/20 text-center max-w-2xl mx-auto space-y-2">
        <h4 className="font-bold text-amber-400 mb-1">সীমাবদ্ধতা সংক্রান্ত তথ্য (Workspace Note Limit)</h4>
        <p className="text-sm text-white/60 leading-relaxed font-semibold">
          আপনি প্রত্যেকটা ওয়ার্কস্পেসে ১০,০০০ পর্যন্ত ম্যাক্সিমাম ১০,০০০ নোট রাখতে পারবেন। এর উপরে রাখতে পারবেন না, কারণ এতে আপনার ডিভাইসের সমস্যা দেখা দিতে পারে।
        </p>
      </div>
      <ConfirmDialog
        isOpen={workspaceToDelete !== null}
        onClose={() => setWorkspaceToDelete(null)}
        onConfirm={handleDelete}
        title="ওয়ার্কস্পেস ডিলিট"
        message="আপনি কি এই ওয়ার্কস্পেস এবং এর ভেতরের সব নোট মুছে ফেলতে চান? এটি আর ফিরিয়ে আনা যাবে না।"
        variant="danger"
        confirmText="হ্যাঁ, ডিলেট করুন"
        cancelText="বাতিল"
      />

      <WorkspaceLogoModal 
        isOpen={!!workspaceForLogo}
        onClose={() => setWorkspaceForLogo(null)}
        onSave={handleUpdateLogo}
        currentLogo={workspaceForLogo?.logoSvg}
      />
      </motion.div>
    </div>
  );
}
