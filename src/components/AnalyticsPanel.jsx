import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AnalyticsPanel({ refreshTrigger }) {
  const [metrics, setMetrics] = useState({
    total: 0,
    pending: 0,
    active: 0,
    resolved: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      // Single lightweight fetch of just what we need to calculate metrics
      const { data, error } = await supabase
        .from('waste_reports')
        .select('id, status');

      if (error) {
        console.error('AnalyticsPanel: fetch error', error);
        setLoading(false);
        return;
      }

      if (data) {
        setMetrics({
          total: data.length,
          pending: data.filter((r) => r.status === 'pending').length,
          active: data.filter((r) => r.status === 'assigned').length,
          resolved: data.filter((r) => r.status === 'resolved').length,
        });
      }
      setLoading(false);
    }

    fetchMetrics();
  }, [refreshTrigger]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 pointer-events-none">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="animate-pulse bg-white/90 border border-slate-200 backdrop-blur-md rounded-2xl h-[88px] w-full shadow-xs"
          />
        ))}
      </div>
    );
  }

  return (
    // Outer container blocks no pointer events so the map can be dragged in the gaps
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 pointer-events-none">
      
      {/* ── Total Reports ── */}
      <div className="pointer-events-auto bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.05)] rounded-2xl p-4 flex flex-col justify-center transition-transform hover:-translate-y-0.5">
        <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">
          Total Reports
        </p>
        <p className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-none">
          {metrics.total}
        </p>
      </div>

      {/* ── Pending Reports ── */}
      <div className="pointer-events-auto bg-white/95 backdrop-blur-md border border-rose-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.05)] rounded-2xl p-4 flex flex-col justify-center transition-transform hover:-translate-y-0.5 relative overflow-hidden">
        <div className="absolute -top-4 -right-4 w-12 h-12 bg-rose-500/10 rounded-full blur-xl pointer-events-none" />
        <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-rose-600 mb-1 relative z-10">
          Pending
        </p>
        <p className="text-2xl md:text-3xl font-extrabold text-rose-600 leading-none relative z-10">
          {metrics.pending}
        </p>
      </div>

      {/* ── Active Dispatches ── */}
      <div className="pointer-events-auto bg-white/95 backdrop-blur-md border border-amber-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.05)] rounded-2xl p-4 flex flex-col justify-center transition-transform hover:-translate-y-0.5 relative overflow-hidden">
        <div className="absolute -top-4 -right-4 w-12 h-12 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
        <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-amber-600 mb-1 relative z-10">
          Active Route
        </p>
        <p className="text-2xl md:text-3xl font-extrabold text-amber-600 leading-none relative z-10">
          {metrics.active}
        </p>
      </div>

      {/* ── Resolved Reports ── */}
      <div className="pointer-events-auto bg-white/95 backdrop-blur-md border border-emerald-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.05)] rounded-2xl p-4 flex flex-col justify-center transition-transform hover:-translate-y-0.5 relative overflow-hidden">
        <div className="absolute -top-4 -right-4 w-12 h-12 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
        <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-emerald-600 mb-1 relative z-10">
          Resolved
        </p>
        <p className="text-2xl md:text-3xl font-extrabold text-emerald-600 leading-none relative z-10">
          {metrics.resolved}
        </p>
      </div>

    </div>
  );
}
