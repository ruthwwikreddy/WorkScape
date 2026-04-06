/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Briefcase
} from 'lucide-react';

// --- Constants ---
const OFFICE_WIDTH = 1200;
const OFFICE_HEIGHT = 800;
const AVATAR_RADIUS = 20;
const SPEED = 6;

// --- Types ---
interface Point { x: number; y: number; }
interface Rect { left: number; right: number; top: number; bottom: number; }
interface Zone { name: string; bounds: Rect; }

const ZONES: Zone[] = [
  { name: "Executive Suite", bounds: { left: 0, right: OFFICE_WIDTH, top: 0, bottom: 210 } },
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

const HUD = ({ zone, tasks, completedCount, pos }: { zone: string; tasks: any[]; completedCount: number; pos: Point }) => (
  <div className="fixed top-6 left-6 z-50 flex flex-col gap-4 pointer-events-none">
    <motion.div 
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="bg-white/90 backdrop-blur-md p-5 rounded-2xl shadow-2xl border-l-8 border-rose-600 w-64 pointer-events-auto"
    >
      <div className="flex items-center gap-2 mb-1">
        <MapPin className="w-3 h-3 text-slate-400" />
        <h1 className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Current Zone</h1>
      </div>
      <p className="text-xl font-black text-slate-800 tracking-tight">{zone}</p>
    </motion.div>

    <motion.div 
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.1 }}
      className="bg-white/90 backdrop-blur-md p-5 rounded-2xl shadow-2xl w-64 pointer-events-auto"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Daily Tasks</h2>
        </div>
        <span className="text-[10px] bg-slate-100 px-2 py-1 rounded-full font-bold text-slate-600">
          {completedCount}/{tasks.length}
        </span>
      </div>
      <div className="space-y-3">
        {tasks.map((task, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${task.done ? 'bg-emerald-500' : 'bg-slate-200'}`} />
            <span className={`text-xs font-medium ${task.done ? 'text-slate-400 line-through' : 'text-slate-600'}`}>
              {task.text}
            </span>
          </div>
        ))}
      </div>
    </motion.div>

    {/* Minimap */}
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="bg-slate-900/80 backdrop-blur-md p-2 rounded-xl shadow-2xl w-48 h-32 relative overflow-hidden border border-white/10 pointer-events-auto"
    >
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] bg-[size:10px_10px]" />
      {/* Character Dot */}
      <motion.div 
        animate={{ 
          left: (pos.x / OFFICE_WIDTH) * 100 + '%', 
          top: (pos.y / OFFICE_HEIGHT) * 100 + '%' 
        }}
        className="absolute w-2 h-2 bg-rose-500 rounded-full shadow-[0_0_10px_#f43f5e] z-10 -translate-x-1/2 -translate-y-1/2"
      />
      {/* Simple Wall Outlines */}
      {WALLS.map((w, i) => (
        <div 
          key={i} 
          className="absolute bg-white/20"
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
);

const UserMenu = () => (
  <div className="fixed top-6 right-6 z-50 flex items-center gap-3">
    <div className="bg-white/90 backdrop-blur-md p-2 rounded-full shadow-lg flex items-center gap-3 pr-5 border border-white/50">
      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-500 to-orange-400 flex items-center justify-center text-white shadow-inner">
        <User className="w-5 h-5" />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-800 leading-none tracking-tight">Senior Architect</p>
      </div>
    </div>
    <button className="bg-white/90 backdrop-blur-md p-3 rounded-full shadow-lg hover:bg-rose-50 transition-colors text-slate-400 hover:text-rose-500">
      <Bell className="w-5 h-5" />
    </button>
    <button className="bg-white/90 backdrop-blur-md p-3 rounded-full shadow-lg hover:bg-slate-100 transition-colors text-slate-400">
      <Settings className="w-5 h-5" />
    </button>
  </div>
);

const InteractionPrompt = ({ text }: { text: string }) => (
  <motion.div 
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    exit={{ y: 20, opacity: 0 }}
    className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[2000] bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-white/10"
  >
    <div className="w-6 h-6 bg-white/20 rounded flex items-center justify-center font-bold text-xs">E</div>
    <span className="text-sm font-bold tracking-wide">{text}</span>
  </motion.div>
);

export default function App() {
  const [pos, setPos] = useState<Point>({ x: 100, y: 700 });
  const [angle, setAngle] = useState(180);
  const [isWalking, setIsWalking] = useState(false);
  const [currentZone, setCurrentZone] = useState("Lobby");
  const [keys, setKeys] = useState<Record<string, boolean>>({});
  const [tasks, setTasks] = useState([
    { text: "Check morning emails", done: false, zone: "Central Hub", type: "laptop" },
    { text: "Grab a fresh espresso", done: false, zone: "Pantry Area", type: "coffee" },
    { text: "Review Executive 01 plans", done: false, zone: "Executive Suite", type: "laptop" },
    { text: "Clock out for the day", done: false, zone: "Reception", type: "clock" },
  ]);
  const [interaction, setInteraction] = useState<string | null>(null);

  const requestRef = useRef<number>(null);
  const posRef = useRef<Point>({ x: 100, y: 700 });

  const checkCollision = (nx: number, ny: number) => {
    const r = 18;
    if (nx < r || nx > OFFICE_WIDTH - r || ny < r || ny > OFFICE_HEIGHT - r) return true;
    
    const p = { left: nx - r, right: nx + r, top: ny - r, bottom: ny + r };
    
    // Wall collisions
    if (WALLS.some(w => !(p.right < w.left || p.left > w.right || p.bottom < w.top || p.top > w.bottom))) return true;
    
    return false;
  };

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

    if (dx !== 0 || dy !== 0) {
      setIsWalking(true);
      if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }

      const nextX = posRef.current.x + dx;
      const nextY = posRef.current.y + dy;

      let finalX = posRef.current.x;
      let finalY = posRef.current.y;

      if (!checkCollision(nextX, posRef.current.y)) finalX = nextX;
      if (!checkCollision(posRef.current.x, nextY)) finalY = nextY;

      posRef.current = { x: finalX, y: finalY };
      setPos({ ...posRef.current });
      updateZone(finalX, finalY);

      const moveAngle = Math.atan2(dy, dx) * 180 / Math.PI;
      setAngle(moveAngle + 90);
    } else {
      setIsWalking(false);
    }

    // Check for nearby interactions
    const activeTask = tasks.find(t => !t.done && t.zone === currentZone);
    if (activeTask) {
      setInteraction(`Press E to ${activeTask.text.toLowerCase()}`);
    } else {
      setInteraction(null);
    }

    requestRef.current = requestAnimationFrame(loop);
  }, [keys, currentZone, tasks]);

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
    };
    const handleKeyUp = (e: KeyboardEvent) => setKeys(prev => ({ ...prev, [e.key.toLowerCase()]: false }));

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

  return (
    <div className="min-h-screen bg-[#eceef2] flex items-center justify-center overflow-hidden font-sans selection:bg-rose-200">
      <HUD zone={currentZone} tasks={tasks} completedCount={completedCount} pos={pos} />
      <UserMenu />
      
      <AnimatePresence>
        {interaction && <InteractionPrompt text={interaction} />}
      </AnimatePresence>

      <div 
        id="office"
        className="relative bg-white border-[12px] border-slate-800 rounded-lg shadow-[0_60px_120px_rgba(0,0,0,0.15)] overflow-hidden"
        style={{ width: OFFICE_WIDTH, height: OFFICE_HEIGHT, backgroundImage: 'radial-gradient(#e2e8f0 1.5px, transparent 1.5px)', backgroundSize: '40px 40px' }}
      >
        {/* Dynamic Lighting Overlay */}
        <div 
          className="absolute inset-0 z-[1100] pointer-events-none mix-blend-multiply opacity-30"
          style={{ 
            background: `radial-gradient(circle at ${pos.x}px ${pos.y}px, transparent 100px, #0f172a 400px)` 
          }}
        />
        {/* Walls */}
        {WALLS.map((w, i) => (
          <div 
            key={i} 
            className="absolute bg-slate-800 z-10 shadow-sm"
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

        {/* Doors */}
        <Doors pos={pos} />

        {/* Character Avatar */}
        <motion.div
          animate={{ x: pos.x, y: pos.y, rotate: angle }}
          transition={{ type: 'spring', damping: 25, stiffness: 200, mass: 0.5 }}
          className="absolute z-[1000] -ml-[30px] -mt-[30px] w-[60px] h-[60px]"
        >
          <div className={`relative w-full h-full ${isWalking ? 'animate-bounce' : ''}`}>
             <div className="w-full h-full rounded-full bg-gradient-to-tr from-rose-500 to-orange-400 border-4 border-white shadow-2xl flex items-center justify-center overflow-hidden">
                <User className="w-8 h-8 text-white" />
                {/* Overlaying a directional indicator */}
                <div className="absolute top-1 w-2 h-2 bg-white rounded-full" />
             </div>
            {isWalking && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-2 bg-black/10 rounded-[100%] blur-[2px]" />
            )}
          </div>
        </motion.div>
      </div>

      {/* Background Decor */}
      <div className="fixed bottom-8 right-8 flex items-center gap-4 text-slate-400">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span className="text-xs font-bold tabular-nums">09:42 AM</span>
        </div>
        <div className="h-4 w-px bg-slate-200" />
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-orange-400" />
          <span className="text-xs font-bold">84% Focus</span>
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
            className="absolute bg-rose-600 z-20 origin-left"
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
    <div className="absolute z-20 flex flex-col overflow-hidden bg-rose-600/10" style={{ left: 848, top: 560, width: 14, height: 80 }}>
      <motion.div 
        animate={{ y: isOpen ? '-100%' : '0%' }}
        className="flex-1 bg-rose-600 border-b border-rose-700"
      />
      <motion.div 
        animate={{ y: isOpen ? '100%' : '0%' }}
        className="flex-1 bg-rose-600 border-t border-rose-700"
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
