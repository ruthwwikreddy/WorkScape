/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Component as InfiniteGrid } from './ui/the-infinite-grid';
import { sanitizeUserInput, sanitizeFileName, sanitizeText, sanitizeRoomId } from '../lib/sanitize';

// Lazy load LandingPage for code splitting
const LandingPage = lazy(() => import('./LandingPage'));
import { DotLoader } from './ui/dot-loader';
import { Skeleton, AvatarSkeleton, TextSkeleton, CardSkeleton } from './ui/skeleton';
import { Minimap } from './ui/minimap';
import { ProgressiveImage } from './ui/progressive-image';
import { motion, AnimatePresence } from 'motion/react';
import Peer from 'simple-peer';
import { 
  Monitor, 
  Coffee, 
  User, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  Settings, 
  Bell,
  LogOut,
  ChevronRight,
  Zap,
  Briefcase,
  Mic,
  MicOff,
  Users,
  MessageSquare,
  Trash2,
  Edit3,
  Plus,
  Check,
  X,
  ShieldCheck,
  Smile,
  Send,
  ArrowRight,
  Globe,
  Layout,
  Video,
  Shield,
  Lock,
  Search,
  Settings as SettingsIcon,
  Smile as SmileIcon,
  List,
  GripVertical,
  Sun,
  Upload,
  FileText,
  Download,
  Volume
} from 'lucide-react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  GoogleAuthProvider
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocFromServer
} from 'firebase/firestore';
import {
  ref,
  set,
  onValue,
  update,
  remove,
  onDisconnect,
  serverTimestamp,
  get
} from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { auth, db, rtdb, storage, googleProvider } from '../firebase';

// --- Constants ---
const OFFICE_WIDTH = 1200;
const OFFICE_HEIGHT = 800;
const AVATAR_RADIUS = 30;
const SPEED = 8;
const VOICE_RADIUS = 150;

const OFFICE_THEMES = {
  modern: {
    name: 'Modern',
    background: '#ffffff',
    gridColor: 'rgba(0,0,0,0.05)',
    shadow: '0_60px_120px_rgba(0,0,0,0.5)'
  },
  dark: {
    name: 'Dark',
    background: '#1a1a1a',
    gridColor: 'rgba(255,255,255,0.05)',
    shadow: '0_60px_120px_rgba(0,0,0,0.8)'
  },
  ocean: {
    name: 'Ocean',
    background: '#e0f2fe',
    gridColor: 'rgba(14,165,233,0.1)',
    shadow: '0_60px_120px_rgba(14,165,233,0.3)'
  },
  forest: {
    name: 'Forest',
    background: '#f0fdf4',
    gridColor: 'rgba(34,197,94,0.1)',
    shadow: '0_60px_120px_rgba(34,197,94,0.3)'
  },
  sunset: {
    name: 'Sunset',
    background: '#fef3c7',
    gridColor: 'rgba(245,158,11,0.1)',
    shadow: '0_60px_120px_rgba(245,158,11,0.3)'
  },
  midnight: {
    name: 'Midnight',
    background: '#1e1b4b',
    gridColor: 'rgba(139,92,246,0.1)',
    shadow: '0_60px_120px_rgba(139,92,246,0.5)'
  }
};

const REACTIONS = [
  'UP', 'LOVE', 'LAUGH', 'WOW', 'SAD', 'CELEBRATE', 'HOT', 'CLAP', 'HOORAY', 'STRONG',
  'SPARK', '100', 'THINK', 'LOOK', 'ROCKET', 'IDEA', 'TARGET', 'STAR', 'BLUE', 'HELLO'
];

const ReactionPicker = ({ onSelect, onClose }: { onSelect: (reaction: string) => void; onClose: () => void }) => {
  return (
    <div className="grid grid-cols-5 gap-3">
      {REACTIONS.map((reaction) => (
        <button
          key={reaction}
          onClick={() => {
            onSelect(reaction);
            onClose();
          }}
          className="text-3xl hover:bg-slate-100 rounded-lg p-2 transition-colors w-12 h-12 flex items-center justify-center"
        >
          {reaction}
        </button>
      ))}
    </div>
  );
};

// Simple markdown parser for chat messages
const parseMarkdown = (text: string): string => {
  // Bold: **text** or __text__
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__(.*?)__/g, '<strong>$1</strong>');
  // Italic: *text* or _text_
  text = text.replace(/\*(?!\*)(.*?)\*/g, '<em>$1</em>');
  text = text.replace(/_(?!_)(.*?)_/g, '<em>$1</em>');
  // Code: `text`
  text = text.replace(/`(.*?)`/g, '<code class="bg-black/20 px-1 rounded">$1</code>');
  // Strikethrough: ~~text~~
  text = text.replace(/~~(.*?)~~/g, '<del>$1</del>');
  // Links: [text](url)
  text = text.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-500 underline">$1</a>');
  return text;
};

// --- Types ---
interface Point { x: number; y: number; }
interface Rect { left: number; right: number; top: number; bottom: number; }
interface Zone { name: string; bounds: Rect; }

interface AvatarConfig {
  photoURL?: string;
}

interface RemotePlayer {
  id: string;
  name: string;
  pos: Point;
  angle: number;
  isWalking: boolean;
  isSpeaking: boolean;
  status: 'available' | 'busy' | 'focus';
  isPrivate: boolean;
  zone: string;
  avatarConfig: AvatarConfig;
  stream?: MediaStream;
  message?: string;
  emote?: string;
  lastUpdate?: number;
  prevPos?: Point;
}

const ZONES: Zone[] = [
  { name: "Conference Room A", bounds: { left: 0, right: 300, top: 0, bottom: 210 } },
  { name: "Conference Room B", bounds: { left: 300, right: 600, top: 0, bottom: 210 } },
  { name: "Executive Suite", bounds: { left: 600, right: OFFICE_WIDTH, top: 0, bottom: 210 } },
  { name: "Pantry Area", bounds: { left: 850, right: OFFICE_WIDTH, top: 550, bottom: OFFICE_HEIGHT } },
  { name: "Reception", bounds: { left: 0, right: 320, top: 600, bottom: OFFICE_HEIGHT } },
  { name: "Central Hub", bounds: { left: 0, right: OFFICE_WIDTH, top: 300, bottom: 550 } },
  { name: "Executive Hallway", bounds: { left: 0, right: OFFICE_WIDTH, top: 210, bottom: 300 } },
];

const WALLS: Rect[] = [
  { top: 210, left: 0, right: 110, bottom: 220 },
  { top: 210, left: 200, right: 420, bottom: 220 },
  { top: 210, left: 500, right: 720, bottom: 220 },
  { top: 210, left: 800, right: 1020, bottom: 220 },
  { top: 210, left: 1100, right: 1200, bottom: 220 },
  { top: 0, left: 300, right: 310, bottom: 210 },
  { top: 0, left: 600, right: 610, bottom: 210 },
  { top: 0, left: 900, right: 910, bottom: 210 },
  { top: 550, left: 850, right: 1200, bottom: 560 },
  { top: 620, left: 850, right: 860, bottom: 800 },
  { top: 620, left: 0, right: 310, bottom: 630 },
];

// --- Components ---

// Helper to detect touch devices
const isTouchDevice = () => {
  return (('ontouchstart' in window) ||
     (navigator.maxTouchPoints > 0));
};

const DeviceNotSupported = ({ onBack }: { onBack: () => void }) => (
  <div className="fixed inset-0 z-[5000] bg-black flex flex-col items-center justify-center p-8 text-center">
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md"
    >
      <div className="w-24 h-24 bg-white/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
        <Monitor className="w-12 h-12 text-white" />
      </div>
      <h1 className="text-4xl font-black text-white mb-4 tracking-tight">Desktop Only</h1>
      <p className="text-slate-400 font-medium text-lg leading-relaxed mb-12">
        WorkSpace is designed for high-performance desktop collaboration. Mobile and tablet devices are not supported at this time.
      </p>
      <div className="bg-white/5 border border-white/10 p-6 rounded-2xl mb-12 text-left">
        <p className="text-xs font-black text-white/40 uppercase tracking-widest mb-4">Recommended Devices</p>
        <ul className="space-y-3 text-white font-bold">
          <li className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 bg-white rounded-full" />
            MacBook Pro / Air
          </li>
          <li className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 bg-white rounded-full" />
            Windows Laptops
          </li>
          <li className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 bg-white rounded-full" />
            Desktop Workstations
          </li>
        </ul>
      </div>
      <button 
        onClick={onBack}
        className="px-8 py-4 bg-white text-black rounded-xl font-black hover:scale-105 transition-all"
      >
        Back to Home
      </button>
    </motion.div>
  </div>
);

const SideChatPanel = ({ 
  messages, 
  userName
}: { 
  messages: Array<{ id: string; text: string; sender: string; timestamp: number }>;
  userName: string | null;
}) => {
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="fixed right-8 top-24 bottom-32 w-80 bg-black/90 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl flex flex-col pointer-events-auto">
      <div className="p-4 border-b border-white/10">
        <h3 className="text-xs font-black text-white/60 uppercase tracking-wider">Chat</h3>
      </div>
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar"
      >
        {messages.length === 0 ? (
          <p className="text-white/30 text-xs font-medium text-center">No messages yet</p>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id}
              className={`flex flex-col gap-1 ${msg.sender === userName ? 'items-end' : 'items-start'}`}
            >
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                {msg.sender}
              </span>
              <div className={`px-3 py-2 rounded-xl max-w-[80%] ${
                msg.sender === userName 
                  ? 'bg-white text-black' 
                  : 'bg-white/10 text-white'
              }`}>
                <p 
                  className="text-xs font-medium"
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.text) }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const StickyNotesPanel = ({ 
  isOpen, 
  onClose, 
  notes,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onUpdatePosition
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  notes: Array<{ id: string; text: string; x: number; y: number; color: string }>;
  onAddNote: (note: Omit<{ id: string; text: string; x: number; y: number; color: string }, 'id'>) => void;
  onUpdateNote: (id: string, text: string) => void;
  onDeleteNote: (id: string) => void;
  onUpdatePosition?: (id: string, x: number, y: number) => void;
}) => {
  const [newNoteText, setNewNoteText] = useState("");
  const [selectedColor, setSelectedColor] = useState("#fef08a");
  const [draggingNote, setDraggingNote] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const colors = [
    { name: "Yellow", value: "#fef08a" },
    { name: "Pink", value: "#fbcfe8" },
    { name: "Blue", value: "#bfdbfe" },
    { name: "Green", value: "#bbf7d0" },
    { name: "Orange", value: "#fed7aa" },
  ];

  const handleAddNote = () => {
    if (newNoteText.trim()) {
      onAddNote({
        text: newNoteText.trim(),
        x: 100,
        y: 100,
        color: selectedColor
      });
      setNewNoteText("");
    }
  };

  const handleDragStart = (e: React.MouseEvent, noteId: string, noteX: number, noteY: number) => {
    setDraggingNote(noteId);
    setDragOffset({
      x: e.clientX - noteX,
      y: e.clientY - noteY
    });
  };

  const handleDrag = (e: React.MouseEvent) => {
    if (draggingNote && onUpdatePosition) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      onUpdatePosition(draggingNote, newX, newY);
    }
  };

  const handleDragEnd = () => {
    setDraggingNote(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[5500] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[40px] shadow-2xl w-full max-w-3xl h-[600px] overflow-hidden flex"
      >
        {/* Left Side: Note Creation */}
        <div className="w-1/2 p-6 border-r border-slate-100 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
              <Edit3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-black">New Note</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Leave a message</p>
            </div>
          </div>

          <div className="space-y-4 flex-1">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Note Content</label>
              <textarea
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Write your note here..."
                className="w-full h-32 bg-slate-50 border border-slate-200 rounded-2xl p-4 font-black text-sm focus:outline-none focus:ring-2 focus:ring-black/5 transition-all resize-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Note Color</label>
              <div className="flex gap-2">
                {colors.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setSelectedColor(color.value)}
                    className={`w-10 h-10 rounded-xl border-2 transition-all ${selectedColor === color.value ? 'border-black scale-110' : 'border-transparent hover:scale-105'}`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleAddNote}
            disabled={!newNoteText.trim()}
            className="mt-6 w-full py-4 bg-black text-white rounded-2xl font-black text-sm hover:bg-slate-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Note
          </button>
        </div>

        {/* Right Side: Existing Notes */}
        <div className="w-1/2 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black text-black">Your Notes</h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{notes.length} notes</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            {notes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <MessageSquare className="w-12 h-12 mb-4" />
                <p className="font-black text-sm">No notes yet</p>
              </div>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  className={`p-4 rounded-2xl shadow-sm relative group cursor-move ${draggingNote === note.id ? 'shadow-lg scale-105' : ''}`}
                  style={{ backgroundColor: note.color }}
                  onMouseDown={(e) => handleDragStart(e, note.id, note.x, note.y)}
                  onMouseMove={handleDrag}
                  onMouseUp={handleDragEnd}
                  onMouseLeave={handleDragEnd}
                >
                  <div className="flex items-start gap-2">
                    <GripVertical className="w-4 h-4 text-black/30 mt-1" />
                    <textarea
                      value={note.text}
                      onChange={(e) => onUpdateNote(note.id, e.target.value)}
                      className="flex-1 bg-transparent border-none text-sm font-medium focus:outline-none resize-none"
                      rows={3}
                    />
                  </div>
                  <button
                    onClick={() => onDeleteNote(note.id)}
                    className="absolute top-2 right-2 p-1 bg-white/50 hover:bg-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-3 h-3 text-slate-600" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const ChatHistoryPanel = ({ 
  isOpen, 
  onClose, 
  messages,
  searchQuery,
  onSearchChange,
  onDeleteMessage
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  messages: Array<{ id: string; text: string; sender: string; timestamp: number }>;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onDeleteMessage: (id: string) => void;
}) => {
  const filteredMessages = messages.filter(m => 
    m.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.sender.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[5500] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl h-[600px] overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-black">Chat History</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{filteredMessages.length} messages</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search messages..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3 font-black text-sm focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <MessageSquare className="w-12 h-12 mb-4" />
              <p className="font-black text-sm">No messages found</p>
            </div>
          ) : (
            filteredMessages.map((msg) => (
              <div key={msg.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 group">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white text-xs font-black">
                      {msg.sender.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-black text-sm text-black">{msg.sender}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">
                        {new Date(msg.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onDeleteMessage(msg.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-100 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4 text-rose-500" />
                  </button>
                </div>
                <p className="text-sm text-slate-700 font-medium">{msg.text}</p>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};

const FileDropZone = ({ 
  isOpen, 
  onClose, 
  files,
  onUpload,
  onDelete,
  isHost,
  onEndMeeting
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  files: Array<{ id: string; name: string; url: string; size: number; uploadedBy: string; timestamp: number }>;
  onUpload: (file: File) => void;
  onDelete: (id: string, url: string) => void;
  isHost: boolean;
  onEndMeeting: () => void;
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    droppedFiles.forEach(file => onUpload(file));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    selectedFiles.forEach(file => onUpload(file));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[5500] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[40px] shadow-2xl w-full max-w-3xl h-[600px] overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-black">Shared Files</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{files.length} files</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isHost && (
              <button
                onClick={onEndMeeting}
                className="px-4 py-2 bg-rose-500 text-white rounded-xl font-black text-sm hover:bg-rose-600 transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                End Meeting
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`p-6 border-b-2 border-dashed transition-all ${
            isDragging ? 'border-black bg-black/5' : 'border-slate-200'
          }`}
        >
          <div className="text-center">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-black text-white rounded-2xl font-black text-sm hover:bg-slate-800 transition-colors flex items-center gap-2 mx-auto"
            >
              <Plus className="w-4 h-4" />
              Upload Files
            </button>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">or drag and drop files here</p>
          </div>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Upload className="w-12 h-12 mb-4" />
              <p className="font-black text-sm">No files shared yet</p>
            </div>
          ) : (
            files.map((file) => (
              <div key={file.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 group">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-black text-sm text-black">{file.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{formatFileSize(file.size)}</p>
                        <span className="text-slate-300">•</span>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{file.uploadedBy}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={file.url}
                      download={file.name}
                      className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4 text-slate-600" />
                    </a>
                    <button
                      onClick={() => onDelete(file.id, file.url)}
                      className="p-2 hover:bg-rose-100 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-rose-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};

const QuickStartWizard = ({ 
  isOpen, 
  onClose, 
  onComplete,
  user,
  onJoin
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onComplete: (name: string, room: string, avatar?: AvatarConfig, status?: string, password?: string) => void;
  user: any;
  onJoin: (name: string, room: string, avatar?: AvatarConfig, status?: string, password?: string) => void;
}) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(user?.displayName || "");
  const [room, setRoom] = useState("");
  const [password, setPassword] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState("available");
  const [tempAvatar, setTempAvatar] = useState<AvatarConfig | null>(null);
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'rooms'), where('isPublic', '==', true));
    const unsub = onSnapshot(q, (snapshot) => {
      setAvailableRooms(snapshot.docs.map(d => d.data()));
    });
    return () => unsub();
  }, []);

  const steps = [
    { number: 1, title: "Your Identity", description: "Set your display name and customize your avatar" },
    { number: 2, title: "Choose a Room", description: "Join an existing room or create your own workspace" },
    { number: 3, title: "Set Your Status", description: "Let others know if you're available, busy, or focused" },
  ];

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handlePrevious = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleComplete = async () => {
    if (isCreating) {
      let currentUser = user;
      if (!currentUser) {
        try {
          const result = await signInWithPopup(auth, googleProvider);
          currentUser = result.user;
        } catch (err) {
          console.error("Auth failed", err);
          return;
        }
      }

      const roomData = {
        id: room,
        name: room,
        password: password || "",
        isPublic,
        createdBy: currentUser.uid,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'rooms', room), roomData);
    }

    if (password) {
      const roomDoc = await getDoc(doc(db, 'rooms', room));
      if (roomDoc.exists() && roomDoc.data().password && roomDoc.data().password !== password) {
        alert("Incorrect room password!");
        return;
      }
    }

    onComplete(name, room, tempAvatar || undefined, selectedStatus, password);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-4 font-sans">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl overflow-hidden h-[700px] flex"
      >
        {/* Left Side: Progress & Branding */}
        <div className="w-1/3 bg-slate-900 p-8 text-white flex flex-col">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-black" />
            </div>
            <span className="text-xl font-black tracking-tight">Quick Start</span>
          </div>

          <div className="flex-1">
            {steps.map((s) => (
              <div key={s.number} className="mb-8">
                <div className={`flex items-center gap-4 mb-2 ${s.number === step ? 'opacity-100' : 'opacity-40'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${s.number === step ? 'bg-white text-black' : 'bg-white/20 text-white'}`}>
                    {s.number}
                  </div>
                  <span className="font-bold">{s.title}</span>
                </div>
                <p className="text-slate-400 text-xs ml-12">{s.description}</p>
              </div>
            ))}
          </div>

          <div className="text-slate-500 text-xs">
            <p className="font-black uppercase tracking-widest mb-2">Step {step} of {steps.length}</p>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-white transition-all duration-500"
                style={{ width: `${(step / steps.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right Side: Form Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className="text-2xl font-black text-black mb-2">Your Identity</h2>
              <p className="text-slate-500 mb-8">Customize how you appear to others in the workspace</p>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Display Name</label>
                  <input 
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-black text-sm focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Avatar</label>
                  <button 
                    onClick={() => setTempAvatar({
                      photoURL: user?.photoURL
                    })}
                    className="w-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 hover:border-black/20 transition-all group"
                  >
                    <div className="flex items-center justify-center gap-3">
                      <SmileIcon className="w-8 h-8 text-slate-400 group-hover:text-black transition-colors" />
                      <span className="font-black text-slate-400 group-hover:text-black transition-colors">Customize Avatar</span>
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className="text-2xl font-black text-black mb-2">Choose a Room</h2>
              <p className="text-slate-500 mb-8">Join an existing workspace or create your own</p>

              <div className="flex gap-3 mb-6">
                <button 
                  onClick={() => setIsCreating(false)}
                  className={`flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${!isCreating ? 'bg-black text-white shadow-xl' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                >
                  Join Room
                </button>
                <button 
                  onClick={() => setIsCreating(true)}
                  className={`flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${isCreating ? 'bg-black text-white shadow-xl' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                >
                  Create Room
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Room Name / ID</label>
                  <input 
                    type="text"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    placeholder={isCreating ? "Create a new room" : "Enter room ID"}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-black text-sm focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Password (Optional)</label>
                  <input 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Room password"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-black text-sm focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                  />
                </div>

                {isCreating && (
                  <div className="flex items-center gap-2 p-4 bg-slate-50 rounded-2xl">
                    <input 
                      type="checkbox" 
                      checked={isPublic} 
                      onChange={(e) => setIsPublic(e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-xs font-bold text-slate-600">List this room publicly</span>
                  </div>
                )}

                {!isCreating && availableRooms.length > 0 && (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Public Rooms</label>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                      {availableRooms.map(r => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setRoom(r.id)}
                          className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left hover:bg-slate-100 transition-all"
                        >
                          <p className="text-xs font-black text-slate-700 truncate">{r.name}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Users className="w-3 h-3 text-slate-400" />
                            <span className="text-[8px] font-bold text-slate-400 uppercase">Active</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className="text-2xl font-black text-black mb-2">Set Your Status</h2>
              <p className="text-slate-500 mb-8">Let your team know your availability</p>

              <div className="space-y-4">
                {[
                  { value: 'available', label: 'Available', icon: '🟢', desc: 'Free to chat and collaborate' },
                  { value: 'busy', label: 'Busy', icon: '🟡', desc: 'In a meeting or focused work' },
                  { value: 'focus', label: 'Focus Mode', icon: '🔴', desc: 'Deep work, please disturb only if urgent' }
                ].map((status) => (
                  <button
                    key={status.value}
                    onClick={() => setSelectedStatus(status.value)}
                    className={`w-full p-4 rounded-2xl border-2 transition-all text-left ${selectedStatus === status.value ? 'border-black bg-slate-50' : 'border-slate-200 hover:border-slate-300'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{status.icon}</span>
                      <div>
                        <p className="font-black text-sm">{status.label}</p>
                        <p className="text-xs text-slate-500">{status.desc}</p>
                      </div>
                      {selectedStatus === status.value && (
                        <Check className="w-5 h-5 ml-auto text-black" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-3 mt-8 pt-6 border-t border-slate-100">
            {step > 1 && (
              <button
                onClick={handlePrevious}
                className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all"
              >
                Previous
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={handleNext}
                disabled={step === 1 && !name}
                className="flex-1 py-4 bg-black text-white rounded-2xl font-black text-sm hover:bg-slate-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={!name || !room}
                className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-black text-sm hover:bg-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Enter Workspace
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const TutorialModal = ({ 
  isOpen, 
  onClose, 
  onComplete,
  currentStep,
  onNext,
  onPrevious,
  onSkip
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onComplete: () => void;
  currentStep: number;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
}) => {
  const steps = [
    {
      title: "Welcome to WorkSpace!",
      description: "This is your virtual office where you can collaborate with your team in real-time. Let's take a quick tour.",
      highlight: null,
      icon: <Zap className="w-12 h-12" />
    },
    {
      title: "Navigate with WASD",
      description: "Use W, A, S, D or arrow keys to move your avatar around the office. Walk up to colleagues to start a conversation!",
      highlight: null,
      icon: <Layout className="w-12 h-12" />
    },
    {
      title: "Proximity Voice",
      description: "Hold SPACE to speak. Your voice gets louder as you get closer to others. Step into private bubbles for 1-on-1 conversations.",
      highlight: "mic",
      icon: <Mic className="w-12 h-12" />
    },
    {
      title: "Meeting Rooms",
      description: "The top area has conference rooms where you can have private team meetings. Audio is isolated within each room.",
      highlight: "rooms",
      icon: <Users className="w-12 h-12" />
    },
    {
      title: "Chat & Emotes",
      description: "Type messages in the chat box or use emotes to express yourself. Press 1-8 for quick emotes!",
      highlight: "chat",
      icon: <MessageSquare className="w-12 h-12" />
    },
    {
      title: "Status & Privacy",
      description: "Set your status (Available, Busy, Focus) and toggle private mode for isolated conversations.",
      highlight: "status",
      icon: <ShieldCheck className="w-12 h-12" />
    },
    {
      title: "Daily Tasks",
      description: "Track your daily tasks in the left panel. Press 'E' to auto-complete tasks in your current zone.",
      highlight: "tasks",
      icon: <CheckCircle2 className="w-12 h-12" />
    },
    {
      title: "You're Ready!",
      description: "You're all set to collaborate with your team. Explore the office and start working together!",
      highlight: null,
      icon: <ArrowRight className="w-12 h-12" />
    }
  ];

  const step = steps[currentStep];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden"
      >
        {/* Progress Bar */}
        <div className="h-1 bg-slate-100">
          <motion.div 
            className="h-full bg-black transition-all duration-500"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="p-8">
          {/* Icon */}
          <div className="w-20 h-20 bg-black rounded-3xl flex items-center justify-center text-white mb-6">
            {step.icon}
          </div>

          {/* Content */}
          <h2 className="text-2xl font-black text-black mb-3">{step.title}</h2>
          <p className="text-slate-600 font-medium leading-relaxed mb-8">{step.description}</p>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 mb-8">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-1 rounded-full transition-all ${i === currentStep ? 'bg-black' : i < currentStep ? 'bg-emerald-500' : 'bg-slate-200'}`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-3">
            {currentStep > 0 && (
              <button
                onClick={onPrevious}
                className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all"
              >
                Previous
              </button>
            )}
            {currentStep < steps.length - 1 ? (
              <button
                onClick={onNext}
                className="flex-1 py-4 bg-black text-white rounded-2xl font-black text-sm hover:bg-slate-900 transition-all flex items-center justify-center gap-2"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onComplete}
                className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-black text-sm hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
              >
                Get Started
                <Check className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onSkip}
              className="px-6 py-4 text-slate-400 font-black text-sm hover:text-slate-600 transition-all"
            >
              Skip
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const SettingsModal = ({ 
  isOpen, 
  onClose, 
  userName, 
  roomId, 
  onLogout,
  highContrastMode,
  onToggleHighContrast,
  textSize,
  onSetTextSize,
  selectedTheme,
  onSetTheme
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  userName: string; 
  roomId: string;
  onLogout: () => void;
  highContrastMode: boolean;
  onToggleHighContrast: () => void;
  textSize: 'small' | 'medium' | 'large';
  onSetTextSize: (size: 'small' | 'medium' | 'large') => void;
  selectedTheme: keyof typeof OFFICE_THEMES;
  onSetTheme: (theme: keyof typeof OFFICE_THEMES) => void;
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-2xl font-black text-black">Workspace Settings</h2>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            
            <div className="p-8 space-y-8">
              <section>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">Current User</label>
                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center text-white font-black">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-black text-black">{userName}</p>
                    <p className="text-xs text-slate-500 font-bold">Authenticated Member</p>
                  </div>
                </div>
              </section>

              <section>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">Current Room</label>
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="font-black text-black">{roomId}</p>
                  <button 
                    onClick={() => {
                      const newRoom = prompt("Enter Room ID to switch:", roomId);
                      if (newRoom && newRoom !== roomId) {
                        window.location.search = `?room=${newRoom}`;
                      }
                    }}
                    className="text-xs font-black text-blue-600 uppercase tracking-widest hover:underline"
                  >
                    Switch
                  </button>
                </div>
              </section>

              <section>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">Office Theme</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(OFFICE_THEMES) as Array<keyof typeof OFFICE_THEMES>).map((theme) => (
                    <button
                      key={theme}
                      onClick={() => onSetTheme(theme)}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        selectedTheme === theme 
                          ? 'border-black bg-black text-white' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      aria-label={`Select ${OFFICE_THEMES[theme].name} theme`}
                    >
                      <div 
                        className="w-8 h-8 rounded-lg mx-auto mb-2"
                        style={{ backgroundColor: OFFICE_THEMES[theme].background }}
                      />
                      <p className="text-xs font-black uppercase tracking-wider">{OFFICE_THEMES[theme].name}</p>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">Accessibility</label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div>
                      <p className="font-black text-black">High Contrast Mode</p>
                      <p className="text-xs text-slate-500 font-bold">Increase visibility for better readability</p>
                    </div>
                    <button 
                      onClick={onToggleHighContrast}
                      className={`w-14 h-8 rounded-full p-1 transition-all ${highContrastMode ? 'bg-black' : 'bg-slate-300'}`}
                      aria-label="Toggle high contrast mode"
                    >
                      <motion.div 
                        animate={{ x: highContrastMode ? 24 : 0 }}
                        className="w-6 h-6 bg-white rounded-full shadow-md"
                      />
                    </button>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="font-black text-black mb-3">Text Size</p>
                    <div className="flex gap-2">
                      {(['small', 'medium', 'large'] as Array<'small' | 'medium' | 'large'>).map((size) => (
                        <button
                          key={size}
                          onClick={() => onSetTextSize(size)}
                          className={`flex-1 py-2 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
                            textSize === size 
                              ? 'bg-black text-white' 
                              : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                          }`}
                          aria-label={`Set text size to ${size}`}
                        >
                          {size.charAt(0).toUpperCase() + size.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <div className="pt-4 space-y-3">
                <button 
                  onClick={onLogout}
                  className="w-full py-4 bg-rose-50 text-rose-600 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-rose-100 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Logout from Workspace
                </button>
                <button 
                  onClick={onClose}
                  className="w-full py-4 bg-black text-white rounded-2xl font-black text-sm hover:bg-slate-900 transition-all"
                >
                  Close Settings
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const PixelAvatar = React.memo(({ config, isWalking, isSpeaking, status, name, isLocal }: { config: AvatarConfig; isWalking: boolean; isSpeaking: boolean; status?: string; isLocal?: boolean; name?: string }) => {
  const statusColors: Record<string, string> = {
    available: '#22c55e',
    busy: '#ef4444',
    focus: '#8b5cf6'
  };

  const profileImage = config.photoURL || '/image.png';

  return (
    <div className="relative" style={{ width: 48, height: 48 }}>
      {/* Shadow */}
      <div 
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-2 bg-black/20 rounded-full blur-sm"
        style={{ transform: 'translateX(-50%)' }}
      />

      {/* Circular Avatar with Border */}
      <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-white/50 shadow-lg bg-white/10 backdrop-blur-sm">
        <img 
          src={profileImage}
          alt={name || 'Avatar'}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.src = '/image.png';
          }}
        />
      </div>

      {/* Status Indicator */}
      {status && (
        <div 
          className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-black"
          style={{ backgroundColor: statusColors[status] || statusColors.available }}
        />
      )}
    </div>
  );
});

const Avatar = React.memo(({ config, isWalking, isSpeaking, status, isLocal, name, audioLevel = 0, isSitting, sittingPose }: { config: AvatarConfig; isWalking: boolean; isSpeaking: boolean; status?: string; isLocal?: boolean; name?: string; audioLevel?: number; isSitting?: boolean; sittingPose?: 'chair' | 'desk' | null }) => {
  const statusColors: Record<string, string> = {
    available: '#22c55e',
    busy: '#ef4444',
    focus: '#8b5cf6'
  };

  return (
    <motion.div 
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring" as const, damping: 20, stiffness: 300 }}
      className={`relative ${isWalking ? 'avatar-walking' : ''} ${isSitting ? 'avatar-sitting' : ''}`}
      style={{ 
        width: 52, 
        height: 52,
        transform: isSitting ? 'translateY(8px)' : undefined
      }}
    >
      <style>{`
        @keyframes avatar-walk {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-4px) rotate(-2deg); }
          75% { transform: translateY(-4px) rotate(2deg); }
        }
        .avatar-walking {
          animation: avatar-walk 0.6s infinite ease-in-out;
          transform-origin: bottom center;
        }
        @keyframes sound-wave {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        .sound-wave {
          animation: sound-wave 1.5s infinite ease-out;
        }
        .sound-wave-delay-1 {
          animation-delay: 0.3s;
        }
        .sound-wave-delay-2 {
          animation-delay: 0.6s;
        }
      `}</style>

      {/* Focus Mode Aura */}
      {status === 'focus' && (
        <>
          <motion.div 
            className="absolute inset-0 rounded-full bg-purple-500/40 -m-6"
            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0.2, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute inset-0 rounded-full border-2 border-purple-500/50 -m-4"
            animate={{ scale: [1, 1.2, 1], opacity: [0.8, 0.3, 0.8] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}

      {/* Visual Sound Waves */}
      {isSpeaking && (
        <>
          <motion.div 
            className="absolute inset-0 rounded-full bg-emerald-500/30 -m-4 sound-wave"
          />
          <motion.div 
            className="absolute inset-0 rounded-full bg-emerald-500/20 -m-4 sound-wave sound-wave-delay-1"
          />
          <motion.div 
            className="absolute inset-0 rounded-full bg-emerald-500/10 -m-4 sound-wave sound-wave-delay-2"
          />
        </>
      )}

      {/* Shadow */}
      <div className="absolute bottom-0 w-12 h-3 bg-black/10 rounded-[100%] blur-[4px] z-0" />

      {/* Profile Photo */}
      <div className="relative z-10 w-full h-full rounded-full overflow-hidden border-2 border-white/20 shadow-lg">
        {config.photoURL ? (
          <ProgressiveImage 
            src={config.photoURL} 
            alt={name || 'avatar'} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
        )}
      </div>

      {/* Status Indicator */}
      {status && (
        <div 
          className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white"
          style={{ backgroundColor: statusColors[status] || statusColors.available }}
        />
      )}

      {/* Audio Level Meter */}
      {isLocal && audioLevel > 0.1 && (
        <div className="absolute -right-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              animate={{ height: audioLevel > (i + 1) * 0.2 ? 8 : 4 }}
              className={`w-1 rounded-full transition-all ${
                audioLevel > (i + 1) * 0.2 ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
});

interface Task {
  id: string;
  text: string;
  done: boolean;
  zone: string;
  uid?: string;
}

const HUD = React.memo(({ zone, tasks, completedCount, pos, roomId, roomUsers, remotePlayers, onAddTask, onToggleTask, onDeleteTask, onEditTask, onOpenSettings, onMinimapClick, onOpenChatHistory, onOpenStickyNotes, stickyNotes, connectionQuality, latency, isLoading = false, onQuickTravel, isLightTheme, onToggleTheme, onOpenFileDropZone, sharedFilesCount, textToSpeechEnabled, onToggleTextToSpeech, onExportTasksTXT, onExportTasksPDF, isRoomHost, onEndMeeting }: { 
  zone: string; 
  tasks: Task[]; 
  completedCount: number; 
  pos: Point; 
  roomId: string;
  roomUsers: any[];
  remotePlayers: Record<string, RemotePlayer>;
  onAddTask: (text: string) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onEditTask: (id: string, text: string) => void;
  onOpenSettings: () => void;
  onMinimapClick: (p: Point) => void;
  onOpenChatHistory: () => void;
  onOpenStickyNotes: () => void;
  stickyNotes: Array<{ id: string; text: string; x: number; y: number; color: string }>;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  latency: number;
  isLoading?: boolean;
  onQuickTravel?: (zoneName: string) => void;
  isLightTheme: boolean;
  onToggleTheme: () => void;
  onOpenFileDropZone: () => void;
  sharedFilesCount: number;
  textToSpeechEnabled: boolean;
  onToggleTextToSpeech: () => void;
  onExportTasksTXT: () => void;
  onExportTasksPDF: () => void;
  isRoomHost: boolean;
  onEndMeeting: () => void;
}) => {
  const [time, setTime] = useState(new Date());
  const [showShareTooltip, setShowShareTooltip] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const copyInvite = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomId);
    navigator.clipboard.writeText(url.toString());
    setShowShareTooltip(true);
    setTimeout(() => setShowShareTooltip(false), 2000);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskText.trim()) {
      onAddTask(newTaskText.trim());
      setNewTaskText('');
    }
  };

  const startEditing = (task: Task) => {
    setEditingId(task.id);
    setEditingText(task.text);
  };

  const saveEdit = () => {
    if (editingId && editingText.trim()) {
      onEditTask(editingId, editingText.trim());
      setEditingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 pointer-events-none z-50">
        <div className="absolute top-6 left-6 flex flex-col gap-4 pointer-events-auto">
          <Skeleton className="h-24 w-64 rounded-2xl" />
        </div>
        <div className="absolute top-6 right-6 flex flex-col gap-4 pointer-events-auto">
          <Skeleton className="h-16 w-48 rounded-2xl" />
        </div>
        <div className="absolute bottom-6 left-6 pointer-events-auto">
          <Skeleton className="h-48 w-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* Top Left: Status & Zone */}
      <div className="absolute top-6 left-6 flex flex-col gap-4 pointer-events-auto">
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="bg-black p-5 rounded-2xl shadow-2xl border-l-8 border-white w-72"
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3 h-3 text-white/40" />
              <h1 className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Workspace Room</h1>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={onOpenChatHistory}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                title="Chat History"
                aria-label="Open chat history"
                tabIndex={0}
              >
                <MessageSquare className="w-3 h-3" />
              </button>
              <button 
                onClick={onOpenFileDropZone}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50 relative"
                title="Shared Files"
                aria-label="Open shared files"
                tabIndex={0}
              >
                <Upload className="w-3 h-3" />
                {sharedFilesCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full" />
                )}
              </button>
              <button 
                onClick={onToggleTheme}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                title={isLightTheme ? "Switch to Dark Mode" : "Switch to Light Mode"}
                aria-label="Toggle theme"
                tabIndex={0}
              >
                {isLightTheme ? <Zap className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
              </button>
              <button 
                onClick={onToggleTextToSpeech}
                className={`p-1 hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 ${textToSpeechEnabled ? 'text-emerald-400' : 'text-white/40 hover:text-white'}`}
                title={textToSpeechEnabled ? "Disable Text-to-Speech" : "Enable Text-to-Speech"}
                aria-label="Toggle text-to-speech"
                tabIndex={0}
              >
                <Volume className="w-3 h-3" />
              </button>
              <button 
                onClick={onOpenSettings}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                title="Settings"
                aria-label="Open settings"
                tabIndex={0}
              >
                <Settings className="w-3 h-3" />
              </button>
            </div>
          </div>
          <p className="text-xl font-black text-white tracking-tight truncate">{roomId}</p>
          {isRoomHost && (
            <button
              onClick={onEndMeeting}
              className="mt-2 w-full py-2 bg-rose-500/20 text-rose-400 rounded-lg font-black text-[10px] uppercase tracking-wider hover:bg-rose-500/30 transition-colors flex items-center justify-center gap-1"
              aria-label="End meeting"
              tabIndex={0}
            >
              <X className="w-3 h-3" />
              End Meeting
            </button>
          )}
        </motion.div>

        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-black p-5 rounded-2xl shadow-2xl border-l-8 border-white/20 w-72"
        >
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-3 h-3 text-white/40" />
            <h1 className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Current Zone</h1>
          </div>
          <p className="text-xl font-black text-white tracking-tight">{zone}</p>
        </motion.div>

        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-black p-5 rounded-2xl shadow-2xl w-72 overflow-hidden"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-white" />
              <h2 className="text-xs font-bold text-white/60 uppercase tracking-wider">Daily Tasks</h2>
            </div>
            <span className="text-[10px] bg-white/10 px-2 py-1 rounded-full font-bold text-white">
              {completedCount}/{tasks.length}
            </span>
          </div>

          <form onSubmit={handleAddTask} className="flex gap-2 mb-4">
            <input 
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              placeholder="Add a task..."
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/20 transition-all"
              aria-label="New task input"
              tabIndex={0}
            />
            <button 
              type="submit" 
              className="p-1.5 bg-white text-black rounded-lg hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label="Add task"
              tabIndex={0}
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar mb-4">
            {tasks.length === 0 && (
              <p className="text-[10px] text-white/20 italic text-center py-4">No tasks yet. Start your day!</p>
            )}
            {tasks.map((task) => (
              <div key={task.id} className="group flex items-center gap-3 bg-white/5 p-2 rounded-xl border border-transparent hover:border-white/10 transition-all">
                <button 
                  onClick={() => onToggleTask(task.id)}
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-white/50 ${task.done ? 'bg-white border-white' : 'border-white/20 hover:border-white/40'}`}
                  aria-label={task.done ? 'Mark task as incomplete' : 'Mark task as complete'}
                  tabIndex={0}
                >
                  {task.done && <Check className="w-2.5 h-2.5 text-black" />}
                </button>
                
                {editingId === task.id ? (
                  <div className="flex-1 flex items-center gap-1">
                    <input 
                      autoFocus
                      type="text"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                      className="flex-1 bg-white/10 border-none rounded px-1 py-0.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                      aria-label="Edit task"
                    />
                    <button 
                      onClick={saveEdit} 
                      className="text-white hover:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded p-1"
                      aria-label="Save edit"
                      tabIndex={0}
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => setEditingId(null)} 
                      className="text-white hover:text-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400 rounded p-1"
                      aria-label="Cancel edit"
                      tabIndex={0}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <span className={`flex-1 text-xs font-medium transition-all ${task.done ? 'text-white/30 line-through' : 'text-white/80'}`}>
                    {task.text}
                  </span>
                )}

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEditing(task)} className="p-1 text-white/40 hover:text-white transition-colors">
                    <Edit3 className="w-3 h-3" />
                  </button>
                  <button onClick={() => onDeleteTask(task.id)} className="p-1 text-white/40 hover:text-rose-400 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button 
              onClick={onExportTasksTXT}
              className="flex-1 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-black text-[10px] text-white/60 hover:text-white transition-all flex items-center justify-center gap-1"
              aria-label="Export tasks as TXT"
              tabIndex={0}
            >
              <Download className="w-3 h-3" />
              TXT
            </button>
            <button 
              onClick={onExportTasksPDF}
              className="flex-1 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-black text-[10px] text-white/60 hover:text-white transition-all flex items-center justify-center gap-1"
              aria-label="Export tasks as PDF"
              tabIndex={0}
            >
              <Download className="w-3 h-3" />
              PDF
            </button>
          </div>
        </motion.div>

        {/* Room Members */}
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="bg-black p-5 rounded-2xl shadow-2xl w-72"
        >
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-white" />
            <h2 className="text-xs font-bold text-white/60 uppercase tracking-wider">Room Members</h2>
          </div>
          <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
            {roomUsers.map((member) => {
              const isOnline = Object.values(remotePlayers).some(p => p.name === member.name) || member.uid === auth.currentUser?.uid;
              return (
                <div key={member.uid} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center overflow-hidden border border-white/5">
                        {member.avatarConfig?.photoURL ? (
                          <img src={member.avatarConfig.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <User className="w-4 h-4 text-white/40" />
                        )}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-black ${isOnline ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white leading-none mb-1">{member.name}</span>
                      <span className="text-[9px] text-white/40 uppercase tracking-widest font-black">
                        {isOnline ? (member.status || 'Online') : 'Offline'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Share Button */}
        <motion.button 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          onClick={copyInvite}
          className="group relative bg-white text-black p-4 rounded-2xl shadow-xl hover:bg-slate-100 transition-all flex items-center gap-3 overflow-hidden"
        >
          <div className="w-8 h-8 bg-black/5 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <Users className="w-4 h-4" />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-black text-black/40 uppercase tracking-tighter leading-none mb-1">Collaborate</p>
            <p className="text-sm font-bold leading-none">Invite Teammates</p>
          </div>
          <AnimatePresence>
            {showShareTooltip && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute inset-0 bg-black text-white flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-black uppercase">Link Copied!</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Sticky Notes Display */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-3 bg-black/90 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-xl max-w-xs"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-white/60" />
              <h3 className="text-[10px] font-black text-white/60 uppercase tracking-widest">Sticky Notes</h3>
            </div>
            <button
              onClick={onOpenStickyNotes}
              className="text-[10px] font-black text-white/40 hover:text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
            {stickyNotes.length === 0 ? (
              <p className="text-[10px] text-white/40 font-medium text-center py-2">
                No notes yet
              </p>
            ) : (
              <>
                {stickyNotes.slice(0, 3).map((note) => (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl text-xs font-medium text-white/80 leading-relaxed cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={onOpenStickyNotes}
                    style={{ backgroundColor: note.color + '20', border: `1px solid ${note.color}40` }}
                  >
                    {note.text}
                  </motion.div>
                ))}
                {stickyNotes.length > 3 && (
                  <p className="text-[10px] text-white/40 font-black text-center">
                    +{stickyNotes.length - 3} more notes
                  </p>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* Bottom Right: Clock & Performance Metrics */}
      <div className="absolute bottom-8 right-8 flex items-center gap-4 pointer-events-auto">
        {/* Performance Metrics */}
        <div className="bg-black px-4 py-3 rounded-[24px] shadow-xl border border-white/10 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${
                connectionQuality === 'excellent' ? 'bg-emerald-500' :
                connectionQuality === 'good' ? 'bg-emerald-500' :
                connectionQuality === 'fair' ? 'bg-amber-500' : 'bg-rose-500'
              }`} />
              <div className={`w-1.5 h-1.5 rounded-full ${
                connectionQuality === 'excellent' ? 'bg-emerald-500' :
                connectionQuality === 'good' ? 'bg-emerald-500' :
                connectionQuality === 'fair' ? 'bg-amber-500' : 'bg-rose-500'
              } ${connectionQuality === 'poor' ? 'opacity-30' : ''}`} />
              <div className={`w-1.5 h-1.5 rounded-full ${
                connectionQuality === 'excellent' ? 'bg-emerald-500' :
                connectionQuality === 'good' ? 'bg-amber-500' :
                connectionQuality === 'fair' ? 'bg-rose-500' : 'bg-rose-500'
              } ${connectionQuality === 'fair' || connectionQuality === 'poor' ? 'opacity-30' : ''}`} />
            </div>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-2">
            <Zap className="w-3 h-3 text-white/40" />
            <span className="text-[10px] font-black text-white/60 tabular-nums">{latency}ms</span>
          </div>
        </div>

        {/* Clock */}
        <div className="bg-black px-6 py-4 rounded-[24px] shadow-xl border border-white/10 flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">Current Time</span>
            <span className="text-xl font-black text-white tabular-nums leading-none">
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center">
            <Clock className="w-5 h-5 text-white/40" />
          </div>
        </div>
      </div>

      {/* Bottom Left: Minimap */}
      <div className="absolute bottom-6 left-6 pointer-events-auto">
        <div className="bg-black p-5 rounded-2xl shadow-2xl w-80">
          <Minimap 
            localPos={pos}
            remotePlayers={remotePlayers}
            zones={ZONES}
            currentZone={zone}
            onZoneClick={onQuickTravel}
          />
        </div>
      </div>
    </div>
  );
});

const UserMenu = React.memo(({ name, playersCount }: { name: string; playersCount: number }) => (
  <div className="fixed top-6 right-6 z-50 flex items-center gap-3">
    <div className="bg-black p-2 rounded-full shadow-lg flex items-center gap-3 pr-5 border border-white/10">
      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-black shadow-inner">
        <User className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-white/40 uppercase tracking-tighter leading-none mb-1">Workspace Member</p>
        <p className="text-sm font-bold text-white leading-none">{name}</p>
      </div>
    </div>
    <div className="bg-black p-3 rounded-full shadow-lg flex items-center gap-2 px-4 border border-white/10">
      <Users className="w-4 h-4 text-white/40" />
      <span className="text-xs font-bold text-white">{playersCount}</span>
    </div>
  </div>
));

const EntryModal = ({ onJoin, user }: { onJoin: (name: string, room: string, avatar?: AvatarConfig, status?: string, password?: string) => void; user: any }) => {
  const [name, setName] = useState(user?.displayName || "");
  const [room, setRoom] = useState("");
  const [password, setPassword] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [roomUsers, setRoomUsers] = useState<any[]>([]);
  const [selectedStatus, setSelectedStatus] = useState("available");
  const [showAvatarCustomizer, setShowAvatarCustomizer] = useState(false);
  const [tempAvatar, setTempAvatar] = useState<AvatarConfig | null>(null);
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'rooms'), where('isPublic', '==', true));
    const unsub = onSnapshot(q, (snapshot) => {
      setAvailableRooms(snapshot.docs.map(d => d.data()));
    });
    return () => unsub();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && room) {
      onJoin(name, room, tempAvatar || undefined, selectedStatus, password);
    }
  };

  const handleCreateRoom = async () => {
    if (!name || !room) return;
    
    let currentUser = user;
    if (!currentUser) {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        currentUser = result.user;
      } catch (err) {
        console.error("Auth failed", err);
        return;
      }
    }

    const roomData = {
      id: room,
      name: room,
      password: password || "",
      isPublic,
      createdBy: currentUser.uid,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'rooms', room), roomData);
    onJoin(name, room, tempAvatar || undefined, selectedStatus, password);
  };

  if (showAvatarCustomizer) {
    return (
      <SimpleAvatarModal 
        onComplete={(config) => {
          setTempAvatar(config);
          setShowAvatarCustomizer(false);
        }} 
        user={user} 
        userName={name || user?.displayName || "Guest"} 
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-4 font-sans">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row h-[600px]"
      >
        {/* Left Side: Branding & Info */}
        <div className="w-full md:w-1/2 bg-slate-900 p-12 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] bg-[size:20px_20px]" />
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-8">
              <Zap className="w-6 h-6 text-black" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter leading-none mb-4">JOIN THE<br />WORKSPACE.</h1>
            <p className="text-slate-400 font-medium max-w-xs">Enter your details and choose a room to start collaborating with your team in real-time.</p>
          </div>
          
          <div className="relative z-10">
            <div className="flex -space-x-3 mb-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-700 flex items-center justify-center text-[10px] font-black">
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
              <div className="w-10 h-10 rounded-full border-2 border-slate-900 bg-white text-black flex items-center justify-center text-[10px] font-black">
                +12
              </div>
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active members online now</p>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="w-full md:w-1/2 p-12 flex flex-col overflow-y-auto">
          <div className="flex gap-4 mb-8">
            <button 
              onClick={() => setIsCreating(false)}
              className={`flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${!isCreating ? 'bg-black text-white shadow-xl' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
            >
              Join Room
            </button>
            <button 
              onClick={() => setIsCreating(true)}
              className={`flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${isCreating ? 'bg-black text-white shadow-xl' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
            >
              Create Room
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <section>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">Your Identity</label>
              <div className="flex gap-3">
                <input 
                  type="text" 
                  placeholder="Display Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 font-black text-sm focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowAvatarCustomizer(true)}
                  className="p-4 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors"
                  title="Customize Avatar"
                >
                  <SmileIcon className="w-6 h-6 text-slate-600" />
                </button>
              </div>
            </section>

            <section>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">Initial Status</label>
              <div className="flex gap-2">
                {['available', 'busy', 'focus'].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSelectedStatus(s)}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${selectedStatus === s ? 'bg-black text-white border-black' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">
                {isCreating ? 'New Room Details' : 'Room ID'}
              </label>
              <div className="space-y-3">
                <input 
                  type="text" 
                  placeholder="Room Name / ID"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 font-black text-sm focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                  required
                />
                <div className="relative">
                  <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input 
                    type="password" 
                    placeholder="Password (Optional)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-14 pr-6 py-4 font-black text-sm focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                  />
                </div>
                {isCreating && (
                  <div className="flex items-center gap-2 px-2">
                    <input 
                      type="checkbox" 
                      checked={isPublic} 
                      onChange={(e) => setIsPublic(e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-xs font-bold text-slate-500">List this room publicly</span>
                  </div>
                )}
              </div>
            </section>

            {!isCreating && availableRooms.length > 0 && (
              <section>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">Public Rooms</label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                  {availableRooms.map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRoom(r.id)}
                      className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-left hover:bg-slate-100 transition-all group"
                    >
                      <p className="text-xs font-black text-slate-700 truncate">{r.name}</p>
                      <div className="flex items-center gap-1">
                        <Users className="w-2 h-2 text-slate-400" />
                        <span className="text-[8px] font-bold text-slate-400 uppercase">Active</span>
                        {r.password && <Lock className="w-2 h-2 text-slate-400 ml-auto" />}
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <button 
              type="button"
              onClick={isCreating ? handleCreateRoom : handleSubmit}
              className="w-full py-5 bg-black text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            >
              {isCreating ? 'Create & Join' : 'Enter Workspace'}
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

const SimpleAvatarModal = ({ onComplete, user, userName }: { onComplete: (config: AvatarConfig) => void, user: any, userName: string | null }) => {
  const handleComplete = async () => {
    const finalConfig = { photoURL: user?.photoURL };
    if (user) {
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name: userName,
        avatarConfig: finalConfig,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
    onComplete(finalConfig);
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg p-12"
      >
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center overflow-hidden">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <User className="w-12 h-12 text-white" />
            )}
          </div>
          <h2 className="text-3xl font-black text-black mb-2">Welcome, {userName || 'User'}!</h2>
          <p className="text-slate-500 font-medium mb-8">Your profile photo will be used as your avatar</p>
          <button 
            onClick={handleComplete}
            className="w-full py-4 bg-black hover:bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3"
          >
            Enter Workspace
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const RemotePlayerAvatar = React.memo(({ player, localPos, localIsPrivate, localZone, localStatus }: { player: RemotePlayer; localPos: Point; localIsPrivate: boolean; localZone: string; localStatus?: 'available' | 'busy' | 'focus'; key?: string }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [showBusyPrompt, setShowBusyPrompt] = useState(false);
  const dist = Math.hypot(player.pos.x - localPos.x, player.pos.y - localPos.y);
  
  // Proximity-based visibility for speaking cue
  const canSeeSpeakingCue = dist < VOICE_RADIUS * 1.5;

  // Interpolation logic: Use a more responsive spring for remote players
  // to follow the server updates smoothly.
  const springConfig = { type: 'spring' as const, damping: 25, stiffness: 120, mass: 0.5 };

  // Zone-Based Audio Isolation Logic:
  // Voice only travels within the same zone, regardless of physical proximity through walls
  const inSameZone = localZone === player.zone;
  
  // Private Bubble Logic: 
  const inSameBubble = dist < 100;
  const isMutedByPrivate = (player.isPrivate || localIsPrivate) && !inSameBubble;
  
  // Do Not Disturb Mode: Block audio if either user is in busy status
  const isMutedByBusyStatus = (player.status === 'busy' || localStatus === 'busy') && !(inSameZone && dist < 50);
  
  // Show busy prompt when approaching a busy user
  useEffect(() => {
    if (player.status === 'busy' && inSameZone && dist < 100 && dist > 30) {
      setShowBusyPrompt(true);
    } else {
      setShowBusyPrompt(false);
    }
  }, [player.status, inSameZone, dist]);
  
  let volume = 0;
  // STRICT ZONE ISOLATION: 
  // Voice only travels if both users are in the same zone and not blocked by busy status
  if (inSameZone && !isMutedByPrivate && !isMutedByBusyStatus) {
    const normalizedDist = dist / VOICE_RADIUS;
    volume = normalizedDist < 1 ? 1 / (1 + Math.pow(normalizedDist * 2, 2)) : 0;
  }

  useEffect(() => {
    if (audioRef.current && player.stream) {
      audioRef.current.srcObject = player.stream;
      audioRef.current.volume = Math.max(0, Math.min(1, volume));
    }
  }, [player.stream, volume]);

  return (
    <motion.div
      animate={{ x: player.pos.x, y: player.pos.y, rotate: player.angle }}
      transition={springConfig}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="absolute z-[900] -ml-[26px] -mt-[26px] w-[52px] h-[52px]"
    >
      {/* Private Bubble Visual */}
      {player.isPrivate && (
        <div className="absolute inset-0 -m-4 rounded-full border-2 border-dashed border-white/20 bg-white/5 animate-pulse" />
      )}

      <AnimatePresence>
        {(isHovered || player.isSpeaking) && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black text-white px-3 py-1 rounded-full shadow-lg border border-white/10 flex items-center gap-2"
          >
            <div className={`w-2 h-2 rounded-full ${
              player.status === 'available' ? 'bg-emerald-500' : 
              player.status === 'busy' ? 'bg-amber-500' : 'bg-rose-500'
            }`} />
            <span className="text-[10px] font-black uppercase tracking-wider">{player.name}</span>
            {player.isSpeaking && (
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }} 
                transition={{ repeat: Infinity, duration: 0.5 }}
                className="w-2 h-2 bg-white rounded-full" 
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Private Conversation Indicator */}
      {player.isPrivate && (
        <motion.div 
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute -top-3 -right-3 bg-purple-600 text-white p-1.5 rounded-full shadow-lg"
          title="Private conversation in progress"
        >
          <Lock className="w-3 h-3" />
        </motion.div>
      )}

      {/* Busy Status Prompt */}
      <AnimatePresence>
        {showBusyPrompt && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute -top-20 left-1/2 -translate-x-1/2 whitespace-nowrap bg-amber-500 text-white px-3 py-2 rounded-xl shadow-lg border border-amber-400 flex items-center gap-2 z-[1000]"
          >
            <Bell className="w-3 h-3 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-wider">{player.name} is busy - won't hear you</span>
          </motion.div>
        )}
      </AnimatePresence>

      <Avatar 
        config={player.avatarConfig} 
        isWalking={player.isWalking} 
        isSpeaking={player.isSpeaking && canSeeSpeakingCue} 
        status={player.status}
        name={player.name}
        isSitting={false}
        sittingPose={null}
      />
      <audio ref={audioRef} autoPlay />
    </motion.div>
  );
});

export default function Workspace() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [showLanding, setShowLanding] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [highContrastMode, setHighContrastMode] = useState(false);
  const [textSize, setTextSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening' | 'night'>('morning');
  const [audioLevel, setAudioLevel] = useState(0);

  // Determine time of day based on current hour
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setTimeOfDay('morning');
    else if (hour >= 12 && hour < 17) setTimeOfDay('afternoon');
    else if (hour >= 17 && hour < 20) setTimeOfDay('evening');
    else setTimeOfDay('night');
  }, []);

  // Monitor audio level for visual feedback
  useEffect(() => {
    if (localStreamRef.current) {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(localStreamRef.current);
      source.connect(analyser);
      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(average / 255);
        requestAnimationFrame(updateAudioLevel);
      };

      updateAudioLevel();

      return () => {
        source.disconnect();
        audioContext.close();
      };
    }
  }, []);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [showStickyNotes, setShowStickyNotes] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{ id: string; text: string; sender: string; timestamp: number }>>([]);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [stickyNotes, setStickyNotes] = useState<Array<{ id: string; text: string; x: number; y: number; color: string }>>([]);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'fair' | 'poor'>('excellent');
  const [latency, setLatency] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig | null>(null);
  const [status, setStatus] = useState<'available' | 'busy' | 'focus'>('available');
  const [customStatus, setCustomStatus] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [pos, setPos] = useState<Point>({ x: 100, y: 700 });
  const [angle, setAngle] = useState(0);
  const [isWalking, setIsWalking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [currentZone, setCurrentZone] = useState("Lobby");
  const [keys, setKeys] = useState<Record<string, boolean>>({});
  const [remotePlayers, setRemotePlayers] = useState<Record<string, RemotePlayer>>({});
  const [roomUsers, setRoomUsers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isSitting, setIsSitting] = useState(false);
  const [sittingPose, setSittingPose] = useState<'chair' | 'desk' | null>(null);
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const [localEmote, setLocalEmote] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [isLightTheme, setIsLightTheme] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<keyof typeof OFFICE_THEMES>('modern');
  const [textToSpeechEnabled, setTextToSpeechEnabled] = useState(false);
  const [sharedFiles, setSharedFiles] = useState<Array<{ id: string; name: string; url: string; size: number; uploadedBy: string; timestamp: number }>>([]);
  const [isRoomHost, setIsRoomHost] = useState(false);
  const [showFileDropZone, setShowFileDropZone] = useState(false);

  const keysRef = useRef<Record<string, boolean>>({});
  const remotePlayersRef = useRef<Record<string, RemotePlayer>>({});
  const isWalkingRef = useRef(false);
  const angleRef = useRef(0);
  const currentZoneRef = useRef("Lobby");
  const tasksRef = useRef<Task[]>([]);
  const peersRef = useRef<Record<string, Peer.Instance>>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef<number>(null);
  const posRef = useRef<Point>({ x: 100, y: 700 });
  const lastEmitRef = useRef<number>(0);
  const seqRef = useRef<number>(0);
  const pendingInputs = useRef<{ seq: number; pos: Point }[]>([]);
  const userRef = useRef<ReturnType<typeof ref> | null>(null);
  const [showEmotePicker, setShowEmotePicker] = useState(false);

  // Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        setUserName(u.displayName || "Anonymous");
        
        // Load Profile
        const profileDoc = await getDoc(doc(db, 'users', u.uid));
        if (profileDoc.exists()) {
          const data = profileDoc.data();
          // Merge saved config with profile picture if needed
          const savedConfig = data.avatarConfig || {};
          setAvatarConfig({
            ...savedConfig,
            photoURL: u.photoURL || savedConfig.photoURL
          });
          if (data.lastPos) {
            posRef.current = data.lastPos;
            setPos(data.lastPos);
          }
        } else {
          // Default config for new user
          setAvatarConfig({
            photoURL: user?.photoURL
          });
        }

        // Load Tasks
        const q = query(collection(db, 'tasks'), where('uid', '==', u.uid));
        const unsubTasks = onSnapshot(q, (snapshot) => {
          const tks = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Task));
          setTasks(tks);
        });
        return () => unsubTasks();
      } else {
        setUser(null);
        setUserName(null);
        setAvatarConfig(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Save position and presence periodically
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      await setDoc(doc(db, 'users', user.uid), {
        lastPos: posRef.current,
        lastSeen: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }, 10000); // Every 10 seconds
    return () => clearInterval(interval);
  }, [user]);

  // Listen for shared files in the room
  useEffect(() => {
    if (!roomId) return;
    
    const q = query(collection(db, 'roomFiles'), where('roomId', '==', roomId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const files = snapshot.docs.map(d => d.data() as { id: string; name: string; url: string; size: number; uploadedBy: string; timestamp: number });
      setSharedFiles(files);
    });
    
    return () => unsubscribe();
  }, [roomId]);

  // Check if user is room host (creator)
  useEffect(() => {
    if (!roomId || !user) return;
    
    const checkHost = async () => {
      try {
        const roomDoc = await getDoc(doc(db, 'rooms', roomId));
        if (roomDoc.exists()) {
          const roomData = roomDoc.data();
          setIsRoomHost(roomData.createdBy === user.uid);
        }
      } catch (error) {
        console.error('Failed to check host status:', error);
      }
    };
    
    checkHost();
  }, [roomId, user]);

  // Update room activity timestamp for Cloud Functions cleanup
  useEffect(() => {
    if (!roomId) return;

    const updateRoomActivity = async () => {
      try {
        const roomRef = doc(db, 'rooms', roomId);
        await updateDoc(roomRef, {
          lastActivity: new Date().toISOString(),
          playerCount: Object.keys(remotePlayers).length + 1
        });
      } catch (error) {
        console.error('Failed to update room activity:', error);
      }
    };

    // Update activity every minute for Cloud Functions to track
    const activityInterval = setInterval(updateRoomActivity, 60000);
    updateRoomActivity(); // Initial update

    return () => {
      clearInterval(activityInterval);
    };
  }, [roomId, remotePlayers]);

  // Check if user has completed tutorial
  useEffect(() => {
    if (roomId && avatarConfig) {
      const tutorialCompleted = localStorage.getItem('tutorialCompleted');
      if (!tutorialCompleted) {
        // Show tutorial after a short delay to let the user see the office first
        setTimeout(() => {
          setShowTutorial(true);
        }, 1500);
      }
    }
  }, [roomId, avatarConfig]);

  // Load user data from localStorage on mount
  useEffect(() => {
    const savedUserName = localStorage.getItem('userName');
    const savedAvatarConfig = localStorage.getItem('avatarConfig');
    const savedRoomId = localStorage.getItem('roomId');
    
    if (savedUserName) setUserName(savedUserName);
    if (savedAvatarConfig) setAvatarConfig(JSON.parse(savedAvatarConfig));
    if (savedRoomId) {
      setRoomId(savedRoomId);
      setShowLanding(false);
    }
  }, []);

  // Reinitialize connection when all required data is present after refresh
  useEffect(() => {
    if (userName && roomId && avatarConfig && user?.uid && !isConnected) {
      // Connection will be established by the existing connection useEffect
      // This ensures connection is re-established after refresh
    }
  }, [userName, roomId, avatarConfig, user?.uid, isConnected]);

  // Save user data to localStorage when it changes
  useEffect(() => {
    if (userName) localStorage.setItem('userName', userName);
  }, [userName]);

  useEffect(() => {
    if (avatarConfig) localStorage.setItem('avatarConfig', JSON.stringify(avatarConfig));
  }, [avatarConfig]);

  useEffect(() => {
    if (roomId) localStorage.setItem('roomId', roomId);
  }, [roomId]);

  // Handle URL-based routing
  useEffect(() => {
    const path = location.pathname;
    const roomParam = searchParams.get('room');
    const avatarParam = searchParams.get('avatar');

    // Handle ?avatar=true query parameter
    if (avatarParam === 'true' && user) {
      setShowQuickStart(true);
      setShowLanding(false);
    }

    // Handle ?room=xyz query parameter
    if (roomParam && roomParam !== roomId) {
      setRoomId(roomParam);
      setShowLanding(false);
    }

    // Handle /room/:roomId route
    if (path.startsWith('/room/')) {
      const roomIdFromPath = path.split('/')[2];
      if (roomIdFromPath && roomIdFromPath !== roomId) {
        setRoomId(roomIdFromPath);
        setShowLanding(false);
      }
    }
    
    // Handle /join-create route
    if (path === '/join-create') {
      setShowQuickStart(true);
      setShowLanding(false);
    }
    
    // Handle root route
    if (path === '/' || path === '') {
      if (!roomId && !roomParam && avatarParam !== 'true') {
        setShowLanding(true);
      }
    }
  }, [location.pathname, roomId, searchParams, user]);

  // Update URL when room changes
  useEffect(() => {
    if (roomId) {
      navigate(`/room/${roomId}`, { replace: true });
    }
  }, [roomId, navigate]);

  // Monitor connection quality and latency
  useEffect(() => {
    if (!roomId) return;

    let isFirebaseConnected = false;
    
    // Listen to Firebase connection state
    const connectedRef = ref(rtdb, '.info/connected');
    const unsubscribe = onValue(connectedRef, (snapshot) => {
      isFirebaseConnected = snapshot.val() === true;
    });

    const interval = setInterval(() => {
      if (!isFirebaseConnected) {
        setConnectionQuality('poor');
        setLatency(999);
        return;
      }

      const startTime = performance.now();
      
      // Measure latency by writing and reading a test value
      const testRef = ref(rtdb, `rooms/${roomId}/connectionTest/${user?.uid || 'anonymous'}`);
      
      set(testRef, { timestamp: Date.now() })
        .then(() => {
          return get(testRef);
        })
        .then(() => {
          const endTime = performance.now();
          const measuredLatency = Math.round(endTime - startTime);
          setLatency(measuredLatency);

          // Determine connection quality based on latency
          if (measuredLatency < 50) {
            setConnectionQuality('excellent');
          } else if (measuredLatency < 150) {
            setConnectionQuality('good');
          } else if (measuredLatency < 300) {
            setConnectionQuality('fair');
          } else {
            setConnectionQuality('poor');
          }

          // Reset reconnection state if connection is good
          if (measuredLatency < 300 && isReconnecting) {
            setIsReconnecting(false);
            setReconnectAttempts(0);
          }

          // Clean up test data
          remove(testRef).catch(() => {});
        })
        .catch(() => {
          setConnectionQuality('poor');
          setLatency(999);

          // Trigger auto-reconnect
          if (!isReconnecting && reconnectAttempts < 5) {
            setIsReconnecting(true);
            setReconnectAttempts(prev => prev + 1);
            
            // Exponential backoff: 2s, 4s, 8s, 16s, 32s
            const backoffDelay = Math.min(2000 * Math.pow(2, reconnectAttempts), 32000);
            
            setTimeout(() => {
              setIsReconnecting(false);
              setReconnectAttempts(0);
            }, backoffDelay);
          }
        });
    }, 5000); // Check every 5 seconds

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [roomId, isReconnecting, reconnectAttempts, user]);

  const handleMinimapClick = (p: Point) => {
    // Check for collisions at target point
    if (checkCollision(p.x, p.y)) return;

    posRef.current = p;
    setPos(p);
  };

  const handleQuickTravel = (zoneName: string) => {
    const zone = ZONES.find(z => z.name === zoneName);
    if (!zone) return;

    // Calculate center of the zone
    const targetX = (zone.bounds.left + zone.bounds.right) / 2;
    const targetY = (zone.bounds.top + zone.bounds.bottom) / 2;
    const targetPos = { x: targetX, y: targetY };

    // Animate position to zone center
    const startX = posRef.current.x;
    const startY = posRef.current.y;
    const duration = 800;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      const newX = startX + (targetX - startX) * easeOut;
      const newY = startY + (targetY - startY) * easeOut;
      
      posRef.current = { x: newX, y: newY };
      setPos({ x: newX, y: newY });
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();

    // Update position in Firebase RTDB after animation
    setTimeout(() => {
      if (userRef.current) {
        update(userRef.current, {
          pos: targetPos,
          angle: angleRef.current,
          isWalking: false,
          zone: zoneName
        });
      }
    }, duration);
  };

  const handleAddTask = async (text: string) => {
    // Sanitize task text
    const sanitizedText = sanitizeText(text);
    
    // Optimistic update: add task immediately to UI
    const tempId = `temp-${Date.now()}`;
    const tempTask = { id: tempId, text: sanitizedText, done: false, zone: currentZone };
    setTasks(prev => [...prev, tempTask]);

    if (user) {
      try {
        await addDoc(collection(db, 'tasks'), {
          uid: user.uid,
          text: sanitizedText,
          done: false,
          zone: currentZone,
          createdAt: new Date().toISOString()
        });
        // Remove temp task after successful add (Firebase listener will add the real one)
        setTasks(prev => prev.filter(t => t.id !== tempId));
      } catch (error) {
        // Revert optimistic update on error
        setTasks(prev => prev.filter(t => t.id !== tempId));
        console.error('Failed to add task:', error);
      }
    }
  };

  const handleToggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));

    if (user) {
      try {
        await updateDoc(doc(db, 'tasks', id), { done: !task.done });
      } catch (error) {
        // Revert on error
        setTasks(prev => prev.map(t => t.id === id ? { ...t, done: task.done } : t));
        console.error('Failed to toggle task:', error);
      }
    }
  };

  const handleDeleteTask = async (id: string) => {
    // Optimistic update
    setTasks(prev => prev.filter(t => t.id !== id));

    if (user) {
      try {
        await deleteDoc(doc(db, 'tasks', id));
      } catch (error) {
        // Revert on error - we'd need to restore the task but for now just log
        console.error('Failed to delete task:', error);
      }
    }
  };

  const handleEditTask = async (id: string, text: string) => {
    if (user) {
      await updateDoc(doc(db, 'tasks', id), { text });
    } else {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, text } : t));
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      const sanitizedMessage = sanitizeUserInput(chatInput.trim());
      setLocalMessage(sanitizedMessage);
      if (userRef.current) {
        update(userRef.current, { message: sanitizedMessage });
      }
      // Save to chat history
      setChatHistory(prev => [...prev, {
        id: Date.now().toString(),
        text: sanitizedMessage,
        sender: userName || "Anonymous",
        timestamp: Date.now()
      }]);
      // Speak the message if text-to-speech is enabled
      speakText(sanitizedMessage);
      setChatInput("");
      // Clear message after 5 seconds
      setTimeout(() => {
        setLocalMessage(null);
        if (userRef.current) {
          update(userRef.current, { message: null });
        }
      }, 5000);
    }
  };

  const handleDeleteChatMessage = (id: string) => {
    setChatHistory(prev => prev.filter(m => m.id !== id));
  };

  const handleAddStickyNote = (note: Omit<{ id: string; text: string; x: number; y: number; color: string }, 'id'>) => {
    setStickyNotes(prev => [...prev, { ...note, id: Date.now().toString() }]);
  };

  const handleUpdateStickyNote = (id: string, text: string) => {
    setStickyNotes(prev => prev.map(n => n.id === id ? { ...n, text } : n));
  };

  const handleDeleteStickyNote = (id: string) => {
    setStickyNotes(prev => prev.filter(n => n.id !== id));
  };

  const handleUpdateStickyNotePosition = (id: string, x: number, y: number) => {
    setStickyNotes(prev => prev.map(n => n.id === id ? { ...n, x, y } : n));
  };

  const handleSendEmote = (emote: string) => {
    setLocalEmote(emote);
    if (userRef.current) {
      update(userRef.current, { emote });
    }
    setShowEmotePicker(false);
    setTimeout(() => {
      setLocalEmote(null);
      if (userRef.current) {
        update(userRef.current, { emote: null });
      }
    }, 2000);
  };

  const handleTogglePrivate = () => {
    const next = !isPrivate;
    setIsPrivate(next);
    if (userRef.current) {
      update(userRef.current, { status, isPrivate: next });
    }
  };

  const handleChangeStatus = (s: 'available' | 'busy' | 'focus') => {
    setStatus(s);
    if (userRef.current) {
      update(userRef.current, { status: s, isPrivate });
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!user || !roomId) return;
    
    try {
      // Sanitize file name
      const sanitizedName = sanitizeFileName(file.name);
      const fileRef = storageRef(storage, `rooms/${roomId}/${Date.now()}-${sanitizedName}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      
      const fileData = {
        id: Date.now().toString(),
        name: sanitizedName,
        url,
        size: file.size,
        uploadedBy: user.displayName || 'Anonymous',
        timestamp: Date.now()
      };
      
      // Save to Firestore
      await addDoc(collection(db, 'roomFiles'), {
        ...fileData,
        roomId,
        uid: user.uid
      });
      
      setSharedFiles(prev => [...prev, fileData]);
    } catch (error) {
      console.error('File upload failed:', error);
    }
  };

  const handleDeleteFile = async (fileId: string, fileUrl: string) => {
    try {
      // Delete from Storage
      const fileRef = storageRef(storage, fileUrl);
      await deleteObject(fileRef);
      
      // Delete from Firestore
      const q = query(collection(db, 'roomFiles'), where('id', '==', fileId));
      const snapshot = await getDocs(q);
      snapshot.docs.forEach(doc => deleteDoc(doc.ref));
      
      setSharedFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (error) {
      console.error('File deletion failed:', error);
    }
  };

  const handleEndMeeting = async () => {
    if (!roomId || !isRoomHost) return;
    
    try {
      // Delete all shared files
      for (const file of sharedFiles) {
        await handleDeleteFile(file.id, file.url);
      }
      
      // Delete room from Firestore
      await deleteDoc(doc(db, 'rooms', roomId));
      
      // Clear RTDB room data
      await remove(ref(rtdb, `rooms/${roomId}`));
      
      // Clear localStorage
      localStorage.removeItem('roomId');
      
      // Navigate to home
      setRoomId(null);
      setShowLanding(true);
    } catch (error) {
      console.error('Failed to end meeting:', error);
    }
  };

  const speakText = (text: string) => {
    if (!textToSpeechEnabled || !('speechSynthesis' in window)) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    window.speechSynthesis.speak(utterance);
  };

  const exportTasksAsTXT = () => {
    const completedTasks = tasks.filter(t => t.done);
    const pendingTasks = tasks.filter(t => !t.done);
    
    let content = "=== TASK EXPORT ===\n\n";
    content += `Export Date: ${new Date().toLocaleString()}\n\n`;
    content += `COMPLETED TASKS (${completedTasks.length}):\n`;
    content += "------------------------\n";
    completedTasks.forEach((task, i) => {
      content += `${i + 1}. [✓] ${task.text}\n`;
    });
    content += `\n`;
    content += `PENDING TASKS (${pendingTasks.length}):\n`;
    content += "------------------------\n";
    pendingTasks.forEach((task, i) => {
      content += `${i + 1}. [ ] ${task.text}\n`;
    });
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tasks_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportTasksAsPDF = () => {
    // Simple PDF export using window.print with styled content
    const completedTasks = tasks.filter(t => t.done);
    const pendingTasks = tasks.filter(t => !t.done);
    
    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Tasks Export</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; }
              h1 { color: #333; }
              .completed { color: #22c55e; }
              .pending { color: #f59e0b; }
              .task { margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
            </style>
          </head>
          <body>
            <h1>Task Export</h1>
            <p><strong>Export Date:</strong> ${new Date().toLocaleString()}</p>
            <h2>Completed Tasks (${completedTasks.length})</h2>
            ${completedTasks.map(task => `<div class="task completed">✓ ${task.text}</div>`).join('')}
            <h2>Pending Tasks (${pendingTasks.length})</h2>
            ${pendingTasks.map(task => `<div class="task pending">○ ${task.text}</div>`).join('')}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const checkCollision = (nx: number, ny: number) => {
    const r = 18;
    if (nx < r || nx > OFFICE_WIDTH - r || ny < r || ny > OFFICE_HEIGHT - r) return true;
    const p = { left: nx - r, right: nx + r, top: ny - r, bottom: ny + r };
    if (WALLS.some(w => !(p.right < w.left || p.left > w.right || p.bottom < w.top || p.top > w.bottom))) return true;
    
    // Player collision
    const otherPlayers = Object.values(remotePlayersRef.current) as RemotePlayer[];
    if (otherPlayers.some(op => Math.hypot(nx - op.pos.x, ny - op.pos.y) < 40)) return true;

    return false;
  };

  const initVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      // Initially mute
      stream.getAudioTracks().forEach(track => track.enabled = false);
      setMicError(null);
    } catch (err) {
      console.error("Mic access denied", err);
      setMicError("Microphone access denied. Proximity voice will not work.");
    }
  };

  const createPeer = (userId: string, socketId: string, stream: MediaStream) => {
    const peer = new Peer({ initiator: true, trickle: false, stream });
    peer.on("signal", (signal) => {
      if (user?.uid && roomId) {
        update(ref(rtdb, `rooms/${roomId}/signals/${socketId}/${user.uid}`), signal);
      }
    });
    peer.on("stream", (remoteStream) => {
      setRemotePlayers(prev => ({
        ...prev,
        [socketId]: { ...prev[socketId], stream: remoteStream }
      }));
    });
    return peer;
  };

  const addPeer = (incomingSignal: any, socketId: string, stream: MediaStream) => {
    const peer = new Peer({ initiator: false, trickle: false, stream });
    peer.on("signal", (signal) => {
      if (user?.uid && roomId) {
        update(ref(rtdb, `rooms/${roomId}/signals/${socketId}/${user.uid}`), signal);
      }
    });
    peer.on("stream", (remoteStream) => {
      setRemotePlayers(prev => ({
        ...prev,
        [socketId]: { ...prev[socketId], stream: remoteStream }
      }));
    });
    peer.signal(incomingSignal);
    return peer;
  };

  useEffect(() => {
    if (!userName || !avatarConfig || !roomId || !user?.uid) return;

    console.log("Connecting to Firebase RTDB...", { userName, roomId, userId: user.uid });

    const userId = user.uid;
    const userRefPath = ref(rtdb, `rooms/${roomId}/users/${userId}`);
    userRef.current = userRefPath;
    const roomUsersRefPath = ref(rtdb, `rooms/${roomId}/users`);
    const signalsRefPath = ref(rtdb, `rooms/${roomId}/signals/${userId}`);

    // Initialize voice and set initial user data
    initVoice().then(() => {
      console.log("Voice initialized, setting user presence in RTDB...");
      set(userRefPath, {
        name: userName,
        pos: posRef.current,
        angle: 0,
        avatarConfig,
        status,
        isPrivate,
        zone: currentZone,
        isWalking: false,
        isSpeaking: false
      });

      // Set onDisconnect to remove user when they leave
      onDisconnect(userRefPath).remove();
    });

    // Listen for all users in the room
    const usersUnsubscribe = onValue(roomUsersRefPath, (snapshot) => {
      const users = snapshot.val();
      if (!users) return;

      const others: Record<string, any> = {};
      Object.entries(users).forEach(([id, data]: [string, any]) => {
        if (id !== userId) {
          others[id] = data;
        }
      });

      // Check for new users
      Object.keys(others).forEach(id => {
        if (!remotePlayersRef.current[id] && localStreamRef.current) {
          console.log("New user detected, initiating peer:", id);
          const peer = createPeer(id, id, localStreamRef.current!);
          peersRef.current[id] = peer;
        }
      });

      // Check for users that left
      Object.keys(remotePlayersRef.current).forEach(id => {
        if (!others[id]) {
          console.log("User left:", id);
          if (peersRef.current[id]) {
            (peersRef.current[id] as any).destroy();
            delete peersRef.current[id];
          }
          delete remotePlayersRef.current[id];
          setRemotePlayers(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        }
      });

      // Update remote players with current data
      Object.entries(others).forEach(([id, data]: [string, any]) => {
        const prevPlayer = remotePlayersRef.current[id];
        const zone = ZONES.find(z => 
          data.pos.x >= z.bounds.left && data.pos.x <= z.bounds.right && 
          data.pos.y >= z.bounds.top && data.pos.y <= z.bounds.bottom
        );

        const updatedPlayer = {
          id,
          name: data.name,
          pos: data.pos,
          angle: data.angle || 180,
          isWalking: data.isWalking || false,
          isSpeaking: data.isSpeaking || false,
          status: data.status || 'available',
          isPrivate: data.isPrivate || false,
          zone: zone?.name || "Lobby",
          avatarConfig: data.avatarConfig,
          message: data.message,
          emote: data.emote,
          prevPos: prevPlayer?.pos,
          lastUpdate: Date.now()
        };

        remotePlayersRef.current[id] = updatedPlayer;
        setRemotePlayers(prev => ({ ...prev, [id]: updatedPlayer }));
      });

      setIsConnected(true);
    });

    // Listen for WebRTC signals
    const signalsUnsubscribe = onValue(signalsRefPath, (snapshot) => {
      const signals = snapshot.val();
      if (!signals) return;

      Object.entries(signals).forEach(([fromId, signal]: [string, any]) => {
        console.log("Received signal from:", fromId);
        if (peersRef.current[fromId]) {
          peersRef.current[fromId].signal(signal);
        } else if (localStreamRef.current) {
          console.log("Creating non-initiator peer for:", fromId);
          const peer = addPeer(signal, fromId, localStreamRef.current!);
          peersRef.current[fromId] = peer;
        }
        // Remove signal after processing
        update(ref(rtdb, `rooms/${roomId}/signals/${userId}`), { [fromId]: null });
      });
    });

    // Listen for activity status updates
    const activityInterval = setInterval(() => {
      if (userRefPath) {
        update(userRefPath, { lastActivity: serverTimestamp() });
      }
    }, 30000);

    return () => {
      console.log("Cleaning up Firebase RTDB connection...");
      usersUnsubscribe();
      signalsUnsubscribe();
      clearInterval(activityInterval);

      // Remove user from room
      remove(userRefPath);

      Object.values(peersRef.current).forEach(p => (p as any).destroy());
      peersRef.current = {};
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      setIsConnected(false);
    };
  }, [userName, roomId, user?.uid]);

  // Separate useEffect to update avatarConfig without restarting connection
  useEffect(() => {
    if (!user?.uid || !roomId || !avatarConfig || !userRef.current) return;

    update(userRef.current, {
      avatarConfig,
      name: userName,
      status,
      isPrivate
    });
  }, [avatarConfig, status, userName, isPrivate]);

  const updateZone = (x: number, y: number) => {
    const zone = ZONES.find(z => 
      x >= z.bounds.left && x <= z.bounds.right && 
      y >= z.bounds.top && y <= z.bounds.bottom
    );
    if (zone && zone.name !== currentZone) setCurrentZone(zone.name);
  };

  const loop = useCallback(() => {
    let dx = 0;
    let dy = 0;

    const keys = keysRef.current;
    if (keys['w'] || keys['arrowup']) dy -= SPEED;
    if (keys['s'] || keys['arrowdown']) dy += SPEED;
    if (keys['a'] || keys['arrowleft']) dx -= SPEED;
    if (keys['d'] || keys['arrowright']) dx += SPEED;

    const currentlyWalking = dx !== 0 || dy !== 0;

    if (currentlyWalking) {
      if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }

      const nextX = posRef.current.x + dx;
      const nextY = posRef.current.y + dy;

      let finalX = posRef.current.x;
      let finalY = posRef.current.y;

      if (!checkCollision(nextX, posRef.current.y)) finalX = nextX;
      if (!checkCollision(posRef.current.x, nextY)) finalY = nextY;

      posRef.current = { x: finalX, y: finalY };
      setPos({ ...posRef.current });
      
      const zone = ZONES.find(z => 
        finalX >= z.bounds.left && finalX <= z.bounds.right && 
        finalY >= z.bounds.top && finalY <= z.bounds.bottom
      );
      const newZoneName = zone?.name || "Lobby";
      if (newZoneName !== currentZoneRef.current) {
        currentZoneRef.current = newZoneName;
        setCurrentZone(newZoneName);
      }

      const moveAngle = Math.atan2(dy, dx) * 180 / Math.PI;
      const newAngle = moveAngle + 90;
      angleRef.current = newAngle;
      setAngle(newAngle);

      // Client-side prediction: Update local state immediately
      // and queue for server reconciliation
      const currentSeq = seqRef.current++;
      pendingInputs.current.push({ seq: currentSeq, pos: posRef.current });

      // Throttle updates to 20Hz to reduce network jitter and traffic
      if (Date.now() - lastEmitRef.current > 50) {
        if (userRef.current) {
          update(userRef.current, {
            pos: posRef.current,
            angle: newAngle,
            isWalking: true,
            zone: currentZoneRef.current
          });
        }
        lastEmitRef.current = Date.now();
      }
    }

    if (isWalkingRef.current !== currentlyWalking) {
      isWalkingRef.current = currentlyWalking;
      setIsWalking(currentlyWalking);
      if (!currentlyWalking && userRef.current) {
        update(userRef.current, {
          pos: posRef.current,
          angle: angleRef.current,
          isWalking: false,
          zone: currentZoneRef.current
        });
      }
    }

    requestRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      
      const key = e.key.toLowerCase();
      keysRef.current[key] = true;

      // Keyboard Shortcuts
      if (key === 'escape') {
        e.preventDefault();
        setShowSettings(prev => !prev);
      }
      if (key === 'c') {
        e.preventDefault();
        document.getElementById('chat-input')?.focus();
      }
      if (key === '1') setLocalEmote("HELLO");
      if (key === '2') setLocalEmote("HOT");
      if (key === '3') setLocalEmote("LOVE");
      if (key === '4') setLocalEmote("LAUGH");

      if (key === 'e') {
        setTasks(prev => prev.map(t => {
          if (!t.done && t.zone === currentZoneRef.current) return { ...t, done: true };
          return t;
        }));
      }

      if (key === 'f') {
        // Toggle sitting when near a chair/desk
        setIsSitting(prev => !prev);
        setSittingPose(prev => prev === 'chair' ? null : 'chair');
      }

      if (key === ' ' && localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(t => t.enabled = true);
        setIsSpeaking(true);
        if (userRef.current) {
          update(userRef.current, { isSpeaking: true });
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysRef.current[key] = false;
      
      // Reset angle to 0 (up) when movement keys are released
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)) {
        const movementKeys = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'];
        const anyKeyPressed = movementKeys.some(k => keysRef.current[k]);
        if (!anyKeyPressed) {
          angleRef.current = 0;
          setAngle(0);
          if (userRef.current) {
            update(userRef.current, {
              pos: posRef.current,
              angle: 0,
              isWalking: false,
              zone: currentZoneRef.current
            });
          }
        }
      }

      if (key === ' ' && localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(t => t.enabled = false);
        setIsSpeaking(false);
        if (userRef.current) {
          update(userRef.current, { isSpeaking: false });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    requestRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [loop]);

  const handleLogout = async () => {
    // Clear localStorage
    localStorage.removeItem('userName');
    localStorage.removeItem('avatarConfig');
    localStorage.removeItem('roomId');
    await signOut(auth);
    window.location.reload();
  };

  const completedCount = tasks.filter(t => t.done).length;

  const handleStart = async () => {
    if (!user) {
      try {
        await signInWithPopup(auth, googleProvider);
      } catch (err) {
        console.error("Login failed", err);
        return;
      }
    }
    setShowLanding(false);
  };

  const handleJoin = async (name: string, room: string, avatar?: AvatarConfig, status?: string, password?: string) => {
    // Sanitize inputs
    const sanitizedName = sanitizeText(name);
    const sanitizedRoom = sanitizeRoomId(room);
    
    let currentUser = user;
    if (!currentUser) {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        currentUser = result.user;
        setUser(result.user);
        setUserName(result.user.displayName || sanitizedName);
      } catch (err) {
        console.error("Auth failed", err);
        setUserName(sanitizedName);
      }
    } else {
      setUserName(sanitizedName);
    }

    if (password) {
      const roomDoc = await getDoc(doc(db, 'rooms', room));
      if (roomDoc.exists() && roomDoc.data().password && roomDoc.data().password !== password) {
        alert("Incorrect room password!");
        return;
      }
    }

    if (avatar) setAvatarConfig(avatar);
    if (status) setStatus(status as any);
    setRoomId(room);

    // Update Firestore with current room and presence
    if (currentUser) {
      await setDoc(doc(db, 'users', currentUser.uid), {
        roomId: room,
        status: status || 'available',
        lastSeen: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
    
    initVoice();
  };

  const handleTutorialComplete = () => {
    localStorage.setItem('tutorialCompleted', 'true');
    setShowTutorial(false);
    setTutorialStep(0);
  };

  const handleTutorialNext = () => {
    setTutorialStep(prev => Math.min(prev + 1, 7));
  };

  const handleTutorialPrevious = () => {
    setTutorialStep(prev => Math.max(prev - 1, 0));
  };

  const handleTutorialSkip = () => {
    handleTutorialComplete();
  };

  if (showLanding && !roomId) return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
    </div>}>
      <LandingPage onStart={handleStart} user={user} />
    </Suspense>
  );
  if (showQuickStart) return <QuickStartWizard isOpen={showQuickStart} onClose={() => setShowQuickStart(false)} onComplete={handleJoin} user={user} onJoin={handleJoin} />;
  if (!userName || !roomId) return <EntryModal onJoin={handleJoin} user={user} />;
  if (!avatarConfig) return <SimpleAvatarModal onComplete={setAvatarConfig} user={user} userName={userName} />;

  return (
    <div className={`min-h-screen bg-[#000000] flex items-center justify-center overflow-hidden font-sans selection:bg-white/20 ${
      textSize === 'small' ? 'text-sm' : textSize === 'large' ? 'text-lg' : 'text-base'
    } ${isLightTheme ? 'invert' : ''}`}>
      <StickyNotesPanel
        isOpen={showStickyNotes}
        onClose={() => setShowStickyNotes(false)}
        notes={stickyNotes}
        onAddNote={handleAddStickyNote}
        onUpdateNote={handleUpdateStickyNote}
        onDeleteNote={handleDeleteStickyNote}
        onUpdatePosition={handleUpdateStickyNotePosition}
      />
      <FileDropZone
        isOpen={showFileDropZone}
        onClose={() => setShowFileDropZone(false)}
        files={sharedFiles}
        onUpload={handleFileUpload}
        onDelete={handleDeleteFile}
        isHost={isRoomHost}
        onEndMeeting={handleEndMeeting}
      />
      <ChatHistoryPanel
        isOpen={showChatHistory}
        onClose={() => setShowChatHistory(false)}
        messages={chatHistory}
        searchQuery={chatSearchQuery}
        onSearchChange={setChatSearchQuery}
        onDeleteMessage={handleDeleteChatMessage}
      />
      <SideChatPanel 
        messages={chatHistory}
        userName={userName}
      />
      <TutorialModal
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        onComplete={handleTutorialComplete}
        currentStep={tutorialStep}
        onNext={handleTutorialNext}
        onPrevious={handleTutorialPrevious}
        onSkip={handleTutorialSkip}
      />

      {/* Fullscreen Reaction Overlay */}
      <AnimatePresence>
        {localEmote && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[5000] flex items-center justify-center pointer-events-none"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0]
              }}
              transition={{ 
                duration: 2,
                repeat: 1,
                ease: "easeInOut"
              }}
              className="text-[200px]"
            >
              {localEmote}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        userName={userName}
        roomId={roomId}
        onLogout={handleLogout}
        highContrastMode={highContrastMode}
        onToggleHighContrast={() => setHighContrastMode(!highContrastMode)}
        selectedTheme={selectedTheme}
        onSetTheme={setSelectedTheme}
        textSize={textSize}
        onSetTextSize={setTextSize}
      />
      {/* Connection Overlay */}
      <AnimatePresence>
        {!isConnected && roomId && userName && avatarConfig && user?.uid && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <DotLoader
                  frames={[
                    [14, 7, 0, 8, 6, 13, 20],
                    [14, 7, 13, 20, 16, 27, 21],
                    [14, 20, 27, 21, 34, 24, 28],
                    [27, 21, 34, 28, 41, 32, 35],
                    [34, 28, 41, 35, 48, 40, 42],
                    [34, 28, 41, 35, 48, 42, 46],
                    [34, 28, 41, 35, 48, 42, 38],
                    [34, 28, 41, 35, 48, 30, 21],
                    [34, 28, 41, 48, 21, 22, 14],
                    [34, 28, 41, 21, 14, 16, 27],
                    [34, 28, 21, 14, 10, 20, 27],
                    [28, 21, 14, 4, 13, 20, 27],
                    [28, 21, 14, 12, 6, 13, 20],
                    [28, 21, 14, 6, 13, 20, 11],
                    [28, 21, 14, 6, 13, 20, 10],
                    [14, 6, 13, 20, 9, 7, 21],
                  ]}
                  className="gap-0.5"
                  dotClassName="bg-white/15 [&.active]:bg-white size-1.5"
                />
              </div>
              <p className="text-white font-black text-sm">Connecting to workspace...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mic Status Indicator */}
      <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-[1000] flex flex-col items-center gap-2 pointer-events-none">
        {micError ? (
          <div className="bg-rose-500 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2">
            <MicOff className="w-3 h-3" />
            {micError}
          </div>
        ) : (
          <motion.div 
            animate={isSpeaking ? { scale: [1, 1.05, 1] } : {}}
            className={`px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 transition-all pointer-events-auto ${isSpeaking ? 'bg-emerald-500 text-white' : 'bg-black/80 backdrop-blur text-white/40'}`}
          >
            {isSpeaking ? <Mic className="w-4 h-4 animate-pulse" /> : <MicOff className="w-4 h-4" />}
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">
              {isSpeaking ? 'Speaking' : 'Hold SPACE to Talk'}
            </span>
          </motion.div>
        )}
      </div>

      <HUD 
        zone={currentZone} 
        tasks={tasks} 
        completedCount={completedCount} 
        pos={pos} 
        roomId={roomId} 
        roomUsers={roomUsers}
        remotePlayers={remotePlayers}
        onAddTask={handleAddTask}
        onToggleTask={handleToggleTask}
        onDeleteTask={handleDeleteTask}
        onEditTask={handleEditTask}
        onOpenSettings={() => setShowSettings(true)}
        onMinimapClick={handleMinimapClick}
        onOpenChatHistory={() => setShowChatHistory(true)}
        onOpenStickyNotes={() => setShowStickyNotes(true)}
        stickyNotes={stickyNotes}
        connectionQuality={connectionQuality}
        latency={latency}
        onQuickTravel={handleQuickTravel}
        isLightTheme={isLightTheme}
        onToggleTheme={() => setIsLightTheme(!isLightTheme)}
        onOpenFileDropZone={() => setShowFileDropZone(true)}
        sharedFilesCount={sharedFiles.length}
        textToSpeechEnabled={textToSpeechEnabled}
        onToggleTextToSpeech={() => setTextToSpeechEnabled(!textToSpeechEnabled)}
        onExportTasksTXT={exportTasksAsTXT}
        onExportTasksPDF={exportTasksAsPDF}
        isRoomHost={isRoomHost}
        onEndMeeting={handleEndMeeting}
      />
      <UserMenu name={userName} playersCount={Object.keys(remotePlayers).length + 1} />
      
      <div 
        id="office"
        className="relative border-[12px] border-black rounded-lg overflow-hidden transition-all duration-1000"
        style={{ 
          width: OFFICE_WIDTH, 
          height: OFFICE_HEIGHT, 
          backgroundImage: `radial-gradient(${OFFICE_THEMES[selectedTheme].gridColor} 1.5px, transparent 1.5px)`, 
          backgroundSize: '40px 40px',
          backgroundColor: OFFICE_THEMES[selectedTheme].background,
          boxShadow: OFFICE_THEMES[selectedTheme].shadow
        }}
      >
        {/* Walls */}
        {WALLS.map((w, i) => (
          <div 
            key={i} 
            className="absolute bg-black z-10 shadow-sm"
            style={{ left: w.left, top: w.top, width: w.right - w.left, height: w.bottom - w.top }}
          />
        ))}

        {/* Room Labels */}
        <div className="absolute top-8 left-20 text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] pointer-events-none">Executive 01</div>
        <div className="absolute top-8 left-[380px] text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] pointer-events-none">Executive 02</div>
        <div className="absolute top-8 left-[680px] text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] pointer-events-none">Executive 03</div>
        <div className="absolute top-8 left-[980px] text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] pointer-events-none">Executive 04</div>

        {/* Furniture Layer */}
        <FurnitureLayer currentZone={currentZone} />

        {/* Other Players */}
        {(Object.values(remotePlayers) as RemotePlayer[]).map(player => (
          <RemotePlayerAvatar key={player.id} player={player} localPos={pos} localIsPrivate={isPrivate} localZone={currentZone} localStatus={status} />
        ))}

        {/* Doors */}
        <Doors pos={pos} />

        {/* Character Avatar */}
        <motion.div
          animate={{ x: pos.x, y: pos.y, rotate: angle }}
          transition={{ type: 'spring', damping: 25, stiffness: 120, mass: 0.5 }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="absolute z-[1000] -ml-[26px] -mt-[26px] w-[52px] h-[52px]"
        >
          {/* Voice Range Indicator - Always visible on hover, speaking makes it more prominent */}
          <AnimatePresence>
            {(isHovered || isSpeaking) && (
              <motion.div 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="absolute rounded-full pointer-events-none"
                style={{ 
                  width: VOICE_RADIUS * 2, 
                  height: VOICE_RADIUS * 2, 
                  left: -VOICE_RADIUS + 20, 
                  top: -VOICE_RADIUS + 20,
                  background: isSpeaking 
                    ? 'radial-gradient(circle, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.08) 50%, transparent 100%)'
                    : 'radial-gradient(circle, rgba(100, 116, 139, 0.1) 0%, rgba(100, 116, 139, 0.03) 50%, transparent 100%)',
                  border: isSpeaking 
                    ? '2px solid rgba(34, 197, 94, 0.4)'
                    : '2px dashed rgba(100, 116, 139, 0.3)'
                }}
              >
                {/* Voice range label */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[8px] font-bold text-white/60 uppercase tracking-wider bg-black/50 px-2 py-1 rounded-full">
                  Voice Range
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Private Bubble Visual */}
          {isPrivate && (
            <div className="absolute inset-0 -m-4 rounded-full border-2 border-dashed border-black/40 bg-black/5 animate-pulse" />
          )}

          <AnimatePresence>
            {(isHovered || isSpeaking) && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black text-white px-3 py-1 rounded-full shadow-lg border border-white/10 flex items-center gap-2"
              >
                <div className={`w-2 h-2 rounded-full ${
                  status === 'available' ? 'bg-emerald-500' : 
                  status === 'busy' ? 'bg-amber-500' : 'bg-rose-500'
                }`} />
                <span className="text-[10px] font-black uppercase tracking-wider">{userName}</span>
                {isSpeaking && <Mic className="w-3 h-3" />}
              </motion.div>
            )}
          </AnimatePresence>

          <Avatar 
            config={avatarConfig} 
            isWalking={isWalking} 
            isSpeaking={isSpeaking} 
            status={status}
            isLocal
            name={userName}
            isSitting={isSitting}
            sittingPose={sittingPose}
          />
        </motion.div>
      </div>

      {/* Chat & Emote Controls */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-4 pointer-events-auto">
        <form onSubmit={handleSendChat} className="flex items-center gap-2 bg-black/90 backdrop-blur-md p-2 rounded-2xl border border-white/10 shadow-2xl">
          <input 
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Type a message..."
            className="bg-transparent border-none text-white text-sm font-bold px-4 py-2 focus:outline-none w-48 md:w-64"
          />
          <button type="submit" className="p-2 bg-white text-black rounded-xl hover:bg-slate-200 transition-colors">
            <Send className="w-4 h-4" />
          </button>
        </form>

        <div className="relative">
          <button 
            onClick={() => setShowEmotePicker(!showEmotePicker)}
            className="p-4 bg-black/90 backdrop-blur-md text-white rounded-2xl border border-white/10 shadow-2xl hover:bg-slate-900 transition-all"
          >
            <Smile className="w-5 h-5" />
          </button>
          
          <AnimatePresence>
            {showEmotePicker && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: -10 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 bg-black/95 backdrop-blur-xl p-4 rounded-[32px] border border-white/10 shadow-2xl flex gap-3"
              >
                <ReactionPicker onSelect={handleSendEmote} onClose={() => setShowEmotePicker(false)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Push to Talk Hint & Status Controls */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 pointer-events-auto">
        <div className="bg-black p-1.5 rounded-2xl flex items-center gap-1 border border-white/10 shadow-2xl">
          {(['available', 'busy', 'focus'] as const).map(s => (
            <button
              key={s}
              onClick={() => handleChangeStatus(s)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${status === s ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}
            >
              {s}
            </button>
          ))}
          <div className="w-px h-4 bg-white/10 mx-1" />
          <button
            onClick={handleTogglePrivate}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isPrivate ? 'bg-rose-600 text-white' : 'text-white/40 hover:text-white'}`}
          >
            <ShieldCheck className="w-3 h-3" />
            {isPrivate ? 'Private' : 'Public'}
          </button>
        </div>

        {/* Custom Status Presets */}
        <div className="bg-black p-1.5 rounded-2xl flex items-center gap-1 border border-white/10 shadow-2xl">
          {[
            { label: "In meeting", reaction: "CALENDAR" },
            { label: "Lunch break", reaction: "FOOD" },
            { label: "Coffee break", reaction: "COFFEE" },
            { label: "BRB", reaction: "CLOCK" }
          ].map(preset => (
            <button
              key={preset.label}
              onClick={() => {
                setCustomStatus(preset.label);
                handleChangeStatus('busy');
              }}
              className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-white/40 hover:text-white flex items-center gap-1"
              title={preset.label}
            >
              {preset.reaction}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Doors({ pos }: { pos: Point }) {
  const swingDoors = [
    { x: 120, y: 208, w: 80, h: 14 },
    { x: 420, y: 208, w: 80, h: 14 },
    { x: 720, y: 208, w: 80, h: 14 },
    { x: 1020, y: 208, w: 80, h: 14 },
  ];

  return (
    <>
      {swingDoors.map((d, i) => {
        const dist = Math.hypot(pos.x - (d.x + d.w/2), pos.y - (d.y + d.h/2));
        const isOpen = dist < 95;
        return (
          <motion.div
            key={i}
            animate={{ rotate: isOpen ? -90 : 0 }}
            className="absolute bg-black z-20 origin-left"
            style={{ left: d.x, top: d.y, width: d.w, height: d.h }}
          />
        );
      })}
      
      {/* Sliding Pantry Door */}
      <PantryDoor pos={pos} />
    </>
  );
}

function PantryDoor({ pos }: { pos: Point }) {
  const cx = 850 + 7;
  const cy = 560 + 40;
  const dist = Math.hypot(pos.x - cx, pos.y - cy);
  const isOpen = dist < 120;

  return (
    <div className="absolute z-20 flex flex-col overflow-hidden bg-black/10" style={{ left: 848, top: 560, width: 14, height: 80 }}>
      <motion.div 
        animate={{ y: isOpen ? '-100%' : '0%' }}
        className="flex-1 bg-black border-b border-white/10"
      />
      <motion.div 
        animate={{ y: isOpen ? '100%' : '0%' }}
        className="flex-1 bg-black border-t border-white/10"
      />
    </div>
  );
}

function FurnitureLayer({ currentZone }: { currentZone: string }) {
  return (
    <div className="pointer-events-none">
      {/* Cabins */}
      {[50, 350, 650, 950].map(x => (
        <React.Fragment key={x}>
          <Desk x={x} y={65} w={140} h={70} hasLaptop />
          <Chair x={x + 50} y={145} rot={0} />
        </React.Fragment>
      ))}

      {/* Central Hub Cluster */}
      <CentralHub />

      {/* Reception */}
      <Desk x={50} y={680} w={50} h={100} />
      <Chair x={115} y={705} rot={270} />

      {/* Pantry Furniture */}
      <Desk x={950} y={640} w={120} h={75} />
      <Chair x={895} y={655} rot={90} />
      <Chair x={1085} y={655} rot={270} />
    </div>
  );
}

function Desk({ x, y, w, h, hasLaptop }: { x: number; y: number; w: number; h: number; hasLaptop?: boolean }) {
  return (
    <div 
      className="absolute z-10"
      style={{ left: x, top: y, width: w, height: h }}
    >
      {/* Table Legs (Top-down view, just small circles at corners) */}
      <div className="absolute top-1 left-1 w-2 h-2 bg-slate-400 rounded-full shadow-sm" />
      <div className="absolute top-1 right-1 w-2 h-2 bg-slate-400 rounded-full shadow-sm" />
      <div className="absolute bottom-1 left-1 w-2 h-2 bg-slate-400 rounded-full shadow-sm" />
      <div className="absolute bottom-1 right-1 w-2 h-2 bg-slate-400 rounded-full shadow-sm" />
      
      {/* Table Surface */}
      <div className="absolute inset-0 bg-white border border-slate-200 rounded shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)] flex items-center justify-center overflow-hidden">
        {/* Wood Grain Pattern (Subtle) */}
        <div className="absolute inset-0 opacity-[0.03] bg-[repeating-linear-gradient(90deg,#000,#000_1px,transparent_1px,transparent_10px)]" />
        
        {hasLaptop && (
          <div className="relative w-10 h-7 bg-slate-800 rounded-sm border-t-[3px] border-sky-400 shadow-lg flex items-center justify-center">
            <div className="w-6 h-0.5 bg-slate-700 rounded-full mb-1" />
            <div className="absolute bottom-1 w-4 h-1 bg-slate-600 rounded-full opacity-50" />
          </div>
        )}
      </div>
    </div>
  );
}

function Chair({ x, y, rot }: { x: number; y: number; rot: number }) {
  return (
    <div 
      className="absolute w-11 h-11 z-0 flex items-center justify-center"
      style={{ left: x, top: y, transform: `rotate(${rot}deg)` }}
    >
      <div className="absolute bottom-0.5 w-9 h-2.5 bg-slate-800 rounded-lg z-20" />
      <div className="absolute left-0.5 w-1.5 h-4.5 bg-slate-400 bottom-3 rounded-full z-20" />
      <div className="absolute right-0.5 w-1.5 h-4.5 bg-slate-400 bottom-3 rounded-full z-20" />
      <div className="absolute bottom-2 w-8 h-7 bg-gradient-to-b from-slate-600 to-slate-400 rounded-xl z-10" />
    </div>
  );
}

function CentralHub() {
  const dW = 75, dH = 55;
  const startX = (OFFICE_WIDTH - (10 * dW)) / 2;
  const startY = (OFFICE_HEIGHT / 2) - dH;
  
  const desks = [];
  for(let r=0; r<2; r++) {
    for(let c=0; c<10; c++) {
      const dx = startX + (c * dW);
      const dy = startY + (r * dH);
      desks.push(
        <React.Fragment key={`${r}-${c}`}>
          <Desk x={dx} y={dy} w={dW} h={dH} hasLaptop />
          <Chair x={dx + 15} y={r === 0 ? dy - 50 : dy + 63} rot={r === 0 ? 180 : 0} />
        </React.Fragment>
      );
    }
  }
  return <>{desks}</>;
}
