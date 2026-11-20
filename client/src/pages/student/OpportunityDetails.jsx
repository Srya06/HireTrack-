import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Building,
  MapPin,
  Calendar,
  DollarSign,
  ExternalLink,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Star,
  FileText,
  Globe
} from 'lucide-react';
import { opportunityService } from '../../services/index.js';

export default function OpportunityDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [opportunity, setOpportunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await opportunityService.getStudentOpportunityById(id);
        if (res?.data?.success || res?.success) {
          setOpportunity(res.data?.data || res.data);
        } else {
          setError('Failed to load opportunity details');
        }
      } catch (err) {
        setError(err?.response?.data?.message || err.message || 'Job opportunity not found or not published');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-500 text-sm">
        <div className="inline-block animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full mb-2" />
        <p>Loading opportunity details...</p>
      </div>
    );
  }

  if (error || !opportunity) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4">
        <div className="p-6 rounded-xl bg-rose-50 border border-rose-200 text-center">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
          <h2 className="text-lg font-bold text-rose-900">Opportunity Unavailable</h2>
          <p className="text-sm text-rose-700 mt-1">{error || 'This job opportunity does not exist or is not published.'}</p>
          <div className="mt-4">
            <Link
              to="/student/opportunities"
              className="inline-flex items-center text-xs font-semibold text-rose-800 hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Back to Opportunities
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isClosedOrExpired =
    opportunity.effectiveStatus === 'CLOSED' ||
    opportunity.effectiveStatus === 'EXPIRED' ||
    opportunity.status === 'CLOSED' ||
    opportunity.status === 'EXPIRED';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Link
          to="/student/opportunities"
          className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to all opportunities
        </Link>
      </div>

      {/* Main Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-600 tracking-wider uppercase">
                {opportunity.companyName}
              </span>
              {opportunity.destinationDomain && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                  <Globe className="w-3 h-3 mr-1 text-slate-400" />
                  {opportunity.destinationDomain}
                </span>
              )}
            </div>

            <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
              {opportunity.jobTitle}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-3">
              <span className="flex items-center gap-1 font-medium text-slate-700">
                <MapPin className="w-4 h-4 text-slate-400" />
                {opportunity.location || 'Multiple / Remote'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                {opportunity.workMode}
              </span>
              {opportunity.compensationText && (
                <span className="flex items-center gap-1 text-emerald-700 font-bold">
                  <DollarSign className="w-4 h-4" />
                  {opportunity.compensationText}
                </span>
              )}
            </div>
          </div>

          {/* Prominent Application Action Box */}
          <div className="flex flex-col items-end gap-2">
            {isClosedOrExpired ? (
              <button
                type="button"
                disabled
                className="w-full md:w-auto px-6 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
              >
                {opportunity.effectiveStatus === 'EXPIRED' ? 'Deadline Expired' : 'Applications Closed'}
              </button>
            ) : opportunity.applicationUrl ? (
              <a
                href={opportunity.applicationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full md:w-auto inline-flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors"
              >
                Open Official Application
                <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            ) : null}

            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Deadline:{' '}
                <strong className="text-slate-700">
                  {opportunity.deadline ? new Date(opportunity.deadline).toLocaleDateString() : 'Rolling'}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* Verification Banner */}
        {opportunity.lastVerifiedAt && (
          <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center gap-2 text-xs text-indigo-900">
            <ShieldCheck className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <span>
              Verified by campus placement cell on{' '}
              {new Date(opportunity.lastVerifiedAt).toLocaleDateString()}.
            </span>
          </div>
        )}
      </div>

      {/* Application Instructions (if present) */}
      {opportunity.applicationInstructions && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-900">
            <FileText className="w-4 h-4 text-amber-600" />
            Application Instructions
          </div>
          <p className="text-xs text-amber-900/90 whitespace-pre-wrap leading-relaxed">
            {opportunity.applicationInstructions}
          </p>
        </div>
      )}

      {/* Candidate Requirements & Eligibility Rules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Required Qualifications */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-rose-600" />
            <h3 className="text-sm font-bold text-slate-900">Required Qualifications</h3>
          </div>
          {opportunity.requiredCriteria?.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No hard requirements specified.</p>
          ) : (
            <ul className="space-y-2">
              {opportunity.requiredCriteria?.map((c, i) => (
                <li key={i} className="text-xs text-slate-700 flex items-start gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-slate-900">
                      {c.displayLabel || `${c.type}: `}
                    </span>
                    {!c.displayLabel && (
                      <span className="font-mono text-slate-600 ml-1">
                        {Array.isArray(c.value) ? c.value.join(', ') : String(c.value)}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Preferred Qualifications */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900">Preferred Qualifications</h3>
          </div>
          {opportunity.preferredCriteria?.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No additional preferred qualifications.</p>
          ) : (
            <ul className="space-y-2">
              {opportunity.preferredCriteria?.map((c, i) => (
                <li key={i} className="text-xs text-slate-700 flex items-start gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-slate-800">
                      {c.displayLabel || `${c.type}: `}
                    </span>
                    {!c.displayLabel && (
                      <span className="font-mono text-slate-600 ml-1">
                        {Array.isArray(c.value) ? c.value.join(', ') : String(c.value)}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Full Job Description */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-900">About the Opportunity</h3>
        <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap leading-relaxed">
          {opportunity.description}
        </div>
      </div>

      {/* Sticky Bottom CTA for Mobile / Quick Action */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center justify-between">
        <div className="text-xs text-slate-600">
          Ready to apply for <strong>{opportunity.jobTitle}</strong>?
        </div>
        {isClosedOrExpired ? (
          <button
            type="button"
            disabled
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
          >
            {opportunity.effectiveStatus === 'EXPIRED' ? 'Deadline Expired' : 'Application Closed'}
          </button>
        ) : opportunity.applicationUrl ? (
          <a
            href={opportunity.applicationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors"
          >
            Open Application
            <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
          </a>
        ) : null}
      </div>
    </div>
  );
}
