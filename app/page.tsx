'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Menu, Plus, Wand2, ArrowUp, ChevronDown, X, Settings, HelpCircle, LogIn, Image as ImageIcon, Video, FileText, Paperclip } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

type Attachment = {
  file: File;
  base64: string;
  mimeType: string;
  name: string;
  size: string;
  previewUrl?: string;
};

type Message = {
  role: 'user' | 'model';
  text: string;
  attachments?: Attachment[];
};

const ZhiyouLogo = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="z-grad" x1="8" y1="10" x2="24" y2="28" gradientUnits="userSpaceOnUse">
        <stop stopColor="#4ade80" />
        <stop offset="1" stopColor="#3b82f6" />
      </linearGradient>
    </defs>
    {/* Sharp diagonal shadow between the sides */}
    <path d="M 22 12 L 10 22" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
    {/* Main Z with bent ends */}
    <path d="M 8 15 L 8 10 L 24 10 L 8 24 L 24 24 L 24 29" stroke="url(#z-grad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function ZhiyouApp() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target as Node)) {
        setIsAttachmentMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const truncateName = (name: string) => {
    if (name.length <= 15) return name;
    const extIndex = name.lastIndexOf('.');
    if (extIndex !== -1 && name.length - extIndex <= 5) {
      const ext = name.substring(extIndex);
      const base = name.substring(0, extIndex);
      return base.substring(0, 10) + '...' + ext;
    }
    return name.substring(0, 12) + '...';
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result.split(',')[1]);
        }
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const base64 = await fileToBase64(file);
      newAttachments.push({
        file,
        base64,
        mimeType: file.type,
        name: file.name,
        size: formatSize(file.size),
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
      });
    }

    setAttachments(prev => [...prev, ...newAttachments]);
    setIsAttachmentMenuOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerFileInput = (accept: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.click();
    }
  };

  useEffect(() => {
    chatRef.current = ai.chats.create({
      model: selectedModel,
      config: {
        systemInstruction: "You are Zhiyou AI, a smart, safe, and helpful AI assistant. You speak Indonesian by default but can understand other languages.",
      }
    });
  }, [selectedModel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && attachments.length === 0) || isLoading) return;
    
    const userText = input.trim();
    const currentAttachments = [...attachments];
    
    setInput('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    setMessages(prev => [...prev, { role: 'user', text: userText, attachments: currentAttachments }]);
    setIsLoading(true);
    setIsThinking(true);
    
    // Add empty model message immediately so loader shows up
    setMessages(prev => [...prev, { role: 'model', text: '' }]);
    
    try {
      const messageParts: any[] = [];
      if (userText) messageParts.push(userText);
      currentAttachments.forEach(att => {
        messageParts.push({
          inlineData: {
            data: att.base64,
            mimeType: att.mimeType
          }
        });
      });

      const responseStream = await chatRef.current.sendMessageStream({ message: messageParts });
      
      let firstChunk = true;
      for await (const chunk of responseStream) {
        if (firstChunk) {
          setIsThinking(false);
          firstChunk = false;
        }
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].text += chunk.text;
          return newMessages;
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setIsThinking(false);
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1].text = "Maaf, terjadi kesalahan. Silakan coba lagi.";
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-[100dvh] bg-white text-gray-900 font-sans overflow-hidden">
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {(isSidebarOpen || (typeof window !== 'undefined' && window.innerWidth >= 768)) && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
            className={`fixed md:static inset-y-0 left-0 w-72 bg-[#f9f9f9] border-r border-gray-200 z-50 flex flex-col ${isSidebarOpen ? 'block' : 'hidden md:flex'}`}
          >
            <div className="p-4 flex items-center justify-between">
              <button onClick={() => setMessages([])} className="flex items-center gap-2 hover:bg-gray-200 px-3 py-2 rounded-lg transition-colors w-full">
                <div className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                  <ZhiyouLogo className="w-4 h-4" />
                </div>
                <span className="font-medium">Chat Baru</span>
              </button>
              <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 hover:bg-gray-200 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3">
              <div className="text-xs font-semibold text-gray-500 mb-2 px-3">Hari Ini</div>
              <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200 text-sm text-gray-700 truncate">
                Cara membuat website
              </button>
              <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200 text-sm text-gray-700 truncate">
                Resep nasi goreng
              </button>
            </div>
            
            <div className="p-4 border-t border-gray-200 space-y-1">
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-200 text-sm text-gray-700">
                <Settings className="w-4 h-4" /> Pengaturan
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-200 text-sm text-gray-700">
                <HelpCircle className="w-4 h-4" /> Bantuan
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative min-w-0">
        {/* Top Bar */}
        <header className="flex-shrink-0 flex items-center justify-between p-3 sm:p-4 bg-white/80 backdrop-blur-md z-10 border-b border-gray-100">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-gray-100 rounded-full transition-colors md:hidden">
            <Menu className="w-6 h-6 text-gray-600" />
          </button>
          
          <div className="flex-1 flex justify-center md:justify-start md:ml-4">
            <button className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-50 hover:bg-gray-100 rounded-full text-sm font-medium transition-colors border border-gray-200">
              <div className="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                <ZhiyouLogo className="w-3.5 h-3.5" />
              </div>
              Zhiyou 2.5
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          
          <button className="flex items-center gap-2 px-4 py-1.5 sm:px-5 sm:py-2 rounded-full text-sm font-medium text-gray-900 bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 hover:opacity-90 transition-opacity">
            <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm">
              <span className="text-[12px] font-bold text-blue-600">G</span>
            </div>
            Login
          </button>
        </header>

        {/* Chat Area */}
        <main className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-4 -mt-10">
              <div className="w-16 h-16 rounded-3xl bg-white border border-gray-100 flex items-center justify-center mb-6 shadow-xl shadow-blue-500/10">
                <ZhiyouLogo className="w-10 h-10" />
              </div>
              
              <h1 className="text-4xl sm:text-5xl font-semibold mb-4 text-center tracking-tight">
                Halo, <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">User</span>
              </h1>
              
              <p className="text-gray-500 text-lg sm:text-xl text-center max-w-md">
                I'm Zhiyou AI. How can I help you today?
              </p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto w-full px-4 py-6 space-y-8">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'model' && (
                    <div className="relative w-8 h-8 flex-shrink-0 mt-1 flex items-center justify-center">
                      <div className="relative w-8 h-8 rounded-full flex items-center justify-center shadow-sm">
                        <div 
                          className={`absolute inset-0 rounded-full animate-border-spin transition-opacity duration-700 ${(isThinking && idx === messages.length - 1) ? 'opacity-100' : 'opacity-0'}`}
                          style={{ backgroundImage: 'conic-gradient(from var(--angle), transparent 60%, #3b82f6, #8b5cf6, #ec4899)' }}
                        ></div>
                        <div 
                          className={`absolute inset-0 rounded-full animate-border-spin transition-opacity duration-700 ${(isThinking && idx === messages.length - 1) ? 'opacity-0' : 'opacity-100'}`}
                          style={{ backgroundImage: 'conic-gradient(from var(--angle), #3b82f6, #8b5cf6, #ec4899, #f43f5e, #f59e0b, #3b82f6)' }}
                        ></div>
                        <div className="absolute inset-[2px] bg-white rounded-full z-10 flex items-center justify-center">
                          <AnimatePresence>
                            {!(isThinking && idx === messages.length - 1) && (
                              <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
                              >
                                <ZhiyouLogo className="w-5 h-5" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-[#f4f4f5] px-5 py-3 rounded-3xl rounded-tr-sm' : ''}`}>
                    {msg.role === 'user' ? (
                      <div className="flex flex-col gap-2">
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {msg.attachments.map((att, i) => (
                              <div key={i} className="flex items-center gap-2 bg-white/60 border border-gray-200/60 rounded-xl p-2 shadow-sm">
                                {att.previewUrl ? (
                                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                    <img src={att.previewUrl} alt="preview" className="w-full h-full object-cover" />
                                  </div>
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                                    {att.mimeType.startsWith('video/') ? <Video className="w-5 h-5 text-blue-500" /> : <FileText className="w-5 h-5 text-blue-500" />}
                                  </div>
                                )}
                                <div className="flex flex-col min-w-0 pr-2">
                                  <span className="text-xs font-medium text-gray-700 truncate">{truncateName(att.name)}</span>
                                  <span className="text-[10px] text-gray-500">{att.size}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {msg.text && <p className="text-gray-800 whitespace-pre-wrap">{msg.text}</p>}
                      </div>
                    ) : (
                      <div className="prose prose-slate max-w-none prose-p:leading-relaxed prose-pre:bg-gray-50 prose-pre:text-gray-800 prose-pre:border prose-pre:border-gray-200 prose-a:text-blue-600">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.text || '...'}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        {/* Input Area */}
        <div className="flex-shrink-0 bg-white px-4 pb-4 pt-2 w-full">
          <div className="max-w-3xl mx-auto w-full">
            <div className="relative group rounded-3xl z-10">
              {/* Glow Effect */}
              <div 
                className="absolute -inset-[2px] rounded-3xl opacity-50 blur-xl animate-border-spin z-0 transition-opacity duration-300 group-focus-within:opacity-100"
                style={{ backgroundImage: 'conic-gradient(from var(--angle), transparent 0%, transparent 40%, #3b82f6 50%, #8b5cf6 65%, #ec4899 80%, #f43f5e 100%)' }}
              ></div>
              
              {/* Border Effect */}
              <div 
                className="absolute -inset-[2px] rounded-3xl opacity-100 animate-border-spin z-0"
                style={{ backgroundImage: 'conic-gradient(from var(--angle), transparent 0%, transparent 40%, #3b82f6 50%, #8b5cf6 65%, #ec4899 80%, #f43f5e 100%)' }}
              ></div>

              {/* Inner Content */}
              <div className={`relative bg-[#f4f4f5] rounded-3xl p-3 sm:p-4 z-10 flex flex-col shadow-sm transition-all duration-300 ${(input.trim().length > 0 || attachments.length > 0) ? 'ring-2 ring-blue-100 shadow-md shadow-blue-500/10' : ''}`}>
                
                {/* Attachment Preview Area */}
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {attachments.map((att, idx) => (
                      <div key={idx} className="relative flex items-center gap-2 bg-white border border-gray-200 rounded-xl p-2 pr-8 shadow-sm group">
                        {att.previewUrl ? (
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            <img src={att.previewUrl} alt="preview" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                            {att.mimeType.startsWith('video/') ? <Video className="w-5 h-5 text-blue-500" /> : <FileText className="w-5 h-5 text-blue-500" />}
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-medium text-gray-700 truncate">{truncateName(att.name)}</span>
                          <span className="text-[10px] text-gray-500">{att.size}</span>
                        </div>
                        <button 
                          onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 bg-gray-100 hover:bg-gray-200 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3 text-gray-600" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInput}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Tanyakan apa saja"
                  className={`w-full bg-transparent resize-none outline-none max-h-48 min-h-[40px] text-gray-800 placeholder:text-gray-500 text-base transition-opacity duration-300 ${input.length > 0 ? 'opacity-100' : 'opacity-70'}`}
                  rows={1}
                />
                
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1 relative" ref={attachmentMenuRef}>
                    <button 
                      onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)}
                      className={`p-2 rounded-full transition-colors text-gray-500 ${isAttachmentMenuOpen ? 'bg-gray-200 text-gray-800' : 'hover:bg-gray-200/80'}`} 
                      title="Tambahkan file"
                    >
                      <Plus className={`w-5 h-5 transition-transform duration-300 ${isAttachmentMenuOpen ? 'rotate-45' : ''}`} />
                    </button>
                    
                    {/* Attachment Menu Popup */}
                    <AnimatePresence>
                      {isAttachmentMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute bottom-full left-0 mb-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-1.5 flex flex-col gap-0.5 z-50 min-w-[160px]"
                        >
                          <button onClick={() => triggerFileInput('image/*')} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-xl text-sm font-medium text-gray-700 transition-colors text-left">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                              <ImageIcon className="w-4 h-4 text-blue-500" />
                            </div>
                            Gambar
                          </button>
                          <button onClick={() => triggerFileInput('video/*')} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-xl text-sm font-medium text-gray-700 transition-colors text-left">
                            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                              <Video className="w-4 h-4 text-purple-500" />
                            </div>
                            Video
                          </button>
                          <button onClick={() => triggerFileInput('*/*')} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-xl text-sm font-medium text-gray-700 transition-colors text-left">
                            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                              <FileText className="w-4 h-4 text-orange-500" />
                            </div>
                            Dokumen
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button className="p-2 hover:bg-gray-200/80 rounded-full transition-colors text-gray-500" title="Gunakan alat ajaib">
                      <Wand2 className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <button 
                    onClick={handleSend}
                    disabled={(!input.trim() && attachments.length === 0) || isLoading}
                    className="p-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:hover:bg-gray-200 rounded-full transition-colors text-gray-700"
                  >
                    <ArrowUp className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              className="hidden" 
              multiple 
            />
            <p className="text-center text-xs text-gray-400 mt-4 hidden sm:block relative z-10">
              Zhiyou AI dapat membuat kesalahan. Harap periksa kembali info penting.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
