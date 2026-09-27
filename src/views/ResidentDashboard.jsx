import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ReportForm from '../components/ReportForm';
import ReportHistory from '../components/ReportHistory';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

/**
 * Primary view for residents.
 * Props:
 *   user    — Supabase auth user object
 *   profile — row from the profiles table ({ id, full_name, role, ... })
 */
export default function ResidentDashboard({ user, profile }) {
  const navigate = useNavigate();
  const containerRef = useRef(null);

  // ── Triggers ReportHistory to re-fetch after a successful submission ──────
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  // ── Cursor Tracking (Framer Motion) ───────────────────────────────────────
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Configure smooth springs
  const springConfig = { damping: 45, stiffness: 200, mass: 0.6 };
  const glowX = useSpring(mouseX, springConfig);
  const glowY = useSpring(mouseY, springConfig);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    // Offset by half of orb width (250px) to center it under cursor
    mouseX.set(e.clientX - rect.left - 250);
    mouseY.set(e.clientY - rect.top - 250);
  };

  // ── GSAP mount animations sequence ────────────────────────────────────────
  useGSAP(() => {
    const tl = gsap.timeline();
    // Smoothly slide dashboard container up
    tl.fromTo('.resident-content',
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }
    );
  }, { scope: containerRef });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="min-h-screen relative overflow-hidden bg-[#f2f6f3] px-4 py-8 sm:px-6 lg:px-8"
    >
      {/* Interactive Glowing Orb */}
      <motion.div
        style={{
          left: glowX,
          top: glowY,
        }}
        className="w-[500px] h-[500px] bg-emerald-500/15 rounded-full blur-[120px] pointer-events-none absolute"
      />

      <div className="resident-content relative z-10 mx-auto max-w-2xl space-y-6">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <header className="bg-white/85 backdrop-blur-xl border border-emerald-900/10 shadow-[0_4px_20px_rgba(0,0,0,0.04)] rounded-2xl p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/25">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none m-0">SmartWaste</h1>
              <span className="text-xs text-emerald-600 font-semibold tracking-wide uppercase">Resident Portal</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Resident
            </span>
            <button
              id="sign-out-btn"
              onClick={handleSignOut}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 hover:text-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-xs transition cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
              Sign Out
            </button>
          </div>
        </header>

        {/* ── Welcome banner ────────────────────────────────────────────── */}
        <section className="bg-white/85 backdrop-blur-xl border border-emerald-900/10 shadow-[0_4px_20px_rgba(0,0,0,0.04)] rounded-2xl px-6 py-5">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-1">Welcome back</p>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {profile?.full_name || 'Resident'} 👋
          </h2>
          <p className="text-slate-600 text-sm mt-1">
            Help keep your community clean. Report a waste issue or track past submissions below.
          </p>
        </section>

        {/* ── Report Form ───────────────────────────────────────────────── */}
        <ReportForm user={user} onSuccess={() => setRefreshTrigger((n) => n + 1)} />

        {/* ── Report History ────────────────────────────────────────────── */}
        <ReportHistory userId={user.id} refreshTrigger={refreshTrigger} />

      </div>
    </div>
  );
}

