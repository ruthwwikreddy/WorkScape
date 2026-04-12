import React from 'react';
import { motion } from 'motion/react';
import { User, MapPin } from 'lucide-react';

interface MinimapProps {
  localPos: { x: number; y: number };
  remotePlayers: Record<string, { pos: { x: number; y: number }; name: string; isSpeaking: boolean }>;
  zones: Array<{ name: string; bounds: { left: number; right: number; top: number; bottom: number } }>;
  currentZone: string;
  onZoneClick?: (zoneName: string) => void;
}

export const Minimap: React.FC<MinimapProps> = ({
  localPos,
  remotePlayers,
  zones,
  currentZone,
  onZoneClick
}) => {
  const mapWidth = 200;
  const mapHeight = 133;
  const scaleX = mapWidth / 1200;
  const scaleY = mapHeight / 800;

  const getZoneColor = (zoneName: string) => {
    if (zoneName === currentZone) return 'rgba(139, 92, 246, 0.3)';
    if (zoneName.includes('Conference')) return 'rgba(59, 130, 246, 0.2)';
    if (zoneName.includes('Executive')) return 'rgba(236, 72, 153, 0.2)';
    if (zoneName.includes('Pantry')) return 'rgba(14, 165, 233, 0.2)';
    if (zoneName.includes('Reception')) return 'rgba(249, 115, 22, 0.2)';
    if (zoneName.includes('Central')) return 'rgba(34, 197, 94, 0.15)';
    return 'rgba(100, 100, 100, 0.1)';
  };

  return (
    <div className="bg-black/90 backdrop-blur-xl rounded-2xl p-4 border border-white/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-white/60" />
          <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Minimap</span>
        </div>
        <span className="text-[10px] text-white/40 font-medium">{Object.keys(remotePlayers).length + 1} online</span>
      </div>
      
      <div 
        className="relative rounded-xl overflow-hidden border border-white/10"
        style={{ width: mapWidth, height: mapHeight }}
      >
        {/* Background */}
        <div className="absolute inset-0 bg-slate-900" />
        
        {/* Zones */}
        {zones.map((zone) => (
          <motion.div
            key={zone.name}
            layout
            onClick={() => onZoneClick?.(zone.name)}
            className="absolute cursor-pointer transition-all hover:opacity-80"
            style={{
              left: zone.bounds.left * scaleX,
              top: zone.bounds.top * scaleY,
              width: (zone.bounds.right - zone.bounds.left) * scaleX,
              height: (zone.bounds.bottom - zone.bounds.top) * scaleY,
              backgroundColor: getZoneColor(zone.name),
              border: zone.name === currentZone ? '2px solid rgba(139, 92, 246, 0.8)' : '1px solid rgba(255,255,255,0.1)'
            }}
            title={zone.name}
          />
        ))}
        
        {/* Remote Players */}
        {Object.values(remotePlayers).map((player) => (
          <motion.div
            key={player.name}
            layout
            animate={{
              x: player.pos.x * scaleX - 6,
              y: player.pos.y * scaleY - 6
            }}
            className="absolute w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-lg z-10"
            title={player.name}
          >
            {player.isSpeaking && (
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="absolute inset-0 rounded-full bg-blue-400"
              />
            )}
          </motion.div>
        ))}
        
        {/* Local Player */}
        <motion.div
          layout
          animate={{
            x: localPos.x * scaleX - 8,
            y: localPos.y * scaleY - 8
          }}
          className="absolute w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-lg z-20"
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute inset-0 rounded-full bg-green-400 opacity-50"
          />
        </motion.div>
        
        {/* Current Zone Indicator */}
        <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded-lg border border-white/10">
          <span className="text-[9px] font-bold text-white/80 truncate max-w-[100px]">{currentZone}</span>
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 justify-center">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-[9px] text-white/50 font-medium">You</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-[9px] text-white/50 font-medium">Team</span>
        </div>
      </div>
    </div>
  );
};
