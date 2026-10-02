/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lock, Unlock, ShieldCheck, ChevronLeft, Trash2, 
  Eye, EyeOff, Key, AlertCircle, FileLock, Search,
  ArrowRight, ShieldAlert, Zap
} from 'lucide-react';
import { DataManager, Note } from '../../services/storage/DataManager';
import { PasswordTakeCare } from './PasswordTakeCare';
import { cn } from '../../utils/cn';

export default function Vault() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasPasswordSet, setHasPasswordSet] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [lockedNotes, setLockedNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const checkStatus = useCallback(async () => {
    setLoading(true);
    const hasPwd = await PasswordTakeCare.hasMasterPassword();
    setHasPasswordSet(hasPwd);
    setLoading(false);
  }, []);

  const loadLockedNotes = useCallback(async () => {
    const allNotes = await DataManager.getAllNotes();
    const locked = allNotes.filter(n => n.isLocked && !n.isTrashed);
    setLockedNotes(locked);
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleSetPassword = async () => {
    if (password.length < 4) {
      setError('পাসওয়ার্ড অন্তত ৪ অক্ষরের হতে হবে');
      return;
    }
    if (password !== confirmPassword) {
      setError('পাসওয়ার্ড দুটি মিলেনি');
      return;
    }
    
    await PasswordTakeCare.setMasterPassword(password);
    setHasPasswordSet(true);
    setIsAuthenticated(true);
    loadLockedNotes();
  };

  const handleLogin = async () => {
    setError('');
    const isValid = await PasswordTakeCare.verifyPassword(password);
    if (isValid) {
      setIsAuthenticated(true);
      loadLockedNotes();
    } else {
      setError('ভুল পাসওয়ার্ড, আবার চেষ্টা করুন');
      setPassword('');
    }
  };

  const handleUnlockNote = async (noteId: string) => {
    if (window.confirm('আপনি কি এই নোটটির সুরক্ষা কবজ সরিয়ে ফেলতে চান?')) {
      await DataManager.updateNote(noteId, { isLocked: false });
      setLockedNotes(prev => prev.filter(n => n.id !== noteId));
    }
  };

  const filteredNotes = lockedNotes.filter(n => 
    n.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-2 border-amber-500/10 border-t-amber-500 rounded-full" 
        />
      </div>
    );
  }

  // --- Auth View (Login or Setup) ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col items-center justify-center p-6 font-sans">
        {/* Background Decor */}
        <div className="fixed top-0 left-0 w-full h-full bg-amber-500/[0.02] pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md space-y-10 relative z-10"
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-24 h-24 bg-amber-500/10 rounded-[2.5rem] border border-amber-500/20 flex items-center justify-center shadow-2xl shadow-amber-500/10 transition-transform hover:scale-105 duration-500">
              <Lock size={44} className="text-amber-500" />
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl font-black tracking-tighter uppercase">সিকিউর <span className="text-amber-500">ভল্ট</span></h1>
              <p className="text-white/30 text-xs font-bold uppercase tracking-widest">
                {hasPasswordSet ? 'Access Protected Content' : 'Setup Master Security'}
              </p>
            </div>
          </div>

          <div className="bg-white/[0.03] border border-white/5 rounded-[3rem] p-10 space-y-8 backdrop-blur-3xl shadow-2xl">
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 ml-2">Master Key</label>
                <div className="relative group">
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    onKeyDown={(e) => e.key === 'Enter' && (hasPasswordSet ? handleLogin() : null)}
                    placeholder="••••••••"
                    className="w-full bg-black/40 border border-white/10 rounded-[1.5rem] px-6 py-5 text-white focus:outline-none focus:border-amber-500/50 transition-all font-mono tracking-widest placeholder:tracking-normal placeholder:text-white/5"
                  />
                  <button 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 p-2 text-white/20 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {!hasPasswordSet && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 ml-2">Confirm Key</label>
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                    placeholder="••••••••"
                    className="w-full bg-black/40 border border-white/10 rounded-[1.5rem] px-6 py-5 text-white focus:outline-none focus:border-amber-500/50 transition-all font-mono tracking-widest placeholder:tracking-normal placeholder:text-white/5"
                  />
                </div>
              )}

              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-3 text-red-400 bg-red-400/5 p-4 rounded-2xl border border-red-400/10"
                  >
                    <AlertCircle size={16} />
                    <span className="text-[11px] font-bold uppercase tracking-wide">{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button 
              onClick={hasPasswordSet ? handleLogin : handleSetPassword}
              className="w-full py-5 bg-amber-500 hover:bg-amber-400 text-black rounded-[1.5rem] font-black text-xs uppercase tracking-[0.3em] transition-all shadow-xl shadow-amber-500/20 active:scale-95"
            >
              {hasPasswordSet ? 'ভল্ট আনলক করুন' : 'পাসওয়ার্ড সেটআপ করুন'}
            </button>
          </div>

          <button 
            onClick={() => navigate('/main')}
            className="w-full flex items-center justify-center gap-3 text-white/20 hover:text-white/50 transition-colors text-[10px] font-black uppercase tracking-[0.3em] group"
          >
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> ফিরে যান
          </button>
        </motion.div>
      </div>
    );
  }

  // --- Authenticated Dashboard View ---
  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col font-sans overflow-x-hidden">
      {/* Top Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-amber-500/30 z-[1001]" />
      
      <header className="px-6 py-8 md:px-12 flex items-center justify-between sticky top-0 bg-[#0d0d0d]/80 backdrop-blur-2xl z-[1000] border-b border-white/5">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/main')} 
            className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all active:scale-90"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
               <ShieldCheck size={14} className="text-amber-500" />
               <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Secure Environment</span>
            </div>
            <h1 className="text-3xl font-black tracking-tighter uppercase leading-none">
              সিকিউর <span className="text-amber-500">ভল্ট</span>
            </h1>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4">
           <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500">
                 <FileLock size={20} />
              </div>
              <div className="flex flex-col">
                 <span className="text-[10px] font-black text-white/20 uppercase tracking-widest leading-none mb-1">Vault Storage</span>
                 <span className="text-xl font-black text-white/90 leading-none">{lockedNotes.length}</span>
              </div>
           </div>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full space-y-12 pb-40">
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <div className="relative w-full max-w-md">
             <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20" size={18} />
             <input 
                type="text" 
                placeholder="ভল্টে কন্টেন্ট খুঁজুন..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/5 rounded-[2rem] pl-16 pr-8 py-5 text-sm font-medium focus:outline-none focus:border-amber-500/30 transition-all placeholder:text-white/10 shadow-inner"
             />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredNotes.length > 0 ? (
              filteredNotes.map((note) => (
                <motion.div
                  key={note.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="group relative p-8 bg-white/[0.02] border border-white/5 rounded-[3rem] hover:bg-white/[0.04] transition-all hover:border-amber-500/20 flex flex-col h-full overflow-hidden shadow-2xl"
                >
                  <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-100 group-hover:text-amber-500 transition-all">
                     <Lock size={16} />
                  </div>
                  
                  <div className="flex items-center gap-5 mb-8">
                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-4xl group-hover:scale-110 transition-transform shadow-inner border border-white/[0.05]">
                      {note.emoji || '📄'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-black tracking-tight truncate group-hover:text-amber-500 transition-colors uppercase leading-none mb-2">{note.title || 'Untitled'}</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/20">
                        {new Date(note.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <p className="text-[13px] text-white/40 leading-relaxed line-clamp-3 mb-10 flex-1 italic font-medium">
                    {note.content ? note.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) + '...' : 'নোটটি ফাঁকা আছে...'}
                  </p>

                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={() => navigate(`/editor/${note.id}`)}
                      className="w-full py-4.5 bg-white text-black hover:bg-amber-500 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95"
                    >
                      ভল্ট থেকে খুলুন <ArrowRight size={16} />
                    </button>
                    <div className="flex items-center gap-3">
                       <button 
                          onClick={() => handleUnlockNote(note.id)}
                          className="flex-1 py-4 bg-white/5 hover:bg-red-500/10 text-white/20 hover:text-red-400 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5 flex items-center justify-center gap-2"
                        >
                          আনলক <Unlock size={14} />
                        </button>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full py-40 flex flex-col items-center text-center space-y-8 opacity-20 grayscale">
                 <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center border border-white/5 shadow-inner">
                    <ShieldAlert size={44} />
                 </div>
                 <div className="space-y-2">
                    <h3 className="text-2xl font-black uppercase tracking-[0.3em]">Vault is Empty</h3>
                    <p className="text-xs font-bold uppercase tracking-widest">সুরক্ষিত কোনো ডেটা পাওয়া যায়নি</p>
                 </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className="px-6 py-12 border-t border-white/5 bg-white/[0.01] flex flex-col items-center gap-4">
        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/5">
          <Zap size={14} className="text-amber-500 fill-amber-500" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">End-to-End Encryption Enabled</span>
        </div>
      </footer>
    </div>
  );
}
