import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    className: 'bg-amber-950/40 text-amber-400 border-amber-900/60',
    dot: 'bg-amber-400',
  },
  assigned: {
    label: 'Assigned',
    className: 'bg-blue-950/40 text-blue-400 border-blue-900/60',
    dot: 'bg-blue-500',
  },
  resolved: {
    label: 'Resolved',
    className: 'bg-green-950/40 text-green-400 border-green-900/60',
    dot: 'bg-green-500',
  },
};

/**
 * Displays a resident's past waste reports.
 * Props:
 *   userId        — the authenticated user's UUID
 *   refreshTrigger — increment this to force a re-fetch (e.g. after a new submission)
 */
export default function ReportHistory({ userId, refreshTrigger }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(5);

  useEffect(() => {
    if (!userId) return;

    async function fetchReports() {
      setLoading(true);
      const { data, error } = await supabase
        .from('waste_reports')
        .select('*')
        .eq('reporter_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('ReportHistory: fetch error', error);
      } else {
        setReports(data || []);
      }
      setLoading(false);
    }

    fetchReports();
  }, [userId, refreshTrigger]);

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  return (
    <section className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 shadow-2xl rounded-2xl p-6 mb-8 text-slate-100">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-slate-100 leading-none">My Reports</h3>
          <p className="text-xs text-slate-400 mt-0.5">Your submission history</p>
        </div>
        {!loading && reports.length > 0 && (
          <span className="text-xs font-semibold bg-slate-800 text-slate-350 rounded-full px-2.5 py-1 border border-slate-700">
            {reports.length} {reports.length === 1 ? 'report' : 'reports'}
          </span>
        )}
      </div>

      {/* Loading Skeletons */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex gap-4 rounded-xl border border-slate-800/80 bg-slate-950/40 p-4">
              <div className="h-16 w-16 rounded-lg bg-slate-800 flex-shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 bg-slate-800 rounded w-3/4" />
                <div className="h-3 bg-slate-800 rounded w-1/2" />
                <div className="h-5 bg-slate-900 rounded-full w-20 mt-2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && reports.length === 0 && (
        <div className="text-center py-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-slate-650">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-200">No reports yet</p>
          <p className="text-xs text-slate-450 mt-1 max-w-xs mx-auto">
            Submit your first waste report using the form above and it will appear here.
          </p>
        </div>
      )}

      {/* Report List */}
      {!loading && reports.length > 0 && (
        <div>
          <motion.ul layout className="space-y-3">
            {reports.slice(0, visibleCount).map((report) => {
              const statusCfg = STATUS_CONFIG[report.status] ?? STATUS_CONFIG.pending;
              return (
                <li
                  key={report.id}
                  className="flex items-start gap-4 rounded-xl border border-slate-800/80 bg-slate-950/40 p-4 transition-all hover:shadow-sm hover:border-slate-700 hover:bg-slate-900/40"
                >
                  {/* Image or placeholder */}
                  {report.image_url ? (
                    <img
                      src={report.image_url}
                      alt="Waste report"
                      className="h-16 w-16 rounded-lg object-cover flex-shrink-0 border border-slate-800 shadow-sm"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-slate-900 flex items-center justify-center flex-shrink-0 border border-slate-850">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-slate-650">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 leading-snug mb-2 line-clamp-2">
                      {report.description}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Status badge */}
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusCfg.className}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
                        {statusCfg.label}
                      </span>
                      {/* Date */}
                      <span className="text-xs text-slate-450">{formatDate(report.created_at)}</span>
                      {/* Coordinates */}
                      {report.latitude != null && (
                        <span className="text-xs text-slate-450 font-mono">
                          📍 {Number(report.latitude).toFixed(4)}, {Number(report.longitude).toFixed(4)}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </motion.ul>

          {visibleCount < reports.length && (
            <button 
              onClick={() => setVisibleCount(prev => prev + 5)} 
              className="w-full h-12 mt-4 rounded-lg border border-green-800/50 text-green-400 bg-transparent hover:bg-green-900/30 hover:text-green-300 transition-colors flex items-center justify-center font-medium"
            >
              Show More
            </button>
          )}
        </div>
      )}
    </section>
  );
}
