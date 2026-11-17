import React, { useState, useEffect } from 'react';
import { recruiterService } from '../../services/index.js';
import Card from '../../components/Card.jsx';
import Button from '../../components/Button.jsx';
import FormField from '../../components/FormField.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { Building2, Save, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function RecruiterProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [address, setAddress] = useState('');

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await recruiterService.getMyProfile();
      if (response.success && response.data) {
        const p = response.data;
        setProfile(p);
        setCompanyName(p.companyName || '');
        setWebsite(p.website || '');
        setPhone(p.phone || '');
        setDescription(p.description || '');
        setContactPerson(p.contactPerson || '');
        setAddress(p.address || '');
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load company profile' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback({ type: '', message: '' });
    try {
      const payload = {
        companyName: companyName.trim(),
        website: website.trim(),
        phone: phone.trim(),
        description: description.trim(),
        contactPerson: contactPerson.trim(),
        address: address.trim()
      };
      const response = await recruiterService.updateMyProfile(payload);
      if (response.success) {
        setProfile(response.data);
        setFeedback({ type: 'success', message: 'Company profile updated successfully!' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Company Profile</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Maintain your organization details and primary recruiter contact information
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-500">Placement Status:</span>
          <StatusBadge status={profile?.approvalStatus || 'pending'} size="sm" />
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

      <Card>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Company Name"
              id="rec-compName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />

            <FormField
              label="Company Website"
              id="rec-website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://company.com"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Primary Contact Person / Title"
              id="rec-contact"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="e.g. Talent Acquisition Lead"
            />

            <FormField
              label="Contact Phone"
              id="rec-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 9876543210"
            />
          </div>

          <FormField
            label="Corporate Address / Office Location"
            id="rec-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. Manyata Tech Park, Nagavara, Bengaluru"
          />

          <FormField
            label="About Company"
            id="rec-desc"
            type="textarea"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Introduce your company culture, technology domains, and engineering work..."
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

