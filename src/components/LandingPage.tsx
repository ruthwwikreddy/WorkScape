import React from 'react';
import { motion } from 'motion/react';
import { 
  Terminal, 
  Database, 
  Mic, 
  Settings, 
  Server, 
  Github, 
  ArrowRight, 
  Shield, 
  Zap, 
  Monitor, 
  Globe, 
  Lock 
} from 'lucide-react';

const LandingPage = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', damping: 25, stiffness: 100 }
    }
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter">WorkScape</span>
          </div>
          <a 
            href="https://github.com/ruthwikreddy/WorkScape"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-bold hover:opacity-70 transition-opacity"
          >
            <Github className="w-5 h-5" />
            <span>GitHub</span>
          </a>
        </div>
      </nav>

      <main className="pt-32 pb-24">
        {/* Hero Section */}
        <section className="px-6 mb-32">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={containerVariants}
              className="max-w-3xl"
            >
              <motion.div variants={itemVariants} className="inline-flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full mb-8">
                <Terminal className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Local-First Experience</span>
              </motion.div>
              
              <motion.h1 variants={itemVariants} className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-8">
                Full Power,<br />On Your Machine.
              </motion.h1>
              
              <motion.p variants={itemVariants} className="text-xl md:text-2xl text-gray-600 font-medium leading-relaxed mb-12">
                While this demo showcases the visuals, the real magic—proximity voice, persistent storage, and zero-latency signaling—is designed to run locally. Deploy your own instance in minutes.
              </motion.p>

              <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
                <a 
                  href="#setup"
                  className="px-8 py-4 bg-black text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:scale-[1.02] transition-all shadow-xl shadow-black/10"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5" />
                </a>
                <a 
                  href="https://github.com/ruthwikreddy/WorkScape"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-8 py-4 bg-white text-black border-2 border-black rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-gray-50 transition-all"
                >
                  <Github className="w-5 h-5" />
                  View Source
                </a>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="px-6 mb-32">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { 
                  icon: <Database className="w-6 h-6" />, 
                  title: "Full Persistence", 
                  desc: "Real-time Firestore & RTDB sync for all team data.",
                  color: "bg-blue-50 text-blue-600"
                },
                { 
                  icon: <Mic className="w-6 h-6" />, 
                  title: "WebRTC Audio", 
                  desc: "Direct P2P spatial voice without server overhead.",
                  color: "bg-emerald-50 text-emerald-600"
                },
                { 
                  icon: <Settings className="w-6 h-6" />, 
                  title: "Total Control", 
                  desc: "Configure your own rooms, walls, and themes.",
                  color: "bg-amber-50 text-amber-600"
                },
                { 
                  icon: <Server className="w-6 h-6" />, 
                  title: "Privacy First", 
                  desc: "Your data stays in your Firebase project.",
                  color: "bg-purple-50 text-purple-600"
                }
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="p-8 rounded-[32px] bg-gray-50 border border-gray-100 hover:border-black/10 transition-colors group"
                >
                  <div className={`w-12 h-12 ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-black mb-2">{feature.title}</h3>
                  <p className="text-gray-500 font-medium leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Setup Section */}
        <section id="setup" className="px-6 py-24 bg-black text-white rounded-[60px] mx-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-16 items-center">
              <div className="flex-1">
                <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight">
                  Setup in<br />60 Seconds.
                </h2>
                <div className="space-y-4">
                  {[
                    { icon: <Shield className="w-5 h-5 text-emerald-400" />, text: "No central server required" },
                    { icon: <Globe className="w-5 h-5 text-blue-400" />, text: "Runs on standard web ports" },
                    { icon: <Lock className="w-5 h-5 text-amber-400" />, text: "Fully self-hostable architecture" }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      {item.icon}
                      <span className="font-bold text-gray-400">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex-1 w-full">
                <div className="bg-gray-900 rounded-[40px] p-8 md:p-12 border border-white/10">
                  <div className="space-y-8">
                    {[
                      { step: "1", title: "Clone", cmd: "git clone https://github.com/ruthwikreddy/WorkScape" },
                      { step: "2", title: "Install", cmd: "npm install" },
                      { step: "3", title: "Config", cmd: "cp .env.example .env" },
                      { step: "4", title: "Run", cmd: "npm run dev" }
                    ].map((s, i) => (
                      <div key={i} className="flex items-start gap-6">
                        <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center font-black shrink-0">
                          {s.step}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">{s.title}</p>
                          <div className="relative group">
                            <code className="block bg-black border border-white/10 px-4 py-3 rounded-xl text-sm font-mono font-bold text-emerald-400 overflow-x-auto whitespace-nowrap scrollbar-hide">
                              {s.cmd}
                            </code>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <a 
                    href="https://github.com/ruthwikreddy/WorkScape"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-12 w-full py-6 bg-white text-black rounded-2xl font-black text-xl flex items-center justify-center gap-3 hover:bg-gray-100 transition-all shadow-2xl shadow-white/10"
                  >
                    <Github className="w-6 h-6" />
                    Get Full Version
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Vision Section */}
        <section className="px-6 py-32">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-black mb-8">The future of remote work is distributed, not centralized.</h2>
            <p className="text-xl text-gray-600 font-medium leading-relaxed mb-12">
              WorkScape is more than just a virtual office. It's a commitment to digital sovereignty. By running your own instance, you own your data, your connections, and your culture.
            </p>
            <div className="flex items-center justify-center gap-12">
              <div className="text-center">
                <p className="text-3xl font-black mb-1">0ms</p>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Signaling Latency</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-black mb-1">100%</p>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Data Ownership</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-black mb-1">∞ Free</p>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Scale Potential</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 px-6 border-t border-gray-100">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="font-black tracking-tighter">WorkScape</span>
          </div>
          <p className="text-sm font-bold text-gray-400">© 2024 Built for the distributed web.</p>
          <div className="flex items-center gap-6 text-sm font-bold">
            <a href="https://github.com/ruthwikreddy/WorkScape" className="hover:text-gray-500 transition-colors">GitHub</a>
            <a href="#" className="hover:text-gray-500 transition-colors">Twitter</a>
            <a href="#" className="hover:text-gray-500 transition-colors">LinkedIn</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
