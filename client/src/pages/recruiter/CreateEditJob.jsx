import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { jobService, recruiterService } from '../../services/index.js';
import Card from '../../components/Card.jsx';
import Button from '../../components/Button.jsx';
import FormField from '../../components/FormField.jsx';
import { ArrowLeft, Save, Send, AlertCircle, AlertTriangle, Loader2 } from 'lucide-react';

const BRANCH_LIST = [
  'CSE', 'ISE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AIML', 'DATA_SCIENCE'
];

const GRAD_YEARS = [2024, 2025, 2026, 2027, 2028];

const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'internship', label: 'Internship' },
  { value: 'internship_to_full_time', label: 'Internship to Full Time' }
];

export default function CreateEditJob() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = Boolean(jobId);

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [recruiterProfile, setRecruiterProfile] = useState(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('Bengaluru');
  const [employmentType, setEmploymentType] = useState('full_time');
  const [salaryRange, setSalaryRange] = useState('');
  const [deadline, setDeadline] = useState('');
  const [minCgpa, setMinCgpa] = useState('7.0');
  const [selectedBranches, setSelectedBranches] = useState(['CSE', 'ISE', 'AIML']);
  const [selectedYears, setSelectedYears] = useState([2026]);
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');

  useEffect(() => {
    const fetchRecruiterStatus = async () => {
      try {
        const res = await recruiterService.getMyProfile();
        if (res?.data) {
          setRecruiterProfile(res.data);
        }
      } catch (err) {
        // Fallback to user accountStatus
      }
    };
    fetchRecruiterStatus();
  }, []);

  useEffect(() => {
    if (isEdit) {
      const loadJob = async () => {
        try {
          const res = await jobService.getJobById(jobId);
          if (res.success && res.data) {
            const j = res.data.job;
            setTitle(j.title || '');
            setDepartment(j.department || '');
            setLocation(j.location || '');
            setEmploymentType(j.employmentType || 'full_time');
            setSalaryRange(j.salaryRange || '');
            if (j.applicationDeadline) {
              setDeadline(new Date(j.applicationDeadline).toISOString().split('T')[0]);
            }
            setMinCgpa(String(j.eligibilityCriteria?.minCgpa ?? '0'));
            setSelectedBranches(j.eligibilityCriteria?.allowedBranches || []);
            setSelectedYears(j.eligibilityCriteria?.allowedGraduationYears || [2026]);
            setDescription(j.description || '');
            setRequirements(j.requirements || '');
          }
        } catch (err) {
          setError(err.message || 'Failed to load job');
        } finally {
          setLoading(false);
        }
      };
      loadJob();
    } else {
      // Default future deadline (14 days ahead)
      const d = new Date();
      d.setDate(d.getDate() + 14);
      setDeadline(d.toISOString().split('T')[0]);
    }
  }, [jobId, isEdit]);

  const handleBranchToggle = (branch) => {
    setSelectedBranches((prev) =>
      prev.includes(branch) ? prev.filter((b) => b !== branch) : [...prev, branch]
    );
  };

  const handleYearToggle = (year) => {
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    );
  };

  const isPending = recruiterProfile?.approvalStatus === 'pending' || user?.accountStatus === 'pending';

  const handleSubmit = async (publishImmediately = false) => {
    setError('');

    if (publishImmediately && isPending) {
      setError('Approval from placement cell required to publish live drives. You can save as draft.');
      return;
    }

    if (!title.trim() || !description.trim() || !deadline) {
      setError('Please fill in all required fields (title, deadline, description).');
      return;
    }

    const payload = {
      title: title.trim(),
      department: department.trim(),
      location: location.trim(),
      employmentType,
      salaryRange: salaryRange.trim(),
      applicationDeadline: new Date(deadline).toISOString(),
      eligibilityCriteria: {
        minCgpa: parseFloat(minCgpa) || 0,
        allowedBranches: selectedBranches,
        allowedGraduationYears: selectedYears
      },
      description: description.trim(),
      requirements: requirements.trim()
    };

    setSubmitting(true);
    try {
      let savedJobId = jobId;
      if (isEdit) {
        await jobService.updateJob(jobId, payload);
      } else {
        const res = await jobService.createJob(payload);
        savedJobId = res.data?.job?._id || res.data?._id;
      }

      if (publishImmediately && savedJobId) {
        await jobService.publishJob(savedJobId);
      }

      navigate('/recruiter/jobs');
    } catch (err) {
      setError(err.message || 'Failed to save job opening');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center space-x-3">
        <button
          onClick={() => navigate('/recruiter/jobs')}
          className="text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {isEdit ? 'Edit Placement Opening' : 'Post New Campus Drive'}
          </h2>
          <p className="text-xs text-slate-500">
            Configure job specifications and student eligibility criteria
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <Card>
        <div className="space-y-6">
          {/* Basic Job Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Position Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="Job Title"
                id="job-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Associate Software Engineer"
                required
              />

              <FormField
                label="Department / Team"
                id="job-dept"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Engineering, Cloud Infrastructure"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                label="Employment Type"
                id="job-empType"
                type="select"
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                options={EMPLOYMENT_TYPES}
                required
              />

              <FormField
                label="Location"
                id="job-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Bengaluru / Remote"
              />

              <FormField
                label="Salary / CTC Text"
                id="job-salary"
                value={salaryRange}
                onChange={(e) => setSalaryRange(e.target.value)}
                placeholder="e.g. 10 - 14 LPA"
              />
            </div>

            <FormField
              label="Application Deadline"
              id="job-deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              helperText="Applications close automatically at 23:59 on this date"
              required
            />
          </div>

          {/* Eligibility Criteria */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Eligibility Rules
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="Minimum CGPA (0 - 10)"
                id="job-minCgpa"
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={minCgpa}
                onChange={(e) => setMinCgpa(e.target.value)}
                helperText="Leave 0 for no minimum cut-off"
              />
            </div>

            {/* Allowed Branches Checkboxes */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Eligible Branches (Students outside selected branches are restricted)
              </label>
              <div className="flex flex-wrap gap-2">
                {BRANCH_LIST.map((b) => {
                  const isChecked = selectedBranches.includes(b);
                  return (
                    <button
                      key={b}
                      type="button"
                      onClick={() => handleBranchToggle(b)}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                        isChecked
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {isChecked ? '✓ ' : ''}{b}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Allowed Graduation Years */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Eligible Graduation Years (Batches)
              </label>
              <div className="flex flex-wrap gap-2">
                {GRAD_YEARS.map((y) => {
                  const isChecked = selectedYears.includes(y);
                  return (
                    <button
                      key={y}
                      type="button"
                      onClick={() => handleYearToggle(y)}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                        isChecked
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {isChecked ? '✓ ' : ''}Class of {y}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Description & Requirements */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Job Description & Responsibilities
            </h3>

            <FormField
              label="Detailed Job Description"
              id="job-desc"
              type="textarea"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline role responsibilities, team overview, and project scope..."
              required
            />

            <FormField
              label="Candidate Requirements / Required Skills"
              id="job-reqs"
              type="textarea"
              rows={3}
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="Required programming languages, frameworks, problem-solving skills..."
            />
          </div>

          {isPending && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" />
              <span>Approval from placement cell required to publish live drives. You can save as draft.</span>
            </div>
          )}

          {/* Form Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              icon={Save}
            >
              Save as Draft
            </Button>

            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => handleSubmit(true)}
              disabled={submitting || isPending}
              loading={submitting}
              icon={Send}
              title={isPending ? 'Approval from placement cell required to publish' : ''}
            >
              {isEdit ? 'Update & Publish' : 'Publish Campus Drive'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

