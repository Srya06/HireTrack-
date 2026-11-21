import React, { useState, useEffect } from 'react';
import {
  Award,
  Share2,
  Copy,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  Target,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Send,
  Download,
  HelpCircle,
  Info
} from 'lucide-react';
import Card from '../../components/Card.jsx';
import Button from '../../components/Button.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import ambassadorService from '../../services/ambassador.service.js';

export default function StudentAmbassador() {
  const [data, setData] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Application Form
  const [applicationNotes, setApplicationNotes] = useState('');
  const [applying, setApplying] = useState(false);

  // Certificate Request
  const [requestingCert, setRequestingCert] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchAmbassadorData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ambassadorService.getMyStatus();
      const statusData = res.data || res;
      setData(statusData);

      if (statusData?.profile?.status === 'APPROVED') {
        const refRes = await ambassadorService.getMyReferrals({ limit: 50 });
        setReferrals(refRes.data?.referrals || refRes.referrals || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load ambassador program data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAmbassadorData();
  }, []);

  const handleApply = async (e) => {
    e.preventDefault();
    if (!applicationNotes.trim()) {
      setError('Please provide a brief statement of purpose for your application.');
      return;
    }
    setApplying(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await ambassadorService.applyAmbassador(applicationNotes.trim());
      setSuccessMsg('Your application has been submitted and is pending coordinator review.');
      setApplicationNotes('');
      fetchAmbassadorData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to submit ambassador application');
    } finally {
      setApplying(false);
    }
  };

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleRequestCertificate = async () => {
    if (!data?.activeCampaign?.id) return;
    setRequestingCert(true);
    setError(null);
    try {
      await ambassadorService.requestCertificateReview(data.activeCampaign.id);
      setSuccessMsg('Certificate review requested! The ambassador coordinator will verify your achievements.');
      fetchAmbassadorData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to request certificate review');
    } finally {
      setRequestingCert(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-500 space-y-3">
        <RotateCcw className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
        <p className="text-sm font-medium">Loading ambassador program credentials...</p>
      </div>
    );
  }

  const isAmbassador = data?.isAmbassador && data?.profile;
  const profileStatus = data?.profile?.status;
  const activeCampaign = data?.activeCampaign;
  const stats = data?.stats || { verifiedCount: 0, targetCount: 10, progressPercentage: 0 };
  const certificate = data?.certificate;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-7 h-7 text-indigo-600" />
            Campus Ambassador Program
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Empower peer students, drive campus placement readiness outreach, and earn verified leadership credentials.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchAmbassadorData} className="flex items-center gap-1.5 self-start sm:self-auto">
          <RotateCcw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* Program Disclaimer Banner */}
      <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5 text-indigo-300" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-100">Honorary Peer Leadership Credential</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Strictly voluntary and educational. No monetary compensation, fees, or guaranteed placement promises are offered.
            </p>
          </div>
        </div>
      </div>

      {/* Feedback Messages */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* STATE 1: NOT APPLIED */}
      {!isAmbassador && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">Apply to Become a Campus Ambassador</h2>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              As a Campus Ambassador, you will represent our institution's placement cell, share preparation resources with peers,
              and coordinate student onboarding to practice tests and mock interviews. Upon reaching verified peer participation goals,
              you earn an official, tamper-proof Ambassador Leadership Certificate.
            </p>

            <form onSubmit={handleApply} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Statement of Interest & Outreach Strategy
                </label>
                <textarea
                  rows={4}
                  value={applicationNotes}
                  onChange={(e) => setApplicationNotes(e.target.value)}
                  placeholder="Tell the placement coordinator why you want to be an ambassador and how you plan to engage classmates and junior batches..."
                  className="w-full rounded-lg border border-slate-300 p-3 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Maximum 1,000 characters.</span>
              </div>
              <Button type="submit" loading={applying} className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                <span>Submit Ambassador Application</span>
              </Button>
            </form>
          </Card>

          <Card className="p-6 space-y-4 bg-slate-50 border-slate-200">
            <h3 className="font-bold text-slate-800 text-sm">Program Highlights</h3>
            <ul className="space-y-3 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>Non-guessable cryptographically generated referral code.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>Full PII masking on participant records to preserve student privacy.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>Independent coordinator review and verification queue.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>Verified Certificate issued once target is reached.</span>
              </li>
            </ul>
          </Card>
        </div>
      )}

      {/* STATE 2: PENDING APPROVAL */}
      {isAmbassador && profileStatus === 'PENDING' && (
        <Card className="p-8 text-center max-w-xl mx-auto space-y-4">
          <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Application Under Review</h2>
            <p className="text-xs text-slate-600 mt-1">
              Your campus ambassador application has been received and is currently being reviewed by the ambassador coordinator.
              You will receive an update once your profile is approved.
            </p>
          </div>
          {data.profile.applicationNotes && (
            <div className="p-3 bg-slate-50 rounded-lg text-left text-xs font-mono text-slate-600 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Submitted Statement:</span>
              "{data.profile.applicationNotes}"
            </div>
          )}
        </Card>
      )}

      {/* STATE 3: REJECTED */}
      {isAmbassador && profileStatus === 'REJECTED' && (
        <Card className="p-8 text-center max-w-xl mx-auto space-y-4 border-rose-200 bg-rose-50/20">
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Application Not Approved</h2>
            <p className="text-xs text-slate-600 mt-1">
              {data.profile.rejectionReason || 'The coordinator was unable to approve your application at this time.'}
            </p>
          </div>
          <form onSubmit={handleApply} className="space-y-3 pt-2 text-left">
            <label className="block text-xs font-semibold text-slate-700">Submit an updated application statement:</label>
            <textarea
              rows={3}
              value={applicationNotes}
              onChange={(e) => setApplicationNotes(e.target.value)}
              placeholder="Provide additional details or outreach plans..."
              className="w-full rounded-lg border border-slate-300 p-2 text-xs"
            />
            <Button type="submit" loading={applying} size="sm">
              Re-apply for Ambassador Role
            </Button>
          </form>
        </Card>
      )}

      {/* STATE 4: APPROVED AMBASSADOR DASHBOARD */}
      {isAmbassador && profileStatus === 'APPROVED' && (
        <div className="space-y-6">
          {/* Active Campaign & Referral Code Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card className="md:col-span-2 p-6 space-y-4 bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  ACTIVE AMBASSADOR
                </span>
                <span className="text-xs text-slate-400">
                  Campaign: {activeCampaign?.name || 'General Outreach'}
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white">Your Unique Referral Code</h3>
                <p className="text-xs text-slate-300 mt-1">
                  Share this code or direct link with classmates. Each verified referral counts toward your certification target.
                </p>
              </div>

              {/* Code Box */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <div className="flex-1 bg-white/10 backdrop-blur rounded-xl px-4 py-2.5 border border-white/20 flex items-center justify-between font-mono font-bold text-base text-indigo-200">
                  <span>{data.referralCode || 'Generating...'}</span>
                  <button
                    onClick={() => handleCopy(data.referralCode, 'code')}
                    className="text-xs text-white hover:text-indigo-200 flex items-center gap-1 ml-3"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>

                {data.referralLink && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopy(data.referralLink, 'link')}
                    className="bg-white/10 hover:bg-white/20 text-white border-white/20 flex items-center gap-1.5"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{copiedLink ? 'Link Copied!' : 'Copy Share Link'}</span>
                  </Button>
                )}
              </div>
            </Card>

            {/* Target Progress Card */}
            <Card className="p-6 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span className="font-semibold text-slate-700">Campaign Outreach Goal</span>
                  <Target className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-slate-900">{stats.verifiedCount}</span>
                  <span className="text-xs text-slate-400">/ {stats.targetCount} verified referrals</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 mt-3 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, stats.progressPercentage)}%` }}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-[11px]">
                <div>
                  <span className="text-slate-400 block">Pending</span>
                  <span className="font-bold text-amber-600">{stats.pendingCount || 0}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Duplicate</span>
                  <span className="font-bold text-slate-600">{stats.duplicateCount || 0}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Rejected</span>
                  <span className="font-bold text-rose-600">{stats.rejectedCount || 0}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Certificate Section */}
          <Card className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-slate-900 text-sm">Ambassador Leadership Certificate</h3>
                  {certificate && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        certificate.status === 'ISSUED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : certificate.status === 'APPROVED'
                          ? 'bg-blue-100 text-blue-800'
                          : certificate.status === 'UNDER_REVIEW'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {certificate.status}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Issued upon reaching {stats.targetCount} verified peer outreach records. Without institutional branding unless configured.
                </p>
              </div>

              {/* Certificate Action State */}
              <div>
                {!certificate && stats.verifiedCount < stats.targetCount && (
                  <span className="text-xs text-slate-400 font-medium">
                    {stats.targetCount - stats.verifiedCount} more verified referrals needed
                  </span>
                )}

                {(!certificate || certificate.status === 'ELIGIBLE') && stats.verifiedCount >= stats.targetCount && (
                  <Button
                    size="sm"
                    variant="primary"
                    loading={requestingCert}
                    onClick={handleRequestCertificate}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Request Certificate Review
                  </Button>
                )}

                {certificate?.status === 'UNDER_REVIEW' && (
                  <span className="text-xs text-amber-700 font-medium flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Under review by coordinator
                  </span>
                )}

                {certificate?.status === 'ISSUED' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-emerald-700 font-semibold">
                      {certificate.certificateNumber}
                    </span>
                    <Button size="sm" variant="outline" className="flex items-center gap-1.5 text-xs">
                      <Download className="w-3.5 h-3.5" /> Download
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Masked Referrals Table */}
          <Card className="overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Your Referral Outreach Log</h3>
                <span className="text-[10px] text-slate-500">
                  Contact details are cryptographically masked to respect participant privacy.
                </span>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Total Submissions: {referrals.length}
              </span>
            </div>

            {referrals.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No referrals captured yet. Share your code to get started!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Participant (Masked)</th>
                      <th className="px-4 py-3 text-left">Contact Info</th>
                      <th className="px-4 py-3 text-left">Institute</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Captured</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {referrals.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-4 py-3 font-semibold text-slate-900 font-mono">
                          {r.maskedName}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600">
                          <div>{r.maskedEmail}</div>
                          <div className="text-[10px] text-slate-400">{r.maskedPhone}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{r.institute}</td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              r.verificationStatus === 'VERIFIED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : r.verificationStatus === 'DUPLICATE'
                                ? 'bg-slate-100 text-slate-700'
                                : r.verificationStatus === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {r.verificationStatus}
                          </span>
                          {r.reason && (
                            <span className="block text-[10px] text-slate-400 mt-0.5 truncate max-w-xs mx-auto">
                              {r.reason}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-400 font-mono whitespace-nowrap">
                          {new Date(r.capturedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

