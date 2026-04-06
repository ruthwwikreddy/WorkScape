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
  Smile as SmileIcon
} from 'lucide-react';
import { 
  auth, db, googleProvider, signInWithPopup, onAuthStateChanged, signOut,
  doc, setDoc, getDoc, collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc
} from './firebase';

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
  hairStyle: 'none' | 'short' | 'long' | 'pompadour' | 'curly' | 'bald' | 'spike' | 'fade' | 'textured';
  hairColor: string;
  shirtStyle: 'tshirt' | 'hoodie' | 'suit' | 'dress';
  shirtColor: string;
  pantsStyle: 'jeans' | 'shorts' | 'suit-pants';
  pantsColor: string;
  bodyType: 'slim' | 'normal' | 'wide';
  useGooglePhoto?: boolean;
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

const LandingPage = ({ onStart, user, onLogout }: { onStart: () => void, user: any, onLogout: () => void }) => {
  const [showUnsupported, setShowUnsupported] = useState(false);

  const handleStart = () => {
    if (isTouchDevice()) {
      setShowUnsupported(true);
    } else {
      onStart();
    }
  };

  if (showUnsupported) {
    return <DeviceNotSupported onBack={() => setShowUnsupported(false)} />;
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden font-sans">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] bg-[size:40px_40px]" />
      
      {/* Top Right Profile */}
      <div className="fixed top-6 right-6 z-50">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md p-2 rounded-full border border-white/10 flex items-center gap-3 pr-4 group cursor-pointer hover:bg-white/20 transition-all">
              <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="Profile" className="w-8 h-8 rounded-full border border-white/20" />
              <div className="text-left">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">Welcome back</p>
                <p className="text-xs font-black text-white leading-none">{user.displayName || "Explorer"}</p>
              </div>
              <div className="overflow-hidden w-0 group-hover:w-auto transition-all flex border-l border-white/10 ml-2 pl-2 gap-2">
                 <button onClick={onLogout} className="p-1.5 hover:bg-rose-500/20 rounded-lg text-rose-400">
                    <LogOut className="w-4 h-4" />
                 </button>
              </div>
            </div>
          </div>
        ) : (
          <button 
            onClick={onStart}
            className="px-6 py-3 bg-white text-black rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl"
          >
            Login with Google
          </button>
        )}
      </div>

      {/* Hero Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-32 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/10 mb-8"
        >
          <Zap className="w-4 h-4 text-yellow-400" />
          <span className="text-xs font-black uppercase tracking-widest">Next-Gen Virtual Office</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.9]"
        >
          WORK TOGETHER,<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-400 to-white">ANYWHERE.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl text-slate-400 max-w-2xl mb-12 font-medium"
        >
          A spatial virtual office with proximity voice, meeting rooms, and real-time collaboration. 
          Feel the presence of your team without the zoom fatigue.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <button
            onClick={handleStart}
            className="px-10 py-5 bg-white text-black rounded-2xl font-black text-xl shadow-[0_20px_50px_rgba(255,255,255,0.2)] hover:scale-105 transition-all active:scale-95 flex items-center gap-3"
          >
            Get Started
            <ArrowRight className="w-6 h-6" />
          </button>
          <button className="px-10 py-5 bg-white/5 border border-white/10 rounded-2xl font-black text-xl hover:bg-white/10 transition-all">
            View Demo
          </button>
        </motion.div>
      </div>

      {/* Features Grid */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: <Mic className="w-8 h-8" />, title: "Proximity Voice", desc: "Hear people louder as you walk closer to them. Natural conversations." },
            { icon: <Layout className="w-8 h-8" />, title: "Spatial Office", desc: "A beautiful 2D office layout with meeting rooms and focus zones." },
            { icon: <Shield className="w-8 h-8" />, title: "Private Bubbles", desc: "Need a quick 1-on-1? Step into a private bubble for isolated audio." }
          ].map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + (i * 0.1) }}
              className="bg-white/5 p-8 rounded-[32px] border border-white/10 hover:bg-white/10 transition-all group"
            >
              <div className="mb-6 text-slate-400 group-hover:text-white transition-colors">{f.icon}</div>
              <h3 className="text-2xl font-black mb-4">{f.title}</h3>
              <p className="text-slate-400 font-medium leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 border-t border-white/10 py-12 text-center">
        <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">Built for the future of work</p>
      </div>
    </div>
  );
};

const SettingsModal = ({ 
  isOpen, 
  onClose, 
  userName, 
  roomId, 
  onLogout,
  user
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  userName: string; 
  roomId: string;
  onLogout: () => void;
  user: any;
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
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-12 h-12 rounded-xl border border-slate-200" />
                  ) : (
                    <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center text-white font-black">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                  )}
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

// Avatar Sub-components - Production Grade
const AvatarLegs = ({ config, proportions }: { config: AvatarConfig; proportions: any }) => {
  const getPantsStyle = () => {
    switch(config.pantsStyle) {
      case 'shorts': return { height: proportions.legHeight * 0.6, borderRadius: '8px 8px 0 0' };
      case 'suit-pants': return { height: proportions.legHeight, borderRadius: '4px' };
      default: return { height: proportions.legHeight, borderRadius: '0 0 8px 8px' };
    }
  };

  return (
    <div className="flex gap-2">
      {[0, 1].map(leg => (
        <div
          key={leg}
          className="relative shadow-sm"
          style={{
            width: proportions.legWidth,
            height: getPantsStyle().height,
            backgroundColor: config.pantsColor,
            borderRadius: getPantsStyle().borderRadius,
            border: '1px solid rgba(0,0,0,0.1)'
          }}
        >
          {/* Shoe */}
          <div 
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[120%] h-2 bg-slate-900 rounded-sm"
            style={{ width: proportions.legWidth * 1.2 }}
          />
          {/* Texture for jeans */}
          {config.pantsStyle === 'jeans' && (
            <div className="absolute inset-0 opacity-20">
              <div className="h-full w-full bg-gradient-to-b from-transparent to-blue-900/30" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const AvatarTorso = ({ config, proportions }: { config: AvatarConfig; proportions: any }) => {
  const getShirtDetails = () => {
    switch(config.shirtStyle) {
      case 'suit': return {
        hasCollar: true,
        hasButtons: true,
        extraClass: 'border-2 border-slate-800'
      };
      case 'hoodie': return {
        hasHood: true,
        extraClass: 'border-b-2 border-slate-700'
      };
      case 'dress': return {
        hasSkirt: true,
        extraClass: 'rounded-b-lg'
      };
      default: return {
        hasSleeves: true,
        extraClass: ''
      };
    }
  };

  const details = getShirtDetails();

  return (
    <div className="relative">
      {/* Arms */}
      <div className="absolute -left-3 top-2 flex flex-col items-center">
        <div
          className="rounded-full origin-top shadow-md"
          style={{
            width: proportions.armWidth,
            height: proportions.armHeight,
            backgroundColor: config.shirtColor,
            animation: 'v-swing-l 0.5s infinite',
            transformOrigin: 'top center'
          }}
        >
          <div 
            className="absolute bottom-0 w-[120%] h-3 rounded-full"
            style={{ 
              backgroundColor: config.skinColor,
              width: proportions.armWidth * 1.2
            }}
          />
        </div>
      </div>

      {/* Main Torso */}
      <div
        className={`relative shadow-lg overflow-hidden ${details.extraClass}`}
        style={{
          width: proportions.torsoWidth,
          height: proportions.torsoHeight,
          backgroundColor: config.shirtColor,
          borderRadius: config.shirtStyle === 'dress' ? '12px 12px 0 0' : '8px 8px 4px 4px'
        }}
      >
        {/* Shirt Details */}
        {details.hasCollar && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-6 bg-white border border-slate-800 rounded-t" />
        )}
        {details.hasButtons && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col gap-1">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-1 h-1 bg-slate-800 rounded-full" />
            ))}
          </div>
        )}
        {details.hasHood && (
          <div className="absolute top-0 w-full h-4 bg-black/10 rounded-t" />
        )}
        {details.hasSkirt && (
          <div className="absolute bottom-0 w-full h-4 bg-gradient-to-b from-transparent to-black/10 rounded-b" />
        )}

        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
      </div>

      {/* Right Arm */}
      <div className="absolute -right-3 top-2 flex flex-col items-center">
        <div
          className="rounded-full origin-top shadow-md"
          style={{
            width: proportions.armWidth,
            height: proportions.armHeight,
            backgroundColor: config.shirtColor,
            animation: 'v-swing-r 0.5s infinite',
            transformOrigin: 'top center'
          }}
        >
          <div 
            className="absolute bottom-0 w-[120%] h-3 rounded-full"
            style={{ 
              backgroundColor: config.skinColor,
              width: proportions.armWidth * 1.2
            }}
          />
        </div>
      </div>
    </div>
  );
};

const AvatarHead = ({ config, proportions, profileImg, useProfilePic }: { 
  config: AvatarConfig; 
  proportions: any; 
  profileImg?: string; 
  useProfilePic: boolean; 
}) => {
  return (
    <div className="relative">
      <div
        className="relative overflow-hidden shadow-2xl border-2 border-white/30"
        style={{
          width: proportions.headSize,
          height: proportions.headSize,
          borderRadius: '50%',
          backgroundColor: useProfilePic ? 'transparent' : config.skinColor
        }}
      >
        {useProfilePic && profileImg ? (
          <img
            src={profileImg}
            alt="Profile"
            className="w-full h-full object-cover"
            style={{
              objectPosition: 'center',
              objectFit: 'cover'
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {/* Eyes */}
            <div className="flex gap-2">
              <div 
                className="w-2 h-2 bg-black/80 rounded-full" 
                style={{ animation: 'v-blink 4s infinite' }} 
              />
              <div 
                className="w-2 h-2 bg-black/80 rounded-full" 
                style={{ animation: 'v-blink 4s infinite 0.1s' }} 
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const AvatarHair = ({ config, proportions }: { config: AvatarConfig; proportions: any }) => {
  const getHairStyle = () => {
    switch(config.hairStyle) {
      case 'short':
        return (
          <svg viewBox="0 0 100 100" className="drop-shadow-md" style={{ width: proportions.headSize * 1.2, height: proportions.headSize * 0.8 }}>
            <path d="M20 40 Q20 20 50 20 Q80 20 80 40 L80 50 Q60 45 50 50 Q40 45 20 50 Z" fill={config.hairColor} />
            <path d="M25 35 Q50 25 75 35" stroke="rgba(0,0,0,0.1)" strokeWidth="2" fill="none" />
          </svg>
        );
      case 'fade':
        return (
          <svg viewBox="0 0 100 100" className="drop-shadow-md" style={{ width: proportions.headSize * 1.2, height: proportions.headSize * 0.6 }}>
            <path d="M15 35 Q15 15 50 15 Q85 15 85 35 L85 45 L15 45 Z" fill={config.hairColor} />
            <rect x="15" y="35" width="70" height="10" fill={config.hairColor} opacity="0.7" />
          </svg>
        );
      case 'curly':
        return (
          <svg viewBox="0 0 100 100" className="drop-shadow-md" style={{ width: proportions.headSize * 1.3, height: proportions.headSize * 0.9 }}>
            {Array.from({length: 8}).map((_, i) => (
              <circle key={i} cx={15 + i*10} cy={20 + (i%2)*5} r="8" fill={config.hairColor} />
            ))}
            <path d="M10 35 Q50 15 90 35" fill={config.hairColor} />
          </svg>
        );
      case 'long':
        return (
          <svg viewBox="0 0 100 100" className="drop-shadow-md" style={{ width: proportions.headSize * 1.2, height: proportions.headSize * 1.4 }}>
            <path d="M10 35 Q10 5 50 5 Q90 5 90 35 L95 85 Q50 75 5 85 Z" fill={config.hairColor} />
            <path d="M20 35 L25 75" stroke="rgba(0,0,0,0.1)" strokeWidth="2" />
            <path d="M80 35 L75 75" stroke="rgba(0,0,0,0.1)" strokeWidth="2" />
          </svg>
        );
      case 'pompadour':
        return (
          <svg viewBox="0 0 100 100" className="drop-shadow-md" style={{ width: proportions.headSize * 1.2, height: proportions.headSize * 0.7 }}>
            <path d="M10 35 Q10 5 50 5 Q90 5 90 35 Q50 25 10 35" fill={config.hairColor} />
            <path d="M30 25 Q50 15 70 25" stroke="rgba(0,0,0,0.1)" strokeWidth="2" fill="none" />
          </svg>
        );
      case 'spike':
        return (
          <svg viewBox="0 0 100 100" className="drop-shadow-md" style={{ width: proportions.headSize * 1.2, height: proportions.headSize * 0.8 }}>
            <path d="M10 35 L20 10 L30 30 L50 0 L70 30 L80 10 L90 35 Z" fill={config.hairColor} />
          </svg>
        );
      case 'textured':
        return (
          <svg viewBox="0 0 100 100" className="drop-shadow-md" style={{ width: proportions.headSize * 1.2, height: proportions.headSize * 0.8 }}>
            <path d="M10 35 Q15 10 50 10 Q85 10 90 35" fill="none" stroke={config.hairColor} strokeWidth="15" strokeLinecap="round" />
            <path d="M30 20 Q50 15 70 20" stroke="rgba(255,255,255,0.2)" strokeWidth="2" fill="none" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="absolute" style={{ top: -2, left: '50%', transform: 'translateX(-50%)' }}>
      {getHairStyle()}
    </div>
  );
};

// Production-grade Avatar Component
const Avatar = React.memo(({ config, isWalking, isSpeaking, message, emote, status, isLocal, photoURL }: { 
  config: AvatarConfig; 
  isWalking: boolean; 
  isSpeaking: boolean; 
  message?: string; 
  emote?: string; 
  status?: string; 
  isLocal?: boolean;
  photoURL?: string;
}) => {
  const profileImg = photoURL || (isLocal ? auth.currentUser?.photoURL : null);
  const useProfilePic = profileImg && config.useGooglePhoto;

  // Production-grade human proportions
  const proportions = useMemo(() => {
    const baseScale = config.bodyType === 'slim' ? 0.85 : config.bodyType === 'wide' ? 1.15 : 1;
    return {
      totalHeight: 80,
      headSize: Math.round(14 * baseScale),
      neckHeight: 2,
      torsoHeight: Math.round(32 * baseScale),
      torsoWidth: Math.round(28 * baseScale),
      armWidth: Math.round(6 * baseScale),
      armHeight: Math.round(20 * baseScale),
      legWidth: Math.round(8 * baseScale),
      legHeight: Math.round(32 * baseScale),
      shoulderWidth: Math.round(32 * baseScale)
    };
  }, [config.bodyType]);

  return (
    <div className="relative" style={{ 
      width: proportions.totalHeight, 
      height: proportions.totalHeight,
      transform: 'scale(0.9)' // Slightly smaller for better fit
    }}>
      <style>{`
        @keyframes v-walk {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-2px) rotate(-1deg); }
          50% { transform: translateY(0) rotate(0deg); }
          75% { transform: translateY(-2px) rotate(1deg); }
        }
        @keyframes v-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        @keyframes v-blink {
          0%, 90%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.1); }
        }
        @keyframes v-swing-l {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(2deg); }
        }
        @keyframes v-swing-r {
          0%, 100% { transform: rotate(3deg); }
          50% { transform: rotate(-2deg); }
        }
      `}</style>

      {/* Floating UI */}
      <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none">
        <AnimatePresence>
          {message && (
            <motion.div initial={{ opacity: 0, scale: 0.5, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.5 }} className="bg-black/95 backdrop-blur-xl text-white px-4 py-2 rounded-2xl shadow-2xl border border-white/20 font-bold text-xs whitespace-nowrap mb-2">
              {message}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black border-r border-b border-white/20 rotate-45" />
            </motion.div>
          )}
          {emote && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1.5, y: -10 }} exit={{ scale: 0 }} className="text-3xl filter drop-shadow-lg">{emote}</motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Speaking Aura */}
      {isSpeaking && (
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute inset-x-[-8px] inset-y-[-8px] bg-gradient-to-tr from-sky-400 to-indigo-500 rounded-full blur-xl" />
      )}

      {/* Ground Shadow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-2 bg-black/10 rounded-full blur-md" />

      {/* Avatar Container - Single Unit */}
      <div 
        className="relative flex flex-col items-center"
        style={{ 
          animation: isWalking ? 'v-walk 0.5s infinite ease-in-out' : 'v-breathe 3s infinite ease-in-out',
          transformOrigin: 'center bottom'
        }}
      >
        {/* Legs Layer */}
        <div className="relative z-10">
          <AvatarLegs config={config} proportions={proportions} />
        </div>

        {/* Torso Layer */}
        <div className="relative z-20 -mt-1">
          <AvatarTorso config={config} proportions={proportions} />
        </div>

        {/* Head Layer */}
        <div className="relative z-30 -mt-1">
          <AvatarHead config={config} proportions={proportions} profileImg={profileImg} useProfilePic={useProfilePic} />
        </div>

        {/* Hair Layer */}
        {config.hairStyle !== 'none' && (
          <div className="absolute z-40" style={{ top: -proportions.headSize + 2, left: '50%', transform: 'translateX(-50%)' }}>
            <AvatarHair config={config} proportions={proportions} />
          </div>
        )}
      </div>
    </div>
  );
});

interface Task {
  id: string;
  text: string;
  done: boolean;
  uid?: string;
}

const HUD = React.memo(({ zone, tasks, completedCount, pos, roomId, onAddTask, onToggleTask, onDeleteTask, onEditTask, onOpenSettings, onMinimapClick }: { 
  zone: string; 
  tasks: Task[]; 
  completedCount: number; 
  pos: Point; 
  roomId: string;
  onAddTask: (text: string) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onEditTask: (id: string, text: string) => void;
  onOpenSettings: () => void;
  onMinimapClick: (p: Point) => void;
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
                onClick={onOpenSettings}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-white"
                title="Settings"
              >
                <Settings className="w-3 h-3" />
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
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * OFFICE_WIDTH;
            const y = ((e.clientY - rect.top) / rect.height) * OFFICE_HEIGHT;
            onMinimapClick({ x, y });
          }}
          className="bg-black/90 backdrop-blur-md p-2 rounded-xl shadow-2xl w-48 h-32 relative overflow-hidden border border-white/10 cursor-crosshair group"
        >
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] bg-[size:10px_10px]" />
          
          {/* Click to Teleport Tooltip */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
            <span className="text-[8px] font-black uppercase tracking-widest bg-white text-black px-2 py-1 rounded">Click to Teleport</span>
          </div>

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
});

const UserMenu = React.memo(({ name, playersCount, user, onOpenSettings }: { name: string; playersCount: number; user: any; onOpenSettings: () => void }) => (
  <div className="fixed top-6 right-6 z-50 flex items-center gap-3">
    <div 
      onClick={onOpenSettings}
      className="bg-black/90 backdrop-blur-md p-2 rounded-full shadow-2xl flex items-center gap-3 pr-5 border border-white/10 hover:bg-black transition-all cursor-pointer group"
    >
      <div className="w-10 h-10 rounded-full overflow-hidden bg-white flex items-center justify-center text-black shadow-inner border-2 border-white/20">
        {user?.photoURL ? (
          <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <User className="w-5 h-5" />
        )}
      </div>
      <div>
        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">Active Now</p>
        <p className="text-sm font-black text-white leading-none">{name}</p>
      </div>
      <SettingsIcon className="w-4 h-4 text-white/20 group-hover:text-white group-hover:rotate-90 transition-all ml-1" />
    </div>
    <div className="bg-black/90 backdrop-blur-md p-3 rounded-full shadow-2xl flex items-center gap-2 px-5 border border-white/10">
      <div className="relative">
        <Users className="w-4 h-4 text-white/40" />
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full border border-black" />
      </div>
      <span className="text-xs font-black text-white tracking-widest">{playersCount}</span>
    </div>
  </div>
));

const EntryModal = ({ onJoin, user }: { onJoin: (name: string, room: string, avatar?: AvatarConfig, status?: string, password?: string) => void; user: any }) => {
  const [name, setName] = useState(() => {
    // Auto-populate with Google display name for logged-in users
    return user?.displayName || "";
  });
  const [room, setRoom] = useState("");
  const [password, setPassword] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [selectedStatus, setSelectedStatus] = useState("available");
  const [showAvatarCustomizer, setShowAvatarCustomizer] = useState(false);
  const [tempAvatar, setTempAvatar] = useState<AvatarConfig | null>(null);

  // Update name when user logs in
  useEffect(() => {
    if (user?.displayName && !name) {
      setName(user.displayName);
    }
  }, [user, name]);

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
      <CharacterCustomizationModal 
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
                  placeholder={user?.displayName ? "Custom name (optional)" : "Display Name"}
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

const CharacterCustomizationModal = ({ onComplete, user, userName }: { onComplete: (config: AvatarConfig) => void, user: any, userName: string | null }) => {
  // Production-grade state management
  const [config, setConfig] = useState<AvatarConfig>(() => {
    const saved = localStorage.getItem('avatarConfig');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Validate and sanitize saved config
        return {
          skinColor: parsed.skinColor || '#f3c9b1',
          hairStyle: ['none', 'bald', 'short', 'long', 'pompadour', 'curly', 'spike', 'fade', 'textured'].includes(parsed.hairStyle) ? parsed.hairStyle : 'short',
          hairColor: parsed.hairColor || '#4a2c2a',
          shirtStyle: ['tshirt', 'hoodie', 'suit', 'dress'].includes(parsed.shirtStyle) ? parsed.shirtStyle : 'hoodie',
          shirtColor: parsed.shirtColor || '#000000',
          pantsStyle: ['jeans', 'shorts', 'suit-pants'].includes(parsed.pantsStyle) ? parsed.pantsStyle : 'jeans',
          pantsColor: parsed.pantsColor || '#1e293b',
          bodyType: ['slim', 'normal', 'wide'].includes(parsed.bodyType) ? parsed.bodyType : 'normal',
          useGooglePhoto: !!parsed.useGooglePhoto
        };
      } catch {
        // Fallback if corrupted
      }
    }
    return {
      skinColor: '#f3c9b1',
      hairStyle: 'short',
      hairColor: '#4a2c2a',
      shirtStyle: 'hoodie',
      shirtColor: '#000000',
      pantsStyle: 'jeans',
      pantsColor: '#1e293b',
      bodyType: 'normal',
      useGooglePhoto: !!user?.photoURL
    };
  });

  // Production-grade color palettes
  const skinColors = [
    { name: 'Light', value: '#f3c9b1' },
    { name: 'Medium', value: '#e0ac69' },
    { name: 'Tan', value: '#8d5524' },
    { name: 'Olive', value: '#c68642' },
    { name: 'Fair', value: '#ffdbac' },
    { name: 'Peach', value: '#f1c27d' }
  ];
  
  const hairColors = [
    { name: 'Brown', value: '#4a2c2a' },
    { name: 'Black', value: '#2c1e1e' },
    { name: 'Blonde', value: '#d6b37a' },
    { name: 'Gray', value: '#a5a5a5' },
    { name: 'Jet Black', value: '#000000' },
    { name: 'Purple', value: '#7c3aed' },
    { name: 'Blue', value: '#3b82f6' }
  ];
  
  const shirtColors = [
    { name: 'Midnight', value: '#0f172a' },
    { name: 'Ocean', value: '#2563eb' },
    { name: 'Forest', value: '#16a34a' },
    { name: 'Amber', value: '#d97706' },
    { name: 'Royal', value: '#7c3aed' },
    { name: 'Cloud', value: '#f8fafc' },
    { name: 'Ruby', value: '#ef4444' },
    { name: 'Gold', value: '#f59e0b' }
  ];
  
  const pantsColors = [
    { name: 'Navy', value: '#1e293b' },
    { name: 'Slate', value: '#334155' },
    { name: 'Stone', value: '#475569' },
    { name: 'Indigo', value: '#1e1b4b' },
    { name: 'Black', value: '#000000' },
    { name: 'Charcoal', value: '#2d3748' }
  ];
  
  const hairStyles: Array<{ name: string; value: AvatarConfig['hairStyle'] }> = [
    { name: 'None', value: 'none' },
    { name: 'Bald', value: 'bald' },
    { name: 'Short', value: 'short' },
    { name: 'Long', value: 'long' },
    { name: 'Pompadour', value: 'pompadour' },
    { name: 'Curly', value: 'curly' },
    { name: 'Spike', value: 'spike' },
    { name: 'Fade', value: 'fade' },
    { name: 'Textured', value: 'textured' }
  ];
  
  const shirtStyles: Array<{ name: string; value: AvatarConfig['shirtStyle'] }> = [
    { name: 'T-Shirt', value: 'tshirt' },
    { name: 'Hoodie', value: 'hoodie' },
    { name: 'Suit', value: 'suit' },
    { name: 'Dress', value: 'dress' }
  ];
  
  const pantsStyles: Array<{ name: string; value: AvatarConfig['pantsStyle'] }> = [
    { name: 'Jeans', value: 'jeans' },
    { name: 'Shorts', value: 'shorts' },
    { name: 'Suit Pants', value: 'suit-pants' }
  ];
  
  const bodyTypes: Array<{ name: string; value: AvatarConfig['bodyType'] }> = [
    { name: 'Slim', value: 'slim' },
    { name: 'Normal', value: 'normal' },
    { name: 'Wide', value: 'wide' }
  ];

  // Production-grade update functions with immediate feedback
  const updateConfig = (updates: Partial<AvatarConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    // Immediate visual feedback - save to localStorage
    localStorage.setItem('avatarConfig', JSON.stringify(newConfig));
  };

  const handleComplete = async () => {
    // Final validation
    const validConfig = {
      skinColor: config.skinColor || '#f3c9b1',
      hairStyle: config.hairStyle || 'short',
      hairColor: config.hairColor || '#4a2c2a',
      shirtStyle: config.shirtStyle || 'hoodie',
      shirtColor: config.shirtColor || '#000000',
      pantsStyle: config.pantsStyle || 'jeans',
      pantsColor: config.pantsColor || '#1e293b',
      bodyType: config.bodyType || 'normal',
      useGooglePhoto: !!config.useGooglePhoto
    };
    
    localStorage.setItem('avatarConfig', JSON.stringify(validConfig));
    if (user) {
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name: userName,
        avatarConfig: validConfig,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
    onComplete(validConfig);
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl flex flex-col md:flex-row overflow-hidden"
      >
        {/* Preview Section */}
        <div className="md:w-[45%] bg-slate-50 p-12 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-100 relative">
          <div className="absolute top-8 left-8 right-8 text-center">
            <h2 className="text-3xl font-black text-black tracking-tight mb-2">Character Builder</h2>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Production Grade Assets</p>
          </div>
          
          <div className="scale-[3] mb-24 mt-12">
            <Avatar config={config} isWalking={false} isSpeaking={false} isLocal />
          </div>

          <div className="flex flex-col gap-3 w-full max-w-xs">
            {user?.photoURL && (
              <button 
                onClick={() => setConfig({ ...config, useGooglePhoto: !config.useGooglePhoto })}
                className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${config.useGooglePhoto ? 'bg-black text-white shadow-2xl' : 'bg-white border border-slate-200 text-slate-500 hover:border-black hover:text-black'}`}
              >
                {config.useGooglePhoto ? (
                  <><CheckCircle2 className="w-4 h-4" />Using Google Profile Photo</>
                ) : (
                  <><Globe className="w-4 h-4" />Sync Google Profile</>
                )}
              </button>
            )}

            <button 
              onClick={() => {
                const r = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
                setConfig({
                  ...config,
                  skinColor: r(skinColors),
                  hairColor: r(hairColors),
                  shirtColor: r(shirtColors),
                  pantsColor: r(pantsColors),
                  hairStyle: r(hairStyles),
                  shirtStyle: r(shirtStyles),
                  pantsStyle: r(pantsStyles),
                  bodyType: r(bodyTypes)
                });
              }}
              className="w-full flex items-center justify-center gap-2 py-4 text-black/40 font-black text-xs uppercase tracking-widest hover:text-black transition-colors"
            >
              <Zap className="w-3 h-3" />
              Randomize Selection
            </button>
          </div>
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
                    onClick={() => updateConfig({ hairStyle: style.value })}
                    className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${config.hairStyle === style ? 'bg-black text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {style.name.charAt(0).toUpperCase() + style.name.slice(1)}
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
                    onClick={() => updateConfig({ hairColor: color.value })}
                    className={`w-8 h-8 rounded-full border-4 transition-all ${config.hairColor === color ? 'border-black scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </section>

            {/* Shirt Style */}
            <section>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Outfit Style</h3>
              <div className="flex flex-wrap gap-2">
                {shirtStyles.map(style => (
                  <button 
                    key={style}
                    onClick={() => {
                      updateConfig({ shirtStyle: style.value });
                    }}
                    className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                      config.shirtStyle === style 
                        ? 'bg-black text-white shadow-lg scale-105' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:scale-105'
                    }`}
                  >
                    {style.name.charAt(0).toUpperCase() + style.name.slice(1)}
                  </button>
                ))}
              </div>
            </section>

            {/* Shirt Color */}
            <section>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Outfit Color</h3>
              <div className="flex flex-wrap gap-3">
                {shirtColors.map(color => (
                  <button 
                    key={color}
                    onClick={() => {
                      const newConfig = { ...config, shirtColor: color };
                      setConfig(newConfig);
                      // Immediate visual feedback - save to localStorage
                      localStorage.setItem('avatarConfig', JSON.stringify(newConfig));
                    }}
                    className={`w-8 h-8 rounded-full border-4 transition-all ${
                      config.shirtColor === color 
                        ? 'border-black scale-110 shadow-lg' 
                        : 'border-transparent hover:scale-105 hover:border-slate-300'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </section>

            {/* Pants Style */}
            <section>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Bottoms</h3>
              <div className="flex flex-wrap gap-2">
                {pantsStyles.map(style => (
                  <button 
                    key={style}
                    onClick={() => {
                      updateConfig({ pantsStyle: style.value });
                    }}
                    className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                      config.pantsStyle === style 
                        ? 'bg-black text-white shadow-lg scale-105' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:scale-105'
                    }`}
                  >
                    {style.name.charAt(0).toUpperCase() + style.name.slice(1)}
                  </button>
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
                    onClick={() => updateConfig({ bodyType: type.value })}
                    className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${config.bodyType === type ? 'bg-black text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {type.name.charAt(0).toUpperCase() + type.name.slice(1)}
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

const RemotePlayerAvatar = React.memo(({ player, localPos, localIsPrivate, localZone }: { player: RemotePlayer; localPos: Point; localIsPrivate: boolean; localZone: string; key?: string }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const dist = Math.hypot(player.pos.x - localPos.x, player.pos.y - localPos.y);
  
  // Proximity-based visibility for speaking cue
  const canSeeSpeakingCue = dist < VOICE_RADIUS * 1.5;

  // Improved interpolation for smoother movement
  const springConfig = { 
    type: 'spring', 
    damping: 40, 
    stiffness: 300, 
    mass: 0.3,
    restDelta: 0.001,
    restSpeed: 0.001
  };

  // Meeting Room Isolation Logic:
  const isMeetingRoom = (z: string) => z && z.startsWith("Conference Room");
  const inSameMeetingRoom = isMeetingRoom(localZone) && localZone === player.zone;
  const localInMeetingRoom = isMeetingRoom(localZone);
  const playerInMeetingRoom = isMeetingRoom(player.zone);
  
  // Private Bubble Logic: 
  const inSameBubble = dist < 100;
  const isMutedByPrivate = (player.isPrivate || localIsPrivate) && !inSameBubble;
  
  let volume = 0;
  // STRICT ISOLATION: 
  // 1. If local is in a meeting room, only hear people in the SAME room.
  // 2. If local is NOT in a meeting room, but player IS, player is inaudible.
  if (localInMeetingRoom) {
    if (inSameMeetingRoom) {
      const normalizedDist = dist / (VOICE_RADIUS * 1.5);
      volume = normalizedDist < 1 ? 1 / (1 + Math.pow(normalizedDist * 2, 2)) : 0;
    } else {
      volume = 0; // Completely inaudible if not in same room
    }
  } else if (playerInMeetingRoom) {
    volume = 0; // Completely inaudible to those outside
  } else if (!isMutedByPrivate) {
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

      <Avatar 
        config={player.avatarConfig} 
        isWalking={player.isWalking} 
        isSpeaking={player.isSpeaking && canSeeSpeakingCue} 
        message={player.message}
        emote={player.emote}
        status={player.status}
        photoURL={(player as any).photoURL}
      />
      <audio ref={audioRef} autoPlay />
    </motion.div>
  );
});

export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [user, setUser] = useState<any>(null);
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
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const [localEmote, setLocalEmote] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const keysRef = useRef<Record<string, boolean>>({});
  const remotePlayersRef = useRef<Record<string, RemotePlayer>>({});
  const isWalkingRef = useRef(false);
  const angleRef = useRef(180);
  const currentZoneRef = useRef("Lobby");
  const tasksRef = useRef<Task[]>([]);
  const peersRef = useRef<Record<string, Peer.Instance>>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef<number>(null);
  const posRef = useRef<Point>({ x: 100, y: 700 });
  const lastEmitRef = useRef<number>(0);
  const seqRef = useRef<number>(0);
  const pendingInputs = useRef<{ seq: number; pos: Point }[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const [showEmotePicker, setShowEmotePicker] = useState(false);

  // Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        
        // Load Profile
        const profileDoc = await getDoc(doc(db, 'users', u.uid));
        if (profileDoc.exists()) {
          const data = profileDoc.data();
          // Use custom display name if set, otherwise use Google display name
          setUserName(data.displayName || u.displayName || "Anonymous");
          setAvatarConfig(data.avatarConfig);
          if (data.lastPos) {
            posRef.current = data.lastPos;
            setPos(data.lastPos);
          }
        } else {
          // No custom profile, use Google display name as default
          setUserName(u.displayName || "Anonymous");
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

  // Save position periodically
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      await setDoc(doc(db, 'users', user.uid), {
        lastPos: posRef.current,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }, 10000); // Every 10 seconds
    return () => clearInterval(interval);
  }, [user]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;

      if (e.key.toLowerCase() === 's') {
        setShowSettings(prev => !prev);
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const chatInputEl = document.querySelector('input[placeholder="Type a message..."]') as HTMLInputElement;
        chatInputEl?.focus();
      }
      if (e.key >= '1' && e.key <= '8') {
        const emotes = ["👋", "👍", "😂", "🚀", "🔥", "❤️", "😮", "🎉"];
        handleSendEmote(emotes[parseInt(e.key) - 1]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleJoin = async (name: string, room: string, avatar?: AvatarConfig, initialStatus?: string, password?: string) => {
    let currentUser = user;
    if (!currentUser) {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        currentUser = result.user;
        setUser(result.user);
        // Use Google name as default, but allow custom changes
        const displayName = name || result.user.displayName || "Anonymous";
        setUserName(displayName);
        
        // Store custom name in Firebase if different from Google display name
        if (name && name !== result.user.displayName) {
          await setDoc(doc(db, 'users', result.user.uid), {
            displayName: name,
            customName: true,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
      } catch (err) {
        console.error("Auth failed", err);
        setUserName(name);
        // If auth fails, we might still want to allow joining as guest? 
        // But rules require isAuthenticated() for private rooms.
      }
    } else {
      // User is already logged in
      const displayName = name || currentUser.displayName || "Anonymous";
      setUserName(displayName);
      
      // Store custom name in Firebase if different from Google display name
      if (name && name !== currentUser.displayName) {
        await setDoc(doc(db, 'users', currentUser.uid), {
          displayName: name,
          customName: true,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
    }

    if (password) {
      const roomDoc = await getDoc(doc(db, 'rooms', room));
      if (roomDoc.exists() && roomDoc.data().password && roomDoc.data().password !== password) {
        alert("Incorrect room password!");
        return;
      }
    }

    if (avatar) setAvatarConfig(avatar);
    if (initialStatus) setStatus(initialStatus as any);
    setRoomId(room);
  };

  const handleMinimapClick = (p: Point) => {
    // Check for collisions at target point
    if (checkCollision(p.x, p.y)) return;
    
    posRef.current = p;
    setPos(p);
    
    // Emit teleport event
    if (socketRef.current) {
      socketRef.current.emit('user:moved', {
        pos: p,
        angle: angleRef.current,
        isWalking: false,
        zone: currentZoneRef.current
      });
    }
  };

  const handleAddTask = async (text: string) => {
    if (user) {
      await addDoc(collection(db, 'tasks'), {
        uid: user.uid,
        text,
        done: false,
        createdAt: new Date().toISOString()
      });
    } else {
      setTasks(prev => [...prev, { id: Date.now().toString(), text, done: false }]);
    }
  };

  const handleToggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (user && task) {
      await updateDoc(doc(db, 'tasks', id), { done: !task.done });
    } else {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (user) {
      await deleteDoc(doc(db, 'tasks', id));
    } else {
      setTasks(prev => prev.filter(t => t.id !== id));
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
      setLocalMessage(chatInput.trim());
      socketRef.current?.emit("chat:message", chatInput.trim());
      setChatInput("");
      setTimeout(() => setLocalMessage(null), 5000);
    }
  };

  const handleSendEmote = (emote: string) => {
    setLocalEmote(emote);
    socketRef.current?.emit("chat:emote", emote);
    setShowEmotePicker(false);
    setTimeout(() => setLocalEmote(null), 3000);
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
    socketRef.current = io({
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    const socket = socketRef.current;

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
      console.error("Socket error details:", err);
    });

    socket.on("reconnect_attempt", (attempt) => {
      console.log(`Socket reconnect attempt #${attempt}`);
    });

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
        zone: currentZone,
        photoURL: user?.photoURL
      });
    });

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("init", (users: Record<string, any>) => {
      console.log("Received init users:", Object.keys(users));
      const others = { ...users };
      if (socket.id) delete others[socket.id];
      remotePlayersRef.current = others;
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
      remotePlayersRef.current[user.id] = user;
      setRemotePlayers(prev => ({ ...prev, [user.id]: user }));
      // We don't initiate here; we wait for their signal
    });

    socket.on("user:moved", (data: any) => {
      const prevPlayer = remotePlayersRef.current[data.id];
      if (!prevPlayer) return;

      const zone = ZONES.find(z => 
        data.pos.x >= z.bounds.left && data.pos.x <= z.bounds.right && 
        data.pos.y >= z.bounds.top && data.pos.y <= z.bounds.bottom
      );
      
      const updatedPlayer = { 
        ...prevPlayer, 
        ...data, 
        zone: zone?.name || "Lobby",
        prevPos: prevPlayer.pos,
        lastUpdate: Date.now()
      };

      remotePlayersRef.current[data.id] = updatedPlayer;
      setRemotePlayers(prev => ({ ...prev, [data.id]: updatedPlayer }));
    });

    socket.on("move:ack", (data: { seq: number, pos: Point }) => {
      // Server-side reconciliation:
      // Remove acknowledged inputs
      pendingInputs.current = pendingInputs.current.filter(input => input.seq > data.seq);
      
      // If the server position differs significantly from our predicted position at that time,
      // we could snap or lerp back. For now, we trust our local prediction but keep this for future physics.
      const dist = Math.hypot(posRef.current.x - data.pos.x, posRef.current.y - data.pos.y);
      if (dist > 50) {
        // Correct position if desync is too large
        posRef.current = data.pos;
        setPos(data.pos);
      }
    });

    socket.on("user:speaking", (data: any) => {
      if (remotePlayersRef.current[data.id]) {
        remotePlayersRef.current[data.id].isSpeaking = data.isSpeaking;
        setRemotePlayers(prev => ({ ...prev, [data.id]: { ...prev[data.id], isSpeaking: data.isSpeaking } }));
      }
    });

    socket.on("user:status", (data: any) => {
      if (remotePlayersRef.current[data.id]) {
        remotePlayersRef.current[data.id].status = data.status;
        remotePlayersRef.current[data.id].isPrivate = data.isPrivate;
        setRemotePlayers(prev => ({ ...prev, [data.id]: { ...prev[data.id], status: data.status, isPrivate: data.isPrivate } }));
      }
    });

    socket.on("chat:message", (data: any) => {
      if (remotePlayersRef.current[data.id]) {
        remotePlayersRef.current[data.id].message = data.message;
        setRemotePlayers(prev => ({ ...prev, [data.id]: { ...prev[data.id], message: data.message } }));
      }
      setTimeout(() => {
        if (remotePlayersRef.current[data.id]) {
          remotePlayersRef.current[data.id].message = undefined;
          setRemotePlayers(prev => ({ ...prev, [data.id]: { ...prev[data.id], message: undefined } }));
        }
      }, 5000);
    });

    socket.on("chat:emote", (data: any) => {
      if (remotePlayersRef.current[data.id]) {
        remotePlayersRef.current[data.id].emote = data.emote;
        setRemotePlayers(prev => ({ ...prev, [data.id]: { ...prev[data.id], emote: data.emote } }));
      }
      setTimeout(() => {
        if (remotePlayersRef.current[data.id]) {
          remotePlayersRef.current[data.id].emote = undefined;
          setRemotePlayers(prev => ({ ...prev, [data.id]: { ...prev[data.id], emote: undefined } }));
        }
      }, 3000);
    });

    socket.on("user:left", (id: string) => {
      console.log("User left:", id);
      delete remotePlayersRef.current[id];
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

      // Throttle emits to 20Hz to reduce network jitter and traffic
      if (Date.now() - lastEmitRef.current > 50) {
        socketRef.current?.emit("move", { 
          pos: posRef.current, 
          angle: newAngle, 
          isWalking: true,
          seq: currentSeq
        });
        lastEmitRef.current = Date.now();
      }
    }

    if (isWalkingRef.current !== currentlyWalking) {
      isWalkingRef.current = currentlyWalking;
      setIsWalking(currentlyWalking);
      if (!currentlyWalking) {
        socketRef.current?.emit("move", { 
          pos: posRef.current, 
          angle: angleRef.current, 
          isWalking: false,
          seq: seqRef.current++
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
      if (key === 's') {
        e.preventDefault();
        setShowSettings(true);
      }
      if (key === 'c') {
        e.preventDefault();
        document.getElementById('chat-input')?.focus();
      }
      if (key === '1') setLocalEmote("👋");
      if (key === '2') setLocalEmote("🔥");
      if (key === '3') setLocalEmote("❤️");
      if (key === '4') setLocalEmote("😂");

      if (key === 'e') {
        setTasks(prev => prev.map(t => {
          if (!t.done && t.zone === currentZoneRef.current) return { ...t, done: true };
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
      keysRef.current[key] = false;
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
  }, [loop]);

  const handleLogout = async () => {
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
      }
    }
    setShowLanding(false);
  };

  if (showLanding && !userName) return <LandingPage onStart={handleStart} user={user} onLogout={handleLogout} />;
  if (!userName || !roomId) return <EntryModal onJoin={handleJoin} user={user} />;
  if (!avatarConfig) return <CharacterCustomizationModal onComplete={setAvatarConfig} user={user} userName={userName} />;

  return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center overflow-hidden font-sans selection:bg-white/20">
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        userName={userName} 
        roomId={roomId} 
        onLogout={handleLogout}
        user={user}
      />
      {/* Connection Overlay */}
      <AnimatePresence>
        {!isConnected && roomId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[5000] bg-black/60 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="bg-white p-8 rounded-[32px] shadow-2xl flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin" />
              <p className="font-black uppercase tracking-widest text-xs">Connecting to Workspace...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mic Status Indicator */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1000] flex flex-col items-center gap-2 pointer-events-none">
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
        onAddTask={handleAddTask}
        onToggleTask={handleToggleTask}
        onDeleteTask={handleDeleteTask}
        onEditTask={handleEditTask}
        onOpenSettings={() => setShowSettings(true)}
        onMinimapClick={handleMinimapClick}
      />
      <UserMenu 
        name={userName} 
        playersCount={Object.keys(remotePlayers).length + 1} 
        user={user}
        onOpenSettings={() => setShowSettings(true)}
      />
      
      <div 
        id="office"
        className="relative bg-slate-50 border-[12px] border-black rounded-lg shadow-[0_60px_120px_rgba(0,0,0,0.5)] overflow-hidden"
        style={{ 
          width: OFFICE_WIDTH, 
          height: OFFICE_HEIGHT,
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
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

          <Avatar 
            config={avatarConfig} 
            isWalking={isWalking} 
            isSpeaking={isSpeaking} 
            message={localMessage || undefined}
            emote={localEmote || undefined}
            status={status}
            isLocal
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
                {['👋', '👍', '😂', '🚀', '🔥', '❤️', '💡', '🎉'].map(e => (
                  <button
                    key={e}
                    onClick={() => handleSendEmote(e)}
                    className="text-2xl hover:scale-125 transition-transform p-2"
                  >
                    {e}
                  </button>
                ))}
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
