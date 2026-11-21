import React, { useState, useEffect } from 'react';
import {
  Award,
  Users,
  Target,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Calendar,
  RotateCcw,
  Plus,
  ShieldAlert,
  FileCheck,
  Search,
  Filter,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';
import Card from '../../components/Card.jsx';
import Button from '../../components/Button.jsx';
import ambassadorService from '../../services/ambassador.service.js';

export default function AdminAmbassadors() {
  const [activeTab, setActiveTab] = useState('profiles'); // 'profiles' | 'campaigns' | 'referrals' | 'certificates' | 'reports'

  // Data states
  const [profiles, setProfiles] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [reports, setReports] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Modals & Action States
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [profileActionStatus, setProfileActionStatus] = useState(null);
  const [profileReason, setProfileReason] = useState('');

  const [selectedReferral, setSelectedReferral] = useState(null);
  const [referralStatus, setReferralStatus] = useState(null);
  const [referralReason, setReferralReason] = useState('');

  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [certStatus, setCertStatus] = useState(null);
  const [certReason, setCertReason] = useState('');

  // Create Campaign Modal
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    targetCount: 10,
    startsAt: '',
    endsAt: '',
    requireContactVerified: true,
    requireValidInstitute: true,
    requireQualifyingActivity: false
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'profiles') {
        const res = await ambassadorService.getAmbassadorProfiles();
        setProfiles(res.data?.profiles || res.profiles || []);
      } else if (activeTab === 'campaigns') {
        const res = await ambassadorService.getCampaigns();
        setCampaigns(res.data || res || []);
      } else if (activeTab === 'referrals') {
        const res = await ambassadorService.getReferrals();
        setReferrals(res.data?.referrals || res.referrals || []);
      } else if (activeTab === 'certificates') {
        const res = await ambassadorService.getCertificates();
        setCertificates(res.data?.certificates || res.certificates || []);
      } else if (activeTab === 'reports') {
        const res = await ambassadorService.getReports();
        setReports(res.data || res);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load ambassador management data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  // Profile Action (Approve / Reject / Suspend)
  const handleUpdateProfileStatus = async (e) => {
    e.preventDefault();
    if (!selectedProfile || !profileActionStatus) return;
    if ((profileActionStatus === 'REJECTED' || profileActionStatus === 'SUSPENDED') && !profileReason.trim()) {
      setError('A reason is required when rejecting or suspending an ambassador.');
      return;
    }
    setError(null);
    try {
      await ambassadorService.updateAmbassadorStatus(selectedProfile.id, {
        status: profileActionStatus,
        reason: profileReason.trim() || undefined
      });
      setSuccessMsg(`Ambassador profile updated to ${profileActionStatus}`);
      setSelectedProfile(null);
      setProfileReason('');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update ambassador status');
    }
  };

  // Referral Action (Verify / Reject / Duplicate)
  const handleVerifyReferral = async (e) => {
    e.preventDefault();
    if (!selectedReferral || !referralStatus) return;
    if (!referralReason.trim()) {
      setError('A reason is mandatory for verifying, rejecting, or flagging a referral.');
      return;
    }
    setError(null);
    try {
      await ambassadorService.verifyReferral(selectedReferral.id, {
        verificationStatus: referralStatus,
        reason: referralReason.trim()
      });
      setSuccessMsg(`Referral marked as ${referralStatus}`);
      setSelectedReferral(null);
      setReferralReason('');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to verify referral');
    }
  };

  // Certificate Action (Approve / Issue / Reject)
  const handleUpdateCertificateStatus = async (e) => {
    e.preventDefault();
    if (!selectedCertificate || !certStatus) return;
    if (certStatus === 'REJECTED' && !certReason.trim()) {
      setError('A reason is required when rejecting a certificate request.');
      return;
    }
    setError(null);
    try {
      await ambassadorService.updateCertificateStatus(selectedCertificate.id, {
        status: certStatus,
        reason: certReason.trim() || undefined
      });
      setSuccessMsg(`Certificate status updated to ${certStatus}`);
      setSelectedCertificate(null);
      setCertReason('');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update certificate status');
    }
  };

  // Create Campaign
  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    if (!newCampaign.name.trim() || !newCampaign.startsAt || !newCampaign.endsAt) {
      setError('Campaign name, startsAt, and endsAt dates are required.');
      return;
    }
    setError(null);
    try {
      await ambassadorService.createCampaign({
        name: newCampaign.name.trim(),
        description: newCampaign.description.trim(),
        targetCount: parseInt(newCampaign.targetCount, 10) || 10,
        startsAt: newCampaign.startsAt,
        endsAt: newCampaign.endsAt,
        verificationRules: {
          requireContactVerified: newCampaign.requireContactVerified,
          requireValidInstitute: newCampaign.requireValidInstitute,
          requireQualifyingActivity: newCampaign.requireQualifyingActivity
        }
      });
      setSuccessMsg('Ambassador campaign created successfully!');
      setShowCreateCampaign(false);
      setNewCampaign({
        name: '',
        description: '',
        targetCount: 10,
        startsAt: '',
        endsAt: '',
        requireContactVerified: true,
        requireValidInstitute: true,
        requireQualifyingActivity: false
      });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create campaign');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-7 h-7 text-indigo-600" />
            Ambassador Program Coordination
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage student ambassador applications, campaigns, peer referral verification queue, and certification review.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchData} className="flex items-center gap-1.5 self-start sm:self-auto">
          <RotateCcw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center space-x-1 border-b border-slate-200 text-xs font-semibold overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('profiles')}
          className={`px-4 py-2.5 border-b-2 transition whitespace-nowrap ${
            activeTab === 'profiles'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Ambassador Applications
        </button>
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`px-4 py-2.5 border-b-2 transition whitespace-nowrap ${
            activeTab === 'campaigns'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Campaigns
        </button>
        <button
          onClick={() => setActiveTab('referrals')}
          className={`px-4 py-2.5 border-b-2 transition whitespace-nowrap ${
            activeTab === 'referrals'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Referral Verification Queue
        </button>
        <button
          onClick={() => setActiveTab('certificates')}
          className={`px-4 py-2.5 border-b-2 transition whitespace-nowrap ${
            activeTab === 'certificates'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Certificate Queue
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2.5 border-b-2 transition whitespace-nowrap ${
            activeTab === 'reports'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Program Overview & Reports
        </button>
      </div>

      {/* TAB 1: PROFILES */}
      {activeTab === 'profiles' && (
        <Card className="overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">Total Applicants: {profiles.length}</span>
            <span className="text-slate-500">Approvals automatically provision unique referral codes.</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Student</th>
                  <th className="px-4 py-3 text-left">Degree & Roll</th>
                  <th className="px-4 py-3 text-left">Statement</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {profiles.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {p.fullName || 'Student'}
                      <span className="block text-[10px] text-slate-400 font-normal">{p.email}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono">
                      {p.rollNumber || 'N/A'} • {p.branch || p.degree || 'General'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={p.applicationNotes}>
                      {p.applicationNotes || 'No notes provided'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : p.status === 'SUSPENDED'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                      {p.status === 'PENDING' && (
                        <>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => {
                              setSelectedProfile(p);
                              setProfileActionStatus('APPROVED');
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2 py-1"
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedProfile(p);
                              setProfileActionStatus('REJECTED');
                            }}
                            className="text-rose-600 hover:bg-rose-50 text-xs px-2 py-1 border-rose-200"
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {p.status === 'APPROVED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedProfile(p);
                            setProfileActionStatus('SUSPENDED');
                          }}
                          className="text-amber-700 hover:bg-amber-50 text-xs px-2 py-1 border-amber-200"
                        >
                          Suspend
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 2: CAMPAIGNS */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500 font-semibold">Active & Planned Outreach Campaigns</span>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setShowCreateCampaign(true)}
              className="flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Create Campaign
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map((c) => (
              <Card key={c._id || c.id} className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {c.status}
                  </span>
                  <span className="text-xs text-slate-500 font-mono font-semibold">
                    Target: {c.targetCount}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{c.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.description || 'No description provided'}</p>
                </div>
                <div className="text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-100 space-y-0.5">
                  <div>Starts: {new Date(c.startsAt).toLocaleDateString()}</div>
                  <div>Ends: {new Date(c.endsAt).toLocaleDateString()}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: REFERRALS VERIFICATION QUEUE */}
      {activeTab === 'referrals' && (
        <Card className="overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">Referrals Awaiting Verification: {referrals.length}</span>
            <span className="text-slate-500">Duplicates are flagged for inspection and never silently counted.</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Participant</th>
                  <th className="px-4 py-3 text-left">Contact Info</th>
                  <th className="px-4 py-3 text-left">Institute</th>
                  <th className="px-4 py-3 text-left">Campaign</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {referrals.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {r.name}
                      {r.verificationStatus === 'DUPLICATE' && (
                        <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          <AlertTriangle className="w-3 h-3 text-amber-600" /> DUPLICATE
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono">
                      <div>{r.email}</div>
                      <div className="text-[10px] text-slate-400">{r.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{r.institute}</td>
                    <td className="px-4 py-3 text-slate-600">{r.campaignName || 'Campaign'}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.verificationStatus === 'VERIFIED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.verificationStatus === 'DUPLICATE'
                            ? 'bg-amber-100 text-amber-800'
                            : r.verificationStatus === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {r.verificationStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          setSelectedReferral(r);
                          setReferralStatus('VERIFIED');
                          setReferralReason('Verified enrolled participant via college register');
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2 py-1"
                      >
                        Verify
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedReferral(r);
                          setReferralStatus('REJECTED');
                          setReferralReason('Unable to verify enrollment record');
                        }}
                        className="text-rose-600 hover:bg-rose-50 text-xs px-2 py-1 border-rose-200"
                      >
                        Reject
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 4: CERTIFICATES QUEUE */}
      {activeTab === 'certificates' && (
        <Card className="overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">Certificates Queue: {certificates.length}</span>
            <span className="text-slate-500">Anti-self-approval strictly enforced. Certificates do not contain branding unless configured.</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Ambassador</th>
                  <th className="px-4 py-3 text-left">Campaign</th>
                  <th className="px-4 py-3 text-center">Verified / Target</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {certificates.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {c.studentName || 'Ambassador'}
                      <span className="block text-[10px] text-slate-400 font-mono">{c.studentRoll}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.campaignName}</td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-slate-900">
                      {c.verifiedCount} / {c.targetCount}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          c.status === 'ISSUED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : c.status === 'APPROVED'
                            ? 'bg-blue-100 text-blue-800'
                            : c.status === 'UNDER_REVIEW'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                      {c.status === 'UNDER_REVIEW' && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => {
                            setSelectedCertificate(c);
                            setCertStatus('APPROVED');
                          }}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-2 py-1"
                        >
                          Approve
                        </Button>
                      )}
                      {(c.status === 'APPROVED' || c.status === 'UNDER_REVIEW') && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => {
                            setSelectedCertificate(c);
                            setCertStatus('ISSUED');
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2 py-1"
                        >
                          Issue Certificate
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 5: REPORTS */}
      {activeTab === 'reports' && reports && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-4 text-center">
              <span className="text-xs text-slate-500 block">Total Ambassadors</span>
              <span className="text-2xl font-bold text-slate-900">{reports.overview?.totalAmbassadors || 0}</span>
            </Card>
            <Card className="p-4 text-center">
              <span className="text-xs text-slate-500 block">Verified Referrals</span>
              <span className="text-2xl font-bold text-emerald-700">{reports.referrals?.verified || 0}</span>
            </Card>
            <Card className="p-4 text-center">
              <span className="text-xs text-slate-500 block">Duplicate Flags</span>
              <span className="text-2xl font-bold text-amber-700">{reports.referrals?.duplicates || 0}</span>
            </Card>
            <Card className="p-4 text-center">
              <span className="text-xs text-slate-500 block">Certificates Issued</span>
              <span className="text-2xl font-bold text-purple-700">{reports.certificates?.issued || 0}</span>
            </Card>
          </div>
        </div>
      )}

      {/* MODAL: Profile Action (Approve / Reject) */}
      {selectedProfile && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">
              Confirm Ambassador {profileActionStatus}
            </h3>
            <p className="text-xs text-slate-600">
              Student: <span className="font-semibold text-slate-800">{selectedProfile.fullName}</span> ({selectedProfile.rollNumber})
            </p>

            {(profileActionStatus === 'REJECTED' || profileActionStatus === 'SUSPENDED') && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason (Mandatory) *
                </label>
                <textarea
                  rows={3}
                  value={profileReason}
                  onChange={(e) => setProfileReason(e.target.value)}
                  placeholder="State the institutional reason for this decision..."
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                  required
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setSelectedProfile(null)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" onClick={handleUpdateProfileStatus}>
                Confirm {profileActionStatus}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Verify Referral */}
      {selectedReferral && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">
              Verify Referral Participant: {selectedReferral.name}
            </h3>
            <p className="text-xs text-slate-600">
              Institute: <span className="font-semibold">{selectedReferral.institute}</span>
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Verification Reason / Verification Evidence *
              </label>
              <textarea
                rows={3}
                value={referralReason}
                onChange={(e) => setReferralReason(e.target.value)}
                placeholder="e.g. Cross-checked with student enrollment records..."
                className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setSelectedReferral(null)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" onClick={handleVerifyReferral}>
                Confirm Verification
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Create Campaign */}
      {showCreateCampaign && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Create Ambassador Outreach Campaign</h3>
              <button onClick={() => setShowCreateCampaign(false)} className="text-slate-400 font-bold">&times;</button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Campaign Name *</label>
                <input
                  type="text"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  placeholder="e.g. Spring 2027 Campus Drive"
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Verified Referrals *</label>
                <input
                  type="number"
                  min="1"
                  value={newCampaign.targetCount}
                  onChange={(e) => setNewCampaign({ ...newCampaign, targetCount: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={newCampaign.startsAt}
                    onChange={(e) => setNewCampaign({ ...newCampaign, startsAt: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    value={newCampaign.endsAt}
                    onChange={(e) => setNewCampaign({ ...newCampaign, endsAt: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="block font-semibold text-slate-700">Verification Criteria:</span>
                <label className="flex items-center gap-2 text-slate-600">
                  <input
                    type="checkbox"
                    checked={newCampaign.requireContactVerified}
                    onChange={(e) => setNewCampaign({ ...newCampaign, requireContactVerified: e.target.checked })}
                    className="rounded text-indigo-600"
                  />
                  <span>Require verified contact credentials</span>
                </label>
                <label className="flex items-center gap-2 text-slate-600">
                  <input
                    type="checkbox"
                    checked={newCampaign.requireValidInstitute}
                    onChange={(e) => setNewCampaign({ ...newCampaign, requireValidInstitute: e.target.checked })}
                    className="rounded text-indigo-600"
                  />
                  <span>Require valid accredited institute enrollment</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button size="sm" variant="outline" type="button" onClick={() => setShowCreateCampaign(false)}>
                  Cancel
                </Button>
                <Button size="sm" variant="primary" type="submit">
                  Save Campaign
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

