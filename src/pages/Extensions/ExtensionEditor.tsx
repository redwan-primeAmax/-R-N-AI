
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import JSZip from 'jszip';
import { 
  Menu, Play, Shield, Save, FileCode, FolderPlus, FilePlus, 
  Trash2, ChevronRight, ChevronDown, Download, Upload, 
  Settings, Terminal, X, Monitor, Cpu
} from 'lucide-react';
import { extensionManager } from '../../services/ExtensionManager';
import { ExtensionValidator, ValidationResult } from '../../services/ExtensionValidator';
import { db } from '../../services/storage/DexieDB';
import { DataManager } from '../../services/storage/DataManager';
import { ValidationProgressModal } from './components/ValidationProgressModal';
import { ExtensionRunResultModal } from './components/ExtensionRunResultModal';

interface ExtensionFile {
  name: string;
  content: string;
  type: 'file' | 'folder';
  children?: ExtensionFile[];
}

interface ExtensionProject {
  id: string;
  name: string;
  workspaceId: string;
  files: ExtensionFile[];
  updatedAt: number;
}

const DEFAULT_FILES: ExtensionFile[] = [
  {
    name: 'manifest.json',
    content: JSON.stringify({
      id: 'ai-summarizer',
      name: 'AI Summarizer',
      version: '1.0.0',
      type: 'tool',
      description: 'Summarizes the current note using AI',
      author: 'Developer',
      permissions: ["ui", "editor", "ai", "sidebar"]
    }, null, 2),
    type: 'file'
  },
  {
    name: 'index.js',
    content: `
/**
 * AI Summarizer Extension
 * Uses internal AI API to summarize notes
 */
export function activate(api) {
  console.log('Summarizer activated');
  api.ui.notify('AI Summarizer এক্সটেনশন চালু হয়েছে', 'success');
  
  api.ui.registerSidebarItem({
    id: 'summarizer-btn',
    label: 'AI Summarizer',
    icon: '✨',
    onClick: async () => {
      const note = await api.editor.getCurrentNote();
      if (!note || !note.content) {
        api.ui.notify('সারাংশ করার জন্য কোন কন্টেন্ট পাওয়া যায়নি', 'error');
        return;
      }

      api.ui.notify('AI সারাংশ তৈরি করছে...');
      
      try {
        const response = await api.ai.chat([
          { role: 'system', content: 'You are a concise summarizer.' },
          { role: 'user', content: 'Summarize this note in 3 bullet points:\n' + note.content }
        ]);

        api.ui.showModal({
          title: 'AI সারাংশ',
          content: response || 'সারাংশ তৈরি করা সম্ভব হয়নি'
        });
      } catch (e) {
        api.ui.notify('AI রিকোয়েস্ট ব্যর্থ হয়েছে', 'error');
      }
    }
  });
}

export function deactivate(api) {
  console.log('Summarizer deactivated');
}
    `.trim(),
    type: 'file'
  }
];

export function ExtensionEditor() {
  const [project, setProject] = useState<ExtensionProject | null>(null);
  const [activeFile, setActiveFile] = useState<string>('index.js');
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [showRunResult, setShowRunResult] = useState(false);
  const [runSuccess, setRunSuccess] = useState(false);
  const [runMessage, setRunMessage] = useState('');
  const [workspaceId, setWorkspaceId] = useState<string>('');
  
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Load project
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    
    const load = async () => {
      const activeWS = await DataManager.getActiveWorkspaceId();
      setWorkspaceId(activeWS);
      (window as any)._activeWorkspaceId = activeWS;

      // Find project for this workspace
      const existing = await db.extension_projects.where('workspaceId').equals(activeWS).first();
      if (existing) {
        // Upgrade check: ensure sidebar permission exists for the default project
        if (existing.name === 'AI Summarizer Project') {
          const manifestFile = existing.files.find(f => f.name === 'manifest.json');
          if (manifestFile) {
            try {
              const manifest = JSON.parse(manifestFile.content);
              if (!manifest.permissions.includes('sidebar')) {
                manifest.permissions.push('sidebar');
                manifestFile.content = JSON.stringify(manifest, null, 2);
                await db.extension_projects.put(existing);
              }
            } catch (e) {}
          }
        }
        setProject(existing);
      } else {
        const newProject = {
          id: `dev_${activeWS}`,
          name: 'AI Summarizer Project',
          workspaceId: activeWS,
          files: DEFAULT_FILES,
          updatedAt: Date.now()
        };
        // Use put instead of add to avoid ConstraintError if key already exists
        await db.extension_projects.put(newProject);
        setProject(newProject);
      }
    };
    load();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getFileByPath = (files: ExtensionFile[], path: string): ExtensionFile | null => {
    const parts = path.split('/');
    let current: ExtensionFile[] = files;
    let found: ExtensionFile | null = null;
    
    for (const part of parts) {
      found = current.find(f => f.name === part) || null;
      if (!found) return null;
      if (found.type === 'folder') current = found.children || [];
    }
    return found;
  };

  const updateFileContent = (path: string, content: string) => {
    if (!project) return;
    
    const newFiles = [...project.files];
    const file = getFileByPath(newFiles, path);
    if (file) {
      file.content = content;
      setProject({ ...project, files: newFiles });
      saveProject({ ...project, files: newFiles });
    }
  };

  const saveProject = async (p: ExtensionProject) => {
    await db.extension_projects.put({ ...p, updatedAt: Date.now() });
  };

  const addFile = (parentId?: string, type: 'file' | 'folder' = 'file') => {
    if (!project) return;
    const name = prompt(`Enter ${type} name:`);
    if (!name) return;

    const newFiles = [...project.files];
    const newItem: ExtensionFile = {
      name,
      type,
      content: type === 'file' ? '' : '',
      children: type === 'folder' ? [] : undefined
    };

    if (!parentId) {
      newFiles.push(newItem);
    } else {
      const parent = getFileByPath(newFiles, parentId);
      if (parent && parent.type === 'folder') {
        parent.children = parent.children || [];
        parent.children.push(newItem);
      }
    }

    setProject({ ...project, files: newFiles });
    saveProject({ ...project, files: newFiles });
  };

  const deleteFile = (path: string) => {
    if (!project) return;
    if (path === 'manifest.json' || path === 'index.js') {
      alert('Cannot delete core files');
      return;
    }

    const newFiles = [...project.files];
    const parts = path.split('/');
    const fileName = parts.pop();
    const parentPath = parts.join('/');

    if (!parentPath) {
      setProject({ ...project, files: newFiles.filter(f => f.name !== fileName) });
      saveProject({ ...project, files: newFiles.filter(f => f.name !== fileName) });
    } else {
      const parent = getFileByPath(newFiles, parentPath);
      if (parent && parent.type === 'folder') {
        parent.children = parent.children?.filter(f => f.name !== fileName);
        setProject({ ...project, files: newFiles });
        saveProject({ ...project, files: newFiles });
      }
    }
    
    if (activeFile === path) setActiveFile('index.js');
  };

  const handleValidate = async () => {
    if (!project) return;
    setIsValidating(true);
    setShowValidation(true);
    
    const filesMap: Record<string, string> = {};
    const extract = (files: ExtensionFile[], path = '') => {
      files.forEach(f => {
        const fullPath = path ? `${path}/${f.name}` : f.name;
        if (f.type === 'file') filesMap[fullPath] = f.content;
        else if (f.children) extract(f.children, fullPath);
      });
    };
    extract(project.files);

    const manifestFile = filesMap['manifest.json'];
    let manifest = {};
    try {
      manifest = JSON.parse(manifestFile || '{}');
    } catch (e) {}

    setTimeout(() => {
      const result = ExtensionValidator.validate(filesMap, manifest);
      setValidationResult(result);
      setIsValidating(false);
    }, 1500);
  };

  const handleRun = async () => {
    if (!project) return;
    
    setRunMessage('প্যাকেজিং এবং রান করা হচ্ছে...');
    setShowRunResult(true);

    try {
      const zip = new JSZip();
      
      const addToZip = (files: ExtensionFile[], path = '') => {
        files.forEach(f => {
          const fullPath = path ? `${path}/${f.name}` : f.name;
          if (f.type === 'file') {
            zip.file(fullPath, f.content);
          } else if (f.children) {
            addToZip(f.children, fullPath);
          }
        });
      };
      
      addToZip(project.files);
      const content = await zip.generateAsync({ 
        type: 'blob',
        compression: 'STORE' // Faster for dev
      });
      
      const manifestFile = project.files.find(f => f.name === 'manifest.json');
      if (!manifestFile) throw new Error('manifest.json missing');
      
      const manifest = JSON.parse(manifestFile.content);
      
      // Unregister if already exists to clear cache
      await extensionManager.unregister(manifest.id);
      
      // Load directly onto manager
      await extensionManager.loadExtensionFromZip(content, true);
      
      setRunSuccess(true);
      setRunMessage('এক্সটেনশন সফলভাবে আপনার ওয়ার্কস্পেসে লোড করা হয়েছে। এটি চেক করার জন্য বাম পাশের স্লাইডবার দেখুন।');
    } catch (e: any) {
      console.error('Run Failure:', e);
      setRunSuccess(false);
      setRunMessage(`কোড রান করতে সমস্যা হয়েছে: ${e.message}`);
    }
  };

  const currentFileContent = project ? getFileByPath(project.files, activeFile)?.content || '' : '';

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden font-sans relative">
      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[40] md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ 
          width: sidebarOpen ? (window.innerWidth <= 768 ? '85vw' : 300) : 0, 
          opacity: sidebarOpen ? 1 : 0,
          x: sidebarOpen ? 0 : -300
        }}
        className={`h-full bg-[#111111] border-r border-white/5 flex flex-col fixed md:relative z-[50] md:z-30 overflow-hidden shadow-2xl md:shadow-none`}
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-orange-500" />
            <h2 className="font-bold tracking-tight">প্রকল্পের ফাইল</h2>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="text-white/20 hover:text-white transition-colors">
            <ChevronRight className="rotate-180 w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <button 
              onClick={() => addFile()}
              className="flex flex-col items-center justify-center p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 group"
            >
              <FilePlus className="w-5 h-5 text-white/40 group-hover:text-orange-500 mb-1" />
              <span className="text-[10px] uppercase font-bold tracking-wider text-white/30 group-hover:text-white/60">নিউ ফাইল</span>
            </button>
            <button 
              onClick={() => addFile(undefined, 'folder')}
              className="flex flex-col items-center justify-center p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 group"
            >
              <FolderPlus className="w-5 h-5 text-white/40 group-hover:text-blue-500 mb-1" />
              <span className="text-[10px] uppercase font-bold tracking-wider text-white/30 group-hover:text-white/60">নিউ ফোল্ডার</span>
            </button>
          </div>
          <button className="w-full flex items-center justify-center gap-2 p-3 mb-6 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 group">
            <Upload className="w-4 h-4 text-white/40 group-hover:text-green-500" />
            <span className="text-[10px] uppercase font-bold tracking-wider text-white/30 group-hover:text-white/60">ফাইল ইম্পোর্ট</span>
          </button>

          <div className="space-y-1">
            {project?.files.map((file, i) => (
              <FileItem 
                key={i} 
                file={file} 
                isActive={activeFile === file.name}
                onClick={() => setActiveFile(file.name)}
                onAddFile={(parentId, type) => addFile(parentId, type)}
                onDelete={(path) => deleteFile(path)}
                path={file.name}
              />
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-white/5 bg-black/20">
          <div className="flex items-center gap-3 text-xs text-white/40">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            ডেভেলপার মোড সক্রিয়
          </div>
        </div>
      </motion.aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-[#0d0d0d] border-b border-white/5 flex items-center justify-between px-4 md:px-6 shrink-0">
          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)} 
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/5">
              <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
              <span className="text-[10px] md:text-xs font-bold tracking-widest uppercase opacity-40">Dev Workspace</span>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <button 
              onClick={async () => {
                if (!project) return;
                const zip = new JSZip();
                const addToZip = (files: ExtensionFile[], path = '') => {
                  files.forEach(f => {
                    const fullPath = path ? `${path}/${f.name}` : f.name;
                    if (f.type === 'file') {
                      zip.file(fullPath, f.content);
                    } else if (f.children) {
                      addToZip(f.children, fullPath);
                    }
                  });
                };
                addToZip(project.files);
                const blob = await zip.generateAsync({ type: 'blob' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${project.id.replace(/[^a-z0-9]/gi, '_') || 'extension'}.zip`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-white/5 hover:bg-white/10 text-white/80 rounded-xl text-sm font-bold transition-all border border-white/10"
              title="ZIP ডাউনলোড করুন"
            >
              <Download size={16} className="text-blue-400" />
              <span className="hidden lg:inline">বিকাশ ফাইল (ZIP)</span>
            </button>
            <button 
              onClick={handleValidate}
              className="flex items-center gap-2 px-3 md:px-5 py-2 md:py-2.5 bg-white/5 hover:bg-white/10 text-white/80 rounded-xl text-sm font-bold transition-all border border-white/10"
              title="ভ্যালিডেট করুন"
            >
              <Shield className="w-4 h-4 text-orange-400" />
              <span className="hidden md:inline">ভ্যালিডেট করুন</span>
            </button>
            <button 
              onClick={handleRun}
              className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-2.5 bg-orange-500 hover:bg-orange-600 text-black rounded-xl text-sm font-black transition-all shadow-[0_4px_20px_rgba(249,115,22,0.2)] active:scale-95"
              title="রান (Run)"
            >
              <Play className="w-4 h-4 fill-current" />
              <span className="hidden md:inline">রান (Run)</span>
            </button>
          </div>
        </header>

        {/* Editor Wrapper */}
        <div className="flex-1 overflow-hidden relative flex flex-col">
          {/* Breadcrumbs */}
          <div className="h-10 bg-black/20 border-b border-white/5 flex items-center px-6 gap-2 shrink-0 overflow-x-auto no-scrollbar">
            <span className="text-xs font-bold text-white/20 uppercase tracking-tighter">Root</span>
            <ChevronRight className="w-3 h-3 text-white/10" />
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-lg border border-white/10">
              <FileCode className="w-3 h-3 text-orange-400" />
              <span className="text-xs font-medium text-white/80">{activeFile}</span>
            </div>
          </div>

          {/* Editor Grid */}
          <div className="flex-1 relative flex">
            {/* Line Numbers Mock */}
            <div className="hidden md:flex w-12 bg-[#0a0a0a] border-r border-white/5 flex-col items-center pt-4 select-none opacity-20 font-mono text-[10px]">
              {Array.from({ length: 50 }).map((_, i) => (
                <div key={i} className="h-6 leading-6">{i + 1}</div>
              ))}
            </div>
            
            <textarea
              ref={editorRef}
              value={currentFileContent}
              onChange={(e) => updateFileContent(activeFile, e.target.value)}
              spellCheck={false}
              className="flex-1 bg-transparent p-4 font-mono text-base md:text-sm leading-6 resize-none outline-none caret-orange-500 text-white/90 selection:bg-orange-500/20"
              placeholder="Start coding your extension..."
            />

            {/* Editor Floating Info */}
            <div className="absolute top-4 right-4 space-y-2 pointer-events-none">
              <div className="bg-black/80 backdrop-blur-sm border border-white/5 px-3 py-1.5 rounded-lg text-[10px] text-white/40 font-mono uppercase tracking-widest flex items-center gap-2">
                <Monitor className="w-3 h-3" /> JS UTF-8
              </div>
            </div>
          </div>
        </div>

        {/* Footer/StatusBar */}
        <footer className="h-8 bg-[#0d0d0d] border-t border-white/5 flex items-center justify-between px-4 shrink-0 text-[10px] font-bold text-white/20 uppercase tracking-wider">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><Terminal className="w-3 h-3" /> Ready</span>
            <span className="flex items-center gap-1">Ln 1, Col 1</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Spaces: 2</span>
            <span>UTF-8</span>
          </div>
        </footer>
      </main>

      <ValidationProgressModal 
        isOpen={showValidation} 
        onClose={() => setShowValidation(false)}
        isValidating={isValidating}
        result={validationResult}
      />

      <ExtensionRunResultModal
        isOpen={showRunResult}
        onClose={() => setShowRunResult(false)}
        success={runSuccess}
        message={runMessage}
      />
    </div>
  );
}

function FileItem({ 
  file, isActive, onClick, onAddFile, onDelete, path, depth = 0 
}: { 
  file: ExtensionFile; 
  isActive: boolean; 
  onClick: () => void; 
  onAddFile: (parentId: string, type: 'file' | 'folder') => void;
  onDelete: (path: string) => void;
  path: string;
  depth?: number;
}) {
  const [isOpen, setIsOpen] = useState(true);

  if (file.type === 'folder') {
    return (
      <div className="select-none">
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors cursor-pointer group ${isActive ? 'bg-orange-500/10 text-orange-400' : 'hover:bg-white/5 text-white/60'}`}
          style={{ paddingLeft: `${depth * 12 + 12}px` }}
        >
          <div className="w-4 h-4 flex items-center justify-center">
            {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </div>
          <FileCode className={`w-4 h-4 ${isOpen ? 'text-blue-400' : 'text-white/20'}`} />
          <span className="text-sm font-medium flex-1">{file.name}</span>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={(e) => { e.stopPropagation(); onAddFile(path, 'folder'); }}
              className="p-1 hover:bg-white/10 rounded-lg"
            >
              <FolderPlus className="w-3.5 h-3.5 text-white/20 hover:text-blue-400" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onAddFile(path, 'file'); }}
              className="p-1 hover:bg-white/10 rounded-lg"
            >
              <FilePlus className="w-3.5 h-3.5 text-white/20 hover:text-orange-400" />
            </button>
          </div>
        </div>
        {isOpen && file.children?.map((child, i) => (
          <FileItem 
            key={i} 
            file={child} 
            isActive={false} 
            onClick={onClick} 
            onAddFile={onAddFile}
            onDelete={onDelete}
            path={`${path}/${child.name}`}
            depth={depth + 1} 
          />
        ))}
      </div>
    );
  }

  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all cursor-pointer group ${isActive ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'hover:bg-white/5 text-white/60 border border-transparent'}`}
      style={{ paddingLeft: `${depth * 12 + 12}px` }}
    >
      <FileCode className={`w-4 h-4 ${isActive ? 'text-orange-400' : 'text-white/20'}`} />
      <span className="text-sm font-medium flex-1 truncate">{file.name}</span>
      <button 
        onClick={(e) => { e.stopPropagation(); onDelete(path); }}
        className="p-1 hover:bg-white/10 rounded-lg"
      >
        <Trash2 className="w-3.5 h-3.5 opacity-0 group-hover:opacity-40 hover:text-red-500 transition-all" />
      </button>
    </div>
  );
}
