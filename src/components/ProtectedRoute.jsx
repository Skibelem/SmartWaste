import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // Only fetch the profile once the global auth check has resolved and we have a user
    if (authLoading) return;

    if (!user) {
      setProfileLoading(false);
      return;
    }

    let mounted = true;

    async function fetchProfile() {
      try {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user profile in ProtectedRoute:', error);
        }

        if (mounted) {
          setProfile(profileData);
        }
      } catch (err) {
        console.error('Profile fetch failed:', err);
      } finally {
        if (mounted) setProfileLoading(false);
      }
    }

    fetchProfile();

    return () => {
      mounted = false;
    };
  }, [user, authLoading]);

  // Wait for both the global auth check and the profile fetch
  if (authLoading || profileLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-secondary font-medium animate-pulse">Verifying secure session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login, saving original location so we can redirect back later
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check roles if allowedRoles array is provided — return Navigate as sole element so the redirect fires
  if (allowedRoles && (!profile || !allowedRoles.includes(profile.role))) {
    return <Navigate to="/" replace />;
  }

  return children;
}
