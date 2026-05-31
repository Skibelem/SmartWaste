import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import ResidentDashboard from './ResidentDashboard';

/**
 * Placeholder card shown for roles whose dashboards are built in later sprints.
 * Gives collectors and admins a clear "coming soon" screen rather than a blank state.
 */
function ComingSoonPlaceholder({ role }) {
  const config = {
    collector: {
      title: 'Collector Dashboard',
      subtitle: 'Sprint 3 · Task Management & Routes',
      description:
        'Your assigned task list, active route map, and one-tap status updates will be available here in Sprint 3.',
      badge: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    admin: {
      title: 'Admin Command Center',
      subtitle: 'Sprint 4 · Operations Overview',
      description:
        "The bird's-eye Leaflet map with live report pins, collector assignment panel, and real-time activity feed will be built in Sprint 4.",
      badge: 'bg-rose-100 text-rose-800 border-rose-200',
    },
  }[role] ?? {
    title: 'Dashboard',
    subtitle: 'Coming Soon',
    description: 'Your role-specific dashboard is currently under development.',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <div className="min-h-screen bg-background bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-green-50 via-slate-50 to-slate-100 flex items-center justify-center px-4 py-12">
      <div className="glass max-w-md w-full rounded-2xl p-10 text-center shadow-xl border border-white/40">
        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider mb-6 ${config.badge}`}>
          {role}
        </span>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-5">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight mb-1">{config.title}</h1>
        <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">{config.subtitle}</p>
        <p className="text-secondary text-sm leading-relaxed">{config.description}</p>
      </div>
    </div>
  );
}

/**
 * Role-switch dispatcher.
 * Fetches the authenticated user's profile, then renders the correct
 * role-specific dashboard without adding new URL routes.
 *
 *   resident  → <ResidentDashboard />   (Sprint 2 — built)
 *   collector → <ComingSoonPlaceholder />  (Sprint 3)
 *   admin     → <ComingSoonPlaceholder />  (Sprint 4)
 */
export default function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchProfile() {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Dashboard: profile fetch error', error);
      }
      setProfile(data);
      setLoading(false);
    }

    fetchProfile();
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-secondary font-medium animate-pulse text-sm">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const role = profile?.role ?? 'resident';

  if (role === 'resident') {
    return <ResidentDashboard user={user} profile={profile} />;
  }

  if (role === 'collector' || role === 'admin') {
    return <ComingSoonPlaceholder role={role} />;
  }

  // Safety fallback
  return <ResidentDashboard user={user} profile={profile} />;
}
