import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Search,
  Plus,
  Edit2,
  Send,
  Archive,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Trash2,
  Eye,
  X,
  Filter,
  Layers,
  MapPin,
  Calendar,
  Building,
  DollarSign
} from 'lucide-react';
import { opportunityService } from '../../services/index.js';

const STATUS_TABS = [
  { id: '', label: 'All' },
  { id: 'DRAFT', label: 'Draft' },
  { id: 'PUBLISHED', label: 'Published' },
  { id: 'CLOSED', label: 'Closed' },
  { id: 'EXPIRED', label: 'Expired' },
  { id: 'ARCHIVED', label: 'Archived' }
];

const WORK_MODES = [
  { value: 'ON_SITE', label: 'On-site' },
  { value: 'HYBRID', label: 'Hybrid' },
  { value: 'REMOTE', label: 'Remote' }
];

const CRITERIA_TYPES = [
  { value: 'DEGREE', label: 'Degree (e.g. B.Tech)' },
  { value: 'BRANCH', label: 'Branch / Stream (e.g. CSE)' },
  { value: 'GRADUATION_YEAR', label: 'Graduation Year (e.g. 2026)' },
  { value: 'MIN_CGPA', label: 'Minimum CGPA (0.0 - 10.0)' },
  { value: 'SKILL', label: 'Key Skill' },
  { value: 'EXPERIENCE', label: 'Experience' },
  { value: 'OTHER', label: 'Other Requirement' }
];

const CRITERIA_OPERATORS = [
  { value: 'EQUALS', label: 'Equals' },
  { value: 'IN', label: 'In List' },
  { value: 'GTE', label: 'Greater than or equal (≥)' },
  { value: 'LTE', label: 'Less than or equal (≤)' },
  { value: 'CONTAINS', label: 'Contains' }
];

export default function AdminOpportunities() {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters & Pagination
  const [activeStatus, setActiveStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [workModeFilter, setWorkModeFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [modalTab, setModalTab] = useState('details'); // 'details' | 'criteria' | 'preview'
  const [modalError, setModalError] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Form State
  const initialFormState = {
    companyName: '',
    jobTitle: '',
    employerJobId: '',
    workMode: 'ON_SITE',
    location: '',
    compensationText: '',
    applicationUrl: '',
    applicationInstructions: '',
    deadline: '',
    sourceNote: '',
    sourceUrl: '',
    description: '',
    criteria: []
  };
  const [formData, setFormData] = useState(initialFormState);

  // Criteria Builder row state
  const [newCriterion, setNewCriterion] = useState({
    type: 'MIN_CGPA',
    operator: 'GTE',
    value: '',
    isHardRequirement: true,
    displayLabel: ''
  });

  const fetchOpportunities = async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 15 };
      if (activeStatus) params.status = activeStatus;
      if (searchTerm) params.q = searchTerm;
      if (workModeFilter) params.workMode = workModeFilter;

      const res = await opportunityService.getAdminOpportunities(params);
      if (res?.data?.success || res?.success) {
        setOpportunities(res.data?.data || res.data || []);
        if (res.data?.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to load opportunities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities(1);
  }, [activeStatus, workModeFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchOpportunities(1);
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData(initialFormState);
    setModalTab('details');
    setModalError('');
    setIsModalOpen(true);
  };

  const openEditModal = (opp) => {
    setEditingId(opp._id);
    setFormData({
      companyName: opp.companyName || '',
      jobTitle: opp.jobTitle || '',
      employerJobId: opp.employerJobId || '',
      workMode: opp.workMode || 'ON_SITE',
      location: opp.location || '',
      compensationText: opp.compensationText || '',
      applicationUrl: opp.applicationUrl || '',
      applicationInstructions: opp.applicationInstructions || '',
      deadline: opp.deadline ? new Date(opp.deadline).toISOString().substring(0, 10) : '',
      sourceNote: opp.sourceNote || '',
      sourceUrl: opp.sourceUrl || '',
      description: opp.description || '',
      criteria: opp.criteria || []
    });
    setModalTab('details');
    setModalError('');
    setIsModalOpen(true);
  };

  const handleAddCriterion = () => {
    if (!newCriterion.value && newCriterion.value !== 0) {
      setModalError('Criterion value cannot be empty');
      return;
    }

    if (newCriterion.type === 'MIN_CGPA') {
      const num = Number(newCriterion.value);
      if (isNaN(num) || num < 0 || num > 10) {
        setModalError('Conflicting criteria: Minimum CGPA must be a valid number between 0.0 and 10.0');
        return;
      }
    }

    const updated = [
      ...formData.criteria,
      {
        ...newCriterion,
        sortOrder: formData.criteria.length
      }
    ];

    setFormData({ ...formData, criteria: updated });
    setNewCriterion({
      type: 'SKILL',
      operator: 'EQUALS',
      value: '',
      isHardRequirement: true,
      displayLabel: ''
    });
    setModalError('');
  };

  const handleRemoveCriterion = (index) => {
    const updated = formData.criteria.filter((_, i) => i !== index);
    setFormData({ ...formData, criteria: updated });
  };

  const handleSaveOpportunity = async (andPublish = false) => {
    setModalError('');
    setModalSubmitting(true);

    try {
      const payload = {
        ...formData,
        criteria: formData.criteria.map((c, i) => {
          let val = c.value;
          if (c.type === 'MIN_CGPA') val = Number(c.value);
          else if (c.type === 'GRADUATION_YEAR' && typeof c.value === 'string' && c.value.includes(',')) {
            val = c.value.split(',').map((x) => Number(x.trim())).filter(Boolean);
          } else if (c.type === 'GRADUATION_YEAR') {
            val = Number(c.value);
          } else if ((c.type === 'BRANCH' || c.type === 'DEGREE') && typeof c.value === 'string' && c.value.includes(',')) {
            val = c.value.split(',').map((x) => x.trim()).filter(Boolean);
          }
          return {
            type: c.type,
            operator: c.operator,
            value: val,
            isHardRequirement: c.isHardRequirement !== false,
            displayLabel: c.displayLabel || '',
            sortOrder: i
          };
        })
      };

      if (andPublish) {
        payload.status = 'PUBLISHED';
        payload.lastVerifiedAt = new Date().toISOString();
      }

      let res;
      if (editingId) {
        res = await opportunityService.updateOpportunity(editingId, payload);
      } else {
        res = await opportunityService.createOpportunity(payload);
      }

      if (andPublish && editingId && res?.data?.status !== 'PUBLISHED') {
        // Explicit publish call if updating an existing record
        await opportunityService.publishOpportunity(editingId);
      }

      setSuccessMsg(
        andPublish
          ? 'Opportunity successfully published and visible to students.'
          : 'Opportunity draft saved successfully.'
      );
      setIsModalOpen(false);
      fetchOpportunities(pagination.page);
    } catch (err) {
      const errRes = err?.response?.data;
      if (errRes?.errors && Array.isArray(errRes.errors) && errRes.errors.length > 0) {
        setModalError(`${errRes.message || 'Validation failed'}: ${errRes.errors.map((e) => e.message).join(', ')}`);
      } else {
        setModalError(errRes?.message || err.message || 'Failed to save opportunity');
      }
    } finally {
      setModalSubmitting(false);
    }
  };

  const handlePublishDirect = async (opp) => {
    setError('');
    try {
      await opportunityService.publishOpportunity(opp._id);
      setSuccessMsg(`"${opp.jobTitle}" at ${opp.companyName} is now Published and live for students.`);
      fetchOpportunities(pagination.page);
    } catch (err) {
      const errRes = err?.response?.data;
      setError(errRes?.message || 'Failed to publish opportunity');
    }
  };

  const handleClose = async (opp) => {
    if (!window.confirm(`Are you sure you want to CLOSE applications for "${opp.jobTitle}"?`)) return;
    setError('');
    try {
      await opportunityService.closeOpportunity(opp._id);
      setSuccessMsg(`Opportunity "${opp.jobTitle}" closed.`);
      fetchOpportunities(pagination.page);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to close opportunity');
    }
  };

  const handleArchive = async (opp) => {
    if (!window.confirm(`Archive "${opp.jobTitle}"? It will be permanently hidden from students.`)) return;
    setError('');
    try {
      await opportunityService.archiveOpportunity(opp._id);
      setSuccessMsg(`Opportunity "${opp.jobTitle}" archived.`);
      fetchOpportunities(pagination.page);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to archive opportunity');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PUBLISHED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Published</span>;
      case 'DRAFT':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300"><Clock className="w-3 h-3 mr-1" /> Draft</span>;
      case 'CLOSED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200"><AlertCircle className="w-3 h-3 mr-1" /> Closed</span>;
      case 'EXPIRED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200"><AlertCircle className="w-3 h-3 mr-1" /> Expired</span>;
      case 'ARCHIVED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-200 text-zinc-700 border border-zinc-300"><Archive className="w-3 h-3 mr-1" /> Archived</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Briefcase className="w-7 h-7 text-indigo-600" />
            Job Opportunities & Campus Drives
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Author, verify, criteria-test, and publish official employment opportunities for enrolled students.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Create Opportunity
        </button>
      </div>

      {/* Success / Error Alerts */}
      {successMsg && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-emerald-800">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-between text-rose-800">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Tabs & Search Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3">
          <div className="flex flex-wrap gap-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveStatus(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeStatus === tab.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={workModeFilter}
              onChange={(e) => setWorkModeFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Work Modes</option>
              {WORK_MODES.map((wm) => (
                <option key={wm.value} value={wm.value}>{wm.label}</option>
              ))}
            </select>
          </div>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by job title, company name, or employer ID..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Table List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            <div className="inline-block animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full mb-2" />
            <p>Loading opportunities...</p>
          </div>
        ) : opportunities.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-base font-medium text-slate-700">No opportunities found</p>
            <p className="text-sm text-slate-400 mt-1">Create an opportunity or adjust filters above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-medium text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Opportunity</th>
                  <th className="px-6 py-3">Work Mode & Location</th>
                  <th className="px-6 py-3">Compensation</th>
                  <th className="px-6 py-3">Deadline & Status</th>
                  <th className="px-6 py-3">Criteria</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {opportunities.map((opp) => (
                  <tr key={opp._id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{opp.jobTitle}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Building className="w-3 h-3 text-slate-400" />
                        <span>{opp.companyName}</span>
                        {opp.employerJobId && (
                          <span className="text-slate-400 font-mono text-[11px] ml-1">
                            (ID: {opp.employerJobId})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-2 py-0.5 text-xs rounded bg-slate-100 text-slate-700 font-medium">
                        {opp.workMode}
                      </span>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{opp.location || 'Multiple / Remote'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">
                      {opp.compensationText || <span className="text-slate-400 font-normal italic">Not specified</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div>{getStatusBadge(opp.effectiveStatus || opp.status)}</div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{opp.deadline ? new Date(opp.deadline).toLocaleDateString() : 'No date'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-medium text-slate-700">
                        {opp.criteria?.length || 0} criteria rules
                      </div>
                      <div className="text-[11px] text-slate-400">
                        v{opp.criteriaVersion || 1}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => openEditModal(opp)}
                          title="Edit Opportunity"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {opp.status === 'DRAFT' && (
                          <button
                            onClick={() => handlePublishDirect(opp)}
                            title="Publish Opportunity"
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}

                        {opp.status === 'PUBLISHED' && (
                          <button
                            onClick={() => handleClose(opp)}
                            title="Close Opportunity"
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          >
                            <AlertCircle className="w-4 h-4" />
                          </button>
                        )}

                        {opp.status !== 'ARCHIVED' && (
                          <button
                            onClick={() => handleArchive(opp)}
                            title="Archive Opportunity"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Opportunity Modal (Create / Edit + Criteria Builder + Live Preview) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in-50 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingId ? 'Edit Job Opportunity' : 'Create Job Opportunity'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set candidate requirements, application destination, and verified campus audit notes.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-slate-200 px-6 bg-slate-50">
              <button
                onClick={() => setModalTab('details')}
                className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                  modalTab === 'details'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                1. Job Details & Links
              </button>
              <button
                onClick={() => setModalTab('criteria')}
                className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                  modalTab === 'criteria'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                2. Criteria & Eligibility Rules ({formData.criteria.length})
              </button>
              <button
                onClick={() => setModalTab('preview')}
                className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                  modalTab === 'preview'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                3. Live Student Preview
              </button>
            </div>

            {/* Modal Error Banner */}
            {modalError && (
              <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Modal Content Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {modalTab === 'details' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Company Name *</label>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      placeholder="e.g. Google India"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Job Title *</label>
                    <input
                      type="text"
                      value={formData.jobTitle}
                      onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                      placeholder="e.g. Associate Software Engineer"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Employer Job / Requisition ID</label>
                    <input
                      type="text"
                      value={formData.employerJobId}
                      onChange={(e) => setFormData({ ...formData, employerJobId: e.target.value })}
                      placeholder="e.g. REQ-2026-9921"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Work Mode</label>
                    <select
                      value={formData.workMode}
                      onChange={(e) => setFormData({ ...formData, workMode: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                    >
                      {WORK_MODES.map((wm) => (
                        <option key={wm.value} value={wm.value}>{wm.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Location</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g. Bengaluru / Hyderabad"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Compensation Text</label>
                    <input
                      type="text"
                      value={formData.compensationText}
                      onChange={(e) => setFormData({ ...formData, compensationText: e.target.value })}
                      placeholder="e.g. ₹14 LPA + ₹2L Sign-on"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Application URL (Must start with http:// or https://)
                    </label>
                    <input
                      type="url"
                      value={formData.applicationUrl}
                      onChange={(e) => setFormData({ ...formData, applicationUrl: e.target.value })}
                      placeholder="https://careers.company.com/apply/123"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Application Deadline *</label>
                    <input
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Application Instructions</label>
                    <textarea
                      rows={2}
                      value={formData.applicationInstructions}
                      onChange={(e) => setFormData({ ...formData, applicationInstructions: e.target.value })}
                      placeholder="e.g. Apply using your official college email and attach your placement cell verified resume."
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Source Verification Note * (Required for Publish)
                      </label>
                      <input
                        type="text"
                        value={formData.sourceNote}
                        onChange={(e) => setFormData({ ...formData, sourceNote: e.target.value })}
                        placeholder="e.g. Sourced via college placement committee MOU"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Source URL (Optional)</label>
                      <input
                        type="url"
                        value={formData.sourceUrl}
                        onChange={(e) => setFormData({ ...formData, sourceUrl: e.target.value })}
                        placeholder="https://mou.university.edu/relations/mou-49"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-white"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Job Description (Markdown supported) *</label>
                    <textarea
                      rows={5}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="## Role Overview&#10;&#10;As an Associate Engineer, you will..."
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-mono text-xs"
                    />
                  </div>
                </div>
              )}

              {modalTab === 'criteria' && (
                <div className="space-y-6">
                  {/* Criteria Builder Input Block */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Add Requirement Criterion</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Type</label>
                        <select
                          value={newCriterion.type}
                          onChange={(e) => setNewCriterion({ ...newCriterion, type: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                        >
                          {CRITERIA_TYPES.map((ct) => (
                            <option key={ct.value} value={ct.value}>{ct.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Operator</label>
                        <select
                          value={newCriterion.operator}
                          onChange={(e) => setNewCriterion({ ...newCriterion, operator: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                        >
                          {CRITERIA_OPERATORS.map((op) => (
                            <option key={op.value} value={op.value}>{op.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Value (or comma-separated)</label>
                        <input
                          type="text"
                          value={newCriterion.value}
                          onChange={(e) => setNewCriterion({ ...newCriterion, value: e.target.value })}
                          placeholder={newCriterion.type === 'MIN_CGPA' ? 'e.g. 7.5' : 'e.g. CSE, ISE'}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Display Label</label>
                        <input
                          type="text"
                          value={newCriterion.displayLabel}
                          onChange={(e) => setNewCriterion({ ...newCriterion, displayLabel: e.target.value })}
                          placeholder="e.g. Min CGPA 7.5"
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newCriterion.isHardRequirement}
                          onChange={(e) => setNewCriterion({ ...newCriterion, isHardRequirement: e.target.checked })}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-medium">Mandatory Hard Requirement (Non-negotiable qualification)</span>
                      </label>

                      <button
                        type="button"
                        onClick={handleAddCriterion}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Rule
                      </button>
                    </div>
                  </div>

                  {/* Configured Criteria Table */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Configured Rules</h4>
                    {formData.criteria.length === 0 ? (
                      <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                        No criteria configured. This job will have open eligibility.
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
                          <thead className="bg-slate-50 text-slate-600 font-semibold">
                            <tr>
                              <th className="px-4 py-2">Rule Type</th>
                              <th className="px-4 py-2">Condition</th>
                              <th className="px-4 py-2">Display Label</th>
                              <th className="px-4 py-2">Class</th>
                              <th className="px-4 py-2 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {formData.criteria.map((c, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="px-4 py-2.5 font-medium text-slate-900">{c.type}</td>
                                <td className="px-4 py-2.5 font-mono text-slate-600">
                                  {c.operator} {Array.isArray(c.value) ? c.value.join(', ') : String(c.value)}
                                </td>
                                <td className="px-4 py-2.5 text-slate-600">{c.displayLabel || '-'}</td>
                                <td className="px-4 py-2.5">
                                  {c.isHardRequirement !== false ? (
                                    <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-semibold text-[10px]">
                                      Mandatory (Hard)
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 font-medium text-[10px]">
                                      Preferred (Soft)
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                  <button
                                    onClick={() => handleRemoveCriterion(idx)}
                                    className="text-slate-400 hover:text-rose-600 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {modalTab === 'preview' && (
                <div className="space-y-4">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center gap-2">
                    <Eye className="w-4 h-4 flex-shrink-0 text-amber-600" />
                    <span>Live Preview: This card shows exactly what enrolled students will see in their portal.</span>
                  </div>

                  {/* Student View Mock Card */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-semibold text-indigo-600 tracking-wide uppercase">
                          {formData.companyName || 'Company Name'}
                        </span>
                        <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                          {formData.jobTitle || 'Job Title Placeholder'}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-2">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {formData.location || 'Multiple / Remote'}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
                            {formData.workMode}
                          </span>
                          {formData.compensationText && (
                            <span className="flex items-center gap-1 text-emerald-700 font-medium">
                              <DollarSign className="w-3.5 h-3.5" />
                              {formData.compensationText}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          Active Drive
                        </span>
                        <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 justify-end">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>Deadline: {formData.deadline || 'Not set'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Criteria Chips */}
                    {formData.criteria.length > 0 && (
                      <div className="border-t border-slate-100 pt-3">
                        <div className="text-xs font-semibold text-slate-700 mb-1.5">Key Requirements:</div>
                        <div className="flex flex-wrap gap-1.5">
                          {formData.criteria.map((c, i) => (
                            <span
                              key={i}
                              className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                                c.isHardRequirement !== false
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {c.displayLabel || `${c.type}: ${c.value}`}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Application CTA Preview */}
                    <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
                      <div className="text-xs text-slate-500">
                        {formData.applicationUrl ? (
                          <span className="font-mono text-slate-600">
                            Destination: {formData.applicationUrl.replace(/https?:\/\//, '').split('/')[0]}
                          </span>
                        ) : (
                          <span>Internal Instructions Only</span>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled
                        className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow-sm"
                      >
                        Open Application
                        <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={modalSubmitting}
                  onClick={() => handleSaveOpportunity(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  disabled={modalSubmitting}
                  onClick={() => handleSaveOpportunity(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {modalSubmitting ? 'Publishing...' : 'Save & Publish Live'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
