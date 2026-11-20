import React, { useState, useEffect } from 'react';
import { studentService } from '../../services/index.js';
import Card from '../../components/Card.jsx';
import Button from '../../components/Button.jsx';
import FormField from '../../components/FormField.jsx';
import {
  Users,
  Search,
  UploadCloud,
  Download,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Edit2,
  X,
  FileText,
  AlertTriangle,
  Lock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function StudentDirectory() {
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('');

  // Modals & Feedback
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [editingStudent, setEditingStudent] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // CSV Import Modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);
  const [dryRunReport, setDryRunReport] = useState(null);
  const [commitResult, setCommitResult] = useState(null);

  const fetchStudents = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 10,
        q: searchQuery.trim() || undefined,
        branch: branchFilter || undefined,
        verificationStatus: verificationFilter || undefined
      };
      const res = await studentService.getAdminStudents(params);
      if (res && res.success) {
        setStudents(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load student records' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents(1);
  }, [branchFilter, verificationFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStudents(1);
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await studentService.getImportTemplate();
      const blob = new Blob([res.data || res], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'student_import_template.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setFeedback({ type: 'error', message: 'Failed to download template: ' + (err.message || '') });
    }
  };

  // Staff Editing Master Student Record
  const handleOpenEdit = (student) => {
    setEditingStudent({
      _id: student._id || student.id,
      studentCode: student.studentCode || student.studentId || '',
      fullName: student.fullName || student.userId?.name || '',
      degree: student.degree || 'B.Tech',
      cohort: student.cohort || student.course || '2022-2026',
      branch: student.branch || '',
      graduationYear: student.graduationYear || 2026,
      cgpa: student.cgpa ?? '',
      phone: student.phone || '',
      verificationStatus: student.verificationStatus || 'unverified'
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;
    setSavingEdit(true);

    try {
      const payload = {
        degree: editingStudent.degree,
        cohort: editingStudent.cohort,
        branch: editingStudent.branch,
        graduationYear: parseInt(editingStudent.graduationYear, 10),
        cgpa: editingStudent.cgpa !== '' ? parseFloat(editingStudent.cgpa) : null,
        phone: editingStudent.phone,
        verificationStatus: editingStudent.verificationStatus
      };

      const res = await studentService.updateStudentByStaff(editingStudent._id, payload);
      if (res && res.success) {
        setFeedback({ type: 'success', message: 'Student master record updated and audited successfully.' });
        setEditingStudent(null);
        fetchStudents(pagination.page);
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update student record' });
    } finally {
      setSavingEdit(false);
    }
  };

  // CSV Import Wizard Handlers
  const handleRunDryRun = async () => {
    setImporting(true);
    setDryRunReport(null);
    setCommitResult(null);

    try {
      let payload;
      if (csvFile) {
        payload = new FormData();
        payload.append('file', csvFile);
      } else if (csvText.trim()) {
        payload = { csvData: csvText.trim() };
      } else {
        alert('Please select a CSV file or paste CSV content.');
        setImporting(false);
        return;
      }

      const res = await studentService.importStudentsCsv(payload, { dryRun: true });
      if (res && res.success) {
        setDryRunReport(res.data);
      }
    } catch (err) {
      alert('Dry Run Analysis Error: ' + (err.message || 'Validation failed'));
    } finally {
      setImporting(false);
    }
  };

  const handleCommitImport = async () => {
    if (!window.confirm('Commit import? This will create student accounts in the institution and generate activation tokens.')) {
      return;
    }
    setImporting(true);

    try {
      let payload;
      if (csvFile) {
        payload = new FormData();
        payload.append('file', csvFile);
      } else {
        payload = { csvData: csvText.trim() };
      }

      const res = await studentService.importStudentsCsv(payload, { dryRun: false });
      if (res && res.success) {
        setCommitResult(res.data);
        setDryRunReport(null);
        fetchStudents(1);
      }
    } catch (err) {
      alert('Commit Import Error: ' + (err.message || 'Batch creation failed'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Users className="w-6 h-6 text-indigo-600" />
            <span>Student Directory & Academic Records</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage official institution records, verify credentials, and import student cohorts via CSV
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            icon={Download}
          >
            Download CSV Template
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setIsImportModalOpen(true);
              setDryRunReport(null);
              setCommitResult(null);
              setCsvFile(null);
              setCsvText('');
            }}
            icon={UploadCloud}
          >
            Import Students (CSV)
          </Button>
        </div>
      </div>

      {feedback.message && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center space-x-2 border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, USN/code, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>

        <div className="flex gap-2">
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 bg-white"
          >
            <option value="">All Branches</option>
            <option value="CSE">CSE</option>
            <option value="ISE">ISE</option>
            <option value="ECE">ECE</option>
            <option value="MECH">MECH</option>
            <option value="CIVIL">CIVIL</option>
          </select>

          <select
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 bg-white"
          >
            <option value="">All Verification Status</option>
            <option value="verified">Verified</option>
            <option value="unverified">Pending Review</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : students.length === 0 ? (
          <div className="text-center p-12 text-slate-500 text-xs">
            No student records found matching the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">USN / Code</th>
                  <th className="py-3 px-4">Degree & Branch</th>
                  <th className="py-3 px-4">Cohort</th>
                  <th className="py-3 px-4">CGPA</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => {
                  const isVerified = student.verificationStatus === 'verified';
                  return (
                    <tr key={student._id || student.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {student.fullName || student.userId?.name || 'Unnamed Student'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {student.userId?.email || 'No email registered'}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-800">
                        {student.studentCode || student.studentId || 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{student.degree || 'B.Tech'}</div>
                        <div className="text-[11px] text-slate-500">{student.branch || 'General'}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {student.cohort || student.graduationYear || '2026'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {student.cgpa !== null && student.cgpa !== undefined ? student.cgpa : '—'}
                      </td>
                      <td className="py-3 px-4">
                        {isVerified ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>Verified</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <ShieldAlert className="w-3 h-3 text-amber-600" />
                            <span>Pending</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(student)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-medium transition-colors text-xs cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Edit / Verify</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div>
              Showing page <span className="font-semibold">{pagination.page}</span> of{' '}
              <span className="font-semibold">{pagination.pages}</span> ({pagination.total} students)
            </div>
            <div className="flex space-x-1">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => fetchStudents(pagination.page - 1)}
                icon={ChevronLeft}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchStudents(pagination.page + 1)}
                icon={ChevronRight}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Staff Master Record Edit Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Update Official Student Record
                </h3>
                <p className="text-xs text-slate-500">
                  {editingStudent.fullName} ({editingStudent.studentCode})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  label="Degree"
                  id="edit-degree"
                  value={editingStudent.degree}
                  onChange={(e) => setEditingStudent({ ...editingStudent, degree: e.target.value })}
                  required
                />
                <FormField
                  label="Cohort / Batch"
                  id="edit-cohort"
                  value={editingStudent.cohort}
                  onChange={(e) => setEditingStudent({ ...editingStudent, cohort: e.target.value })}
                  placeholder="2022-2026"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  label="Branch"
                  id="edit-branch"
                  value={editingStudent.branch}
                  onChange={(e) => setEditingStudent({ ...editingStudent, branch: e.target.value })}
                  required
                />
                <FormField
                  label="Graduation Year"
                  id="edit-gradYear"
                  type="number"
                  value={editingStudent.graduationYear}
                  onChange={(e) => setEditingStudent({ ...editingStudent, graduationYear: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  label="Official CGPA (0 - 10)"
                  id="edit-cgpa"
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  value={editingStudent.cgpa}
                  onChange={(e) => setEditingStudent({ ...editingStudent, cgpa: e.target.value })}
                />
                <FormField
                  label="Contact Phone"
                  id="edit-phone"
                  value={editingStudent.phone}
                  onChange={(e) => setEditingStudent({ ...editingStudent, phone: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Verification Status
                </label>
                <select
                  value={editingStudent.verificationStatus}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, verificationStatus: e.target.value })
                  }
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 text-slate-800 bg-white"
                >
                  <option value="unverified">Unverified / Pending Review</option>
                  <option value="verified">Verified (Official Institute Placement Endorsement)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingStudent(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={savingEdit}
                >
                  Save & Audit Update
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Wizard Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Bulk Import Students (CSV)
                </h3>
                <p className="text-xs text-slate-500">
                  Idempotent batch onboarding of student records and activation invitations
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Instructions */}
              <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3 text-xs text-indigo-900">
                <strong>Format requirement:</strong> CSV must contain column headers:
                <code className="block mt-1 bg-white px-2 py-1 rounded text-[11px] font-mono text-indigo-800 border border-indigo-100">
                  studentCode,fullName,email,branch,degree,cohort,graduationYear,cgpa,phone
                </code>
                No passwords should ever be included. Activated tokens will be securely generated.
              </div>

              {/* Upload Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Upload CSV File
                </label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => {
                    setCsvFile(e.target.files[0] || null);
                    setDryRunReport(null);
                  }}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 border border-slate-300 rounded-lg p-1.5 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Or Paste CSV Content
                </label>
                <textarea
                  rows={4}
                  value={csvText}
                  onChange={(e) => {
                    setCsvText(e.target.value);
                    setDryRunReport(null);
                  }}
                  placeholder="Paste CSV rows here..."
                  className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Dry-run validation report */}
              {dryRunReport && (
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800">
                      Dry-Run Analysis Report
                    </h4>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold">
                      Zero DB writes performed
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <div className="text-[10px] text-slate-500">Total Rows</div>
                      <div className="font-bold text-slate-800 text-sm">{dryRunReport.totalRows}</div>
                    </div>
                    <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200 text-emerald-800">
                      <div className="text-[10px]">Valid</div>
                      <div className="font-bold text-sm">{dryRunReport.validRows ?? dryRunReport.validRowsCount}</div>
                    </div>
                    <div className="bg-amber-50 p-2 rounded-lg border border-amber-200 text-amber-800">
                      <div className="text-[10px]">Duplicates</div>
                      <div className="font-bold text-sm">{dryRunReport.duplicateRowsCount ?? dryRunReport.duplicates?.length ?? 0}</div>
                    </div>
                    <div className="bg-rose-50 p-2 rounded-lg border border-rose-200 text-rose-800">
                      <div className="text-[10px]">Invalid</div>
                      <div className="font-bold text-sm">{dryRunReport.errorRowsCount ?? dryRunReport.errors?.length ?? 0}</div>
                    </div>
                  </div>

                  {/* Errors display */}
                  {dryRunReport.errors && dryRunReport.errors.length > 0 && (
                    <div className="bg-rose-50/80 border border-rose-200 rounded-lg p-2.5 max-h-36 overflow-y-auto text-xs space-y-1">
                      <div className="font-bold text-rose-900">Format & Validation Errors:</div>
                      {dryRunReport.errors.map((err, i) => (
                        <div key={i} className="text-rose-800 text-[11px]">
                          • Row {err.row}: {err.message} ({err.field})
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Duplicates display */}
                  {dryRunReport.duplicates && dryRunReport.duplicates.length > 0 && (
                    <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-2.5 max-h-36 overflow-y-auto text-xs space-y-1">
                      <div className="font-bold text-amber-900">Duplicate Entries:</div>
                      {dryRunReport.duplicates.map((dup, i) => (
                        <div key={i} className="text-amber-800 text-[11px]">
                          • Row {dup.row}: {dup.studentCode} ({dup.email}) — {dup.reason}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Commit Result Success */}
              {commitResult && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-900 text-xs space-y-2">
                  <div className="flex items-center space-x-2 font-bold text-emerald-800">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Batch Import Committed Successfully!</span>
                  </div>
                  <p>
                    Imported <strong>{commitResult.committedCount ?? commitResult.importedCount}</strong> student records.
                    Created {commitResult.invitationsCreated ?? commitResult.invitations?.length ?? 0} active invitation tokens.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsImportModalOpen(false)}
                >
                  Close
                </Button>

                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    loading={importing && !dryRunReport}
                    disabled={importing || (!csvFile && !csvText.trim())}
                    onClick={handleRunDryRun}
                  >
                    Analyze Batch (Dry Run)
                  </Button>
                  {dryRunReport && (dryRunReport.validRows > 0 || dryRunReport.validRowsCount > 0) && (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      loading={importing}
                      onClick={handleCommitImport}
                    >
                      Confirm & Commit Import
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
