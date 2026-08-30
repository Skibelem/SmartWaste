import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../lib/supabase';
import AnalyticsPanel from '../components/AnalyticsPanel';
import AdminOrders from '../components/AdminOrders';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

// ── Custom DivIcons (module scope — created once, not on every render) ────────
// L.divIcon avoids Vite's asset-hashing issue with default marker PNG images.

const IDLE_ICON = L.divIcon({
  className: '',
  html: `<span style="
    display:block;width:22px;height:22px;
    background:#e11d48;
    border:3px solid rgba(255,255,255,0.9);
    border-radius:50%;
    box-shadow:0 2px 14px rgba(225,29,72,0.55);
  "></span>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const SELECTED_ICON = L.divIcon({
  className: '',
  html: `<span style="
    display:block;width:32px;height:32px;
    background:#e11d48;
    border:3px solid white;
    border-radius:50%;
    box-shadow:0 4px 22px rgba(225,29,72,0.75);
    outline:3px solid rgba(225,29,72,0.35);
    outline-offset:3px;
  "></span>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// ── MapBoundsFitter ───────────────────────────────────────────────────────────
// Invisible child of <MapContainer> that auto-zooms to fit all report markers.
// Must live inside MapContainer to access the Leaflet map context via useMap().

function MapBoundsFitter({ reports }) {
  const map = useMap();

  useEffect(() => {
    if (!reports || reports.length === 0) return;
    if (reports.length === 1) {
      map.setView([reports[0].latitude, reports[0].longitude], 15);
      return;
    }
    const bounds = L.latLngBounds(reports.map((r) => [r.latitude, r.longitude]));
    map.fitBounds(bounds, { padding: [60, 60] });
  }, [reports, map]);

  return null;
}

// ── ReportCard ────────────────────────────────────────────────────────────────
// Clickable card in the left sidebar list.

function ReportCard({ report, isSelected, onClick }) {
  const date = new Date(report.created_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-3.5 transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-green-500/30 ${
        isSelected
          ? 'bg-green-600/20 border-green-500/50 shadow-md shadow-green-900/20'
          : 'bg-[#0a2716]/30 border-green-900/20 hover:bg-green-900/30 hover:border-green-800/40'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Pending status dot */}
        <span className="mt-1.5 h-2 w-2 rounded-full bg-green-500 flex-shrink-0 animate-pulse" />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-200 line-clamp-2 leading-snug mb-1.5">
            {report.description || 'No description provided.'}
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-xs text-slate-500">{date}</span>
            <span className="text-slate-700 text-xs">·</span>
            <span className="text-xs font-mono text-slate-500">
              {Number(report.latitude).toFixed(4)},&nbsp;{Number(report.longitude).toFixed(4)}
            </span>
          </div>
        </div>

        {/* Chevron */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className={`mt-0.5 w-4 h-4 flex-shrink-0 transition-colors ${
            isSelected ? 'text-green-400' : 'text-slate-650 group-hover:text-slate-400'
          }`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </div>

      {/* Image thumbnail */}
      {report.image_url && (
        <div className="mt-2.5 ml-5">
          <img
            src={report.image_url}
            alt="Waste report thumbnail"
            className="h-12 w-full rounded-lg object-cover border border-green-900/30"
          />
        </div>
      )}
    </button>
  );
}

// ── ReportDetailPanel ─────────────────────────────────────────────────────────
// Sliding detail panel.
//   Mobile  : fixed bottom sheet (slides up from bottom)
//   Desktop : absolute right panel within the map container (slides from right)

function ReportDetailPanel({ report, onClose, onDispatch, isSubmitting, dispatchError }) {
  const date = report
    ? new Date(report.created_at).toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  return (
    <div
      className={[
        // ── Positioning ───────────────────────────────────────────────────────
        // Mobile: fixed bottom sheet
        'fixed bottom-0 left-0 right-0 z-[2000]',
        // Desktop: absolute panel within the relative map container
        'md:absolute md:top-0 md:right-0 md:bottom-0 md:left-auto',
        // ── Sizing ────────────────────────────────────────────────────────────
        'w-full md:w-96',
        'max-h-[88vh] md:max-h-none',
        // ── Visual ───────────────────────────────────────────────────────────
        'bg-[#0a2716]/60 backdrop-blur-xl',
        'border-t border-green-800/40 md:border-t-0 md:border-l md:border-green-800/40',
        'shadow-2xl rounded-t-2xl md:rounded-none',
        // ── Scroll ────────────────────────────────────────────────────────────
        'overflow-y-auto',
        // ── Slide animation ───────────────────────────────────────────────────
        // Mobile closed  : slides down  (translate-y-full)
        // Mobile open    : translate-y-0
        // Desktop closed : translate-y-0 + translate-x-full (slides right)
        // Desktop open   : translate-x-0
        'transition-transform duration-300 ease-out',
        report
          ? 'translate-y-0 md:translate-x-0'
          : 'translate-y-full md:translate-y-0 md:translate-x-full',
      ].join(' ')}
    >
      {report && (
        <>
          {/* ── Image / Placeholder ──────────────────────────────────────── */}
          <div className="relative flex-shrink-0">
            {report.image_url ? (
              <img
                src={report.image_url}
                alt="Waste report"
                className="w-full h-52 object-cover"
              />
            ) : (
              <div className="w-full h-36 bg-[#0a2716]/60 backdrop-blur-xl flex flex-col items-center justify-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-10 h-10 text-green-700/60"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                <p className="text-xs text-green-700/80 font-medium">No image attached</p>
              </div>
            )}

            {/* Gradient overlay bar — status badge + close */}
            <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3 bg-gradient-to-b from-black/65 to-transparent">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-950/80 border border-green-800/30 backdrop-blur-sm px-3 py-1 text-[10px] font-bold text-green-400 uppercase tracking-wider shadow">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                Pending
              </span>
              <button
                onClick={onClose}
                aria-label="Close detail panel"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm border border-white/20 text-white hover:bg-black/65 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* ── Detail content ───────────────────────────────────────────── */}
          <div className="p-5 space-y-5 text-slate-100">

            {/* Description */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                Description
              </p>
              <p className="text-sm text-slate-200 leading-relaxed">
                {report.description || (
                  <em className="text-slate-500">No description provided.</em>
                )}
              </p>
            </div>

            {/* Metadata cards */}
            <div className="space-y-2">
              <div className="rounded-xl bg-[#0a2716]/40 border border-green-800/30 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                  Coordinates
                </p>
                <p className="text-sm font-mono text-slate-300">
                  {Number(report.latitude).toFixed(6)},&nbsp;{Number(report.longitude).toFixed(6)}
                </p>
              </div>

              <div className="rounded-xl bg-[#0a2716]/40 border border-green-800/30 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                  Submitted
                </p>
                <p className="text-sm text-slate-300">{date}</p>
              </div>

              <div className="rounded-xl bg-[#0a2716]/40 border border-green-800/30 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                  Reporter ID
                </p>
                <p className="text-xs font-mono text-slate-400 break-all">
                  {report.reporter_id}
                </p>
              </div>
            </div>

            {/* Dispatch error */}
            {dispatchError && (
              <div className="rounded-xl bg-rose-950/40 border border-rose-800/30 px-4 py-3 text-sm text-rose-350">
                {dispatchError}
              </div>
            )}

            {/* Dispatch button */}
            <button
              id="dispatch-btn"
              onClick={onDispatch}
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white shadow-[0_0_15px_rgba(22,163,74,0.3)] transition-all border border-green-400/50 px-4 py-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-500/40 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Dispatching...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                  </svg>
                  Dispatch Collection Team
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── AdminDashboard ────────────────────────────────────────────────────────────
/**
 * Full-screen geospatial command center for admin users.
 * Props:
 *   user    — Supabase auth user object (from AuthContext via Dashboard)
 *   profile — row from the profiles table ({ id, full_name, role, ... })
 *
 * Layout:
 *   Mobile  → flex-col: map (320px) on top, scrollable report list below
 *   Desktop → flex-row: left 30% sidebar, right 70% map
 */
export default function AdminDashboard({ user, profile }) {
  const navigate = useNavigate();
  const containerRef = useRef(null);

  // ── GSAP mount animations sequence ────────────────────────────────────────
  useGSAP(() => {
    const tl = gsap.timeline();
    tl.fromTo('.admin-map-panel', 
      { opacity: 0, scale: 0.98 },
      { opacity: 1, scale: 1, duration: 1, ease: 'power3.out' }
    );
    tl.fromTo('.admin-analytics-overlay',
      { y: -40, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: 'back.out(1.7)' },
      0.2
    );
    tl.fromTo('.admin-sidebar',
      { x: -40, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.8, ease: 'power3.out' },
      '>-0.4'
    );
  }, { scope: containerRef });

  // ── State ──────────────────────────────────────────────────────────────────
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dispatchError, setDispatchError] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState('waste');

  // ── Fetch all pending reports on mount ────────────────────────────────────
  useEffect(() => {
    async function fetchPendingReports() {
      const { data, error } = await supabase
        .from('waste_reports')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('AdminDashboard: fetch error', error);
      }
      setReports(data || []);
      setLoading(false);
    }

    fetchPendingReports();
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSelectReport = (report) => {
    setDispatchError('');
    setSelectedReport(report);
  };

  const handleClosePanel = () => {
    setSelectedReport(null);
    setDispatchError('');
  };

  /**
   * Dispatch flow:
   * 1. Update waste_reports.status → 'assigned' in Supabase
   * 2. Optimistically remove the report from local state (list + map)
   * 3. Close the detail panel
   */
  const handleDispatch = async () => {
    if (!selectedReport) return;
    setIsSubmitting(true);
    setDispatchError('');

    try {
      const { error } = await supabase
        .from('waste_reports')
        .update({ status: 'assigned' })
        .eq('id', selectedReport.id);

      if (error) throw error;

      // Optimistic UI — remove from local pending list
      setReports((prev) => prev.filter((r) => r.id !== selectedReport.id));
      setSelectedReport(null);
      // Trigger analytics panel refresh
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      setDispatchError(err.message || 'Dispatch failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="flex flex-col h-screen bg-[#05150c] overflow-hidden">
      
      {/* ── Top Navigation Tabs ────────────────────────────────────────── */}
      <div className="bg-[#0a2716]/80 backdrop-blur-md border-b border-green-900/50 flex justify-center p-3 z-[2000] shadow-md relative">
        <div className="flex bg-[#05150c] border border-green-900/50 rounded-xl p-1 w-full max-w-sm">
          <button
            onClick={() => setActiveTab('waste')}
            className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition ${
              activeTab === 'waste' ? 'bg-green-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Waste Ops
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition ${
              activeTab === 'orders' ? 'bg-green-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Shop Orders
          </button>
        </div>
      </div>

      {activeTab === 'waste' ? (
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden relative">


      {/* ── Map panel ─────────────────────────────────────────────────────── */}
      {/* Mobile: top 320px  |  Desktop: right 70% of viewport height        */}
      <div className="admin-map-panel relative h-[320px] md:h-screen flex-shrink-0 md:flex-1 order-first md:order-last shadow-[0_0_40px_rgba(22,163,74,0.1)] border border-green-900/50">
        
        {/* Floating Analytics Overlay */}
        <div className="admin-analytics-overlay absolute top-4 left-4 right-4 md:top-8 md:left-1/2 md:-translate-x-1/2 md:w-[90%] md:max-w-4xl z-[1000] pointer-events-none">
          <AnalyticsPanel refreshTrigger={refreshTrigger} />
        </div>

        <MapContainer
          center={[7.6212, 5.2215]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          {/* CartoDB Dark Matter tiles — premium look for command center UI */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            maxZoom={19}
          />

          {/* Auto-fit bounds whenever the reports list changes */}
          <MapBoundsFitter reports={reports} />

          {/* One marker per pending report */}
          {reports.map((report) => (
            <Marker
              key={report.id}
              position={[report.latitude, report.longitude]}
              icon={selectedReport?.id === report.id ? SELECTED_ICON : IDLE_ICON}
              eventHandlers={{ click: () => handleSelectReport(report) }}
            />
          ))}
        </MapContainer>

        {/* Detail panel — slides in over the map */}
        <ReportDetailPanel
          report={selectedReport}
          onClose={handleClosePanel}
          onDispatch={handleDispatch}
          isSubmitting={isSubmitting}
          dispatchError={dispatchError}
        />
      </div>

      {/* ── Left sidebar ──────────────────────────────────────────────────── */}
      {/* Mobile: below map (flex-1 fills remaining height)                  */}
      {/* Desktop: left 30%, full viewport height, scrollable list           */}
      <div className="admin-sidebar flex flex-col flex-1 md:flex-none md:w-[30%] overflow-hidden border-t border-green-950 md:border-t-0 md:border-r md:border-green-800/40 bg-[#0a2716]/60 backdrop-blur-xl border border-green-800/40 order-last md:order-first text-slate-100">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-green-950/80 bg-[#0a2716]/40 backdrop-blur-xl">
          {/* Top row: wordmark + admin badge + sign-out */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-600 shadow-md shadow-green-900/30 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-[18px] h-[18px] text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </div>
              <div>
                <h1 className="text-sm font-bold text-white leading-none tracking-tight">SmartWaste</h1>
                <span className="text-[10px] font-semibold text-green-400 tracking-widest uppercase">
                  Command Center
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-green-800/40 bg-green-950/40 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-400">
                Admin
              </span>
              <button
                id="admin-sign-out-btn"
                onClick={handleSignOut}
                title="Sign out"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-green-800/20 bg-green-950/40 text-green-400 hover:text-white hover:bg-green-900/40 transition focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
              </button>
            </div>
          </div>

          {/* Bottom row: user name + live pending count */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Signed in as{' '}
              <span className="font-semibold text-slate-300">
                {profile?.full_name || 'Admin'}
              </span>
            </p>
            {!loading && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                  reports.length > 0
                    ? 'bg-green-950/40 text-green-400 border border-green-800/30'
                    : 'bg-[#0a2716]/30 text-green-500 border border-green-900/20'
                }`}
              >
                {reports.length > 0 && (
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                )}
                {reports.length} Pending
              </span>
            )}
          </div>
        </div>

        {/* ── Report list ──────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">

          {/* Loading skeletons */}
          {loading &&
            [1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl bg-green-950/20 border border-green-900/30 p-3.5"
              >
                <div className="flex gap-3">
                  <div className="mt-1.5 h-2 w-2 rounded-full bg-green-800/60 flex-shrink-0" />
                  <div className="flex-1 space-y-2.5">
                    <div className="h-2.5 bg-slate-800 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}

          {/* Empty state */}
          {!loading && reports.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] py-10 text-center px-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800 border border-slate-700 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-slate-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-400 mb-1">All clear!</p>
              <p className="text-xs text-slate-600 leading-relaxed max-w-[180px]">
                No pending reports right now. The map will update as residents submit new reports.
              </p>
            </div>
          )}

          {/* Report cards */}
          {!loading && (
            <AnimatePresence>
              {reports.map((report) => (
                <motion.div
                  key={report.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, x: -50, transition: { duration: 0.2 } }}
                >
                  <ReportCard
                    report={report}
                    isSelected={selectedReport?.id === report.id}
                    onClick={() => handleSelectReport(report)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
      ) : (
        <AdminOrders />
      )}
    </div>
  );
}
