import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as reportsService from '../services/reports.service.js';

/**
 * Helper to handle JSON vs CSV responses with mandatory audit logging on CSV export.
 */
const handleReportResponse = async ({
  req,
  res,
  reportType,
  fetchFn,
  filename
}) => {
  const isCsv = req.query.format === 'csv';
  const reportData = await fetchFn(req.organizationId, req.query);

  if (isCsv) {
    const csvContent = await reportsService.exportReportCsvWithAudit({
      organizationId: req.organizationId,
      actorId: req.user._id,
      reportType,
      reportData,
      filters: req.query
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    return res.status(200).send(csvContent);
  }

  return sendSuccess(res, {
    statusCode: 200,
    message: `${reportType} report generated successfully`,
    data: reportData
  });
};

/**
 * GET /api/v1/admin/reports/overview
 */
export const getOverviewReport = asyncHandler(async (req, res) => {
  return handleReportResponse({
    req,
    res,
    reportType: 'OVERVIEW',
    fetchFn: reportsService.getOverviewReport,
    filename: `overview-report-${Date.now()}`
  });
});

/**
 * GET /api/v1/admin/reports/jobs
 */
export const getJobsReport = asyncHandler(async (req, res) => {
  return handleReportResponse({
    req,
    res,
    reportType: 'JOBS',
    fetchFn: reportsService.getJobsReport,
    filename: `jobs-report-${Date.now()}`
  });
});

/**
 * GET /api/v1/admin/reports/mock-tests
 */
export const getMockTestsReport = asyncHandler(async (req, res) => {
  return handleReportResponse({
    req,
    res,
    reportType: 'MOCK_TESTS',
    fetchFn: reportsService.getMockTestsReport,
    filename: `mock-tests-report-${Date.now()}`
  });
});

/**
 * GET /api/v1/admin/reports/mock-interviews
 */
export const getMockInterviewsReport = asyncHandler(async (req, res) => {
  return handleReportResponse({
    req,
    res,
    reportType: 'MOCK_INTERVIEWS',
    fetchFn: reportsService.getMockInterviewsReport,
    filename: `mock-interviews-report-${Date.now()}`
  });
});

