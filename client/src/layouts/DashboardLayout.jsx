import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useFeatureFlags } from '../context/FeatureFlagsContext.jsx';
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
  ClipboardList,
  MessageSquare,
  Calendar,
  TrendingUp,
  Award,
  GraduationCap
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge.jsx';
import NotificationBell from '../components/NotificationBell.jsx';

export default function DashboardLayout() {
  const { user, organization, membershipRoles = [], logout } = useAuth();
  const { flags } = useFeatureFlags();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
    navigate('/login');
  };

  const hasOrgAdmin = membershipRoles.includes('ORG_ADMIN') || user?.role === 'admin';
  const hasPlacementCoordinator = membershipRoles.includes('PLACEMENT_COORDINATOR');
  const hasAmbassadorCoordinator = membershipRoles.includes('AMBASSADOR_COORDINATOR');
  const hasAdminWorkspace = hasOrgAdmin || hasPlacementCoordinator || hasAmbassadorCoordinator;
  const hasInterviewerWorkspace = membershipRoles.includes('INTERVIEWER');
  const hasStudentWorkspace = membershipRoles.includes('STUDENT') || user?.role === 'student';
  const hasLegacyRecruiterWorkspace =
    Boolean(flags.LEGACY_RECRUITER_FLOW) && user?.role === 'recruiter';

  // Determine active workspace from URL path with safe fallback to user's primary workspace
  const resolveWorkspace = () => {
    if (location.pathname.startsWith('/admin') && hasAdminWorkspace) return 'admin';
    if (location.pathname.startsWith('/interviewer') && hasInterviewerWorkspace) return 'interviewer';
    if (location.pathname.startsWith('/recruiter') && hasLegacyRecruiterWorkspace) return 'recruiter';
    if (location.pathname.startsWith('/student') && hasStudentWorkspace) return 'student';

    if (hasAdminWorkspace) return 'admin';
    if (hasInterviewerWorkspace) return 'interviewer';
    if (hasLegacyRecruiterWorkspace) return 'recruiter';
    return 'student';
  };

  const activeWorkspace = resolveWorkspace();

  const availableWorkspaces = [
    ...(hasStudentWorkspace ? [{ id: 'student', label: 'Student', to: '/student/dashboard' }] : []),
    ...(hasAdminWorkspace ? [{ id: 'admin', label: 'Admin / Placement', to: '/admin/dashboard' }] : []),
    ...(hasInterviewerWorkspace
      ? [{ id: 'interviewer', label: 'Interviewer', to: '/interviewer/dashboard' }]
      : []),
    ...(hasLegacyRecruiterWorkspace
      ? [{ id: 'recruiter', label: 'Recruiter', to: '/recruiter/dashboard' }]
      : [])
  ];

  // Role- & feature-flag-aware navigation items (unbuilt v3 modules hidden by flag; Mock Tests & Mock Interviews kept separate)
  const studentNav = [
    { name: 'Dashboard', to: '/student/dashboard', icon: LayoutDashboard },
    ...(flags.V3_OPPORTUNITIES_ENABLED
      ? [
          { name: 'Opportunities', to: '/student/opportunities', icon: Briefcase },
          { name: 'Eligibility', to: '/student/eligibility', icon: ShieldCheck }
        ]
      : [{ name: 'Browse Jobs', to: '/student/jobs', icon: Briefcase }]),
    { name: 'My Applications', to: '/student/applications', icon: FileText },
    ...(flags.V3_MOCK_TESTS_ENABLED
      ? [{ name: 'Mock Tests', to: '/student/mock-tests', icon: ClipboardList }]
      : []),
    ...(flags.V3_AI_INTERVIEWS_ENABLED || flags.V3_HUMAN_INTERVIEWS_ENABLED
      ? [{ name: 'Mock Interviews', to: '/student/mock-interviews', icon: MessageSquare }]
      : []),
    ...(flags.V3_READINESS_ENABLED
      ? [{ name: 'Readiness', to: '/student/readiness', icon: TrendingUp }]
      : []),
    ...(flags.V3_AMBASSADORS_ENABLED
      ? [{ name: 'Ambassadors', to: '/student/ambassador', icon: Award }]
      : []),
    { name: 'Profile & Resume', to: '/student/profile', icon: User }
  ];

  const recruiterNav = flags.LEGACY_RECRUITER_FLOW
    ? [
        { name: 'Dashboard', to: '/recruiter/dashboard', icon: LayoutDashboard },
        { name: 'My Jobs', to: '/recruiter/jobs', icon: Briefcase },
        { name: 'Post New Job', to: '/recruiter/jobs/new', icon: PlusCircle },
        { name: 'Company Profile', to: '/recruiter/profile', icon: Building2 }
      ]
    : [];

  const adminNav = [
    { name: 'Dashboard Overview', to: '/admin/dashboard', icon: LayoutDashboard },
    ...(hasOrgAdmin || hasPlacementCoordinator
      ? [{ name: 'Students Directory', to: '/admin/students', icon: GraduationCap }]
      : []),
    ...(hasOrgAdmin ? [{ name: 'Staff & Roles', to: '/admin/staff', icon: ShieldCheck }] : []),
    ...(flags.LEGACY_RECRUITER_FLOW && hasOrgAdmin
      ? [{ name: 'Pending Recruiters', to: '/admin/recruiters', icon: Building2 }]
      : []),
    ...(hasOrgAdmin ? [{ name: 'User Management', to: '/admin/users', icon: Users }] : []),
    ...(flags.V3_OPPORTUNITIES_ENABLED && (hasOrgAdmin || hasPlacementCoordinator)
      ? [
          { name: 'Opportunities', to: '/admin/opportunities', icon: Briefcase },
          { name: 'Applications Report', to: '/admin/applications', icon: FileText }
        ]
      : hasOrgAdmin || hasPlacementCoordinator
      ? [{ name: 'Job Moderation', to: '/admin/jobs', icon: Briefcase }]
      : []),
    ...(flags.V3_MOCK_TESTS_ENABLED && (hasOrgAdmin || hasPlacementCoordinator)
      ? [{ name: 'Mock Tests', to: '/admin/mock-tests', icon: ClipboardList }]
      : []),
    ...(flags.V3_AMBASSADORS_ENABLED && (hasOrgAdmin || hasAmbassadorCoordinator)
      ? [{ name: 'Ambassadors', to: '/admin/ambassadors', icon: Award }]
      : [])
  ];

  const interviewerNav = [
    { name: 'Assigned Sessions', to: '/interviewer/dashboard', icon: Calendar }
  ];

  const navItems =
    activeWorkspace === 'admin'
      ? adminNav
      : activeWorkspace === 'interviewer'
      ? interviewerNav
      : activeWorkspace === 'recruiter'
      ? recruiterNav
      : studentNav;

  const workspaceTitle =
    activeWorkspace === 'admin'
      ? 'Admin & Placement Workspace'
      : activeWorkspace === 'interviewer'
      ? 'Interviewer Workspace'
      : activeWorkspace === 'recruiter'
      ? 'Corporate Recruitment Portal'
      : 'Student Placement Portal';

  const roleColors = {
    admin: 'bg-purple-100 text-purple-800 border-purple-200',
    recruiter: 'bg-blue-100 text-blue-800 border-blue-200',
    student: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    interviewer: 'bg-amber-100 text-amber-800 border-amber-200'
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
            <div className="min-w-0">
              <span className="text-base font-bold text-slate-900 tracking-tight block truncate">
                HireTrack
              </span>
              <span className="block text-[10px] text-slate-500 uppercase tracking-widest font-semibold truncate">
                {organization?.name || 'Placement Portal'}
              </span>
            </div>
          </div>

          {/* User Profile Snippet */}
          <div className="p-4 mx-3 my-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2.5">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-900 truncate">{user?.name}</p>
                <div className="flex flex-wrap items-center gap-1 mt-0.5">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border uppercase tracking-wider ${
                      roleColors[activeWorkspace] || roleColors[user?.role] || 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {membershipRoles[0] || user?.role}
                  </span>
                  {user?.accountStatus && user?.accountStatus !== 'active' && (
                    <StatusBadge status={user.accountStatus} size="sm" />
                  )}
                </div>
              </div>
            </div>

            {availableWorkspaces.length > 1 && (
              <div className="pt-2 border-t border-slate-200/80">
                <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Workspace
                </span>
                <div className="flex flex-wrap gap-1">
                  {availableWorkspaces.map((ws) => (
                    <button
                      key={ws.id}
                      type="button"
                      onClick={() => navigate(ws.to)}
                      className={`text-[11px] px-2 py-1 rounded-md font-medium transition-colors ${
                        activeWorkspace === ws.id
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {ws.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
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
              {workspaceTitle}
            </h1>
          </div>

          <div className="flex items-center space-x-3">
            <NotificationBell />

            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((prev) => !prev)}
                className="flex items-center space-x-2.5 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-expanded={userMenuOpen}
                aria-label="User account menu"
              >
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <span className="block text-xs font-semibold text-slate-800 leading-tight">
                  {user?.name}
                </span>
                <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                  {user?.role}
                </span>
              </div>
            </button>

            {/* User Dropdown Menu */}
            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-slate-200 shadow-lg py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">{user?.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                    <div className="mt-1.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                        roleColors[user?.role] || 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {user?.role}
                      </span>
                    </div>
                  </div>

                  {user?.role === 'student' && (
                    <NavLink
                      to="/student/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      Profile & Resume
                    </NavLink>
                  )}

                  {user?.role === 'recruiter' && (
                    <NavLink
                      to="/recruiter/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      Company Profile
                    </NavLink>
                  )}

                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center space-x-2 font-medium"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
            </div>
          </div>
        </header>

        {/* Global Pending Recruiter Notice Banner */}
        {user?.role === 'recruiter' && user?.accountStatus === 'pending' && (
          <div className="bg-amber-500 text-white px-4 py-2.5 text-xs flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-2 mx-auto">
              <span className="font-bold">Notice:</span>
              <span>Your recruiter account is awaiting placement-cell approval. You will be able to publish job drives once verified.</span>
            </div>
          </div>
        )}

        {/* Page Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

