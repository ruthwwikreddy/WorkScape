import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, ArrowRight, User, LogOut, ChevronRight, Mic, Layout, Shield, Video, MessageSquare, Globe, Users, Clock, Sparkles, Rocket, Star, Award, TrendingUp } from 'lucide-react';
import { auth } from '../firebase';
import { Component as InfiniteGrid } from './ui/the-infinite-grid';

// Helper to detect touch devices
const isTouchDevice = () => {
  return (('ontouchstart' in window) ||
     (navigator.maxTouchPoints > 0));
};

const DeviceNotSupported = ({ onBack }: { onBack: () => void }) => (
  <div className="fixed inset-0 z-[5000] bg-gradient-to-br from-black via-gray-900 to-black flex flex-col items-center justify-center p-8 text-center">
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md"
    >
      <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-500/20">
        <svg className="w-12 h-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-4xl font-black text-white mb-4 tracking-tight">Device Not Supported</h2>
      <p className="text-gray-400 mb-8 leading-relaxed text-lg">
        WorkScape is optimized for desktop browsers with keyboard and mouse input. 
        Touch devices are not currently supported.
      </p>
      <button
        onClick={onBack}
        className="px-8 py-4 bg-white text-black rounded-2xl font-black hover:bg-gray-200 transition-all hover:scale-105 active:scale-95"
      >
        Go Back
      </button>
    </motion.div>
  </div>
);

const LandingPage = ({ onStart, user }: { onStart: () => void; user: any }) => {
  const [showUnsupported, setShowUnsupported] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const handleStart = () => {
    if (isTouchDevice()) {
      setShowUnsupported(true);
    } else {
      onStart();
    }
  };

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  if (showUnsupported) {
    return <DeviceNotSupported onBack={() => setShowUnsupported(false)} />;
  }

  const faqs = [
    {
      question: "What makes WorkScape different from other virtual offices?",
      answer: "WorkScape combines spatial audio with a beautiful 2D office environment. Unlike video calls that drain energy, our proximity voice creates natural, spontaneous conversations just like a real office. Walk over to talk, step away for privacy - it's that simple."
    },
    {
      question: "How does the proximity voice technology work?",
      answer: "Our advanced spatial audio system adjusts volume based on distance. As you walk closer to colleagues, their voice becomes clearer. Step away and it fades naturally. This creates organic conversations without the awkwardness of scheduled calls or constant interruptions."
    },
    {
      question: "Is my data and conversations secure?",
      answer: "Security is our top priority. All communications are end-to-end encrypted, and your workspace data is stored in secure Firebase servers with enterprise-grade protection. Private conversation bubbles ensure sensitive discussions stay completely isolated and secure."
    },
    {
      question: "Can I customize my avatar and workspace?",
      answer: "Absolutely! Choose from dozens of hairstyles, outfits, body types, and accessories. You can even use your Google profile photo as your avatar face. Create meeting rooms, focus zones, and collaborative spaces that match your team's workflow."
    },
    {
      question: "What's included in the free plan?",
      answer: "Our free tier includes unlimited use for teams up to 5 members, full access to all features including proximity voice, meeting rooms, private bubbles, team chat, and avatar customization. No credit card required, no hidden fees."
    },
    {
      question: "Do I need to download anything?",
      answer: "No downloads required! WorkScape runs entirely in your browser. Just sign in and start collaborating. Works on Chrome, Firefox, Safari, and Edge with no installation needed."
    }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "CEO, TechStart",
      text: "WorkScape transformed our remote culture completely. The spontaneous conversations and natural interactions made our distributed team feel closer than ever. We've seen a 40% increase in cross-team collaboration.",
      avatar: "SC"
    },
    {
      name: "Marcus Johnson",
      role: "Engineering Lead, CloudScale",
      text: "The proximity voice feature is absolutely incredible. No more scheduled calls for quick questions - just walk over and talk. It's exactly like being in a real office. Our standup meetings are now 2x faster.",
      avatar: "MJ"
    },
    {
      name: "Emily Rodriguez",
      role: "Product Manager, InnovateCo",
      text: "Our team collaboration improved dramatically after switching to WorkScape. The spatial layout and meeting rooms make it easy to organize work without feeling isolated. Best decision we made this year.",
      avatar: "ER"
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white font-sans relative">
      {/* Navigation */}
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-white to-gray-300 rounded-xl flex items-center justify-center shadow-lg shadow-white/20">
              <Zap className="w-5 h-5 text-black" />
            </div>
            <span className="text-xl font-black tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">WorkScape</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="font-bold text-sm text-gray-400 hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="font-bold text-sm text-gray-400 hover:text-white transition-colors">How It Works</a>
            <a href="#testimonials" className="font-bold text-sm text-gray-400 hover:text-white transition-colors">Testimonials</a>
            <a href="#faq" className="font-bold text-sm text-gray-400 hover:text-white transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <div className="relative group">
                <img 
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=random`} 
                  alt="profile" 
                  className="w-10 h-10 rounded-xl border-2 border-white/20 hover:border-white/60 transition-all cursor-pointer shadow-lg"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-full right-0 mt-2 opacity-0 group-hover:opacity-100 transition-all pointer-events-none group-hover:pointer-events-auto">
                  <div className="bg-gray-900 rounded-xl shadow-2xl border border-white/10 p-2 min-w-[160px]">
                    <button 
                      onClick={() => auth.signOut()}
                      className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors font-black text-xs uppercase tracking-widest"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <motion.button
                onClick={handleStart}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 bg-gradient-to-r from-white to-gray-200 text-black rounded-xl font-black text-sm hover:shadow-lg hover:shadow-white/20 transition-all"
              >
                Sign In
              </motion.button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Gradient Orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-[150px]" />
        
        <div className="absolute inset-0 opacity-10">
          <InfiniteGrid />
        </div>
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-white/10 to-white/5 px-4 py-2 rounded-full border border-white/10 mb-8 backdrop-blur-sm"
            >
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Zap className="w-4 h-4 text-yellow-400" />
              </motion.div>
              <span className="text-xs font-black uppercase tracking-widest bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Next-Gen Virtual Office</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-8xl font-black tracking-tighter mb-8 leading-[1.1]"
            >
              WORK TOGETHER,<br />
              <motion.span
                className="bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent"
                animate={{ backgroundPosition: ['0%', '100%', '0%'] }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                style={{ backgroundSize: '200% 100%' }}
              >
                ANYWHERE.
              </motion.span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-gray-300 max-w-2xl mx-auto mb-12 font-medium leading-relaxed"
            >
              A spatial virtual office with proximity voice, meeting rooms, and real-time collaboration. 
              Feel the presence of your team without the zoom fatigue.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <motion.button
                onClick={handleStart}
                whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(255,255,255,0.3)" }}
                whileTap={{ scale: 0.95 }}
                className="px-10 py-5 bg-gradient-to-r from-white to-gray-200 text-black rounded-2xl font-black text-xl shadow-2xl flex items-center justify-center gap-3 relative overflow-hidden group"
              >
                <span className="relative z-10">Get Started Free</span>
                <ArrowRight className="w-6 h-6 relative z-10 group-hover:translate-x-1 transition-transform" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              </motion.button>
              <motion.button 
                onClick={() => window.location.href = '?avatar=true'}
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.15)' }}
                whileTap={{ scale: 0.95 }}
                className="px-10 py-5 bg-white/5 border-2 border-white/20 rounded-2xl font-black text-xl transition-all flex items-center justify-center gap-3 backdrop-blur-sm"
              >
                Customize Avatar
                <User className="w-6 h-6" />
              </motion.button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-8 flex items-center justify-center gap-6"
            >
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-white/30" />
              <p className="text-sm text-gray-500 font-bold">No credit card required • Free forever for teams up to 5</p>
              <div className="h-px w-12 bg-gradient-to-l from-transparent to-white/30" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 px-6 relative bg-gradient-to-b from-black to-gray-900/50">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-500/5 via-transparent to-transparent" />
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-blue-500/5 via-transparent to-transparent" />
        
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10 mb-6"
            >
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-xs font-black uppercase tracking-widest text-gray-400">Powerful Features</span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-6xl font-black mb-6 tracking-tight"
            >
              Everything you need to
              <span className="block bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">collaborate seamlessly</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-xl text-gray-400 max-w-2xl mx-auto font-medium"
            >
              Built for modern remote teams who want to feel connected without the fatigue of constant video calls
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: <Mic className="w-9 h-9" />, title: "Proximity Voice", desc: "Walk closer to hear better, step away for privacy. Natural conversations without scheduling calls.", gradient: "from-purple-500/30 to-purple-500/5", highlight: "Spatial Audio" },
              { icon: <Layout className="w-9 h-9" />, title: "Spatial Office", desc: "Beautiful 2D office layout with meeting rooms, focus zones, and collaborative spaces.", gradient: "from-blue-500/30 to-blue-500/5", highlight: "2D Environment" },
              { icon: <Shield className="w-9 h-9" />, title: "Private Bubbles", desc: "Step into isolated conversation bubbles for secure 1-on-1 discussions with end-to-end encryption.", gradient: "from-green-500/30 to-green-500/5", highlight: "Secure" },
              { icon: <Video className="w-9 h-9" />, title: "Video Meetings", desc: "Seamless video integration for screen sharing and face-to-face collaboration when you need it.", gradient: "from-red-500/30 to-red-500/5", highlight: "HD Video" },
              { icon: <MessageSquare className="w-9 h-9" />, title: "Team Chat", desc: "Persistent chat channels for async communication, quick updates, and team announcements.", gradient: "from-yellow-500/30 to-yellow-500/5", highlight: "Real-time" },
              { icon: <Globe className="w-9 h-9" />, title: "Global Performance", desc: "Low-latency servers worldwide ensure smooth performance for distributed teams across time zones.", gradient: "from-cyan-500/30 to-cyan-500/5", highlight: "Worldwide" }
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="relative group"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${f.gradient} rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-8 rounded-3xl hover:border-white/30 transition-all backdrop-blur-sm h-full">
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                      {f.icon}
                    </div>
                    <span className="text-xs font-black uppercase tracking-wider text-gray-500 bg-white/5 px-3 py-1 rounded-full">{f.highlight}</span>
                  </div>
                  <h3 className="text-2xl font-black mb-4 text-white">{f.title}</h3>
                  <p className="text-gray-400 font-medium leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-32 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/50 to-black" />
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10 mb-6"
            >
              <Rocket className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-black uppercase tracking-widest text-gray-400">Quick Start</span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-6xl font-black mb-6 tracking-tight"
            >
              Get started in
              <span className="block bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">under 2 minutes</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-xl text-gray-400 max-w-2xl mx-auto font-medium"
            >
              Three simple steps to transform your team's collaboration forever
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Sign Up", desc: "Create your account with Google or email. Takes less than 30 seconds. No credit card required.", icon: <User className="w-6 h-6" /> },
              { step: "02", title: "Customize", desc: "Design your avatar with dozens of options. Join your team's workspace or create a new one.", icon: <Sparkles className="w-6 h-6" /> },
              { step: "03", title: "Collaborate", desc: "Walk around, talk naturally with proximity voice, and work together in real-time.", icon: <Users className="w-6 h-6" /> }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -8 }}
                className="relative group"
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-8 rounded-3xl hover:border-white/30 transition-all h-full">
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center text-white">
                      {item.icon}
                    </div>
                    <span className="text-5xl font-black text-white/10">{item.step}</span>
                  </div>
                  <h3 className="text-2xl font-black mb-4 text-white">{item.title}</h3>
                  <p className="text-gray-400 font-medium leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-32 px-6 relative bg-gradient-to-b from-black to-gray-900/50">
        <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[150px] -translate-y-1/2" />
        <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[150px] -translate-y-1/2" />
        
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10 mb-6"
            >
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-xs font-black uppercase tracking-widest text-gray-400">Customer Success</span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-6xl font-black mb-6 tracking-tight"
            >
              Loved by teams
              <span className="block bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">everywhere</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-xl text-gray-400 max-w-2xl mx-auto font-medium"
            >
              See what industry leaders say about transforming their remote work
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="relative group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-8 rounded-3xl hover:border-white/30 transition-all backdrop-blur-sm h-full">
                  <div className="flex items-center gap-1 mb-6">
                    {[...Array(5)].map((_, j) => (
                      <motion.div
                        key={j}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: i * 0.1 + j * 0.05 }}
                        className="w-5 h-5 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full"
                      />
                    ))}
                  </div>
                  <p className="text-gray-300 font-medium mb-8 leading-relaxed text-lg">"{t.text}"</p>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-white to-gray-200 rounded-full flex items-center justify-center text-black font-black shadow-lg">
                      {t.avatar}
                    </div>
                    <div>
                      <p className="font-black text-lg">{t.name}</p>
                      <p className="text-sm text-gray-500 font-bold">{t.role}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-32 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/50 to-black" />
        <div className="absolute top-1/4 left-0 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[150px]" />
        
        <div className="max-w-4xl mx-auto relative">
          <div className="text-center mb-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10 mb-6"
            >
              <MessageSquare className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-black uppercase tracking-widest text-gray-400">FAQ</span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-6xl font-black mb-6 tracking-tight"
            >
              Frequently asked
              <span className="block bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">questions</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-xl text-gray-400 font-medium"
            >
              Everything you need to know about WorkScape
            </motion.p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-2xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl overflow-hidden hover:border-white/30 transition-all backdrop-blur-sm">
                  <button
                    onClick={() => toggleFaq(i)}
                    className="w-full px-8 py-6 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                  >
                    <span className="font-black text-lg md:text-xl">{faq.question}</span>
                    <motion.div
                      animate={{ rotate: activeFaq === i ? 90 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ChevronRight className="w-6 h-6" />
                    </motion.div>
                  </button>
                  <AnimatePresence>
                    {activeFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <p className="px-8 pb-6 text-gray-400 font-medium leading-relaxed text-lg">{faq.answer}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-cyan-500/10" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-white/5 rounded-full blur-[250px]" />
        
        <div className="max-w-5xl mx-auto text-center relative">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-5xl md:text-7xl lg:text-8xl font-black mb-8 tracking-tight"
          >
            Ready to transform
            <span className="block bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">your team's collaboration?</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto font-medium"
          >
            Join thousands of teams already using WorkScape to work together, anywhere. Start free, no credit card required.
          </motion.p>
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            onClick={handleStart}
            whileHover={{ scale: 1.05, boxShadow: "0 30px 60px rgba(255,255,255,0.3)" }}
            whileTap={{ scale: 0.95 }}
            className="px-16 py-8 bg-gradient-to-r from-white to-gray-200 text-black rounded-3xl font-black text-2xl shadow-2xl flex items-center justify-center gap-4 mx-auto relative overflow-hidden group"
          >
            <span className="relative z-10">Get Started Now</span>
            <Rocket className="w-8 h-8 relative z-10 group-hover:translate-x-2 transition-transform" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          </motion.button>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-8 flex items-center justify-center gap-8 text-gray-500"
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span className="text-sm font-bold">Secure</span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-bold">Fast Setup</span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4" />
              <span className="text-sm font-bold">Free Tier</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 border-t border-white/10 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-white to-gray-300 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-black" />
              </div>
              <span className="text-xl font-black tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">WorkScape</span>
            </div>
            <div className="flex items-center gap-8 text-sm text-gray-500 font-bold">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
              <a href="#testimonials" className="hover:text-white transition-colors">Testimonials</a>
              <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            </div>
            <p className="text-gray-500 font-bold text-sm">© 2024 WorkScape. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
