import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Eye, EyeOff } from 'lucide-react';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('resident');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
        },
      });

      if (signupError) {
        setError(signupError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
      
      // Auto redirect to login after a short delay
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#05150c] relative overflow-hidden">
      {/* Subtle ambient background glow */}
      <div className="absolute w-[600px] h-[600px] bg-green-600/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md bg-[#0a2716]/70 backdrop-blur-xl border border-green-800/40 shadow-2xl rounded-3xl p-8 relative z-10"
      >
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-600 text-white shadow-lg shadow-green-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-white tracking-tight">Create Account</h2>
          <p className="mt-2 text-sm text-green-300/80 font-medium">
            Join the Smart Waste Management community
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleRegister}>
          {error && (
            <div className="rounded-xl bg-rose-950/40 p-4 text-sm text-rose-400 border border-rose-800/60 flex items-start gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 flex-shrink-0 mt-0.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="rounded-xl bg-green-950/40 p-4 text-sm text-green-400 border border-green-800/60 flex items-start gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 flex-shrink-0 mt-0.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Registration successful! Redirecting to login in 3 seconds... Please verify your email if confirmation is enabled.</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-green-100 font-medium tracking-wide">
                Full Name
              </Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="NovaTech Solutions"
                className="bg-[#05150c]/60 border-green-900/50 text-white text-[16px] h-12 focus-visible:ring-green-500 focus-visible:border-green-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-green-100 font-medium tracking-wide">
                Email Address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="bg-[#05150c]/60 border-green-900/50 text-white text-[16px] h-12 focus-visible:ring-green-500 focus-visible:border-green-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-green-100 font-medium tracking-wide">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-[#05150c]/60 border-green-900/50 text-white text-[16px] h-12 pr-10 focus-visible:ring-green-500 focus-visible:border-green-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400 hover:text-green-300 transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="text-green-100 font-medium tracking-wide">
                I am registering as a
              </Label>
              <select
                id="role"
                name="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="flex w-full rounded-xl border border-green-900/50 bg-[#05150c]/60 px-4 py-3 text-white text-[16px] h-12 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="resident" className="bg-[#0a2716] text-white">Resident / Reporter</option>
                <option value="collector" className="bg-[#0a2716] text-white">Waste Collector / Driver</option>
                <option value="admin" className="bg-[#0a2716] text-white">System Administrator</option>
              </select>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg shadow-[0_0_20px_rgba(22,163,74,0.3)] transition-all duration-300 flex items-center justify-center disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Registering account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-green-300/60 font-medium">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-green-400 hover:text-green-300">
              Sign In here
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
