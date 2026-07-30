import React, { useState, useEffect } from 'react';
import { GeneratedFile } from '../types';
import * as Icons from 'lucide-react';

interface EditorTabProps {
  files: GeneratedFile[];
  selectedFile: GeneratedFile | null;
  onSelectFile: (file: GeneratedFile) => void;
  onUpdateContent: (id: string, content: string) => void;
}

export default function EditorTab({ files, selectedFile, onSelectFile, onUpdateContent }: EditorTabProps) {
  const activeFile = selectedFile || (files && files.length > 0 ? files[0] : null);
  const [content, setContent] = useState(activeFile?.content || '');

  useEffect(() => {
    setContent(activeFile?.content || '');
  }, [activeFile?.id, activeFile?.content]);

  if (!files || files.length === 0 || !activeFile) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 text-zinc-500 p-6">
        <Icons.Code2 className="w-16 h-16 mb-4 opacity-20 text-zinc-400" />
        <p className="text-lg font-medium text-zinc-300 text-center">Editor is empty.</p>
        <p className="text-sm mt-2 opacity-60 text-center">Generate or create a file first.</p>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    onUpdateContent(activeFile.id, e.target.value);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#121214] text-[#d4d4d4] font-mono">
      {/* File Tabs Strip */}
      <div className="flex overflow-x-auto bg-[#18181b] border-b border-[#27272a] scrollbar-hide flex-shrink-0 pb-safe-top">
        {files.map((file) => (
          <button
            key={file.id}
            onClick={() => onSelectFile(file)}
            className={`px-4 py-3 text-xs flex items-center gap-2 whitespace-nowrap border-b-2 transition-colors ${
              activeFile.id === file.id
                ? 'bg-[#121214] text-zinc-100 border-zinc-500'
                : 'text-zinc-500 border-transparent hover:bg-[#1f1f22]'
            }`}
          >
            {file.name.endsWith('.tsx') || file.name.endsWith('.ts') ? <Icons.FileCode2 className="w-3.5 h-3.5" /> : null}
            {file.name.endsWith('.css') ? <Icons.Palette className="w-3.5 h-3.5" /> : null}
            {file.name.endsWith('.html') ? <Icons.Globe className="w-3.5 h-3.5" /> : null}
            {file.name}
          </button>
        ))}
      </div>

      {/* Code Area */}
      <div className="flex-1 relative group flex flex-col min-h-0">
        <textarea 
          value={content}
          onChange={handleChange}
          className="flex-1 w-full bg-transparent text-xs sm:text-sm leading-relaxed p-4 outline-none resize-none"
          spellCheck={false}
        />
        <button 
          className="absolute bottom-6 right-6 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-100 p-3 rounded-full shadow-lg opacity-80 hover:opacity-100 transition-opacity flex items-center justify-center active:scale-95"
          onClick={() => {
            navigator.clipboard.writeText(content);
          }}
          title="Copy Code"
        >
          <Icons.Copy className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
