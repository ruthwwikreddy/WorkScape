/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';
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
  ShieldCheck
} from 'lucide-react';

// --- Constants ---
const OFFICE_WIDTH = 1200;
const OFFICE_HEIGHT = 800;
const AVATAR_RADIUS = 20;
const SPEED = 6;
const VOICE_RADIUS = 150;

// --- Types ---
interface Point { x: number; y: number; }
interface Rect { left: number; right: number; top: number; bottom: number; }
interface Zone { name: string; bounds: Rect; }

interface AvatarConfig {
  skinColor: string;
  hairStyle: 'none' | 'short' | 'long' | 'pompadour';
  hairColor: string;
  shirtColor: string;
  pantsColor: string;
  bodyType: 'slim' | 'normal' | 'wide';
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

const Avatar = ({ config, isWalking, isSpeaking }: { config: AvatarConfig; isWalking: boolean; isSpeaking: boolean }) => {
  const bodyWidth = config.bodyType === 'slim' ? 32 : config.bodyType === 'wide' ? 48 : 40;
  
  return (
    <div className={`relative flex items-center justify-center transition-all duration-300 ${isWalking ? 'animate-bounce' : ''}`} style={{ width: 60, height: 60 }}>
      {/* Speaking Indicator Ring */}
      {isSpeaking && (
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="absolute inset-0 rounded-full ring-4 ring-black ring-offset-2"
        />
      )}
      
      {/* Shadow */}
      <div className="absolute bottom-0 w-8 h-2 bg-black/10 rounded-full blur-[2px]" />

      {/* Body Parts Container */}
      <div className="relative flex flex-col items-center">
        {/* Hair */}
        {config.hairStyle !== 'none' && (
          <div 
            className="absolute -top-1 z-30 rounded-full"
            style={{ 
              backgroundColor: config.hairColor,
              width: 28,
              height: config.hairStyle === 'short' ? 14 : config.hairStyle === 'long' ? 24 : 20,
              top: config.hairStyle === 'pompadour' ? -8 : -2
            }}
          />
        )}

        {/* Head */}
        <div 
          className="w-7 h-7 rounded-full z-20 shadow-sm border border-black/5"
          style={{ backgroundColor: config.skinColor }}
        >
          {/* Eyes */}
          <div className="absolute top-2 left-1.5 w-1 h-1 bg-slate-800 rounded-full" />
          <div className="absolute top-2 right-1.5 w-1 h-1 bg-slate-800 rounded-full" />
        </div>

        {/* Torso / Shirt */}
        <div 
          className="z-10 -mt-1 rounded-t-lg shadow-sm border border-black/5 transition-all"
          style={{ 
            backgroundColor: config.shirtColor,
            width: bodyWidth,
            height: 24
          }}
        />

        {/* Legs / Pants */}
        <div className="flex gap-1 -mt-0.5">
          <div 
            className="w-3 h-4 rounded-b-sm shadow-sm border border-black/5"
            style={{ backgroundColor: config.pantsColor }}
          />
          <div 
            className="w-3 h-4 rounded-b-sm shadow-sm border border-black/5"
            style={{ backgroundColor: config.pantsColor }}
          />
        </div>
      </div>
    </div>
  );
};

interface Task {
  id: string;
  text: string;
  done: boolean;
}

const HUD = ({ zone, tasks, completedCount, pos, roomId, onAddTask, onToggleTask, onDeleteTask, onEditTask }: { 
  zone: string; 
  tasks: Task[]; 
  completedCount: number; 
  pos: Point; 
  roomId: string;
  onAddTask: (text: string) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onEditTask: (id: string, text: string) => void;
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

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* Top Left: Status & Zone */}
      <div className="absolute top-6 left-6 flex flex-col gap-4 pointer-events-auto">
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="bg-black p-5 rounded-2xl shadow-2xl border-l-8 border-white w-72"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3 h-3 text-white/40" />
              <h1 className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Workspace Room</h1>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => {
                  const newRoom = prompt("Enter Room ID to switch:", roomId || "");
                  if (newRoom && newRoom !== roomId) {
                    window.location.search = `?room=${newRoom}`;
                  }
                }}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-white"
                title="Switch Room"
              >
                <Settings className="w-3 h-3" />
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-white"
                title="Logout"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          </div>
          <p className="text-xl font-black text-white tracking-tight truncate">{roomId}</p>
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
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/30 transition-all"
            />
            <button type="submit" className="p-1.5 bg-white text-black rounded-lg hover:bg-slate-200 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </form>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
            {tasks.length === 0 && (
              <p className="text-[10px] text-white/20 italic text-center py-4">No tasks yet. Start your day!</p>
            )}
            {tasks.map((task) => (
              <div key={task.id} className="group flex items-center gap-3 bg-white/5 p-2 rounded-xl border border-transparent hover:border-white/10 transition-all">
                <button 
                  onClick={() => onToggleTask(task.id)}
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${task.done ? 'bg-white border-white' : 'border-white/20 hover:border-white/40'}`}
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
                      className="flex-1 bg-white/10 border-none rounded px-1 py-0.5 text-xs text-white focus:outline-none"
                    />
                    <button onClick={saveEdit} className="text-white hover:text-emerald-400">
                      <Check className="w-3 h-3" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-white hover:text-rose-400">
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
      </div>

      {/* Bottom Right: Clock */}
      <div className="absolute bottom-8 right-8 flex items-center gap-6 pointer-events-auto">
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

      {/* Minimap */}
      <div className="absolute bottom-8 left-8 pointer-events-auto">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-black/90 backdrop-blur-md p-2 rounded-xl shadow-2xl w-48 h-32 relative overflow-hidden border border-white/10"
        >
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] bg-[size:10px_10px]" />
          {/* Character Dot */}
          <motion.div 
            animate={{ 
              left: (pos.x / OFFICE_WIDTH) * 100 + '%', 
              top: (pos.y / OFFICE_HEIGHT) * 100 + '%' 
            }}
            className="absolute w-2 h-2 bg-white rounded-full shadow-[0_0_10px_#fff] z-10 -translate-x-1/2 -translate-y-1/2"
          />
          {/* Simple Wall Outlines */}
          {WALLS.map((w, i) => (
            <div 
              key={i} 
              className="absolute bg-white/10"
              style={{ 
                left: (w.left / OFFICE_WIDTH) * 100 + '%', 
                top: (w.top / OFFICE_HEIGHT) * 100 + '%',
                width: ((w.right - w.left) / OFFICE_WIDTH) * 100 + '%',
                height: ((w.bottom - w.top) / OFFICE_HEIGHT) * 100 + '%'
              }}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
};

const UserMenu = ({ name, playersCount }: { name: string; playersCount: number }) => (
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
);

const EntryModal = ({ onJoin }: { onJoin: (name: string, roomId: string) => void }) => {
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room') || '';
  });

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/80 backdrop-blur-xl">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white p-10 rounded-[32px] shadow-2xl w-full max-w-md"
      >
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 bg-black rounded-3xl flex items-center justify-center shadow-xl">
            <Briefcase className="w-10 h-10 text-white" />
          </div>
        </div>
        <h2 className="text-3xl font-black text-black text-center mb-2 tracking-tight">WorkSpace</h2>
        <p className="text-slate-500 text-center mb-8 font-medium">Join a room to start collaborating</p>
        
        <div className="space-y-4 mb-6">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">Your Name</label>
            <input 
              autoFocus
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Rivera"
              className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-black focus:outline-none text-lg font-bold text-black transition-all"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">Room ID</label>
            <input 
              type="text" 
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="e.g. design-team"
              className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-black focus:outline-none text-lg font-bold text-black transition-all"
            />
          </div>
        </div>

        <button 
          disabled={!name.trim() || !roomId.trim()}
          onClick={() => onJoin(name.trim(), roomId.trim())}
          className="w-full py-4 bg-black hover:bg-slate-900 disabled:bg-slate-200 disabled:cursor-not-allowed text-white rounded-2xl font-black text-lg shadow-xl transition-all active:scale-[0.98]"
        >
          Join Workspace
        </button>
      </motion.div>
    </div>
  );
};

const CharacterCustomizationModal = ({ onComplete }: { onComplete: (config: AvatarConfig) => void }) => {
  const [config, setConfig] = useState<AvatarConfig>(() => {
    const saved = localStorage.getItem('avatarConfig');
    return saved ? JSON.parse(saved) : {
      skinColor: '#f3c9b1',
      hairStyle: 'short',
      hairColor: '#4a2c2a',
      shirtColor: '#000000',
      pantsColor: '#1e293b',
      bodyType: 'normal'
    };
  });

  const skinColors = ['#f3c9b1', '#e0ac69', '#8d5524', '#c68642', '#ffdbac'];
  const hairColors = ['#4a2c2a', '#2c1e1e', '#d6b37a', '#a5a5a5', '#000000'];
  const shirtColors = ['#000000', '#2563eb', '#16a34a', '#d97706', '#7c3aed', '#ffffff'];
  const pantsColors = ['#1e293b', '#334155', '#475569', '#1e1b4b', '#000000'];
  const hairStyles: AvatarConfig['hairStyle'][] = ['none', 'short', 'long', 'pompadour'];
  const bodyTypes: AvatarConfig['bodyType'][] = ['slim', 'normal', 'wide'];

  const handleComplete = () => {
    localStorage.setItem('avatarConfig', JSON.stringify(config));
    onComplete(config);
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl flex flex-col md:flex-row overflow-hidden"
      >
        {/* Preview Section */}
        <div className="md:w-1/2 bg-slate-50 p-12 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-100">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-black tracking-tight">Customize Your Look</h2>
            <p className="text-slate-500 font-medium">Design your digital presence</p>
          </div>
          
          <div className="scale-[2.5] mb-12">
            <Avatar config={config} isWalking={false} isSpeaking={false} />
          </div>

          <button 
            onClick={() => setConfig({
              ...config,
              skinColor: skinColors[Math.floor(Math.random() * skinColors.length)],
              hairColor: hairColors[Math.floor(Math.random() * hairColors.length)],
              shirtColor: shirtColors[Math.floor(Math.random() * shirtColors.length)],
              pantsColor: pantsColors[Math.floor(Math.random() * pantsColors.length)],
              hairStyle: hairStyles[Math.floor(Math.random() * hairStyles.length)],
              bodyType: bodyTypes[Math.floor(Math.random() * bodyTypes.length)]
            })}
            className="flex items-center gap-2 text-black font-bold hover:text-slate-700 transition-colors"
          >
            <Zap className="w-4 h-4" />
            Randomize
          </button>
        </div>

        {/* Options Section */}
        <div className="md:w-1/2 p-10 overflow-y-auto max-h-[80vh]">
          <div className="space-y-8">
            {/* Skin Color */}
            <section>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Skin Tone</h3>
              <div className="flex flex-wrap gap-3">
                {skinColors.map(color => (
                  <button 
                    key={color}
                    onClick={() => setConfig({ ...config, skinColor: color })}
                    className={`w-10 h-10 rounded-full border-4 transition-all ${config.skinColor === color ? 'border-black scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </section>

            {/* Hair Style */}
            <section>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Hairstyle</h3>
              <div className="flex flex-wrap gap-2">
                {hairStyles.map(style => (
                  <button 
                    key={style}
                    onClick={() => setConfig({ ...config, hairStyle: style })}
                    className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${config.hairStyle === style ? 'bg-black text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {style.charAt(0).toUpperCase() + style.slice(1)}
                  </button>
                ))}
              </div>
            </section>

            {/* Hair Color */}
            <section>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Hair Color</h3>
              <div className="flex flex-wrap gap-3">
                {hairColors.map(color => (
                  <button 
                    key={color}
                    onClick={() => setConfig({ ...config, hairColor: color })}
                    className={`w-8 h-8 rounded-full border-4 transition-all ${config.hairColor === color ? 'border-black scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </section>

            {/* Shirt Color */}
            <section>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Shirt Color</h3>
              <div className="flex flex-wrap gap-3">
                {shirtColors.map(color => (
                  <button 
                    key={color}
                    onClick={() => setConfig({ ...config, shirtColor: color })}
                    className={`w-8 h-8 rounded-full border-4 transition-all ${config.shirtColor === color ? 'border-black scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </section>

            {/* Body Type */}
            <section>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Body Type</h3>
              <div className="flex flex-wrap gap-2">
                {bodyTypes.map(type => (
                  <button 
                    key={type}
                    onClick={() => setConfig({ ...config, bodyType: type })}
                    className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${config.bodyType === type ? 'bg-black text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </section>
          </div>

          <button 
            onClick={handleComplete}
            className="w-full mt-12 py-5 bg-black hover:bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl transition-all active:scale-[0.98]"
          >
            Enter Workspace
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const RemotePlayerAvatar = ({ player, localPos, localIsPrivate, localZone }: { player: RemotePlayer; localPos: Point; localIsPrivate: boolean; localZone: string; key?: string }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const dist = Math.hypot(player.pos.x - localPos.x, player.pos.y - localPos.y);
  
  // Meeting Room Isolation Logic:
  // If either person is in a "Conference Room", they can only hear each other if they are in the SAME room.
  const isMeetingRoom = (z: string) => z && z.startsWith("Conference Room");
  const inSameMeetingRoom = isMeetingRoom(localZone) && localZone === player.zone;
  const oneInMeetingRoom = isMeetingRoom(localZone) || isMeetingRoom(player.zone);
  
  // Private Bubble Logic: 
  const inSameBubble = dist < 100;
  const isMutedByPrivate = (player.isPrivate || localIsPrivate) && !inSameBubble;
  
  // Final Isolation Logic:
  // 1. If one is in a meeting room but not the same one, they are muted.
  // 2. If both are in the same meeting room, proximity still applies but maybe with a boost? 
  //    Actually, let's make meeting rooms "Full Volume" if you are inside together.
  
  let volume = 0;
  if (oneInMeetingRoom) {
    if (inSameMeetingRoom) {
      // Boosted volume for meeting rooms
      volume = Math.max(0, Math.min(1, 1.2 - (dist / (VOICE_RADIUS * 1.5))));
    } else {
      volume = 0;
    }
  } else if (!isMutedByPrivate) {
    volume = Math.max(0, Math.min(1, Math.pow(1 - (dist / VOICE_RADIUS), 2)));
  }

  useEffect(() => {
    if (audioRef.current && player.stream) {
      audioRef.current.srcObject = player.stream;
      audioRef.current.volume = volume;
    }
  }, [player.stream, volume]);

  return (
    <motion.div
      animate={{ x: player.pos.x, y: player.pos.y, rotate: player.angle }}
      transition={{ type: 'spring', damping: 25, stiffness: 200, mass: 0.5 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="absolute z-[900] -ml-[30px] -mt-[30px] w-[60px] h-[60px]"
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

      <Avatar config={player.avatarConfig} isWalking={player.isWalking} isSpeaking={player.isSpeaking} />
      <audio ref={audioRef} autoPlay />
    </motion.div>
  );
};

export default function App() {
  const [userName, setUserName] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig | null>(null);
  const [status, setStatus] = useState<'available' | 'busy' | 'focus'>('available');
  const [isPrivate, setIsPrivate] = useState(false);
  const [pos, setPos] = useState<Point>({ x: 100, y: 700 });
  const [angle, setAngle] = useState(180);
  const [isWalking, setIsWalking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [currentZone, setCurrentZone] = useState("Lobby");
  const [keys, setKeys] = useState<Record<string, boolean>>({});
  const [remotePlayers, setRemotePlayers] = useState<Record<string, RemotePlayer>>({});
  const [tasks, setTasks] = useState<Task[]>([]);

  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<Record<string, Peer.Instance>>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef<number>(null);
  const posRef = useRef<Point>({ x: 100, y: 700 });

  const handleJoin = (name: string, room: string) => {
    setUserName(name);
    setRoomId(room);
  };

  const handleAddTask = (text: string) => {
    setTasks(prev => [...prev, { id: Date.now().toString(), text, done: false }]);
  };

  const handleToggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleEditTask = (id: string, text: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, text } : t));
  };

  const handleTogglePrivate = () => {
    const next = !isPrivate;
    setIsPrivate(next);
    socketRef.current?.emit("status", { status, isPrivate: next });
  };

  const handleChangeStatus = (s: 'available' | 'busy' | 'focus') => {
    setStatus(s);
    socketRef.current?.emit("status", { status: s, isPrivate });
  };

  const checkCollision = (nx: number, ny: number) => {
    const r = 18;
    if (nx < r || nx > OFFICE_WIDTH - r || ny < r || ny > OFFICE_HEIGHT - r) return true;
    const p = { left: nx - r, right: nx + r, top: ny - r, bottom: ny + r };
    if (WALLS.some(w => !(p.right < w.left || p.left > w.right || p.bottom < w.top || p.top > w.bottom))) return true;
    
    // Player collision
    const otherPlayers = Object.values(remotePlayers) as RemotePlayer[];
    if (otherPlayers.some(op => Math.hypot(nx - op.pos.x, ny - op.pos.y) < 40)) return true;

    return false;
  };

  const initVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      // Initially mute
      stream.getAudioTracks().forEach(track => track.enabled = false);
    } catch (err) {
      console.error("Mic access denied", err);
    }
  };

  const createPeer = (userId: string, socketId: string, stream: MediaStream) => {
    const peer = new Peer({ initiator: true, trickle: false, stream });
    peer.on("signal", (signal) => {
      socketRef.current?.emit("signal", { to: socketId, signal });
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
      socketRef.current?.emit("signal", { to: socketId, signal });
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
    if (!userName || !avatarConfig || !roomId) return;

    console.log("Connecting to socket...", { userName, roomId });
    socketRef.current = io();
    const socket = socketRef.current;

    initVoice().then(() => {
      console.log("Voice initialized, joining room...");
      socket.emit("join", { 
        name: userName, 
        roomId, 
        pos: posRef.current, 
        angle: 180, 
        avatarConfig,
        status,
        isPrivate,
        zone: currentZone
      });
    });

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
    });

    socket.on("init", (users: Record<string, any>) => {
      console.log("Received init users:", Object.keys(users));
      const others = { ...users };
      if (socket.id) delete others[socket.id];
      setRemotePlayers(others);
      
      // Newcomer initiates to everyone already in the room
      if (localStreamRef.current) {
        Object.keys(others).forEach(id => {
          if (!peersRef.current[id]) {
            console.log("Initiating peer to:", id);
            const peer = createPeer(id, id, localStreamRef.current!);
            peersRef.current[id] = peer;
          }
        });
      }
    });

    socket.on("user:joined", (user: any) => {
      console.log("User joined:", user.id);
      setRemotePlayers(prev => ({ ...prev, [user.id]: user }));
      // We don't initiate here; we wait for their signal
    });

    socket.on("user:moved", (data: any) => {
      setRemotePlayers(prev => {
        if (!prev[data.id]) return prev;
        const zone = ZONES.find(z => 
          data.pos.x >= z.bounds.left && data.pos.x <= z.bounds.right && 
          data.pos.y >= z.bounds.top && data.pos.y <= z.bounds.bottom
        );
        return { ...prev, [data.id]: { ...prev[data.id], ...data, zone: zone?.name || "Lobby" } };
      });
    });

    socket.on("user:speaking", (data: any) => {
      setRemotePlayers(prev => {
        if (!prev[data.id]) return prev;
        return { ...prev, [data.id]: { ...prev[data.id], isSpeaking: data.isSpeaking } };
      });
    });

    socket.on("user:status", (data: any) => {
      setRemotePlayers(prev => {
        if (!prev[data.id]) return prev;
        return { ...prev, [data.id]: { ...prev[data.id], status: data.status, isPrivate: data.isPrivate } };
      });
    });

    socket.on("user:left", (id: string) => {
      console.log("User left:", id);
      setRemotePlayers(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      if (peersRef.current[id]) {
        peersRef.current[id].destroy();
        delete peersRef.current[id];
      }
    });

    socket.on("signal", (data: any) => {
      console.log("Received signal from:", data.from);
      if (peersRef.current[data.from]) {
        peersRef.current[data.from].signal(data.signal);
      } else if (localStreamRef.current) {
        console.log("Creating non-initiator peer for:", data.from);
        const peer = addPeer(data.signal, data.from, localStreamRef.current!);
        peersRef.current[data.from] = peer;
      }
    });

    return () => {
      console.log("Cleaning up socket connection...");
      socket.disconnect();
      Object.values(peersRef.current).forEach(p => (p as any).destroy());
      peersRef.current = {};
      localStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [userName, roomId, avatarConfig]);

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
      if (newZoneName !== currentZone) setCurrentZone(newZoneName);

      const moveAngle = Math.atan2(dy, dx) * 180 / Math.PI;
      const newAngle = moveAngle + 90;
      setAngle(newAngle);

      socketRef.current?.emit("move", { pos: posRef.current, angle: newAngle, isWalking: true });
    }

    if (isWalking !== currentlyWalking) {
      setIsWalking(currentlyWalking);
      if (!currentlyWalking) {
        socketRef.current?.emit("move", { pos: posRef.current, angle, isWalking: false });
      }
    }

    requestRef.current = requestAnimationFrame(loop);
  }, [keys, currentZone, tasks, isWalking, angle, remotePlayers]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      setKeys(prev => ({ ...prev, [key]: true }));
      
      if (key === 'e') {
        setTasks(prev => prev.map(t => {
          if (!t.done && t.zone === currentZone) return { ...t, done: true };
          return t;
        }));
      }

      if (key === ' ' && localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(t => t.enabled = true);
        setIsSpeaking(true);
        socketRef.current?.emit("speaking", true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      setKeys(prev => ({ ...prev, [key]: false }));
      if (key === ' ' && localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(t => t.enabled = false);
        setIsSpeaking(false);
        socketRef.current?.emit("speaking", false);
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
  }, [loop, currentZone]);

  const completedCount = tasks.filter(t => t.done).length;

  if (!userName || !roomId) return <EntryModal onJoin={handleJoin} />;
  if (!avatarConfig) return <CharacterCustomizationModal onComplete={setAvatarConfig} />;

  return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center overflow-hidden font-sans selection:bg-white/20">
      <HUD 
        zone={currentZone} 
        tasks={tasks} 
        completedCount={completedCount} 
        pos={pos} 
        roomId={roomId} 
        onAddTask={handleAddTask}
        onToggleTask={handleToggleTask}
        onDeleteTask={handleDeleteTask}
        onEditTask={handleEditTask}
      />
      <UserMenu name={userName} playersCount={Object.keys(remotePlayers).length + 1} />
      
      <div 
        id="office"
        className="relative bg-white border-[12px] border-black rounded-lg shadow-[0_60px_120px_rgba(0,0,0,0.5)] overflow-hidden"
        style={{ 
          width: OFFICE_WIDTH, 
          height: OFFICE_HEIGHT, 
          backgroundImage: 'radial-gradient(rgba(0,0,0,0.05) 1.5px, transparent 1.5px)', 
          backgroundSize: '40px 40px' 
        }}
      >
        {/* Dynamic Lighting Overlay */}
        <div 
          className="absolute inset-0 z-[1100] pointer-events-none mix-blend-multiply opacity-20"
          style={{ 
            background: `radial-gradient(circle at ${pos.x}px ${pos.y}px, transparent 100px, #000 400px)` 
          }}
        />
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
          <RemotePlayerAvatar key={player.id} player={player} localPos={pos} localIsPrivate={isPrivate} localZone={currentZone} />
        ))}

        {/* Doors */}
        <Doors pos={pos} />

        {/* Character Avatar */}
        <motion.div
          animate={{ x: pos.x, y: pos.y, rotate: angle }}
          transition={{ type: 'spring', damping: 25, stiffness: 200, mass: 0.5 }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="absolute z-[1000] -ml-[30px] -mt-[30px] w-[60px] h-[60px]"
        >
          {/* Private Bubble Visual */}
          {isPrivate && (
            <div className="absolute inset-0 -m-4 rounded-full border-2 border-dashed border-black/40 bg-black/5 animate-pulse" />
          )}
          {/* Voice Radius Indicator */}
          <AnimatePresence>
            {isSpeaking && (
              <motion.div 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="absolute inset-0 -m-20 rounded-full bg-black/5 pointer-events-none"
                style={{ width: VOICE_RADIUS * 2, height: VOICE_RADIUS * 2, left: -VOICE_RADIUS + 30, top: -VOICE_RADIUS + 30 }}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {(isHovered || isSpeaking) && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black text-white px-3 py-1 rounded-full shadow-lg border border-white/10 flex items-center gap-2"
              >
                <span className="text-[10px] font-black uppercase tracking-wider">{userName}</span>
                {isSpeaking && <Mic className="w-3 h-3" />}
              </motion.div>
            )}
          </AnimatePresence>

          <Avatar config={avatarConfig} isWalking={isWalking} isSpeaking={isSpeaking} />
        </motion.div>
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

        <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl backdrop-blur-md border transition-all ${isSpeaking ? 'bg-black text-white shadow-xl' : 'bg-white/90 border-slate-200 text-slate-500'}`}>
          {isSpeaking ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          <span className="text-sm font-black uppercase tracking-widest">Hold Space to Talk</span>
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
      className="absolute bg-white border border-slate-200 rounded shadow-sm z-10 flex items-center justify-center"
      style={{ left: x, top: y, width: w, height: h }}
    >
      {hasLaptop && (
        <div className="w-8 h-5 bg-slate-300 rounded-sm border-t-4 border-sky-400 shadow-inner" />
      )}
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
