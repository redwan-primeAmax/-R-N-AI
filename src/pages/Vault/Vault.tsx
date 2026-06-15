/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lock, Unlock, ShieldCheck, ChevronLeft, Trash2, 
  Eye, EyeOff, Key, AlertCircle, FileLock, Search,
  Filter, ArrowRight
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

  useEffect(() => {
    checkPasswordStatus();
  }, []);

  const checkPasswordStatus = async () => {
    const hasPwd = await PasswordTakeCare.hasMasterPassword();
    setHasPasswordSet(hasPwd);
    setLoading(false);
  };

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
    fetchLockedNotes();
  };

  const handleLogin = async () => {
    const isValid = await PasswordTakeCare.verifyPassword(password);
    if (isValid) {
      setIsAuthenticated(true);
      fetchLockedNotes();
    } else {
      setError('ভুল পাসওয়ার্ড, আবার চেষ্টা করুন');
      setPassword('');
    }
  };

  const fetchLockedNotes = async () => {
    setLoading(true);
    const allNotes = await DataManager.getAllNotes();
    const locked = allNotes.filter(n => n.isLocked && !n.isTrashed);
    setLockedNotes(locked);
    setLoading(false);
  };

  const handleUnlockNote = async (noteId: string) => {
    if (window.confirm('আপনি কি এই নোটটির সুরক্ষা কবজ সরিয়ে ফেলতে চান?')) {
      await DataManager.updateNote(noteId, { isLocked: false });
      setLockedNotes(prev => prev.filter(n => n.id !== noteId));
    }
  };

  const filteredNotes = lockedNotes.filter(n => 
    n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (n.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && hasPasswordSet === null) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  // --- Auth View ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] text-white flex flex-col items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-8"
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-20 h-20 bg-amber-500/10 rounded-[2rem] border border-amber-500/20 flex items-center justify-center shadow-2xl shadow-amber-500/10">
              <Lock size={40} className="text-amber-500" />
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-black tracking-tight">সিকিউর ভল্ট</h1>
              <p className="text-white/40 text-sm font-medium">
                {hasPasswordSet ? 'ভল্টে প্রবেশ করতে পাসওয়ার্ড দিন' : 'আপনার গোপন নোটগুলো সুরক্ষিত রাখতে একটি মাস্টার পাসওয়ার্ড সেট করুন'}
              </p>
            </div>
          </div>

          <div className="bg-white/[0.03] border border-white/5 rounded-[2.5rem] p-8 space-y-6 backdrop-blur-xl">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 ml-2">Master Password</label>
                <div className="relative group">
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    onKeyDown={(e) => e.key === 'Enter' && (hasPasswordSet ? handleLogin() : null)}
                    placeholder="••••••••"
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-white/5"
                  />
                  <button 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white/20 hover:text-white/60 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {!hasPasswordSet && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 ml-2">Confirm Password</label>
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                    placeholder="••••••••"
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-white/5"
                  />
                </div>
              )}

              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex items-center gap-2 text-red-400 bg-red-400/10 p-3 rounded-xl border border-red-400/20"
                  >
                    <AlertCircle size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button 
              onClick={hasPasswordSet ? handleLogin : handleSetPassword}
              className="w-full py-5 bg-amber-500 hover:bg-amber-400 text-black rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all shadow-xl shadow-amber-500/10 active:scale-[0.98]"
            >
              {hasPasswordSet ? 'ভল্ট আনলক করুন' : 'পাসওয়ার্ড সেটআপ করুন'}
            </button>
          </div>

          <button 
            onClick={() => navigate('/main')}
            className="w-full flex items-center justify-center gap-2 text-white/20 hover:text-white/40 transition-colors text-[10px] font-black uppercase tracking-widest"
          >
            <ChevronLeft size={16} /> ফিরে যান
          </button>
        </motion.div>
      </div>
    );
  }

  // --- Dashboard View ---
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white flex flex-col font-sans">
      <div className="fixed top-0 left-0 w-full h-1 bg-amber-500/20 z-[1001]" />
      
      <header className="px-6 py-10 md:px-12 flex items-center justify-between sticky top-0 bg-[#0A0A0B]/80 backdrop-blur-2xl z-[1000] border-b border-white/5">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/main')} 
            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-white border border-white/5 active:scale-95"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
               <ShieldCheck size={14} className="text-amber-500" />
               <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Secure Environment</span>
            </div>
            <h1 className="text-3xl font-black tracking-tighter uppercase leading-none">
              সিকিউর <span className="text-amber-500">ভল্ট</span>
            </h1>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4">
           <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/20 rounded-xl">
                 <FileLock size={20} className="text-amber-500" />
              </div>
              <div className="flex flex-col">
                 <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Locked Items</span>
                 <span className="text-lg font-black text-white/90">{lockedNotes.length}</span>
              </div>
           </div>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full space-y-12">
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <div className="relative w-full max-w-md">
             <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20" size={18} />
             <input 
                type="text" 
                placeholder="ভল্টে কন্টেন্ট খুঁজুন..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/5 rounded-[2rem] pl-16 pr-8 py-5 text-sm font-medium focus:outline-none focus:border-amber-500/30 transition-all placeholder:text-white/10"
             />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredNotes.length > 0 ? (
              filteredNotes.map((note) => (
                <motion.div
                  key={note.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="group relative p-8 bg-white/[0.02] border border-white/5 rounded-[3rem] hover:bg-white/[0.05] transition-all hover:border-amber-500/20 flex flex-col h-full overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transition-opacity">
                     <Lock size={16} className="text-amber-500/40" />
                  </div>
                  
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 bg-white/5 rounded-[1.5rem] flex items-center justify-center text-3xl group-hover:scale-110 transition-transform shadow-inner">
                      {note.emoji || '📄'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-black tracking-tight truncate group-hover:text-amber-500 transition-colors">{note.title || 'শিরোনামহীন'}</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/20">
                        {new Date(note.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-white/40 leading-relaxed line-clamp-3 mb-8 flex-1 italic">
                    {note.description || 'কোন বিবরণী নেই...'}
                  </p>

                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => navigate(`/editor/${note.id}`)}
                      className="flex-1 py-4 bg-white/5 hover:bg-amber-500 hover:text-black rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5 flex items-center justify-center gap-2"
                    >
                      ভল্ট থেকে খুলুন <ArrowRight size={14} />
                    </button>
                    <button 
                      onClick={() => handleUnlockNote(note.id)}
                      className="p-4 bg-white/5 hover:bg-red-500/20 text-white/20 hover:text-red-400 rounded-2xl transition-all border border-white/5"
                      title="সরিয়ে ফেলুন"
                    >
                      <Unlock size={18} />
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full py-32 flex flex-col items-center text-center space-y-6 opacity-20">
                 <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center border border-white/5">
                    <FileLock size={32} />
                 </div>
                 <div className="space-y-1">
                    <h3 className="text-xl font-black uppercase tracking-wider">ভল্ট খালি</h3>
                    <p className="text-xs font-medium">লক করা কোন নোট পাওয়া যায়নি</p>
                 </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className="px-6 py-12 border-t border-white/5 bg-white/[0.02] flex flex-col items-center gap-4">
        <div className="flex items-center gap-2 px-4 py-1.5 bg-white/5 rounded-full border border-white/5">
          <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white/20">End-to-End Secure Vault Dashboard</span>
        </div>
        <button 
          onClick={async () => {
             if (window.confirm('আপনি কি মাস্টার পাসওয়ার্ড রিসেট করতে চান? এটি করার জন্য বর্তমান পাসওয়ার্ড প্রয়োজন হবে না (সিস্টেম ম্যানেজমেন্ট প্রোটেকশন)।')) {
                const newP = prompt('নতুন পাসওয়ার্ড দিন:');
                if (newP && newP.length >= 4) {
                   await PasswordTakeCare.setMasterPassword(newP);
                   alert('পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে।');
                }
             }
          }}
          className="text-[9px] text-white/10 hover:text-amber-500/50 font-bold uppercase tracking-widest transition-colors"
        >
          বিপজ্জনক: পাসওয়ার্ড পরিবর্তন করুন
        </button>
      </footer>
    </div>
  );
}
