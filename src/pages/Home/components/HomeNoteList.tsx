import { forwardRef, useCallback, useMemo, type HTMLAttributes } from 'react';
import { Virtuoso, VirtuosoGrid } from 'react-virtuoso';
import type { Note } from '../../../services/storage/DataManager';
import { NoteCard } from './NoteCard';

const GridList = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ style, children, ...props }, ref) => (
  <div {...props} ref={ref} style={style} className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">{children}</div>
));
const gridComponents = { List: GridList };

/** Keep DOM size bounded even after scrolling through thousands of local notes. */
export default function HomeNoteList({ notes, mode, selectedIds, isSelectionMode, onClick, onMoreClick, onLoadMore }: {
  notes: Note[];
  mode: 'grid' | 'layer';
  selectedIds: string[];
  isSelectionMode: boolean;
  onClick: (id: string) => void;
  onMoreClick: (note: Note) => void;
  onLoadMore: () => void;
}) {
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const render = useCallback((_index: number, note: Note) => (
    <NoteCard note={note} mode={mode} isSelectionMode={isSelectionMode} isSelected={selected.has(note.id)} onClick={onClick} onMoreClick={onMoreClick} />
  ), [mode, isSelectionMode, selected, onClick, onMoreClick]);
  const props = { data: notes, useWindowScroll: true, increaseViewportBy: 300, endReached: onLoadMore, itemContent: render, computeItemKey: (_index: number, note: Note) => note.id };
  return mode === 'grid' ? <VirtuosoGrid {...props} components={gridComponents} /> : <Virtuoso {...props} />;
}
