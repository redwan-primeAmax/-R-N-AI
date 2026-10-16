/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * This source code is proprietary and confidential. No part of this
 * project may be copied, modified, distributed, or used in any form
 * without the prior written permission of the copyright holder.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import {
  Lock, Unlock, ShieldCheck, ChevronLeft, Eye, EyeOff,
  AlertCircle, FileLock2, Search, ArrowRight, ShieldAlert,
  Fingerprint, KeyRound, HardDrive, Check, X, LockKeyhole,
} from 'lucide-react';
import { DataManager, Note } from '../../services/storage/DataManager';
import { PasswordTakeCare } from './PasswordTakeCare';
import { cn } from '../../utils/cn';
import { useLanguage } from '../../utils/translator';

function passwordStrength(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(4, score);
}

export default function Vault() {
  const navigate = useNavigate();
  const { t } = useLanguage();
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
    if (password.length < 8) {
      setError(t('vault.errorMinLength'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('vault.errorMismatch'));
      return;
    }
    await PasswordTakeCare.setMasterPassword(password);
    setHasPasswordSet(true);
    setIsAuthenticated(true);
    setPassword('');
    setConfirmPassword('');
    loadLockedNotes();
  };

  const handleLogin = async () => {
    setError('');
    const isValid = await PasswordTakeCare.verifyPassword(password);
    if (isValid) {
      setIsAuthenticated(true);
      setPassword('');
      loadLockedNotes();
    } else {
      setError(t('vault.errorWrong'));
      setPassword('');
    }
  };

  const handleLockVault = () => {
    setIsAuthenticated(false);
    setPassword('');
    setConfirmPassword('');
    setError('');
    setSearchTerm('');
    setLockedNotes([]);
  };

  const handleUnlockNote = async (noteId: string) => {
    if (window.confirm(t('vault.confirmRemove'))) {
      const pwd = prompt(t('vault.notePasswordPrompt'));
      if (pwd === null) return;
      if (!await DataManager.authorizeNote(noteId, pwd)) { setError(t('vault.errorWrongNote')); return; }
      await DataManager.updateNote(noteId, { isLocked: false });
      setLockedNotes(prev => prev.filter(n => n.id !== noteId));
    }
  };

  const filteredNotes = lockedNotes.filter(n =>
    n.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const strength = useMemo(() => passwordStrength(password), [password]);
  const strengthLabels = [t('vault.strengthWeak'), t('vault.strengthWeak'), t('vault.strengthFair'), t('vault.strengthGood'), t('vault.strengthStrong')];
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f0d] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-2 border-emerald-500/10 border-t-emerald-500 rounded-full"
        />
      </div>
    );
  }

  // --- Auth View (Login or Setup) ---
  if (!isAuthenticated) {
    const isSetup = !hasPasswordSet;
    return (
      <div className="min-h-screen bg-[#0b0f0d] text-white flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
        {/* Ambient background */}
        <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[480px] h-[480px] rounded-full bg-emerald-500/[0.07] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -right-24 w-[360px] h-[360px] rounded-full bg-amber-500/[0.05] blur-3xl" />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md relative z-10 space-y-6"
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-b from-emerald-400/25 to-emerald-600/10 border border-emerald-400/30 flex items-center justify-center shadow-[0_16px_40px_rgba(16,185,129,0.25)]">
                <ShieldCheck size={44} className="text-emerald-400" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#0b0f0d] border border-emerald-400/30 flex items-center justify-center">
                <LockKeyhole size={14} className="text-amber-400" />
              </div>
            </div>
            <div className="space-y-1.5">
              <h1 className="text-3xl font-black tracking-tight">{t('vault.title')}</h1>
              <p className="text-white/40 text-sm font-medium">
                {isSetup ? t('vault.setupSubtitle') : t('vault.unlockSubtitle')}
              </p>
            </div>
          </div>

          {/* Security indicators */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {[
              { icon: Lock, label: t('vault.encryptedBadge') },
              { icon: Fingerprint, label: t('vault.pinProtected') },
              { icon: HardDrive, label: t('vault.storageLocal') },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-bold uppercase tracking-wider text-white/50">
                <Icon size={12} className="text-emerald-400" />
                {label}
              </span>
            ))}
          </div>

          <div className="bg-white/[0.03] border border-white/[0.08] rounded-[2rem] p-6 sm:p-8 space-y-5 shadow-2xl backdrop-blur-xl">
            <div className="space-y-2">
              <label htmlFor="vault-master-password" className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30 ml-1">
                {t('vault.masterPassword')}
              </label>
              <div className="relative">
                <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" />
                <input
                  id="vault-master-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && (hasPasswordSet ? handleLogin() : null)}
                  placeholder={t('vault.passwordPlaceholder')}
                  autoComplete={isSetup ? 'new-password' : 'current-password'}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl pl-11 pr-12 py-4 text-white focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono tracking-widest placeholder:font-sans placeholder:tracking-normal placeholder:text-white/20 text-sm"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-white/25 hover:text-white transition-colors"
                  aria-label={showPassword ? t('vault.hidePassword') : t('vault.showPassword')}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* PIN / password dots indicator */}
              {password.length > 0 && (
                <div className="flex items-center gap-1.5 pt-1 pl-1" aria-hidden="true">
                  {Array.from({ length: Math.min(12, password.length) }).map((_, i) => (
                    <span key={i} className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
                  ))}
                  {password.length > 12 && <span className="text-[10px] text-white/30 font-bold ml-1">+{password.length - 12}</span>}
                </div>
              )}

              {/* Strength meter (setup only) */}
              {isSetup && password.length > 0 && (
                <div className="pt-2 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4].map((level) => (
                      <span
                        key={level}
                        className={cn(
                          "h-1.5 flex-1 rounded-full transition-colors",
                          strength >= level
                            ? level <= 1 ? "bg-red-400" : level === 2 ? "bg-amber-400" : "bg-emerald-400"
                            : "bg-white/10"
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/30">
                    {t('vault.strengthLabel')}: <span className="text-white/60">{strengthLabels[strength]}</span>
                  </p>
                </div>
              )}
            </div>

            {isSetup && (
              <div className="space-y-2">
                <label htmlFor="vault-confirm-password" className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30 ml-1">
                  {t('vault.confirmPassword')}
                </label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" />
                  <input
                    id="vault-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSetPassword()}
                    placeholder={t('vault.confirmPlaceholder')}
                    autoComplete="new-password"
                    className="w-full bg-black/40 border border-white/10 rounded-2xl pl-11 pr-12 py-4 text-white focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono tracking-widest placeholder:font-sans placeholder:tracking-normal placeholder:text-white/20 text-sm"
                  />
                  {confirmPassword.length > 0 && (
                    <span className={cn(
                      "absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center",
                      passwordsMatch ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                    )}>
                      {passwordsMatch ? <Check size={12} strokeWidth={3.5} /> : <X size={12} strokeWidth={3.5} />}
                    </span>
                  )}
                </div>
              </div>
            )}

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex items-center gap-3 text-red-300 bg-red-500/[0.08] p-4 rounded-2xl border border-red-500/20"
                  role="alert"
                >
                  <AlertCircle size={16} className="shrink-0" />
                  <span className="text-[11px] font-bold uppercase tracking-wide">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={hasPasswordSet ? handleLogin : handleSetPassword}
              className="w-full py-4 bg-gradient-to-b from-emerald-400 to-emerald-600 hover:from-emerald-300 hover:to-emerald-500 text-emerald-950 rounded-2xl font-black text-xs uppercase tracking-[0.25em] transition-all shadow-[0_12px_30px_rgba(16,185,129,0.35)] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {hasPasswordSet ? <Unlock size={16} /> : <ShieldCheck size={16} />}
              {hasPasswordSet ? t('vault.unlock') : t('vault.setupCta')}
            </button>

            <p className="text-[11px] text-white/25 leading-relaxed text-center">{t('vault.encryptionNote')}</p>
          </div>

          <button
            onClick={() => navigate('/main')}
            className="w-full flex items-center justify-center gap-2 text-white/25 hover:text-white/60 transition-colors text-[10px] font-black uppercase tracking-[0.3em] group"
          >
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> {t('common.back')}
          </button>
        </motion.div>
      </div>
    );
  }

  // --- Authenticated Dashboard View ---
  return (
    <div className="min-h-screen bg-[#0b0f0d] text-white flex flex-col font-sans overflow-x-hidden">
      <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/60 via-amber-400/60 to-emerald-500/60 z-[1001]" />

      <header className="px-6 py-6 md:px-12 flex items-center justify-between sticky top-0 bg-[#0b0f0d]/85 backdrop-blur-2xl z-[1000] border-b border-white/5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/main')}
            className="w-11 h-11 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/[0.08] rounded-2xl transition-all active:scale-90"
            aria-label={t('common.back')}
          >
            <ChevronLeft size={22} />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={13} className="text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400/70">{t('vault.secureEnvironment')}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-none">{t('vault.title')}</h1>
            <p className="text-xs text-white/30 font-medium mt-1.5">{t('vault.subtitle')}</p>
          </div>
        </div>

        <button
          onClick={handleLockVault}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-300 text-[11px] font-black uppercase tracking-wider transition-all active:scale-95"
        >
          <Lock size={14} />
          <span className="hidden sm:inline">{t('vault.lockNow')}</span>
        </button>
      </header>

      <main className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full space-y-8 pb-24">
        {error && (
          <div className="flex items-center gap-3 text-red-300 bg-red-500/[0.08] p-4 rounded-2xl border border-red-500/20" role="alert">
            <AlertCircle size={16} className="shrink-0" />
            <span className="text-[11px] font-bold uppercase tracking-wide">{error}</span>
            <button onClick={() => setError('')} className="ml-auto text-red-300/60 hover:text-red-200" aria-label={t('nav.close')}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: FileLock2, label: t('vault.totalLocked'), value: String(lockedNotes.length), accent: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
            { icon: Fingerprint, label: t('vault.protection'), value: t('vault.protectionOn'), accent: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
            { icon: HardDrive, label: t('vault.storage'), value: t('vault.storageLocal'), accent: "text-sky-400 bg-sky-500/10 border-sky-500/20" },
          ].map(({ icon: Icon, label, value, accent }) => (
            <div key={label} className="flex items-center gap-4 p-5 rounded-3xl bg-white/[0.03] border border-white/[0.07] shadow-lg">
              <div className={cn("w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0", accent)}>
                <Icon size={22} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/25">{label}</p>
                <p className="text-lg font-black tracking-tight truncate mt-0.5">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full max-w-md">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/25" size={18} />
          <input
            type="text"
            placeholder={t('vault.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-full pl-13 pr-6 py-4 text-sm font-medium focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-white/20 shadow-inner"
            style={{ paddingLeft: '3.25rem' }}
          />
        </div>

        {/* Locked note cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence mode="popLayout">
            {filteredNotes.length > 0 ? (
              filteredNotes.map((note) => (
                <motion.article
                  key={note.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="group relative p-6 bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/[0.07] rounded-[1.75rem] hover:border-emerald-500/30 hover:shadow-[0_16px_40px_rgba(16,185,129,0.12)] transition-all flex flex-col overflow-hidden"
                >
                  <div className="flex items-start gap-4 mb-5">
                    <div className="w-14 h-14 bg-white/[0.06] rounded-2xl flex items-center justify-center text-3xl shrink-0 border border-white/[0.07] group-hover:scale-105 transition-transform">
                      {note.emoji || '📄'}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <h3 className="text-base font-black tracking-tight truncate group-hover:text-emerald-300 transition-colors">{note.title || 'Untitled'}</h3>
                      <p className="text-[11px] font-medium text-white/25 mt-1">
                        {t('vault.lastUpdated', { date: new Date(note.updatedAt).toLocaleDateString() })}
                      </p>
                    </div>
                    <span className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0" title={t('vault.pinProtected')}>
                      <Lock size={13} className="text-emerald-400" />
                    </span>
                  </div>

                  <p className="text-[13px] text-white/40 leading-relaxed line-clamp-3 mb-5 flex-1">
                    {note.content ? note.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) + '...' : '...'}
                  </p>

                  <div className="flex items-center gap-1.5 flex-wrap mb-5">
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black uppercase tracking-wider text-emerald-300">
                      <ShieldCheck size={10} /> {t('vault.encryptedBadge')}
                    </span>
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[9px] font-black uppercase tracking-wider text-amber-300">
                      <Fingerprint size={10} /> {t('vault.pinProtected')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => navigate(`/editor/${note.id}`)}
                      className="flex-1 py-3.5 bg-gradient-to-b from-emerald-400 to-emerald-600 hover:from-emerald-300 hover:to-emerald-500 text-emerald-950 rounded-xl text-[11px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(16,185,129,0.3)] active:scale-[0.98]"
                    >
                      {t('vault.openFromVault')} <ArrowRight size={15} />
                    </button>
                    <button
                      onClick={() => handleUnlockNote(note.id)}
                      className="py-3.5 px-4 bg-white/[0.04] hover:bg-red-500/10 text-white/40 hover:text-red-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/[0.08] hover:border-red-500/25 flex items-center gap-1.5 active:scale-[0.98]"
                    >
                      <Unlock size={14} /> {t('vault.unlockNote')}
                    </button>
                  </div>
                </motion.article>
              ))
            ) : (
              <div className="col-span-full py-24 flex flex-col items-center text-center space-y-6">
                <div className="w-24 h-24 bg-white/[0.04] rounded-[2rem] flex items-center justify-center border border-white/[0.07]">
                  <ShieldAlert size={40} className="text-white/20" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black uppercase tracking-[0.2em] text-white/60">{t('vault.emptyTitle')}</h3>
                  <p className="text-xs font-medium text-white/25 max-w-sm leading-relaxed">
                    {searchTerm ? t('vault.noResults') : t('vault.emptyDesc')}
                  </p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className="px-6 py-10 border-t border-white/5 flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/[0.07] rounded-full border border-emerald-500/20">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-200/60">{t('vault.footerNote')}</span>
        </div>
        <p className="text-[11px] text-white/20">{t('vault.encryptionNote')}</p>
      </footer>
    </div>
  );
}
