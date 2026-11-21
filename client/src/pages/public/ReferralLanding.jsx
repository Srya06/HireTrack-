import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Award, CheckCircle2, AlertCircle, Send, Sparkles, Building2, User, Mail, Phone, FileText } from 'lucide-react';
import Card from '../../components/Card.jsx';
import Button from '../../components/Button.jsx';
import ambassadorService from '../../services/ambassador.service.js';

export default function ReferralLanding() {
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [institute, setInstitute] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resultMsg, setResultMsg] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const urlCode = searchParams.get('code');
    if (urlCode) setCode(urlCode.toUpperCase());
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim() || !name.trim() || !email.trim() || !phone.trim() || !institute.trim()) {
      setError('Please fill out all required fields.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await ambassadorService.captureReferral({
        code: code.trim(),
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        institute: institute.trim(),
        notes: notes.trim() || undefined
      });

      setSubmitted(true);
      setResultMsg(res.message || 'Your referral was recorded successfully!');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to submit referral. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-md">
          <Award className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900">Campus Placement Outreach</h2>
        <p className="text-xs text-slate-500">
          Join your campus peer network for structured technical interview practice and placement readiness.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <Card className="p-8 shadow-sm">
          {submitted ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Referral Submission Received</h3>
                <p className="text-xs text-slate-600 mt-1">{resultMsg}</p>
              </div>
              <p className="text-[11px] text-slate-400">
                The campus ambassador coordinator will verify your participation details against your institute register.
              </p>
              <Button size="sm" variant="outline" onClick={() => setSubmitted(false)}>
                Submit Another Referral
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Ambassador Referral Code *
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. HT-XXXXXXXX"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono font-bold text-indigo-700 uppercase"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Candidate full name"
                    className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@college.edu"
                      className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91-9876543210"
                      className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  College / Institute Name *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={institute}
                    onChange={(e) => setInstitute(e.target.value)}
                    placeholder="e.g. National Institute of Technology"
                    className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Optional Preparation Goals / Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Target software engineer role, graduation year 2026..."
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs"
                />
              </div>

              <div className="pt-2">
                <Button type="submit" loading={loading} className="w-full flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" />
                  <span>Submit Participation Record</span>
                </Button>
              </div>

              <p className="text-[10px] text-slate-400 text-center pt-2">
                By submitting, your details will be verified by the campus placement coordinator.
                No fees or automated placement promises are offered.
              </p>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}

