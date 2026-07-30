import React, { useState } from 'react';
import * as Icons from 'lucide-react';

interface Message {
  role: 'user' | 'ai';
  content: string;
}

interface ChatTabProps {
  onGenerate: (prompt: string, history: Message[]) => Promise<string | undefined>;
  isGenerating: boolean;
}

export default function ChatTab({ onGenerate, isGenerating }: ChatTabProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: 'Hi! I am Harsh Website Builder. Describe the website you want to create.' }
  ]);
  const [input, setInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;

    const userPrompt = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userPrompt }]);

    try {
      const reply = await onGenerate(userPrompt, messages);
      
      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: reply || `I have completed building the website!\n\nHere is what I've made:\n- A responsive layout tailored to your prompt.\n- Fully working source code files which you can edit in the Editor tab.\n- A live Preview tab to see your generated site in action.\n\nYou can also manage your project files (create, rename, delete, import, export) from the Files tab.` 
      }]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'ai',
        content: `Sorry, I encountered an error while generating the website: ${err.message}`
      }]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100">
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              msg.role === 'user' 
                ? 'bg-zinc-800 text-zinc-100 rounded-br-sm border border-zinc-700' 
                : 'bg-zinc-900 text-zinc-100 rounded-bl-sm border border-zinc-800'
            }`}>
              {msg.role === 'ai' && (
                <div className="flex items-center gap-2 mb-1 text-xs opacity-60 text-zinc-400 font-medium tracking-wide uppercase">
                  <Icons.Code2 className="w-3 h-3" />
                  Builder
                </div>
              )}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {isGenerating && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl px-4 py-4 bg-zinc-900 text-zinc-100 rounded-bl-sm border border-zinc-800 flex items-center gap-3">
              <Icons.Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
              <span className="text-sm text-zinc-400">Crafting your layout & writing code...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-zinc-900 bg-zinc-950/80 backdrop-blur">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g., A complete dark-themed amazon clone..."
            className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 transition-shadow"
            disabled={isGenerating}
          />
          <button
            type="submit"
            disabled={!input.trim() || isGenerating}
            className="bg-zinc-100 text-zinc-900 p-3 rounded-xl hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Icons.Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
