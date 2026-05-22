import React from 'react';
import { motion } from 'motion/react';
import { Github, ExternalLink, Info } from 'lucide-react';

const DemoNotice = () => {
  const isDemo = import.meta.env.VITE_APP_MODE === 'demo';

  if (!isDemo) return null;

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-[10000] bg-white text-black py-3 px-4 shadow-2xl border-b border-gray-200"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <Info className="w-4 h-4 text-white" />
          </div>
          <p className="text-sm font-bold leading-tight">
            <span className="uppercase tracking-widest text-[10px] block opacity-50">Demo Mode</span>
            Full functionality (WebRTC, Persistence) is best experienced via <span className="underline decoration-2 underline-offset-2">Local Setup</span>.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <a 
            href="https://github.com/ruthwikreddy/WorkScape" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg hover:shadow-black/20 group"
          >
            <Github className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            View on GitHub
            <ExternalLink className="w-3 h-3 opacity-50" />
          </a>
          <button 
            onClick={() => window.scrollTo({ top: document.getElementById('local-setup')?.offsetTop || 0, behavior: 'smooth' })}
            className="hidden md:flex items-center gap-2 bg-gray-100 text-black px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
          >
            Setup Guide
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default DemoNotice;
