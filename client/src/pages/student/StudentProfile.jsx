import React, { useState, useEffect } from 'react';
import { studentService } from '../../services/index.js';
import Card from '../../components/Card.jsx';
import Button from '../../components/Button.jsx';
import FormField from '../../components/FormField.jsx';
import {
  User,
  GraduationCap,
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Save,
  Lock,
  ShieldCheck,
  Award
} from 'lucide-react';
import { sanitizeUrl } from '../../utils/security.js';

export default function StudentProfile() {
  const [profile, setProfile] = useState(null);
  const [completenessV3, setCompletenessV3] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Student-editable form inputs
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState('');
  const [cgpa, setCgpa] = useState('');

  // Resume file
  const [selectedFile, setSelectedFile] = useState(null);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const fetchProfile = async () => {
    setLoading(true);
    try {
      // Use v3 profile endpoint, fall back to v1 if needed
      let response;
      try {
        response = await studentService.getMyProfileV3();
      } catch {
        response = await studentService.getMyProfile();
      }

      if (response && response.success && response.data) {
        const p = response.data.profile || response.data;
        setProfile(p);
        if (response.data.completenessV3) {
          setCompletenessV3(response.data.completenessV3);
        } else if (response.data.completeness) {
          setCompletenessV3({
            score: response.data.completeness.percentage || 0,
            isComplete: response.data.completeness.isComplete,
            missingFields: response.data.completeness.missingFields || []
          });
        }

        setFullName(p.fullName || p.userId?.name || '');
        setPhone(p.phone || '');
        setBio(p.bio || '');
        setSkills(Array.isArray(p.skills) ? p.skills.join(', ') : '');
        setCgpa(String(p.cgpa ?? ''));
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load profile' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback({ type: '', message: '' });

    try {
      const payload = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
        skills: skills.split(',').map((s) => s.trim()).filter(Boolean)
      };

      if (cgpa !== '' && !isNaN(Number(cgpa))) {
        payload.cgpa = parseFloat(cgpa);
      }

      let response;
      try {
        response = await studentService.updateMyProfileV3(payload);
      } catch {
        response = await studentService.updateMyProfile(payload);
      }

      if (response && response.success) {
        const updated = response.data.profile || response.data;
        setProfile(updated);
        if (response.data.completenessV3) {
          setCompletenessV3(response.data.completenessV3);
        }
        setFeedback({ type: 'success', message: 'Profile updated successfully!' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validExts = ['.pdf', '.doc', '.docx'];
    const hasValidExt = validExts.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (file.size > 5 * 1024 * 1024 || !hasValidExt) {
      setFeedback({
        type: 'error',
        message: 'Upload a PDF or DOC/DOCX resume within the allowed file size.'
      });
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setFeedback({ type: '', message: '' });
  };

  const handleResumeUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setFeedback({ type: '', message: '' });

    const formData = new FormData();
    formData.append('resume', selectedFile);

    try {
      const response = await studentService.uploadResume(formData);
      if (response.success) {
        setSelectedFile(null);
        setFeedback({ type: 'success', message: 'Resume uploaded and securely linked to your profile!' });
        fetchProfile();
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to upload resume.' });
    } finally {
      setUploading(false);
    }
  };

  const handleViewResume = async () => {
    try {
      // 1. Try pre-generated signed URL
      if (profile?.signedResumeUrl) {
        window.open(profile.signedResumeUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      if (profile?.resume?.signedUrl) {
        window.open(profile.resume.signedUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      // 2. If fileAssetId exists, fetch fresh signed URL
      if (profile?.fileAssetId) {
        const assetId = typeof profile.fileAssetId === 'object' ? profile.fileAssetId._id : profile.fileAssetId;
        const res = await studentService.getFileSignedUrl(assetId);
        if (res?.data?.signedUrl) {
          window.open(res.data.signedUrl, '_blank', 'noopener,noreferrer');
          return;
        }
      }
      // 3. Fallback to raw resume url if present and valid
      if (profile?.resume?.url) {
        window.open(sanitizeUrl(profile.resume.url), '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Unable to open resume document: ' + (err.message || 'unknown error') });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const isVerified = profile?.verificationStatus === 'verified' || !!profile?.profileVerifiedAt;
  const score = completenessV3?.score ?? 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900">Student Profile & Resume</h2>
            {isVerified && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified by Placement Cell</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your verified campus credentials and placement resume for job drives
          </p>
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

      {/* Profile Completeness Card */}
      <Card title="Profile Completeness">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-700">Placement Readiness Score</span>
            <span className={score >= 80 ? 'text-emerald-700' : 'text-indigo-700'}>
              {score}% Complete
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${
                score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-indigo-600' : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
            />
          </div>
          {completenessV3?.missingFields && completenessV3.missingFields.length > 0 && (
            <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5 pt-1">
              <span>Missing to reach 100%:</span>
              {completenessV3.missingFields.map((f, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]"
                >
                  {f}
                </span>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Resume Section */}
      <Card title="Placement Resume" subtitle="Uploaded resume is delivered via private signed URLs to authorized recruiters and staff">
        <div className="space-y-4">
          {profile?.resume?.url || profile?.fileAssetId || profile?.signedResumeUrl ? (
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-700">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-900">
                    {profile.resume?.fileName || profile.resume?.originalName || 'Placement_Resume.pdf'}
                  </h4>
                  <p className="text-xs text-emerald-700">
                    {profile.resume?.uploadedAt
                      ? `Uploaded on ${new Date(profile.resume.uploadedAt).toLocaleDateString()}`
                      : 'Active Placement Resume'}{' '}
                    • {profile.resume?.size ? `${(profile.resume.size / 1024).toFixed(1)} KB` : 'PDF'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleViewResume}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 transition-colors shadow-sm self-start sm:self-auto cursor-pointer"
              >
                <span>View Document</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>No Resume on File:</strong> You must upload an official resume before applying for campus job opportunities.
              </div>
            </div>
          )}

          {/* Upload Input */}
          <div className="pt-2">
            <label htmlFor="resume-file-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Upload New Resume (PDF, DOC, DOCX up to 5MB)
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input
                id="resume-file-input"
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 border border-slate-300 rounded-lg p-1.5 cursor-pointer"
              />
              <Button
                variant="primary"
                size="md"
                onClick={handleResumeUpload}
                disabled={!selectedFile || uploading}
                loading={uploading}
                icon={UploadCloud}
              >
                Upload Document
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Official Master Academic Records (Read-only / Locked) */}
      <Card
        title="Official Academic Credentials"
        subtitle="Master fields imported and verified by your institution's placement office (immutable by student)"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <div className="flex items-center space-x-1 mb-1">
              <label className="text-xs font-semibold text-slate-700">Student ID / USN</label>
              <Lock className="w-3 h-3 text-slate-400" />
            </div>
            <input
              type="text"
              value={profile?.studentCode || profile?.studentId || ''}
              disabled
              className="w-full text-xs bg-slate-50 text-slate-600 border border-slate-200 rounded-lg p-2.5 font-mono cursor-not-allowed"
            />
          </div>

          <div>
            <div className="flex items-center space-x-1 mb-1">
              <label className="text-xs font-semibold text-slate-700">Degree</label>
              <Lock className="w-3 h-3 text-slate-400" />
            </div>
            <input
              type="text"
              value={profile?.degree || 'B.Tech'}
              disabled
              className="w-full text-xs bg-slate-50 text-slate-600 border border-slate-200 rounded-lg p-2.5 cursor-not-allowed"
            />
          </div>

          <div>
            <div className="flex items-center space-x-1 mb-1">
              <label className="text-xs font-semibold text-slate-700">Cohort / Batch</label>
              <Lock className="w-3 h-3 text-slate-400" />
            </div>
            <input
              type="text"
              value={profile?.cohort || profile?.course || '2022-2026'}
              disabled
              className="w-full text-xs bg-slate-50 text-slate-600 border border-slate-200 rounded-lg p-2.5 cursor-not-allowed"
            />
          </div>

          <div>
            <div className="flex items-center space-x-1 mb-1">
              <label className="text-xs font-semibold text-slate-700">Branch / Major</label>
              <Lock className="w-3 h-3 text-slate-400" />
            </div>
            <input
              type="text"
              value={profile?.branch || ''}
              disabled
              className="w-full text-xs bg-slate-50 text-slate-600 border border-slate-200 rounded-lg p-2.5 cursor-not-allowed"
            />
          </div>

          <div>
            <div className="flex items-center space-x-1 mb-1">
              <label className="text-xs font-semibold text-slate-700">Graduation Year</label>
              <Lock className="w-3 h-3 text-slate-400" />
            </div>
            <input
              type="text"
              value={profile?.graduationYear || ''}
              disabled
              className="w-full text-xs bg-slate-50 text-slate-600 border border-slate-200 rounded-lg p-2.5 cursor-not-allowed"
            />
          </div>

          <div>
            <div className="flex items-center space-x-1 mb-1">
              <label className="text-xs font-semibold text-slate-700">Verification Status</label>
            </div>
            <div className="flex items-center h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700">
              {isVerified ? (
                <span className="text-emerald-700 flex items-center space-x-1">
                  <ShieldCheck className="w-4 h-4 mr-1" /> Verified
                </span>
              ) : (
                <span className="text-amber-700">Pending Staff Review</span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Editable Student Profile Form */}
      <Card title="Personal & Contact Details" subtitle="Student self-managed details">
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField
              label="Full Name"
              id="prof-fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
            />

            <FormField
              label="Contact Phone"
              id="prof-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 9876543210"
            />

            <FormField
              label="Current CGPA"
              id="prof-cgpa"
              type="number"
              min="0"
              max="10"
              step="0.01"
              value={cgpa}
              onChange={(e) => setCgpa(e.target.value)}
              disabled={isVerified}
              helperText={isVerified ? 'Locked after placement cell verification' : 'Cumulative Grade Point Average'}
            />
          </div>

          <FormField
            label="Technical Skills (comma-separated)"
            id="prof-skills"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            placeholder="Java, Python, React, Spring Boot, MySQL"
          />

          <FormField
            label="Short Bio / Career Objective"
            id="prof-bio"
            type="textarea"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Passionate software engineer looking for full-stack and cloud roles..."
          />

          <div className="flex justify-end pt-2">
            <Button type="submit" variant="primary" size="md" loading={saving} icon={Save}>
              Save Profile Changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
