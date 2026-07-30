import React, { useState, useRef, useEffect } from 'react';
import { GeneratedFile, Project } from './types';
import WebsiteRenderer from './components/WebsiteRenderer';
import ChatTab from './components/ChatTab';
import FilesTab from './components/FilesTab';
import EditorTab from './components/EditorTab';
import * as Icons from 'lucide-react';
import JSZip from 'jszip';

type TabType = 'chat' | 'preview' | 'files' | 'editor';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [isGenerating, setIsGenerating] = useState(false);
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<GeneratedFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('harsh_projects');
    if (saved) return JSON.parse(saved);
    return [{ id: 'default', name: 'My First Project', files: [], updatedAt: Date.now() }];
  });
  const [currentProjectId, setCurrentProjectId] = useState<string>('default');
  const [projectName, setProjectName] = useState('My First Project');

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newProjectInput, setNewProjectInput] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    const saved = localStorage.getItem('harsh_projects');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProjects(parsed);
          setCurrentProjectId(parsed[0].id);
          setFiles(parsed[0].files || []);
          setProjectName(parsed[0].name || 'Project 1');
        }
      } catch (e) {
        console.error("Failed to parse saved projects", e);
      }
    }
  }, []);

  useEffect(() => {
    if (currentProjectId) {
      setProjects(prev => {
        const updated = prev.map(p => 
          p.id === currentProjectId 
            ? { ...p, files, name: projectName, updatedAt: Date.now() } 
            : p
        );
        localStorage.setItem('harsh_projects', JSON.stringify(updated));
        return updated;
      });
    }
  }, [files, currentProjectId, projectName]);

  const loadProject = (id: string) => {
    const proj = projects.find(p => p.id === id);
    if (proj) {
      setCurrentProjectId(proj.id);
      setFiles(proj.files || []);
      setProjectName(proj.name);
      if (proj.files && proj.files.length > 0) {
        setSelectedFile(proj.files[0]);
      } else {
        setSelectedFile(null);
      }
      showToast(`Switched to "${proj.name}"`);
    }
  };

  const handleOpenNewModal = () => {
    setNewProjectInput(`Project ${projects.length + 1}`);
    setIsNewModalOpen(true);
  };

  const handleConfirmCreateProject = () => {
    const name = newProjectInput.trim() || `Project ${projects.length + 1}`;
    const newProj: Project = { 
      id: Date.now().toString(), 
      name, 
      files: [], 
      updatedAt: Date.now() 
    };
    
    setProjects(prev => {
      const updated = [...prev, newProj];
      localStorage.setItem('harsh_projects', JSON.stringify(updated));
      return updated;
    });
    
    setCurrentProjectId(newProj.id);
    setFiles([]);
    setProjectName(name);
    setSelectedFile(null);
    setIsNewModalOpen(false);
    setActiveTab('chat');
    showToast(`Created new project "${name}"!`);
  };

  const handleConfirmDeleteProject = () => {
    if (projects.length <= 1) {
      showToast("Cannot delete the only project!");
      setIsDeleteModalOpen(false);
      return;
    }
    
    const targetId = currentProjectId;
    const remaining = projects.filter(p => p.id !== targetId);
    setProjects(remaining);
    localStorage.setItem('harsh_projects', JSON.stringify(remaining));
    
    const nextProj = remaining[0];
    setCurrentProjectId(nextProj.id);
    setFiles(nextProj.files || []);
    setProjectName(nextProj.name);
    setSelectedFile(nextProj.files?.[0] || null);
    
    setIsDeleteModalOpen(false);
    showToast(`Deleted project`);
  };

  const handleGenerate = async (prompt: string, history: any[]): Promise<string | undefined> => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, history })
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.details || errData.error || "Failed to generate");
      }
      const data = await response.json();
      
      if (data.files && data.files.length > 0) {
        const newFiles = data.files.map((f: any) => ({ ...f, id: Date.now().toString() + Math.random() }));
        setFiles(newFiles);
        setSelectedFile(newFiles[0]);
        setActiveTab('preview');
      }
      
      return data.reply;
    } catch (error: any) {
      console.error(error);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateFile = (name: string, language: string) => {
    const newFile: GeneratedFile = {
      id: Date.now().toString() + Math.random(),
      name,
      language,
      content: language === 'html' ? '<!-- New HTML File -->' : language === 'css' ? '/* New CSS File */' : '// New TS/JS File'
    };
    setFiles(prev => [...prev, newFile]);
    setSelectedFile(newFile);
    setActiveTab('editor');
  };

  const handleDeleteFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    if (selectedFile?.id === id) {
      setSelectedFile(null);
    }
  };

  const handleRenameFile = (id: string, newName: string) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f));
    if (selectedFile?.id === id) {
      setSelectedFile(prev => prev ? { ...prev, name: newName } : null);
    }
  };

  const handleUpdateFileContent = (id: string, content: string) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, content } : f));
    if (selectedFile?.id === id) {
      setSelectedFile(prev => prev ? { ...prev, content } : null);
    }
  };

  const handleExportProject = async () => {
    if (files.length === 0) return alert("No files to export.");
    const zip = new JSZip();
    files.forEach(file => {
      zip.file(file.name, file.content);
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'harsh-website-project.zip';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles) return;

    const newGeneratedFiles: GeneratedFile[] = [];
    let processedCount = 0;

    Array.from(uploadedFiles).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        let language = 'typescript';
        if (file.name.endsWith('.html')) language = 'html';
        else if (file.name.endsWith('.css')) language = 'css';
        else if (file.name.endsWith('.js')) language = 'javascript';
        else if (file.name.endsWith('.json')) language = 'json';
        
        newGeneratedFiles.push({
          id: Date.now().toString() + Math.random(),
          name: file.name,
          language,
          content
        });

        processedCount++;
        if (processedCount === uploadedFiles.length) {
          setFiles(prev => [...prev, ...newGeneratedFiles]);
          alert(`Successfully imported ${processedCount} files.`);
        }
      };
      reader.readAsText(file);
    });
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const NavButton = ({ id, icon: Icon, label }: { id: TabType, icon: any, label: string }) => {
    const isActive = activeTab === id;
    return (
      <button 
        onClick={() => setActiveTab(id)}
        className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
          isActive ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
        }`}
      >
        <Icon className={`w-6 h-6 ${isActive ? 'fill-zinc-800' : ''}`} />
        <span className="text-[10px] font-medium tracking-wide">{label}</span>
      </button>
    );
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-zinc-950 text-zinc-100 font-sans overflow-hidden select-none sm:select-auto">
      {/* Top App Header */}
      <header className="h-14 flex-shrink-0 flex items-center justify-between px-4 bg-zinc-900 border-b border-zinc-800 shadow-sm z-20">
        <div className="flex items-center gap-2">
          <div className="bg-zinc-800 p-1.5 rounded-lg text-zinc-200 border border-zinc-700">
            <Icons.Code2 className="w-4 h-4" />
          </div>
          <h1 className="text-base font-bold tracking-tight text-zinc-100 hidden sm:block">Harsh Website Builder</h1>
          
          {/* Project Switcher */}
          <div className="flex items-center gap-1.5 ml-1 sm:ml-3 bg-zinc-800/80 p-1 rounded-lg border border-zinc-700/60 shadow-inner">
            <select 
              value={currentProjectId}
              onChange={(e) => loadProject(e.target.value)}
              className="bg-zinc-900 text-zinc-100 text-xs font-medium rounded px-2.5 py-1.5 outline-none border border-zinc-700 hover:border-zinc-500 cursor-pointer max-w-[110px] xs:max-w-[140px] sm:max-w-[180px] truncate"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.files?.length || 0} files)</option>
              ))}
            </select>
            
            <button 
              onClick={handleOpenNewModal}
              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-medium text-xs rounded-md transition-all flex items-center gap-1 shadow-sm shrink-0"
              title="Create New Project"
            >
              <Icons.Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden xs:inline">New Project</span>
            </button>

            <button 
              onClick={() => setIsDeleteModalOpen(true)}
              className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-700/80 rounded-md transition-colors flex items-center justify-center shrink-0"
              title="Delete Current Project"
            >
              <Icons.Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input 
            type="file" 
            multiple 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleImportFiles}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
            title="Import Files"
          >
            <Icons.Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Import</span>
          </button>
          <button 
            onClick={handleExportProject}
            className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
            title="Export ZIP"
          >
            <Icons.Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative bg-black">
        <div className={`absolute inset-0 ${activeTab === 'chat' ? 'block z-10' : 'hidden'}`}>
          <ChatTab onGenerate={handleGenerate} isGenerating={isGenerating} />
        </div>
        
        <div className={`absolute inset-0 ${activeTab === 'preview' ? 'block z-10' : 'hidden'}`}>
          <WebsiteRenderer files={files} />
        </div>

        <div className={`absolute inset-0 ${activeTab === 'files' ? 'block z-10' : 'hidden'}`}>
          <FilesTab 
            files={files} 
            onSelectFile={(file) => {
              setSelectedFile(file);
              setActiveTab('editor');
            }} 
            onCreateFile={handleCreateFile}
            onDeleteFile={handleDeleteFile}
            onRenameFile={handleRenameFile}
          />
        </div>

        <div className={`absolute inset-0 ${activeTab === 'editor' ? 'block z-10' : 'hidden'}`}>
          <EditorTab 
            files={files} 
            selectedFile={selectedFile}
            onSelectFile={setSelectedFile}
            onUpdateContent={handleUpdateFileContent}
          />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="h-[68px] sm:h-16 flex-shrink-0 bg-zinc-900 border-t border-zinc-800 flex justify-around items-center px-2 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.5)] z-20">
        <NavButton id="chat" icon={Icons.MessageSquare} label="Chat" />
        <NavButton id="preview" icon={Icons.Layout} label="Preview" />
        <NavButton id="files" icon={Icons.FolderOpen} label="Files" />
        <NavButton id="editor" icon={Icons.Code2} label="Editor" />
      </nav>

      {/* Modal: New Project */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <Icons.Plus className="w-4 h-4 text-emerald-400" />
                Create New Website Project
              </h3>
              <button 
                onClick={() => setIsNewModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 p-1 rounded-md"
              >
                <Icons.X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Start a fresh project without losing your existing work. All your projects are saved locally.
            </p>
            <div>
              <label className="block text-[11px] font-medium text-zinc-300 mb-1">Project Name</label>
              <input 
                type="text" 
                value={newProjectInput}
                onChange={(e) => setNewProjectInput(e.target.value)}
                placeholder="e.g., E-Commerce Store, Portfolio..."
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirmCreateProject();
                }}
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button 
                onClick={() => setIsNewModalOpen(false)}
                className="px-3 py-1.5 text-xs text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmCreateProject}
                className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-sm transition-colors"
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete Project Confirmation */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
              <Icons.AlertTriangle className="w-4 h-4" />
              Delete Project
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-zinc-100">"{projectName}"</span>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-3 py-1.5 text-xs text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmDeleteProject}
                className="px-4 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-500 text-white rounded-lg shadow-sm transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-zinc-800 border border-zinc-700 text-zinc-100 text-xs px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 animate-bounce">
          <Icons.CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

