'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Menu, 
  Plus, 
  Wand2, 
  ArrowUp, 
  ChevronDown, 
  X, 
  Settings, 
  HelpCircle, 
  LogIn, 
  Image as ImageIcon, 
  Video, 
  FileText, 
  Paperclip, 
  ArrowLeft, 
  BookOpen, 
  Search, 
  Trash2,
  Globe,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Pencil,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GoogleGenAI } from '@google/genai';
import Link from 'next/link';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, doc, setDoc, getDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useLanguage } from './contexts/LanguageContext';

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
  groundingMetadata?: any;
  feedback?: string;
};

type Chat = {
  id: string;
  messages?: Message[];
  title?: string;
  updatedAt?: any;
};

const ZhiyouLogo = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="z-grad" x1="5" y1="7" x2="27" y2="25" gradientUnits="userSpaceOnUse">
        <stop stopColor="#4ade80" />
        <stop offset="1" stopColor="#3b82f6" />
      </linearGradient>
    </defs>
    <path 
      d="M 11 7 L 27 7 L 23 13 L 21 13 L 17 19 L 25 19 L 21 25 L 5 25 L 9 19 L 11 19 L 15 13 L 7 13 Z" 
      fill="url(#z-grad)" 
      stroke="url(#z-grad)" 
      strokeWidth="1.5" 
      strokeLinejoin="round" 
    />
  </svg>
);

export default function ZhiyouApp() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<Chat[]>([]);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const router = useRouter();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [isSearchEnabled, setIsSearchEnabled] = useState(false);
  const [showSources, setShowSources] = useState<any>(null);
  const [feedbackMessageIdx, setFeedbackMessageIdx] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [copyToast, setCopyToast] = useState(false);
  const [editingMessageIdx, setEditingMessageIdx] = useState<number | null>(null);
  const [editInput, setEditInput] = useState('');
  const { t, language } = useLanguage();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target as Node)) {
        setIsAttachmentMenuOpen(false);
      }
      if (modelMenuRef.current && !modelMenuRef.current.contains(event.target as Node)) {
        setIsModelMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push('/login');
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    
    const chatsRef = collection(db, 'users', user.uid, 'chats');
    const q = query(chatsRef, orderBy('updatedAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const history = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Chat[];
      setChatHistory(history);
      
      if (!chatId && history.length > 0 && messages.length === 0) {
        setChatId(history[0].id);
        setMessages(history[0].messages || []);
      }
    });
    
    return () => unsubscribe();
  }, [user, chatId, messages.length]);

  const loadChat = async (id: string) => {
    if (!user) return;
    setChatId(id);
    setIsSidebarOpen(false);
    
    try {
      const chatDoc = await getDoc(doc(db, 'users', user.uid, 'chats', id));
      if (chatDoc.exists()) {
        setMessages(chatDoc.data().messages || []);
      }
    } catch (error) {
      console.error("Error loading chat:", error);
    }
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const confirmDeleteChat = async () => {
    if (!user || !chatToDelete) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'chats', chatToDelete));
      if (chatId === chatToDelete) {
        setChatId(null);
        setMessages([]);
      }
      setChatToDelete(null);
    } catch (error) {
      console.error("Error deleting chat:", error);
    }
  };

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

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 2000);
  };

  const handleShare = async (text: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Zhiyou AI Chat',
          text: text,
          url: window.location.href,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      handleCopy(text);
    }
  };

  const submitFeedback = () => {
    if (feedbackMessageIdx === null) return;
    
    setMessages(prev => {
      const newMessages = [...prev];
      newMessages[feedbackMessageIdx].feedback = feedbackText;
      return newMessages;
    });
    
    // In a real app, you'd send this to Firestore
    setFeedbackMessageIdx(null);
    setFeedbackText('');
  };

  const triggerFileInput = (accept: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.click();
    }
  };

  useEffect(() => {
    let systemInstruction = t('systemPromptBase') + '\n\n' + t('systemPromptLang');
    
    if (selectedModel === 'zhiyou-3') {
      systemInstruction += '\n\n[MODE PENALARAN TINGGI AKTIF]: ' + t('systemPromptReasoning');
    }

    chatRef.current = ai.chats.create({
      model: 'gemini-2.5-flash', // Always use 2.5 flash under the hood
      config: {
        systemInstruction: systemInstruction,
      }
    });
  }, [selectedModel, language, t]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    
    // Typing animation logic
    setIsTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 500);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const handleSend = async (overrideText?: string) => {
    if ((!input.trim() && !overrideText && attachments.length === 0) || isLoading) return;
    
    const userText = overrideText || input.trim();
    const currentAttachments = overrideText ? [] : [...attachments];
    
    if (!overrideText) {
      setInput('');
      setAttachments([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
    
    if (editingMessageIdx !== null) {
      setMessages(prev => prev.slice(0, editingMessageIdx));
      setEditingMessageIdx(null);
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

      const responseStream = await chatRef.current.sendMessageStream({ 
        message: messageParts,
        config: {
          tools: isSearchEnabled ? [{ googleSearch: {} }] : []
        }
      });
      
      let firstChunk = true;
      let fullText = '';
      let groundingMetadata: any = null;

      for await (const chunk of responseStream) {
        if (firstChunk) {
          setIsThinking(false);
          firstChunk = false;
        }
        fullText += chunk.text;
        
        // Extract grounding metadata if available
        if (chunk.candidates?.[0]?.groundingMetadata) {
          groundingMetadata = chunk.candidates[0].groundingMetadata;
        }

        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].text = fullText;
          if (groundingMetadata) {
            newMessages[newMessages.length - 1].groundingMetadata = groundingMetadata;
          }
          return newMessages;
        });
      }

      if (user) {
        try {
          const chatRef = chatId 
            ? doc(db, 'users', user.uid, 'chats', chatId)
            : doc(collection(db, 'users', user.uid, 'chats'));
            
          if (!chatId) setChatId(chatRef.id);
          
          setMessages(prev => {
            const msgsToSave = prev.map(m => ({
              role: m.role,
              text: m.text,
              attachments: m.attachments?.map(a => ({
                base64: a.base64,
                mimeType: a.mimeType,
                name: a.name,
                size: a.size
              })) || []
            }));
            
            setDoc(chatRef, {
              messages: msgsToSave,
              updatedAt: serverTimestamp(),
              title: msgsToSave[0]?.text?.substring(0, 30) || 'Chat Baru'
            }, { merge: true }).catch(err => console.error("Firestore save error:", err));
            
            return prev;
          });
        } catch (dbError) {
          console.error("Error saving to Firestore:", dbError);
        }
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

  if (isAuthLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-16 h-16 rounded-3xl bg-white border border-gray-100 flex items-center justify-center shadow-xl shadow-blue-500/20 mb-4"
        >
          <ZhiyouLogo className="w-10 h-10" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xs font-semibold text-gray-400 tracking-widest uppercase"
        >
          Zhiyou AI
        </motion.div>
      </div>
    );
  }

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
              <button onClick={() => { setMessages([]); setChatId(null); setIsSidebarOpen(false); }} className="flex items-center gap-2 hover:bg-gray-200 active:scale-95 px-3 py-2 rounded-lg transition-all w-full">
                <div className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                  <ZhiyouLogo className="w-4 h-4" />
                </div>
                <span className="font-medium">{t('newChat')}</span>
              </button>
              <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 hover:bg-gray-200 active:scale-90 rounded-full transition-all">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="px-4 pb-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder={t('searchHistory')} 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3">
              <div className="text-xs font-semibold text-gray-500 mb-2 px-3">{t('chatHistory')}</div>
              {chatHistory.filter(chat => chat.title?.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 ? (
                chatHistory.filter(chat => chat.title?.toLowerCase().includes(searchQuery.toLowerCase())).map((chat, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05, duration: 0.2 }}
                    key={chat.id} 
                    className={`group relative w-full flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${chatId === chat.id ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-200 text-gray-700'}`}
                  >
                    <button 
                      onClick={() => loadChat(chat.id)}
                      className="flex-1 text-left truncate pr-6 active:scale-[0.98] transition-transform"
                    >
                      {chat.title}
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setChatToDelete(chat.id); }}
                      className="absolute right-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 active:scale-90 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                      title={t('delete')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ))
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-3 py-2 text-sm text-gray-400 italic">
                  {searchQuery ? t('noResult') : t('noHistory')}
                </motion.div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-200 space-y-1">
              <Link href="/settings" className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-200 active:scale-[0.98] transition-all text-sm text-gray-700">
                <Settings className="w-4 h-4" /> {t('settings')}
              </Link>
              <Link href="/help" className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-200 active:scale-[0.98] transition-all text-sm text-gray-700">
                <HelpCircle className="w-4 h-4" /> {t('help')}
              </Link>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative min-w-0">
        {/* Top Bar */}
        <header className="flex-shrink-0 flex items-center justify-between p-3 sm:p-4 bg-white/80 backdrop-blur-md z-10">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-gray-100 active:scale-90 rounded-full transition-all md:hidden">
            <Menu className="w-6 h-6 text-gray-600" />
          </button>
          
          <div className="flex-1 flex justify-center md:justify-start md:ml-4 relative" ref={modelMenuRef}>
            <button 
              onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-50 hover:bg-gray-100 active:scale-95 rounded-full text-sm font-medium transition-all border border-gray-200"
            >
              <div className="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                <ZhiyouLogo className="w-3.5 h-3.5" />
              </div>
              {selectedModel === 'gemini-2.5-flash' ? 'Zhiyou 2.5' : 'Zhiyou 3'}
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isModelMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            
            <AnimatePresence>
              {isModelMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-1/2 md:left-0 -translate-x-1/2 md:translate-x-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-1.5 flex flex-col gap-0.5 z-50 min-w-[220px]"
                >
                  <button 
                    onClick={() => { setSelectedModel('gemini-2.5-flash'); setIsModelMenuOpen(false); }}
                    className={`flex flex-col px-3 py-2.5 hover:bg-gray-50 active:scale-[0.98] rounded-xl text-left transition-all ${selectedModel === 'gemini-2.5-flash' ? 'bg-blue-50/50' : ''}`}
                  >
                    <span className="text-sm font-semibold text-gray-900">{t('modelZhiyou25')}</span>
                  </button>
                  <button 
                    onClick={() => { setSelectedModel('zhiyou-3'); setIsModelMenuOpen(false); }}
                    className={`flex flex-col px-3 py-2.5 hover:bg-gray-50 active:scale-[0.98] rounded-xl text-left transition-all ${selectedModel === 'zhiyou-3' ? 'bg-blue-50/50' : ''}`}
                  >
                    <span className="text-sm font-semibold text-gray-900">{t('modelZhiyou3')}</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-medium text-gray-900">{user.displayName || 'User'}</span>
              </div>
              <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'User'}&background=random`} alt="Profile" className="w-8 h-8 rounded-full border border-gray-200 hover:scale-105 transition-transform cursor-pointer" />
              <button onClick={handleLogout} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 active:scale-90 rounded-full transition-all" title="Logout">
                <LogIn className="w-5 h-5 rotate-180" />
              </button>
            </div>
          ) : (
            <Link href="/login" className="flex items-center gap-2 px-4 py-1.5 sm:px-5 sm:py-2 rounded-full text-sm font-medium text-gray-900 bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 hover:opacity-90 active:scale-95 transition-all">
              <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm">
                <span className="text-[12px] font-bold text-blue-600">G</span>
              </div>
              Login
            </Link>
          )}
        </header>

        {/* Chat Area */}
        <main className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-4 -mt-10">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", bounce: 0.5, duration: 0.8 }}
                className="w-16 h-16 rounded-3xl bg-white border border-gray-100 flex items-center justify-center mb-6 shadow-xl shadow-blue-500/10"
              >
                <ZhiyouLogo className="w-10 h-10" />
              </motion.div>
              
              <motion.h1 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="text-4xl sm:text-5xl font-semibold mb-4 text-center tracking-tight"
              >
                {t('welcome')}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">{user?.displayName?.split(' ')[0] || 'User'}</span>
              </motion.h1>
              
              <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="text-gray-500 text-lg sm:text-xl text-center max-w-md"
              >
                {t('howCanIHelp')}
              </motion.p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto w-full px-4 py-6 space-y-8">
              {messages.map((msg, idx) => (
                <motion.div 
                  key={idx} 
                  initial={{ opacity: 0, y: 15, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
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
                  
                  <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-[#f4f4f5] px-5 py-3 rounded-3xl rounded-tr-sm relative group/msg' : ''}`}>
                    {msg.role === 'user' ? (
                      <div className="flex flex-col gap-2">
                        {editingMessageIdx === idx ? (
                          <div className="flex flex-col gap-2 min-w-[200px]">
                            <textarea
                              autoFocus
                              value={editInput}
                              onChange={(e) => setEditInput(e.target.value)}
                              className="w-full bg-white border border-gray-200 rounded-xl p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                              rows={3}
                            />
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => setEditingMessageIdx(null)}
                                className="px-3 py-1 text-xs font-medium text-gray-500 hover:bg-gray-200 rounded-lg transition-all"
                              >
                                {t('cancel')}
                              </button>
                              <button 
                                onClick={() => handleSend(editInput)}
                                className="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all"
                              >
                                {t('submit')}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
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
                            <button 
                              onClick={() => { setEditingMessageIdx(idx); setEditInput(msg.text); }}
                              className="absolute -left-10 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full opacity-0 group-hover/msg:opacity-100 transition-all active:scale-90"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 w-full">
                        <div className="text-gray-800 leading-relaxed overflow-hidden">
                          {isThinking && idx === messages.length - 1 && !msg.text ? (
                            <div className="flex items-center gap-3 py-2">
                              <div className="relative w-6 h-6 flex-shrink-0">
                                <div className="absolute inset-0 rounded-full animate-border-spin border-2 border-transparent" style={{ borderTopColor: '#3b82f6', borderRightColor: '#8b5cf6' }}></div>
                              </div>
                              {isSearchEnabled ? (
                                <div className="flex items-center gap-2">
                                  <svg className="w-4 h-4 animate-pulse" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                  </svg>
                                  <span className="text-sm font-medium bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853] bg-clip-text text-transparent animate-pulse">
                                    {t('searching')}...
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm font-medium animate-shimmer">
                                  {t('thinking')}...
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="prose prose-slate max-w-none prose-p:leading-relaxed prose-pre:bg-gray-50 prose-pre:text-gray-800 prose-pre:border prose-pre:border-gray-200 prose-a:text-blue-600">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {msg.text}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>
                          
                          {/* Grounding Sources Pill */}
                          {msg.groundingMetadata?.groundingChunks && (
                            <div className="mt-4 pt-4 border-t border-gray-50">
                              <button 
                                onClick={() => setShowSources(msg.groundingMetadata)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-full text-xs font-medium text-gray-600 transition-all active:scale-95"
                              >
                                <Globe className="w-3 h-3 text-blue-500" />
                                <span className="truncate max-w-[120px]">
                                  {msg.groundingMetadata.groundingChunks[0]?.web?.uri?.replace('https://', '').replace('www.', '').split('/')[0]}
                                </span>
                                {msg.groundingMetadata.groundingChunks.length > 1 && (
                                  <span className="text-gray-400">
                                    {msg.groundingMetadata.groundingChunks.length - 1}+ {t('others')}
                                  </span>
                                )}
                              </button>
                            </div>
                          )}

                        {/* Message Actions */}
                        <div className="flex items-center gap-1 ml-1">
                          <button className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all active:scale-90" title="Like">
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => setFeedbackMessageIdx(idx)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all active:scale-90" 
                            title="Unlike"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleCopy(msg.text)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all active:scale-90" 
                            title="Copy"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleShare(msg.text)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all active:scale-90" 
                            title="Share"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
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
                className={`absolute -inset-[2px] rounded-3xl blur-xl z-0 transition-all duration-300 ${isTyping ? 'animate-border-spin-fast opacity-80 scale-105' : 'animate-border-spin opacity-50 group-focus-within:opacity-100'}`}
                style={{ backgroundImage: 'conic-gradient(from var(--angle), transparent 0%, transparent 40%, #3b82f6 50%, #8b5cf6 65%, #ec4899 80%, #f43f5e 100%)' }}
              ></div>
              
              {/* Border Effect */}
              <div 
                className={`absolute -inset-[2px] rounded-3xl z-0 transition-all duration-300 ${isTyping ? 'animate-border-spin-fast opacity-100' : 'animate-border-spin opacity-100'}`}
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
                  placeholder={t('askAnything')}
                  className={`w-full bg-transparent resize-none outline-none max-h-48 min-h-[40px] text-gray-800 placeholder:text-gray-500 text-base transition-opacity duration-300 ${input.length > 0 ? 'opacity-100' : 'opacity-70'}`}
                  rows={1}
                />
                
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1 relative" ref={attachmentMenuRef}>
                    <button 
                      onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)}
                      className={`p-2 rounded-full transition-all active:scale-90 ${isAttachmentMenuOpen ? 'bg-gray-200 text-gray-800' : 'hover:bg-gray-200/80 text-gray-500'}`} 
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
                          <button onClick={() => triggerFileInput('image/*')} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 active:scale-[0.98] rounded-xl text-sm font-medium text-gray-700 transition-all text-left">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                              <ImageIcon className="w-4 h-4 text-blue-500" />
                            </div>
                            {t('addImage')}
                          </button>
                          <button onClick={() => triggerFileInput('video/*')} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 active:scale-[0.98] rounded-xl text-sm font-medium text-gray-700 transition-all text-left">
                            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                              <Video className="w-4 h-4 text-purple-500" />
                            </div>
                            {t('addVideo')}
                          </button>
                          <button onClick={() => triggerFileInput('*/*')} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 active:scale-[0.98] rounded-xl text-sm font-medium text-gray-700 transition-all text-left">
                            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                              <FileText className="w-4 h-4 text-orange-500" />
                            </div>
                            {t('addDoc')}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button 
                      onClick={() => setIsSearchEnabled(!isSearchEnabled)}
                      className={`p-2 rounded-full transition-all active:scale-90 relative ${isSearchEnabled ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-200/80 text-gray-500'}`} 
                      title={t('searchWeb')}
                    >
                      <Pencil className="w-5 h-5" />
                      <Sparkles className={`w-3 h-3 absolute -top-0.5 -right-0.5 transition-transform duration-500 ${isSearchEnabled ? 'scale-110 rotate-12 text-blue-500' : 'scale-75 opacity-50'}`} />
                    </button>

                    <button className="p-2 hover:bg-gray-200/80 active:scale-90 rounded-full transition-all text-gray-500" title={t('magicTool')}>
                      <Wand2 className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <button 
                    onClick={() => handleSend()}
                    disabled={(!input.trim() && attachments.length === 0) || isLoading}
                    className="p-2 bg-gray-200 hover:bg-gray-300 active:scale-90 disabled:opacity-50 disabled:hover:bg-gray-200 disabled:active:scale-100 rounded-full transition-all text-gray-700"
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
              {t('disclaimer')}<br/>
              &copy;2026 Zhiyou AI | Zent Inc.
            </p>
          </div>
        </div>
      </div>

      {/* Sources Bottom Sheet */}
      <AnimatePresence>
        {showSources && (
          <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white rounded-t-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">{t('sources')}</h3>
                <button onClick={() => setShowSources(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {showSources.groundingChunks?.map((chunk: any, i: number) => (
                  <a 
                    key={i} 
                    href={chunk.web?.uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-100 transition-all group"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold text-gray-900 truncate">{chunk.web?.title || 'Source'}</span>
                      <span className="text-xs text-gray-500 truncate">{chunk.web?.uri}</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0" />
                  </a>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Feedback Popup */}
      <AnimatePresence>
        {feedbackMessageIdx !== null && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('feedbackTitle')}</h3>
              <textarea 
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder={t('feedbackPlaceholder')}
                className="w-full h-32 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all resize-none mb-4"
              />
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setFeedbackMessageIdx(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {t('cancel')}
                </button>
                <button 
                  onClick={submitFeedback}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  {t('submit')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Copy Toast */}
      <AnimatePresence>
        {copyToast && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[150] bg-gray-900 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg flex items-center gap-2"
          >
            <Check className="w-4 h-4 text-green-400" />
            {t('copySuccess')}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logout Confirmation Dialog */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('logoutConfirmTitle')}</h3>
              <p className="text-gray-500 text-sm mb-6">{t('logoutConfirmDesc')}</p>
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setShowLogoutConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {t('cancel')}
                </button>
                <button 
                  onClick={confirmLogout}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                >
                  {t('yesLogout')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Chat Confirmation Dialog */}
      <AnimatePresence>
        {chatToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('deleteChatTitle')}</h3>
              <p className="text-gray-500 text-sm mb-6">{t('deleteChatDesc')}</p>
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setChatToDelete(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {t('cancel')}
                </button>
                <button 
                  onClick={confirmDeleteChat}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                >
                  {t('delete')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
