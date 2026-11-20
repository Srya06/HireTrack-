import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as adminService from '../services/admin.service.js';
import * as studentService from '../services/student.service.js';
import * as studentImportService from '../services/studentImport.service.js';
import { CSV_TEMPLATE } from '../services/studentImport.service.js';

export const getOverview = asyncHandler(async (req, res) => {
  const result = await adminService.getOverviewMetrics();
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Placement administration overview metrics retrieved',
    data: result
  });
});

export const getPendingRecruiters = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await adminService.getPendingRecruiters({ page, limit });
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Pending recruiters retrieved successfully',
    data: result.recruiters,
    pagination: result.pagination
  });
});

export const updateRecruiterApproval = asyncHandler(async (req, res) => {
  const { recruiterId } = req.params;
  const { approvalStatus } = req.body;
  const result = await adminService.updateRecruiterApproval(recruiterId, { approvalStatus }, req.user);
  return sendSuccess(res, {
    statusCode: 200,
    message: `Recruiter successfully ${approvalStatus}`,
    data: result
  });
});

export const getUsers = asyncHandler(async (req, res) => {
  const { page, limit, role, status, q } = req.query;
  const result = await adminService.getUsers({ page, limit, role, status, q });
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Users retrieved successfully',
    data: result.users,
    pagination: result.pagination
  });
});

export const updateUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { accountStatus } = req.body;
  const result = await adminService.updateUserStatus(id, { accountStatus }, req.user);
  return sendSuccess(res, {
    statusCode: 200,
    message: `User account status updated to ${accountStatus}`,
    data: result
  });
});

export const getAllJobs = asyncHandler(async (req, res) => {
  const { page, limit, status, q } = req.query;
  const result = await adminService.getAllJobs({ page, limit, status, q });
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Jobs retrieved successfully',
    data: result.jobs,
    pagination: result.pagination
  });
});

export const updateJobStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const result = await adminService.updateJobStatus(id, { status }, req.user);
  return sendSuccess(res, {
    statusCode: 200,
    message: `Job status updated to ${status}`,
    data: result
  });
});

export const getImportTemplate = asyncHandler(async (req, res) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="student_import_template.csv"');
  return res.status(200).send(CSV_TEMPLATE);
});

export const importStudents = asyncHandler(async (req, res) => {
  let csvText = '';
  if (req.file && req.file.buffer) {
    csvText = req.file.buffer.toString('utf8');
  } else if (req.body?.csvData) {
    csvText = req.body.csvData;
  } else if (req.body?.csvText) {
    csvText = req.body.csvText;
  }

  const dryRunParam = req.query.dryRun !== undefined ? req.query.dryRun : req.body?.dryRun;
  const isDryRun = dryRunParam === 'true' || dryRunParam === true || dryRunParam === '1';

  const result = await studentImportService.processStudentImport(
    req.organizationId,
    req.user,
    csvText,
    { dryRun: isDryRun }
  );

  return sendSuccess(res, {
    statusCode: 200,
    message: isDryRun
      ? 'Student CSV analysis report generated'
      : 'Student CSV batch import committed successfully',
    data: result
  });
});

export const listStudents = asyncHandler(async (req, res) => {
  const { page, limit, q, branch, degree, cohort, verificationStatus, accountStatus } = req.query;
  const result = await studentService.listStudentsAdmin(req.organizationId, {
    page,
    limit,
    q,
    branch,
    degree,
    cohort,
    verificationStatus,
    accountStatus
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Students retrieved successfully',
    data: result.students,
    pagination: result.pagination
  });
});

export const updateStudentByStaff = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await studentService.updateStudentByStaff(
    req.organizationId,
    req.user,
    id,
    req.body
  );
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Student master profile updated successfully',
    data: result
  });
});
