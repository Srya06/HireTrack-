import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Button from '../components/Button.jsx';
import { GraduationCap, ArrowRight } from 'lucide-react';

export default function PublicLayout() {
  const { user, isAuthenticated } = useAuth();

  const getDashboardRoute = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin/dashboard';
    if (user.role === 'recruiter') return '/recruiter/dashboard';
    return '/student/dashboard';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              HT
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900 tracking-tight">HireTrack</span>
              <span className="hidden sm:inline-block ml-2 text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                Campus Placements
              </span>
            </div>
          </Link>

          <div className="flex items-center space-x-3">
            {isAuthenticated ? (
              <Link to={getDashboardRoute()}>
                <Button variant="primary" size="sm" icon={ArrowRight}>
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm">
                    Register
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <p>© 2026 HireTrack Placement Management System. Single-college campus placement platform.</p>
      </footer>
    </div>
  );
}

