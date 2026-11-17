import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  User,
  Users,
  Building2,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  PlusCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge.jsx';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Role-specific navigation items
  const studentNav = [
    { name: 'Dashboard', to: '/student/dashboard', icon: LayoutDashboard },
    { name: 'Browse Jobs', to: '/student/jobs', icon: Briefcase },
    { name: 'My Applications', to: '/student/applications', icon: FileText },
    { name: 'Profile & Resume', to: '/student/profile', icon: User }
  ];

  const recruiterNav = [
    { name: 'Dashboard', to: '/recruiter/dashboard', icon: LayoutDashboard },
    { name: 'My Jobs', to: '/recruiter/jobs', icon: Briefcase },
    { name: 'Post New Job', to: '/recruiter/jobs/new', icon: PlusCircle },
    { name: 'Company Profile', to: '/recruiter/profile', icon: Building2 }
  ];

  const adminNav = [
    { name: 'Dashboard Overview', to: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Pending Recruiters', to: '/admin/recruiters', icon: Building2 },
    { name: 'User Management', to: '/admin/users', icon: Users },
    { name: 'Job Moderation', to: '/admin/jobs', icon: Briefcase }
  ];

  const navItems =
    user?.role === 'admin'
      ? adminNav
      : user?.role === 'recruiter'
      ? recruiterNav
      : studentNav;

  const roleColors = {
    admin: 'bg-purple-100 text-purple-800 border-purple-200',
    recruiter: 'bg-blue-100 text-blue-800 border-blue-200',
    student: 'bg-emerald-100 text-emerald-800 border-emerald-200'
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col fixed inset-y-0 bg-white border-r border-slate-200 z-30">
        <div className="flex flex-col flex-1 min-h-0">
          {/* Brand */}
          <div className="flex items-center space-x-3 px-6 h-16 border-b border-slate-200">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              HT
            </div>
            <div>
              <span className="text-base font-bold text-slate-900 tracking-tight">HireTrack</span>
              <span className="block text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                Placement Cell
              </span>
            </div>
          </div>

          {/* User Profile Snippet */}
          <div className="p-4 mx-3 my-3 bg-slate-50 border border-slate-100 rounded-xl">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-900 truncate">{user?.name}</p>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border uppercase tracking-wider ${
                      roleColors[user?.role] || 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {user?.role}
                  </span>
                  {user?.accountStatus && user?.accountStatus !== 'active' && (
                    <StatusBadge status={user.accountStatus} size="sm" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 mr-3 flex-shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Footer / Logout */}
          <div className="p-4 border-t border-slate-200">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4 mr-3 flex-shrink-0" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Menu Backdrop & Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white border-r border-slate-200">
            <div className="flex items-center justify-between px-6 h-16 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                  HT
                </div>
                <span className="font-bold text-slate-900">HireTrack</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-slate-500 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700 font-semibold'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 mr-3" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-200">
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-lg"
              >
                <LogOut className="w-4 h-4 mr-3" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pl-64">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 focus:outline-none"
              aria-label="Open mobile menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm sm:text-base font-semibold text-slate-800">
              {user?.role === 'admin'
                ? 'Placement Cell Administration'
                : user?.role === 'recruiter'
                ? 'Corporate Recruitment Portal'
                : 'Student Placement Portal'}
            </h1>
          </div>

          <div className="flex items-center space-x-3">
            <span className="hidden sm:inline-block text-xs text-slate-500">
              {user?.email}
            </span>
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
              {user?.name?.charAt(0) || 'U'}
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

