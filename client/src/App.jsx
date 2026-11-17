import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { PublicLayout, DashboardLayout } from './layouts/index.js';
import { ProtectedRoute, RoleRoute } from './routes/index.js';
import {
  Landing,
  Login,
  Register,
  AccessDenied,
  NotFound,
  StudentDashboard,
  JobsBrowse,
  JobDetails,
  MyApplications,
  ApplicationDetails,
  StudentProfile,
  RecruiterDashboard,
  MyJobs,
  CreateEditJob,
  JobApplicants,
  RecruiterProfile,
  AdminDashboard,
  PendingRecruiters,
  UserManagement,
  JobModeration
} from './pages/index.js';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<Landing />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
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
            <Route path="applications" element={<MyApplications />} />
            <Route path="applications/:applicationId" element={<ApplicationDetails />} />
            <Route path="profile" element={<StudentProfile />} />
          </Route>

          {/* Recruiter Protected Routes */}
          <Route
            path="/recruiter"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['recruiter']}>
                  <DashboardLayout />
                </RoleRoute>
              </ProtectedRoute>
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

          {/* Admin Protected Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['admin']}>
                  <DashboardLayout />
                </RoleRoute>
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="recruiters" element={<PendingRecruiters />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="jobs" element={<JobModeration />} />
          </Route>

          {/* Catch-all 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
