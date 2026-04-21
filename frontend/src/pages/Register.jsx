import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../api/axios';
import toast, { Toaster } from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react'; // ✅ NAYA: Icons import kiye

const Register = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // ✅ NAYA: Password toggle state
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const tid = toast.loading("Creating Account...");
    try {
      await API.post('/auth/register', formData);
      toast.success("Registration Successful! Please login.", { id: tid });
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration Failed", { id: tid });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // ✅ 1. min-h-screen aur flex-col add kiya taaki footer hamesha bottom pe rahe
    <div className="min-h-screen bg-[#0A0A0B] flex flex-col items-center relative overflow-hidden font-sans">
      <Toaster />
      
      {/* 🌌 Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      {/* Main Content Area */}
      <div className="flex-1 w-full flex flex-col justify-center items-center p-6 relative z-10">
        <div className="w-full max-w-md">
          {/* Logo Section */}
          <div className="flex flex-col items-center mb-10">
            <h1 className="text-white text-3xl font-black tracking-tighter uppercase">Join <span className="text-blue-500 text-4xl">.</span> Tasklyfe</h1>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-2">Start collaborating with AI power</p>
          </div>

          {/* Registration Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[2.5rem] shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                <input 
                  required 
                  type="text" 
                  placeholder="Shubham Kumar" 
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:bg-white/10 focus:border-blue-500/50 transition-all text-white font-medium"
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Work Email</label>
                <input 
                  required 
                  type="email" 
                  placeholder="name@company.com" 
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:bg-white/10 focus:border-blue-500/50 transition-all text-white font-medium"
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Password</label>
                {/* ✅ NAYA: Password field with toggle button */}
                <div className="relative">
                  <input 
                    required 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Min. 8 characters" 
                    className="w-full bg-white/5 border border-white/10 p-4 pr-12 rounded-2xl outline-none focus:bg-white/10 focus:border-blue-500/50 transition-all text-white font-medium"
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button 
                disabled={isSubmitting}
                type="submit" 
                className="w-full bg-white text-black p-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-gray-200 transition-all active:scale-[0.98] mt-4"
              >
                {isSubmitting ? 'Processing...' : 'Create Account'}
              </button>
            </form>

            <div className="mt-8 pt-8 border-t border-white/5 text-center">
              <p className="text-gray-400 text-sm font-medium">
                Already using Tasklyfe? {' '}
                <Link to="/login" className="text-white font-black hover:text-blue-400 transition-colors uppercase text-xs ml-1">Sign In</Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ 2. Premium Slim Footer Add Kiya */}
      <footer className="w-full h-10 border-t border-white/5 flex items-center justify-center shrink-0 z-30 bg-black/20 backdrop-blur-sm mt-auto relative">
        <p className="text-[11px] font-black text-gray-500 uppercase tracking-[0.2em]">
          @Team CSK
        </p>
      </footer>
    </div>
  );
};

export default Register;