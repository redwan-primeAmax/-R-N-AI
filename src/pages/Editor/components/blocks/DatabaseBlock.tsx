/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL — NO LICENSE IS GRANTED.
 * This work is the exclusive property of Redwan. Copying, reproducing,
 * reusing, modifying, distributing, publishing, selling, sublicensing,
 * reverse-engineering, rebranding, removing this notice, or claiming
 * this work, in whole or in part, as anyone else's own is strictly
 * prohibited without Redwan's prior written permission.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { t as tr } from '../../../../utils/translator';
import { 
  Table as TableIcon, 
  Kanban, 
  Image as ImageIcon, 
  List as ListIcon, 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  Trash2, 
  ChevronDown, 
  Settings, 
  Database,
  Type,
  Hash,
  CalendarCheck2,
  ListFilter,
  Filter,
  ArrowUpDown,
  Calculator,
  Layers,
  X,
  Code
} from 'lucide-react';
import { m as motion, AnimatePresence } from 'framer-motion';
import type { EvalFunction } from 'mathjs';
import { cn } from '../../../../utils/cn';
import { DatabaseView, DatabaseFilter, DatabaseSort, RollupConfig } from '../../../../types/note';

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
  const dbData = useMemo(() => {
    if (block.databaseData && block.databaseData.columns && block.databaseData.rows) {
      return block.databaseData;
    }
    return {
      layout: 'table',
      views: [
        { id: 'view-default', name: tr('db.allEntries'), type: 'table', filters: [], sorts: [] }
      ],
      activeViewId: 'view-default',
      columns: [
        { id: 'title', name: 'Name', type: 'text' },
        { id: 'status', name: 'Status', type: 'select', options: ['To Do', 'In Progress', 'Done'] },
        { id: 'priority', name: 'Priority', type: 'select', options: ['Low', 'Medium', 'High'] },
        { id: 'amount', name: 'Amount', type: 'number' },
        { id: 'date', name: 'Date', type: 'date' }
      ],
      rows: [
        { id: 'row-1', title: '🚀 Launch beta version', status: 'In Progress', priority: 'High', amount: '500', date: '2026-06-06' },
        { id: 'row-2', title: '🎨 Refactor block editor styles', status: 'To Do', priority: 'Medium', amount: '250', date: '2026-06-08' },
        { id: 'row-3', title: '📦 Package core database layouts', status: 'Done', priority: 'High', amount: '1000', date: '2026-06-06' }
      ]
    };
  }, [block.databaseData]);

  const views: DatabaseView[] = useMemo(() => {
    return dbData.views || [
      { id: 'view-default', name: 'Default View', type: dbData.layout || 'table', filters: [], sorts: [] }
    ];
  }, [dbData.views, dbData.layout]);

  const [activeViewId, setActiveViewId] = useState<string>(dbData.activeViewId || views[0]?.id || 'view-default');
  const [activeLayout, setActiveLayout] = useState<'table' | 'board' | 'gallery' | 'list' | 'calendar' | 'timeline'>(
    views.find(v => v.id === activeViewId)?.type || dbData.layout || 'table'
  );

  const [showFilterBuilder, setShowFilterBuilder] = useState(false);
  const [showSortBuilder, setShowSortBuilder] = useState(false);
  const [showConfigCol, setShowConfigCol] = useState<string | null>(null);

  const [colNameInput, setColNameInput] = useState('');
  const [colTypeInput, setColTypeInput] = useState<'text' | 'number' | 'select' | 'date' | 'formula' | 'rollup'>('text');
  const [colOptionsInput, setColOptionsInput] = useState('');
  const [colFormulaInput, setColFormulaInput] = useState('');
  const [colRollupInput, setColRollupInput] = useState<RollupConfig>({
    relationColumn: 'status',
    targetProperty: 'amount',
    aggregate: 'sum'
  });

  const activeView = useMemo(() => {
    return views.find(v => v.id === activeViewId) || views[0];
  }, [views, activeViewId]);

  const updateDbData = (newData: any) => {
    setBlocks((prev: any[]) => prev.map(b => b.id === block.id ? {
      ...b,
      databaseData: { ...newData, layout: activeLayout, activeViewId }
    } : b));
  };

  // Filter and Sort transformations via useMemo
  const transformedRows = useMemo(() => {
    let rows = [...(dbData.rows || [])];

    // Apply Filters
    if (activeView?.filters && activeView.filters.length > 0) {
      rows = rows.filter(row => {
        return activeView.filters!.every(f => {
          const cellVal = (row[f.columnId] ?? '').toString().toLowerCase();
          const targetVal = (f.value || '').toLowerCase();

          switch (f.operator) {
            case '=':
              return cellVal === targetVal;
            case 'not-equal':
              return cellVal !== targetVal;
            case 'contains':
              return cellVal.includes(targetVal);
            case 'greater':
              return parseFloat(cellVal) > parseFloat(targetVal);
            case 'less':
              return parseFloat(cellVal) < parseFloat(targetVal);
            case 'empty':
              return !cellVal.trim();
            default:
              return true;
          }
        });
      });
    }

    // Apply Sorts
    if (activeView?.sorts && activeView.sorts.length > 0) {
      rows.sort((a, b) => {
        for (const s of activeView.sorts!) {
          const valA = a[s.columnId] ?? '';
          const valB = b[s.columnId] ?? '';
          if (valA === valB) continue;
          const cmp = valA > valB ? 1 : -1;
          return s.direction === 'asc' ? cmp : -cmp;
        }
        return 0;
      });
    }

    return rows;
  }, [dbData.rows, activeView?.filters, activeView?.sorts]);

  const [mathEngine, setMathEngine] = useState<{ compile: typeof import('mathjs').compile } | null>(null);
  const [mathFailed, setMathFailed] = useState(false);
  const hasFormulas = dbData.columns.some((column: any) => column.type === 'formula');
  useEffect(() => {
    if (!hasFormulas || mathEngine) return;
    let disposed = false;
    import('mathjs').then(({ compile }) => {
      if (!disposed) setMathEngine({ compile });
    }).catch(() => { if (!disposed) setMathFailed(true); });
    return () => { disposed = true; };
  }, [hasFormulas, mathEngine]);
  const formulas = useMemo(() => {
    const compiled = new Map<string, EvalFunction | null>();
    if (mathEngine) dbData.columns.forEach((column: any) => {
      if (column.type !== 'formula' || !column.formula || compiled.has(column.formula)) return;
      try { compiled.set(column.formula, mathEngine.compile(column.formula)); }
      catch { compiled.set(column.formula, null); }
    });
    return compiled;
  }, [mathEngine, dbData.columns]);

  // Compute Formula
  const computeFormulaCell = (expression: string, row: any) => {
    if (!expression) return '';
    if (!mathEngine) return mathFailed ? 'Error' : '…';
    try {
      const scope: Record<string, number> = {};
      dbData.columns.forEach((col: any) => {
        const num = parseFloat(row[col.id]);
        scope[col.id] = isNaN(num) ? 0 : num;
        if (col.name) scope[col.name] = isNaN(num) ? 0 : num;
      });
      const formula = formulas.get(expression);
      if (!formula) return 'Error';
      const res = formula.evaluate(scope);
      return typeof res === 'number' ? res.toFixed(2) : String(res);
    } catch {
      return 'Error';
    }
  };

  // Compute Rollup
  const computeRollupCell = (config: RollupConfig) => {
    if (!config) return 0;
    const { targetProperty, aggregate } = config;
    const nums = dbData.rows
      .map((r: any) => parseFloat(r[targetProperty]))
      .filter((n: number) => !isNaN(n));

    if (aggregate === 'count') return dbData.rows.length;
    if (nums.length === 0) return 0;
    if (aggregate === 'sum') return nums.reduce((a: number, b: number) => a + b, 0);
    if (aggregate === 'avg') return (nums.reduce((a: number, b: number) => a + b, 0) / nums.length).toFixed(2);
    if (aggregate === 'min') return Math.min(...nums);
    if (aggregate === 'max') return Math.max(...nums);
    return 0;
  };

  const handleLayoutChange = (layout: 'table' | 'board' | 'gallery' | 'list' | 'calendar' | 'timeline') => {
    setActiveLayout(layout);
    const updatedViews = views.map(v => v.id === activeViewId ? { ...v, type: layout } : v);
    updateDbData({ ...dbData, views: updatedViews, layout });
  };

  const addView = () => {
    if (isReadOnly) return;
    const newViewId = `view-${Date.now()}`;
    const newView: DatabaseView = {
      id: newViewId,
      name: `${tr('db.view')} ${views.length + 1}`,
      type: 'table',
      filters: [],
      sorts: []
    };
    const updatedViews = [...views, newView];
    setActiveViewId(newViewId);
    setActiveLayout('table');
    updateDbData({ ...dbData, views: updatedViews, activeViewId: newViewId });
  };

  const addFilter = () => {
    if (!activeView) return;
    const newFilter: DatabaseFilter = {
      columnId: dbData.columns[0]?.id || 'title',
      operator: 'contains',
      value: ''
    };
    const updatedFilters = [...(activeView.filters || []), newFilter];
    const updatedViews = views.map(v => v.id === activeViewId ? { ...v, filters: updatedFilters } : v);
    updateDbData({ ...dbData, views: updatedViews });
  };

  const removeFilter = (index: number) => {
    if (!activeView) return;
    const updatedFilters = (activeView.filters || []).filter((_, i) => i !== index);
    const updatedViews = views.map(v => v.id === activeViewId ? { ...v, filters: updatedFilters } : v);
    updateDbData({ ...dbData, views: updatedViews });
  };

  const addSort = () => {
    if (!activeView) return;
    const newSort: DatabaseSort = {
      columnId: dbData.columns[0]?.id || 'title',
      direction: 'asc'
    };
    const updatedSorts = [...(activeView.sorts || []), newSort];
    const updatedViews = views.map(v => v.id === activeViewId ? { ...v, sorts: updatedSorts } : v);
    updateDbData({ ...dbData, views: updatedViews });
  };

  const removeSort = (index: number) => {
    if (!activeView) return;
    const updatedSorts = (activeView.sorts || []).filter((_, i) => i !== index);
    const updatedViews = views.map(v => v.id === activeViewId ? { ...v, sorts: updatedSorts } : v);
    updateDbData({ ...dbData, views: updatedViews });
  };

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

    updateDbData({
      ...dbData,
      rows: [...dbData.rows, newRow]
    });
  };

  const deleteRow = (rowId: string) => {
    if (isReadOnly) return;
    updateDbData({
      ...dbData,
      rows: dbData.rows.filter((r: any) => r.id !== rowId)
    });
  };

  const updateCellValue = (rowId: string, colId: string, val: any) => {
    if (isReadOnly) return;
    updateDbData({
      ...dbData,
      rows: dbData.rows.map((r: any) => r.id === rowId ? { ...r, [colId]: val } : r)
    });
  };

  const addColumn = () => {
    if (isReadOnly) return;
    const colId = `col-${Date.now()}`;
    const newCol = {
      id: colId,
      name: 'New Custom Property',
      type: 'text' as const
    };
    updateDbData({
      ...dbData,
      columns: [...dbData.columns, newCol],
      rows: dbData.rows.map((r: any) => ({ ...r, [colId]: '' }))
    });
    setShowConfigCol(colId);
    setColNameInput('New Custom Property');
    setColTypeInput('text');
  };

  const deleteColumn = (colId: string) => {
    if (isReadOnly || colId === 'title') return;
    updateDbData({
      ...dbData,
      columns: dbData.columns.filter((c: any) => c.id !== colId),
      rows: dbData.rows.map((r: any) => {
        const copy = { ...r };
        delete copy[colId];
        return copy;
      })
    });
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
          options: colTypeInput === 'select' ? colOptionsInput.split(',').map(o => o.trim()).filter(Boolean) : undefined,
          formula: colTypeInput === 'formula' ? colFormulaInput : undefined,
          rollup: colTypeInput === 'rollup' ? colRollupInput : undefined
        };
      }
      return col;
    });

    updateDbData({ ...dbData, columns: updatedCols });
    setShowConfigCol(null);
  };

  return (
    <div className="w-full bg-[#141414] border border-white/5 rounded-3xl p-5 my-4 shadow-xl select-none relative">
      {/* Header View Tabs & Toolbar */}
      <div className="flex flex-col gap-3 border-b border-white/5 pb-4 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400">
              <Database size={16} />
            </div>
            <h4 className="text-sm font-bold text-white">Database Space</h4>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilterBuilder(!showFilterBuilder)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer",
                (activeView?.filters?.length || 0) > 0
                  ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                  : "bg-white/5 text-white/60 hover:text-white border-white/5"
              )}
            >
              <Filter size={13} />
              <span>{tr('db.filter')} ({activeView?.filters?.length || 0})</span>
            </button>

            <button
              onClick={() => setShowSortBuilder(!showSortBuilder)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer",
                (activeView?.sorts?.length || 0) > 0
                  ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                  : "bg-white/5 text-white/60 hover:text-white border-white/5"
              )}
            >
              <ArrowUpDown size={13} />
              <span>{tr('db.sort')} ({activeView?.sorts?.length || 0})</span>
            </button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {views.map(v => (
            <button
              key={v.id}
              onClick={() => {
                setActiveViewId(v.id);
                setActiveLayout(v.type || 'table');
              }}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                activeViewId === v.id
                  ? "bg-white/10 text-white border border-white/10"
                  : "text-white/40 hover:text-white"
              )}
            >
              {v.name}
            </button>
          ))}
          {!isReadOnly && (
            <button
              onClick={addView}
              className="p-1.5 hover:bg-white/10 text-white/40 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Add view"
            >
              <Plus size={14} />
            </button>
          )}
        </div>

        {/* Layout Selector */}
        <div className="flex flex-wrap gap-1 bg-white/5 p-1 rounded-2xl border border-white/5 self-start">
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
                "flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-xl transition-all cursor-pointer",
                activeLayout === lay.id 
                  ? "bg-purple-600/20 text-purple-400 border border-purple-500/20" 
                  : "text-white/40 hover:text-white"
              )}
            >
              {lay.icon} <span className="hidden md:inline">{lay.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filter Builder Drawer */}
      {showFilterBuilder && (
        <div className="mb-4 p-3 bg-white/5 rounded-2xl border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-white/70">
            <span>{tr('db.filterConditions')}</span>
            <button onClick={addFilter} className="text-blue-400 hover:underline flex items-center gap-1 cursor-pointer">
              <Plus size={12} /> {tr('db.addCondition')}
            </button>
          </div>
          {(activeView?.filters || []).map((f, idx) => (
            <div key={idx} className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={f.columnId}
                onChange={e => {
                  const updated = [...activeView.filters!];
                  updated[idx].columnId = e.target.value;
                  const updatedViews = views.map(v => v.id === activeViewId ? { ...v, filters: updated } : v);
                  updateDbData({ ...dbData, views: updatedViews });
                }}
                className="bg-[#1a1a1a] border border-white/10 text-white rounded-lg px-2 py-1 outline-none"
              >
                {dbData.columns.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select
                value={f.operator}
                onChange={e => {
                  const updated = [...activeView.filters!];
                  updated[idx].operator = e.target.value as any;
                  const updatedViews = views.map(v => v.id === activeViewId ? { ...v, filters: updated } : v);
                  updateDbData({ ...dbData, views: updatedViews });
                }}
                className="bg-[#1a1a1a] border border-white/10 text-white rounded-lg px-2 py-1 outline-none"
              >
                <option value="contains">{tr('db.contains')}</option>
                <option value="=" font-mono>{tr('db.equals')}</option>
                <option value="not-equal">{tr('db.notEqual')}</option>
                <option value="greater">{tr('db.greater')}</option>
                <option value="less">{tr('db.less')}</option>
                <option value="empty">{tr('db.empty')}</option>
              </select>

              {f.operator !== 'empty' && (
                <input
                  type="text"
                  value={f.value}
                  onChange={e => {
                    const updated = [...activeView.filters!];
                    updated[idx].value = e.target.value;
                    const updatedViews = views.map(v => v.id === activeViewId ? { ...v, filters: updated } : v);
                    updateDbData({ ...dbData, views: updatedViews });
                  }}
                  placeholder={tr('db.valuePlaceholder')}
                  className="bg-[#1a1a1a] border border-white/10 text-white rounded-lg px-2 py-1 outline-none text-xs"
                />
              )}

              <button onClick={() => removeFilter(idx)} className="text-red-400 hover:text-red-300 p-1 cursor-pointer">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Sort Builder Drawer */}
      {showSortBuilder && (
        <div className="mb-4 p-3 bg-white/5 rounded-2xl border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-white/70">
            <span>{tr('db.sortRules')}</span>
            <button onClick={addSort} className="text-purple-400 hover:underline flex items-center gap-1 cursor-pointer">
              <Plus size={12} /> {tr('db.addRule')}
            </button>
          </div>
          {(activeView?.sorts || []).map((s, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs">
              <select
                value={s.columnId}
                onChange={e => {
                  const updated = [...activeView.sorts!];
                  updated[idx].columnId = e.target.value;
                  const updatedViews = views.map(v => v.id === activeViewId ? { ...v, sorts: updated } : v);
                  updateDbData({ ...dbData, views: updatedViews });
                }}
                className="bg-[#1a1a1a] border border-white/10 text-white rounded-lg px-2 py-1 outline-none"
              >
                {dbData.columns.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select
                value={s.direction}
                onChange={e => {
                  const updated = [...activeView.sorts!];
                  updated[idx].direction = e.target.value as any;
                  const updatedViews = views.map(v => v.id === activeViewId ? { ...v, sorts: updated } : v);
                  updateDbData({ ...dbData, views: updatedViews });
                }}
                className="bg-[#1a1a1a] border border-white/10 text-white rounded-lg px-2 py-1 outline-none"
              >
                <option value="asc">{tr('db.asc')}</option>
                <option value="desc">{tr('db.desc')}</option>
              </select>

              <button onClick={() => removeSort(idx)} className="text-red-400 hover:text-red-300 p-1 cursor-pointer">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Views Content */}
      <div className="w-full overflow-x-auto select-text scrollbar-thin">
        {activeLayout === 'table' && (
          <div className="w-full min-w-[700px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="w-10 py-3 text-center opacity-30">#</th>
                  {dbData.columns.map((col: any, cIdx: number) => (
                    <th key={col.id || `col-${cIdx}`} className="p-3 font-bold text-white/40 uppercase tracking-wider relative group">
                      <div className="flex items-center gap-2">
                        {col.type === 'text' && <Type size={12} className="text-blue-500" />}
                        {col.type === 'select' && <ListFilter size={12} className="text-purple-500" />}
                        {col.type === 'date' && <CalendarCheck2 size={12} className="text-orange-500" />}
                        {col.type === 'number' && <Hash size={12} className="text-green-500" />}
                        {col.type === 'formula' && <Calculator size={12} className="text-amber-500" />}
                        {col.type === 'rollup' && <Layers size={12} className="text-pink-500" />}
                        <span>{col.name}</span>
                        {col.id !== 'title' && !isReadOnly && (
                          <button 
                            onClick={() => {
                              setShowConfigCol(col.id);
                              setColNameInput(col.name);
                              setColTypeInput(col.type);
                              setColOptionsInput(col.options?.join(', ') || '');
                              setColFormulaInput(col.formula || '');
                            }}
                            className="hidden group-hover:inline-flex p-1 hover:bg-white/10 rounded cursor-pointer"
                          >
                            <Settings size={10} className="text-white/60" />
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                  {!isReadOnly && <th className="w-14 text-center opacity-30">Action</th>}
                </tr>
              </thead>
              <tbody>
                {transformedRows.map((row: any, rIdx: number) => (
                  <tr key={row.id || `row-${rIdx}`} className="border-b border-white/5 hover:bg-white/[0.01] transition-all">
                    <td className="py-3 text-center text-white/20 font-mono text-[11px]">{rIdx + 1}</td>
                    {dbData.columns.map((col: any, cIdx: number) => (
                      <td key={col.id || `cell-${cIdx}`} className="p-1">
                        {col.type === 'formula' ? (
                          <div className="px-2.5 py-2 font-mono text-amber-400 font-bold text-xs bg-amber-500/5 rounded-xl border border-amber-500/10">
                            {computeFormulaCell(col.formula, row)}
                          </div>
                        ) : col.type === 'rollup' ? (
                          <div className="px-2.5 py-2 font-mono text-pink-400 font-bold text-xs bg-pink-500/5 rounded-xl border border-pink-500/10">
                            {computeRollupCell(col.rollup)}
                          </div>
                        ) : col.type === 'select' ? (
                          <select
                            disabled={isReadOnly}
                            value={row[col.id] || ''}
                            onChange={(e) => updateCellValue(row.id, col.id, e.target.value)}
                            className="w-full bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl px-2.5 py-1.5 font-bold text-white outline-none"
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
                              col.id === 'title' ? "font-bold text-sm text-purple-400" : "font-semibold text-xs text-white/80"
                            )}
                          />
                        )}
                      </td>
                    ))}
                    {!isReadOnly && (
                      <td className="p-1 text-center">
                        <button 
                          onClick={() => deleteRow(row.id)}
                          className="p-2 hover:bg-red-500/10 hover:text-red-400 rounded-xl text-white/30 transition-all cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {!isReadOnly && (
              <div className="flex gap-2 mt-4">
                <button
                  onClick={addRow}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-xs font-bold text-white/70 hover:text-white transition-all cursor-pointer"
                >
                  <Plus size={14} /> {tr('db.addRow')}
                </button>
                <button
                  onClick={addColumn}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-xs font-bold text-white/70 hover:text-white transition-all cursor-pointer"
                >
                  <Plus size={14} /> {tr('db.addProperty')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Board / List / Gallery Views fallback */}
        {activeLayout !== 'table' && (
          <div className="p-6 text-center text-white/40 text-xs">
            {tr('db.viewApplied')} ({transformedRows.length} {tr('db.rowsShown')})
          </div>
        )}
      </div>

      {/* Property Edit Modal */}
      <AnimatePresence>
        {showConfigCol && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[#1c1c1e] rounded-2xl p-5 shadow-2xl border border-white/10 space-y-4 text-white text-xs"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <h3 className="font-bold text-sm">{tr('db.propertySettings')}</h3>
                <button 
                  onClick={() => deleteColumn(showConfigCol)}
                  className="px-2.5 py-1 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white rounded-lg font-bold transition-colors cursor-pointer"
                >
                  {tr('db.delete')}
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-white/50 mb-1 font-semibold">{tr('db.labelName')}</label>
                  <input
                    type="text"
                    value={colNameInput}
                    onChange={(e) => setColNameInput(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-white/50 mb-1 font-semibold">{tr('db.type')}</label>
                  <select
                    value={colTypeInput}
                    onChange={(e: any) => setColTypeInput(e.target.value)}
                    className="w-full bg-[#121212] border border-white/10 rounded-xl px-3 py-2 text-white outline-none"
                  >
                    <option value="text">{tr('db.typeText')}</option>
                    <option value="number">{tr('db.typeNumber')}</option>
                    <option value="select">{tr('db.typeSelect')}</option>
                    <option value="date">{tr('db.typeDate')}</option>
                    <option value="formula">{tr('db.typeFormula')}</option>
                    <option value="rollup">{tr('db.typeRollup')}</option>
                    <option value="relation">{tr('db.typeRelation')}</option>
                  </select>
                </div>

                {colTypeInput === 'select' && (
                  <div>
                    <label className="block text-white/50 mb-1 font-semibold">{tr('db.optionsLabel')}</label>
                    <input
                      type="text"
                      placeholder="High, Medium, Low"
                      value={colOptionsInput}
                      onChange={(e) => setColOptionsInput(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none"
                    />
                  </div>
                )}

                {colTypeInput === 'formula' && (
                  <div>
                    <label className="block text-white/50 mb-1 font-semibold">{tr('db.formulaLabel')}</label>
                    <input
                      type="text"
                      placeholder="amount * 1.15"
                      value={colFormulaInput}
                      onChange={(e) => setColFormulaInput(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none font-mono text-amber-400"
                    />
                  </div>
                )}

                {colTypeInput === 'rollup' && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-white/50 mb-1 font-semibold">{tr('db.targetProperty')}</label>
                      <select
                        value={colRollupInput.targetProperty}
                        onChange={(e) => setColRollupInput({ ...colRollupInput, targetProperty: e.target.value })}
                        className="w-full bg-[#121212] border border-white/10 rounded-xl px-3 py-2 text-white outline-none"
                      >
                        {dbData.columns.map((c: any) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-white/50 mb-1 font-semibold">{tr('db.aggregation')}</label>
                      <select
                        value={colRollupInput.aggregate}
                        onChange={(e: any) => setColRollupInput({ ...colRollupInput, aggregate: e.target.value })}
                        className="w-full bg-[#121212] border border-white/10 rounded-xl px-3 py-2 text-white outline-none"
                      >
                        <option value="sum">{tr('db.sum')}</option>
                        <option value="count">{tr('db.count')}</option>
                        <option value="avg">{tr('db.avg')}</option>
                        <option value="min">{tr('db.min')}</option>
                        <option value="max">{tr('db.max')}</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowConfigCol(null)}
                  className="flex-1 py-2 bg-white/10 rounded-xl font-bold cursor-pointer"
                >
                  {tr('dialogs.cancel')}
                </button>
                <button
                  onClick={() => handleSaveColConfig(showConfigCol)}
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 font-bold rounded-xl cursor-pointer"
                >
                  {tr('dialogs.save')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
