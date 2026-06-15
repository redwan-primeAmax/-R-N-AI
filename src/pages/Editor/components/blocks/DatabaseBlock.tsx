import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Table as TableIcon, 
  Kanban, 
  Image as ImageIcon, 
  List as ListIcon, 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  Trash2, 
  Check, 
  ChevronDown, 
  Settings, 
  Database,
  Type,
  Hash,
  CalendarCheck2,
  ListFilter,
  CheckCircle2,
  Circle,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../../utils/cn';

interface DatabaseCellInputProps {
  initialValue: any;
  type: string;
  isReadOnly?: boolean;
  onUpdate: (val: any) => void;
  className?: string;
  placeholder?: string;
}

const DatabaseCellInput: React.FC<DatabaseCellInputProps> = ({ 
  initialValue, 
  type, 
  isReadOnly, 
  onUpdate,
  className,
  placeholder
}) => {
  const [val, setVal] = useState(initialValue || '');

  // Keep state synchronized if it changes externally
  useEffect(() => {
    setVal(initialValue || '');
  }, [initialValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVal(e.target.value);
  };

  const handleBlur = () => {
    if (val !== initialValue) {
      onUpdate(val);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <input
      disabled={isReadOnly}
      type={type}
      value={val}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={className}
      placeholder={placeholder}
    />
  );
};

interface DatabaseBlockProps {
  block: any;
  setBlocks: any;
  isReadOnly?: boolean;
}

export const DatabaseBlock: React.FC<DatabaseBlockProps> = ({ block, setBlocks, isReadOnly }) => {
  // Ensure default data is initialized
  const dbData = useMemo(() => {
    if (block.databaseData && block.databaseData.columns && block.databaseData.rows) {
      return block.databaseData;
    }
    return {
      layout: 'table',
      columns: [
        { id: 'title', name: 'Name', type: 'text' },
        { id: 'status', name: 'Status', type: 'select', options: ['To Do', 'In Progress', 'Done'] },
        { id: 'priority', name: 'Priority', type: 'select', options: ['Low', 'Medium', 'High'] },
        { id: 'date', name: 'Date', type: 'date' }
      ],
      rows: [
        { id: 'row-1', title: '🚀 Launch beta version', status: 'In Progress', priority: 'High', date: '2026-06-06' },
        { id: 'row-2', title: '🎨 Refactor block editor styles', status: 'To Do', priority: 'Medium', date: '2026-06-08' },
        { id: 'row-3', title: '📦 Package core database layouts', status: 'Done', priority: 'High', date: '2026-06-06' }
      ]
    };
  }, [block.databaseData]);

  const [activeLayout, setActiveLayout] = useState<'table' | 'board' | 'gallery' | 'list' | 'calendar' | 'timeline'>(block.databaseData?.layout || 'table');
  
  // Sync layout from external changes (collab)
  useEffect(() => {
    if (block.databaseData?.layout && block.databaseData.layout !== activeLayout) {
      setActiveLayout(block.databaseData.layout);
    }
  }, [block.databaseData?.layout]);

  const [showConfigCol, setShowConfigCol] = useState<string | null>(null);
  const [colNameInput, setColNameInput] = useState('');
  const [colTypeInput, setColTypeInput] = useState<'text' | 'number' | 'select' | 'date'>('text');
  const [colOptionsInput, setColOptionsInput] = useState('');

  // Save changes locally and inside parent blocks
  const updateDbData = (newData: any) => {
    setBlocks((prev: any[]) => prev.map(b => b.id === block.id ? {
      ...b,
      databaseData: { ...newData, layout: activeLayout }
    } : b));
  };

  const handleLayoutChange = (layout: 'table' | 'board' | 'gallery' | 'list' | 'calendar' | 'timeline') => {
    setActiveLayout(layout);
    setBlocks((prev: any[]) => prev.map(b => b.id === block.id ? {
      ...b,
      databaseData: { ...dbData, layout }
    } : b));
  };

  // Row operations
  const addRow = () => {
    if (isReadOnly) return;
    const newId = `row-${Date.now()}`;
    const newRow: Record<string, any> = { id: newId };
    dbData.columns.forEach((col: any) => {
      if (col.id === 'title') {
        newRow[col.id] = 'New Item';
      } else if (col.type === 'select' && col.options?.length > 0) {
        newRow[col.id] = col.options[0];
      } else {
        newRow[col.id] = '';
      }
    });

    const newData = {
      ...dbData,
      rows: [...dbData.rows, newRow]
    };
    updateDbData(newData);
  };

  const deleteRow = (rowId: string) => {
    if (isReadOnly) return;
    const newData = {
      ...dbData,
      rows: dbData.rows.filter((r: any) => r.id !== rowId)
    };
    updateDbData(newData);
  };

  const updateCellValue = (rowId: string, colId: string, val: any) => {
    if (isReadOnly) return;
    const newData = {
      ...dbData,
      rows: dbData.rows.map((r: any) => r.id === rowId ? { ...r, [colId]: val } : r)
    };
    updateDbData(newData);
  };

  // Column operations
  const addColumn = () => {
    if (isReadOnly) return;
    const colId = `col-${Date.now()}`;
    const newCol = {
      id: colId,
      name: 'New Custom Property',
      type: 'text' as const
    };
    const newData = {
      ...dbData,
      columns: [...dbData.columns, newCol],
      rows: dbData.rows.map((r: any) => ({ ...r, [colId]: '' }))
    };
    updateDbData(newData);
    setShowConfigCol(colId);
    setColNameInput('New Custom Property');
    setColTypeInput('text');
    setColOptionsInput('');
  };

  const deleteColumn = (colId: string) => {
    if (isReadOnly || colId === 'title') return;
    const newData = {
      ...dbData,
      columns: dbData.columns.filter((c: any) => c.id !== colId),
      rows: dbData.rows.map((r: any) => {
        const copy = { ...r };
        delete copy[colId];
        return copy;
      })
    };
    updateDbData(newData);
    setShowConfigCol(null);
  };

  const handleSaveColConfig = (colId: string) => {
    if (isReadOnly) return;
    const updatedCols = dbData.columns.map((col: any) => {
      if (col.id === colId) {
        return {
          ...col,
          name: colNameInput,
          type: colTypeInput,
          options: colTypeInput === 'select' ? colOptionsInput.split(',').map(o => o.trim()).filter(Boolean) : undefined
        };
      }
      return col;
    });

    const newData = {
      ...dbData,
      columns: updatedCols
    };
    updateDbData(newData);
    setShowConfigCol(null);
  };

  // Kanban view helper
  const groupedTasksByStatus = useMemo(() => {
    const statusCol = dbData.columns.find((c: any) => c.id === 'status' || c.type === 'select');
    const statuses = statusCol?.options || ['To Do', 'In Progress', 'Done'];
    const groups: Record<string, any[]> = {};
    
    statuses.forEach((st: string) => {
      groups[st] = [];
    });

    dbData.rows.forEach((row: any) => {
      const val = row[statusCol?.id || 'status'] || statuses[0];
      if (groups[val]) {
        groups[val].push(row);
      } else {
        if (!groups[statuses[0]]) groups[statuses[0]] = [];
        groups[statuses[0]].push(row);
      }
    });

    return { groups, statuses, statusColId: statusCol?.id || 'status' };
  }, [dbData]);

  // Calendar rendering helper
  const calendarDays = useMemo(() => {
    const today = new Date();
    const d = new Date(today.getFullYear(), today.getMonth(), 1); 
    const days = [];
    const year = d.getFullYear();
    const month = d.getMonth();
    
    // Pad starts
    const startOffset = d.getDay(); 
    for(let i = 0; i < startOffset; i++) {
      days.push({ day: null, dateStr: null });
    }
    
    // Days in month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for(let i = 1; i <= daysInMonth; i++) {
      const currentLabel = `${year}-${(month + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
      const items = dbData.rows.filter((r: any) => r.date === currentLabel);
      days.push({ day: i, dateStr: currentLabel, items });
    }
    return days;
  }, [dbData]);

  return (
    <div className="w-full bg-[#141414] border border-white/5 rounded-3xl p-5 my-4 shadow-xl select-none relative">
      {/* DB Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400">
            <Database size={18} />
          </div>
          <div>
            <h4 className="text-sm font-black text-white italic tracking-tight">Direct Database Space</h4>
            <p className="text-[9px] uppercase font-bold tracking-widest text-white/30">Notion Relational views</p>
          </div>
        </div>

        {/* View Switches */}
        <div className="flex flex-wrap gap-1 bg-white/5 p-1 rounded-2xl border border-white/5">
          {[
            { id: 'table', icon: <TableIcon size={14} />, label: 'Table' },
            { id: 'board', icon: <Kanban size={14} />, label: 'Board' },
            { id: 'gallery', icon: <ImageIcon size={14} />, label: 'Gallery' },
            { id: 'list', icon: <ListIcon size={14} />, label: 'List' },
            { id: 'calendar', icon: <CalendarIcon size={14} />, label: 'Calendar' },
            { id: 'timeline', icon: <Clock size={14} />, label: 'Timeline' }
          ].map(lay => (
            <button
              key={lay.id}
              onClick={() => handleLayoutChange(lay.id as any)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all",
                activeLayout === lay.id 
                  ? "bg-purple-600/20 text-purple-400 border border-purple-500/20 shadow-md shadow-purple-500/5" 
                  : "text-white/40 hover:text-white border border-transparent"
              )}
            >
              {lay.icon} <span className="hidden leading-none md:inline">{lay.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Database Views Renderer */}
      <div className="w-full overflow-x-auto select-text scrollbar-thin scrollbar-thumb-white/5">
        
        {/* TABLE VIEW */}
        {activeLayout === 'table' && (
          <div className="w-full min-w-[700px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="w-10 py-3 text-center opacity-30">#</th>
                  {dbData.columns.map((col: any) => (
                    <th key={col.id} className="p-3 font-black text-white/40 uppercase tracking-wider relative group">
                      <div className="flex items-center gap-2">
                        {col.type === 'text' && <Type size={12} className="text-blue-500" />}
                        {col.type === 'select' && <ListFilter size={12} className="text-purple-500" />}
                        {col.type === 'date' && <CalendarCheck2 size={12} className="text-orange-500" />}
                        {col.type === 'number' && <Hash size={12} className="text-green-500" />}
                        <span>{col.name}</span>
                        {col.id !== 'title' && !isReadOnly && (
                          <button 
                            onClick={() => {
                              setShowConfigCol(col.id);
                              setColNameInput(col.name);
                              setColTypeInput(col.type);
                              setColOptionsInput(col.options?.join(', ') || '');
                            }}
                            className="hidden group-hover:inline-flex p-1 hover:bg-white/10 rounded"
                          >
                            <Settings size={10} className="text-white/60" />
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                  {!isReadOnly && <th className="w-14 text-center opacity-30">Options</th>}
                </tr>
              </thead>
              <tbody>
                {dbData.rows.map((row: any, idx: number) => (
                  <tr key={row.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-all">
                    <td className="py-3 text-center text-white/20 font-mono text-[11px]">{idx + 1}</td>
                    {dbData.columns.map((col: any) => (
                      <td key={col.id} className="p-1">
                        {col.type === 'select' ? (
                          <select
                            disabled={isReadOnly}
                            value={row[col.id] || ''}
                            onChange={(e) => updateCellValue(row.id, col.id, e.target.value)}
                            className="w-full bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl px-2.5 py-1.5 focus:border-purple-500 font-bold text-white max-w-[150px] outline-none"
                          >
                            <option value="" className="bg-[#1c1c1e] text-white">None</option>
                            {(col.options || []).map((opt: string) => (
                              <option key={opt} value={opt} className="bg-[#1c1c1e] text-white">{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <DatabaseCellInput
                            isReadOnly={isReadOnly}
                            type={col.type === 'date' ? 'date' : col.type === 'number' ? 'number' : 'text'}
                            initialValue={row[col.id] || ''}
                            onUpdate={(newValue) => updateCellValue(row.id, col.id, newValue)}
                            className={cn(
                              "w-full bg-transparent hover:bg-white/5 focus:bg-white/5 outline-none px-2.5 py-2 rounded-xl text-white transition-all border border-transparent focus:border-white/15",
                              col.id === 'title' ? "font-bold text-sm text-purple-400 focus:text-purple-300" : "font-semibold text-xs text-white/80"
                            )}
                          />
                        )}
                      </td>
                    ))}
                    {!isReadOnly && (
                      <td className="p-1 text-center">
                        <button 
                          onClick={() => deleteRow(row.id)}
                          className="p-2 hover:bg-red-500/10 hover:text-red-400 rounded-xl text-white/30 transition-all active:scale-90"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Table Footer controls */}
            {!isReadOnly && (
              <div className="flex gap-2 mt-4">
                <button
                  onClick={addRow}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-xs font-black uppercase text-white/50 hover:text-white transition-all active:scale-95"
                >
                  <Plus size={14} /> Add Row
                </button>
                <button
                  onClick={addColumn}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-xs font-black uppercase text-white/50 hover:text-white transition-all active:scale-95"
                >
                  <Plus size={14} /> Add Property
                </button>
              </div>
            )}
          </div>
        )}

        {/* KANBAN BOARD VIEW */}
        {activeLayout === 'board' && (
          <div className="w-full flex gap-4 min-h-[300px]">
            {groupedTasksByStatus.statuses.map((stat: string) => (
              <div key={stat} className="flex-1 min-w-[200px] max-w-[300px] bg-white/[0.01] border border-white/5 rounded-2xl p-3 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
                    <span className="font-black text-xs text-white/80 uppercase tracking-wider">{stat}</span>
                  </div>
                  <span className="text-[10px] font-bold text-white/30 bg-white/5 px-2 py-0.5 rounded-full">
                    {groupedTasksByStatus.groups[stat]?.length || 0}
                  </span>
                </div>

                <div className="flex flex-col gap-2.5 flex-1 select-none">
                  {groupedTasksByStatus.groups[stat]?.map((row: any) => (
                    <div 
                      key={row.id}
                      className="p-3 bg-white/5 border border-white/5 hover:border-white/15 rounded-xl flex flex-col gap-2 cursor-pointer transition-all hover:bg-white/[0.07] shadow-sm text-left group"
                    >
                      <div className="text-xs font-black text-white">{row.title || 'Untitled task'}</div>
                      {/* Show other select properties as mini tags */}
                      <div className="flex flex-wrap gap-1.5">
                        {dbData.columns.filter((c: any) => c.id !== 'title' && c.id !== 'status' && row[c.id]).map((c: any) => (
                          <span key={c.id} className="text-[9px] font-bold bg-white/5 border border-white/5 px-2 py-0.5 rounded text-white/50 uppercase tracking-widest max-w-[120px] truncate">
                            {row[c.id]}
                          </span>
                        ))}
                      </div>

                      {/* Board view task operations */}
                      <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <select
                          disabled={isReadOnly}
                          value={row[groupedTasksByStatus.statusColId]}
                          onChange={(e) => updateCellValue(row.id, groupedTasksByStatus.statusColId, e.target.value)}
                          className="bg-[#161616] border border-white/10 rounded px-1.5 py-0.5 text-[9px] font-black text-purple-400 uppercase outline-none shrink"
                        >
                          {groupedTasksByStatus.statuses.map((st: string) => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                        <button 
                          onClick={() => deleteRow(row.id)}
                          className="p-1.5 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded transition-all shrink"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {groupedTasksByStatus.groups[stat]?.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-white/10 font-bold text-[10px] border border-dashed border-white/5 rounded-xl uppercase tracking-widest">
                      Empty column
                    </div>
                  )}
                </div>

                {!isReadOnly && (
                  <button 
                    onClick={() => {
                      const newId = `row-${Date.now()}`;
                      const newRow = { id: newId, title: 'New task', [groupedTasksByStatus.statusColId]: stat };
                      dbData.columns.forEach((c: any) => {
                        if (c.id !== 'title' && c.id !== groupedTasksByStatus.statusColId) newRow[c.id] = '';
                      });
                      updateDbData({
                        ...dbData,
                        rows: [...dbData.rows, newRow]
                      });
                    }}
                    className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase text-white/40 tracking-wider flex items-center justify-center gap-1 transition-all active:scale-95"
                  >
                    <Plus size={11} /> Add card
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* BENTO GALLERY VIEW */}
        {activeLayout === 'gallery' && (
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {dbData.rows.map((row: any) => (
              <div 
                key={row.id}
                className="p-5 bg-gradient-to-br from-white/5 to-white/[0.01] hover:from-white/[0.08] hover:to-white/[0.03] border border-white/5 hover:border-purple-500/20 rounded-2xl flex flex-col gap-4 text-left transition-all hover:shadow-2xl hover:shadow-purple-500/5 group relative"
              >
                <div className="flex justify-between items-start">
                  <div className="text-sm font-black text-white">{row.title || 'Untitled task'}</div>
                  {!isReadOnly && (
                    <button 
                      onClick={() => deleteRow(row.id)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-white/30 hover:text-red-400 hover:bg-red-500/15 rounded-xl transition-all self-start shrink"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
                
                {/* Properties fields */}
                <div className="space-y-1.5 border-t border-white/5 pt-3">
                  {dbData.columns.filter((col: any) => col.id !== 'title').map((col: any) => (
                    <div key={col.id} className="flex justify-between items-center text-[10px] font-bold">
                      <span className="text-white/30 uppercase tracking-widest">{col.name}</span>
                      <span className="text-white/70 max-w-[150px] truncate font-semibold">
                        {row[col.id] || <span className="opacity-25 italic">empty</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {!isReadOnly && (
              <button
                onClick={addRow}
                className="p-6 bg-white/[0.01] hover:bg-white/5 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 text-center text-white/30 hover:text-white transition-all duration-300 pointer-events-auto h-36"
              >
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                  <Plus size={16} />
                </div>
                <div className="text-xs font-black uppercase tracking-widest">New Gallery Block</div>
              </button>
            )}
          </div>
        )}

        {/* MINIMAL LIST VIEW */}
        {activeLayout === 'list' && (
          <div className="w-full flex flex-col bg-white/[0.01] border border-white/5 rounded-2xl divide-y divide-white/5 overflow-hidden">
            {dbData.rows.map((row: any) => (
              <div 
                key={row.id}
                className="flex flex-wrap items-center justify-between p-4 bg-transparent hover:bg-white/[0.02] transition-colors group text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                  <div className="text-xs font-black text-white truncate max-w-sm">{row.title || 'Untitled task'}</div>
                </div>

                <div className="flex items-center gap-4 shrink-0 font-bold text-[10px]">
                  {dbData.columns.filter((c: any) => c.id !== 'title' && row[c.id]).slice(0, 3).map((col: any) => (
                    <span key={col.id} className="text-white/40 border border-white/5 bg-white/5 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                      {row[col.id]}
                    </span>
                  ))}
                  {!isReadOnly && (
                    <button 
                      onClick={() => deleteRow(row.id)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all ml-2"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {!isReadOnly && (
              <button 
                onClick={addRow}
                className="p-3 w-full border-t border-dashed border-white/10 text-center text-[10px] font-black uppercase tracking-wider text-white/30 hover:text-white hover:bg-white/5 transition-all"
              >
                + Add item to index feed
              </button>
            )}
          </div>
        )}

        {/* CALENDAR VIEW */}
        {activeLayout === 'calendar' && (
          <div className="w-full min-w-[600px]">
            {/* Header with week days */}
            <div className="grid grid-cols-7 text-center text-[10px] font-black uppercase tracking-widest text-white/30 border-b border-white/5 pb-2 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((wd) => (
                <div key={wd}>{wd}</div>
              ))}
            </div>

            {/* June 2026 Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((cal, index) => (
                <div 
                  key={index}
                  onClick={() => {
                    if (isReadOnly || !cal.dateStr) return;
                    const newId = `row-${Date.now()}`;
                    const newRow = { id: newId, title: 'Calendar task', date: cal.dateStr };
                    dbData.columns.forEach((c: any) => {
                      if (c.id !== 'title' && c.id !== 'date') {
                        newRow[c.id] = c.type === 'select' && c.options?.length > 0 ? c.options[0] : '';
                      }
                    });
                    updateDbData({
                      ...dbData,
                      rows: [...dbData.rows, newRow]
                    });
                  }}
                  className={cn(
                    "min-h-16 border rounded-xl p-1 flex flex-col gap-1 transition-all select-none relative h-20 overflow-y-auto",
                    cal.day 
                      ? "border-white/5 bg-white/[0.01] hover:bg-purple-600/5 cursor-pointer hover:border-purple-500/10" 
                      : "border-transparent bg-transparent"
                  )}
                >
                  <span className="text-[10px] font-black tracking-tighter opacity-30 self-end mr-1">{cal.day}</span>
                  <div className="flex flex-col gap-0.5">
                    {cal.items?.map((item: any) => (
                      <div 
                        key={item.id}
                        onClick={(e) => {
                          e.stopPropagation(); // Avoid triggering parent add row
                        }}
                        className="p-1 bg-purple-600/10 border border-purple-500/10 text-[8px] font-black rounded text-purple-400 group truncate flex justify-between items-center"
                      >
                        <span className="truncate">{item.title}</span>
                        {!isReadOnly && (
                          <button 
                            onClick={() => deleteRow(item.id)}
                            className="hidden group-hover:inline-block p-0.5 ml-1 text-purple-300 hover:text-red-400"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CHRONOLOGICAL TIMELINE VIEW */}
        {activeLayout === 'timeline' && (
          <div className="w-full min-w-[700px] flex flex-col gap-4 border border-white/5 rounded-2xl p-4 bg-white/[0.01]">
            {/* Timeline header scheduler */}
            <div className="flex border-b border-white/5 pb-2">
              <div className="w-1/3 text-left text-[10px] font-black uppercase text-white/30 tracking-widest pl-2">Projects / Milestones</div>
              <div className="w-2/3 grid grid-cols-7 text-center text-[10px] font-black uppercase text-white/30 tracking-wider">
                {['Weeks 1', 'Weeks 2', 'Weeks 3', 'Weeks 4', 'Weeks 5', 'Weeks 6', 'Weeks 7'].map(wk => (
                  <div key={wk}>{wk}</div>
                ))}
              </div>
            </div>

            {/* Timeline rows list */}
            <div className="flex flex-col gap-3">
              {dbData.rows.map((row: any) => {
                // Approximate progression calculations based on Date length/hash to mock Gantt duration visuals dynamically nicely
                const stepHash = (row.title || '').length % 5;
                const offsetHash = (row.id || '').length % 4;
                const barWidth = 30 + stepHash * 15;
                const barOffset = 10 + offsetHash * 10;

                return (
                  <div key={row.id} className="flex items-center min-h-[40px] group text-left">
                    <div className="w-1/3 flex flex-col pr-4 pl-2 min-w-0">
                      <div className="text-xs font-black text-white truncate">{row.title || 'Untitled task'}</div>
                      <div className="text-[10px] text-white/30 font-bold">{row.date || 'No scheduling limit'}</div>
                    </div>
                    <div className="w-2/3 h-6 bg-white/[0.02] rounded-lg relative overflow-hidden flex items-center">
                      <div 
                        className="h-4 rounded-md bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center px-2 text-[8px] font-black uppercase text-white/80 select-none shadow-sm transition-all"
                        style={{ 
                          marginLeft: `${barOffset}%`, 
                          width: `${barWidth}%`
                        }}
                      >
                        Duration
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* Property/Column Edit Modal Overlay */}
      <AnimatePresence>
        {showConfigCol && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center pointer-events-none px-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
              onClick={() => setShowConfigCol(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-[#1c1c1e] rounded-[28px] p-6 shadow-2xl border border-white/10 pointer-events-auto flex flex-col gap-6"
            >
              <div className="flex justify-between items-center bg-transparent border-b border-white/5 pb-3">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Property configuration</h3>
                <button 
                  onClick={() => deleteColumn(showConfigCol)}
                  className="px-3 py-1.5 bg-red-600/10 hover:bg-red-600 hover:text-white rounded-lg text-red-500 text-[10px] font-black uppercase tracking-wider transition-all"
                >
                  Delete
                </button>
              </div>

              {/* Edit field input */}
              <div className="space-y-4 text-left">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black text-white/30 uppercase tracking-widest pl-1">Label name</label>
                  <input
                    type="text"
                    value={colNameInput}
                    onChange={(e) => setColNameInput(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 focus:border-purple-500 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black text-white/30 uppercase tracking-widest pl-1">Data Type</label>
                  <select
                    value={colTypeInput}
                    onChange={(e: any) => setColTypeInput(e.target.value)}
                    className="w-full bg-[#121212] border border-white/10 focus:border-purple-500 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none"
                  >
                    <option value="text">Rich Text</option>
                    <option value="number">Number</option>
                    <option value="select">Single Select Options</option>
                    <option value="date">Date</option>
                  </select>
                </div>

                {colTypeInput === 'select' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black text-white/30 uppercase tracking-widest pl-1">Options list (Comma separated)</label>
                    <input
                      type="text"
                      placeholder="High, Medium, Low"
                      value={colOptionsInput}
                      onChange={(e) => setColOptionsInput(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 focus:border-purple-500 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Actions footer options */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfigCol(null)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white font-bold text-[11px] uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveColConfig(showConfigCol)}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all shadow-lg shadow-purple-500/10"
                >
                  Apply Property
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
