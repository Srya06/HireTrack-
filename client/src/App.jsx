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
  MockTestsCatalogue,
  MockTestInstructions,
  MockTestPlayer,
  MockTestResult,
  MockInterviewsLanding,
  AiInterviewChat,
  AiInterviewFeedback,
  StudentReadinessDashboard,
  RecruiterDashboard,
  MyJobs,
  CreateEditJob,
  JobApplicants,
  RecruiterProfile,
  AdminDashboard,
  AdminOpportunities,
  AdminApplications,
  AdminMockTests,
  AdminInterviewTracks,
  AdminInterviewPolicy,
  AdminCohortReadiness,
  AdminReports,
  AdminAuditLogs,
  StudentDirectory,
  PendingRecruiters,
  UserManagement,
  JobModeration,
  StaffRoles,
  InterviewerDashboard,
  InterviewerWorkspace
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
            <Route
              path="mock-tests"
              element={
                <FeatureFlagRoute flag="V3_MOCK_TESTS_ENABLED">
                  <MockTestsCatalogue />
                </FeatureFlagRoute>
              }
            />
            <Route
              path="mock-tests/:id"
              element={
                <FeatureFlagRoute flag="V3_MOCK_TESTS_ENABLED">
                  <MockTestInstructions />
                </FeatureFlagRoute>
              }
            />
            <Route
              path="mock-tests/attempts/:attemptId"
              element={
                <FeatureFlagRoute flag="V3_MOCK_TESTS_ENABLED">
                  <MockTestPlayer />
                </FeatureFlagRoute>
              }
            />
            <Route
              path="mock-tests/attempts/:attemptId/result"
              element={
                <FeatureFlagRoute flag="V3_MOCK_TESTS_ENABLED">
                  <MockTestResult />
                </FeatureFlagRoute>
              }
            />
            <Route
              path="mock-interviews"
              element={
                <FeatureFlagRoute flag="V3_AI_INTERVIEWS_ENABLED">
                  <MockInterviewsLanding />
                </FeatureFlagRoute>
              }
            />
            <Route
              path="mock-interviews/ai/:sessionId"
              element={
                <FeatureFlagRoute flag="V3_AI_INTERVIEWS_ENABLED">
                  <AiInterviewChat />
                </FeatureFlagRoute>
              }
            />
            <Route
              path="mock-interviews/ai/:sessionId/feedback"
              element={
                <FeatureFlagRoute flag="V3_AI_INTERVIEWS_ENABLED">
                  <AiInterviewFeedback />
                </FeatureFlagRoute>
              }
            />
            <Route
              path="readiness"
              element={<StudentReadinessDashboard />}
            />
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
            <Route
              path="applications"
              element={
                <MembershipRoute allowedMemberships={['ORG_ADMIN', 'PLACEMENT_COORDINATOR']}>
                  <AdminApplications />
                </MembershipRoute>
              }
            />
            <Route
              path="mock-tests"
              element={
                <MembershipRoute allowedMemberships={['ORG_ADMIN', 'PLACEMENT_COORDINATOR']}>
                  <AdminMockTests />
                </MembershipRoute>
              }
            />
            <Route
              path="interview-tracks"
              element={
                <MembershipRoute allowedMemberships={['ORG_ADMIN', 'PLACEMENT_COORDINATOR']}>
                  <AdminInterviewTracks />
                </MembershipRoute>
              }
            />
            <Route
              path="interview-policies"
              element={
                <MembershipRoute allowedMemberships={['ORG_ADMIN', 'PLACEMENT_COORDINATOR']}>
                  <AdminInterviewPolicy />
                </MembershipRoute>
              }
            />
            <Route
              path="readiness"
              element={
                <MembershipRoute allowedMemberships={['ORG_ADMIN', 'PLACEMENT_COORDINATOR']}>
                  <AdminCohortReadiness />
                </MembershipRoute>
              }
            />
            <Route
              path="reports"
              element={
                <MembershipRoute allowedMemberships={['ORG_ADMIN', 'PLACEMENT_COORDINATOR']}>
                  <AdminReports />
                </MembershipRoute>
              }
            />
            <Route
              path="audit-logs"
              element={
                <MembershipRoute allowedMemberships={['ORG_ADMIN']}>
                  <AdminAuditLogs />
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
                <MembershipRoute allowedMemberships={['INTERVIEWER', 'ORG_ADMIN', 'PLACEMENT_COORDINATOR']}>
                  <DashboardLayout />
                </MembershipRoute>
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/interviewer/workspace" replace />} />
            <Route path="workspace" element={<InterviewerWorkspace />} />
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
