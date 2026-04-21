import { Link } from 'react-router-dom';
import { 
  Bot, Activity, LayoutDashboard, MessageSquare, 
  FileText, ShieldCheck, ArrowRight, Sparkles, Zap, ChevronRight 
} from 'lucide-react';

const Landing = () => {
  
  // Smooth scroll feature ke liye function
  const scrollToFeatures = (e) => {
    e.preventDefault();
    const featuresSection = document.getElementById('features');
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] font-sans text-white overflow-x-hidden selection:bg-blue-500/30 selection:text-blue-200">
      
      {/* 🌌 Ambient Background Glows */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[150px] rounded-full pointer-events-none"></div>

      {/* 🧭 NAVBAR */}
      <nav className="fixed top-0 w-full z-50 bg-[#0A0A0B]/80 backdrop-blur-xl border-b border-white/5 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.2)]">
              <span className="text-black font-black text-xl italic">T</span>
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white">Tasklyfe<span className="text-blue-500">.</span></span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" onClick={scrollToFeatures} className="text-sm font-bold text-gray-400 hover:text-white transition-colors uppercase tracking-widest">
              Features
            </a>
            <Link to="/login" className="text-sm font-bold text-gray-400 hover:text-white transition-colors uppercase tracking-widest">
              Sign In
            </Link>
            <Link to="/register" className="bg-white text-black px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center gap-2">
              Get Started <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      {/* 🚀 HERO SECTION */}
      <section className="relative pt-40 pb-20 px-6 z-10 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Sparkles size={12} /> Meet The Future of Work
        </div>
        
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter max-w-4xl leading-[1.1] animate-in fade-in slide-in-from-bottom-6 duration-1000">
          AI-Powered Productivity <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            For Modern Teams.
          </span>
        </h1>
        
        <p className="mt-6 text-lg text-gray-400 max-w-2xl font-medium animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150">
          Manage tasks, collaborate in real-time, write docs, and let our AI generate your workflow. Everything your team needs, in one unified premium workspace.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">
          <Link to="/register" className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest flex items-center gap-2 transition-all hover:shadow-[0_0_30px_rgba(37,99,235,0.4)] active:scale-95">
            Start For Free <Zap size={16} />
          </Link>
          <a href="#features" onClick={scrollToFeatures} className="px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest flex items-center gap-2 text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all active:scale-95">
            Explore Features
          </a>
        </div>

        {/* Fake App Mockup Preview */}
        <div className="mt-20 w-full max-w-5xl rounded-[2rem] border border-white/10 bg-[#121214] shadow-2xl overflow-hidden relative animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0B] via-transparent to-transparent z-10 pointer-events-none"></div>
          <div className="h-12 border-b border-white/5 flex items-center px-6 gap-2 bg-white/[0.02]">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
          </div>
          <div className="p-8 grid grid-cols-3 gap-6 opacity-80">
            <div className="col-span-1 space-y-4">
              <div className="h-24 bg-white/5 rounded-2xl border border-white/5"></div>
              <div className="h-40 bg-white/5 rounded-2xl border border-white/5"></div>
            </div>
            <div className="col-span-2 space-y-4">
              <div className="h-12 bg-white/5 rounded-2xl border border-white/5 w-3/4"></div>
              <div className="h-64 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl border border-blue-500/20"></div>
            </div>
          </div>
        </div>
      </section>

      {/* 🌟 FEATURES SECTION */}
      <section id="features" className="py-32 px-6 relative z-10 bg-[#0A0A0B]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">Everything You Need <br/><span className="text-gray-500">And More.</span></h2>
            <p className="text-gray-400 font-medium">Built for students, developers, and professional teams.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Feature 1 */}
            <div className="bg-white/5 border border-white/5 hover:border-blue-500/30 p-8 rounded-[2rem] transition-all group hover:-translate-y-2">
              <div className="h-14 w-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform group-hover:bg-blue-500 group-hover:text-white">
                <Bot size={28} />
              </div>
              <h3 className="text-xl font-extrabold mb-3">AI Task Generation</h3>
              <p className="text-gray-400 text-sm leading-relaxed font-medium">
                Describe your project in plain English, and let our integrated AI generate a complete workflow with smart priorities and deadlines.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white/5 border border-white/5 hover:border-emerald-500/30 p-8 rounded-[2rem] transition-all group hover:-translate-y-2">
              <div className="h-14 w-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform group-hover:bg-emerald-500 group-hover:text-white">
                <Activity size={28} />
              </div>
              <h3 className="text-xl font-extrabold mb-3">Live Team Radar</h3>
              <p className="text-gray-400 text-sm leading-relaxed font-medium">
                Never miss an update. Watch your team's activities in real-time. See who created a task, uploaded a file, or posted a notice instantly.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white/5 border border-white/5 hover:border-purple-500/30 p-8 rounded-[2rem] transition-all group hover:-translate-y-2">
              <div className="h-14 w-14 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform group-hover:bg-purple-500 group-hover:text-white">
                <LayoutDashboard size={28} />
              </div>
              <h3 className="text-xl font-extrabold mb-3">Interactive Kanban</h3>
              <p className="text-gray-400 text-sm leading-relaxed font-medium">
                Drag and drop tasks across customizable boards. Track status from "To Do" to "Done" with visual priority and due-date badges.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white/5 border border-white/5 hover:border-pink-500/30 p-8 rounded-[2rem] transition-all group hover:-translate-y-2">
              <div className="h-14 w-14 bg-pink-500/10 rounded-2xl flex items-center justify-center text-pink-400 mb-6 group-hover:scale-110 transition-transform group-hover:bg-pink-500 group-hover:text-white">
                <MessageSquare size={28} />
              </div>
              <h3 className="text-xl font-extrabold mb-3">Seamless Team Chat</h3>
              <p className="text-gray-400 text-sm leading-relaxed font-medium">
                Communicate without leaving the app. Share files, links, and chat in real-time. Includes advanced "Delete for Me/Everyone" controls.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white/5 border border-white/5 hover:border-orange-500/30 p-8 rounded-[2rem] transition-all group hover:-translate-y-2">
              <div className="h-14 w-14 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-400 mb-6 group-hover:scale-110 transition-transform group-hover:bg-orange-500 group-hover:text-white">
                <FileText size={28} />
              </div>
              <h3 className="text-xl font-extrabold mb-3">Live Documentation</h3>
              <p className="text-gray-400 text-sm leading-relaxed font-medium">
                Build a team knowledge base with our rich-text Docs editor. Automatically saves and syncs across all team members instantly.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white/5 border border-white/5 hover:border-yellow-500/30 p-8 rounded-[2rem] transition-all group hover:-translate-y-2">
              <div className="h-14 w-14 bg-yellow-500/10 rounded-2xl flex items-center justify-center text-yellow-400 mb-6 group-hover:scale-110 transition-transform group-hover:bg-yellow-500 group-hover:text-white">
                <ShieldCheck size={28} />
              </div>
              <h3 className="text-xl font-extrabold mb-3">Secure Workspaces</h3>
              <p className="text-gray-400 text-sm leading-relaxed font-medium">
                Complete admin control. Invite members via email, assign specific roles, and manage permissions securely with encrypted authentication.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 🚀 BOTTOM CTA SECTION */}
      <section className="py-24 px-6 relative z-10">
        <div className="max-w-5xl mx-auto bg-gradient-to-br from-blue-900/40 to-purple-900/40 border border-white/10 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <h2 className="text-4xl md:text-5xl font-black mb-6 relative z-10">Ready to elevate your workflow?</h2>
          <p className="text-gray-300 mb-10 max-w-2xl mx-auto text-lg relative z-10">Join thousands of teams who are already building the future with our AI-powered platform.</p>
          <Link to="/register" className="inline-flex bg-white text-black px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest items-center gap-2 hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.2)] relative z-10">
            Create Your Account <ChevronRight size={16} />
          </Link>
        </div>
      </section>

      {/* 👣 FOOTER */}
      <footer className="w-full py-8 border-t border-white/5 flex items-center justify-center shrink-0 z-30 bg-[#0A0A0B]">
        <p className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] hover:text-white transition-colors cursor-default">
          @Team CSK
        </p>
      </footer>

    </div>
  );
};

export default Landing;