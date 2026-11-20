import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { FeatureFlagsProvider } from './context/FeatureFlagsContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { PublicLayout, DashboardLayout } from './layouts/index.js';
import { ProtectedRoute, RoleRoute, MembershipRoute, FeatureFlagRoute } from './routes/index.js';
import {
  Landing,
  Login,
  Register,
  AcceptInvitation,
  AccessDenied,
  NotFound,
  StudentDashboard,
  JobsBrowse,
  JobDetails,
  OpportunitiesBrowse,
  OpportunityDetails,
  StudentEligibility,
  MyApplications,
  ApplicationDetails,
  StudentProfile,
  RecruiterDashboard,
  MyJobs,
  CreateEditJob,
  JobApplicants,
  RecruiterProfile,
  AdminDashboard,
  AdminOpportunities,
  StudentDirectory,
  PendingRecruiters,
  UserManagement,
  JobModeration,
  StaffRoles,
  InterviewerDashboard
} from './pages/index.js';

export default function App() {
  return (
    <BrowserRouter>
      <FeatureFlagsProvider>
        <AuthProvider>
          <Routes>
          {/* Public Routes */}
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<Landing />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="invitation/accept" element={<AcceptInvitation />} />
            <Route path="set-password" element={<AcceptInvitation />} />
            <Route path="access-denied" element={<AccessDenied />} />
          </Route>

          {/* Student Protected Routes */}
          <Route
            path="/student"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['student']}>
                  <DashboardLayout />
                </RoleRoute>
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/student/dashboard" replace />} />
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="jobs" element={<JobsBrowse />} />
            <Route path="jobs/:jobId" element={<JobDetails />} />
            <Route path="opportunities" element={<OpportunitiesBrowse />} />
            <Route path="opportunities/:id" element={<OpportunityDetails />} />
            <Route path="eligibility" element={<StudentEligibility />} />
            <Route path="applications" element={<MyApplications />} />
            <Route path="applications/:applicationId" element={<ApplicationDetails />} />
            <Route path="profile" element={<StudentProfile />} />
          </Route>

          {/* Legacy Recruiter Protected Routes (reachable ONLY while LEGACY_RECRUITER_FLOW is true) */}
          <Route
            path="/recruiter"
            element={
              <FeatureFlagRoute flag="LEGACY_RECRUITER_FLOW">
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['recruiter']}>
                    <DashboardLayout />
                  </RoleRoute>
                </ProtectedRoute>
              </FeatureFlagRoute>
            }
          >
            <Route index element={<Navigate to="/recruiter/dashboard" replace />} />
            <Route path="dashboard" element={<RecruiterDashboard />} />
            <Route path="jobs" element={<MyJobs />} />
            <Route path="jobs/new" element={<CreateEditJob />} />
            <Route path="jobs/:jobId/edit" element={<CreateEditJob />} />
            <Route path="jobs/:jobId/applicants" element={<JobApplicants />} />
            <Route path="profile" element={<RecruiterProfile />} />
          </Route>

          {/* Admin / Placement Protected Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <RoleRoute
                  allowedRoles={['admin']}
                  allowedMemberships={[
                    'ORG_ADMIN',
                    'PLACEMENT_COORDINATOR',
                    'AMBASSADOR_COORDINATOR'
                  ]}
                >
                  <DashboardLayout />
                </RoleRoute>
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route
              path="students"
              element={
                <MembershipRoute allowedMemberships={['ORG_ADMIN', 'PLACEMENT_COORDINATOR']}>
                  <StudentDirectory />
                </MembershipRoute>
              }
            />
            <Route
              path="staff"
              element={
                <MembershipRoute allowedMemberships={['ORG_ADMIN']}>
                  <StaffRoles />
                </MembershipRoute>
              }
            />
            <Route
              path="recruiters"
              element={
                <FeatureFlagRoute flag="LEGACY_RECRUITER_FLOW">
                  <PendingRecruiters />
                </FeatureFlagRoute>
              }
            />
            <Route
              path="opportunities"
              element={
                <MembershipRoute allowedMemberships={['ORG_ADMIN', 'PLACEMENT_COORDINATOR']}>
                  <AdminOpportunities />
                </MembershipRoute>
              }
            />
            <Route path="users" element={<UserManagement />} />
            <Route path="jobs" element={<JobModeration />} />
          </Route>

          {/* Interviewer Protected Routes (v3) */}
          <Route
            path="/interviewer"
            element={
              <ProtectedRoute>
                <MembershipRoute allowedMemberships={['INTERVIEWER']}>
                  <DashboardLayout />
                </MembershipRoute>
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/interviewer/dashboard" replace />} />
            <Route path="dashboard" element={<InterviewerDashboard />} />
          </Route>

          {/* Catch-all 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </AuthProvider>
      </FeatureFlagsProvider>
    </BrowserRouter>
  );
}
