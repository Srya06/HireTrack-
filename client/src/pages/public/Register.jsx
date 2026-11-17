import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import Button from '../../components/Button.jsx';
import FormField from '../../components/FormField.jsx';
import Card from '../../components/Card.jsx';
import { GraduationCap, Building2, UserPlus, AlertCircle } from 'lucide-react';

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

const GRADUATION_YEARS = [2024, 2025, 2026, 2027, 2028];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Student specific state
  const [studentId, setStudentId] = useState('');
  const [branch, setBranch] = useState('CSE');
  const [graduationYear, setGraduationYear] = useState('2026');
  const [cgpa, setCgpa] = useState('8.5');
  const [skills, setSkills] = useState('JavaScript, React, Node.js');

  // Recruiter specific state
  const [companyName, setCompanyName] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [phone, setPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const validate = () => {
    const errors = {};
    if (!name.trim()) {
      errors.name = 'Full name is required';
    } else if (name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      errors.email = 'Email address is required';
    } else if (!emailRegex.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      errors.password = 'Password must contain at least one letter and one number';
    }

    if (role === 'student') {
      if (!studentId.trim()) {
        errors.studentId = 'Student ID (USN) is required';
      }
      const numCgpa = parseFloat(cgpa);
      if (isNaN(numCgpa) || numCgpa < 0 || numCgpa > 10) {
        errors.cgpa = 'CGPA must be a valid number between 0.0 and 10.0';
      }
    } else {
      if (!companyName.trim()) {
        errors.companyName = 'Company name is required';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name,
        email,
        password,
        role
      };

      if (role === 'student') {
        payload.studentProfile = {
          studentId: studentId.trim(),
          branch,
          graduationYear: Number(graduationYear),
          cgpa: parseFloat(cgpa),
          skills: skills.split(',').map((s) => s.trim()).filter(Boolean)
        };
      } else {
        payload.recruiterProfile = {
          companyName: companyName.trim(),
          website: companyWebsite.trim(),
          phone: phone.trim()
        };
      }

      const user = await register(payload);
      if (user.role === 'recruiter') {
        navigate('/recruiter/dashboard', { replace: true });
      } else {
        navigate('/student/dashboard', { replace: true });
      }
    } catch (err) {
      setErrorMessage(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold text-slate-900">Create HireTrack Account</h2>
          <p className="text-sm text-slate-500">Select your role to get started</p>
        </div>

        {/* Role Toggle Selector */}
        <div className="grid grid-cols-2 gap-3 p-1 bg-slate-200/70 rounded-xl">
          <button
            type="button"
            onClick={() => setRole('student')}
            className={`flex items-center justify-center space-x-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              role === 'student'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Student Registration</span>
          </button>

          <button
            type="button"
            onClick={() => setRole('recruiter')}
            className={`flex items-center justify-center space-x-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              role === 'recruiter'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Company / Recruiter</span>
          </button>
        </div>

        <Card>
          <form noValidate onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {role === 'recruiter' && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                <strong>Notice:</strong> Recruiter accounts are created in <em>pending</em> status and require approval from the placement cell before publishing jobs.
              </div>
            )}

            {/* Common User Credentials */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="Full Name"
                id="reg-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: '' }));
                }}
                error={fieldErrors.name}
                placeholder={role === 'student' ? 'e.g. Rahul Sharma' : 'e.g. John Doe (HR)'}
                required
              />

              <FormField
                label="Email Address"
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: '' }));
                }}
                error={fieldErrors.email}
                placeholder="you@domain.com"
                required
              />
            </div>

            <FormField
              label="Password"
              id="reg-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: '' }));
              }}
              error={fieldErrors.password}
              placeholder="Min 8 characters (letters & numbers)"
              helperText="Must be at least 8 characters with at least one letter and one number"
              required
            />

            {/* Student Specific Fields */}
            {role === 'student' ? (
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Academic Information
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    label="Student ID (USN / Roll No)"
                    id="reg-studentId"
                    value={studentId}
                    onChange={(e) => {
                      setStudentId(e.target.value);
                      if (fieldErrors.studentId) setFieldErrors(prev => ({ ...prev, studentId: '' }));
                    }}
                    error={fieldErrors.studentId}
                    placeholder="e.g. 1RV22CS001"
                    required
                  />

                  <FormField
                    label="Branch / Department"
                    id="reg-branch"
                    type="select"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    options={BRANCH_OPTIONS}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    label="Graduation Year"
                    id="reg-gradYear"
                    type="select"
                    value={graduationYear}
                    onChange={(e) => setGraduationYear(e.target.value)}
                    options={GRADUATION_YEARS.map(y => ({ value: y, label: String(y) }))}
                    required
                  />

                  <FormField
                    label="Current CGPA (0.00 - 10.00)"
                    id="reg-cgpa"
                    type="number"
                    min="0"
                    max="10"
                    step="0.01"
                    value={cgpa}
                    onChange={(e) => {
                      setCgpa(e.target.value);
                      if (fieldErrors.cgpa) setFieldErrors(prev => ({ ...prev, cgpa: '' }));
                    }}
                    error={fieldErrors.cgpa}
                    placeholder="8.5"
                    required
                  />
                </div>

                <FormField
                  label="Technical Skills (comma-separated)"
                  id="reg-skills"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="Java, Python, React, SQL"
                />
              </div>
            ) : (
              /* Recruiter Specific Fields */
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Company Details
                </h4>

                <FormField
                  label="Company Name"
                  id="reg-companyName"
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    if (fieldErrors.companyName) setFieldErrors(prev => ({ ...prev, companyName: '' }));
                  }}
                  error={fieldErrors.companyName}
                  placeholder="e.g. Microsoft India, Infosys, Cisco"
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    label="Company Website"
                    id="reg-website"
                    type="text"
                    value={companyWebsite}
                    onChange={(e) => setCompanyWebsite(e.target.value)}
                    placeholder="https://company.com"
                  />

                  <FormField
                    label="Contact Phone"
                    id="reg-phone"
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-4"
              loading={loading}
              icon={UserPlus}
            >
              Complete Registration
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Already registered?{' '}
            <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
              Sign In here
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

