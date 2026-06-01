import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

// ── JobCard Component ────────────────────────────────────────────────────────
function JobCard({ report, onResolve }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleResolve = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      await onResolve(report.id);
    } catch (err) {
      setError(err.message || 'Failed to resolve. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${report.latitude},${report.longitude}`;
  const date = new Date(report.created_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="bg-[#0a2716]/80 backdrop-blur-md border border-green-800/50 shadow-[0_0_20px_rgba(16,185,129,0.2)] border-green-500/50 rounded-2xl overflow-hidden mb-5 transition-shadow hover:shadow-md text-slate-100">
      {/* ── Image Header ─────────────────────────────────────────────────── */}
      {report.image_url ? (
        <div className="relative h-40 bg-slate-100">
          <img
            src={report.image_url}
            alt="Waste to collect"
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
        </div>
      ) : (
        <div className="h-28 bg-[#0a2716]/40 backdrop-blur-md flex flex-col items-center justify-center text-green-700/60 border-b border-green-850">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mb-1 opacity-50">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
          <span className="text-xs font-medium">No Image Provided</span>
        </div>
      )}

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="p-4 space-y-4">
        {/* Badges & Date */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <span className="inline-flex items-center rounded-lg bg-blue-950/40 text-blue-400 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide border border-blue-900/60">
              {report.category || 'Standard'}
            </span>
            <span className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide border ${
              report.urgency_level?.toLowerCase() === 'high' 
                ? 'bg-rose-950/40 text-rose-400 border-rose-900/60' 
                : 'bg-amber-950/40 text-amber-400 border-amber-900/60'
            }`}>
              {report.urgency_level || 'Normal'}
            </span>
          </div>
          <span className="text-xs text-slate-400 font-medium">{date}</span>
        </div>

        {/* Description */}
        <div>
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Details</h3>
          <p className="text-sm text-slate-200 leading-relaxed font-medium">
            {report.description || <span className="italic text-slate-500">No description provided.</span>}
          </p>
        </div>

        {/* Coords */}
        <div>
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Coordinates</h3>
          <p className="text-xs text-slate-400 font-mono bg-slate-950/50 px-2 py-1 rounded inline-block border border-green-900/20">
            {Number(report.latitude).toFixed(6)}, {Number(report.longitude).toFixed(6)}
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="p-3 text-xs text-rose-400 bg-rose-950/40 border border-rose-800/60 rounded-lg">
            {error}
          </div>
        )}

        {/* ── Actions Row ────────────────────────────────────────────────── */}
        <div className="pt-2 border-t border-green-900/20 flex flex-col sm:flex-row gap-3">
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-950/40 hover:bg-green-900/30 border border-green-800/40 px-4 py-3.5 text-sm font-semibold text-green-400 transition focus:outline-none focus:ring-2 focus:ring-green-500 active:bg-green-900/50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
            </svg>
            Get Directions
          </a>
          
          <button
            onClick={handleResolve}
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-600 hover:bg-green-500 px-4 py-3.5 text-sm font-semibold text-white shadow-md shadow-green-900/20 transition focus:outline-none focus:ring-2 focus:ring-green-500 active:bg-green-700 border border-green-400/30"
          >
            {isSubmitting ? (
              <>
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Resolving...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Mark as Resolved
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── CollectorDashboard Component ──────────────────────────────────────────────
export default function CollectorDashboard({ user, profile }) {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Data Fetching ────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchAssignedReports() {
      const { data, error } = await supabase
        .from('waste_reports')
        .select('*')
        .eq('status', 'assigned')
        .order('created_at', { ascending: true }); // Oldest first for routing priority

      if (error) {
        console.error('Collector fetch error:', error);
        setError(error.message);
      } else {
        setReports(data || []);
      }
      setLoading(false);
    }
    
    fetchAssignedReports();
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleResolveReport = async (reportId) => {
    const { error } = await supabase
      .from('waste_reports')
      .update({ 
        status: 'resolved', 
        resolved_at: new Date().toISOString() 
      })
      .eq('id', reportId);

    if (error) throw error;

    // Optimistic UI update: remove the resolved card
    setReports(prev => prev.filter(r => r.id !== reportId));
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#05150c]">
      
      {/* ── Fixed Header ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#0a2716]/90 border-b border-green-800/50 backdrop-blur-md px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Active Route</span>
            <h1 className="text-lg font-extrabold text-white leading-tight">
              {profile?.full_name || 'Driver'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded-full bg-green-950/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-green-400 border border-green-800/40">
              Collector
            </span>
            <button
              onClick={handleSignOut}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0a2716]/60 border border-green-800/40 text-green-400 hover:text-green-300 hover:bg-[#0a2716] transition focus:outline-none"
              aria-label="Sign out"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Feed ─────────────────────────────────────────────────────── */}
      <main className="px-4 py-6 max-w-xl mx-auto pb-24">
        
        {loading ? (
          // Skeletons
          <div className="space-y-5">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-[#0a2716]/40 border border-green-800/20 rounded-2xl h-64 w-full" />
            ))}
          </div>
        ) : error ? (
          // Error State
          <div className="bg-rose-950/40 border border-rose-800/40 rounded-2xl p-6 text-center text-rose-450 shadow-sm mt-8">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-10 h-10 mx-auto mb-3 opacity-80">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="font-semibold text-rose-200">{error}</p>
          </div>
        ) : reports.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center text-center mt-16 px-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#0a2716]/60 border-8 border-green-900/20 text-green-500 mb-5 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-10 h-10">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight mb-2">Route Complete!</h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-[250px]">
              You have no active tasks currently assigned. Great job keeping the community clean.
            </p>
          </div>
        ) : (
          // Job Feed
          <div>
            <div className="flex items-center justify-between mb-5 px-1">
              <h2 className="text-sm font-bold text-slate-300">Pending Jobs</h2>
              <span className="bg-[#0a2716]/60 text-green-400 border border-green-800/40 px-2.5 py-0.5 rounded-full text-xs font-bold">
                {reports.length}
              </span>
            </div>
            
            <div className="space-y-5">
              <AnimatePresence>
                {reports.map(report => (
                  <motion.div
                    key={report.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, x: -50, transition: { duration: 0.2 } }}
                  >
                    <JobCard 
                      report={report} 
                      onResolve={handleResolveReport} 
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>

    </div>
  );
}
