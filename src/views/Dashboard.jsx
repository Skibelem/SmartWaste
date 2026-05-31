import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import ResidentDashboard from './ResidentDashboard';
import AdminDashboard from './AdminDashboard';
import CollectorDashboard from './CollectorDashboard';
/**
 * Role-switch dispatcher.
 * Fetches the authenticated user's profile, then renders the correct
 * role-specific dashboard without adding new URL routes.
 *
 *   resident  → <ResidentDashboard />   (Sprint 2 — complete)
 *   admin     → <AdminDashboard />      (Sprint 3 — complete)
 *   collector → <CollectorDashboard />  (Sprint 4 — complete)
 */
export default function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    // If there is no authenticated user, stop the loading spinner immediately.
    // This covers the case where AuthContext resolves to a signed-out state.
    if (!user) {
      setLoading(false);
      return;
    }

    async function fetchProfile() {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        // PGRST116 means 0 rows returned (profile is completely missing)
        // Since we don't have a DB trigger, we'll auto-create it on first login using the metadata saved during registration
        if (error.code === 'PGRST116') {
          const newProfile = {
            id: user.id,
            full_name: user.user_metadata?.full_name || 'SmartWaste User',
            role: user.user_metadata?.role || 'resident',
          };
          
          const { data: insertedData, error: insertError } = await supabase
            .from('profiles')
            .insert([newProfile])
            .select()
            .single();

          if (insertError) {
            console.error('Dashboard: auto-create profile error', insertError);
            setFetchError(insertError.message || 'Failed to auto-create missing profile row.');
          } else {
            setProfile(insertedData);
          }
          setLoading(false);
          return;
        }

        // For any other error (like RLS blocking)
        console.error('Dashboard: profile fetch error', error);
        setFetchError(error.message || 'Unknown profile fetch error');
      } else {
        setProfile(data);
      }
      
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

  if (fetchError) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-2xl bg-rose-50 border border-rose-200 p-6 text-center text-rose-800 shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold mb-2">Profile Load Error</h2>
          <p className="text-sm opacity-90 mb-4">{fetchError}</p>
          <p className="text-xs bg-rose-100/50 p-2 rounded">
            Check your Supabase RLS policies on the <code>profiles</code> table, or verify that your user account has a corresponding row in <code>profiles</code>.
          </p>
        </div>
      </div>
    );
  }

  // ── Debug: expose raw profile in the browser console ────────────────────
  console.log('Dashboard — Current Profile State:', profile);

  // ── Guard: profile query returned null (row missing or RLS blocked) ──────
  // Without this guard the ?? 'resident' fallback below would silently route
  // an admin/collector to the wrong dashboard while the fetch is still in-flight.
  if (!profile) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-secondary font-medium animate-pulse text-sm">Verifying your account...</p>
        </div>
      </div>
    );
  }

  const role = profile.role; // profile is guaranteed non-null here

  if (role === 'resident') {
    return <ResidentDashboard user={user} profile={profile} />;
  }

  if (role === 'admin') {
    return <AdminDashboard user={user} profile={profile} />;
  }

  if (role === 'collector') {
    return <CollectorDashboard user={user} profile={profile} />;
  }

  // Safety fallback
  return <ResidentDashboard user={user} profile={profile} />;
}
