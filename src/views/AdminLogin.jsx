import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Eye, EyeOff, ShieldAlert, Lock, ArrowLeft } from 'lucide-react';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: authData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) {
        setError(loginError.message);
        setLoading(false);
        return;
      }

      const user = authData?.user;
      if (!user) {
        setError('Authentication failed. Please verify your credentials.');
        setLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError || profileData?.role !== 'admin') {
        await supabase.auth.signOut();
        setError('Access Denied: This portal is restricted to authorized System Administrators.');
        setLoading(false);
        return;
      }

      navigate('/', { replace: true });
    } catch (err) {
      console.error('Admin login error:', err);
      setError('An unexpected error occurred during administrative authentication.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#f4f5f7] relative overflow-hidden">
      {/* Subtle ambient light glows */}
      <div className="absolute w-[600px] h-[600px] bg-rose-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-[0_12px_40px_rgba(0,0,0,0.06)] rounded-3xl p-8 relative z-10"
      >
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-600 to-amber-600 text-white shadow-xl shadow-rose-600/25 border border-rose-500/20">
            <ShieldAlert className="w-7 h-7 text-white" />
          </div>
          <div className="mt-5 flex items-center gap-2 px-3 py-1 bg-rose-50 border border-rose-200 rounded-full">
            <span className="h-2 w-2 rounded-full bg-rose-600 animate-ping" />
            <span className="text-xs font-mono uppercase tracking-widest text-rose-700 font-bold">
              Restricted Operations
            </span>
          </div>
          <h2 className="mt-3 text-2xl font-extrabold text-slate-900 tracking-tight">Admin Command Portal</h2>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Authorized personnel only. Access attempts are monitored.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleAdminLogin}>
          {error && (
            <div className="rounded-xl bg-rose-50 p-4 text-xs font-medium text-rose-700 border border-rose-200 flex items-start gap-3 shadow-xs">
              <Lock className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email" className="text-slate-700 text-xs font-bold uppercase tracking-wider">
                Administrator Email
              </Label>
              <Input
                id="admin-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@smartwaste.gov"
                className="bg-slate-50/80 border-slate-300 text-slate-900 text-[15px] h-12 focus-visible:ring-rose-500 focus-visible:border-rose-500 font-mono placeholder:text-slate-400 focus:bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-password" className="text-slate-700 text-xs font-bold uppercase tracking-wider">
                Security Password
              </Label>
              <div className="relative">
                <Input
                  id="admin-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="bg-slate-50/80 border-slate-300 text-slate-900 text-[15px] h-12 pr-10 focus-visible:ring-rose-500 focus-visible:border-rose-500 font-mono placeholder:text-slate-400 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold tracking-wide rounded-xl shadow-md shadow-slate-900/20 transition-all duration-300 flex items-center justify-center disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Verifying Clearance...
                </span>
              ) : (
                'Authenticate as Administrator'
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-4 border-t border-slate-200 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Resident Portal
          </Link>
        </div>
      </motion.div>
    </div>
  );
}