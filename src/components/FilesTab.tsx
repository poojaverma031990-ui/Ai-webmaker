import React, { useState } from 'react';
import { GeneratedFile } from '../types';
import * as Icons from 'lucide-react';

interface FilesTabProps {
  files: GeneratedFile[];
  onSelectFile: (file: GeneratedFile) => void;
  onCreateFile: (name: string, language: string) => void;
  onDeleteFile: (id: string) => void;
  onRenameFile: (id: string, newName: string) => void;
}

export default function FilesTab({ files, onSelectFile, onCreateFile, onDeleteFile, onRenameFile }: FilesTabProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  if (!files || files.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 text-zinc-500 p-6">
        <Icons.FolderOpen className="w-16 h-16 mb-4 opacity-20 text-zinc-400" />
        <p className="text-lg font-medium text-zinc-300 text-center">No files generated yet.</p>
        <p className="text-sm mt-2 opacity-60 text-center">Generate a website to view its source files.</p>
      </div>
    );
  }

  const getFileIcon = (lang: string) => {
    switch(lang) {
      case 'typescript': return <Icons.FileCode2 className="w-5 h-5 text-zinc-300" />;
      case 'html': return <Icons.Globe className="w-5 h-5 text-zinc-300" />;
      case 'css': return <Icons.Palette className="w-5 h-5 text-zinc-300" />;
      default: return <Icons.FileText className="w-5 h-5 text-zinc-400" />;
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    const lang = newFileName.endsWith('.html') ? 'html' : newFileName.endsWith('.css') ? 'css' : 'typescript';
    onCreateFile(newFileName.trim(), lang);
    setNewFileName('');
    setIsCreating(false);
  };

  const handleRenameSubmit = (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (renameValue.trim()) {
      onRenameFile(id, renameValue.trim());
    }
    setRenamingId(null);
  };

  return (
    <div className="w-full h-full bg-zinc-950 text-zinc-100 overflow-y-auto pb-20">
      <div className="p-4 border-b border-zinc-900 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Icons.FolderTree className="w-5 h-5 text-zinc-100" />
            Project Files
          </h2>
          <p className="text-xs text-zinc-500 mt-1">Generated assets for your website</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg transition-colors border border-zinc-700"
          title="New File"
        >
          <Icons.Plus className="w-4 h-4" />
        </button>
      </div>
      
      <div className="p-2">
        {isCreating && (
          <div className="p-4 mb-2 bg-zinc-900 rounded-xl border border-zinc-700">
            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-3">
              <label className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Create New File</label>
              <input
                autoFocus
                type="text"
                placeholder="filename.tsx"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-sm text-zinc-200 outline-none focus:border-zinc-500"
              />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setIsCreating(false)} className="px-3 py-1 text-xs text-zinc-400 hover:text-zinc-100">Cancel</button>
                <button type="submit" className="px-3 py-1 text-xs bg-zinc-100 text-zinc-900 rounded hover:bg-zinc-300 font-medium">Create</button>
              </div>
            </form>
          </div>
        )}

        {files.map((file) => (
          <div key={file.id} className="group w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-900 transition-colors border border-transparent hover:border-zinc-800 mb-1">
            <button
              onClick={() => onSelectFile(file)}
              className="flex-1 flex items-center gap-3 text-left overflow-hidden"
            >
              <div className="p-2 bg-zinc-950 rounded-lg border border-zinc-800 flex-shrink-0">
                {getFileIcon(file.language)}
              </div>
              <div className="flex-1 min-w-0">
                {renamingId === file.id ? (
                  <form onSubmit={(e) => handleRenameSubmit(e, file.id)} onClick={(e) => e.stopPropagation()}>
                    <input
                      autoFocus
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => setRenamingId(null)}
                      className="w-full bg-zinc-950 border border-zinc-500 rounded px-2 py-1 text-sm text-zinc-100 outline-none"
                    />
                  </form>
                ) : (
                  <>
                    <div className="font-medium text-sm text-zinc-200 truncate">{file.name}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">{file.content.split('\n').length} lines • {file.language}</div>
                  </>
                )}
              </div>
            </button>
            
            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
              <button 
                onClick={(e) => { e.stopPropagation(); setRenameValue(file.name); setRenamingId(file.id); }}
                className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
                title="Rename"
              >
                <Icons.Pencil className="w-4 h-4" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onDeleteFile(file.id); }}
                className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
                title="Delete"
              >
                <Icons.Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
