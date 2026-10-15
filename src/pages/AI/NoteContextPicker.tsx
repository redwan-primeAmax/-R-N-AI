import { useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { Check } from 'lucide-react';
import { Modal } from '../../components/modals/Modal';
import type { Note } from '../../types';
import { cn } from '../../utils/cn';

/** Only mounted when requested; reuse the app's focus trap and virtualize large workspaces. */
export default function NoteContextPicker({ notes, selectedNotes, onToggle, onClose }: {
  notes: Note[];
  selectedNotes: Note[];
  onToggle: (note: Note) => void;
  onClose: () => void;
}) {
  const selected = useMemo(() => new Set(selectedNotes.map(n => n.id)), [selectedNotes]);
  return (
    <Modal isOpen onClose={onClose} title="নোট সিলেক্ট করুন" id="ai-note-context">
      {notes.length === 0 ? <p className="text-center py-8 text-[#9B9990] text-sm">কোনো নোট পাওয়া যায়নি।</p> : (
        <Virtuoso style={{ height: 'min(45dvh, 360px)' }} data={notes} increaseViewportBy={100}
          computeItemKey={(_, note) => note.id}
          itemContent={(_, note) => (
            <div className="pb-2"><button onClick={() => onToggle(note)} aria-pressed={selected.has(note.id)} className={cn(
              'w-full flex items-center gap-3 p-3.5 rounded-2xl transition-colors border text-left',
              selected.has(note.id) ? 'bg-[#D97757]/10 border-[#D97757]/50 text-[#D97757]' : 'bg-[#2B2A27] border-transparent text-[#ECEBE6]/80 hover:border-[#363430]'
            )}>
              <span className="text-lg shrink-0">{note.emoji || '📝'}</span>
              <span className="flex-1 min-w-0 font-bold text-sm truncate">{note.title || 'শিরোনামহীন'}</span>
              {selected.has(note.id) && <Check size={18} strokeWidth={3} />}
            </button></div>
          )}
        />
      )}
      <button onClick={onClose} className="mt-4 w-full py-3 bg-[#D97757] text-black rounded-xl font-bold">Done ({selected.size})</button>
    </Modal>
  );
}
