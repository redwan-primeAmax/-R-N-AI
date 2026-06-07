import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, X, Check, ArrowUpRight, AlertTriangle } from 'lucide-react';
import { extensionManager } from '../services/ExtensionManager';

export const ExtensionPermissionGuard = () => {
  const [requests, setRequests] = React.useState<any[]>([]);

  React.useEffect(() => {
    const unsub = extensionManager.onChange(() => {
      setRequests(extensionManager.getPendingChangeRequests());
    });
    return unsub;
  }, []);

  if (requests.length === 0) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[2000] w-full max-w-md px-6">
      <AnimatePresence>
        {requests.map((req) => (
          <motion.div
            key={req.id}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="mb-4 bg-[#121214] border border-orange-500/30 rounded-[32px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden relative group"
          >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl pointer-events-none" />
            
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20 shadow-inner">
                <ShieldCheck className="text-orange-500" size={24} />
              </div>
              <div className="flex-1">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500 mb-1">Overwrite Request</h4>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white/90">{req.extensionId}</span>
                  <span className="text-[10px] font-medium text-white/20">wants to update content</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl mb-6">
              <div className="flex items-center gap-2 mb-2 text-white/40">
                <AlertTriangle size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Reason</span>
              </div>
              <p className="text-sm text-white/80 leading-relaxed font-medium">
                {req.reason}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => extensionManager.resolveChangeRequest(req.id, false)}
                className="py-4 bg-white/[0.05] hover:bg-white/[0.1] rounded-2xl font-black text-[11px] uppercase tracking-widest text-white/40 border border-white/5 transition-all active:scale-95"
              >
                Reject
              </button>
              <button
                onClick={() => extensionManager.resolveChangeRequest(req.id, true)}
                className="py-4 bg-orange-500 hover:bg-orange-400 text-black rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-orange-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Check size={16} strokeWidth={3} />
                Apply Changes
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
