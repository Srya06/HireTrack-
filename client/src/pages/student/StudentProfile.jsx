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
  Save
} from 'lucide-react';

const BRANCH_OPTIONS = [
  { value: 'CSE', label: 'Computer Science and Engineering (CSE)' },
  { value: 'ISE', label: 'Information Science and Engineering (ISE)' },
  { value: 'ECE', label: 'Electronics and Communication (ECE)' },
  { value: 'EEE', label: 'Electrical and Electronics (EEE)' },
  { value: 'MECH', label: 'Mechanical Engineering (MECH)' },
  { value: 'CIVIL', label: 'Civil Engineering (CIVIL)' },
  { value: 'AIML', label: 'Artificial Intelligence & ML (AIML)' },
  { value: 'DATA_SCIENCE', label: 'Data Science (DATA_SCIENCE)' }
];

export default function StudentProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form inputs
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState('');
  const [cgpa, setCgpa] = useState('');
  const [branch, setBranch] = useState('CSE');
  const [graduationYear, setGraduationYear] = useState('2026');

  // Resume file
  const [selectedFile, setSelectedFile] = useState(null);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await studentService.getMyProfile();
      if (response.success && response.data) {
        const p = response.data;
        setProfile(p);
        setPhone(p.phone || '');
        setBio(p.bio || '');
        setSkills(Array.isArray(p.skills) ? p.skills.join(', ') : '');
        setCgpa(String(p.cgpa ?? ''));
        setBranch(p.branch || 'CSE');
        setGraduationYear(String(p.graduationYear || '2026'));
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
        phone: phone.trim(),
        bio: bio.trim(),
        skills: skills.split(',').map((s) => s.trim()).filter(Boolean),
        cgpa: parseFloat(cgpa),
        branch,
        graduationYear: parseInt(graduationYear, 10)
      };

      const response = await studentService.updateMyProfile(payload);
      if (response.success) {
        setProfile(response.data);
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

    // Check size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'File size exceeds 5MB limit.' });
      return;
    }

    // Check extension
    const validExts = ['.pdf', '.doc', '.docx'];
    const hasValidExt = validExts.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      setFeedback({ type: 'error', message: 'Only PDF, DOC, or DOCX files are permitted.' });
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
        setFeedback({ type: 'success', message: 'Resume uploaded and attached to your profile!' });
        fetchProfile();
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to upload resume.' });
    } finally {
      setUploading(false);
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Student Profile & Resume</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your verified campus credentials and resume document for recruiter review
        </p>
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

      {/* Resume Section */}
      <Card title="Placement Resume" subtitle="Uploaded resume document is automatically snapshotted on job application">
        <div className="space-y-4">
          {profile?.resume?.url ? (
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-700">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-900">
                    {profile.resume.fileName || 'Attached Resume'}
                  </h4>
                  <p className="text-xs text-emerald-700">
                    Uploaded on {new Date(profile.resume.uploadedAt).toLocaleDateString()} • {(profile.resume.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>

              <a
                href={profile.resume.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 transition-colors shadow-sm self-start sm:self-auto"
              >
                <span>View Document</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>No Resume on File:</strong> You must upload a resume before you can apply to campus placement drives.
              </div>
            </div>
          )}

          {/* Upload Input */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Upload New Resume (PDF, DOC, DOCX up to 5MB)
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input
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

      {/* Profile Details Form */}
      <Card title="Academic & Contact Details">
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Student ID (USN)"
              id="prof-studentId"
              value={profile?.studentId || ''}
              disabled
              helperText="Student USN is officially registered and immutable"
            />

            <FormField
              label="Contact Phone"
              id="prof-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 9876543210"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField
              label="Branch"
              id="prof-branch"
              type="select"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              options={BRANCH_OPTIONS}
              required
            />

            <FormField
              label="Graduation Year"
              id="prof-gradYear"
              type="select"
              value={graduationYear}
              onChange={(e) => setGraduationYear(e.target.value)}
              options={[2024, 2025, 2026, 2027, 2028].map((y) => ({ value: y, label: String(y) }))}
              required
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
              required
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

