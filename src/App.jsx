import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './views/Login';
import Register from './views/Register';
import Dashboard from './views/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';

/** Full-screen spinner shown while the initial Supabase session check is in flight. */
function GlobalLoader() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex h-16 w-16 items-center justify-center">
          {/* Outer spinning ring */}
          <div className="absolute h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          {/* Inner pulsing dot */}
          <div className="h-4 w-4 animate-pulse rounded-full bg-primary/40" />
        </div>
        <p className="text-sm font-semibold text-secondary animate-pulse tracking-wide">
          Starting SmartWaste...
        </p>
      </div>
    </div>
  );
}

/** Inner app — only rendered once auth loading is resolved. */
function AppRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return <GlobalLoader />;
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Wildcard Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
