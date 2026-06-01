/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  File, 
  Archive, 
  Download, 
  Trash2, 
  Check, 
  AlertCircle,
  FolderOpen,
  Filter,
  X,
  Plus,
  Loader2,
  ArrowLeft,
  ChevronRight, 
  ChevronDown, 
  Code, 
  Eye,
  Edit3
} from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { useNavigate } from 'react-router-dom';
import { DataManager } from '../../../../services/storage/DataManager';
import { Modal } from '../../../../components/modals/Modal';
import { AddZipFileModal } from '../../../../components/modals/AddZipFileModal';

interface FileInfo {
  name: string;
  originalPath: string;
  extension: string;
  size: number;
  data: Uint8Array | string; // Use string if base64 for serializability
}

const ZipFlattener: React.FC = () => {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<FileInfo[]>(() => {
    const cached = sessionStorage.getItem('zip_flattener_files');
    if (cached) {
      const parsed = JSON.parse(cached);
      return parsed.map((f: any) => ({
        ...f,
        data: Uint8Array.from(atob(f.data), c => c.charCodeAt(0))
      }));
    }
    return [];
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [excludedExtensions, setExcludedExtensions] = useState<Set<string>>(new Set());
  const [zipName, setZipName] = useState<string>(sessionStorage.getItem('zip_flattener_name') || 'flattened.zip');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileContent, setNewFileContent] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (files.length > 0) {
      const serializable = files.map(f => ({
        ...f,
        data: uint8ArrayToBase64(f.data as Uint8Array)
      }));
      sessionStorage.setItem('zip_flattener_files', JSON.stringify(serializable));
    } else {
      sessionStorage.removeItem('zip_flattener_files');
    }
  }, [files]);

  useEffect(() => {
    sessionStorage.setItem('zip_flattener_name', zipName);
  }, [zipName]);

  const handleAddNewFile = () => {
    if (!newFileName) return;
    const extension = newFileName.includes('.') ? newFileName.split('.').pop()?.toLowerCase() || '' : 'txt';
    const encoder = new TextEncoder();
    const data = encoder.encode(newFileContent);
    
    const newFile: FileInfo = {
      name: newFileName,
      originalPath: newFileName,
      extension: extension,
      size: data.length,
      data: data
    };
    
    setFiles(prev => [...prev, newFile]);
    setNewFileName('');
    setNewFileContent('');
    setShowAddModal(false);
  };

  const handleUpload = async (file: File) => {
    if (!file.name.endsWith('.zip')) {
      setError('Please upload a valid ZIP file.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setZipName(file.name.replace('.zip', '') + '_flattened.zip');

    try {
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(file);
      const extractedFiles: FileInfo[] = [];

      const promises: Promise<void>[] = [];

      loadedZip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir) {
          const promise = zipEntry.async('uint8array').then(data => {
            const name = relativePath.split('/').pop() || relativePath;
            const extension = name.includes('.') ? name.split('.').pop()?.toLowerCase() || '' : 'none';
            extractedFiles.push({
              name,
              originalPath: relativePath,
              extension,
              size: data.length,
              data
            });
          });
          promises.push(promise);
        }
      });

      await Promise.all(promises);
      setFiles(extractedFiles);
    } catch (err) {
      console.error('Error processing ZIP:', err);
      setError('Failed to process the ZIP file. It might be corrupted or protected.');
    } finally {
      setIsProcessing(false);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }, []);

  const toggleExtension = (ext: string) => {
    const newExcluded = new Set(excludedExtensions);
    if (newExcluded.has(ext)) {
      newExcluded.delete(ext);
    } else {
      newExcluded.add(ext);
    }
    setExcludedExtensions(newExcluded);
  };

  const getFilteredFiles = () => {
    return files.filter(f => !excludedExtensions.has(f.extension));
  };

  const handleFlatten = async () => {
    const filteredFiles = getFilteredFiles();
    if (filteredFiles.length === 0) {
      setError('No files left to zip after filtering.');
      return;
    }

    setIsProcessing(true);
    try {
      const newZip = new JSZip();
      
      // Handle potential duplicate names during flattening
      const nameCounts: Record<string, number> = {};
      
      for (const file of filteredFiles) {
        let finalName = file.name;
        if (nameCounts[finalName]) {
          const parts = finalName.split('.');
          const ext = parts.pop();
          const base = parts.join('.');
          finalName = `${base}_${nameCounts[finalName]}.${ext}`;
          nameCounts[file.name]++;
        } else {
          nameCounts[finalName] = 1;
        }
        
        newZip.file(finalName, file.data);
      }

      const content = await newZip.generateAsync({ type: 'blob' });
      saveAs(content, zipName);
      
      // Save result info to search/history if needed
      await DataManager.saveNote({
        id: crypto.randomUUID(),
        title: `[Tool] ZIP Flattened: ${zipName}`,
        content: `<p>Flattened ZIP created with ${filteredFiles.length} files.</p><!-- TOOL_RESULT -->`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        emoji: '📦',
        workspaceId: await DataManager.getActiveWorkspaceId()
      });

    } catch (err) {
      console.error('Error creating ZIP:', err);
      setError('Failed to create the new ZIP file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadFile = (file: FileInfo) => {
    const blob = new Blob([file.data], { type: 'application/octet-stream' });
    saveAs(blob, file.name);
  };

  const availableExtensions = Array.from(new Set(files.map(f => f.extension))).sort();

  // Get unique folders from original paths
  const folders = Array.from(new Set(files.map(f => {
    const parts = f.originalPath.split('/');
    return parts.length > 1 ? parts.slice(0, -1).join('/') : '';
  }))).filter(Boolean).sort();

  const toggleFolder = (folder: string) => {
    const next = new Set(expandedFolders);
    if (next.has(folder)) next.delete(folder);
    else next.add(folder);
    setExpandedFolders(next);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/5 px-6 py-6 transition-all">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button 
            onClick={() => navigate('/tools')}
            className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white/60 hover:text-white transition-all border border-white/10"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">ZIP Path Flattener</h1>
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-0.5">File Utility Tool</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        {/* Help text */}
        <div className="bg-blue-500/5 border border-blue-500/10 rounded-3xl p-6 flex gap-4">
          <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 shrink-0">
            <AlertCircle size={24} />
          </div>
          <div>
            <h2 className="font-bold text-blue-400">How it works</h2>
            <p className="text-white/60 text-sm mt-1 leading-relaxed">
              Upload a ZIP file containing nested folders. This tool will extract all files and place them at the root level of a new ZIP. 
              You can filter out specific file types before generating the result. No file content is modified.
            </p>
          </div>
        </div>

        {/* Upload Area */}
        <AnimatePresence mode="wait">
          {files.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative h-80 border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center gap-4 cursor-pointer transition-all
                ${isDragging ? 'border-blue-500 bg-blue-500/5 scale-[1.02]' : 'border-white/10 hover:border-white/20 bg-white/[0.02]'}
              `}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                }} 
                accept=".zip" 
                className="hidden" 
              />
              <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center text-white/20">
                {isProcessing ? <Loader2 size={32} className="animate-spin text-blue-500" /> : <Upload size={32} />}
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">Drop your ZIP file here</p>
                <p className="text-sm text-white/40 mt-1">or click to browse from device</p>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowAddModal(true); }}
                  className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-2xl font-bold text-sm transition-all text-white/80 border border-white/5"
                >
                  <Plus size={18} className="text-blue-400" />
                  Add Code (কোড যোগ করুন)
                </button>
              </div>
              
              {error && (
                <div className="absolute bottom-6 left-6 right-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs text-center font-bold flex items-center justify-center gap-2">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8"
            >
              {/* File List Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center text-green-400 border border-green-500/20">
                    <Check size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-white/40 font-bold uppercase tracking-wider">Processed</p>
                    <p className="font-bold">{files.length} files found</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowAddModal(true)}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-bold transition-all border border-white/10 flex items-center gap-2"
                  >
                    <Plus size={14} className="text-blue-400" />
                    Add File
                  </button>
                  <button 
                    onClick={() => setFiles([])}
                    className="px-6 py-3 bg-white/5 hover:bg-red-500/10 hover:text-red-400 rounded-2xl text-xs font-bold transition-all border border-white/10 flex items-center gap-2"
                  >
                    <Trash2 size={14} />
                    Reset
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="bg-[#161616] border border-white/5 rounded-[2rem] p-8 space-y-6">
                <div className="flex items-center gap-3">
                  <Filter size={18} className="text-blue-400" />
                  <h3 className="font-bold">Exclude Extensions</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableExtensions.map(ext => (
                    <button
                      key={ext}
                      onClick={() => toggleExtension(ext)}
                      className={`
                        px-4 py-2 rounded-xl text-xs font-bold transition-all border
                        ${excludedExtensions.has(ext) 
                          ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}
                      `}
                    >
                      .{ext}
                    </button>
                  ))}
                </div>
                {excludedExtensions.size > 0 && (
                  <p className="text-[10px] text-white/30 italic">
                    * {getFilteredFiles().length} files remaining after filters
                  </p>
                )}
              </div>

              {/* Result ZIP Name */}
              <div className="bg-[#161616] border border-white/5 rounded-[2rem] p-8 space-y-4">
                <label className="text-xs text-white/40 font-bold uppercase tracking-wider ml-2">Export Zip Name</label>
                <div className="relative">
                  <Archive className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20" size={20} />
                  <input 
                    type="text"
                    value={zipName}
                    onChange={(e) => setZipName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-16 pr-6 py-4 text-white focus:outline-none focus:border-blue-500/50 transition-all font-mono"
                  />
                </div>
              </div>

              {/* Action */}
              <button
                type="submit"
                id="flatten-zip-button"
                onClick={handleFlatten}
                disabled={isProcessing || getFilteredFiles().length === 0}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-6 rounded-[2rem] font-bold text-lg shadow-2xl shadow-blue-600/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
              >
                {isProcessing ? <Loader2 className="animate-spin" /> : <Download size={24} />}
                {isProcessing ? 'Generating ZIP...' : 'Flatten & Download'}
              </button>

              {/* File Preview (Hierarchical) */}
              <div className="bg-[#161616] border border-white/5 rounded-[2rem] overflow-hidden">
                <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                  <h3 className="font-bold flex items-center gap-2">
                    <FolderOpen size={18} className="text-yellow-500" />
                    Archive Contents
                  </h3>
                  <span className="text-[10px] bg-white/5 px-3 py-1 rounded-full text-white/40 font-bold uppercase tracking-wider">Explorer</span>
                </div>
                
                <div className="max-h-[500px] overflow-y-auto custom-scrollbar p-4 space-y-1">
                  {/* Flat files (no folder) */}
                  {files.filter(f => !f.originalPath.includes('/')).map((file, i) => (
                    <FileRow key={i} file={file} onDownload={() => handleDownloadFile(file)} isExcluded={excludedExtensions.has(file.extension)} />
                  ))}

                  {/* Folders */}
                  {folders.map(folder => (
                    <div key={folder} className="space-y-1">
                      <button 
                        onClick={() => toggleFolder(folder)}
                        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-white/5 rounded-xl transition-colors text-left group"
                      >
                        {expandedFolders.has(folder) ? <ChevronDown size={14} className="text-white/20" /> : <ChevronRight size={14} className="text-white/20" />}
                        <FolderOpen size={16} className="text-blue-400 opacity-60" />
                        <span className="text-sm font-bold text-white/60 group-hover:text-white transition-colors">{folder}</span>
                        <span className="text-[10px] text-white/20 ml-auto">{files.filter(f => f.originalPath.startsWith(folder + '/')).length} files</span>
                      </button>
                      
                      <AnimatePresence>
                        {expandedFolders.has(folder) && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden pl-6 space-y-1"
                          >
                            {files.filter(f => f.originalPath.startsWith(folder + '/')).map((file, i) => (
                              <FileRow key={i} file={file} onDownload={() => handleDownloadFile(file)} isExcluded={excludedExtensions.has(file.extension)} />
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AddZipFileModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)}
        fileName={newFileName}
        onFileNameChange={setNewFileName}
        fileContent={newFileContent}
        onFileContentChange={setNewFileContent}
        onAdd={handleAddNewFile}
      />
    </div>
  );
};

const FileRow = ({ file, onDownload, isExcluded }: { file: FileInfo, onDownload: () => void, isExcluded: boolean }) => (
  <div className={cn(
    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all group",
    isExcluded ? "opacity-20 grayscale scale-95" : "hover:bg-white/5"
  )}>
    <div className={cn(
      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
      isExcluded ? "bg-white/5" : "bg-white/[0.03] text-white/40 group-hover:text-white group-hover:bg-white/10 transition-all shadow-inner"
    )}>
      {['js', 'ts', 'html', 'css', 'json', 'py', 'java', 'c', 'cpp'].includes(file.extension) ? <Code size={14} /> : <File size={14} />}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-bold truncate">{file.name}</p>
      <p className="text-[10px] text-white/20 font-mono">{(file.size / 1024).toFixed(1)} KB</p>
    </div>
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button 
        onClick={onDownload}
        title="Download individual file"
        className="p-2 hover:bg-blue-500/20 hover:text-blue-400 rounded-lg transition-colors border border-transparent hover:border-blue-500/20"
      >
        <Download size={14} />
      </button>
    </div>
  </div>
);

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export default ZipFlattener;
